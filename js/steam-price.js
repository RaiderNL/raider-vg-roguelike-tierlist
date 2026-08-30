const STEAM_PROXY_URL =
    'https://script.google.com/macros/s/AKfycbyUwe-rY-sOYJIuWNvQQJQa1mP50rkzcihHfZOqjrUTO9oyew4JKz_3cfNfsIveczDJ/exec';


/*
 * Количество игр в одном запросе.
 */
const PRICE_BATCH_SIZE =
    20;


/*
 * Пауза между пакетами запросов.
 */
const PRICE_BATCH_DELAY =
    500;


/*
 * Начальная задержка перед повторной попыткой.
 */
const PRICE_RETRY_START_DELAY =
    5000;


/*
 * Максимальная задержка между повторными попытками.
 */
const PRICE_RETRY_MAX_DELAY =
    60000;


/*
 * Количество быстрых повторных попыток
 * перед переходом на повтор раз в минуту.
 */
const PRICE_RETRY_LIMIT =
    5;


/*
 * Повторная фоновая загрузка
 * после полного завершения неудачных попыток.
 */
const PRICE_BACKGROUND_RETRY_DELAY =
    60000;


const priceCache =
    new Map();


const registeredCards =
    new Set();


let priceModeEnabled =
    false;


let priceLoadingInProgress =
    false;


let priceReloadTimer =
    null;


let priceBackgroundRetryTimer =
    null;


/*
 * Включение или выключение режима цен.
 */
export function setPriceMode(
    isEnabled
) {
    priceModeEnabled =
        Boolean(isEnabled);


    document.body.classList.toggle(
        'price-mode-active',
        priceModeEnabled
    );


    clearTimeout(
        priceReloadTimer
    );

    clearTimeout(
        priceBackgroundRetryTimer
    );


    priceReloadTimer =
        null;

    priceBackgroundRetryTimer =
        null;


    if (!priceModeEnabled) {
        registeredCards.forEach(card => {
            removePriceFromCard(
                card
            );
        });

        return;
    }


    reloadPrices();
}


/*
 * Регистрация карточки игры.
 */
export function registerPriceCard(
    card,
    game
) {
    card._priceGame =
        game;


    registeredCards.add(
        card
    );


    if (
        priceModeEnabled
    ) {
        showPriceLoading(
            card
        );

        schedulePricesReload();
    }
}


/*
 * Повторная загрузка цен
 * для всех зарегистрированных карточек.
 */
function reloadPrices() {
    if (
        !priceModeEnabled ||
        priceLoadingInProgress
    ) {
        return;
    }


    clearTimeout(
        priceBackgroundRetryTimer
    );

    priceBackgroundRetryTimer =
        null;


    loadPricesForAllCards();
}


/*
 * Небольшая задержка перед сбором карточек.
 *
 * Это нужно, чтобы дождаться окончания
 * построения DOM после загрузки таблицы.
 */
function schedulePricesReload() {
    clearTimeout(
        priceReloadTimer
    );


    priceReloadTimer =
        setTimeout(
            () => {
                priceReloadTimer =
                    null;

                reloadPrices();
            },
            100
        );
}


/*
 * Пакетная загрузка цен всех карточек.
 */
async function loadPricesForAllCards() {
    if (
        priceLoadingInProgress ||
        !priceModeEnabled
    ) {
        return;
    }


    priceLoadingInProgress =
        true;


    try {
        const cardsByAppId =
            collectCardsByAppId();


        const appIds =
            Array.from(
                cardsByAppId.keys()
            );


        if (!appIds.length) {
            return;
        }


        const batches =
            splitIntoBatches(
                appIds,
                PRICE_BATCH_SIZE
            );


        let hasTemporaryError =
            false;


        for (
            let index = 0;
            index < batches.length;
            index++
        ) {
            if (!priceModeEnabled) {
                return;
            }


            const batch =
                batches[index];


            const result =
                await fetchSteamPricesBatchWithRetry(
                    batch
                );


            if (
                result.retryable
            ) {
                hasTemporaryError =
                    true;
            }


            applyPricesToCards(
                batch,
                cardsByAppId,
                result.prices
            );


            if (
                index < batches.length - 1
            ) {
                await wait(
                    PRICE_BATCH_DELAY
                );
            }
        }


        /*
         * Если один или несколько пакетов
         * не загрузились из-за 403 или другой
         * временной ошибки, повторяем загрузку
         * всех ещё не загруженных цен через минуту.
         */
        if (
            hasTemporaryError &&
            priceModeEnabled
        ) {
            scheduleBackgroundRetry();
        }
    } finally {
        priceLoadingInProgress =
            false;
    }
}


/*
 * Сбор карточек и группировка
 * по App ID игры.
 */
function collectCardsByAppId() {
    const cardsByAppId =
        new Map();


    registeredCards.forEach(card => {
        if (
            !card.isConnected
        ) {
            registeredCards.delete(
                card
            );

            return;
        }


        const game =
            card._priceGame;


        if (!game) {
            return;
        }


        const steamLink =
            String(
                game['Steam Link'] || ''
            ).trim();


        const appId =
            getSteamAppId(
                steamLink
            );


        if (!appId) {
            return;
        }


        if (
            !cardsByAppId.has(
                appId
            )
        ) {
            cardsByAppId.set(
                appId,
                []
            );
        }


        cardsByAppId
            .get(appId)
            .push(card);


        const cachedPrice =
            priceCache.get(
                appId
            );


        if (cachedPrice) {
            renderPriceOnCard(
                card,
                cachedPrice
            );
        } else {
            showPriceLoading(
                card
            );
        }
    });


    return cardsByAppId;
}


/*
 * Отправка одного пакетного запроса
 * с повторными попытками.
 */
async function fetchSteamPricesBatchWithRetry(
    appIds
) {
    let retryDelay =
        PRICE_RETRY_START_DELAY;


    for (
        let attempt = 1;
        attempt <= PRICE_RETRY_LIMIT;
        attempt++
    ) {
        const result =
            await fetchSteamPricesBatch(
                appIds
            );


        if (
            result.status === 'success'
        ) {
            return {
                prices:
                    result.prices,

                retryable:
                    false
            };
        }


        console.warn(
            `Ошибка загрузки пакета цен. ` +
            `Попытка ${attempt}/${PRICE_RETRY_LIMIT}. ` +
            `Следующая попытка через ` +
            `${Math.round(retryDelay / 1000)} сек.`,
            appIds
        );


        await wait(
            retryDelay
        );


        retryDelay =
            Math.min(
                retryDelay * 2,
                PRICE_RETRY_MAX_DELAY
            );
    }


    console.warn(
        'Пакет цен временно недоступен. ' +
        'Будет выполнена фоновая повторная попытка:',
        appIds
    );


    return {
        prices:
            new Map(),

        retryable:
            true
    };
}


/*
 * Запрос цен сразу для нескольких игр.
 */
async function fetchSteamPricesBatch(
    appIds
) {
    const apiUrl =
        `${STEAM_PROXY_URL}` +
        `?appids=${encodeURIComponent(appIds.join(','))}` +
        '&cc=ru' +
        '&l=russian';


    try {
        const response =
            await fetch(
                apiUrl,
                {
                    method: 'GET',
                    cache: 'no-store'
                }
            );


        if (!response.ok) {
            console.warn(
                `Google Apps Script вернул HTTP ` +
                `${response.status} для пакета:`,
                appIds
            );


            return {
                status:
                    'retry',

                prices:
                    new Map()
            };
        }


        const result =
            await response.json();


        /*
         * Ошибка Google Apps Script
         * или ошибка Steam внутри прокси.
         */
        if (
            result?.error ||
            result?.success === false
        ) {
            console.warn(
                'Ошибка Google Apps Script:',
                result.error
            );


            return {
                status:
                    'retry',

                prices:
                    new Map()
            };
        }


        const prices =
            new Map();


        appIds.forEach(appId => {
            const appResult =
                result?.[appId];


            /*
             * Если Steam не вернул данные
             * по одной игре, остальные игры
             * из пакета всё равно обрабатываются.
             */
            if (
                !appResult ||
                !appResult.success ||
                !appResult.data
            ) {
                console.warn(
                    `Steam не вернул данные ` +
                    `для App ID ${appId}:`,
                    appResult
                );

                return;
            }


            const gameData =
                appResult.data;


            /*
             * Бесплатная игра.
             */
            if (
                gameData.is_free
            ) {
                const freePrice = {
                    finalFormatted:
                        'Бесплатно',

                    initialFormatted:
                        '',

                    discountPercent:
                        0
                };


                prices.set(
                    appId,
                    freePrice
                );

                priceCache.set(
                    appId,
                    freePrice
                );

                return;
            }


            const priceOverview =
                gameData.price_overview;


            /*
             * У игры нет доступной цены.
             */
            if (
                !priceOverview
            ) {
                return;
            }


            const priceData = {
                finalFormatted:
                    priceOverview.final_formatted ||
                    formatPrice(
                        priceOverview.final
                    ),

                initialFormatted:
                    priceOverview.initial_formatted ||
                    formatPrice(
                        priceOverview.initial
                    ),

                discountPercent:
                    Number(
                        priceOverview.discount_percent
                    ) || 0
            };


            prices.set(
                appId,
                priceData
            );


            priceCache.set(
                appId,
                priceData
            );
        });


        return {
            status:
                'success',

            prices:
                prices
        };
    } catch (error) {
        console.warn(
            'Ошибка сети при пакетной загрузке цен:',
            error
        );


        return {
            status:
                'retry',

            prices:
                new Map()
        };
    }
}


/*
 * Отображение полученных цен
 * на карточках игр.
 */
function applyPricesToCards(
    appIds,
    cardsByAppId,
    prices
) {
    appIds.forEach(appId => {
        const cards =
            cardsByAppId.get(
                appId
            ) || [];


        const priceData =
            prices.get(
                appId
            );


        cards.forEach(card => {
            if (
                !priceModeEnabled
            ) {
                return;
            }


            if (priceData) {
                renderPriceOnCard(
                    card,
                    priceData
                );

                return;
            }


            /*
             * Не показываем «Цена недоступна»
             * сразу после временной ошибки.
             * Следующая загрузка произойдёт автоматически.
             */
            if (
                !priceCache.has(
                    appId
                )
            ) {
                showPriceLoading(
                    card,
                    'Повторная попытка…'
                );
            }
        });
    });
}


/*
 * Отложенная повторная загрузка
 * после неудачного пакетного запроса.
 */
function scheduleBackgroundRetry() {
    clearTimeout(
        priceBackgroundRetryTimer
    );


    priceBackgroundRetryTimer =
        setTimeout(
            () => {
                priceBackgroundRetryTimer =
                    null;

                if (
                    priceModeEnabled
                ) {
                    reloadPrices();
                }
            },
            PRICE_BACKGROUND_RETRY_DELAY
        );
}


/*
 * Отображение состояния загрузки.
 */
function showPriceLoading(
    card,
    text = 'Загрузка…'
) {
    let priceElement =
        card.querySelector(
            '.game-price'
        );


    if (!priceElement) {
        priceElement =
            createPriceElement();

        card.appendChild(
            priceElement
        );
    }


    priceElement.classList.remove(
        'game-price-unavailable'
    );


    priceElement.classList.add(
        'game-price-loading'
    );


    priceElement.innerHTML =
        `<span class="game-price-loading-text">` +
        `${text}` +
        '</span>';
}


/*
 * Отображение цены на карточке.
 */
function renderPriceOnCard(
    card,
    priceData
) {
    let priceElement =
        card.querySelector(
            '.game-price'
        );


    if (!priceElement) {
        priceElement =
            createPriceElement();

        card.appendChild(
            priceElement
        );
    }


    priceElement.classList.remove(
        'game-price-loading',
        'game-price-unavailable'
    );


    renderPrice(
        priceElement,
        priceData
    );
}


/*
 * Создание элемента цены.
 */
function createPriceElement() {
    const element =
        document.createElement(
            'div'
        );


    element.className =
        'game-price';


    return element;
}


/*
 * Отрисовка текущей цены,
 * старой цены и скидки.
 */
function renderPrice(
    priceElement,
    priceData
) {
    priceElement.innerHTML =
        '';


    const currentPrice =
        document.createElement(
            'span'
        );


    currentPrice.className =
        'game-price-current';


    currentPrice.textContent =
        priceData.finalFormatted;


    priceElement.appendChild(
        currentPrice
    );


    if (
        priceData.discountPercent > 0 &&
        priceData.initialFormatted
    ) {
        const oldPrice =
            document.createElement(
                'span'
            );


        oldPrice.className =
            'game-price-old';


        oldPrice.textContent =
            priceData.initialFormatted;


        const discount =
            document.createElement(
                'span'
            );


        discount.className =
            'game-price-discount';


        discount.textContent =
            `−${priceData.discountPercent}%`;


        priceElement.appendChild(
            oldPrice
        );


        priceElement.appendChild(
            discount
        );
    }
}


/*
 * Удаление цены с карточки.
 */
function removePriceFromCard(
    card
) {
    const priceElement =
        card.querySelector(
            '.game-price'
        );


    if (priceElement) {
        priceElement.remove();
    }
}


/*
 * Разбиение массива на пакеты.
 */
function splitIntoBatches(
    items,
    batchSize
) {
    const batches =
        [];


    for (
        let index = 0;
        index < items.length;
        index += batchSize
    ) {
        batches.push(
            items.slice(
                index,
                index + batchSize
            )
        );
    }


    return batches;
}


/*
 * Извлечение App ID из Steam-ссылки.
 */
function getSteamAppId(
    steamLink
) {
    const link =
        String(
            steamLink || ''
        ).trim();


    if (!link) {
        return null;
    }


    const match =
        link.match(
            /(?:store\.steampowered\.com|steamcommunity\.com)\/app\/(\d+)/i
        );


    if (!match) {
        return null;
    }


    return match[1];
}


/*
 * Запасное форматирование цены,
 * если Steam не прислал готовое значение.
 */
function formatPrice(
    priceInCents
) {
    const price =
        Number(
            priceInCents
        );


    if (
        !Number.isFinite(price)
    ) {
        return '';
    }


    return (
        (price / 100)
            .toFixed(2)
            .replace('.', ',') +
        ' руб.'
    );
}


/*
 * Задержка.
 */
function wait(
    milliseconds
) {
    return new Promise(
        resolve => {
            setTimeout(
                resolve,
                milliseconds
            );
        }
    );
}

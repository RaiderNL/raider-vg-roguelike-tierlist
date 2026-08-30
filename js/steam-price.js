const STEAM_PROXY_URL =
    'https://script.google.com/macros/s/AKfycbyUwe-rY-sOYJIuWNvQQJQa1mP50rkzcihHfZOqjrUTO9oyew4JKz_3cfNfsIveczDJ/exec';


const PRICE_REQUEST_DELAY =
    1500;


const PRICE_RETRY_START_DELAY =
    5000;


const PRICE_RETRY_MAX_DELAY =
    60000;


const PRICE_RETRY_LIMIT =
    6;


const PRICE_BACKGROUND_RETRY_DELAY =
    60000;


const priceCache =
    new Map();


const priceRequestCache =
    new Map();


let priceModeEnabled =
    false;


let priceRequestQueue =
    Promise.resolve();


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

    document
        .querySelectorAll(
            '.game-card'
        )
        .forEach(card => {
            updateCardPrice(card);
        });
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

    if (priceModeEnabled) {
        updateCardPrice(card);
    }
}


/*
 * Обновление цены карточки.
 */
async function updateCardPrice(
    card
) {
    let priceElement =
        card.querySelector(
            '.game-price'
        );


    /*
     * Если режим цен выключен,
     * удаляем цену и отменяем повторный запрос.
     */
    if (!priceModeEnabled) {
        clearPriceRetryTimer(
            card
        );

        if (priceElement) {
            priceElement.remove();
        }

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


    /*
     * Если Steam-ссылка отсутствует,
     * запрос выполнять невозможно.
     */
    if (!steamLink) {
        return;
    }


    if (!priceElement) {
        priceElement =
            createPriceElement();

        card.appendChild(
            priceElement
        );
    }


    clearPriceRetryTimer(
        card
    );


    priceElement.classList.remove(
        'game-price-unavailable'
    );

    priceElement.classList.add(
        'game-price-loading'
    );

    priceElement.innerHTML =
        '<span class="game-price-loading-text">' +
        'Загрузка…' +
        '</span>';


    const result =
        await getSteamPrice(
            steamLink
        );


    /*
     * Пока выполнялся запрос,
     * режим цен мог быть выключен.
     */
    if (!priceModeEnabled) {
        if (priceElement) {
            priceElement.remove();
        }

        return;
    }


    /*
     * Если цена успешно загружена.
     */
    if (result.price) {
        priceElement.classList.remove(
            'game-price-loading',
            'game-price-unavailable'
        );

        renderPrice(
            priceElement,
            result.price
        );

        return;
    }


    /*
     * Если ошибка временная, оставляем
     * карточку в состоянии загрузки
     * и запускаем новый запрос через минуту.
     */
    if (result.retryable) {
        priceElement.classList.remove(
            'game-price-unavailable'
        );

        priceElement.classList.add(
            'game-price-loading'
        );

        priceElement.innerHTML =
            '<span class="game-price-loading-text">' +
            'Повторная попытка…' +
            '</span>';

        schedulePriceRetry(
            card
        );

        return;
    }


    /*
     * Если Steam сообщил, что цены действительно нет.
     */
    priceElement.classList.remove(
        'game-price-loading'
    );

    priceElement.classList.add(
        'game-price-unavailable'
    );

    priceElement.innerHTML =
        '<span class="game-price-unavailable-text">' +
        'Цена недоступна' +
        '</span>';
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
 * Отображение цены, старой цены и скидки.
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
        priceData.discountPercent > 0
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
 * Получение цены игры.
 */
async function getSteamPrice(
    steamLink
) {
    const appId =
        getSteamAppId(
            steamLink
        );


    if (!appId) {
        console.warn(
            'Не удалось определить App ID из ссылки:',
            steamLink
        );

        return {
            price: null,
            retryable: false
        };
    }


    /*
     * Используем ранее загруженную цену.
     */
    if (priceCache.has(appId)) {
        return {
            price:
                priceCache.get(appId),

            retryable:
                false
        };
    }


    /*
     * Не создаём несколько одинаковых запросов
     * для одной игры одновременно.
     */
    if (
        priceRequestCache.has(appId)
    ) {
        return priceRequestCache.get(
            appId
        );
    }


    const request =
        fetchSteamPriceWithRetry(
            appId
        );


    priceRequestCache.set(
        appId,
        request
    );


    try {
        const result =
            await request;


        if (result.price) {
            priceCache.set(
                appId,
                result.price
            );
        }


        return result;
    } finally {
        priceRequestCache.delete(
            appId
        );
    }
}


/*
 * Повторные запросы с увеличением задержки.
 */
async function fetchSteamPriceWithRetry(
    appId
) {
    let retryDelay =
        PRICE_RETRY_START_DELAY;


    for (
        let attempt = 1;
        attempt <= PRICE_RETRY_LIMIT;
        attempt++
    ) {
        /*
         * Каждый отдельный запрос проходит
         * через общую очередь.
         */
        const result =
            await addPriceRequestToQueue(
                appId
            );


        if (
            result.status === 'success'
        ) {
            return {
                price:
                    result.price,

                retryable:
                    false
            };
        }


        if (
            result.status === 'unavailable'
        ) {
            return {
                price: null,
                retryable: false
            };
        }


        console.warn(
            `Временная ошибка для App ID ${appId}. ` +
            `Повтор ${attempt}/${PRICE_RETRY_LIMIT} ` +
            `через ${Math.round(retryDelay / 1000)} сек.`
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


    /*
     * После нескольких неудачных попыток
     * updateCardPrice() запланирует новый запрос
     * через PRICE_BACKGROUND_RETRY_DELAY.
     */
    console.warn(
        `App ID ${appId} временно недоступен. ` +
        'Новая попытка будет выполнена позже.'
    );


    return {
        price: null,
        retryable: true
    };
}


/*
 * Добавление одного запроса в очередь.
 */
function addPriceRequestToQueue(
    appId
) {
    const queuedRequest =
        priceRequestQueue.then(
            async () => {
                await wait(
                    PRICE_REQUEST_DELAY
                );

                return fetchSteamPrice(
                    appId
                );
            }
        );


    /*
     * Ошибка одного запроса не должна
     * останавливать дальнейшую очередь.
     */
    priceRequestQueue =
        queuedRequest.catch(
            () => ({
                status: 'retry',
                price: null
            })
        );


    return queuedRequest;
}


/*
 * Запуск фоновой повторной попытки.
 */
function schedulePriceRetry(
    card
) {
    clearPriceRetryTimer(
        card
    );


    card._priceRetryTimer =
        setTimeout(
            () => {
                card._priceRetryTimer =
                    null;

                if (priceModeEnabled) {
                    updateCardPrice(
                        card
                    );
                }
            },
            PRICE_BACKGROUND_RETRY_DELAY
        );
}


/*
 * Отмена фоновой повторной попытки.
 */
function clearPriceRetryTimer(
    card
) {
    if (
        card._priceRetryTimer
    ) {
        clearTimeout(
            card._priceRetryTimer
        );

        card._priceRetryTimer =
            null;
    }
}


/*
 * Запрос цены через Google Apps Script.
 */
async function fetchSteamPrice(
    appId
) {
    const apiUrl =
        `${STEAM_PROXY_URL}` +
        `?appid=${encodeURIComponent(appId)}` +
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
                `${response.status} для App ID ${appId}`
            );

            return {
                status: 'retry',
                price: null
            };
        }


        const result =
            await response.json();


        /*
         * Ошибки прокси или Steam.
         */
        if (
            result?.error ||
            result?.success === false
        ) {
            const errorText =
                String(
                    result?.error || ''
                );


            console.warn(
                `Ошибка Google Apps Script для App ID ${appId}:`,
                errorText
            );


            const isTemporaryError =
                /403|429|500|502|503|504|timeout|timed out/i
                    .test(
                        errorText
                    );


            if (isTemporaryError) {
                return {
                    status: 'retry',
                    price: null
                };
            }


            return {
                status: 'unavailable',
                price: null
            };
        }


        const appResult =
            result?.[appId];


        if (
            !appResult ||
            !appResult.success ||
            !appResult.data
        ) {
            console.warn(
                `Steam не вернул данные для App ID ${appId}:`,
                result
            );

            return {
                status: 'unavailable',
                price: null
            };
        }


        const gameData =
            appResult.data;


        /*
         * Бесплатная игра.
         */
        if (
            gameData.is_free
        ) {
            return {
                status: 'success',
                price: {
                    finalFormatted:
                        'Бесплатно',

                    initialFormatted:
                        '',

                    discountPercent:
                        0
                }
            };
        }


        const priceOverview =
            gameData.price_overview;


        /*
         * У игры нет доступной цены.
         */
        if (
            !priceOverview
        ) {
            return {
                status: 'unavailable',
                price: null
            };
        }


        return {
            status: 'success',
            price: {
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
            }
        };
    } catch (error) {
        console.warn(
            `Ошибка сети для App ID ${appId}:`,
            error
        );

        return {
            status: 'retry',
            price: null
        };
    }
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
 * Форматирование цены,
 * если Steam не прислал готовую строку.
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
 * Универсальная задержка.
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

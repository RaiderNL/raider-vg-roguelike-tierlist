const STEAM_PROXY_URL =
    'https://script.google.com/macros/s/AKfycbyUwe-rY-sOYJIuWNvQQJQa1mP50rkzcihHfZOqjrUTO9oyew4JKz_3cfNfsIveczDJ/exec';


/*
 * В одном HTTP-запросе к Apps Script будет до 10 игр.
 * Внутри Apps Script Steam вызывается для одной игры за раз.
 */
const PRICE_BATCH_SIZE =
    10;


/*
 * Небольшая пауза между вызовами Apps Script.
 * Основное ограничение 200 мс задаётся в Apps Script.
 */
const PRICE_BATCH_DELAY =
    300;


/*
 * Повтор временно недоступных цен.
 */
const PRICE_RETRY_DELAY =
    60000;


const priceCache =
    new Map();


const unavailableAppIds =
    new Set();


const registeredCards =
    new Set();


const pendingAppIds =
    new Set();


let priceModeEnabled =
    false;


let priceLoadingInProgress =
    false;


let priceLoadTimer =
    null;


let priceRetryTimer =
    null;


/*
 * Переключение режима отображения цен.
 *
 * Загрузка цен не зависит от этого переключателя:
 * она начинается сразу после открытия сайта.
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


    if (!priceModeEnabled) {
        registeredCards.forEach(card => {
            removePriceFromCard(
                card
            );
        });

        return;
    }


    registeredCards.forEach(card => {
        renderCardPriceState(
            card
        );
    });


    schedulePriceLoading();
}


/*
 * Вызывается при создании карточки игры.
 *
 * Цены ставятся в очередь сразу, а не только
 * после нажатия на кнопку режима цен.
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


    const appId =
        getSteamAppId(
            game?.['Steam Link']
        );


    if (appId) {
        pendingAppIds.add(
            appId
        );

        schedulePriceLoading();
    }


    if (priceModeEnabled) {
        renderCardPriceState(
            card
        );
    }
}


/*
 * Небольшая задержка нужна, чтобы при рендере
 * списка сначала зарегистрировались все карточки.
 */
function schedulePriceLoading() {
    if (
        priceLoadingInProgress ||
        priceLoadTimer
    ) {
        return;
    }


    priceLoadTimer =
        setTimeout(
            () => {
                priceLoadTimer =
                    null;

                loadPendingPrices();
            },
            100
        );
}


/*
 * Последовательно загружает все ещё неизвестные цены.
 */
async function loadPendingPrices() {
    if (
        priceLoadingInProgress ||
        pendingAppIds.size === 0
    ) {
        return;
    }


    priceLoadingInProgress =
        true;


    try {
        while (
            pendingAppIds.size > 0
        ) {
            const appIds =
                takePendingAppIds(
                    PRICE_BATCH_SIZE
                );


            const result =
                await fetchSteamPricesBatch(
                    appIds
                );


            result.prices.forEach(
                (priceData, appId) => {
                    priceCache.set(
                        appId,
                        priceData
                    );

                    unavailableAppIds.delete(
                        appId
                    );
                }
            );


            result.unavailableAppIds.forEach(
                appId => {
                    unavailableAppIds.add(
                        appId
                    );
                }
            );


            result.retryableAppIds.forEach(
                appId => {
                    pendingAppIds.add(
                        appId
                    );
                }
            );


            if (priceModeEnabled) {
                renderAllVisiblePrices();
            }


            if (
                pendingAppIds.size > 0
            ) {
                await wait(
                    PRICE_BATCH_DELAY
                );
            }
        }
    } finally {
        priceLoadingInProgress =
            false;
    }


    if (
        pendingAppIds.size > 0
    ) {
        scheduleRetry();
    }
}


/*
 * Забирает ограниченную группу игр из очереди.
 */
function takePendingAppIds(
    limit
) {
    const appIds =
        [];


    for (
        const appId of pendingAppIds
    ) {
        appIds.push(
            appId
        );

        pendingAppIds.delete(
            appId
        );


        if (
            appIds.length >= limit
        ) {
            break;
        }
    }


    return appIds;
}


/*
 * Запрос к Apps Script.
 *
 * Apps Script возвращает:
 * {
 *   success: true,
 *   data: {
 *     "123": { success: true, data: {...} }
 *   },
 *   retryableAppIds: ["456"]
 * }
 */
async function fetchSteamPricesBatch(
    appIds
) {
    const emptyResult = {
        prices:
            new Map(),

        unavailableAppIds:
            new Set(),

        retryableAppIds:
            new Set()
    };


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
                `Apps Script вернул HTTP ${response.status}:`,
                appIds
            );


            appIds.forEach(appId => {
                emptyResult.retryableAppIds.add(
                    appId
                );
            });


            return emptyResult;
        }


        const result =
            await response.json();


        if (
            result?.success === false ||
            result?.error
        ) {
            console.warn(
                'Ошибка Google Apps Script:',
                result?.error
            );


            appIds.forEach(appId => {
                emptyResult.retryableAppIds.add(
                    appId
                );
            });


            return emptyResult;
        }


        const responseData =
            result?.data ||
            result;


        const retryableAppIds =
            new Set(
                result?.retryableAppIds ||
                []
            );


        appIds.forEach(appId => {
            if (
                retryableAppIds.has(appId)
            ) {
                emptyResult.retryableAppIds.add(
                    appId
                );

                return;
            }


            const appResult =
                responseData?.[appId];


            if (
                appResult?.temporary
            ) {
                emptyResult.retryableAppIds.add(
                    appId
                );

                return;
            }


            const priceData =
                getPriceData(
                    appResult
                );


            if (priceData) {
                emptyResult.prices.set(
                    appId,
                    priceData
                );

                return;
            }


            /*
             * Игра доступна, но Steam не прислал цену:
             * например, страница удалена, скрыта в регионе
             * или цена недоступна.
             */
            emptyResult.unavailableAppIds.add(
                appId
            );
        });


        return emptyResult;
    } catch (error) {
        console.warn(
            'Ошибка сети при загрузке цен:',
            error
        );


        appIds.forEach(appId => {
            emptyResult.retryableAppIds.add(
                appId
            );
        });


        return emptyResult;
    }
}


/*
 * Преобразует Steam-ответ одной игры в данные цены.
 */
function getPriceData(
    appResult
) {
    if (
        !appResult?.success ||
        !appResult?.data
    ) {
        return null;
    }


    const gameData =
        appResult.data;


    if (
        gameData.is_free
    ) {
        return {
            finalFormatted:
                'Бесплатно',

            initialFormatted:
                '',

            discountPercent:
                0
        };
    }


    const priceOverview =
        gameData.price_overview;


    if (!priceOverview) {
        return null;
    }


    return {
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
}


/*
 * Повторяет только временно недоступные игры.
 */
function scheduleRetry() {
    if (priceRetryTimer) {
        return;
    }


    priceRetryTimer =
        setTimeout(
            () => {
                priceRetryTimer =
                    null;

                loadPendingPrices();
            },
            PRICE_RETRY_DELAY
        );
}


/*
 * Обновляет цены на всех карточках,
 * когда режим отображения включён.
 */
function renderAllVisiblePrices() {
    registeredCards.forEach(card => {
        if (
            !card.isConnected
        ) {
            registeredCards.delete(
                card
            );

            return;
        }


        renderCardPriceState(
            card
        );
    });
}


/*
 * Вывод текущего состояния цены карточки.
 */
function renderCardPriceState(
    card
) {
    const game =
        card._priceGame;


    const appId =
        getSteamAppId(
            game?.['Steam Link']
        );


    if (!appId) {
        return;
    }


    const priceData =
        priceCache.get(
            appId
        );


    if (priceData) {
        renderPriceOnCard(
            card,
            priceData
        );

        return;
    }


    if (
        unavailableAppIds.has(appId)
    ) {
        showPriceUnavailable(
            card
        );

        return;
    }


    showPriceLoading(
        card
    );
}


/*
 * Создание или получение элемента цены.
 */
function getOrCreatePriceElement(
    card
) {
    let priceElement =
        card.querySelector(
            '.game-price'
        );


    if (!priceElement) {
        priceElement =
            document.createElement(
                'div'
            );

        priceElement.className =
            'game-price';


        card.appendChild(
            priceElement
        );
    }


    return priceElement;
}


/*
 * Отображение загрузки.
 */
function showPriceLoading(
    card
) {
    const priceElement =
        getOrCreatePriceElement(
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
}


/*
 * Отображение недоступной цены.
 */
function showPriceUnavailable(
    card
) {
    const priceElement =
        getOrCreatePriceElement(
            card
        );


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
 * Отображение цены.
 */
function renderPriceOnCard(
    card,
    priceData
) {
    const priceElement =
        getOrCreatePriceElement(
            card
        );


    priceElement.classList.remove(
        'game-price-loading',
        'game-price-unavailable'
    );


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
 * Удаление элемента цены при выключении режима.
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
 * Извлечение Steam App ID из ссылки.
 */
function getSteamAppId(
    steamLink
) {
    const link =
        String(
            steamLink || ''
        ).trim();


    const match =
        link.match(
            /(?:store\.steampowered\.com|steamcommunity\.com)\/app\/(\d+)/i
        );


    return match
        ? match[1]
        : null;
}


/*
 * Резервное форматирование, если Steam
 * не прислал готовую строку цены.
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


function wait(
    milliseconds
) {
    return new Promise(resolve => {
        setTimeout(
            resolve,
            milliseconds
        );
    });
}

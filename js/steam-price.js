const PRICES_FILE_URL =
    new URL(
        '../prices.json',
        import.meta.url
    ).href;


const PRICE_MODE_CLASS =
    'price-mode-active';


const PRICE_ELEMENT_CLASS =
    'game-price';


const PRICE_LOADING_CLASS =
    'game-price-loading';


const PRICE_UNAVAILABLE_CLASS =
    'game-price-unavailable';


const PRICE_RELOAD_INTERVAL =
    24 * 60 * 60 * 1000;


const PRICE_HIDE_DURATION =
    220;


const priceRemovalTimers =
    new WeakMap();


let pricesLoaded =
    false;


let pricesLoadingPromise =
    null;


let pricesUpdatedAt =
    null;


let priceModeEnabled =
    false;


const priceCache =
    new Map();


const registeredCards =
    new Set();


/*
 * Загружаем цены сразу после открытия сайта,
 * независимо от состояния кнопки режима цен.
 */
loadStaticPrices();


/*
 * Публичная функция включения или выключения
 * отображения цен.
 */
export function setPriceMode(
    isEnabled
) {
    priceModeEnabled =
        Boolean(isEnabled);


    document.body.classList.toggle(
        PRICE_MODE_CLASS,
        priceModeEnabled
    );


    if (
        priceModeEnabled
    ) {
        renderAllPrices();

        return;
    }


    hideAllPrices();
}


/*
 * Альтернативное имя функции.
 */
export function togglePriceMode(
    isEnabled
) {
    setPriceMode(
        isEnabled
    );
}


/*
 * Регистрация карточки игры.
 */
export function registerPriceCard(
    card,
    game
) {
    if (
        !card ||
        !game
    ) {
        return;
    }


    card._steamPriceGame =
        game;


    registeredCards.add(
        card
    );


    if (
        priceModeEnabled
    ) {
        renderPriceForCard(
            card
        );
    }
}


/*
 * Удаление карточки из списка отслеживания.
 */
export function unregisterPriceCard(
    card
) {
    registeredCards.delete(
        card
    );
}


/*
 * Загрузка prices.json.
 */
export async function loadStaticPrices() {
    if (
        pricesLoadingPromise
    ) {
        return pricesLoadingPromise;
    }


    pricesLoadingPromise =
        fetch(
            PRICES_FILE_URL,
            {
                cache:
                    'no-cache'
            }
        )
            .then(
                response => {
                    if (
                        !response.ok
                    ) {
                        throw new Error(
                            `Не удалось загрузить prices.json: HTTP ${response.status}`
                        );
                    }


                    return response.json();
                }
            )
            .then(
                result => {
                    const prices =
                        result?.prices ||
                        result ||
                        {};


                    priceCache.clear();


                    Object.entries(
                        prices
                    ).forEach(
                        ([appId, priceData]) => {
                            priceCache.set(
                                String(appId),
                                priceData
                            );
                        }
                    );


                    pricesUpdatedAt =
                        result?.updatedAt ||
                        null;


                    pricesLoaded =
                        true;


                    console.info(
                        `Цены загружены из prices.json: ${priceCache.size}`
                    );


                    if (
                        pricesUpdatedAt
                    ) {
                        console.info(
                            'Дата обновления цен:',
                            pricesUpdatedAt
                        );
                    }


                    if (
                        priceModeEnabled
                    ) {
                        renderAllPrices();
                    }


                    return priceCache;
                }
            )
            .catch(
                error => {
                    pricesLoaded =
                        false;


                    console.warn(
                        'Ошибка загрузки prices.json:',
                        error
                    );


                    return priceCache;
                }
            )
            .finally(
                () => {
                    pricesLoadingPromise =
                        null;
                }
            );


    return pricesLoadingPromise;
}


/*
 * Повторная загрузка файла раз в сутки.
 */
setInterval(
    () => {
        loadStaticPrices();
    },
    PRICE_RELOAD_INTERVAL
);


/*
 * Возвращает данные цены по App ID.
 */
export function getPrice(
    appId
) {
    if (
        !appId
    ) {
        return null;
    }


    return priceCache.get(
        String(appId)
    ) || null;
}


/*
 * Возвращает дату обновления цен.
 */
export function getPricesUpdatedAt() {
    return pricesUpdatedAt;
}


/*
 * Обновляет цены на всех зарегистрированных карточках.
 */
export function renderAllPrices() {
    registeredCards.forEach(
        card => {
            if (
                !card.isConnected
            ) {
                registeredCards.delete(
                    card
                );

                return;
            }


            renderPriceForCard(
                card
            );
        }
    );
}


/*
 * Отображение цены на одной карточке.
 */
function renderPriceForCard(
    card
) {
    cancelPriceRemoval(
        card
    );


    const game =
        card._steamPriceGame;


    const appId =
        getSteamAppIdFromGame(
            game
        );


    if (
        !appId
    ) {
        return;
    }


    const priceData =
        priceCache.get(
            appId
        );


    if (
        !pricesLoaded
    ) {
        showPriceLoading(
            card
        );

        return;
    }


    if (
        !priceData ||
        priceData.available === false
    ) {
        showPriceUnavailable(
            card
        );

        return;
    }


    renderPrice(
        card,
        priceData
    );
}


/*
 * Получение Steam App ID из данных игры.
 */
function getSteamAppIdFromGame(
    game
) {
    if (
        !game
    ) {
        return null;
    }


    const possibleValues = [
        game['App ID'],
        game['AppID'],
        game.appid,
        game.appId,
        game['Steam Link'],
        game.steamLink,
        game.steam_link
    ];


    for (
        const value of possibleValues
    ) {
        const appId =
            getSteamAppId(
                value
            );


        if (
            appId
        ) {
            return appId;
        }
    }


    return null;
}


/*
 * Получение App ID из ссылки Steam
 * или из числового значения.
 */
function getSteamAppId(
    value
) {
    const text =
        String(
            value || ''
        ).trim();


    if (
        /^\d+$/.test(
            text
        )
    ) {
        return text;
    }


    const match =
        text.match(
            /\/app\/(\d+)/i
        );


    return match
        ? match[1]
        : null;
}


/*
 * Получение или создание элемента цены.
 *
 * Цена помещается внутрь .game-media,
 * чтобы позиционироваться относительно изображения.
 */
function getPriceElement(
    card
) {
    let priceElement =
        card.querySelector(
            `.${PRICE_ELEMENT_CLASS}`
        );


    if (
        priceElement
    ) {
        return priceElement;
    }


    priceElement =
        document.createElement(
            'div'
        );

    priceElement.className =
        PRICE_ELEMENT_CLASS;


    const media =
        card.querySelector(
            '.game-media'
        );


    /*
     * Основной вариант — добавить цену
     * в блок изображения.
     *
     * Запасной вариант оставлен для совместимости
     * со старыми карточками.
     */
    if (
        media
    ) {
        media.appendChild(
            priceElement
        );
    } else {
        card.appendChild(
            priceElement
        );
    }


    return priceElement;
}


/*
 * Состояние загрузки.
 */
function showPriceLoading(
    card
) {
    const priceElement =
        getPriceElement(
            card
        );


    priceElement.classList.remove(
        PRICE_UNAVAILABLE_CLASS
    );

    priceElement.classList.add(
        PRICE_LOADING_CLASS
    );

    priceElement.textContent =
        'Загрузка…';
}


/*
 * Цена недоступна.
 */
function showPriceUnavailable(
    card
) {
    const priceElement =
        getPriceElement(
            card
        );


    priceElement.classList.remove(
        PRICE_LOADING_CLASS
    );

    priceElement.classList.add(
        PRICE_UNAVAILABLE_CLASS
    );

    priceElement.textContent =
        'Цена недоступна';
}


/*
 * Вывод цены и скидки.
 */
function renderPrice(
    card,
    priceData
) {
    const priceElement =
        getPriceElement(
            card
        );


    priceElement.classList.remove(
        PRICE_LOADING_CLASS,
        PRICE_UNAVAILABLE_CLASS
    );


    priceElement.replaceChildren();


    const currentPrice =
        document.createElement(
            'span'
        );

    currentPrice.className =
        'game-price-current';

    currentPrice.textContent =
        priceData.finalFormatted ||
        'Цена недоступна';

    priceElement.appendChild(
        currentPrice
    );


    const hasDiscount =
        Number(
            priceData.discountPercent
        ) > 0 &&
        priceData.initialFormatted;


    if (
        hasDiscount
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


function cancelPriceRemoval(
    card
) {
    const timer =
        priceRemovalTimers.get(
            card
        );


    if (
        timer
    ) {
        clearTimeout(
            timer
        );

        priceRemovalTimers.delete(
            card
        );
    }


    const priceElement =
        card.querySelector(
            `.${PRICE_ELEMENT_CLASS}`
        );


    if (
        priceElement
    ) {
        priceElement.classList.remove(
            'game-price-hiding'
        );
    }
}


/*
 * Удаление цены при выключении режима.
 */
function hideAllPrices() {
    registeredCards.forEach(
        card => {
            const priceElement =
                card.querySelector(
                    `.${PRICE_ELEMENT_CLASS}`
                );


            if (
                !priceElement
            ) {
                return;
            }


            cancelPriceRemoval(
                card
            );


            priceElement.classList.add(
                'game-price-hiding'
            );


            const timer =
                setTimeout(
                    () => {
                        priceElement.remove();

                        priceRemovalTimers.delete(
                            card
                        );
                    },
                    PRICE_HIDE_DURATION
                );


            priceRemovalTimers.set(
                card,
                timer
            );
        }
    );
}

const STEAM_PROXY_URL =
    'https://script.google.com/macros/s/AKfycbyUwe-rY-sOYJIuWNvQQJQa1mP50rkzcihHfZOqjrUTO9oyew4JKz_3cfNfsIveczDJ/exec';


const priceCache =
    new Map();


const priceRequestCache =
    new Map();


let priceModeEnabled =
    false;


/*
 * Включение или выключение режима отображения цен.
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
 * Регистрация карточки игры
 * для последующего получения цены.
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
 * Обновление цены конкретной карточки.
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
     * удаляем цену с карточки.
     */
    if (!priceModeEnabled) {
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
     * цену получить невозможно.
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


    const priceData =
        await getSteamPrice(
            steamLink
        );


    /*
     * Пока выполнялся запрос,
     * пользователь мог выключить режим цен.
     */
    if (!priceModeEnabled) {
        if (priceElement) {
            priceElement.remove();
        }

        return;
    }


    if (!priceData) {
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

        return;
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
 * Создание контейнера цены.
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
 * Отображение текущей цены,
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
 * Получение цены с использованием
 * Google Apps Script-прокси.
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

        return null;
    }


    /*
     * Если цена уже была получена,
     * используем кеш.
     */
    if (priceCache.has(appId)) {
        return priceCache.get(
            appId
        );
    }


    /*
     * Если такой запрос уже выполняется,
     * используем его результат.
     */
    if (
        priceRequestCache.has(appId)
    ) {
        return priceRequestCache.get(
            appId
        );
    }


    const request =
        fetchSteamPrice(
            appId
        );


    priceRequestCache.set(
        appId,
        request
    );


    try {
        const result =
            await request;


        if (result) {
            priceCache.set(
                appId,
                result
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
 * Запрос цены через Apps Script.
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
            console.error(
                'Google Apps Script вернул ошибку:',
                response.status,
                apiUrl
            );

            return null;
        }


        const result =
            await response.json();


        /*
         * Ошибка самого прокси.
         */
        if (
            result?.error ||
            result?.success === false
        ) {
            console.error(
                'Ошибка Google Apps Script:',
                result.error
            );

            return null;
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

            return null;
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


        /*
         * У игры может не быть цены:
         * например, демоверсия, удалённая игра
         * или ещё не вышедший проект.
         */
        if (
            !priceOverview
        ) {
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
    } catch (error) {
        console.error(
            `Не удалось получить цену Steam ` +
            `для appid ${appId}:`,
            error
        );

        return null;
    }
}


/*
 * Извлечение App ID из Steam-ссылки.
 *
 * Поддерживаются ссылки:
 * https://store.steampowered.com/app/3632670/
 * https://steamcommunity.com/app/3632670/
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
 * если Steam не прислал formatted-значение.
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


    return `${(price / 100).toFixed(2)} руб.`;
}

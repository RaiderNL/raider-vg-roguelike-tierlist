const priceCache = new Map();

const priceRequestCache = new Map();

let priceModeEnabled = false;


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
        .querySelectorAll('.game-card')
        .forEach(card => {
            updateCardPrice(
                card
            );
        });
}


export function registerPriceCard(
    card,
    game
) {
    card._priceGame =
        game;

    if (
        priceModeEnabled
    ) {
        updateCardPrice(
            card
        );
    }
}


async function updateCardPrice(
    card
) {
    let priceElement =
        card.querySelector(
            '.game-price'
        );

    if (
        !priceModeEnabled
    ) {
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
        game['Steam Link'] || '';

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
        'game-price-loading',
        'game-price-unavailable'
    );

    priceElement.innerHTML =
        '<span class="game-price-loading-text">Загрузка…</span>';

    const priceData =
        await getSteamPrice(
            steamLink
        );

    /*
     * Пользователь мог выключить режим,
     * пока выполнялся запрос.
     */
    if (
        !priceModeEnabled
    ) {
        priceElement.remove();

        return;
    }

    if (!priceData) {
        priceElement.classList.add(
            'game-price-unavailable'
        );

        priceElement.innerHTML =
            '<span class="game-price-unavailable-text">Цена недоступна</span>';

        return;
    }

    renderPrice(
        priceElement,
        priceData
    );
}


function createPriceElement() {
    const element =
        document.createElement('div');

    element.className =
        'game-price';

    return element;
}


function renderPrice(
    priceElement,
    priceData
) {
    priceElement.innerHTML =
        '';

    const currentPrice =
        document.createElement('span');

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
            document.createElement('span');

        oldPrice.className =
            'game-price-old';

        oldPrice.textContent =
            priceData.initialFormatted;

        const discount =
            document.createElement('span');

        discount.className =
            'game-price-discount';

        discount.textContent =
            `Скидка −${priceData.discountPercent}%`;

        priceElement.appendChild(
            oldPrice
        );

        priceElement.appendChild(
            discount
        );
    }
}


async function getSteamPrice(
    steamLink
) {
    const appId =
        getSteamAppId(
            steamLink
        );

    if (!appId) {
        return null;
    }

    if (
        priceCache.has(appId)
    ) {
        return priceCache.get(
            appId
        );
    }

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

    const result =
        await request;

    priceRequestCache.delete(
        appId
    );

    if (result) {
        priceCache.set(
            appId,
            result
        );
    }

    return result;
}


async function fetchSteamPrice(
    appId
) {
    const apiUrl =
        'https://store.steampowered.com/api/appdetails' +
        `?appids=${encodeURIComponent(appId)}` +
        '&cc=ru' +
        '&l=russian';

    try {
        const response =
            await fetch(
                apiUrl
            );

        if (!response.ok) {
            return null;
        }

        const result =
            await response.json();

        const appResult =
            result?.[appId];

        if (
            !appResult?.success ||
            !appResult.data
        ) {
            return null;
        }

        const data =
            appResult.data;

        if (
            data.is_free
        ) {
            return {
                finalFormatted: 'Бесплатно',
                initialFormatted: '',
                discountPercent: 0
            };
        }

        const price =
            data.price_overview;

        if (!price) {
            return null;
        }

        return {
            finalFormatted:
                price.final_formatted,

            initialFormatted:
                price.initial_formatted,

            discountPercent:
                price.discount_percent
        };
    } catch (error) {
        console.warn(
            `Не удалось получить цену Steam для appid ${appId}:`,
            error
        );

        return null;
    }
}


function getSteamAppId(
    steamLink
) {
    if (!steamLink) {
        return null;
    }

    const match =
        steamLink.match(
            /\/app\/(\d+)/
        );

    return match
        ? match[1]
        : null;
}

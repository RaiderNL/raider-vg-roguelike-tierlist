/*
 * =========================================================
 * Создание карточек игр
 * =========================================================
 *
 * Карточка включает:
 * - обложку;
 * - кнопку избранного;
 * - название;
 * - теги;
 * - popup с описанием, Steam и видео;
 * - цену из steam-price.js.
 */

import {
    getGameTags,
    getSteamImage,
    getVideoUrl
} from './data.js';

import {
    registerPriceCard
} from './steam-price.js';

import {
    setupCardHover,
    createPreviewPopup
} from './previews.js';

import {
    PREVIEW_CLOSED_CLASS
} from './config.js';

import {
    getGameId,
    isFavorite,
    toggleFavorite
} from './favorites.js';


/*
 * =========================================================
 * Основная карточка
 * =========================================================
 */

export function createGameCard(
    game,
    {
        videoFilterActive = false,
        showFavorite = true,
        showInfo = false,
        openOnCardClick = true
    } = {}
) {
    const card =
        document.createElement(
            'article'
        );

    card.className =
        'game-card';

    card.classList.add(
        PREVIEW_CLOSED_CLASS
    );

    const name =
        game['Name'] ||
        'Без названия';

    const cover =
        game['Cover'] ||
        '';

    const steamLink =
        game['Steam Link'] ||
        '';

    const video =
        getVideoUrl(
            game
        );

    const description =
        game['Comment'] ||
        game['Description'] ||
        '';

    const gameTags =
        getGameTags(
            game
        );

    const steamImage =
        getSteamImage(
            steamLink
        );

    const imageUrl =
        cover ||
        steamImage;

    const media =
        createGameMedia();

    if (
        imageUrl
    ) {
        media.appendChild(
            createGameCover(
                imageUrl,
                cover,
                steamImage,
                name
            )
        );
    }

    if (
        showFavorite
    ) {
        media.appendChild(
            createFavoriteButton(
                game,
                name
            )
        );
    }

    let infoButton =
        null;

    if (
        showInfo
    ) {
        infoButton =
            createInfoButton(
                name
            );

        media.appendChild(
            infoButton
        );
    }

    card.appendChild(
        media
    );

    card.appendChild(
        createGameTitle(
            name
        )
    );

    if (
        gameTags.length > 0
    ) {
        card.appendChild(
            createGameTagsElement(
                gameTags
            )
        );
    }

    /*
     * Popup существует, если есть хотя бы один полезный
     * источник информации об игре.
     *
     * При выбранном видео ссылка на само видео в popup
     * не добавляется: оно уже представлено внешней панелью.
     */
    const hasPreviewContent =
        Boolean(
            steamLink ||
            video ||
            description
        );

    if (
        hasPreviewContent
    ) {
        card.appendChild(
            createPreviewPopup(
                {
                    name,
                    cover,
                    steamLink,
                    video:
                        videoFilterActive
                            ? ''
                            : video,
                    steamImage,
                    description
                }
            )
        );
    }

    const openPreview =
        setupCardHover(
            card,
            name,
            steamLink,
            {
                openOnCardClick
            }
        );

    if (
        infoButton &&
        openPreview
    ) {
        infoButton.addEventListener(
            'click',
            event => {
                event.preventDefault();
                event.stopPropagation();

                openPreview();
            }
        );
    }

    /*
     * Система цен самостоятельно решает, нужно ли
     * показывать цену в текущем режиме.
     */
    registerPriceCard(
        card,
        game
    );

    return card;
}


/*
 * =========================================================
 * Медиа-блок и обложка
 * =========================================================
 */

function createGameMedia() {
    const media =
        document.createElement(
            'div'
        );

    media.className =
        'game-media';

    return media;
}


/*
 * Если основная обложка не загрузилась, один раз пытаемся
 * использовать Steam-изображение как запасной вариант.
 */
export function createGameCover(
    imageUrl,
    cover,
    steamImage,
    name
) {
    const image =
        document.createElement(
            'img'
        );

    image.className =
        'game-cover';

    image.src =
        imageUrl;

    image.alt =
        name;

    image.loading =
        'lazy';

    image.decoding =
        'async';

    /*
     * true означает, что сейчас уже используется Steam fallback.
     * Это надёжнее, чем сравнивать image.src со строкой URL:
     * браузер может преобразовать относительный адрес в абсолютный.
     */
    let usesSteamFallback =
        !cover ||
        imageUrl === steamImage;

    image.addEventListener(
        'error',
        () => {
            console.warn(
                `Не удалось загрузить обложку игры: ${name}`
            );

            if (
                !usesSteamFallback &&
                steamImage
            ) {
                usesSteamFallback =
                    true;

                image.src =
                    steamImage;

                return;
            }

            image.remove();
        }
    );

    return image;
}


/*
 * =========================================================
 * Избранное
 * =========================================================
 */

function createFavoriteButton(
    game,
    name
) {
    const button =
        document.createElement(
            'button'
        );

    button.className =
        'favorite-button';

    button.type =
        'button';

    const gameId =
        getGameId(
            game
        );

    button.dataset.gameId =
        gameId;

    updateFavoriteButton(
        button,
        game,
        name
    );

    /*
     * Игра без ID не может иметь стабильную запись
     * в localStorage, поэтому кнопка становится недоступной.
     */
    if (
        !gameId
    ) {
        button.disabled =
            true;

        button.title =
            'Нельзя добавить игру без ID';

        button.setAttribute(
            'aria-label',
            'Нельзя добавить игру без ID'
        );

        return button;
    }

    button.addEventListener(
        'click',
        event => {
            /*
             * Кнопка не должна открывать preview popup.
             */
            event.preventDefault();
            event.stopPropagation();

            /*
             * toggleFavorite() сам отправляет событие
             * favoriteschange после успешного сохранения.
             *
             * Не отправляем его повторно здесь, иначе
             * один клик вызовет две перерисовки тир-листа.
             */
            toggleFavorite(
                game
            );

            /*
             * Обновляем состояние сразу. Если активен фильтр
             * избранного, обработчик favoriteschange уже может
             * заменить карточку новым рендером — обновление
             * старого элемента при этом безопасно.
             */
            updateFavoriteButton(
                button,
                game,
                name
            );
        }
    );

    button.addEventListener(
        'keydown',
        event => {
            event.stopPropagation();
        }
    );

    return button;
}


function updateFavoriteButton(
    button,
    game,
    name
) {
    const favorite =
        isFavorite(
            game
        );

    button.classList.toggle(
        'is-favorite',
        favorite
    );

    button.textContent =
        favorite
            ? '★'
            : '☆';

    button.setAttribute(
        'aria-pressed',
        String(
            favorite
        )
    );

    const label =
        favorite
            ? `Удалить «${name}» из избранного`
            : `Добавить «${name}» в избранное`;

    button.setAttribute(
        'aria-label',
        label
    );

    button.title =
        favorite
            ? 'Удалить из избранного'
            : 'Добавить в избранное';
}


/*
 * =========================================================
 * Необязательная кнопка информации
 * =========================================================
 */

function createInfoButton(
    name
) {
    const button =
        document.createElement(
            'button'
        );

    button.className =
        'game-info-button';

    button.type =
        'button';

    button.textContent =
        'ⓘ';

    button.setAttribute(
        'aria-label',
        `Информация об игре ${name}`
    );

    button.title =
        'Показать информацию об игре';

    button.draggable =
        false;

    button.addEventListener(
        'keydown',
        event => {
            event.stopPropagation();
        }
    );

    return button;
}


/*
 * =========================================================
 * Название и теги
 * =========================================================
 */

export function createGameTitle(
    name
) {
    const title =
        document.createElement(
            'h3'
        );

    title.className =
        'game-title';

    title.textContent =
        name;

    return title;
}


export function createGameTagsElement(
    tags
) {
    const tagsContainer =
        document.createElement(
            'div'
        );

    tagsContainer.className =
        'game-tags';

    tags.forEach(
        tag => {
            const tagElement =
                document.createElement(
                    'span'
                );

            tagElement.className =
                'game-tag';

            tagElement.textContent =
                tag;

            tagsContainer.appendChild(
                tagElement
            );
        }
    );

    return tagsContainer;
}


/*
 * Используется другими модулями для простых текстовых блоков.
 */
export function createTextElement(
    className,
    text
) {
    const element =
        document.createElement(
            'p'
        );

    element.className =
        className;

    element.textContent =
        text;

    return element;
}

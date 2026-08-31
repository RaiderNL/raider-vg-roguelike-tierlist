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


    /*
     * Медиа-блок содержит обложку,
     * кнопки и цену.
     */
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
        const favoriteButton =
            createFavoriteButton(
                game,
                name
            );

        media.appendChild(
            favoriteButton
        );
    }

    let infoButton = null;

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
     * Описание, Steam-ссылка или видео
     * создают popup.
     */
    if (
        steamLink ||
        video ||
        description
    ) {
        card.appendChild(
            createPreviewPopup({
                name,
                cover,
                steamLink,
                video:
                    videoFilterActive
                        ? ''
                        : video,
                steamImage,
                description
            })
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
     * Регистрация карточки в системе цен.
     */
    registerPriceCard(
        card,
        game
    );

    return card;
}


function createGameMedia() {
    const media =
        document.createElement(
            'div'
        );

    media.className =
        'game-media';

    return media;
}


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
        game
    );

    button.addEventListener(
        'click',
        event => {
            /*
             * Не открываем popup при нажатии
             * на кнопку избранного.
             */
            event.preventDefault();
            event.stopPropagation();

            if (
                !gameId
            ) {
                return;
            }

            toggleFavorite(
                game
            );

            updateFavoriteButton(
                button,
                game
            );

            /*
             * main.js будет использовать это событие,
             * чтобы обновить фильтр избранного.
             */
            window.dispatchEvent(
                new CustomEvent(
                    'favoriteschange'
                )
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


function updateFavoriteButton(
    button,
    game
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

    button.setAttribute(
        'aria-label',
        favorite
            ? 'Удалить игру из избранного'
            : 'Добавить игру в избранное'
    );

    button.title =
        favorite
            ? 'Удалить из избранного'
            : 'Добавить в избранное';
}


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

    image.addEventListener(
        'error',
        () => {
            console.warn(
                `Не удалось загрузить обложку игры: ${name}`
            );

            if (
                cover &&
                steamImage &&
                image.src !== steamImage
            ) {
                image.src =
                    steamImage;

                return;
            }

            image.remove();
        }
    );

    return image;
}


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

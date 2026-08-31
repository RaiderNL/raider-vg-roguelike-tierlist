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


export function createGameCard(
    game
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
     * Медиа-блок содержит обложку и цену.
     *
     * Цена добавляется позже в steam-price.js,
     * но уже будет найдена внутри этого блока.
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
                video,
                steamImage,
                description
            })
        );
    }


    setupCardHover(
        card,
        name,
        steamLink
    );


    /*
     * Регистрация происходит после создания всей карточки.
     * steam-price.js найдёт .game-media и добавит цену внутрь него.
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

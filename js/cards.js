import {
    getGameTags,
    getSteamImage
} from './data.js';

import {
    setupCardHover,
    createPreviewPopup,
    closeAllPreviews
} from './previews.js';

import {
    PREVIEW_CLOSED_CLASS
} from './config.js';


// Создание полной карточки игры
export function createGameCard(game) {
    const card =
        document.createElement('article');

    card.className =
        'game-card';

    card.classList.add(
        PREVIEW_CLOSED_CLASS
    );

    const name =
        game['Name'] || 'Без названия';

    const cover =
        game['Cover'] || '';

    const steamLink =
        game['Steam Link'] || '';

    const video =
        game['Video'] || '';

    const description =
        game['Description'] || '';

    const comment =
        game['Comment'] || '';

    const gameTags =
        getGameTags(game);

    const steamImage =
        getSteamImage(steamLink);

    const imageUrl =
        cover || steamImage;

    setupCardHover(card);

    setupCardSteamLink(
        card,
        steamLink,
        name
    );

    if (imageUrl) {
        card.appendChild(
            createGameCover(
                imageUrl,
                cover,
                steamImage,
                name
            )
        );
    }

    card.appendChild(
        createGameTitle(name)
    );

    if (gameTags.length > 0) {
        card.appendChild(
            createGameTagsElement(gameTags)
        );
    }

    if (description) {
        card.appendChild(
            createTextElement(
                'game-description',
                description
            )
        );
    }

    if (comment) {
        card.appendChild(
            createTextElement(
                'game-comment',
                comment
            )
        );
    }

    if (steamLink || video) {
        card.appendChild(
            createPreviewPopup({
                name,
                cover,
                steamLink,
                video,
                steamImage
            })
        );
    }

    return card;
}


// Настройка перехода на страницу игры в Steam
export function setupCardSteamLink(
    card,
    steamLink,
    name
) {
    if (!steamLink) {
        return;
    }

    card.classList.add(
        'game-card-clickable'
    );

    card.setAttribute(
        'role',
        'link'
    );

    card.setAttribute(
        'tabindex',
        '0'
    );

    card.setAttribute(
        'aria-label',
        `Открыть страницу игры ${name} в Steam`
    );

    card.addEventListener(
        'click',
        event => {
            /*
             * Клик внутри popup не должен
             * открывать Steam-ссылку карточки.
             */
            if (
                event.target.closest(
                    '.game-preview-popup'
                )
            ) {
                return;
            }

            closeAllPreviews();
            openExternalLink(steamLink);
        }
    );

    card.addEventListener(
        'keydown',
        event => {
            if (
                event.key !== 'Enter' &&
                event.key !== ' '
            ) {
                return;
            }

            /*
             * Клавиатурное событие внутри popup
             * не должно открывать Steam-ссылку.
             */
            if (
                event.target.closest(
                    '.game-preview-popup'
                )
            ) {
                return;
            }

            event.preventDefault();

            closeAllPreviews();
            openExternalLink(steamLink);
        }
    );
}


// Создание изображения обложки игры
export function createGameCover(
    imageUrl,
    cover,
    steamImage,
    name
) {
    const image =
        document.createElement('img');

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

            /*
             * Если пользовательская обложка
             * не загрузилась, пробуем изображение
             * из Steam.
             */
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


// Создание названия игры
export function createGameTitle(name) {
    const title =
        document.createElement('h3');

    title.className =
        'game-title';

    title.textContent =
        name;

    return title;
}


// Создание списка тегов игры
export function createGameTagsElement(tags) {
    const tagsContainer =
        document.createElement('div');

    tagsContainer.className =
        'game-tags';

    tags.forEach(tag => {
        const tagElement =
            document.createElement('span');

        tagElement.className =
            'game-tag';

        tagElement.textContent =
            tag;

        tagsContainer.appendChild(
            tagElement
        );
    });

    return tagsContainer;
}


// Создание текстового элемента карточки
export function createTextElement(
    className,
    text
) {
    const element =
        document.createElement('p');

    element.className =
        className;

    element.textContent =
        text;

    return element;
}


// Открытие внешней ссылки
function openExternalLink(url) {
    const newWindow =
        window.open(
            url,
            '_blank',
            'noopener,noreferrer'
        );

    if (newWindow) {
        newWindow.opener =
            null;
    }
}

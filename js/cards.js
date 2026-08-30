import {
    getGameTags,
    getSteamImage
} from './data.js';

import {
    setupCardHover,
    createPreviewPopup
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


    /*
     * Popup должен быть добавлен до вызова
     * setupCardHover(), потому что setupCardHover()
     * получает ссылку на уже существующий popup.
     */
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


    /*
     * Карточка открывает popup по клику.
     * Переход на Steam выполняется только
     * через ссылку внутри popup.
     */
    setupCardHover(
        card,
        name
    );

    return card;
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

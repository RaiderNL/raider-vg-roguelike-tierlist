import {
    PREVIEW_CLOSED_CLASS,
    PREVIEW_READY_CLASS,
    ACTIVE_ROW_CLASS,
    ACTIVE_CARD_CLASS,
    VIDEO_FILTER_ACTIVE_CLASS,
    PREVIEW_CLOSE_DELAY,
    PREVIEW_LAYER_CLEANUP_DELAY,
    SCREEN_PADDING,
    PREVIEW_GAP
} from './config.js';

import {
    getYouTubeThumbnail
} from './video.js';


export function setupCardHover(
    card,
    name
) {
    let closeTimer = null;
    let layerCleanupTimer = null;

    const popup =
        card.querySelector(
            '.game-preview-popup'
        );

    /*
     * Если у игры нет ни Steam-ссылки,
     * ни видео, popup не создаётся.
     */
    if (!popup) {
        return;
    }

    /*
     * Карточка теперь является кнопкой,
     * открывающей popup.
     */
    card.setAttribute(
        'role',
        'button'
    );

    card.setAttribute(
        'tabindex',
        '0'
    );

    card.setAttribute(
        'aria-label',
        `Открыть меню игры ${name}`
    );


    const cancelClose = () => {
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }

        if (layerCleanupTimer) {
            clearTimeout(layerCleanupTimer);
            layerCleanupTimer = null;
        }
    };


    const openPreview = () => {
        cancelClose();

        const layout =
            document.querySelector(
                '.tier-list-layout'
            );

        /*
         * При выбранном видео popup карточек
         * не используется.
         */
        if (
            layout?.classList.contains(
                VIDEO_FILTER_ACTIVE_CLASS
            )
        ) {
            return;
        }

        /*
         * Активный слой устанавливается
         * до показа popup.
         */
        card.classList.remove(
            PREVIEW_CLOSED_CLASS
        );

        card.classList.add(
            ACTIVE_CARD_CLASS
        );

        setTierRowActive(
            card,
            true
        );

        /*
         * Даём браузеру сначала применить
         * новый stacking context, затем
         * рассчитываем позицию popup.
         */
        requestAnimationFrame(() => {
            if (
                !card.classList.contains(
                    PREVIEW_CLOSED_CLASS
                )
            ) {
                positionPreview(card);
            }
        });
    };


    const scheduleLayerCleanup = () => {
        if (layerCleanupTimer) {
            clearTimeout(layerCleanupTimer);
        }

        layerCleanupTimer = setTimeout(() => {
            /*
             * Если пользователь снова открыл popup
             * или навёлся на карточку, слой не убираем.
             */
            if (
                card.classList.contains(
                    PREVIEW_CLOSED_CLASS
                ) &&
                !card.matches(':hover') &&
                !card.matches(':focus-within')
            ) {
                card.classList.remove(
                    ACTIVE_CARD_CLASS
                );

                setTierRowActive(
                    card,
                    false
                );
            }

            layerCleanupTimer = null;
        }, PREVIEW_LAYER_CLEANUP_DELAY);
    };


    const closePreview = () => {
        if (closeTimer) {
            clearTimeout(closeTimer);
        }

        closeTimer = setTimeout(() => {
            /*
             * Если курсор всё ещё находится
             * на карточке или popup, закрытие
             * отменяется.
             */
            if (
                card.matches(':hover') ||
                popup.matches(':hover') ||
                card.matches(':focus-within')
            ) {
                closeTimer = null;
                return;
            }

            /*
             * Сначала запускаем fade-out.
             * Высокий z-index пока сохраняется.
             */
            card.classList.add(
                PREVIEW_CLOSED_CLASS
            );

            card.classList.remove(
                PREVIEW_READY_CLASS
            );

            /*
             * ACTIVE_CARD_CLASS и ACTIVE_ROW_CLASS
             * будут удалены только после завершения
             * анимации исчезновения.
             */
            scheduleLayerCleanup();

            closeTimer = null;
        }, PREVIEW_CLOSE_DELAY);
    };


    /*
     * Открытие popup по клику на карточку.
     */
    card.addEventListener(
        'click',
        event => {
            /*
             * Клик по ссылке Steam или YouTube
             * не должен повторно открывать popup.
             */
            if (
                event.target.closest(
                    '.game-preview-popup'
                )
            ) {
                return;
            }

            openPreview();
        }
    );


    /*
     * Открытие popup клавишами Enter и Space.
     */
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
             * Ссылки внутри popup должны
             * обрабатываться браузером самостоятельно.
             */
            if (
                event.target.closest(
                    '.game-preview-popup'
                )
            ) {
                return;
            }

            event.preventDefault();

            openPreview();
        }
    );


    /*
     * Наведение popup не открывает его.
     * Popup уже открыт кликом и просто остаётся
     * видимым при перемещении мыши внутри карточки.
     */


    /*
     * Уход мыши за пределы карточки вместе
     * со всем её содержимым закрывает popup.
     */
    card.addEventListener(
        'mouseleave',
        event => {
            /*
             * Переход между карточкой и popup
             * считается перемещением внутри одной
             * интерактивной области.
             */
            if (
                event.relatedTarget &&
                card.contains(event.relatedTarget)
            ) {
                return;
            }

            closePreview();
        }
    );


    /*
     * Поддержка клавиатурной навигации.
     */
    card.addEventListener(
        'focusin',
        () => {
            /*
             * Фокус на самой карточке открывает popup.
             * Фокус на ссылках popup не вызывает
             * повторное открытие.
             */
            if (
                document.activeElement === card
            ) {
                openPreview();
            }
        }
    );


    card.addEventListener(
        'focusout',
        event => {
            /*
             * Если фокус перешёл с карточки
             * на ссылку внутри popup, popup
             * не закрываем.
             */
            if (
                card.contains(event.relatedTarget)
            ) {
                return;
            }

            closePreview();
        }
    );


    /*
     * Эти методы используются
     * closeAllPreviews() из main.js
     * и обработчиком popup.
     */
    card._cancelPreviewClose =
        cancelClose;

    card._closePreviewImmediately = () => {
        cancelClose();

        card.classList.add(
            PREVIEW_CLOSED_CLASS
        );

        card.classList.remove(
            PREVIEW_READY_CLASS
        );

        /*
         * Слой сохраняется на время fade-out.
         */
        scheduleLayerCleanup();
    };
}


function setTierRowActive(
    card,
    isActive
) {
    const tierRow =
        card.closest('.tier-row');

    if (!tierRow) {
        return;
    }

    tierRow.classList.toggle(
        ACTIVE_ROW_CLASS,
        isActive
    );
}


export function createPreviewPopup({
    name,
    cover,
    steamLink,
    video,
    steamImage
}) {
    const popup =
        document.createElement('div');

    popup.className =
        'game-preview-popup';

    /*
     * Клик внутри popup не должен
     * всплывать до обработчика карточки.
     */
    popup.addEventListener(
        'click',
        event => {
            event.stopPropagation();
        }
    );

    /*
     * Клавиатурные события ссылок
     * не должны обрабатываться карточкой.
     */
    popup.addEventListener(
        'keydown',
        event => {
            event.stopPropagation();
        }
    );

    if (steamLink) {
        popup.appendChild(
            createSteamPreview({
                name,
                cover,
                steamLink,
                steamImage
            })
        );
    }

    if (video) {
        popup.appendChild(
            createVideoPreview(
                name,
                video
            )
        );
    }

    return popup;
}


function createSteamPreview({
    name,
    cover,
    steamLink,
    steamImage
}) {
    const preview =
        document.createElement('a');

    preview.className =
        'preview-link';

    preview.href =
        steamLink;

    preview.target =
        '_blank';

    preview.rel =
        'noopener noreferrer';

    preview.title =
        `Открыть ${name} в Steam`;

    const image =
        document.createElement('img');

    image.className =
        'preview-image';

    image.src =
        cover || steamImage;

    image.alt =
        `${name} — страница в Steam`;

    image.loading =
        'lazy';

    image.addEventListener(
        'error',
        () => {
            if (
                cover &&
                steamImage &&
                image.src !== steamImage
            ) {
                image.src =
                    steamImage;
            }
        }
    );

    const label =
        document.createElement('span');

    label.className =
        'preview-label';

    label.textContent =
        'Открыть в Steam';

    preview.appendChild(
        image
    );

    preview.appendChild(
        label
    );

    return preview;
}


function createVideoPreview(
    name,
    video
) {
    const preview =
        document.createElement('a');

    preview.className =
        'preview-link';

    preview.href =
        video;

    preview.target =
        '_blank';

    preview.rel =
        'noopener noreferrer';

    preview.title =
        `Смотреть обзор игры ${name}`;

    const thumbnail =
        getYouTubeThumbnail(video);

    if (thumbnail) {
        const image =
            document.createElement('img');

        image.className =
            'preview-image';

        image.src =
            thumbnail;

        image.alt =
            `${name} — видеообзор`;

        image.loading =
            'lazy';

        preview.appendChild(
            image
        );
    } else {
        const placeholder =
            document.createElement('div');

        placeholder.className =
            'preview-image preview-image-placeholder';

        placeholder.textContent =
            '▶';

        preview.appendChild(
            placeholder
        );
    }

    const label =
        document.createElement('span');

    label.className =
        'preview-label';

    label.textContent =
        'Смотреть обзор';

    preview.appendChild(
        label
    );

    return preview;
}


function positionPreview(card) {
    const popup =
        card.querySelector(
            '.game-preview-popup'
        );

    if (!popup) {
        return;
    }

    card.classList.remove(
        PREVIEW_READY_CLASS
    );

    popup.classList.remove(
        'preview-position-right',
        'preview-position-left',
        'preview-position-bottom'
    );

    const cardRect =
        card.getBoundingClientRect();

    const popupWidth =
        popup.offsetWidth;

    const popupHeight =
        popup.offsetHeight;

    const viewportWidth =
        window.innerWidth;

    const viewportHeight =
        window.innerHeight;

    const centeredLeft =
        cardRect.left +
        (cardRect.width - popupWidth) / 2;

    const centeredTop =
        cardRect.top +
        (cardRect.height - popupHeight) / 2;

    const topPosition =
        cardRect.top -
        popupHeight -
        PREVIEW_GAP;

    const rightPosition =
        cardRect.right +
        PREVIEW_GAP;

    const leftPosition =
        cardRect.left -
        popupWidth -
        PREVIEW_GAP;

    const bottomPosition =
        cardRect.bottom +
        PREVIEW_GAP;

    const fitsAbove =
        topPosition >= SCREEN_PADDING;

    const fitsRight =
        rightPosition + popupWidth <=
        viewportWidth - SCREEN_PADDING;

    const fitsLeft =
        leftPosition >= SCREEN_PADDING;

    const fitsBelow =
        bottomPosition + popupHeight <=
        viewportHeight - SCREEN_PADDING;

    let popupLeft;
    let popupTop;


    if (fitsAbove) {
        popupLeft = clamp(
            centeredLeft,
            SCREEN_PADDING,
            viewportWidth -
                popupWidth -
                SCREEN_PADDING
        );

        popupTop =
            topPosition;
    } else if (fitsRight) {
        popup.classList.add(
            'preview-position-right'
        );

        popupLeft =
            rightPosition;

        popupTop = clamp(
            centeredTop,
            SCREEN_PADDING,
            viewportHeight -
                popupHeight -
                SCREEN_PADDING
        );
    } else if (fitsLeft) {
        popup.classList.add(
            'preview-position-left'
        );

        popupLeft =
            leftPosition;

        popupTop = clamp(
            centeredTop,
            SCREEN_PADDING,
            viewportHeight -
                popupHeight -
                SCREEN_PADDING
        );
    } else {
        popup.classList.add(
            'preview-position-bottom'
        );

        popupLeft = clamp(
            centeredLeft,
            SCREEN_PADDING,
            viewportWidth -
                popupWidth -
                SCREEN_PADDING
        );

        popupTop = fitsBelow
            ? bottomPosition
            : clamp(
                topPosition,
                SCREEN_PADDING,
                viewportHeight -
                    popupHeight -
                    SCREEN_PADDING
            );
    }


    popup.style.left =
        `${popupLeft - cardRect.left}px`;

    popup.style.top =
        `${popupTop - cardRect.top}px`;

    popup.style.right =
        'auto';

    popup.style.bottom =
        'auto';

    card.classList.add(
        PREVIEW_READY_CLASS
    );
}


export function updateVisiblePreviewPositions() {
    document
        .querySelectorAll(
            `.game-card:not(.${PREVIEW_CLOSED_CLASS})`
        )
        .forEach(card => {
            const popup =
                card.querySelector(
                    '.game-preview-popup'
                );

            if (popup) {
                positionPreview(card);
            }
        });
}


export function closeAllPreviews() {
    document
        .querySelectorAll('.game-card')
        .forEach(card => {
            if (
                card._closePreviewImmediately
            ) {
                card._closePreviewImmediately();

                return;
            }

            if (
                card._cancelPreviewClose
            ) {
                card._cancelPreviewClose();
            }

            card.classList.add(
                PREVIEW_CLOSED_CLASS
            );

            card.classList.remove(
                PREVIEW_READY_CLASS
            );
        });
}


function clamp(
    value,
    min,
    max
) {
    return Math.min(
        Math.max(value, min),
        max
    );
}

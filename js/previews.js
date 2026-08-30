import {
    PREVIEW_CLOSED_CLASS,
    PREVIEW_READY_CLASS,
    ACTIVE_ROW_CLASS,
    ACTIVE_CARD_CLASS,
    VIDEO_FILTER_ACTIVE_CLASS,
    PREVIEW_CLOSE_DELAY,
    PREVIEW_FADE_DURATION,
    PREVIEW_LAYER_CLEANUP_DELAY,
    SCREEN_PADDING,
    PREVIEW_GAP
} from './config.js';

import {
    getYouTubeThumbnail
} from './video.js';


export function setupCardHover(card) {
    let closeTimer = null;
    let layerCleanupTimer = null;

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

        if (
            layout?.classList.contains(
                VIDEO_FILTER_ACTIVE_CLASS
            )
        ) {
            return;
        }

        const popup =
            card.querySelector(
                '.game-preview-popup'
            );

        if (!popup) {
            return;
        }

        /*
         * Активный слой добавляется до начала
         * отображения popup.
         */
        card.classList.remove(
            PREVIEW_CLOSED_CLASS
        );

        card.classList.add(
            ACTIVE_CARD_CLASS
        );

        setTierRowActive(card, true);

        /*
         * Сначала браузер применяет состояние
         * открытой карточки, затем вычисляется
         * размер и позиция popup.
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
             * Если за время fade-out пользователь
             * снова навёл мышь на карточку,
             * высокий слой сохраняется.
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

                setTierRowActive(card, false);
            }

            layerCleanupTimer = null;
        }, PREVIEW_LAYER_CLEANUP_DELAY);
    };

    const closePreview = () => {
        if (closeTimer) {
            clearTimeout(closeTimer);
        }

        closeTimer = setTimeout(() => {
            const popup =
                card.querySelector(
                    '.game-preview-popup'
                );

            /*
             * Карточка или popup всё ещё находятся
             * под курсором — закрывать нельзя.
             */
            if (
                card.matches(':hover') ||
                (popup && popup.matches(':hover')) ||
                card.matches(':focus-within')
            ) {
                closeTimer = null;
                return;
            }

            /*
             * Fade-out начинается сразу.
             */
            card.classList.add(
                PREVIEW_CLOSED_CLASS
            );

            card.classList.remove(
                PREVIEW_READY_CLASS
            );

            /*
             * ACTIVE_CARD_CLASS и ACTIVE_ROW_CLASS
             * пока остаются. Благодаря этому popup
             * находится поверх остальных элементов
             * до полного завершения fade-out.
             */
            scheduleLayerCleanup();

            closeTimer = null;
        }, PREVIEW_CLOSE_DELAY);
    };

    card.addEventListener(
        'mouseenter',
        openPreview
    );

    card.addEventListener(
        'mouseleave',
        event => {
            /*
             * Переход с карточки на popup считается
             * переходом внутри одной карточки.
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

    card.addEventListener(
        'focusin',
        openPreview
    );

    card.addEventListener(
        'focusout',
        event => {
            if (
                !card.contains(event.relatedTarget)
            ) {
                closePreview();
            }
        }
    );

    /*
     * Эти методы используются функцией
     * closeAllPreviews().
     */
    card._cancelPreviewClose = cancelClose;
    card._closePreviewImmediately = () => {
        cancelClose();

        card.classList.add(
            PREVIEW_CLOSED_CLASS
        );

        card.classList.remove(
            PREVIEW_READY_CLASS
        );

        /*
         * Даже при принудительном закрытии
         * оставляем высокий слой на время fade-out.
         */
        scheduleLayerCleanup();
    };
}


function setTierRowActive(card, isActive) {
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
     * Popup не меняет классы самостоятельно.
     * Состоянием полностью управляет карточка
     * через setupCardHover().
     */

    popup.addEventListener(
        'click',
        event => {
            event.stopPropagation();
            closeAllPreviews();
        }
    );

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

    preview.appendChild(image);
    preview.appendChild(label);

    return preview;
}


function createVideoPreview(name, video) {
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

        preview.appendChild(image);
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

    preview.appendChild(label);

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


function resetPreviewPosition(card) {
    const popup =
        card.querySelector(
            '.game-preview-popup'
        );

    card.classList.remove(
        PREVIEW_READY_CLASS
    );

    if (!popup) {
        return;
    }

    popup.classList.remove(
        'preview-position-right',
        'preview-position-left',
        'preview-position-bottom'
    );

    popup.style.left =
        '';

    popup.style.top =
        '';

    popup.style.right =
        '';

    popup.style.bottom =
        '';
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

            /*
             * Запасной вариант для карточек,
             * созданных до инициализации обработчиков.
             */
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


function clamp(value, min, max) {
    return Math.min(
        Math.max(value, min),
        max
    );
}

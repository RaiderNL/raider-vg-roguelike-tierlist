/*
 * =========================================================
 * Popup предпросмотра карточек
 * =========================================================
 *
 * Модуль отвечает за:
 * - создание содержимого popup;
 * - открытие и закрытие preview;
 * - перенос popup в body на мобильных;
 * - позиционирование desktop-popup;
 * - закрытие всех popup при смене фильтров;
 * - поддержку клавиатуры.
 */

import {
    PREVIEW_CLOSED_CLASS,
    PREVIEW_READY_CLASS,
    ACTIVE_ROW_CLASS,
    ACTIVE_CARD_CLASS,
    PREVIEW_CLOSE_DELAY,
    PREVIEW_LAYER_CLEANUP_DELAY,
    SCREEN_PADDING,
    PREVIEW_GAP
} from './config.js';

import {
    getYouTubeThumbnail
} from './video.js';


const MOBILE_PREVIEW_QUERY =
    '(max-width: 600px)';

const MOBILE_MODAL_CLASS =
    'game-preview-popup-mobile-modal';

const POPUP_CLASS =
    'game-preview-popup';

const POPUP_POSITION_CLASSES =
    [
        'preview-position-right',
        'preview-position-left',
        'preview-position-bottom'
    ];


/*
 * =========================================================
 * Подключение поведения к карточке
 * =========================================================
 */

export function setupCardHover(
    card,
    name,
    steamLink,
    {
        openOnCardClick = true
    } = {}
) {
    const popup =
        card.querySelector(
            `.${POPUP_CLASS}`
        );

    if (
        !popup
    ) {
        return null;
    }

    const state = {
        closeTimer: null,
        layerCleanupTimer: null
    };

    const closeButton =
        createPreviewCloseButton();

    popup.appendChild(
        closeButton
    );

    /*
     * Презентационный режим передаёт openOnCardClick: false.
     * В этом случае карточка не получает role="button" и tabindex,
     * потому что интерактивность в нём намеренно отключена.
     */
    if (
        openOnCardClick
    ) {
        makeCardPreviewAccessible(
            card,
            name
        );
    }

    const isMobilePreview =
        () =>
            window.matchMedia(
                MOBILE_PREVIEW_QUERY
            ).matches;

    const cancelClose =
        () => {
            clearCardTimer(
                state,
                'closeTimer'
            );

            clearCardTimer(
                state,
                'layerCleanupTimer'
            );
        };

    const restorePopupToCard =
        () => {
            const placeholder =
                popup._mobilePreviewPlaceholder;

            if (
                placeholder?.parentNode
            ) {
                placeholder.replaceWith(
                    popup
                );
            }

            popup._mobilePreviewPlaceholder =
                null;

            popup.classList.remove(
                MOBILE_MODAL_CLASS
            );

            clearPopupInlinePosition(
                popup
            );
        };

    const closePreviewImmediately =
        () => {
            cancelClose();

            restorePopupToCard();

            card.classList.add(
                PREVIEW_CLOSED_CLASS
            );

            card.classList.remove(
                PREVIEW_READY_CLASS,
                ACTIVE_CARD_CLASS
            );

            updateTierRowActiveState(
                card
            );
        };

    const movePopupToMobileModalLayer =
        () => {
            closeOtherPreviews(
                card
            );

            if (
                popup._mobilePreviewPlaceholder
            ) {
                return;
            }

            const placeholder =
                document.createComment(
                    'mobile-preview-placeholder'
                );

            popup.before(
                placeholder
            );

            popup._mobilePreviewPlaceholder =
                placeholder;

            document.body.appendChild(
                popup
            );

            popup.classList.add(
                MOBILE_MODAL_CLASS
            );
        };

    const openPreview =
        () => {
            cancelClose();

            const isMobile =
                isMobilePreview();

            /*
             * На десктопе тоже закрываем уже открытые карточки:
             * в один момент времени виден только один preview.
             */
            closeOtherPreviews(
                card
            );

            if (
                isMobile
            ) {
                movePopupToMobileModalLayer();
            } else {
                restorePopupToCard();
            }

            card.classList.remove(
                PREVIEW_CLOSED_CLASS
            );

            card.classList.add(
                ACTIVE_CARD_CLASS
            );

            updateTierRowActiveState(
                card
            );

            requestAnimationFrame(
                () => {
                    if (
                        !card.isConnected ||
                        card.classList.contains(
                            PREVIEW_CLOSED_CLASS
                        )
                    ) {
                        return;
                    }

                    if (
                        isMobile
                    ) {
                        popup.scrollTop =
                            0;

                        closeButton.focus();

                        return;
                    }

                    positionPreview(
                        card
                    );
                }
            );
        };

    const scheduleLayerCleanup =
        () => {
            clearCardTimer(
                state,
                'layerCleanupTimer'
            );

            state.layerCleanupTimer =
                window.setTimeout(
                    () => {
                        if (
                            card.classList.contains(
                                PREVIEW_CLOSED_CLASS
                            ) &&
                            !card.matches(
                                ':hover'
                            ) &&
                            !card.matches(
                                ':focus-within'
                            )
                        ) {
                            card.classList.remove(
                                ACTIVE_CARD_CLASS
                            );

                            updateTierRowActiveState(
                                card
                            );
                        }

                        state.layerCleanupTimer =
                            null;
                    },
                    PREVIEW_LAYER_CLEANUP_DELAY
                );
        };

    const closePreview =
        (
            respectFocus = true
        ) => {
            /*
             * На мобильном popup закрывается только крестиком,
             * Escape или глобальным closeAllPreviews().
             */
            if (
                isMobilePreview()
            ) {
                return;
            }

            clearCardTimer(
                state,
                'closeTimer'
            );

            state.closeTimer =
                window.setTimeout(
                    () => {
                        const shouldStayOpen =
                            card.matches(
                                ':hover'
                            ) ||
                            popup.matches(
                                ':hover'
                            ) ||
                            (
                                respectFocus &&
                                card.matches(
                                    ':focus-within'
                                )
                            );

                        if (
                            shouldStayOpen
                        ) {
                            state.closeTimer =
                                null;

                            return;
                        }

                        card.classList.add(
                            PREVIEW_CLOSED_CLASS
                        );

                        card.classList.remove(
                            PREVIEW_READY_CLASS
                        );

                        scheduleLayerCleanup();

                        state.closeTimer =
                            null;
                    },
                    PREVIEW_CLOSE_DELAY
                );
        };

    setupPopupEvents(
        {
            card,
            popup,
            closeButton,
            openPreview,
            closePreview,
            closePreviewImmediately,
            cancelClose
        }
    );

    if (
        openOnCardClick
    ) {
        setupCardInteractionEvents(
            {
                card,
                popup,
                openPreview,
                closePreview
            }
        );
    }

    /*
     * Эти ссылки используются глобальными функциями:
     * closeAllPreviews() и closeOtherPreviews().
     */
    card._cancelPreviewClose =
        cancelClose;

    card._closePreviewImmediately =
        closePreviewImmediately;

    popup._closePreviewImmediately =
        closePreviewImmediately;

    return openPreview;
}


/*
 * =========================================================
 * Поведение карточки и popup
 * =========================================================
 */

function makeCardPreviewAccessible(
    card,
    name
) {
    card.classList.add(
        'game-card-clickable'
    );

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
}


function setupPopupEvents(
    {
        card,
        popup,
        closeButton,
        openPreview,
        closePreview,
        closePreviewImmediately,
        cancelClose
    }
) {
    closeButton.addEventListener(
        'click',
        event => {
            event.preventDefault();
            event.stopPropagation();

            closePreviewImmediately();

            card.focus();
        }
    );

    popup.addEventListener(
        'click',
        event => {
            event.stopPropagation();
        }
    );

    popup.addEventListener(
        'keydown',
        event => {
            event.stopPropagation();

            if (
                event.key !==
                'Escape'
            ) {
                return;
            }

            event.preventDefault();

            closePreviewImmediately();

            card.focus();
        }
    );

    popup.addEventListener(
        'mouseenter',
        cancelClose
    );

    popup.addEventListener(
        'mouseleave',
        event => {
            if (
                card.contains(
                    event.relatedTarget
                )
            ) {
                return;
            }

            closePreview(
                false
            );
        }
    );

    /*
     * Кнопка закрытия и ссылки внутри popup должны
     * оставаться нормальными интерактивными элементами.
     */
    popup.addEventListener(
        'focusin',
        cancelClose
    );

    popup.addEventListener(
        'focusout',
        event => {
            if (
                popup.contains(
                    event.relatedTarget
                ) ||
                card.contains(
                    event.relatedTarget
                )
            ) {
                return;
            }

            closePreview();
        }
    );

    /*
     * Аргумент используется, чтобы линтер не считал
     * openPreview неиспользуемым в переданном объекте.
     */
    void openPreview;
}


function setupCardInteractionEvents(
    {
        card,
        popup,
        openPreview,
        closePreview
    }
) {
    card.addEventListener(
        'click',
        event => {
            if (
                event.target.closest(
                    `.${POPUP_CLASS}`
                )
            ) {
                return;
            }

            openPreview();
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

            if (
                event.target.closest(
                    `.${POPUP_CLASS}`
                )
            ) {
                return;
            }

            event.preventDefault();

            openPreview();
        }
    );

    card.addEventListener(
        'mouseleave',
        event => {
            if (
                popup.contains(
                    event.relatedTarget
                )
            ) {
                return;
            }

            closePreview(
                false
            );
        }
    );

    card.addEventListener(
        'focusin',
        () => {
            /*
             * Фокус на дочерней кнопке избранного не должен
             * сам открывать popup. Открытие с клавиатуры —
             * Enter/Space на самой карточке.
             */
            if (
                document.activeElement !==
                card
            ) {
                return;
            }

            if (
                window.matchMedia(
                    MOBILE_PREVIEW_QUERY
                ).matches
            ) {
                return;
            }

            openPreview();
        }
    );

    card.addEventListener(
        'focusout',
        event => {
            if (
                card.contains(
                    event.relatedTarget
                ) ||
                popup.contains(
                    event.relatedTarget
                )
            ) {
                return;
            }

            closePreview();
        }
    );
}


/*
 * =========================================================
 * Управление несколькими popup
 * =========================================================
 */

function closeOtherPreviews(
    currentCard
) {
    document
        .querySelectorAll(
            '.game-card'
        )
        .forEach(
            card => {
                if (
                    card ===
                    currentCard
                ) {
                    return;
                }

                card._closePreviewImmediately?.();
            }
        );
}


/*
 * Обновляет z-index всего тира.
 *
 * Старый вариант мог снять ACTIVE_ROW_CLASS у ряда, где
 * одна карточка закрылась, но другая ещё оставалась открыта.
 */
function updateTierRowActiveState(
    card
) {
    const tierRow =
        card.closest(
            '.tier-row'
        );

    if (
        !tierRow
    ) {
        return;
    }

    const hasActiveCard =
        Boolean(
            tierRow.querySelector(
                `.${ACTIVE_CARD_CLASS}:not(.${PREVIEW_CLOSED_CLASS})`
            )
        );

    tierRow.classList.toggle(
        ACTIVE_ROW_CLASS,
        hasActiveCard
    );
}


/*
 * =========================================================
 * Создание popup
 * =========================================================
 */

export function createPreviewPopup(
    {
        name,
        cover,
        steamLink,
        video,
        steamImage,
        description
    }
) {
    const popup =
        document.createElement(
            'div'
        );

    popup.className =
        POPUP_CLASS;

    const hasDescription =
        Boolean(
            description
        );

    const hasActions =
        Boolean(
            steamLink ||
            video
        );

    popup.classList.toggle(
        'game-preview-popup-with-description',
        hasDescription
    );

    popup.classList.toggle(
        'game-preview-popup-with-actions',
        hasActions
    );

    if (
        hasActions
    ) {
        const actions =
            document.createElement(
                'div'
            );

        actions.className =
            'preview-actions';

        if (
            steamLink
        ) {
            actions.appendChild(
                createSteamPreview(
                    {
                        name,
                        cover,
                        steamLink,
                        steamImage
                    }
                )
            );
        }

        if (
            video
        ) {
            actions.appendChild(
                createVideoPreview(
                    name,
                    video
                )
            );
        }

        popup.appendChild(
            actions
        );
    }

    if (
        hasDescription
    ) {
        const descriptionElement =
            document.createElement(
                'blockquote'
            );

        descriptionElement.className =
            'preview-description';

        descriptionElement.textContent =
            description;

        popup.appendChild(
            descriptionElement
        );
    }

    return popup;
}


function createSteamPreview(
    {
        name,
        cover,
        steamLink,
        steamImage
    }
) {
    const preview =
        document.createElement(
            'a'
        );

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

    const imageUrl =
        cover ||
        steamImage;

    if (
        imageUrl
    ) {
        preview.appendChild(
            createSteamPreviewImage(
                {
                    imageUrl,
                    cover,
                    steamImage,
                    name
                }
            )
        );
    } else {
        preview.appendChild(
            createPreviewImagePlaceholder(
                '♜'
            )
        );
    }

    const label =
        document.createElement(
            'span'
        );

    label.className =
        'preview-label';

    label.textContent =
        'Открыть в Steam';

    preview.appendChild(
        label
    );

    return preview;
}


function createSteamPreviewImage(
    {
        imageUrl,
        cover,
        steamImage,
        name
    }
) {
    const image =
        document.createElement(
            'img'
        );

    image.className =
        'preview-image';

    image.src =
        imageUrl;

    image.alt =
        `${name} — страница в Steam`;

    image.loading =
        'lazy';

    image.decoding =
        'async';

    let usesSteamFallback =
        !cover ||
        imageUrl === steamImage;

    image.addEventListener(
        'error',
        () => {
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


function createVideoPreview(
    name,
    video
) {
    const preview =
        document.createElement(
            'a'
        );

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
        getYouTubeThumbnail(
            video
        );

    if (
        thumbnail
    ) {
        const image =
            document.createElement(
                'img'
            );

        image.className =
            'preview-image';

        image.src =
            thumbnail;

        image.alt =
            `${name} — видеообзор`;

        image.loading =
            'lazy';

        image.decoding =
            'async';

        image.addEventListener(
            'error',
            () => {
                image.replaceWith(
                    createPreviewImagePlaceholder(
                        '▶'
                    )
                );
            },
            {
                once: true
            }
        );

        preview.appendChild(
            image
        );
    } else {
        preview.appendChild(
            createPreviewImagePlaceholder(
                '▶'
            )
        );
    }

    const label =
        document.createElement(
            'span'
        );

    label.className =
        'preview-label';

    label.textContent =
        'Смотреть обзор';

    preview.appendChild(
        label
    );

    return preview;
}


function createPreviewImagePlaceholder(
    icon
) {
    const placeholder =
        document.createElement(
            'div'
        );

    placeholder.className =
        'preview-image preview-image-placeholder';

    placeholder.textContent =
        icon;

    return placeholder;
}


function createPreviewCloseButton() {
    const button =
        document.createElement(
            'button'
        );

    button.className =
        'game-preview-close';

    button.type =
        'button';

    button.textContent =
        '×';

    button.setAttribute(
        'aria-label',
        'Закрыть меню игры'
    );

    button.title =
        'Закрыть';

    return button;
}


/*
 * =========================================================
 * Позиционирование desktop-popup
 * =========================================================
 */

function positionPreview(
    card
) {
    const popup =
        card.querySelector(
            `.${POPUP_CLASS}`
        );

    /*
     * На мобильном popup перенесён в document.body,
     * поэтому card.querySelector() вернёт null.
     */
    if (
        !popup ||
        popup.classList.contains(
            MOBILE_MODAL_CLASS
        )
    ) {
        return;
    }

    card.classList.remove(
        PREVIEW_READY_CLASS
    );

    popup.classList.remove(
        ...POPUP_POSITION_CLASSES
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

    /*
     * Если размеры ещё не рассчитались, переносим
     * позиционирование на следующий кадр.
     */
    if (
        !popupWidth ||
        !popupHeight
    ) {
        requestAnimationFrame(
            () => {
                if (
                    !card.classList.contains(
                        PREVIEW_CLOSED_CLASS
                    )
                ) {
                    positionPreview(
                        card
                    );
                }
            }
        );

        return;
    }

    const centeredLeft =
        cardRect.left +
        (
            cardRect.width -
            popupWidth
        ) / 2;

    const centeredTop =
        cardRect.top +
        (
            cardRect.height -
            popupHeight
        ) / 2;

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
        topPosition >=
        SCREEN_PADDING;

    const fitsRight =
        rightPosition +
        popupWidth <=
        viewportWidth -
        SCREEN_PADDING;

    const fitsLeft =
        leftPosition >=
        SCREEN_PADDING;

    const fitsBelow =
        bottomPosition +
        popupHeight <=
        viewportHeight -
        SCREEN_PADDING;

    let popupLeft;
    let popupTop;

    if (
        fitsAbove
    ) {
        popupLeft =
            clamp(
                centeredLeft,
                SCREEN_PADDING,
                viewportWidth -
                    popupWidth -
                    SCREEN_PADDING
            );

        popupTop =
            topPosition;
    } else if (
        fitsRight
    ) {
        popup.classList.add(
            'preview-position-right'
        );

        popupLeft =
            rightPosition;

        popupTop =
            clamp(
                centeredTop,
                SCREEN_PADDING,
                viewportHeight -
                    popupHeight -
                    SCREEN_PADDING
            );
    } else if (
        fitsLeft
    ) {
        popup.classList.add(
            'preview-position-left'
        );

        popupLeft =
            leftPosition;

        popupTop =
            clamp(
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

        popupLeft =
            clamp(
                centeredLeft,
                SCREEN_PADDING,
                viewportWidth -
                    popupWidth -
                    SCREEN_PADDING
            );

        popupTop =
            fitsBelow
                ? bottomPosition
                : clamp(
                    topPosition,
                    SCREEN_PADDING,
                    viewportHeight -
                        popupHeight -
                        SCREEN_PADDING
                );
    }

    /*
     * Popup position:absolute относительно карточки.
     */
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


function clearPopupInlinePosition(
    popup
) {
    popup.classList.remove(
        ...POPUP_POSITION_CLASSES
    );

    [
        'top',
        'right',
        'bottom',
        'left',
        'transform'
    ].forEach(
        property => {
            popup.style.removeProperty(
                property
            );
        }
    );
}


/*
 * =========================================================
 * Глобальное управление popup
 * =========================================================
 */

export function updateVisiblePreviewPositions() {
    document
        .querySelectorAll(
            `.game-card:not(.${PREVIEW_CLOSED_CLASS})`
        )
        .forEach(
            card => {
                positionPreview(
                    card
                );
            }
        );
}


export function closeAllPreviews() {
    document
        .querySelectorAll(
            '.game-card'
        )
        .forEach(
            card => {
                if (
                    card._closePreviewImmediately
                ) {
                    card._closePreviewImmediately();

                    return;
                }

                card._cancelPreviewClose?.();

                card.classList.add(
                    PREVIEW_CLOSED_CLASS
                );

                card.classList.remove(
                    PREVIEW_READY_CLASS,
                    ACTIVE_CARD_CLASS
                );

                updateTierRowActiveState(
                    card
                );
            }
        );
}


/*
 * =========================================================
 * Утилиты
 * =========================================================
 */

function clearCardTimer(
    state,
    timerName
) {
    if (
        !state[timerName]
    ) {
        return;
    }

    window.clearTimeout(
        state[timerName]
    );

    state[timerName] =
        null;
}


function clamp(
    value,
    min,
    max
) {
    /*
     * При очень маленьком viewport popup может быть
     * шире доступной области. В таком случае max < min.
     */
    const safeMax =
        Math.max(
            min,
            max
        );

    return Math.min(
        Math.max(
            value,
            min
        ),
        safeMax
    );
}

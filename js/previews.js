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


const MOBILE_PREVIEW_QUERY =
    '(max-width: 600px)';


export function setupCardHover(
    card,
    name,
    steamLink
) {
    let closeTimer =
        null;

    let layerCleanupTimer =
        null;

    const popup =
        card.querySelector(
            '.game-preview-popup'
        );

    if (
        !popup
    ) {
        return;
    }

    const closeButton =
        createPreviewCloseButton(
            card
        );

    popup.appendChild(
        closeButton
    );

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

    const isMobilePreview =
        () => window.matchMedia(
            MOBILE_PREVIEW_QUERY
        ).matches;

    const cancelClose = () => {
        if (
            closeTimer
        ) {
            clearTimeout(
                closeTimer
            );

            closeTimer =
                null;
        }

        if (
            layerCleanupTimer
        ) {
            clearTimeout(
                layerCleanupTimer
            );

            layerCleanupTimer =
                null;
        }
    };

    const closePreviewImmediately = () => {
        cancelClose();

        card.classList.add(
            PREVIEW_CLOSED_CLASS
        );

        card.classList.remove(
            PREVIEW_READY_CLASS
        );

        popup.classList.remove(
            'game-preview-popup-mobile-modal'
        );

        card.classList.remove(
            ACTIVE_CARD_CLASS
        );

        setTierRowActive(
            card,
            false
        );
    };

    /*
     * В режиме выбранного видео popup скрыт,
     * поэтому карточка ведёт на Steam-страницу.
     */
    const openSteamPageForSelectedVideo = () => {
        const layout =
            document.querySelector(
                '.tier-list-layout'
            );

        const isVideoFilterActive =
            layout?.classList.contains(
                VIDEO_FILTER_ACTIVE_CLASS
            );

        const normalizedSteamLink =
            String(
                steamLink || ''
            ).trim();

        if (
            !isVideoFilterActive ||
            !normalizedSteamLink
        ) {
            return false;
        }

        window.location.assign(
            normalizedSteamLink
        );

        return true;
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

        const mobilePreview =
            isMobilePreview();

        popup.classList.toggle(
            'game-preview-popup-mobile-modal',
            mobilePreview
        );
                if (
            mobilePreview
        ) {
            popup.style.top =
                '50%';

            popup.style.left =
                '50%';

            popup.style.right =
                'auto';

            popup.style.bottom =
                'auto';
        } else {
            popup.style.removeProperty(
                'top'
            );

            popup.style.removeProperty(
                'left'
            );
        }


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

        requestAnimationFrame(
            () => {
                if (
                    card.classList.contains(
                        PREVIEW_CLOSED_CLASS
                    )
                ) {
                    return;
                }

                if (
                    mobilePreview
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

    const scheduleLayerCleanup = () => {
        if (
            layerCleanupTimer
        ) {
            clearTimeout(
                layerCleanupTimer
            );
        }

        layerCleanupTimer =
            setTimeout(
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

                        setTierRowActive(
                            card,
                            false
                        );
                    }

                    layerCleanupTimer =
                        null;
                },
                PREVIEW_LAYER_CLEANUP_DELAY
            );
    };

    const closePreview = (
        respectFocus = true
    ) => {
        if (
            isMobilePreview()
        ) {
            return;
        }

        if (
            closeTimer
        ) {
            clearTimeout(
                closeTimer
            );
        }

        closeTimer =
            setTimeout(
                () => {
                    if (
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
                        )
                    ) {
                        closeTimer =
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

                    closeTimer =
                        null;
                },
                PREVIEW_CLOSE_DELAY
            );
    };

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
        'mouseenter',
        cancelClose
    );

    popup.addEventListener(
        'mouseleave',
        event => {
            if (
                event.relatedTarget &&
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

    popup.addEventListener(
        'click',
        event => {
            event.stopPropagation();
        }
    );

    card.addEventListener(
        'click',
        event => {
            if (
                event.target.closest(
                    '.game-preview-popup'
                )
            ) {
                return;
            }

            if (
                openSteamPageForSelectedVideo()
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
                    '.game-preview-popup'
                )
            ) {
                return;
            }

            event.preventDefault();

            if (
                openSteamPageForSelectedVideo()
            ) {
                return;
            }

            openPreview();
        }
    );

    card.addEventListener(
        'mouseleave',
        event => {
            if (
                event.relatedTarget &&
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

    card.addEventListener(
        'focusin',
        () => {
            if (
                document.activeElement === card &&
                !isMobilePreview()
            ) {
                openPreview();
            }
        }
    );

    card.addEventListener(
        'focusout',
        event => {
            if (
                card.contains(
                    event.relatedTarget
                )
            ) {
                return;
            }

            closePreview();
        }
    );

    card._cancelPreviewClose =
        cancelClose;

    card._closePreviewImmediately =
        closePreviewImmediately;
}


function createPreviewCloseButton(
    card
) {
    const button =
        document.createElement(
            'button'
        );

    button.className =
        'game-preview-close';

    button.type =
        'button';

    button.setAttribute(
        'aria-label',
        'Закрыть меню игры'
    );

    button.title =
        'Закрыть';

    button.textContent =
        '×';

    return button;
}


function setTierRowActive(
    card,
    isActive
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
    steamImage,
    description
}) {
    const popup =
        document.createElement(
            'div'
        );

    popup.className =
        'game-preview-popup';

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
                createSteamPreview({
                    name,
                    cover,
                    steamLink,
                    steamImage
                })
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

    popup.addEventListener(
        'keydown',
        event => {
            event.stopPropagation();
        }
    );

    return popup;
}


function createSteamPreview({
    name,
    cover,
    steamLink,
    steamImage
}) {
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

    const image =
        document.createElement(
            'img'
        );

    image.className =
        'preview-image';

    image.src =
        cover ||
        steamImage;

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
        document.createElement(
            'span'
        );

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

        preview.appendChild(
            image
        );
    } else {
        const placeholder =
            document.createElement(
                'div'
            );

        placeholder.className =
            'preview-image preview-image-placeholder';

        placeholder.textContent =
            '▶';

        preview.appendChild(
            placeholder
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


function positionPreview(
    card
) {
    const popup =
        card.querySelector(
            '.game-preview-popup'
        );

    if (
        !popup
    ) {
        return;
    }

    if (
        window.matchMedia(
            MOBILE_PREVIEW_QUERY
        ).matches
    ) {
        popup.classList.add(
            'game-preview-popup-mobile-modal'
        );

        return;
    }

    popup.classList.remove(
        'game-preview-popup-mobile-modal'
    );

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
            }
        );
}


function clamp(
    value,
    min,
    max
) {
    return Math.min(
        Math.max(
            value,
            min
        ),
        max
    );
}

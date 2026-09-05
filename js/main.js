import {
    appState
} from './state.js';

import {
    loadGames,
    normalizeTier,
    compareGamesByOrder
} from './data.js';

import {
    fillTagFilter,
    fillVideoFilter,
    getSearchValue,
    getSelectedTag,
    getSelectedVideo,
    gameMatchesFilters,
    setFiltersFromUrl,
    updateUrlFromFilters
} from './filters.js';

import {
    isFavoritesFilterActive,
    getActiveFavoriteIds,
    getGameId,
    setFavoritesFilter,
    addFavoritesToUrl,
    hasSharedFavorites
} from './favorites.js';



import {
    createGameCard
} from './cards.js';

import {
    setPriceMode
} from './steam-price.js';

import {
    closeAllPreviews,
    updateVisiblePreviewPositions
} from './previews.js';

import {
    renderSelectedVideo
} from './video.js';

import {
    TIER_NAMES,
    VIDEO_FILTER_ACTIVE_CLASS
} from './config.js';


const SEARCH_RENDER_DELAY =
    150;

const BACK_TO_TOP_VISIBLE_CLASS =
    'is-visible';

const SHARE_BUTTON_DEFAULT_LABEL =
    'Скопировать ссылку на подборку';

const SHARE_BUTTON_SUCCESS_LABEL =
    'Ссылка скопирована';

const SHARE_BUTTON_ERROR_LABEL =
    'Не удалось скопировать';


let searchRenderTimer =
    null;

let shareButtonResetTimer =
    null;


const tierContainers =
    {};


document.addEventListener(
    'DOMContentLoaded',
    init
);


document.addEventListener(
    'visibilitychange',
    () => {
        if (
            document.visibilityState ===
            'visible'
        ) {
            closeAllPreviews();
        }
    }
);


window.addEventListener(
    'pageshow',
    closeAllPreviews
);


window.addEventListener(
    'resize',
    updateVisiblePreviewPositions
);


window.addEventListener(
    'scroll',
    updateVisiblePreviewPositions,
    true
);


window.addEventListener(
    'popstate',
    () => {
        setFiltersFromUrl();
        renderGames();
    }
);



function init() {
    const searchInput =
        document.querySelector(
            '#search'
        );

    const tagFilter =
        document.querySelector(
            '#tag-filter'
        );

    const videoFilter =
        document.querySelector(
            '#video-filter'
        );
    const favoritesFilter =
    document.querySelector(
        '#favorites-filter'
    );


    const priceModeToggle =
        document.querySelector(
            '#price-mode-toggle'
        );

    const resetFiltersButton =
        document.querySelector(
            '#reset-filters'
        );

    const shareFiltersButton =
        document.querySelector(
            '#share-filters'
        );

    const backToTopButton =
        document.querySelector(
            '#back-to-top'
        );


    const tierCardScaleRange =
        document.querySelector(
            '#tier-card-scale-range'
        );

    const screenshotButton =
        document.querySelector(
            '#download-tierlist-screenshot'
        );



    cacheTierContainers();


    if (
        searchInput
    ) {
        searchInput.addEventListener(
            'input',
            scheduleSearchRender
        );
    }


    if (
        tagFilter
    ) {
        tagFilter.addEventListener(
            'change',
            renderGames
        );
    }


    if (
        videoFilter
    ) {
        videoFilter.addEventListener(
            'change',
            renderGames
        );
    }
    if (
    favoritesFilter
    ) {
        favoritesFilter.addEventListener(
            'click',
            () => {
                const isActive =
                    isFavoritesFilterActive();
    
                setFavoritesFilter(
                    !isActive
                );
    
                renderGames();
            }
        );
    }



    if (
        priceModeToggle
    ) {
        priceModeToggle.addEventListener(
            'change',
            event => {
                setPriceMode(
                    event.target.checked
                );
            }
        );
    }


    if (
        resetFiltersButton
    ) {
        resetFiltersButton.addEventListener(
            'click',
            resetFilters
        );
    }


    if (
        shareFiltersButton
    ) {
        shareFiltersButton.addEventListener(
            'click',
            () => {
                shareCurrentFilters(
                    shareFiltersButton
                );
            }
        );
    }


    setupMobileTierNavigation();
    window.addEventListener(
    'favoriteschange',
    () => {
        renderGames();
    }
);



    setupBackToTop(
        backToTopButton
    );
        setupTierListAppearanceControls(
        tierCardScaleRange
    );

    screenshotButton?.addEventListener(
        'click',
        downloadTierListScreenshot
    );



    loadApplicationData();
}


function cacheTierContainers() {
    TIER_NAMES.forEach(
        tier => {
            tierContainers[tier] =
                document.querySelector(
                    `#tier-${tier}`
                );
        }
    );
}


async function loadApplicationData() {
    try {
        appState.games =
            await loadGames();

        fillTagFilter();
        fillVideoFilter();

        setFiltersFromUrl();

        renderGames();
    } catch (
        error
    ) {
        console.error(
            'Ошибка загрузки игр:',
            error
        );

        showLoadingError();
    }
}


function scheduleSearchRender() {
    if (
        searchRenderTimer
    ) {
        clearTimeout(
            searchRenderTimer
        );
    }

    searchRenderTimer =
        setTimeout(
            () => {
                renderGames();

                searchRenderTimer =
                    null;
            },
            SEARCH_RENDER_DELAY
        );
}


function renderGames() {
    closeAllPreviews();

    clearTierContainers();

    updateUrlFromFilters();


    const searchValue =
        getSearchValue();

    const selectedTag =
        getSelectedTag();

    const selectedVideo =
        getSelectedVideo();


    updateVideoFilterState(
        selectedVideo
    );
    updateFavoritesFilterState();



    const favoritesFilterActive =
    isFavoritesFilterActive();

const activeFavoriteIds =
    getActiveFavoriteIds();

const filteredGames =
    appState.games
        .filter(
            game => {
                const matchesRegularFilters =
                    gameMatchesFilters(
                        game,
                        searchValue,
                        selectedTag,
                        selectedVideo
                    );

                const matchesFavorites =
                    !favoritesFilterActive ||
                    activeFavoriteIds.has(
                        getGameId(
                            game
                        )
                    );

                return (
                    matchesRegularFilters &&
                    matchesFavorites
                );
            }
        )
        .sort(
            compareGamesByOrder
        );


    filteredGames.forEach(
        game => {
            const tier =
                normalizeTier(
                    game['Tier']
                );

            const container =
                tierContainers[tier];

            if (
                !container
            ) {
                return;
            }

            container.appendChild(
                createGameCard(
                    game,
                    {
                        videoFilterActive:
                            selectedVideo !== ''
                    }
                )
            );
        }
    );


    renderSelectedVideo(
        appState.games,
        selectedVideo
    );
}


function clearTierContainers() {
    TIER_NAMES.forEach(
        tier => {
            const container =
                tierContainers[tier];

            if (
                container
            ) {
                container.replaceChildren();
            }
        }
    );
}


function updateVideoFilterState(
    selectedVideo
) {
    const layout =
        document.querySelector(
            '.tier-list-layout'
        );

    if (
        !layout
    ) {
        return;
    }

    layout.classList.toggle(
        VIDEO_FILTER_ACTIVE_CLASS,
        selectedVideo !== ''
    );
}

function updateFavoritesFilterState() {
    const button =
        document.querySelector(
            '#favorites-filter'
        );

    if (
        !button
    ) {
        return;
    }

    const isActive =
        isFavoritesFilterActive();

    button.classList.toggle(
        'is-active',
        isActive
    );

    button.setAttribute(
        'aria-pressed',
        String(
            isActive
        )
    );

    button.setAttribute(
        'aria-label',
        isActive
            ? 'Показывать все игры'
            : 'Показывать только избранные игры'
    );

    button.title =
        isActive
            ? 'Показывать все игры'
            : 'Показывать только избранные игры';

    const icon =
        button.querySelector(
            'span'
        );

    if (
        icon
    ) {
        icon.textContent =
            isActive
                ? '★'
                : '☆';
    }
}

function resetFilters() {
    const searchInput =
        document.querySelector(
            '#search'
        );

    const tagFilter =
        document.querySelector(
            '#tag-filter'
        );

    const videoFilter =
        document.querySelector(
            '#video-filter'
        );

    if (
        searchInput
    ) {
        searchInput.value =
            '';
    }

    if (
        tagFilter
    ) {
        tagFilter.value =
            '';
    }

    if (
        videoFilter
    ) {
        videoFilter.value =
            '';
    }

    const url =
        new URL(
            window.location.href
        );

    url.search = '';

    window.history.replaceState(
        {},
        '',
        url
    );

    renderGames();
}


async function shareCurrentFilters(
    button
) {
    /*
     * Перед копированием синхронизируем
     * обычные фильтры с URL.
     */
    updateUrlFromFilters();

    const url =
        new URL(
            window.location.href
        );

    /*
     * Если активен локальный фильтр избранного,
     * добавляем локальный список в ссылку.
     *
     * Если открыта чужая ссылка, её список
     * сохраняется без перезаписи.
     */
        if (
            isFavoritesFilterActive()
        ) {
            addFavoritesToUrl(
                url
            );
        }


    const shareUrl =
        url.href;

    try {
        await copyText(
            shareUrl
        );

        showShareButtonMessage(
            button,
            SHARE_BUTTON_SUCCESS_LABEL
        );
    } catch (
        error
    ) {
        console.warn(
            'Не удалось скопировать ссылку:',
            error
        );

        showShareButtonMessage(
            button,
            SHARE_BUTTON_ERROR_LABEL
        );
    }
}


async function copyText(
    text
) {
    if (
        navigator.clipboard &&
        window.isSecureContext
    ) {
        await navigator.clipboard.writeText(
            text
        );

        return;
    }


    const textarea =
        document.createElement(
            'textarea'
        );

    textarea.value =
        text;

    textarea.style.position =
        'fixed';

    textarea.style.top =
        '0';

    textarea.style.left =
        '0';

    textarea.style.width =
        '1px';

    textarea.style.height =
        '1px';

    textarea.style.opacity =
        '0';

    document.body.appendChild(
        textarea
    );

    textarea.focus();
    textarea.select();

    const copied =
        document.execCommand(
            'copy'
        );

    textarea.remove();

    if (
        !copied
    ) {
        throw new Error(
            'Копирование не поддерживается'
        );
    }
}


function showShareButtonMessage(
    button,
    message
) {
    if (
        !button
    ) {
        return;
    }

    button.title =
        message;

    button.setAttribute(
        'aria-label',
        message
    );


    if (
        shareButtonResetTimer
    ) {
        clearTimeout(
            shareButtonResetTimer
        );
    }


    shareButtonResetTimer =
        setTimeout(
            () => {
                button.title =
                    SHARE_BUTTON_DEFAULT_LABEL;

                button.setAttribute(
                    'aria-label',
                    SHARE_BUTTON_DEFAULT_LABEL
                );

                shareButtonResetTimer =
                    null;
            },
            1800
        );
}


function setupMobileTierNavigation() {
    const navigation =
        document.querySelector(
            '.mobile-tier-navigation'
        );

    if (
        !navigation
    ) {
        return;
    }


    navigation.addEventListener(
        'click',
        event => {
            const button =
                event.target.closest(
                    '[data-tier-target]'
                );

            if (
                !button
            ) {
                return;
            }

            const target =
                button.dataset.tierTarget;


            if (
                target === 'HOME'
            ) {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });

                return;
            }


            const container =
                document.querySelector(
                    `#tier-${target}`
                );

            const tierRow =
                container?.closest(
                    '.tier-row'
                );

            if (
                !tierRow
            ) {
                return;
            }

            tierRow.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    );
}


function setupBackToTop(
    button
) {
    const controls =
        document.querySelector(
            '.controls'
        );

    if (
        !button ||
        !controls
    ) {
        return;
    }


    const updateButtonVisibility =
        () => {
            const controlsRect =
                controls.getBoundingClientRect();
            
            const shouldShow =
                controlsRect.bottom < 0;


            button.classList.toggle(
                BACK_TO_TOP_VISIBLE_CLASS,
                shouldShow
            );
        };


    button.addEventListener(
        'click',
        () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    );


    window.addEventListener(
        'scroll',
        updateButtonVisibility,
        {
            passive: true
        }
    );


    window.addEventListener(
        'resize',
        updateButtonVisibility
    );


    updateButtonVisibility();
}


function showLoadingError() {
    const tierList =
        document.querySelector(
            '.tier-list'
        );

    if (
        !tierList
    ) {
        return;
    }

    tierList.innerHTML = `
        <p class="loading-error">
            Не удалось загрузить данные из Google Sheets.
        </p>
    `;
}
/*
 * =========================================================
 * Настройка размеров тир-листа
 * =========================================================
 */
function setupTierListAppearanceControls(
    cardScaleRange
) {
    const cardScaleValue =
        document.querySelector(
            '#tier-card-scale-value'
        );

    const updateCardScale =
        () => {
            if (
                !cardScaleRange
            ) {
                return;
            }

            const value =
                Number(
                    cardScaleRange.value
                );

            document.documentElement.style.setProperty(
                '--tier-card-scale',
                String(
                    value / 100
                )
            );

            if (
                cardScaleValue
            ) {
                cardScaleValue.textContent =
                    `${value}%`;
            }
        };

    cardScaleRange?.addEventListener(
        'input',
        updateCardScale
    );

    updateCardScale();
}

/*
 * =========================================================
 * Скриншот тир-листа
 * =========================================================
 */

async function downloadTierListScreenshot() {
    const tierList =
        document.querySelector(
            '.tier-list'
        );

    if (
        !tierList
    ) {
        return;
    }

    if (
        typeof window.html2canvas !==
        'function'
    ) {
        window.alert(
            'Модуль скриншота ещё не загрузился.'
        );

        return;
    }

    const button =
        document.querySelector(
            '#download-tierlist-screenshot'
        );

    if (
        button
    ) {
        button.disabled =
            true;

        button.title =
            'Создание скриншота…';

        button.setAttribute(
            'aria-label',
            'Создание скриншота…'
        );
    }

    closeAllPreviews();

    /*
     * Lazy-изображения из нижних тиров могут ещё
     * не быть загружены. На время скриншота просим
     * браузер загрузить их сразу.
     */
    const images =
        [
            ...tierList.querySelectorAll(
                'img'
            )
        ];

    images.forEach(
        image => {
            image.loading =
                'eager';
        }
    );

    await Promise.all(
        images.map(
            image =>
                waitForImage(
                    image
                )
        )
    );

    /*
     * Даём браузеру один кадр на перерасчёт
     * размеров после загрузки обложек.
     */
    await new Promise(
        resolve => {
            requestAnimationFrame(
                () => {
                    requestAnimationFrame(
                        resolve
                    );
                }
            );
        }
    );
        const tierListRect =
        tierList.getBoundingClientRect();


    try {
        const canvas =
            await window.html2canvas(
                tierList,
                {
                    backgroundColor:
                        '#f3f4f6',

                    scale: 2,

                    useCORS:
                        true,

                    allowTaint:
                        false,

                    logging:
                        false,

                    imageTimeout:
                        15000,

                    /*
                     * Захватываем реальную ширину
                     * и высоту всего списка, включая
                     * все тиры S–F.
                     */
                   width:
                        Math.ceil(
                            tierListRect.width
                        ),
                    
                    height:
                        Math.ceil(
                            tierListRect.height
                        ),
                    
                    windowWidth:
                        window.innerWidth,
                    
                    windowHeight:
                        window.innerHeight,


                    scrollX:
                        0,

                    scrollY:
                        0,

                    onclone:
                        clonedDocument => {
                            const clonedTierList =
                                clonedDocument.querySelector(
                                    '.tier-list'
                                );

                            if (
                                !clonedTierList
                            ) {
                                return;
                            }

                            clonedTierList.classList.add(
                                'tierlist-screenshot-render'
                            );

                            const style =
                                clonedDocument.createElement(
                                    'style'
                                );

                            style.textContent = `
                                *,
                                *::before,
                                *::after {
                                    animation: none !important;
                                    transition: none !important;
                                }
                                    .tierlist-screenshot-render
                                .game-media {
                                    position: relative !important;
                                    overflow: hidden !important;
                                }
                            
                                .tierlist-screenshot-render
                                .game-cover {
                                    position: absolute !important;
                                    inset: 0 !important;
                            
                                    display: block !important;
                            
                                    width: 100% !important;
                                    height: 100% !important;
                                    min-width: 0 !important;
                                    min-height: 0 !important;
                                    max-width: none !important;
                                    max-height: none !important;
                            
                                    object-fit: cover !important;
                                    object-position: center !important;
                                }

                                .tierlist-screenshot-render
                                .game-card,
                                .tierlist-screenshot-render
                                .game-card:hover,
                                .tierlist-screenshot-render
                                .game-card:focus,
                                .tierlist-screenshot-render
                                .game-card:focus-within {
                                    transform: none !important;
                                    opacity: 1 !important;
                                    filter: none !important;
                                    box-shadow: none !important;
                                }

                                .tierlist-screenshot-render
                                .tier-row {
                                    overflow: hidden !important;
                                    box-shadow: none !important;
                                }

                                .tierlist-screenshot-render
                                .games-container {
                                    overflow: hidden !important;
                                }

                                .tierlist-screenshot-render
                                .favorite-button,
                                .tierlist-screenshot-render
                                .game-preview-popup {
                                    display: none !important;
                                }

                                .tierlist-screenshot-render
                                .game-card {
                                    flex-shrink: 0 !important;
                                }
                            `;

                            clonedDocument.head.appendChild(
                                style
                            );
                            /*
 * html2canvas ненадёжно поддерживает object-fit: cover.
 *
 * Поэтому вручную рассчитываем размер обложки:
 * она полностью заполняет .game-media, а лишние части
 * выходят за границы контейнера и обрезаются через overflow.
 */
clonedDocument
    .querySelectorAll(
        '.tierlist-screenshot-render .game-media'
    )
    .forEach(
        media => {
            const image =
                media.querySelector(
                    '.game-cover'
                );

            if (
                !image ||
                !image.naturalWidth ||
                !image.naturalHeight
            ) {
                return;
            }

            const mediaWidth =
                media.offsetWidth;

            const mediaHeight =
                media.offsetHeight;

            if (
                !mediaWidth ||
                !mediaHeight
            ) {
                return;
            }

            const imageRatio =
                image.naturalWidth /
                image.naturalHeight;

            const mediaRatio =
                mediaWidth /
                mediaHeight;

            let renderedWidth;
            let renderedHeight;

            /*
             * Повторяем object-fit: cover:
             *
             * Если изображение относительно шире блока,
             * ограничиваем его по высоте — обрежутся края.
             *
             * Если оно относительно выше блока,
             * ограничиваем по ширине — обрежутся верх и низ.
             */
            if (
                imageRatio >
                mediaRatio
            ) {
                renderedHeight =
                    mediaHeight;

                renderedWidth =
                    mediaHeight *
                    imageRatio;
            } else {
                renderedWidth =
                    mediaWidth;

                renderedHeight =
                    mediaWidth /
                    imageRatio;
            }

            const offsetLeft =
                (
                    mediaWidth -
                    renderedWidth
                ) / 2;

            const offsetTop =
                (
                    mediaHeight -
                    renderedHeight
                ) / 2;

            image.style.setProperty(
                'position',
                'absolute',
                'important'
            );

            image.style.setProperty(
                'display',
                'block',
                'important'
            );

            image.style.setProperty(
                'width',
                `${renderedWidth}px`,
                'important'
            );

            image.style.setProperty(
                'height',
                `${renderedHeight}px`,
                'important'
            );

            image.style.setProperty(
                'max-width',
                'none',
                'important'
            );

            image.style.setProperty(
                'max-height',
                'none',
                'important'
            );

            image.style.setProperty(
                'left',
                `${offsetLeft}px`,
                'important'
            );

            image.style.setProperty(
                'top',
                `${offsetTop}px`,
                'important'
            );

            image.style.setProperty(
                'right',
                'auto',
                'important'
            );

            image.style.setProperty(
                'bottom',
                'auto',
                'important'
            );

            /*
             * Теперь object-fit уже не нужен:
             * размеры рассчитаны вручную.
             */
            image.style.setProperty(
                'object-fit',
                'fill',
                'important'
            );
        }
    );

                        }
                }
            );

        const link =
            document.createElement(
                'a'
            );

        link.download =
            'raider-roguelike-tierlist.png';

        link.href =
            canvas.toDataURL(
                'image/png'
            );

        link.click();
    } catch (
        error
    ) {
        console.error(
            'Ошибка создания скриншота:',
            error
        );

        window.alert(
            'Не удалось создать скриншот.'
        );
    } finally {
        if (
            button
        ) {
            button.disabled =
                false;

            button.title =
                'Скачать скриншот тир-листа';

            button.setAttribute(
                'aria-label',
                'Скачать скриншот тир-листа'
            );
        }
    }
}


function waitForImage(
    image
) {
    if (
        image.complete
    ) {
        return image.decode?.()
            .catch(
                () => {}
            ) ||
            Promise.resolve();
    }

    return new Promise(
        resolve => {
            const timeout =
                window.setTimeout(
                    resolve,
                    15000
                );

            const finish =
                () => {
                    window.clearTimeout(
                        timeout
                    );

                    resolve();
                };

            image.addEventListener(
                'load',
                finish,
                {
                    once: true
                }
            );

            image.addEventListener(
                'error',
                finish,
                {
                    once: true
                }
            );
        }
    );
}


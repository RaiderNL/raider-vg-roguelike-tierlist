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
    openTierListScreenshotDialog
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
/*
 * =========================================================
 * Выбор формата скриншота
 * =========================================================
 */

function openTierListScreenshotDialog() {
    const dialog =
        document.querySelector(
            '#tierlist-screenshot-dialog'
        );

    if (
        !dialog
    ) {
        /*
         * Запасной вариант для старых браузеров:
         * сохраняем обычный вертикальный формат.
         */
        downloadTierListScreenshot(
            'vertical'
        );

        return;
    }

    if (
        !dialog.open
    ) {
        dialog.showModal();
    }

    dialog.onclose =
        () => {
            const format =
                dialog.returnValue;

            if (
                format !== 'vertical' &&
                format !== 'landscape'
            ) {
                return;
            }

            downloadTierListScreenshot(
                format
            );
        };
}

async function downloadTierListScreenshot(
    format = 'vertical'
) {

    const tierList =
        document.querySelector(
            '.tier-list'
        );

    if (
        !tierList
    ) {
        return;
    }
        const isLandscape =
        format === 'landscape';


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
        const screenshotWidth =
        isLandscape
            ? 1920
            : Math.ceil(
                tierListRect.width
            );

    const screenshotHeight =
        isLandscape
            ? 1080
            : Math.ceil(
                tierListRect.height
            );



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
                        screenshotWidth,
                    
                    height:
                        screenshotHeight,
                    
                    windowWidth:
                        screenshotWidth,
                    
                    windowHeight:
                        screenshotHeight,



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
                            if (
    isLandscape
) {
    clonedTierList.classList.add(
        'tierlist-screenshot-landscape'
    );
}


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
                                
                                    display: block !important;
                                
                                    min-width: 0 !important;
                                    min-height: 0 !important;
                                    max-width: none !important;
                                    max-height: none !important;
                                
                                    /*
                                     * Точные width / height / top / left
                                     * назначаются ниже через JavaScript.
                                     */
                                    object-position: center !important;
                                }
                                
                                /*
 * =====================================================
 * Адаптивный горизонтальный экспорт 16:9
 * =====================================================
 *
 * Реальные высоты тиров, количество строк и размер
 * карточек выставляет applyAdaptiveLandscapeScreenshotLayout().
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape {
    display: flex !important;
    flex-direction: column !important;
    gap: 6px !important;

    width: 1920px !important;
    min-width: 1920px !important;
    max-width: none !important;

    height: 1080px !important;
    min-height: 1080px !important;
    max-height: 1080px !important;

    padding: 18px !important;
    overflow: hidden !important;

    background: #f3f4f6 !important;
}


/*
 * Высоту каждого тира задаёт JavaScript.
 * Ряд не должен самопроизвольно растягиваться.
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape
.tier-row {
    display: flex !important;
    flex: 0 0 auto !important;

    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;

    overflow: hidden !important;
    box-shadow: none !important;
}


/*
 * Цветная полоса с буквой тира.
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape
.tier-label {
    flex: 0 0 76px !important;

    width: 76px !important;
    min-width: 76px !important;
    height: 100% !important;

    font-size: 25px !important;
    line-height: 1 !important;
}


/*
 * Карточки могут переходить на вторую, третью
 * и дальнейшие строки внутри конкретного тира.
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape
.games-container {
    display: flex !important;
    flex: 1 1 auto !important;
    flex-wrap: wrap !important;
    align-content: center !important;
    align-items: flex-start !important;
    justify-content: flex-start !important;
    gap: 6px !important;

    min-width: 0 !important;
    max-width: none !important;
    height: 100% !important;
    min-height: 0 !important;
    padding: 5px 8px !important;

    overflow: hidden !important;
}


/*
 * Ширина и высота карточек назначаются inline-стилями
 * адаптивным JavaScript-расчётом.
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape
.game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-S .game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-A .game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-B .game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-C .game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-D .game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-E .game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-F .game-card {
    flex-grow: 0 !important;
    flex-shrink: 0 !important;

    max-width: none !important;
    aspect-ratio: 1 / 1 !important;
}


/*
 * Уравниваем сетку всех карточек.
 * Иначе S/A использовали бы иную раскладку,
 * чем B–F, из-за обычных правил сайта.
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape
.game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-S .game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-A .game-card {
    grid-template-rows:
        minmax(0, 72%)
        minmax(0, 1fr)
        auto !important;
}


/*
 * Компактная типографика экспортного изображения.
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape
.game-title,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-B .game-title,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-C .game-title,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-D .game-title,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-E .game-title,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-F .game-title {
    display: -webkit-box !important;

    width: calc(100% - 8px) !important;
    min-height: 0 !important;
    margin: 3px auto 2px !important;
    overflow: hidden !important;

    font-size: 9px !important;
    line-height: 1.1 !important;
    text-align: center !important;
    text-overflow: clip !important;
    white-space: normal !important;

    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
}


.tierlist-screenshot-render.tierlist-screenshot-landscape
.game-tags,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-D .game-tags,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-E .game-tags,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-F .game-tags {
    width: calc(100% - 8px) !important;
    max-height: 20px !important;
    margin: 0 auto 4px !important;
    gap: 2px !important;

    overflow: hidden !important;
}


.tierlist-screenshot-render.tierlist-screenshot-landscape
.game-tag,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-D .game-tag,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-E .game-tag,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-F .game-tag {
    max-width: 100% !important;
    padding: 2px 3px !important;

    font-size: 7px !important;
    line-height: 1 !important;
}


/*
 * Если общий размер карточек пришлось уменьшить,
 * теги становятся нечитаемыми — скрываем их.
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape.landscape-screenshot-compact
.game-tags {
    display: none !important;
}


/*
 * В экстремально заполненном тир-листе карточки
 * остаются с обложками, но без нечитаемого текста.
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape.landscape-screenshot-tiny
.game-title,
.tierlist-screenshot-render.tierlist-screenshot-landscape.landscape-screenshot-tiny
.game-tags {
    display: none !important;
}

                                
                                
                                .tierlist-screenshot-render.tierlist-screenshot-landscape
                                .game-tag,
                                .tierlist-screenshot-render.tierlist-screenshot-landscape
                                #tier-D .game-tag,
                                .tierlist-screenshot-render.tierlist-screenshot-landscape
                                #tier-E .game-tag,
                                .tierlist-screenshot-render.tierlist-screenshot-landscape
                                #tier-F .game-tag {
                                    max-width: 100% !important;
                                    padding: 2px 3px !important;
                                
                                    font-size: 7px !important;
                                    line-height: 1 !important;
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
                            if (
    isLandscape
) {
    applyAdaptiveLandscapeScreenshotLayout(
        clonedTierList
    );
}

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
            isLandscape
                ? 'raider-roguelike-tierlist-16x9.png'
                : 'raider-roguelike-tierlist.png';


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


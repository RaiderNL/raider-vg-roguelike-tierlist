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
    gameMatchesFilters
} from './filters.js';

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

let searchRenderTimer =
    null;

const tierContainers =
    {};


/*
 * Запуск приложения после загрузки HTML.
 */
document.addEventListener(
    'DOMContentLoaded',
    init
);


/*
 * Закрытие popup после возвращения
 * на страницу из другой вкладки.
 */
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


/*
 * Закрытие popup при восстановлении страницы.
 */
window.addEventListener(
    'pageshow',
    closeAllPreviews
);


/*
 * Пересчёт позиции popup
 * после изменения размера окна.
 */
window.addEventListener(
    'resize',
    updateVisiblePreviewPositions
);


/*
 * Пересчёт позиции popup
 * при прокрутке страницы.
 */
window.addEventListener(
    'scroll',
    updateVisiblePreviewPositions,
    true
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

    const priceModeToggle =
        document.querySelector(
            '#price-mode-toggle'
        );

    const backToTopButton =
        document.querySelector(
            '#back-to-top'
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


    setupBackToTop(
        backToTopButton
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
        renderGames();
    } catch (
        error
    ) {
        console.error(
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
    /*
     * Перед перерисовкой закрываем popup,
     * чтобы старые карточки не оставались
     * активными.
     */
    closeAllPreviews();

    clearTierContainers();


    const searchValue =
        getSearchValue();

    const selectedTag =
        getSelectedTag();

    const selectedVideo =
        getSelectedVideo();


    updateVideoFilterState(
        selectedVideo
    );


    const filteredGames =
        appState.games
            .filter(
                game =>
                    gameMatchesFilters(
                        game,
                        searchValue,
                        selectedTag,
                        selectedVideo
                    )
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
                        videoFilterActive: selectedVideo !== ''
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
                container.innerHTML =
                    '';
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
            const isDesktop =
                window.matchMedia(
                    '(min-width: 901px)'
                ).matches;

            const controlsRect =
                controls.getBoundingClientRect();

            const shouldShow =
                isDesktop &&
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

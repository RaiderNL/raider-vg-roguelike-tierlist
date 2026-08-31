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
     * Перед копированием принудительно
     * синхронизируем URL с текущими фильтрами.
     */
    updateUrlFromFilters();

    const url =
        window.location.href;

    try {
        await copyText(
            url
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

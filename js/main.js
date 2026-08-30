import { appState } from './state.js';

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

import { createGameCard } from './cards.js';

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


// Запуск приложения после загрузки HTML
document.addEventListener(
    'DOMContentLoaded',
    init
);


// Закрытие popup после возвращения
// на страницу из другой вкладки
document.addEventListener(
    'visibilitychange',
    () => {
        if (document.visibilityState === 'visible') {
            closeAllPreviews();
        }
    }
);


// Закрытие popup при восстановлении страницы
window.addEventListener(
    'pageshow',
    closeAllPreviews
);


// Пересчёт позиции открытых popup
// после изменения размера окна
window.addEventListener(
    'resize',
    updateVisiblePreviewPositions
);


// Пересчёт позиции popup при прокрутке.
// Параметр true позволяет отслеживать
// прокрутку вложенных контейнеров.
window.addEventListener(
    'scroll',
    updateVisiblePreviewPositions,
    true
);


function init() {
    const searchInput =
        document.querySelector('#search');

    const tagFilter =
        document.querySelector('#tag-filter');

    const videoFilter =
        document.querySelector('#video-filter');


    if (searchInput) {
        searchInput.addEventListener(
            'input',
            renderGames
        );
    }


    if (tagFilter) {
        tagFilter.addEventListener(
            'change',
            renderGames
        );
    }


    if (videoFilter) {
        videoFilter.addEventListener(
            'change',
            renderGames
        );
    }


    loadApplicationData();
}


async function loadApplicationData() {
    try {
        appState.games =
            await loadGames();

        fillTagFilter();
        fillVideoFilter();
        renderGames();
    } catch (error) {
        console.error(error);
        showLoadingError();
    }
}


function renderGames() {
    /*
     * Перед перерисовкой закрываем popup,
     * чтобы старые карточки не оставались
     * активными во время обновления DOM.
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
            .filter(game =>
                gameMatchesFilters(
                    game,
                    searchValue,
                    selectedTag,
                    selectedVideo
                )
            )
            .sort(compareGamesByOrder);


    filteredGames.forEach(game => {
        const tier =
            normalizeTier(game['Tier']);

        const container =
            document.querySelector(
                `#tier-${tier}`
            );

        if (!container) {
            return;
        }

        container.appendChild(
            createGameCard(game)
        );
    });


    renderSelectedVideo(
        appState.games,
        selectedVideo
    );
}


function clearTierContainers() {
    TIER_NAMES.forEach(tier => {
        const container =
            document.querySelector(
                `#tier-${tier}`
            );

        if (container) {
            container.innerHTML = '';
        }
    });
}


function updateVideoFilterState(
    selectedVideo
) {
    const layout =
        document.querySelector(
            '.tier-list-layout'
        );

    if (!layout) {
        return;
    }

    layout.classList.toggle(
        VIDEO_FILTER_ACTIVE_CLASS,
        selectedVideo !== ''
    );
}


function showLoadingError() {
    const tierList =
        document.querySelector(
            '.tier-list'
        );

    if (!tierList) {
        return;
    }

    tierList.innerHTML = `
        <p class="loading-error">
            Не удалось загрузить данные из Google Sheets.
        </p>
    `;
}

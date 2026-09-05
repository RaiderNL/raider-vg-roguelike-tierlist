/*
 * =========================================================
 * Обычный рендер тир-листа
 * =========================================================
 *
 * Модуль отвечает за:
 * - фильтрацию игр;
 * - сортировку по Order;
 * - очистку тиров;
 * - создание карточек;
 * - отображение выбранного видео;
 * - состояние кнопки избранного;
 * - синхронизацию фильтров с URL.
 *
 * Презентационный режим намеренно вынесен отдельно:
 * он использует appendGameCardToTier(), но не является
 * частью обычного интерактивного рендера.
 */

import {
    appState
} from './state.js';

import {
    normalizeTier,
    compareGamesByOrder
} from './data.js';

import {
    getSearchValue,
    getSelectedTag,
    getSelectedVideo,
    gameMatchesFilters,
    updateUrlFromFilters
} from './filters.js';

import {
    isFavoritesFilterActive,
    getActiveFavoriteIds,
    getGameId
} from './favorites.js';

import {
    createGameCard
} from './cards.js';

import {
    renderSelectedVideo
} from './video.js';

import {
    VIDEO_FILTER_ACTIVE_CLASS
} from './config.js';

import {
    elements,
    getTierContainer
} from './dom.js';


const FAVORITES_ACTIVE_CLASS =
    'is-active';


/*
 * =========================================================
 * Данные текущего отображения
 * =========================================================
 */

/*
 * Возвращает состояние фильтров в одном объекте.
 *
 * Это удобно, чтобы не читать одни и те же DOM-поля
 * в разных частях одного рендера.
 */
export function getCurrentFilterState() {
    return {
        searchValue:
            getSearchValue(),

        selectedTag:
            getSelectedTag(),

        selectedVideo:
            getSelectedVideo(),

        favoritesFilterActive:
            isFavoritesFilterActive(),

        activeFavoriteIds:
            getActiveFavoriteIds()
    };
}


/*
 * Возвращает массив игр, подходящих под текущие фильтры.
 *
 * Здесь не меняется DOM — только вычисляются данные.
 * Поэтому функцию можно переиспользовать, например,
 * для счётчика найденных игр в будущем.
 */
export function getFilteredGames(
    filterState =
        getCurrentFilterState()
) {
    const {
        searchValue,
        selectedTag,
        selectedVideo,
        favoritesFilterActive,
        activeFavoriteIds
    } = filterState;

    return appState.games
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
}


/*
 * =========================================================
 * Карточки и тиры
 * =========================================================
 */

/*
 * Добавляет одну карточку в тир игры.
 *
 * presentationEntry используется модулем presentation.js:
 * в этом режиме карточка создаётся без интерактивных
 * элементов — popup, звёздочки и клика по карточке.
 */
export function appendGameCardToTier(
    game,
    {
        videoFilterActive = false,
        presentationEntry = false
    } = {}
) {
    const tier =
        normalizeTier(
            game['Tier']
        );

    const container =
        getTierContainer(
            tier
        );

    if (
        !container
    ) {
        return null;
    }

    const card =
        createGameCard(
            game,
            {
                videoFilterActive,

                showFavorite:
                    !presentationEntry,

                openOnCardClick:
                    !presentationEntry
            }
        );

    container.appendChild(
        card
    );

    return card;
}


/*
 * Полностью очищает карточки во всех тирах.
 *
 * Контейнеры сохраняются — удаляются только дочерние
 * карточки, поэтому цветные метки S–F остаются на месте.
 */
export function clearTierContainers() {
    Object.values(
        elements.tierContainers
    ).forEach(
        container => {
            container?.replaceChildren();
        }
    );
}


/*
 * Добавляет список игр в соответствующие тиры.
 */
export function renderGameCards(
    games,
    {
        videoFilterActive = false
    } = {}
) {
    games.forEach(
        game => {
            appendGameCardToTier(
                game,
                {
                    videoFilterActive
                }
            );
        }
    );
}


/*
 * =========================================================
 * Состояния элементов интерфейса
 * =========================================================
 */

export function updateVideoFilterState(
    selectedVideo
) {
    elements.layout?.classList.toggle(
        VIDEO_FILTER_ACTIVE_CLASS,
        Boolean(
            selectedVideo
        )
    );
}


export function updateFavoritesFilterState() {
    const button =
        elements.favoritesFilter;

    if (
        !button
    ) {
        return;
    }

    const isActive =
        isFavoritesFilterActive();

    button.classList.toggle(
        FAVORITES_ACTIVE_CLASS,
        isActive
    );

    button.setAttribute(
        'aria-pressed',
        String(
            isActive
        )
    );

    const label =
        isActive
            ? 'Показывать все игры'
            : 'Показывать только избранные игры';

    button.setAttribute(
        'aria-label',
        label
    );

    button.title =
        label;

    const icon =
        button.querySelector(
            '.tier-control-button-icon, span[aria-hidden="true"]'
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


/*
 * =========================================================
 * Главный рендер обычного списка
 * =========================================================
 *
 * syncUrl:
 * - true  — обычные изменения фильтров от пользователя;
 * - false — URL уже является источником истины, например
 *           после browser Back / Forward (popstate).
 *
 * renderVideoPanel:
 * - false пригодится для будущих режимов, где правая
 *   панель не нужна. По умолчанию всегда отображается.
 */
export function renderTierList(
    {
        syncUrl = true,
        renderVideoPanel = true
    } = {}
) {
    const filterState =
        getCurrentFilterState();

    const {
        selectedVideo
    } = filterState;

    if (
        syncUrl
    ) {
        updateUrlFromFilters();
    }

    clearTierContainers();

    updateVideoFilterState(
        selectedVideo
    );

    updateFavoritesFilterState();

    const filteredGames =
        getFilteredGames(
            filterState
        );

    renderGameCards(
        filteredGames,
        {
            videoFilterActive:
                Boolean(
                    selectedVideo
                )
        }
    );

    if (
        renderVideoPanel
    ) {
        renderSelectedVideo(
            appState.games,
            selectedVideo
        );
    }

    return {
        filterState,
        filteredGames
    };
}

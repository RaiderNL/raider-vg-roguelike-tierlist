import {
    FAVORITES_STORAGE_KEY,
    FAVORITES_FILTER_PARAMETER,
    SHARED_FAVORITES_PARAMETER,
    FAVORITES_ONLY_VALUE
} from './config.js';


/*
 * Возвращает стабильный ID игры.
 */
export function getGameId(
    game
) {
    return String(
        game?.['ID'] || ''
    ).trim();
}


/*
 * Возвращает локальный список избранного.
 */
export function getFavoriteIds() {
    try {
        const storedValue =
            localStorage.getItem(
                FAVORITES_STORAGE_KEY
            );

        if (
            !storedValue
        ) {
            return new Set();
        }

        const parsedValue =
            JSON.parse(
                storedValue
            );

        if (
            !Array.isArray(
                parsedValue
            )
        ) {
            return new Set();
        }

        return new Set(
            parsedValue
                .map(
                    id =>
                        String(
                            id
                        ).trim()
                )
                .filter(
                    Boolean
                )
        );
    } catch (
        error
    ) {
        console.warn(
            'Не удалось загрузить избранное:',
            error
        );

        return new Set();
    }
}


/*
 * Сохраняет локальный список избранного.
 */
function saveFavoriteIds(
    favoriteIds
) {
    try {
        localStorage.setItem(
            FAVORITES_STORAGE_KEY,
            JSON.stringify(
                [...favoriteIds]
            )
        );
    } catch (
        error
    ) {
        console.warn(
            'Не удалось сохранить избранное:',
            error
        );
    }
}


/*
 * Проверяет, добавлена ли игра
 * в локальное избранное.
 */
export function isFavorite(
    game
) {
    const gameId =
        getGameId(
            game
        );

    if (
        !gameId
    ) {
        return false;
    }

    return getFavoriteIds().has(
        gameId
    );
}


/*
 * Добавляет или удаляет игру
 * из локального избранного.
 *
 * Возвращает новое состояние:
 * true — игра добавлена;
 * false — игра удалена.
 */
export function toggleFavorite(
    game
) {
    const gameId =
        getGameId(
            game
        );

    if (
        !gameId
    ) {
        return false;
    }

    const favoriteIds =
        getFavoriteIds();

    if (
        favoriteIds.has(
            gameId
        )
    ) {
        favoriteIds.delete(
            gameId
        );
    } else {
        favoriteIds.add(
            gameId
        );
    }

    saveFavoriteIds(
        favoriteIds
    );

    return favoriteIds.has(
        gameId
    );
}


/*
 * Возвращает список ID из общей ссылки.
 *
 * Общий список не записывается в localStorage.
 */
export function getSharedFavoriteIds() {
    const url =
        new URL(
            window.location.href
        );

    const sharedValue =
        url.searchParams.get(
            SHARED_FAVORITES_PARAMETER
        );

    if (
        !sharedValue
    ) {
        return null;
    }

    const sharedIds =
        sharedValue
            .split(',')
            .map(
                id =>
                    String(
                        id
                    ).trim()
            )
            .filter(
                Boolean
            );

    return new Set(
        sharedIds
    );
}


/*
 * Проверяет, открыта ли ссылка
 * с переданным списком избранного.
 */
export function hasSharedFavorites() {
    return getSharedFavoriteIds() !== null;
}


/*
 * Возвращает активный список избранного.
 *
 * Если открыта общая ссылка,
 * используется список из неё.
 * Локальное избранное при этом не меняется.
 */
export function getActiveFavoriteIds() {
    const sharedFavoriteIds =
        getSharedFavoriteIds();

    return sharedFavoriteIds ||
        getFavoriteIds();
}


/*
 * Проверяет, включён ли фильтр избранного.
 */
export function isFavoritesFilterActive() {
    const url =
        new URL(
            window.location.href
        );

    return (
        url.searchParams.get(
            FAVORITES_FILTER_PARAMETER
        ) === FAVORITES_ONLY_VALUE ||
        hasSharedFavorites()
    );
}


/*
 * Меняет состояние фильтра избранного
 * в URL текущей страницы.
 */
export function setFavoritesFilter(
    isActive
) {
    const url =
        new URL(
            window.location.href
        );

    if (
        isActive
    ) {
        url.searchParams.set(
            FAVORITES_FILTER_PARAMETER,
            FAVORITES_ONLY_VALUE
        );
    } else {
        url.searchParams.delete(
            FAVORITES_FILTER_PARAMETER
        );
    }

    window.history.replaceState(
        {},
        '',
        url
    );
}


/*
 * Добавляет список избранного в URL
 * для передачи ссылки другому пользователю.
 *
 * Локальное избранное пользователя
 * при этом не изменяется.
 */
export function addFavoritesToUrl(
    url
) {
    const favoriteIds =
        getFavoriteIds();

    url.searchParams.set(
        FAVORITES_FILTER_PARAMETER,
        FAVORITES_ONLY_VALUE
    );

    if (
        favoriteIds.size > 0
    ) {
        url.searchParams.set(
            SHARED_FAVORITES_PARAMETER,
            [...favoriteIds].join(',')
        );
    } else {
        url.searchParams.delete(
            SHARED_FAVORITES_PARAMETER
        );
    }

    return url;
}


/*
 * Удаляет параметры общего списка
 * из текущего URL.
 */
export function clearSharedFavoritesFromUrl() {
    const url =
        new URL(
            window.location.href
        );

    url.searchParams.delete(
        SHARED_FAVORITES_PARAMETER
    );

    url.searchParams.delete(
        FAVORITES_FILTER_PARAMETER
    );

    window.history.replaceState(
        {},
        '',
        url
    );
}

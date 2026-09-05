/*
 * =========================================================
 * Локальное и общее избранное
 * =========================================================
 *
 * Локальное избранное:
 * - хранится только в localStorage;
 * - меняется кнопками-звёздочками;
 * - не перезаписывается при открытии чужой ссылки.
 *
 * Общее избранное:
 * - передаётся параметром URL;
 * - не сохраняется в localStorage;
 * - имеет приоритет при просмотре общей подборки.
 */

import {
    FAVORITES_STORAGE_KEY,
    FAVORITES_FILTER_PARAMETER,
    SHARED_FAVORITES_PARAMETER,
    FAVORITES_ONLY_VALUE
} from './config.js';


/*
 * =========================================================
 * Стабильный ID игры
 * =========================================================
 */

export function getGameId(
    game
) {
    return String(
        game?.['ID'] || ''
    ).trim();
}


/*
 * =========================================================
 * Локальное избранное
 * =========================================================
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
 * Возвращает true только при успешной записи.
 *
 * Это важно: если localStorage недоступен, интерфейс
 * не должен показывать игру как сохранённую, когда после
 * следующего рендера она снова исчезнет из избранного.
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

        return true;
    } catch (
        error
    ) {
        console.warn(
            'Не удалось сохранить избранное:',
            error
        );

        return false;
    }
}


/*
 * Проверяет, есть ли игра в локальном избранном.
 *
 * Общая подборка намеренно здесь не учитывается:
 * звёздочка карточки отражает именно личное локальное
 * избранное пользователя.
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
 * Добавляет или удаляет игру из локального избранного.
 *
 * Возвращает новое состояние:
 * - true  — игра добавлена;
 * - false — игра удалена.
 *
 * При успешном сохранении отправляет favoriteschange.
 * Его слушает ui-controls.js и обновляет тир-лист,
 * если включён фильтр «только избранное».
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

    const wasFavorite =
        favoriteIds.has(
            gameId
        );

    if (
        wasFavorite
    ) {
        favoriteIds.delete(
            gameId
        );
    } else {
        favoriteIds.add(
            gameId
        );
    }

    const isSaved =
        saveFavoriteIds(
            favoriteIds
        );

    /*
     * Если запись в localStorage не удалась, возвращаем
     * исходное состояние и не инициируем перерисовку.
     */
    if (
        !isSaved
    ) {
        return wasFavorite;
    }

    const isNowFavorite =
        favoriteIds.has(
            gameId
        );

    dispatchFavoritesChange(
        {
            gameId,
            isFavorite:
                isNowFavorite
        }
    );

    return isNowFavorite;
}


/*
 * =========================================================
 * Общее избранное из URL
 * =========================================================
 */

/*
 * Возвращает общий список из переданного URL.
 *
 * null означает, что параметра sharedFavorites нет.
 * Пустой Set означает, что параметр есть, но список пуст.
 */
function getSharedFavoriteIdsFromUrl(
    url
) {
    const sharedValue =
        url.searchParams.get(
            SHARED_FAVORITES_PARAMETER
        );

    if (
        sharedValue ===
        null
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
 * Возвращает список ID из общей ссылки текущей страницы.
 *
 * Этот список не записывается в localStorage.
 */
export function getSharedFavoriteIds() {
    const url =
        new URL(
            window.location.href
        );

    return getSharedFavoriteIdsFromUrl(
        url
    );
}


/*
 * Проверяет, открыт ли режим просмотра общей подборки.
 */
export function hasSharedFavorites() {
    return getSharedFavoriteIds() !== null;
}


/*
 * Возвращает активный список ID для фильтрации:
 *
 * - при просмотре общей ссылки — IDs из URL;
 * - в обычном режиме — локальное избранное.
 */
export function getActiveFavoriteIds() {
    const sharedFavoriteIds =
        getSharedFavoriteIds();

    return (
        sharedFavoriteIds ||
        getFavoriteIds()
    );
}


/*
 * =========================================================
 * Состояние фильтра
 * =========================================================
 */

/*
 * Фильтр считается активным, если:
 *
 * - URL явно содержит favorites=only;
 * - открыта общая ссылка со списком избранного.
 *
 * Второй случай позволяет общей ссылке работать, даже если
 * в ней по старой версии проекта нет отдельного параметра
 * favorites=only.
 */
export function isFavoritesFilterActive() {
    const url =
        new URL(
            window.location.href
        );

    const isOnlyFavorites =
        url.searchParams.get(
            FAVORITES_FILTER_PARAMETER
        ) === FAVORITES_ONLY_VALUE;

    return (
        isOnlyFavorites ||
        getSharedFavoriteIdsFromUrl(
            url
        ) !== null
    );
}


/*
 * Меняет состояние фильтра в URL текущей страницы.
 *
 * Включение:
 * - добавляет favorites=only;
 * - не трогает sharedFavorites, если пользователь уже
 *   просматривает чужую подборку.
 *
 * Выключение:
 * - удаляет favorites=only;
 * - удаляет sharedFavorites;
 * - возвращает пользователя к обычному полному списку.
 *
 * Локальные звёздочки в localStorage никогда не удаляются.
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

        /*
         * Иначе sharedFavorites всё ещё заставит
         * isFavoritesFilterActive() вернуть true.
         */
        url.searchParams.delete(
            SHARED_FAVORITES_PARAMETER
        );
    }

    window.history.replaceState(
        {},
        '',
        url
    );
}


/*
 * =========================================================
 * Создание ссылки для шаринга
 * =========================================================
 *
 * Правила:
 *
 * 1. В обычном режиме в ссылку попадает локальное избранное.
 *
 * 2. При открытой общей подборке повторное копирование
 *    сохраняет её оригинальный набор ID. Локальные звёздочки
 *    пользователя не заменяют список автора ссылки.
 */

export function addFavoritesToUrl(
    url
) {
    if (
        !(url instanceof URL)
    ) {
        throw new TypeError(
            'addFavoritesToUrl ожидает объект URL'
        );
    }

    const sharedFavoriteIds =
        getSharedFavoriteIdsFromUrl(
            url
        );

    const favoriteIds =
        sharedFavoriteIds ||
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
        /*
         * Пустая локальная подборка не требует параметра IDs.
         * Параметр favorites=only остаётся, чтобы получатель
         * увидел именно пустой фильтр избранного.
         */
        url.searchParams.delete(
            SHARED_FAVORITES_PARAMETER
        );
    }

    return url;
}


/*
 * Удаляет параметры общего списка из URL.
 *
 * Используется, если в будущем понадобится отдельная кнопка
 * «Вернуться к своему избранному».
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


/*
 * =========================================================
 * События
 * =========================================================
 */

function dispatchFavoritesChange(
    {
        gameId,
        isFavorite
    }
) {
    window.dispatchEvent(
        new CustomEvent(
            'favoriteschange',
            {
                detail: {
                    gameId,
                    isFavorite
                }
            }
        )
    );
}

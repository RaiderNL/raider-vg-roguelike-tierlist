import {
    TIER_NAMES
} from './config.js';


const CUSTOM_TIERLIST_STORAGE_KEY =
    'roguelike-tierlist-custom';

const CUSTOM_TIERLIST_PARAMETER =
    'layout';


export const CUSTOM_TIER_NAMES = [
    'UNRANKED',
    ...TIER_NAMES
];

export const REMOVED_TIER_NAME =
    'REMOVED';


/*
 * Создаёт структуру со всеми тирами.
 */
export function createEmptyLayout() {
    const layout = {};

    [
        ...CUSTOM_TIER_NAMES,
        REMOVED_TIER_NAME
    ].forEach(
        tier => {
            layout[tier] = [];
        }
    );

    return layout;
}


/*
 * Помещает все доступные игры в UNRANKED.
 */
export function createInitialLayout(
    games
) {
    const layout =
        createEmptyLayout();

    games.forEach(
        game => {
            const gameId =
                getGameId(
                    game
                );

            if (
                gameId
            ) {
                layout.UNRANKED.push(
                    gameId
                );
            }
        }
    );

    return layout;
}


/*
 * Берёт стабильный ID из колонки ID Google Sheets.
 */
export function getGameId(
    game
) {
    return String(
        game?.ID || ''
    ).trim();
}


/*
 * Читает локально сохранённый тир-лист.
 */
export function loadLocalLayout() {
    try {
        const storedValue =
            localStorage.getItem(
                CUSTOM_TIERLIST_STORAGE_KEY
            );

        if (
            !storedValue
        ) {
            return null;
        }

        const layout =
            JSON.parse(
                storedValue
            );

        return isLayoutObject(
            layout
        )
            ? layout
            : null;
    } catch (
        error
    ) {
        console.warn(
            'Не удалось загрузить собственный тир-лист:',
            error
        );

        return null;
    }
}


/*
 * Сохраняет локальную версию.
 */
export function saveLocalLayout(
    layout
) {
    try {
        localStorage.setItem(
            CUSTOM_TIERLIST_STORAGE_KEY,
            JSON.stringify(
                layout
            )
        );

        return true;
    } catch (
        error
    ) {
        console.warn(
            'Не удалось сохранить тир-лист:',
            error
        );

        return false;
    }
}


/*
 * Удаляет только пользовательскую локальную раскладку.
 */
export function removeLocalLayout() {
    localStorage.removeItem(
        CUSTOM_TIERLIST_STORAGE_KEY
    );
}


/*
 * Читает раскладку из параметра ?layout=.
 */
export function loadSharedLayout() {
    const url =
        new URL(
            window.location.href
        );

    const encodedLayout =
        url.searchParams.get(
            CUSTOM_TIERLIST_PARAMETER
        );

    if (
        !encodedLayout
    ) {
        return null;
    }

    try {
        const decodedJson =
            decodeLayout(
                encodedLayout
            );

        const layout =
            JSON.parse(
                decodedJson
            );

        return isLayoutObject(
            layout
        )
            ? layout
            : null;
    } catch (
        error
    ) {
        console.warn(
            'Не удалось прочитать тир-лист из ссылки:',
            error
        );

        return null;
    }
}


/*
 * Общая ссылка имеет приоритет над localStorage.
 */
export function getStartLayout(
    games
) {
    const sharedLayout =
        loadSharedLayout();

    if (
        sharedLayout
    ) {
        return {
            layout:
                normalizeLayout(
                    sharedLayout,
                    games
                ),
            isShared: true
        };
    }

    const localLayout =
        loadLocalLayout();

    if (
        localLayout
    ) {
        return {
            layout:
                normalizeLayout(
                    localLayout,
                    games
                ),
            isShared: false
        };
    }

    return {
        layout:
            createInitialLayout(
                games
            ),
        isShared: false
    };
}


/*
 * Убирает дубликаты, неизвестные ID и добавляет новые игры.
 */
export function normalizeLayout(
    layout,
    games
) {
    const normalizedLayout =
        createEmptyLayout();

    const availableIds =
        new Set(
            games
                .map(
                    getGameId
                )
                .filter(
                    Boolean
                )
        );

    const usedIds =
        new Set();

    [
        ...CUSTOM_TIER_NAMES,
        REMOVED_TIER_NAME
    ].forEach(
        tier => {
            const gameIds =
                Array.isArray(
                    layout?.[tier]
                )
                    ? layout[tier]
                    : [];

            gameIds.forEach(
                value => {
                    const gameId =
                        String(
                            value || ''
                        ).trim();

                    if (
                        !gameId ||
                        !availableIds.has(
                            gameId
                        ) ||
                        usedIds.has(
                            gameId
                        )
                    ) {
                        return;
                    }

                    normalizedLayout[tier].push(
                        gameId
                    );

                    usedIds.add(
                        gameId
                    );
                }
            );
        }
    );

    games.forEach(
        game => {
            const gameId =
                getGameId(
                    game
                );

            if (
                gameId &&
                !usedIds.has(
                    gameId
                )
            ) {
                normalizedLayout.UNRANKED.push(
                    gameId
                );
            }
        }
    );

    return normalizedLayout;
}


/*
 * Кодирует JSON для URL безопасно для Unicode.
 */
export function encodeLayout(
    layout
) {
    return btoa(
        encodeURIComponent(
            JSON.stringify(
                layout
            )
        )
    );
}


function decodeLayout(
    encodedLayout
) {
    return decodeURIComponent(
        atob(
            encodedLayout
        )
    );
}


/*
 * Формирует новую ссылку, не меняя открытую страницу.
 */
export function createShareUrl(
    layout
) {
    const url =
        new URL(
            window.location.href
        );

    url.search = '';

    url.searchParams.set(
        CUSTOM_TIERLIST_PARAMETER,
        encodeLayout(
            layout
        )
    );

    return url.href;
}


function isLayoutObject(
    layout
) {
    if (
        !layout ||
        typeof layout !== 'object' ||
        Array.isArray(
            layout
        )
    ) {
        return false;
    }

    return [
        ...CUSTOM_TIER_NAMES,
        REMOVED_TIER_NAME
    ].some(
        tier =>
            Array.isArray(
                layout[tier]
            )
    );
}

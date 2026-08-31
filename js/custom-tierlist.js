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


/*
 * Создаёт пустую структуру
 * пользовательского тир-листа.
 */
export function createEmptyLayout() {
    const layout = {};

    CUSTOM_TIER_NAMES.forEach(
        tier => {
            layout[tier] = [];
        }
    );

    return layout;
}


/*
 * Создаёт начальную структуру:
 * все игры помещаются в «Не распределены».
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
 * Возвращает ID игры из колонки ID.
 */
export function getGameId(
    game
) {
    return String(
        game?.['ID'] || ''
    ).trim();
}


/*
 * Загружает собственную версию
 * из localStorage.
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

        const parsedLayout =
            JSON.parse(
                storedValue
            );

        return isLayoutObject(
            parsedLayout
        )
            ? parsedLayout
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
 * Сохраняет собственную версию
 * в localStorage.
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
            'Не удалось сохранить собственный тир-лист:',
            error
        );

        return false;
    }
}


/*
 * Удаляет сохранённую собственную версию.
 */
export function removeLocalLayout() {
    localStorage.removeItem(
        CUSTOM_TIERLIST_STORAGE_KEY
    );
}


/*
 * Читает пользовательскую версию
 * из параметра URL.
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
        const json =
            decodeLayout(
                encodedLayout
            );

        const parsedLayout =
            JSON.parse(
                json
            );

        return isLayoutObject(
            parsedLayout
        )
            ? parsedLayout
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
 * Возвращает структуру,
 * с которой нужно открыть страницу.
 *
 * Общая версия из URL имеет приоритет
 * над локально сохранённой версией.
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
 * Приводит структуру к безопасному виду.
 *
 * В структуру попадают только ID,
 * которые существуют в Google Sheets.
 *
 * Повторяющиеся ID удаляются.
 * Игры, отсутствующие в ссылке или сохранении,
 * помещаются в UNRANKED.
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
                    game =>
                        getGameId(
                            game
                        )
                )
                .filter(
                    Boolean
                )
        );

    const usedIds =
        new Set();

    CUSTOM_TIER_NAMES.forEach(
        tier => {
            const tierGames =
                Array.isArray(
                    layout?.[tier]
                )
                    ? layout[tier]
                    : [];

            tierGames.forEach(
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

                usedIds.add(
                    gameId
                );
            }
        }
    );

    return normalizedLayout;
}


/*
 * Кодирует структуру тир-листа
 * в безопасную строку для URL.
 */
export function encodeLayout(
    layout
) {
    const json =
        JSON.stringify(
            layout
        );

    const utf8Json =
        encodeURIComponent(
            json
        );

    return btoa(
        utf8Json
    );
}


/*
 * Декодирует структуру тир-листа
 * из строки URL.
 */
function decodeLayout(
    encodedLayout
) {
    const utf8Json =
        atob(
            encodedLayout
        );

    return decodeURIComponent(
        utf8Json
    );
}


/*
 * Создаёт URL пользовательского тир-листа.
 *
 * Исходный URL не изменяется.
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


/*
 * Проверяет структуру тир-листа.
 */
function isLayoutObject(
    layout
) {
    if (
        !layout ||
        typeof layout !== 'object' ||
        Array.isArray(layout)
    ) {
        return false;
    }

    return CUSTOM_TIER_NAMES.some(
        tier =>
            Array.isArray(
                layout[tier]
            )
    );
}

/*
 * =========================================================
 * Фильтры игр и синхронизация с URL
 * =========================================================
 *
 * Модуль отвечает только за:
 * - наполнение select тегов и роликов;
 * - чтение активных значений фильтров;
 * - проверку игры на соответствие фильтрам;
 * - чтение фильтров из URL;
 * - запись обычных фильтров в URL.
 *
 * Избранное намеренно не обрабатывается здесь:
 * его параметры принадлежат favorites.js.
 */

import {
    appState
} from './state.js';

import {
    getGameTags,
    getVideoUrl,
    getVideoNumber,
    getVideoLabel
} from './data.js';

import {
    elements
} from './dom.js';


const SEARCH_PARAMETER =
    'search';

const TAG_PARAMETER =
    'tag';

const VIDEO_PARAMETER =
    'video';

const ALL_TAGS_LABEL =
    'Все жанры';

const ALL_VIDEOS_LABEL =
    'Все ролики';


/*
 * =========================================================
 * Наполнение фильтра тегов
 * =========================================================
 */

export function fillTagFilter() {
    const tagFilter =
        elements.tagFilter;

    if (
        !tagFilter
    ) {
        return;
    }

    const tags =
        getAvailableTags();

    const fragment =
        document.createDocumentFragment();

    fragment.appendChild(
        createOption(
            '',
            ALL_TAGS_LABEL
        )
    );

    tags.forEach(
        tag => {
            fragment.appendChild(
                createOption(
                    tag,
                    tag
                )
            );
        }
    );

    tagFilter.replaceChildren(
        fragment
    );
}


function getAvailableTags() {
    return [
        ...new Set(
            appState.games.flatMap(
                game =>
                    getGameTags(
                        game
                    )
            )
        )
    ]
        .filter(
            Boolean
        )
        .sort(
            (
                firstTag,
                secondTag
            ) =>
                firstTag.localeCompare(
                    secondTag,
                    'ru'
                )
        );
}


/*
 * =========================================================
 * Наполнение фильтра роликов
 * =========================================================
 */

export function fillVideoFilter() {
    const videoFilter =
        elements.videoFilter;

    if (
        !videoFilter
    ) {
        return;
    }

    const videos =
        getAvailableVideos();

    const latestVideoNumber =
        getLatestVideoNumber(
            videos
        );

    const fragment =
        document.createDocumentFragment();

    fragment.appendChild(
        createOption(
            '',
            ALL_VIDEOS_LABEL
        )
    );

    videos.forEach(
        video => {
            fragment.appendChild(
                createOption(
                    video.videoUrl,
                    getVideoLabel(
                        video.game,
                        latestVideoNumber
                    )
                )
            );
        }
    );

    videoFilter.replaceChildren(
        fragment
    );
}


/*
 * Собирает один элемент на каждый уникальный URL ролика.
 */
function getAvailableVideos() {
    const videoMap =
        new Map();

    appState.games.forEach(
        game => {
            const videoUrl =
                getVideoUrl(
                    game
                );

            if (
                !videoUrl ||
                videoMap.has(
                    videoUrl
                )
            ) {
                return;
            }

            videoMap.set(
                videoUrl,
                {
                    game,
                    videoUrl,

                    videoNumber:
                        getVideoNumber(
                            game
                        )
                }
            );
        }
    );

    return [
        ...videoMap.values()
    ].sort(
        (
            firstVideo,
            secondVideo
        ) => {
            const firstNumber =
                firstVideo.videoNumber ??
                -Infinity;

            const secondNumber =
                secondVideo.videoNumber ??
                -Infinity;

            return (
                secondNumber -
                firstNumber
            );
        }
    );
}


function getLatestVideoNumber(
    videos
) {
    const numberedVideos =
        videos
            .map(
                video =>
                    video.videoNumber
            )
            .filter(
                Number.isFinite
            );

    if (
        numberedVideos.length ===
        0
    ) {
        return null;
    }

    return Math.max(
        ...numberedVideos
    );
}


/*
 * =========================================================
 * Чтение состояния фильтров
 * =========================================================
 */

export function getSearchValue() {
    return (
        elements.searchInput?.value ||
        ''
    )
        .trim()
        .toLocaleLowerCase(
            'ru'
        );
}


export function getSelectedTag() {
    return (
        elements.tagFilter?.value ||
        ''
    );
}


export function getSelectedVideo() {
    return (
        elements.videoFilter?.value ||
        ''
    );
}


/*
 * =========================================================
 * Проверка игры
 * =========================================================
 */

export function gameMatchesFilters(
    game,
    searchValue = '',
    selectedTag = '',
    selectedVideo = ''
) {
    const name =
        String(
            game['Name'] || ''
        )
            .trim()
            .toLocaleLowerCase(
                'ru'
            );

    const gameTags =
        getGameTags(
            game
        );

    const videoUrl =
        getVideoUrl(
            game
        );

    const matchesSearch =
        name.includes(
            searchValue
        );

    const matchesTag =
        !selectedTag ||
        gameTags.includes(
            selectedTag
        );

    const matchesVideo =
        !selectedVideo ||
        videoUrl === selectedVideo;

    return (
        matchesSearch &&
        matchesTag &&
        matchesVideo
    );
}


/*
 * =========================================================
 * URL → элементы управления
 * =========================================================
 *
 * Вызывается:
 * - при первой загрузке после заполнения select;
 * - после browser Back / Forward.
 *
 * Неизвестные tag/video из старой или ошибочной ссылки
 * безопасно заменяются пустым значением.
 */

export function setFiltersFromUrl() {
    const url =
        new URL(
            window.location.href
        );

    const searchValue =
        getUrlParameter(
            url,
            SEARCH_PARAMETER
        );

    const tagValue =
        getUrlParameter(
            url,
            TAG_PARAMETER
        );

    const videoValue =
        getUrlParameter(
            url,
            VIDEO_PARAMETER
        );

    if (
        elements.searchInput
    ) {
        elements.searchInput.value =
            searchValue;
    }

    if (
        elements.tagFilter
    ) {
        elements.tagFilter.value =
            optionExists(
                elements.tagFilter,
                tagValue
            )
                ? tagValue
                : '';
    }

    if (
        elements.videoFilter
    ) {
        elements.videoFilter.value =
            optionExists(
                elements.videoFilter,
                videoValue
            )
                ? videoValue
                : '';
    }

    return {
        searchValue,

        selectedTag:
            elements.tagFilter?.value ||
            '',

        selectedVideo:
            elements.videoFilter?.value ||
            ''
    };
}


/*
 * =========================================================
 * Элементы управления → URL
 * =========================================================
 *
 * Меняет только параметры обычных фильтров:
 *
 * - search;
 * - tag;
 * - video.
 *
 * Параметры избранного favorites/sharedFavorites сохраняются,
 * потому что URL создаётся из текущего window.location.href.
 */

export function updateUrlFromFilters() {
    const url =
        new URL(
            window.location.href
        );

    updateUrlParameter(
        url,
        SEARCH_PARAMETER,
        getSearchValue()
    );

    updateUrlParameter(
        url,
        TAG_PARAMETER,
        getSelectedTag()
    );

    updateUrlParameter(
        url,
        VIDEO_PARAMETER,
        getSelectedVideo()
    );

    window.history.replaceState(
        {},
        '',
        url
    );

    return url;
}


/*
 * =========================================================
 * Вспомогательные функции
 * =========================================================
 */

function getUrlParameter(
    url,
    parameter
) {
    return (
        url.searchParams.get(
            parameter
        ) || ''
    );
}


function updateUrlParameter(
    url,
    parameter,
    value
) {
    if (
        value
    ) {
        url.searchParams.set(
            parameter,
            value
        );

        return;
    }

    url.searchParams.delete(
        parameter
    );
}


function optionExists(
    select,
    value
) {
    return [
        ...select.options
    ].some(
        option =>
            option.value === value
    );
}


function createOption(
    value,
    text
) {
    const option =
        document.createElement(
            'option'
        );

    option.value =
        value;

    option.textContent =
        text;

    return option;
}

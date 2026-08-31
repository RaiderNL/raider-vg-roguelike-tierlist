import {
    appState
} from './state.js';

import {
    getGameTags,
    getVideoUrl,
    getVideoTitle,
    getVideoNumber,
    getVideoLabel
} from './data.js';


export function fillTagFilter() {
    const tagFilter =
        document.querySelector(
            '#tag-filter'
        );

    if (
        !tagFilter
    ) {
        return;
    }

    const tags = [
        ...new Set(
            appState.games.flatMap(
                game =>
                    getGameTags(
                        game
                    )
            )
        )
    ].sort(
        (
            firstTag,
            secondTag
        ) =>
            firstTag.localeCompare(
                secondTag,
                'ru'
            )
    );

    tagFilter.replaceChildren(
        createOption(
            '',
            'Все жанры'
        )
    );

    tags.forEach(
        tag => {
            tagFilter.appendChild(
                createOption(
                    tag,
                    tag
                )
            );
        }
    );
}


export function fillVideoFilter() {
    const videoFilter =
        document.querySelector(
            '#video-filter'
        );

    if (
        !videoFilter
    ) {
        return;
    }

    const videoMap =
        new Map();

    appState.games.forEach(
        game => {
            const videoUrl =
                getVideoUrl(
                    game
                );

            const videoTitle =
                getVideoTitle(
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
                    videoTitle,
                    videoNumber:
                        getVideoNumber(
                            game
                        )
                }
            );
        }
    );

    const videos =
        [...videoMap.entries()]
            .map(
                ([
                    videoUrl,
                    videoData
                ]) => ({
                    videoUrl,
                    ...videoData
                })
            );

    const numberedVideos =
        videos
            .map(
                video => video.videoNumber
            )
            .filter(
                videoNumber =>
                    videoNumber !== null
            );

    const latestVideoNumber =
        numberedVideos.length > 0
            ? Math.max(
                ...numberedVideos
            )
            : null;

    videos.sort(
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

            return secondNumber - firstNumber;
        }
    );

    videoFilter.replaceChildren(
        createOption(
            '',
            'Все ролики'
        )
    );

    videos.forEach(
        video => {
            videoFilter.appendChild(
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
}


export function getSearchValue() {
    const searchInput =
        document.querySelector(
            '#search'
        );

    return searchInput
        ? searchInput.value
            .trim()
            .toLowerCase()
        : '';
}


export function getSelectedTag() {
    const tagFilter =
        document.querySelector(
            '#tag-filter'
        );

    return tagFilter
        ? tagFilter.value
        : '';
}


export function getSelectedVideo() {
    const videoFilter =
        document.querySelector(
            '#video-filter'
        );

    return videoFilter
        ? videoFilter.value
        : '';
}


export function gameMatchesFilters(
    game,
    searchValue,
    selectedTag,
    selectedVideo
) {
    const name =
        String(
            game['Name'] || ''
        )
            .trim()
            .toLowerCase();

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
        selectedTag === '' ||
        gameTags.includes(
            selectedTag
        );

    const matchesVideo =
        selectedVideo === '' ||
        videoUrl === selectedVideo;

    return (
        matchesSearch &&
        matchesTag &&
        matchesVideo
    );
}


export function setFiltersFromUrl() {
    const url =
        new URL(
            window.location.href
        );

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
            url.searchParams.get(
                'search'
            ) || '';
    }

    if (
        tagFilter
    ) {
        const tagValue =
            url.searchParams.get(
                'tag'
            ) || '';

        tagFilter.value =
            optionExists(
                tagFilter,
                tagValue
            )
                ? tagValue
                : '';
    }

    if (
        videoFilter
    ) {
        const videoValue =
            url.searchParams.get(
                'video'
            ) || '';

        videoFilter.value =
            optionExists(
                videoFilter,
                videoValue
            )
                ? videoValue
                : '';
    }
}


export function updateUrlFromFilters() {
    const url =
        new URL(
            window.location.href
        );

    const searchValue =
        getSearchValue();

    const selectedTag =
        getSelectedTag();

    const selectedVideo =
        getSelectedVideo();

    updateUrlParameter(
        url,
        'search',
        searchValue
    );

    updateUrlParameter(
        url,
        'tag',
        selectedTag
    );

    updateUrlParameter(
        url,
        'video',
        selectedVideo
    );

    window.history.replaceState(
        {},
        '',
        url
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

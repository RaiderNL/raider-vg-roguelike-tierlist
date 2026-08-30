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

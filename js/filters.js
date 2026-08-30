import { appState } from './state.js';

import { getGameTags } from './data.js';


export function fillTagFilter() {
    const tagFilter =
        document.querySelector('#tag-filter');

    if (!tagFilter) {
        return;
    }

    const tags = [
        ...new Set(
            appState.games.flatMap(game =>
                getGameTags(game)
            )
        )
    ].sort((firstTag, secondTag) =>
        firstTag.localeCompare(secondTag, 'ru')
    );

    tagFilter.innerHTML = `
        <option value="">
            Все жанры
        </option>
    `;

    tags.forEach(tag => {
        const option =
            document.createElement('option');

        option.value = tag;
        option.textContent = tag;

        tagFilter.appendChild(option);
    });
}


export function fillVideoFilter() {
    const videoFilter =
        document.querySelector('#video-filter');

    if (!videoFilter) {
        return;
    }

    const videoTitles = [
        ...new Set(
            appState.games
                .map(game =>
                    String(
                        game['Video Title'] || ''
                    ).trim()
                )
                .filter(Boolean)
        )
    ].sort((firstTitle, secondTitle) =>
        firstTitle.localeCompare(secondTitle, 'ru')
    );

    videoFilter.innerHTML = `
        <option value="">
            Все ролики
        </option>
    `;

    videoTitles.forEach(videoTitle => {
        const option =
            document.createElement('option');

        option.value = videoTitle;
        option.textContent = videoTitle;

        videoFilter.appendChild(option);
    });
}


export function getSearchValue() {
    const searchInput =
        document.querySelector('#search');

    return searchInput
        ? searchInput.value.trim().toLowerCase()
        : '';
}


export function getSelectedTag() {
    const tagFilter =
        document.querySelector('#tag-filter');

    return tagFilter
        ? tagFilter.value
        : '';
}


export function getSelectedVideo() {
    const videoFilter =
        document.querySelector('#video-filter');

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
    const name = String(game['Name'] || '')
        .trim()
        .toLowerCase();

    const gameTags = getGameTags(game);

    const videoTitle = String(
        game['Video Title'] || ''
    ).trim();

    const matchesSearch =
        name.includes(searchValue);

    const matchesTag =
        selectedTag === '' ||
        gameTags.includes(selectedTag);

    const matchesVideo =
        selectedVideo === '' ||
        videoTitle === selectedVideo;

    return (
        matchesSearch &&
        matchesTag &&
        matchesVideo
    );
}

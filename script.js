const SHEET_ID = '1WOZWwc-DohQsz6wwEOOF7xaVv2Y2MHCi_4kOq7yOK1s';
const SHEET_GID = '0';

const SHEET_URL =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

const TIER_NAMES = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];

const PREVIEW_CLOSED_CLASS = 'preview-closed';
const ACTIVE_ROW_CLASS = 'tier-row-active';

let games = [];

document.addEventListener('DOMContentLoaded', init);

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        closeAllPreviews();
    }
});

window.addEventListener('pageshow', () => {
    closeAllPreviews();
});

window.addEventListener('resize', () => {
    document
        .querySelectorAll('.game-card:hover, .game-card:focus-within')
        .forEach(card => {
            positionPreview(card);
        });
});


function init() {
    const searchInput = document.querySelector('#search');
    const tagFilter = document.querySelector('#tag-filter');
    const videoFilter = document.querySelector('#video-filter');

    if (searchInput) {
        searchInput.addEventListener('input', renderGames);
    }

    if (tagFilter) {
        tagFilter.addEventListener('change', renderGames);
    }

    if (videoFilter) {
        videoFilter.addEventListener('change', renderGames);
    }

    loadGames();
}

async function loadGames() {
    try {
        const response = await fetch(SHEET_URL);

        if (!response.ok) {
            throw new Error(
                `Ошибка загрузки таблицы: ${response.status}`
            );
        }

        const csvText = await response.text();

        games = parseCSV(csvText);

        fillTagFilter();
        fillVideoFilter();
        renderGames();
    } catch (error) {
        console.error(error);
        showLoadingError();
    }
}

function showLoadingError() {
    const tierList = document.querySelector('.tier-list');

    if (!tierList) {
        return;
    }

    tierList.innerHTML = `
        <p class="loading-error">
            Не удалось загрузить данные из Google Sheets.
        </p>
    `;
}

function parseCSV(text) {
    const rows = [];
    let row = [];
    let value = '';
    let insideQuotes = false;

    for (let index = 0; index < text.length; index++) {
        const character = text[index];
        const nextCharacter = text[index + 1];

        if (
            character === '"' &&
            insideQuotes &&
            nextCharacter === '"'
        ) {
            value += '"';
            index++;
            continue;
        }

        if (character === '"') {
            insideQuotes = !insideQuotes;
            continue;
        }

        if (character === ',' && !insideQuotes) {
            row.push(value.trim());
            value = '';
            continue;
        }

        if (
            (character === '\n' || character === '\r') &&
            !insideQuotes
        ) {
            if (character === '\r' && nextCharacter === '\n') {
                index++;
            }

            row.push(value.trim());
            value = '';

            if (row.some(cell => cell !== '')) {
                rows.push(row);
            }

            row = [];
            continue;
        }

        value += character;
    }

    if (value.length > 0 || row.length > 0) {
        row.push(value.trim());

        if (row.some(cell => cell !== '')) {
            rows.push(row);
        }
    }

    if (rows.length === 0) {
        return [];
    }

    const headers = rows[0].map(header => header.trim());

    return rows.slice(1).map(columns => {
        const game = {};

        headers.forEach((header, index) => {
            game[header] = columns[index] || '';
        });

        return game;
    });
}

function getGameTags(game) {
    return String(game['Tag'] || '')
        .split(/[,;|/]+/)
        .map(tag => tag.trim())
        .filter(Boolean);
}

function fillTagFilter() {
    const tagFilter = document.querySelector('#tag-filter');

    if (!tagFilter) {
        return;
    }

    const tags = [
        ...new Set(
            games.flatMap(game => getGameTags(game))
        )
    ].sort((firstTag, secondTag) =>
        firstTag.localeCompare(secondTag, 'ru')
    );

    tagFilter.innerHTML = `
        <option value="">Все жанры</option>
    `;

    tags.forEach(tag => {
        const option = document.createElement('option');

        option.value = tag;
        option.textContent = tag;

        tagFilter.appendChild(option);
    });
}

function fillVideoFilter() {
    const videoFilter = document.querySelector('#video-filter');

    if (!videoFilter) {
        return;
    }

    const videoTitles = [
        ...new Set(
            games
                .map(game =>
                    String(game['Video Title'] || '').trim()
                )
                .filter(Boolean)
        )
    ].sort((firstTitle, secondTitle) =>
        firstTitle.localeCompare(secondTitle, 'ru')
    );

    videoFilter.innerHTML = `
        <option value="">Все ролики</option>
    `;

    videoTitles.forEach(videoTitle => {
        const option = document.createElement('option');

        option.value = videoTitle;
        option.textContent = videoTitle;

        videoFilter.appendChild(option);
    });
}

function renderGames() {
    clearTierContainers();

    const searchValue = getSearchValue();
    const selectedTag = getSelectedTag();
    const selectedVideo = getSelectedVideo();

    const filteredGames = games
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
        const tier = normalizeTier(game['Tier']);
        const container = document.querySelector(`#tier-${tier}`);

        if (container) {
            container.appendChild(createGameCard(game));
        }
    });

    updateVideoFilterState(selectedVideo);
    renderSelectedVideo(selectedVideo);

}

function clearTierContainers() {
    TIER_NAMES.forEach(tier => {
        const container = document.querySelector(`#tier-${tier}`);

        if (container) {
            container.innerHTML = '';
        }
    });
}

function getSearchValue() {
    const searchInput = document.querySelector('#search');

    return searchInput
        ? searchInput.value.trim().toLowerCase()
        : '';
}

function getSelectedTag() {
    const tagFilter = document.querySelector('#tag-filter');

    return tagFilter ? tagFilter.value : '';
}

function getSelectedVideo() {
    const videoFilter = document.querySelector('#video-filter');

    return videoFilter ? videoFilter.value : '';
}

function updateVideoFilterState(selectedVideo) {
    const layout = document.querySelector('.tier-list-layout');

    if (!layout) {
        return;
    }

    layout.classList.toggle(
        'video-filter-active',
        selectedVideo !== ''
    );
}


function gameMatchesFilters(
    game,
    searchValue,
    selectedTag,
    selectedVideo
) {
    const name = String(game['Name'] || '')
        .trim()
        .toLowerCase();

    const videoTitle = String(game['Video Title'] || '')
        .trim();

    const gameTags = getGameTags(game);

    const matchesSearch = name.includes(searchValue);

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

function compareGamesByOrder(firstGame, secondGame) {
    const firstOrder =
        Number(firstGame['Order']) || 999999;

    const secondOrder =
        Number(secondGame['Order']) || 999999;

    return firstOrder - secondOrder;
}

function normalizeTier(tier) {
    const normalizedTier = String(tier || '')
        .trim()
        .toUpperCase();

    return TIER_NAMES.includes(normalizedTier)
        ? normalizedTier
        : 'F';
}

function createGameCard(game) {
    const card = document.createElement('article');

    card.className = 'game-card';
    card.classList.add(PREVIEW_CLOSED_CLASS);

    const name = game['Name'] || 'Без названия';
    const cover = game['Cover'] || '';
    const steamLink = game['Steam Link'] || '';
    const video = game['Video'] || '';
    const description = game['Description'] || '';
    const comment = game['Comment'] || '';

    const gameTags = getGameTags(game);
    const steamImage = getSteamImage(steamLink);
    const imageUrl = cover || steamImage;

    setupCardHover(card);
    setupCardSteamLink(card, steamLink, name);

    if (imageUrl) {
        card.appendChild(
            createGameCover(
                imageUrl,
                cover,
                steamImage,
                name
            )
        );
    }

    card.appendChild(createGameTitle(name));

    if (gameTags.length > 0) {
        card.appendChild(createGameTagsElement(gameTags));
    }

    if (description) {
        card.appendChild(
            createTextElement(
                'game-description',
                description
            )
        );
    }

    if (comment) {
        card.appendChild(
            createTextElement(
                'game-comment',
                comment
            )
        );
    }

    if (steamLink || video) {
        card.appendChild(
            createPreviewPopup({
                name,
                cover,
                steamLink,
                video,
                steamImage
            })
        );
    }

    return card;
}

function setupCardHover(card) {
    card.addEventListener('mouseenter', () => {
        card.classList.remove(PREVIEW_CLOSED_CLASS);
        setTierRowActive(card, true);

        requestAnimationFrame(() => {
            positionPreview(card);
        });
    });

    card.addEventListener('mouseleave', () => {
        card.classList.add(PREVIEW_CLOSED_CLASS);
        setTierRowActive(card, false);
        resetPreviewPosition(card);
    });

    card.addEventListener('focusin', () => {
        card.classList.remove(PREVIEW_CLOSED_CLASS);
        setTierRowActive(card, true);

        requestAnimationFrame(() => {
            positionPreview(card);
        });
    });

    card.addEventListener('focusout', event => {
        if (!card.contains(event.relatedTarget)) {
            card.classList.add(PREVIEW_CLOSED_CLASS);
            setTierRowActive(card, false);
            resetPreviewPosition(card);
        }
    });
}
function positionPreview(card) {
    const popup = card.querySelector('.game-preview-popup');

    if (!popup) {
        return;
    }

    popup.classList.remove(
        'preview-position-right',
        'preview-position-left',
        'preview-position-bottom'
    );

    const cardRect = card.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const edgeOffset = 8;
    const popupGap = 10;

    const fitsAbove =
        cardRect.top - popupRect.height - popupGap >= edgeOffset;

    const fitsRight =
        cardRect.right + popupRect.width + popupGap <=
        viewportWidth - edgeOffset;

    const fitsLeft =
        cardRect.left - popupRect.width - popupGap >= edgeOffset;

    const fitsBelow =
        cardRect.bottom + popupRect.height + popupGap <=
        viewportHeight - edgeOffset;

    if (fitsAbove) {
        return;
    }

    if (fitsRight) {
        popup.classList.add('preview-position-right');
        return;
    }

    if (fitsLeft) {
        popup.classList.add('preview-position-left');
        return;
    }

    if (fitsBelow) {
        popup.classList.add('preview-position-bottom');
    }
}

function resetPreviewPosition(card) {
    const popup = card.querySelector('.game-preview-popup');

    if (!popup) {
        return;
    }

    popup.classList.remove(
        'preview-position-right',
        'preview-position-left',
        'preview-position-bottom'
    );
}

function setTierRowActive(card, isActive) {
    const tierRow = card.closest('.tier-row');

    if (!tierRow) {
        return;
    }

    tierRow.classList.toggle(ACTIVE_ROW_CLASS, isActive);
}

function setupCardSteamLink(card, steamLink, name) {
    if (!steamLink) {
        return;
    }

    card.classList.add('game-card-clickable');

    card.setAttribute('role', 'link');
    card.setAttribute('tabindex', '0');
    card.setAttribute(
        'aria-label',
        `Открыть страницу игры ${name} в Steam`
    );

    card.addEventListener('click', event => {
        if (event.target.closest('.game-preview-popup')) {
            return;
        }

        closeAllPreviews();
        openExternalLink(steamLink);
    });

    card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }

        if (event.target.closest('.game-preview-popup')) {
            return;
        }

        event.preventDefault();

        closeAllPreviews();
        openExternalLink(steamLink);
    });
}

function createGameCover(
    imageUrl,
    cover,
    steamImage,
    name
) {
    const image = document.createElement('img');

    image.className = 'game-cover';
    image.src = imageUrl;
    image.alt = name;
    image.loading = 'lazy';

    image.addEventListener('error', () => {
        console.warn(
            `Не удалось загрузить обложку игры: ${name}`
        );

        if (
            cover &&
            steamImage &&
            image.src !== steamImage
        ) {
            image.src = steamImage;
        } else {
            image.remove();
        }
    });

    return image;
}

function createGameTitle(name) {
    const title = document.createElement('h3');

    title.className = 'game-title';
    title.textContent = name;

    return title;
}

function createGameTagsElement(tags) {
    const tagsContainer = document.createElement('div');

    tagsContainer.className = 'game-tags';

    tags.forEach(tag => {
        const tagElement = document.createElement('span');

        tagElement.className = 'game-tag';
        tagElement.textContent = tag;

        tagsContainer.appendChild(tagElement);
    });

    return tagsContainer;
}

function createTextElement(className, text) {
    const element = document.createElement('p');

    element.className = className;
    element.textContent = text;

    return element;
}

function createPreviewPopup({
    name,
    cover,
    steamLink,
    video,
    steamImage
}) {
    const popup = document.createElement('div');

    popup.className = 'game-preview-popup';

    popup.addEventListener('click', event => {
        event.stopPropagation();
        closeAllPreviews();
    });

    popup.addEventListener('keydown', event => {
        event.stopPropagation();
    });

    if (steamLink) {
        popup.appendChild(
            createSteamPreview({
                name,
                cover,
                steamLink,
                steamImage
            })
        );
    }

    if (video) {
        popup.appendChild(
            createVideoPreview(name, video)
        );
    }

    return popup;
}

function createSteamPreview({
    name,
    cover,
    steamLink,
    steamImage
}) {
    const preview = document.createElement('a');

    preview.className = 'preview-link';
    preview.href = steamLink;
    preview.target = '_blank';
    preview.rel = 'noopener noreferrer';
    preview.title = `Открыть ${name} в Steam`;

    const image = document.createElement('img');

    image.className = 'preview-image';
    image.src = cover || steamImage;
    image.alt = `${name} — страница в Steam`;
    image.loading = 'lazy';

    image.addEventListener('error', () => {
        if (
            cover &&
            steamImage &&
            image.src !== steamImage
        ) {
            image.src = steamImage;
        }
    });

    const label = document.createElement('span');

    label.className = 'preview-label';
    label.textContent = 'Открыть в Steam';

    preview.appendChild(image);
    preview.appendChild(label);

    return preview;
}

function createVideoPreview(name, video) {
    const preview = document.createElement('a');

    preview.className = 'preview-link';
    preview.href = video;
    preview.target = '_blank';
    preview.rel = 'noopener noreferrer';
    preview.title = `Смотреть обзор игры ${name}`;

    const thumbnail = getYouTubeThumbnail(video);

    if (thumbnail) {
        const image = document.createElement('img');

        image.className = 'preview-image';
        image.src = thumbnail;
        image.alt = `${name} — видеообзор`;
        image.loading = 'lazy';

        preview.appendChild(image);
    } else {
        const placeholder = document.createElement('div');

        placeholder.className =
            'preview-image preview-image-placeholder';

        placeholder.textContent = '▶';

        preview.appendChild(placeholder);
    }

    const label = document.createElement('span');

    label.className = 'preview-label';
    label.textContent = 'Смотреть обзор';

    preview.appendChild(label);

    return preview;
}

function closeAllPreviews() {
    document
        .querySelectorAll('.game-card')
        .forEach(card => {
            card.classList.add(PREVIEW_CLOSED_CLASS);
        });

    document
        .querySelectorAll(`.${ACTIVE_ROW_CLASS}`)
        .forEach(tierRow => {
            tierRow.classList.remove(ACTIVE_ROW_CLASS);
        });
}

function renderSelectedVideo(selectedVideoTitle) {
    const panel = document.querySelector(
        '#selected-video-panel'
    );

    if (!panel) {
        return;
    }

    panel.innerHTML = '';

    if (!selectedVideoTitle) {
        panel.classList.remove('is-visible');
        panel.setAttribute('aria-hidden', 'true');

        return;
    }

    const game = games.find(item => {
        const videoTitle = String(
            item['Video Title'] || ''
        ).trim();

        return videoTitle === selectedVideoTitle;
    });

    if (!game) {
        panel.classList.remove('is-visible');
        panel.setAttribute('aria-hidden', 'true');

        return;
    }

    const videoUrl = String(game['Video'] || '').trim();

    if (!videoUrl) {
        panel.classList.remove('is-visible');
        panel.setAttribute('aria-hidden', 'true');

        return;
    }

    const videoThumbnail = getYouTubeThumbnail(videoUrl);

    const title = document.createElement('h2');

    title.className = 'selected-video-title';
    title.textContent = selectedVideoTitle;

    const link = document.createElement('a');

    link.className = 'selected-video-link';
    link.href = videoUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = 'Открыть видео на YouTube';

    if (videoThumbnail) {
        const image = document.createElement('img');

        image.className = 'selected-video-image';
        image.src = videoThumbnail;
        image.alt = selectedVideoTitle;
        image.loading = 'lazy';

        link.appendChild(image);
    } else {
        const placeholder = document.createElement('div');

        placeholder.className =
            'selected-video-placeholder';

        placeholder.textContent = '▶';

        link.appendChild(placeholder);
    }

    const caption = document.createElement('span');

    caption.className = 'selected-video-caption';
    caption.textContent = 'Открыть видео на YouTube';

    link.appendChild(caption);

    panel.appendChild(title);
    panel.appendChild(link);

    panel.classList.add('is-visible');
    panel.setAttribute('aria-hidden', 'false');
}

function getYouTubeThumbnail(videoUrl) {
    const videoId = getYouTubeVideoId(videoUrl);

    if (!videoId) {
        return '';
    }

    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function getYouTubeVideoId(videoUrl) {
    const url = String(videoUrl || '').trim();

    const patterns = [
        /youtube\.com\/watch\?[^#]*v=([a-zA-Z0-9_-]+)/i,
        /youtu\.be\/([a-zA-Z0-9_-]+)/i,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);

        if (match) {
            return match[1];
        }
    }

    return '';
}

function getSteamImage(steamLink) {
    const match = String(steamLink || '').match(
        /(?:store\.steampowered\.com|steamcommunity\.com)\/app\/(\d+)/i
    );

    if (!match) {
        return '';
    }

    const appId = match[1];

    return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

function openExternalLink(url) {
    const newWindow = window.open(
        url,
        '_blank',
        'noopener,noreferrer'
    );

    if (newWindow) {
        newWindow.opener = null;
    }
}

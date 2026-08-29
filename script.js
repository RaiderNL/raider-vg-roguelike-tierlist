const SHEET_ID = '1WOZWwc-DohQsz6wwEOOF7xaVv2Y2MHCi_4kOq7yOK1s';
const SHEET_GID = '0';

const SHEET_URL =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

const TIER_NAMES = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];
const HIDDEN_PREVIEW_CLASS = 'preview-closed';
const ACTIVE_ROW_CLASS = 'tier-row-active';

let games = [];

document.addEventListener('DOMContentLoaded', init);

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        closeAllPreviews();
    }
});

window.addEventListener('pageshow', closeAllPreviews);

function init() {
    const searchInput = document.querySelector('#search');
    const tagFilter = document.querySelector('#tag-filter');

    if (searchInput) {
        searchInput.addEventListener('input', renderGames);
    }

    if (tagFilter) {
        tagFilter.addEventListener('change', renderGames);
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

    tagFilter.innerHTML = '<option value="">Все жанры</option>';

    tags.forEach(tag => {
        const option = document.createElement('option');

        option.value = tag;
        option.textContent = tag;

        tagFilter.appendChild(option);
    });
}

function renderGames() {
    clearTierContainers();

    const searchValue = getSearchValue();
    const selectedTag = getSelectedTag();

    const filteredGames = games
        .filter(game =>
            gameMatchesFilters(
                game,
                searchValue,
                selectedTag
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

function gameMatchesFilters(game, searchValue, selectedTag) {
    const name = String(game['Name'] || '')
        .trim()
        .toLowerCase();

    const gameTags = getGameTags(game);

    const matchesSearch = name.includes(searchValue);

    const matchesTag =
        selectedTag === '' ||
        gameTags.includes(selectedTag);

    return matchesSearch && matchesTag;
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
        card.classList.remove(HIDDEN_PREVIEW_CLASS);
        setTierRowActive(card, true);
    });

    card.addEventListener('mouseleave', () => {
        card.classList.add(HIDDEN_PREVIEW_CLASS);
        setTierRowActive(card, false);
    });

    card.addEventListener('focusin', () => {
        card.classList.remove(HIDDEN_PREVIEW_CLASS);
        setTierRowActive(card, true);
    });

    card.addEventListener('focusout', event => {
        if (!card.contains(event.relatedTarget)) {
            card.classList.add(HIDDEN_PREVIEW_CLASS);
            setTierRowActive(card, false);
        }
    });
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

    card.addEventListener('click', () => {
        closeAllPreviews();
        openExternalLink(steamLink);
    });

    card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') {
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
            card.classList.add(HIDDEN_PREVIEW_CLASS);
        });

    document
        .querySelectorAll(`.${ACTIVE_ROW_CLASS}`)
        .forEach(tierRow => {
            tierRow.classList.remove(ACTIVE_ROW_CLASS);
        });
}

function getYouTubeThumbnail(videoUrl) {
    const url = String(videoUrl || '').trim();

    const videoId = getYouTubeVideoId(url);

    if (!videoId) {
        return '';
    }

    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function getYouTubeVideoId(videoUrl) {
    const patterns = [
        /youtube\.com\/watch\?[^#]*v=([a-zA-Z0-9_-]+)/i,
        /youtu\.be\/([a-zA-Z0-9_-]+)/i,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i
    ];

    for (const pattern of patterns) {
        const match = videoUrl.match(pattern);

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

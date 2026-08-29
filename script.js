const SHEET_ID = '1WOZWwc-DohQsz6wwEOOF7xaVv2Y2MHCi_4kOq7yOK1s';
const SHEET_GID = '0';

const SHEET_URL =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

const tierNames = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];

let games = [];

document.addEventListener('DOMContentLoaded', () => {
    loadGames();

    const searchInput = document.querySelector('#search');
    const tagFilter = document.querySelector('#tag-filter');

    if (searchInput) {
        searchInput.addEventListener('input', renderGames);
    }

    if (tagFilter) {
        tagFilter.addEventListener('change', renderGames);
    }
});

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

        const tierList = document.querySelector('.tier-list');

        if (tierList) {
            tierList.innerHTML = `
                <p class="loading-error">
                    Не удалось загрузить данные из Google Sheets.
                </p>
            `;
        }
    }
}

function parseCSV(text) {
    const rows = [];
    let row = [];
    let value = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const character = text[i];
        const nextCharacter = text[i + 1];

        if (
            character === '"' &&
            insideQuotes &&
            nextCharacter === '"'
        ) {
            value += '"';
            i++;
        } else if (character === '"') {
            insideQuotes = !insideQuotes;
        } else if (character === ',' && !insideQuotes) {
            row.push(value.trim());
            value = '';
        } else if (
            (character === '\n' || character === '\r') &&
            !insideQuotes
        ) {
            if (character === '\r' && nextCharacter === '\n') {
                i++;
            }

            row.push(value.trim());
            value = '';

            if (row.some(cell => cell !== '')) {
                rows.push(row);
            }

            row = [];
        } else {
            value += character;
        }
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
    tierNames.forEach(tier => {
        const container = document.querySelector(`#tier-${tier}`);

        if (container) {
            container.innerHTML = '';
        }
    });

    const searchInput = document.querySelector('#search');
    const tagFilter = document.querySelector('#tag-filter');

    const searchValue = searchInput
        ? searchInput.value.trim().toLowerCase()
        : '';

    const selectedTag = tagFilter
        ? tagFilter.value
        : '';

    const filteredGames = games.filter(game => {
        const name = String(game['Name'] || '')
            .trim()
            .toLowerCase();

        const gameTags = getGameTags(game);

        const matchesSearch = name.includes(searchValue);

        const matchesTag =
            selectedTag === '' ||
            gameTags.includes(selectedTag);

        return matchesSearch && matchesTag;
    });

    filteredGames.sort((firstGame, secondGame) => {
        const firstOrder =
            Number(firstGame['Order']) || 999999;

        const secondOrder =
            Number(secondGame['Order']) || 999999;

        return firstOrder - secondOrder;
    });

    filteredGames.forEach(game => {
        const tier = normalizeTier(game['Tier']);
        const container = document.querySelector(`#tier-${tier}`);

        if (container) {
            container.appendChild(createGameCard(game));
        }
    });
}

function normalizeTier(tier) {
    const normalizedTier = String(tier || '')
        .trim()
        .toUpperCase();

    return tierNames.includes(normalizedTier)
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

    card.addEventListener('mouseenter', () => {
        card.classList.remove('preview-closed');
    
        const tierRow = card.closest('.tier-row');
    
        if (tierRow) {
            tierRow.classList.add('tier-row-active');
        }
    });
    
    card.addEventListener('mouseleave', () => {
        card.classList.add('preview-closed');
    
        const tierRow = card.closest('.tier-row');
    
        if (tierRow) {
            tierRow.classList.remove('tier-row-active');
        }
    });



    if (steamLink) {
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
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
    
            closeAllPreviews();
            openExternalLink(steamLink);
        }
    });


    }

    if (imageUrl) {
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

        card.appendChild(image);
    }

    const title = document.createElement('h3');

    title.className = 'game-title';
    title.textContent = name;

    card.appendChild(title);

    if (gameTags.length > 0) {
        const tagsContainer = document.createElement('div');

        tagsContainer.className = 'game-tags';

        gameTags.forEach(tag => {
            const tagElement = document.createElement('span');

            tagElement.className = 'game-tag';
            tagElement.textContent = tag;

            tagsContainer.appendChild(tagElement);
        });

        card.appendChild(tagsContainer);
    }

    if (description) {
        const descriptionElement = document.createElement('p');

        descriptionElement.className = 'game-description';
        descriptionElement.textContent = description;

        card.appendChild(descriptionElement);
    }

    if (comment) {
        const commentElement = document.createElement('p');

        commentElement.className = 'game-comment';
        commentElement.textContent = comment;

        card.appendChild(commentElement);
    }

    if (steamLink || video) {
        const previewPopup = createPreviewPopup({
            name,
            cover,
            steamLink,
            video,
            steamImage
        });

        card.appendChild(previewPopup);
    }

    return card;
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
    
        const card = popup.closest('.game-card');
    
        if (card) {
            card.classList.add('preview-closed');
        }
    });


    popup.addEventListener('keydown', event => {
        event.stopPropagation();
    });

    if (steamLink) {
        const steamPreview = document.createElement('a');

        steamPreview.className = 'preview-link';
        steamPreview.href = steamLink;
        steamPreview.target = '_blank';
        steamPreview.rel = 'noopener noreferrer';
        steamPreview.title = `Открыть ${name} в Steam`;

        const steamImageElement = document.createElement('img');

        steamImageElement.className = 'preview-image';
        steamImageElement.src = cover || steamImage;
        steamImageElement.alt = `${name} — страница в Steam`;
        steamImageElement.loading = 'lazy';

        steamImageElement.addEventListener('error', () => {
            if (
                cover &&
                steamImage &&
                steamImageElement.src !== steamImage
            ) {
                steamImageElement.src = steamImage;
            }
        });

        const steamLabel = document.createElement('span');

        steamLabel.className = 'preview-label';
        steamLabel.textContent = 'Открыть в Steam';

        steamPreview.appendChild(steamImageElement);
        steamPreview.appendChild(steamLabel);

        popup.appendChild(steamPreview);
    }

    if (video) {
        const videoThumbnail = getYouTubeThumbnail(video);
        const videoPreview = document.createElement('a');

        videoPreview.className = 'preview-link';
        videoPreview.href = video;
        videoPreview.target = '_blank';
        videoPreview.rel = 'noopener noreferrer';
        videoPreview.title = `Смотреть обзор игры ${name}`;

        if (videoThumbnail) {
            const videoImage = document.createElement('img');

            videoImage.className = 'preview-image';
            videoImage.src = videoThumbnail;
            videoImage.alt = `${name} — видеообзор`;
            videoImage.loading = 'lazy';

            videoPreview.appendChild(videoImage);
        } else {
            const videoPlaceholder = document.createElement('div');

            videoPlaceholder.className =
                'preview-image preview-image-placeholder';

            videoPlaceholder.textContent = '▶';

            videoPreview.appendChild(videoPlaceholder);
        }

        const videoLabel = document.createElement('span');

        videoLabel.className = 'preview-label';
        videoLabel.textContent = 'Смотреть обзор';

        videoPreview.appendChild(videoLabel);

        popup.appendChild(videoPreview);
    }

    return popup;
}

function closeAllPreviews() {
    document
        .querySelectorAll('.game-card.preview-closed')
        .forEach(card => {
            card.classList.remove('preview-closed');
        });

    document
        .querySelectorAll('.game-card')
        .forEach(card => {
            card.classList.add('preview-closed');
        });

    document
        .querySelectorAll('.tier-row-active')
        .forEach(tierRow => {
            tierRow.classList.remove('tier-row-active');
        });
}

function getYouTubeThumbnail(videoUrl) {
    const url = String(videoUrl || '').trim();

    const matches = [
        url.match(
            /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/i
        ),
        url.match(
            /youtu\.be\/([a-zA-Z0-9_-]+)/i
        ),
        url.match(
            /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i
        ),
        url.match(
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i
        )
    ];

    const videoId = matches.find(match => match)?.[1];

    if (!videoId) {
        return '';
    }

    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
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

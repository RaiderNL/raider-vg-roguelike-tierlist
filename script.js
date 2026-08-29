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

    searchInput.addEventListener('input', renderGames);
    tagFilter.addEventListener('change', renderGames);
});

async function loadGames() {
    try {
        const response = await fetch(SHEET_URL);

        if (!response.ok) {
            throw new Error(`Ошибка загрузки таблицы: ${response.status}`);
        }

        const csvText = await response.text();

        games = parseCSV(csvText);

        fillTagFilter();
        renderGames();
    } catch (error) {
        console.error(error);

        document.querySelector('.tier-list').innerHTML = `
            <p class="loading-error">
                Не удалось загрузить данные из Google Sheets.
            </p>
        `;
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

        if (character === '"' && insideQuotes && nextCharacter === '"') {
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
        rows.push(row);
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

function fillTagFilter() {
    const tagFilter = document.querySelector('#tag-filter');

    const tags = [
        ...new Set(
            games
                .map(game => game['Tag'])
                .filter(tag => tag.trim() !== '')
        )
    ].sort();

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

    const searchValue = document
        .querySelector('#search')
        .value
        .trim()
        .toLowerCase();

    const selectedTag = document.querySelector('#tag-filter').value;

    const filteredGames = games.filter(game => {
        const name = (game['Name'] || '').toLowerCase();
        const tag = game['Tag'] || '';

        const matchesSearch = name.includes(searchValue);
        const matchesTag =
            selectedTag === '' || tag === selectedTag;

        return matchesSearch && matchesTag;
    });

    filteredGames.sort((firstGame, secondGame) => {
        const firstOrder = Number(firstGame['Order']) || 999999;
        const secondOrder = Number(secondGame['Order']) || 999999;

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
    const video = game['Video'] || '';
    const steamLink = game['Steam Link'] || '';
    const tag = game['Tag'] || '';
    const description = game['Description'] || '';
    const comment = game['Comment'] || '';

    const steamImage = getSteamImage(steamLink);
    const imageUrl = cover || steamImage;

    if (imageUrl) {
        const image = document.createElement('img');

        image.className = 'game-cover';
        image.src = imageUrl;
        image.alt = name;
        image.loading = 'lazy';

        image.addEventListener('error', () => {
            if (cover && steamImage && image.src !== steamImage) {
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

    if (tag) {
        const tagElement = document.createElement('div');

        tagElement.className = 'game-tag';
        tagElement.textContent = tag;

        card.appendChild(tagElement);
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

    const links = document.createElement('div');
    links.className = 'game-links';

    if (video) {
        links.appendChild(createLink(video, 'Видео'));
    }

    if (steamLink) {
        links.appendChild(createLink(steamLink, 'Steam'));
    }

    if (links.children.length > 0) {
        card.appendChild(links);
    }

    return card;
}

function createLink(url, text) {
    const link = document.createElement('a');

    link.href = url;
    link.textContent = text;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    return link;
}

function getSteamImage(steamLink) {
    const match = String(steamLink || '').match(/\/app\/(\d+)/i);

    if (!match) {
        return '';
    }

    const appId = match[1];

    return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

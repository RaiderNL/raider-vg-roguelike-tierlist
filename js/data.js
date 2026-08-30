import {
    SHEET_URL,
    TIER_NAMES
} from './config.js';


export async function loadGames() {
    const response = await fetch(SHEET_URL);

    if (!response.ok) {
        throw new Error(
            `Ошибка загрузки таблицы: ${response.status}`
        );
    }

    const csvText = await response.text();

    return parseCSV(csvText);
}


export function parseCSV(text) {
    /*
     * Удаляем BOM в начале CSV-файла.
     * Без этого первый заголовок может прочитаться
     * как "\uFEFFName", и game['Name'] не сработает.
     */
    text = String(text || '')
        .replace(/^\uFEFF/, '');

    const rows = [];
    let row = [];
    let value = '';
    let insideQuotes = false;

    for (
        let index = 0;
        index < text.length;
        index++
    ) {
        const character = text[index];
        const nextCharacter = text[index + 1];

        /*
         * Две кавычки внутри значения считаются
         * одной обычной кавычкой.
         */
        if (
            character === '"' &&
            insideQuotes &&
            nextCharacter === '"'
        ) {
            value += '"';
            index++;

            continue;
        }

        /*
         * Открытие или закрытие значения
         * в кавычках.
         */
        if (character === '"') {
            insideQuotes = !insideQuotes;

            continue;
        }

        /*
         * Запятая разделяет ячейки только
         * за пределами кавычек.
         */
        if (
            character === ',' &&
            !insideQuotes
        ) {
            row.push(value.trim());
            value = '';

            continue;
        }

        /*
         * Перенос строки завершает текущую строку
         * только за пределами кавычек.
         */
        if (
            (
                character === '\n' ||
                character === '\r'
            ) &&
            !insideQuotes
        ) {
            /*
             * Обрабатываем Windows-перенос строки:
             * \r\n считается одним переносом.
             */
            if (
                character === '\r' &&
                nextCharacter === '\n'
            ) {
                index++;
            }

            row.push(value.trim());
            value = '';

            /*
             * Не добавляем полностью пустые строки.
             */
            if (
                row.some(cell => cell !== '')
            ) {
                rows.push(row);
            }

            row = [];

            continue;
        }

        value += character;
    }

    /*
     * Обрабатываем последнюю строку CSV,
     * если файл не заканчивается переносом строки.
     */
    if (
        value.length > 0 ||
        row.length > 0
    ) {
        row.push(value.trim());

        if (
            row.some(cell => cell !== '')
        ) {
            rows.push(row);
        }
    }

    if (rows.length === 0) {
        return [];
    }

    /*
     * Первая строка CSV содержит заголовки
     * столбцов Google Sheets.
     */
    const headers = rows[0].map(header =>
        header.trim()
    );

    /*
     * Каждую последующую строку превращаем
     * в объект одной игры.
     */
    return rows.slice(1).map(columns => {
        const game = {};

        headers.forEach((header, index) => {
            game[header] = columns[index] || '';
        });

        return game;
    });
}


export function getGameTags(game) {
    return String(game['Tag'] || '')
        .split(/[,;|/]+/)
        .map(tag => tag.trim())
        .filter(Boolean);
}


export function normalizeTier(tier) {
    const normalizedTier = String(tier || '')
        .trim()
        .toUpperCase();

    return TIER_NAMES.includes(normalizedTier)
        ? normalizedTier
        : 'F';
}


export function compareGamesByOrder(
    firstGame,
    secondGame
) {
    const firstOrder =
        Number(firstGame['Order']) || 999999;

    const secondOrder =
        Number(secondGame['Order']) || 999999;

    return firstOrder - secondOrder;
}


export function getSteamImage(steamLink) {
    const match = String(steamLink || '').match(
        /(?:store\.steampowered\.com|steamcommunity\.com)\/app\/(\d+)/i
    );

    if (!match) {
        return '';
    }

    const appId = match[1];

    return (
        'https://cdn.cloudflare.steamstatic.com/' +
        `steam/apps/${appId}/header.jpg`
    );
}

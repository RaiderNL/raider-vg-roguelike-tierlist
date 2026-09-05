import {
    SHEET_URL,
    TIER_NAMES
} from './config.js';


export async function loadGames() {
    const response =
        await fetch(
            SHEET_URL
        );

    if (!response.ok) {
        throw new Error(
            `Ошибка загрузки таблицы: ${response.status}`
        );
    }

    const csvText =
        await response.text();

    return parseCSV(
        csvText
    );
}


export function parseCSV(
    text
) {
    /*
     * Удаляем BOM в начале CSV-файла.
     */
    text =
        String(
            text || ''
        ).replace(
            /^\uFEFF/,
            ''
        );

    const rows = [];
    let row = [];
    let value = '';
    let insideQuotes = false;

    for (
        let index = 0;
        index < text.length;
        index++
    ) {
        const character =
            text[index];

        const nextCharacter =
            text[index + 1];

        /*
         * Две кавычки внутри значения
         * считаются одной кавычкой.
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
        if (
            character === '"'
        ) {
            insideQuotes =
                !insideQuotes;

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
            row.push(
                value.trim()
            );

            value = '';

            continue;
        }

        /*
         * Перенос строки завершает строку только
         * за пределами кавычек.
         */
        if (
            (
                character === '\n' ||
                character === '\r'
            ) &&
            !insideQuotes
        ) {
            /*
             * Windows-перенос строки:
             * \r\n считается одним переносом.
             */
            if (
                character === '\r' &&
                nextCharacter === '\n'
            ) {
                index++;
            }

            row.push(
                value.trim()
            );

            value = '';

            /*
             * Не добавляем полностью пустые строки.
             */
            if (
                row.some(
                    cell => cell !== ''
                )
            ) {
                rows.push(
                    row
                );
            }

            row = [];

            continue;
        }

        value += character;
    }

    /*
     * Обрабатываем последнюю строку CSV,
     * если файл не заканчивается переносом.
     */
    if (
        value.length > 0 ||
        row.length > 0
    ) {
        row.push(
            value.trim()
        );

        if (
            row.some(
                cell => cell !== ''
            )
        ) {
            rows.push(
                row
            );
        }
    }

    if (
        rows.length === 0
    ) {
        return [];
    }

    /*
     * Первая строка содержит заголовки.
     */
    const headers =
        rows[0].map(
            header =>
                header.trim()
        );

    /*
     * Создаём объект для каждой игры.
     */
    return rows
        .slice(1)
        .map(columns => {
            const game = {};

            headers.forEach(
                (header, index) => {
                    game[header] =
                        columns[index] || '';
                }
            );

            return game;
        });
}


export function getGameTags(
    game
) {
    return String(
        game['Tag'] || ''
    )
        .split(
            /[,;|/]+/
        )
        .map(
            tag => tag.trim()
        )
        .filter(
            Boolean
        );
}


export function normalizeTier(
    tier
) {
    const normalizedTier =
        String(
            tier || ''
        )
            .trim()
            .toUpperCase();

    return TIER_NAMES.includes(
        normalizedTier
    )
        ? normalizedTier
        : 'F';
}


export function compareGamesByOrder(
    firstGame,
    secondGame
) {
    const firstOrder =
        Number(
            firstGame['Order']
        ) || 999999;

    const secondOrder =
        Number(
            secondGame['Order']
        ) || 999999;

    const orderDifference =
        firstOrder -
        secondOrder;

    if (
        orderDifference !== 0
    ) {
        return orderDifference;
    }

    /*
     * Если в таблице случайно встретятся
     * одинаковые Order, порядок всё равно
     * останется стабильным и понятным.
     */
    return String(
        firstGame['Name'] || ''
    ).localeCompare(
        String(
            secondGame['Name'] || ''
        ),
        'ru'
    );
}


/*
 * Возвращает ссылку на видео.
 *
 * Основное поле:
 * Video Type
 *
 * Video используется как запасной вариант
 * для совместимости со старыми данными.
 */
export function getVideoUrl(
    game
) {
    return String(
        game?.['Video Type'] ||
        game?.['Video'] ||
        ''
    ).trim();
}


/*
 * Возвращает базовое название видео.
 *
 * Основное поле:
 * Title
 *
 * Video Title используется как запасной вариант
 * для совместимости со старыми данными.
 */
export function getVideoTitle(
    game
) {
    return String(
        game?.['Title'] ||
        game?.['Video Title'] ||
        ''
    ).trim();
}


/*
 * Возвращает номер выпуска.
 */
export function getVideoNumber(
    game
) {
    const value =
        String(
            game?.['Video Number'] || ''
        ).trim();

    const match =
        value.match(
            /\d+(?:[.,]\d+)*/
        );

    if (
        !match
    ) {
        return null;
    }

    const number =
        Number(
            match[0].replace(
                ',',
                '.'
            )
        );

    return Number.isFinite(
        number
    )
        ? number
        : null;
}


/*
 * Возвращает отображаемое название видео.
 */
export function getVideoLabel(
    game,
    latestVideoNumber
) {
    const title =
        getVideoTitle(
            game
        );

    const videoNumber =
        getVideoNumber(
            game
        );

    const isLatest =
        videoNumber !== null &&
        videoNumber === latestVideoNumber;

    const prefix =
        isLatest
            ? '🔥 NEW 🔥'
            : videoNumber !== null
                ? String(videoNumber)
                : 'Без номера';

    return title
        ? `${prefix} ${title}`
        : prefix;
}



export function getSteamImage(
    steamLink
) {
    const match =
        String(
            steamLink || ''
        ).match(
            /(?:store\.steampowered\.com|steamcommunity\.com)\/app\/(\d+)/i
        );

    if (
        !match
    ) {
        return '';
    }

    const appId =
        match[1];

    return (
        'https://cdn.cloudflare.steamstatic.com/' +
        `steam/apps/${appId}/header.jpg`
    );
}

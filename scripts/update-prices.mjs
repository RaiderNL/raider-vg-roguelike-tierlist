import fs from 'node:fs/promises';

const SHEET_ID =
    '1WOZWwc-DohQsz6wwEOOF7xaVv2Y2MHCi_4kOq7yOK1s';

const SHEET_GID =
    '0';

const SHEET_URL =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

const STEAM_API_URL =
    'https://store.steampowered.com/api/appdetails';

const REQUEST_DELAY =
    1000;

const PRICES_FILE =
    './prices.json';


async function main() {
    const csvResponse =
        await fetch(
            SHEET_URL
        );


    if (!csvResponse.ok) {
        throw new Error(
            `Ошибка загрузки Google Sheets: ${csvResponse.status}`
        );
    }


    const csvText =
        await csvResponse.text();


    const games =
        parseCsv(
            csvText
        );


    const appIds =
        games
            .map(game => {
                return getSteamAppId(
                    game['Steam Link']
                );
            })
            .filter(Boolean);


    const uniqueAppIds =
        [...new Set(appIds)];


    const prices =
        {};


    for (
        let index = 0;
        index < uniqueAppIds.length;
        index++
    ) {
        const appId =
            uniqueAppIds[index];


        console.log(
            `Загрузка ${index + 1}/${uniqueAppIds.length}: ${appId}`
        );


        const priceData =
            await fetchSteamPrice(
                appId
            );


        prices[appId] =
            priceData;


        if (
            index < uniqueAppIds.length - 1
        ) {
            await wait(
                REQUEST_DELAY
            );
        }
    }


    await fs.writeFile(
        PRICES_FILE,
        JSON.stringify(
            {
                updatedAt:
                    new Date().toISOString(),

                prices:
                    prices
            },
            null,
            2
        ) + '\n'
    );


    console.log(
        `Файл ${PRICES_FILE} обновлён. Игр: ${uniqueAppIds.length}`
    );
}


async function fetchSteamPrice(
    appId
) {
    const url =
        `${STEAM_API_URL}?appids=${appId}&cc=ru&l=russian`;


    try {
        const response =
            await fetch(
                url,
                {
                    headers: {
                        'User-Agent':
                            'Mozilla/5.0'
                    }
                }
            );


        if (!response.ok) {
            console.warn(
                `Steam вернул ${response.status} для ${appId}`
            );


            return {
                available:
                    false,

                error:
                    `HTTP ${response.status}`
            };
        }


        const result =
            await response.json();


        const appResult =
            result?.[appId];


        if (
            !appResult?.success ||
            !appResult?.data
        ) {
            return {
                available:
                    false,

                error:
                    'Данные игры недоступны'
            };
        }


        const gameData =
            appResult.data;


        if (
            gameData.is_free
        ) {
            return {
                available:
                    true,

                finalFormatted:
                    'Бесплатно',

                initialFormatted:
                    '',

                discountPercent:
                    0
            };
        }


        const overview =
            gameData.price_overview;


        if (
            !overview
        ) {
            return {
                available:
                    false,

                error:
                    'Цена отсутствует'
            };
        }


        return {
            available:
                true,

            finalFormatted:
                overview.final_formatted ||
                '',

            initialFormatted:
                overview.initial_formatted ||
                '',

            discountPercent:
                Number(
                    overview.discount_percent
                ) || 0
        };
    } catch (error) {
        return {
            available:
                false,

            error:
                error.message
        };
    }
}


function getSteamAppId(
    steamLink
) {
    const link =
        String(
            steamLink || ''
        ).trim();


    const match =
        link.match(
            /(?:store\.steampowered\.com|steamcommunity\.com)\/app\/(\d+)/i
        );


    return match
        ? match[1]
        : null;
}


function parseCsv(
    csv
) {
    const rows =
        csv
            .trim()
            .split(/\r?\n/)
            .map(line => parseCsvLine(line));


    if (
        rows.length === 0
    ) {
        return [];
    }


    const headers =
        rows.shift();


    return rows.map(row => {
        const game =
            {};


        headers.forEach((header, index) => {
            game[header] =
                row[index] || '';
        });


        return game;
    });
}


function parseCsvLine(
    line
) {
    const values =
        [];


    let value =
        '';

    let insideQuotes =
        false;


    for (
        let index = 0;
        index < line.length;
        index++
    ) {
        const character =
            line[index];


        if (
            character === '"'
        ) {
            if (
                insideQuotes &&
                line[index + 1] === '"'
            ) {
                value +=
                    '"';

                index++;

                continue;
            }


            insideQuotes =
                !insideQuotes;

            continue;
        }


        if (
            character === ',' &&
            !insideQuotes
        ) {
            values.push(
                value
            );

            value =
                '';

            continue;
        }


        value +=
            character;
    }


    values.push(
        value
    );


    return values;
}


function wait(
    milliseconds
) {
    return new Promise(resolve => {
        setTimeout(
            resolve,
            milliseconds
        );
    });
}


main().catch(error => {
    console.error(
        error
    );

    process.exit(
        1
    );
});

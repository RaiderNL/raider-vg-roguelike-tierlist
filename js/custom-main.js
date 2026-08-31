import {
    loadGames,
    getGameTags
} from './data.js';

import {
    createGameCard
} from './cards.js';

import {
    CUSTOM_TIER_NAMES,
    getGameId,
    getStartLayout,
    saveLocalLayout,
    createInitialLayout,
    createShareUrl
} from './custom-tierlist.js';


let games = [];
let currentLayout = null;
let isSharedLayout = false;


const tierContainers = {};


document.addEventListener(
    'DOMContentLoaded',
    init
);


async function init() {
    cacheTierContainers();

    setupControls();

    try {
        games =
            await loadGames();

        fillTagFilter();

        const startData =
            getStartLayout(
                games
            );

        currentLayout =
            startData.layout;

        isSharedLayout =
            startData.isShared;

        updateSharedNotice();

        renderCustomTierList();
    } catch (
        error
    ) {
        console.error(
            'Ошибка загрузки игр:',
            error
        );

        showLoadingError();
    }
}


/*
 * Запоминаем контейнеры уровней.
 */
function cacheTierContainers() {
    CUSTOM_TIER_NAMES.forEach(
        tier => {
            tierContainers[tier] =
                document.querySelector(
                    `#custom-tier-${tier}`
                );
        }
    );
}


/*
 * Подключаем элементы управления.
 */
function setupControls() {
    const searchInput =
        document.querySelector(
            '#custom-search'
        );

    const tagFilter =
        document.querySelector(
            '#custom-tag-filter'
        );

    const saveButton =
        document.querySelector(
            '#save-custom-tierlist'
        );

    const shareButton =
        document.querySelector(
            '#share-custom-tierlist'
        );

    const resetButton =
        document.querySelector(
            '#reset-custom-tierlist'
        );

    const saveSharedButton =
        document.querySelector(
            '#save-shared-tierlist'
        );


    searchInput?.addEventListener(
        'input',
        renderCustomTierList
    );

    tagFilter?.addEventListener(
        'change',
        renderCustomTierList
    );

    saveButton?.addEventListener(
        'click',
        saveCurrentLayout
    );

    shareButton?.addEventListener(
        'click',
        shareCurrentLayout
    );

    resetButton?.addEventListener(
        'click',
        resetCurrentLayout
    );

    saveSharedButton?.addEventListener(
        'click',
        saveSharedLayout
    );
}


/*
 * Заполняем фильтр жанров.
 */
function fillTagFilter() {
    const tagFilter =
        document.querySelector(
            '#custom-tag-filter'
        );

    if (
        !tagFilter
    ) {
        return;
    }

    const tags =
        [
            ...new Set(
                games.flatMap(
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

    tagFilter.replaceChildren();

    tagFilter.appendChild(
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


/*
 * Отрисовываем карточки
 * в соответствии с текущей структурой.
 */
function renderCustomTierList() {
    if (
        !currentLayout
    ) {
        return;
    }

    clearTierContainers();

    const searchValue =
        getSearchValue();

    const selectedTag =
        getSelectedTag();

    let visibleGamesCount =
        0;


    CUSTOM_TIER_NAMES.forEach(
        tier => {
            const container =
                tierContainers[tier];

            if (
                !container
            ) {
                return;
            }

            const gameIds =
                currentLayout[tier] || [];

            gameIds.forEach(
                gameId => {
                    const game =
                        games.find(
                            item =>
                                getGameId(
                                    item
                                ) === gameId
                        );

                    if (
                        !game ||
                        !gameMatchesFilters(
                            game,
                            searchValue,
                            selectedTag
                        )
                    ) {
                        return;
                    }

                    container.appendChild(
                        createGameCard(
                            game
                        )
                    );

                    visibleGamesCount++;
                }
            );
        }
    );

    updateEmptyMessage(
        visibleGamesCount
    );
}


/*
 * Очищаем все зоны перед новой отрисовкой.
 */
function clearTierContainers() {
    CUSTOM_TIER_NAMES.forEach(
        tier => {
            const container =
                tierContainers[tier];

            container?.replaceChildren();
        }
    );
}


/*
 * Проверяет фильтры карточки.
 */
function gameMatchesFilters(
    game,
    searchValue,
    selectedTag
) {
    const name =
        String(
            game?.['Name'] || ''
        )
            .trim()
            .toLowerCase();

    const matchesSearch =
        name.includes(
            searchValue
        );

    const matchesTag =
        !selectedTag ||
        getGameTags(
            game
        ).includes(
            selectedTag
        );

    return (
        matchesSearch &&
        matchesTag
    );
}


function getSearchValue() {
    const input =
        document.querySelector(
            '#custom-search'
        );

    return input
        ? input.value
            .trim()
            .toLowerCase()
        : '';
}


function getSelectedTag() {
    const select =
        document.querySelector(
            '#custom-tag-filter'
        );

    return select
        ? select.value
        : '';
}


/*
 * Показываем сообщение,
 * если фильтры ничего не нашли.
 */
function updateEmptyMessage(
    visibleGamesCount
) {
    const emptyMessage =
        document.querySelector(
            '#custom-empty-message'
        );

    if (
        !emptyMessage
    ) {
        return;
    }

    emptyMessage.hidden =
        visibleGamesCount > 0;
}


/*
 * Обновляем уведомление
 * о просмотре чужой версии.
 */
function updateSharedNotice() {
    const notice =
        document.querySelector(
            '#custom-shared-notice'
        );

    const title =
        document.querySelector(
            '#custom-mode-title'
        );

    const status =
        document.querySelector(
            '#custom-mode-status'
        );

    const description =
        document.querySelector(
            '#custom-page-description'
        );

    if (
        notice
    ) {
        notice.hidden =
            !isSharedLayout;
    }

    if (
        isSharedLayout
    ) {
        if (
            title
        ) {
            title.textContent =
                'Просмотр чужого тир-листа';
        }

        if (
            status
        ) {
            status.textContent =
                'Эта версия не изменяет ваш локальный список';
        }

        if (
            description
        ) {
            description.textContent =
                'Пользовательская версия тир-листа из ссылки';
        }

        return;
    }

    if (
        title
    ) {
        title.textContent =
            'Создание собственного тир-листа';
    }

    if (
        status
    ) {
        status.textContent =
            'Перетащите игры в нужные уровни';
    }

    if (
        description
    ) {
        description.textContent =
            'Соберите собственную версию тир-листа';
    }
}


/*
 * Сохраняем текущую структуру локально.
 */
function saveCurrentLayout() {
    if (
        !currentLayout
    ) {
        return;
    }

    saveLocalLayout(
        currentLayout
    );

    isSharedLayout =
        false;

    updateSharedNotice();

    showStatus(
        'Ваш тир-лист сохранён'
    );
}


/*
 * Сохраняем чужую версию
 * как собственную.
 */
function saveSharedLayout() {
    if (
        !currentLayout
    ) {
        return;
    }

    saveLocalLayout(
        currentLayout
    );

    isSharedLayout =
        false;

    updateSharedNotice();

    showStatus(
        'Версия сохранена как ваша'
    );
}


/*
 * Создаём ссылку на текущую структуру.
 */
async function shareCurrentLayout() {
    if (
        !currentLayout
    ) {
        return;
    }

    const shareUrl =
        createShareUrl(
            currentLayout
        );

    try {
        await copyText(
            shareUrl
        );

        showStatus(
            'Ссылка скопирована'
        );
    } catch (
        error
    ) {
        console.warn(
            'Не удалось скопировать ссылку:',
            error
        );

        showStatus(
            'Не удалось скопировать ссылку'
        );
    }
}


/*
 * Сбрасываем текущую версию.
 *
 * В режиме чужой ссылки локальное
 * избранное и сохранение не изменяются.
 */
function resetCurrentLayout() {
    if (
        !games.length
    ) {
        return;
    }

    const confirmed =
        window.confirm(
            'Вернуть все игры в состояние «Не распределены»?'
        );

    if (
        !confirmed
    ) {
        return;
    }

    currentLayout =
        createInitialLayout(
            games
        );

    renderCustomTierList();

    showStatus(
        'Изменения сброшены'
    );
}


/*
 * Копирование текста с запасным вариантом
 * для браузеров без Clipboard API.
 */
async function copyText(
    text
) {
    if (
        navigator.clipboard &&
        window.isSecureContext
    ) {
        await navigator.clipboard.writeText(
            text
        );

        return;
    }

    const textarea =
        document.createElement(
            'textarea'
        );

    textarea.value =
        text;

    textarea.style.position =
        'fixed';

    textarea.style.opacity =
        '0';

    document.body.appendChild(
        textarea
    );

    textarea.focus();
    textarea.select();

    const copied =
        document.execCommand(
            'copy'
        );

    textarea.remove();

    if (
        !copied
    ) {
        throw new Error(
            'Копирование не поддерживается'
        );
    }
}


/*
 * Показываем временный статус
 * в заголовке страницы.
 */
function showStatus(
    message
) {
    const status =
        document.querySelector(
            '#custom-mode-status'
        );

    if (
        !status
    ) {
        return;
    }

    const originalText =
        isSharedLayout
            ? 'Эта версия не изменяет ваш локальный список'
            : 'Перетащите игры в нужные уровни';

    status.textContent =
        message;

    setTimeout(
        () => {
            status.textContent =
                originalText;
        },
        1800
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


function showLoadingError() {
    const tierList =
        document.querySelector(
            '.custom-tier-list'
        );

    if (
        !tierList
    ) {
        return;
    }

    tierList.innerHTML = `
        <p class="loading-error">
            Не удалось загрузить данные из Google Sheets.
        </p>
    `;
}

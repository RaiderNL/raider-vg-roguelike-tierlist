import {
    loadGames,
    getGameTags
} from './data.js';

import {
    createGameCard
} from './cards.js';

import {
    CUSTOM_TIER_NAMES,
    REMOVED_TIER_NAME,
    getGameId,
    getStartLayout,
    saveLocalLayout,
    createInitialLayout,
    createShareUrl
} from './custom-tierlist.js';

import {
    setupCustomDragAndDrop
} from './custom-dnd.js';


let games = [];
let currentLayout = null;
let isSharedLayout = false;
let currentMode = 'edit';

let dragAndDropInitialized = false;


const tierContainers = {};


document.addEventListener(
    'DOMContentLoaded',
    init
);


async function init() {
    cacheTierContainers();

    setupModeSwitcher();
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

        /*
         * Чужая версия открывается
         * сразу в режиме просмотра.
         */
        currentMode =
            isSharedLayout
                ? 'view'
                : 'edit';

        updateInterface();

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
 * Кэшируем все контейнеры:
 *
 * UNRANKED — нераспределённые игры;
 * S–F — уровни тир-листа;
 * REMOVED — удалённые игры.
 */
function cacheTierContainers() {
    [
        ...CUSTOM_TIER_NAMES,
        REMOVED_TIER_NAME
    ].forEach(
        tier => {
            tierContainers[tier] =
                document.querySelector(
                    `[data-tier-container="${tier}"]`
                );
        }
    );
}


/*
 * Настраиваем переключатель режимов.
 */
function setupModeSwitcher() {
    const modeButtons =
        document.querySelectorAll(
            '[data-custom-mode]'
        );

    modeButtons.forEach(
        button => {
            button.addEventListener(
                'click',
                () => {
                    const mode =
                        button.dataset.customMode;

                    if (
                        mode !== 'edit' &&
                        mode !== 'view'
                    ) {
                        return;
                    }

                    setCustomMode(
                        mode
                    );
                }
            );
        }
    );
}


/*
 * Переключает режим страницы.
 */
function setCustomMode(
    mode
) {
    currentMode =
        mode === 'view'
            ? 'view'
            : 'edit';

    updateInterface();

    renderCustomTierList();
}


/*
 * Обновляет классы body,
 * кнопки и видимость блоков.
 */
function updateInterface() {
    const isEditMode =
        currentMode === 'edit';

    const editModeButton =
        document.querySelector(
            '#custom-edit-mode-button'
        );

    const viewModeButton =
        document.querySelector(
            '#custom-view-mode-button'
        );

    const editActions =
        document.querySelector(
            '#custom-edit-actions'
        );

    const viewActions =
        document.querySelector(
            '#custom-view-actions'
        );

    const editControls =
        document.querySelector(
            '#custom-edit-controls'
        );

    const editorContent =
        document.querySelector(
            '#custom-editor-content'
        );

    const sharedNotice =
        document.querySelector(
            '#custom-shared-notice'
        );

    const saveSharedButton =
        document.querySelector(
            '#save-shared-tierlist'
        );

    document.body.classList.toggle(
        'custom-mode-edit',
        isEditMode
    );

    document.body.classList.toggle(
        'custom-mode-view',
        !isEditMode
    );


    editModeButton?.classList.toggle(
        'is-active',
        isEditMode
    );

    viewModeButton?.classList.toggle(
        'is-active',
        !isEditMode
    );

    editModeButton?.setAttribute(
        'aria-pressed',
        String(
            isEditMode
        )
    );

    viewModeButton?.setAttribute(
        'aria-pressed',
        String(
            !isEditMode
        )
    );


    if (
        editActions
    ) {
        editActions.hidden =
            !isEditMode;
    }

    if (
        viewActions
    ) {
        viewActions.hidden =
            isEditMode;
    }

    if (
        editControls
    ) {
        editControls.hidden =
            !isEditMode;
    }

    if (
        editorContent
    ) {
        editorContent.hidden =
            false;
    }


    if (
        sharedNotice
    ) {
        sharedNotice.hidden =
            !isSharedLayout;
    }

    if (
        saveSharedButton
    ) {
        saveSharedButton.hidden =
            !isSharedLayout;
    }

    updateModeTexts();
}


/*
 * Обновляет заголовки и описания
 * в зависимости от режима.
 */
function updateModeTexts() {
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
        currentMode === 'view'
    ) {
        if (
            title
        ) {
            title.textContent =
                isSharedLayout
                    ? 'Просмотр чужого тир-листа'
                    : 'Просмотр собственного тир-листа';
        }

        if (
            status
        ) {
            status.textContent =
                isSharedLayout
                    ? 'Это готовая версия из ссылки'
                    : 'Режим просмотра без редактирования';
        }

        if (
            description
        ) {
            description.textContent =
                'Готовая пользовательская версия тир-листа';
        }

        return;
    }

    if (
        title
    ) {
        title.textContent =
            isSharedLayout
                ? 'Редактирование копии тир-листа'
                : 'Создание собственного тир-листа';
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
 * Подключаем фильтры и кнопки.
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
 * Отрисовываем все группы игр.
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


    [
        ...CUSTOM_TIER_NAMES,
        REMOVED_TIER_NAME
    ].forEach(
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

                    const card =
                        createGameCard(
                            game
                        );

                    card.dataset.gameId =
                        gameId;

                    /*
                     * В режиме просмотра карточки
                     * не должны быть перетаскиваемыми.
                     */
                    card.draggable =
                        currentMode === 'edit';

                    if (
                        currentMode === 'view'
                    ) {
                        card.classList.add(
                            'custom-card-view-only'
                        );
                    }

                    container.appendChild(
                        card
                    );

                    visibleGamesCount++;
                }
            );
        }
    );

    updateEmptyMessage(
        visibleGamesCount
    );

    updateRemovedCounters();

    /*
     * Drag-and-drop подключается
     * только в режиме редактирования.
     */
    if (
        currentMode === 'edit'
    ) {
        setupCustomDragAndDrop({
            getLayout: () =>
                currentLayout,

                        onLayoutChange:
                updatedLayout => {
                    currentLayout =
                        updatedLayout;
            
                    renderCustomTierList();
            
                    updateRemovedCounters();
            
                    showStatus(
                        'Порядок игр обновлён'
                    );
                }

        });

        dragAndDropInitialized =
            true;
    }
}


/*
 * Очищаем контейнеры перед отрисовкой.
 */
function clearTierContainers() {
    [
        ...CUSTOM_TIER_NAMES,
        REMOVED_TIER_NAME
    ].forEach(
        tier => {
            const container =
                tierContainers[tier];

            container?.replaceChildren();
        }
    );
}


/*
 * Обновляем счётчики корзины.
 */
function updateRemovedCounters() {
    const removedCount =
        currentLayout?.[REMOVED_TIER_NAME]
            ?.length || 0;

    const trashCount =
        document.querySelector(
            '#custom-trash-count'
        );

    const removedGamesCount =
        document.querySelector(
            '#custom-removed-games-count'
        );

    if (
        trashCount
    ) {
        trashCount.textContent =
            String(
                removedCount
            );
    }

    if (
        removedGamesCount
    ) {
        removedGamesCount.textContent =
            String(
                removedCount
            );
    }
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
 * Сообщение об отсутствии игр.
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
 * Сохраняем текущую структуру.
 */
function saveCurrentLayout() {
    if (
        !currentLayout
    ) {
        return;
    }

    const saved =
        saveLocalLayout(
            currentLayout
        );

    if (
        !saved
    ) {
        showStatus(
            'Не удалось сохранить тир-лист'
        );

        return;
    }

    isSharedLayout =
        false;

    removeLayoutFromCurrentUrl();

    updateInterface();

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

    const saved =
        saveLocalLayout(
            currentLayout
        );

    if (
        !saved
    ) {
        showStatus(
            'Не удалось сохранить тир-лист'
        );

        return;
    }

    isSharedLayout =
        false;

    removeLayoutFromCurrentUrl();

    updateInterface();

    showStatus(
        'Версия сохранена как ваша'
    );
}


/*
 * Формируем ссылку на текущий тир-лист.
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
 * Возвращает все игры в UNRANKED.
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
 * Удаляет параметр чужой версии
 * из текущего URL.
 */
function removeLayoutFromCurrentUrl() {
    const url =
        new URL(
            window.location.href
        );

    url.searchParams.delete(
        'layout'
    );

    window.history.replaceState(
        {},
        '',
        url
    );
}


/*
 * Показывает временный статус.
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

    status.textContent =
        message;

    window.clearTimeout(
        showStatus.timer
    );

    showStatus.timer =
        window.setTimeout(
            () => {
                updateModeTexts();
            },
            1800
        );
}


/*
 * Копирование текста.
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

    textarea.style.top =
        '0';

    textarea.style.left =
        '0';

    textarea.style.width =
        '1px';

    textarea.style.height =
        '1px';

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

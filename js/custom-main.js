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

const tierContainers = {};


document.addEventListener(
    'DOMContentLoaded',
    init
);


async function init() {
    cacheTierContainers();
    setupModeSwitcher();
    setupControls();
    setupRemovedGamesToggle();

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
 * Находит контейнеры UNRANKED, S-F и REMOVED.
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
 * Кнопки «Редактирование» и «Просмотр».
 */
function setupModeSwitcher() {
    document
        .querySelectorAll(
            '[data-custom-mode]'
        )
        .forEach(
            button => {
                button.addEventListener(
                    'click',
                    () => {
                        setCustomMode(
                            button.dataset.customMode
                        );
                    }
                );
            }
        );
}


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
 * Обновляет видимые кнопки и состояние режима.
 * Тиры не скрываются ни в одном режиме.
 */
function updateInterface() {
    const isEditMode =
        currentMode === 'edit';

    document.body.classList.toggle(
        'custom-mode-edit',
        isEditMode
    );

    document.body.classList.toggle(
        'custom-mode-view',
        !isEditMode
    );

    updateModeButton(
        '#custom-edit-mode-button',
        isEditMode
    );

    updateModeButton(
        '#custom-view-mode-button',
        !isEditMode
    );

    setHidden(
        '#custom-edit-controls',
        !isEditMode
    );

    setHidden(
        '#custom-edit-actions',
        !isEditMode
    );

    setHidden(
        '#custom-view-actions',
        isEditMode
    );

    setHidden(
        '#custom-shared-notice',
        !isSharedLayout
    );

    setHidden(
        '#save-shared-tierlist',
        !isSharedLayout
    );

    /*
     * Кнопка копирования доступна в просмотре
     * и для собственной, и для общей версии.
     */
    setHidden(
        '#share-custom-tierlist-view',
        false
    );

    updateModeTexts();
}


function updateModeButton(
    selector,
    isActive
) {
    const button =
        document.querySelector(
            selector
        );

    if (
        !button
    ) {
        return;
    }

    button.classList.toggle(
        'is-active',
        isActive
    );

    button.setAttribute(
        'aria-pressed',
        String(
            isActive
        )
    );
}


function setHidden(
    selector,
    isHidden
) {
    const element =
        document.querySelector(
            selector
        );

    if (
        element
    ) {
        element.hidden =
            isHidden;
    }
}


function updateModeTexts() {
    const title =
        document.querySelector(
            '#custom-mode-title'
        );

    const description =
        document.querySelector(
            '#custom-page-description'
        );

    const status =
        document.querySelector(
            '#custom-mode-status'
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
            description
        ) {
            description.textContent =
                'Готовая пользовательская версия тир-листа';
        }

        if (
            status
        ) {
            status.textContent =
                'Режим просмотра без редактирования';
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
        description
    ) {
        description.textContent =
            'Соберите собственную версию тир-листа';
    }

    if (
        status
    ) {
        status.textContent =
            'Перетащите игры в нужные уровни';
    }
}


/*
 * Фильтры, сохранение, сброс и создание ссылок.
 */
function setupControls() {
    document
        .querySelector(
            '#custom-search'
        )
        ?.addEventListener(
            'input',
            renderCustomTierList
        );

    document
        .querySelector(
            '#custom-tag-filter'
        )
        ?.addEventListener(
            'change',
            renderCustomTierList
        );

    document
        .querySelector(
            '#save-custom-tierlist'
        )
        ?.addEventListener(
            'click',
            saveCurrentLayout
        );

    document
        .querySelector(
            '#share-custom-tierlist'
        )
        ?.addEventListener(
            'click',
            shareCurrentLayout
        );

    document
        .querySelector(
            '#share-custom-tierlist-view'
        )
        ?.addEventListener(
            'click',
            shareCurrentLayout
        );

    document
        .querySelector(
            '#reset-custom-tierlist'
        )
        ?.addEventListener(
            'click',
            resetCurrentLayout
        );

    document
        .querySelector(
            '#save-shared-tierlist'
        )
        ?.addEventListener(
            'click',
            saveSharedLayout
        );
}


/*
 * Раскрывает и скрывает карточки из REMOVED.
 */
function setupRemovedGamesToggle() {
    const toggleButton =
        document.querySelector(
            '#custom-removed-games-toggle'
        );

    const removedContainer =
        document.querySelector(
            '#custom-removed-games-container'
        );

    if (
        !toggleButton ||
        !removedContainer
    ) {
        return;
    }

    toggleButton.addEventListener(
        'click',
        () => {
            const isExpanded =
                toggleButton.getAttribute(
                    'aria-expanded'
                ) === 'true';

            toggleButton.setAttribute(
                'aria-expanded',
                String(
                    !isExpanded
                )
            );

            removedContainer.hidden =
                isExpanded;

            updateRemovedCounters();
        }
    );
}


/*
 * Заполняет жанры данными Google Sheets.
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
        ]
            .filter(
                Boolean
            )
            .sort(
                (
                    firstTag,
                    secondTag
                ) =>
                    firstTag.localeCompare(
                        secondTag,
                        'ru'
                    )
            );

    tagFilter.replaceChildren(
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
 * Рисует карточки во всех контейнерах.
 */
function renderCustomTierList() {
    if (
        !currentLayout
    ) {
        return;
    }

    clearTierContainers();

    const gameById =
        new Map(
            games.map(
                game => [
                    getGameId(
                        game
                    ),
                    game
                ]
            )
        );

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
                        gameById.get(
                            gameId
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

    if (
        currentMode === 'edit'
    ) {
        setupCustomDragAndDrop({
            getLayout: () =>
                currentLayout,

            onLayoutChange: updatedLayout => {
                currentLayout =
                    updatedLayout;

                renderCustomTierList();

                showStatus(
                    'Порядок игр обновлён'
                );
            }
        });
    }
}


function clearTierContainers() {
    [
        ...CUSTOM_TIER_NAMES,
        REMOVED_TIER_NAME
    ].forEach(
        tier => {
            tierContainers[tier]?.replaceChildren();
        }
    );
}


/*
 * Счётчики UNRANKED, корзины и подпись скрытых игр.
 */
function updateRemovedCounters() {
    const unrankedCount =
        currentLayout?.UNRANKED?.length || 0;

    const removedCount =
        currentLayout?.[REMOVED_TIER_NAME]
            ?.length || 0;

    setText(
        '#custom-unranked-count',
        unrankedCount
    );

    setText(
        '#custom-trash-count',
        removedCount
    );

    setText(
        '#custom-removed-games-count',
        removedCount
    );

    const toggleButton =
        document.querySelector(
            '#custom-removed-games-toggle'
        );

    if (
        !toggleButton
    ) {
        return;
    }

    const isExpanded =
        toggleButton.getAttribute(
            'aria-expanded'
        ) === 'true';

    if (
        removedCount === 0
    ) {
        toggleButton.textContent =
            'Скрытые игры отсутствуют';

        return;
    }

    toggleButton.textContent =
        isExpanded
            ? 'Скрыть скрытые игры'
            : `Показать скрытые игры (${removedCount})`;
}


function setText(
    selector,
    value
) {
    const element =
        document.querySelector(
            selector
        );

    if (
        element
    ) {
        element.textContent =
            String(
                value
            );
    }
}


function gameMatchesFilters(
    game,
    searchValue,
    selectedTag
) {
    const name =
        String(
            game?.Name || ''
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


function updateEmptyMessage(
    visibleGamesCount
) {
    const emptyMessage =
        document.querySelector(
            '#custom-empty-message'
        );

    if (
        emptyMessage
    ) {
        emptyMessage.hidden =
            visibleGamesCount > 0;
    }
}


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


function saveSharedLayout() {
    saveCurrentLayout();

    if (
        !isSharedLayout
    ) {
        setCustomMode(
            'edit'
        );

        showStatus(
            'Версия сохранена как ваша'
        );
    }
}


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
            updateModeTexts,
            1800
        );
}


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

    tierList.replaceChildren(
        Object.assign(
            document.createElement(
                'p'
            ),
            {
                className: 'loading-error',
                textContent:
                    'Не удалось загрузить данные из Google Sheets.'
            }
        )
    );
}

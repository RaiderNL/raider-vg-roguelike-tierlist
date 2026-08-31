import {
    loadGames,
    getGameTags,
    getVideoUrl,
    getVideoTitle,
    getVideoNumber,
    getVideoLabel
} from './data.js';
import {
    isFavoritesFilterActive,
    getActiveFavoriteIds,
    setFavoritesFilter
} from './favorites.js';
import {
    setPriceMode
} from './steam-price.js';

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
    setupCustomDragAndDrop,
    animateCustomLayoutChange
} from './custom-dnd.js';
import {
    closeAllPreviews
} from './previews.js';


let games = [];
let currentLayout = null;
let isSharedLayout = false;
let currentMode = 'edit';

const tierContainers = {};


document.addEventListener(
    'DOMContentLoaded',
    init
);
window.addEventListener(
    'favoriteschange',
    () => {
        renderCustomTierList();
    }
);
function setCustomFiltersFromUrl() {
    const url =
        new URL(
            window.location.href
        );

const searchInput =
    document.querySelector(
        '#custom-search'
    );



    const tagFilter =
        document.querySelector(
            '#custom-tag-filter'
        );

    const videoFilter =
        document.querySelector(
            '#custom-video-filter'
        );

    if (
        searchInput
    ) {
        searchInput.value =
            url.searchParams.get(
                'search'
            ) || '';
    }

    if (
        tagFilter
    ) {
        tagFilter.value =
            url.searchParams.get(
                'tag'
            ) || '';
    }

    if (
        videoFilter
    ) {
        videoFilter.value =
            url.searchParams.get(
                'video'
            ) || '';
    }
}
function updateCustomUrlFromFilters() {
    const url =
        new URL(
            window.location.href
        );

    const searchValue =
        getSearchValue();

    const selectedTag =
        getSelectedTag();

    const selectedVideo =
        getSelectedVideo();

    updateUrlParameter(
        url,
        'search',
        searchValue
    );

    updateUrlParameter(
        url,
        'tag',
        selectedTag
    );

    updateUrlParameter(
        url,
        'video',
        selectedVideo
    );

    window.history.replaceState(
        {},
        '',
        url
    );
}


function updateUrlParameter(
    url,
    parameter,
    value
) {
    if (
        value
    ) {
        url.searchParams.set(
            parameter,
            value
        );

        return;
    }

    url.searchParams.delete(
        parameter
    );
}

function resetCustomFilters() {
    const searchInput =
        document.querySelector(
            '#custom-search'
        );

    const tagFilter =
        document.querySelector(
            '#custom-tag-filter'
        );

    const videoFilter =
        document.querySelector(
            '#custom-video-filter'
        );

    if (
        searchInput
    ) {
        searchInput.value =
            '';
    }

    if (
        tagFilter
    ) {
        tagFilter.value =
            '';
    }

    if (
        videoFilter
    ) {
        videoFilter.value =
            '';
    }

    setFavoritesFilter(
        false
    );

    renderCustomTierList();
}

/*
 * =========================================================
 * Инициализация страницы
 * =========================================================
 */

async function init() {
    cacheTierContainers();
    setupModeSwitcher();
    setupControls();
    setupRemovedGamesToggle();

    try {
        games =
            await loadGames();

        fillTagFilter();
        fillVideoFilter();
setCustomFiltersFromUrl();


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
 * =========================================================
 * Кэширование контейнеров
 * =========================================================
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
 * =========================================================
 * Переключение режима
 * =========================================================
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

    /*
 * Фильтры доступны и при редактировании,
 * и при просмотре.
 */
    setHidden(
        '#custom-edit-controls',
        false
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
     * Кнопка копирования доступна
     * в обоих режимах.
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
 * =========================================================
 * Фильтры и кнопки действий
 * =========================================================
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
    document
    .querySelector(
        '#custom-video-filter'
    )
    ?.addEventListener(
        'change',
        renderCustomTierList
    );
    document
    .querySelector(
        '#download-custom-screenshot'
    )
    ?.addEventListener(
        'click',
        downloadCustomScreenshot
    );


document
    .querySelector(
        '#custom-favorites-filter'
    )
    ?.addEventListener(
        'click',
        () => {
            const isActive =
                isFavoritesFilterActive();

            setFavoritesFilter(
                !isActive
            );

            renderCustomTierList();
        }
    );

document
    .querySelector(
        '#custom-price-mode-toggle'
    )
    ?.addEventListener(
        'change',
        event => {
            setPriceMode(
                event.target.checked
            );
        }
    );

document
    .querySelector(
        '#custom-reset-filters'
    )
    ?.addEventListener(
        'click',
        resetCustomFilters
    );

}


/*
 * =========================================================
 * Переключатель скрытых игр
 * =========================================================
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
 * =========================================================
 * Фильтр жанров
 * =========================================================
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

function fillVideoFilter() {
    const videoFilter =
        document.querySelector(
            '#custom-video-filter'
        );

    if (
        !videoFilter
    ) {
        return;
    }

    const videoMap =
        new Map();

    games.forEach(
        game => {
            const videoUrl =
                getVideoUrl(
                    game
                );

            if (
                !videoUrl ||
                videoMap.has(
                    videoUrl
                )
            ) {
                return;
            }

            videoMap.set(
                videoUrl,
                game
            );
        }
    );

    const videos =
        [...videoMap.entries()]
            .map(
                ([
                    videoUrl,
                    game
                ]) => ({
                    videoUrl,
                    game,
                    videoNumber:
                        getVideoNumber(
                            game
                        )
                })
            );

    const numberedVideos =
        videos
            .map(
                video =>
                    video.videoNumber
            )
            .filter(
                Number.isFinite
            );

    const latestVideoNumber =
        numberedVideos.length > 0
            ? Math.max(
                ...numberedVideos
            )
            : null;

    videos.sort(
        (
            firstVideo,
            secondVideo
        ) => (
            (
                secondVideo.videoNumber ??
                -Infinity
            ) -
            (
                firstVideo.videoNumber ??
                -Infinity
            )
        )
    );

    videoFilter.replaceChildren(
        createOption(
            '',
            'Все ролики'
        )
    );

    videos.forEach(
        video => {
            videoFilter.appendChild(
                createOption(
                    video.videoUrl,
                    getVideoLabel(
                        video.game,
                        latestVideoNumber
                    )
                )
            );
        }
    );
}

/*
 * =========================================================
 * Рендер тир-листа
 * =========================================================
 */

function renderCustomTierList(
    transitionInfo = null
) {
    if (
        !transitionInfo?.animate
    ) {
        renderCustomTierListNow(
            transitionInfo
        );

        return;
    }

    const editorContent =
        document.querySelector(
            '#custom-editor-content'
        );

    if (
        !editorContent
    ) {
        renderCustomTierListNow(
            transitionInfo
        );

        return;
    }

    animateCustomLayoutChange(
        editorContent,
        () => {
            renderCustomTierListNow(
                transitionInfo
            );
        }
    );
}


function renderCustomTierListNow(
    transitionInfo = null
) {
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
    const selectedVideo =
    getSelectedVideo();

const favoritesFilterActive =
    isFavoritesFilterActive();

const activeFavoriteIds =
    getActiveFavoriteIds();


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
                            selectedTag,
                            selectedVideo,
                            favoritesFilterActive,
                            activeFavoriteIds
                        )
                    ) {
                        return;
                    }


                   const card =
                        createGameCard(
                            game,
                            {
                                videoFilterActive:
                                    selectedVideo !== '',
                    
                                showFavorite: true,
                                showInfo: true,
                    
                                openOnCardClick:
                                    currentMode === 'view'
                            }
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

                    /*
                     * Добавляем класс только карточке,
                     * которая была перемещена.
                     */
                    if (
                        transitionInfo?.gameId &&
                        String(
                            transitionInfo.gameId
                        ) === String(
                            gameId
                        )
                    ) {
                        prepareCardEnterAnimation(
                            card
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
    updateCustomFavoritesFilterState();
    updateCustomUrlFromFilters();


    if (
        currentMode === 'edit'
    ) {
        setupCustomDragAndDrop({
            getLayout: () =>
                currentLayout,

            onLayoutChange: (
                updatedLayout,
                transitionInfo
            ) => {
                currentLayout =
                    updatedLayout;

                renderCustomTierList({
                    animate: true,
                    gameId:
                        transitionInfo?.gameId || null,
                    targetTier:
                        transitionInfo?.targetTier || null
                });

                showStatus(
                    'Порядок игр обновлён'
                );
            }
        });
    }
}


function prepareCardEnterAnimation(
    card
) {
    card.classList.add(
        'custom-card-enter'
    );

    requestAnimationFrame(
        () => {
            card.classList.add(
                'custom-card-enter-active'
            );

            window.setTimeout(
                () => {
                    card.classList.remove(
                        'custom-card-enter',
                        'custom-card-enter-active'
                    );
                },
                320
            );
        }
    );
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
 * =========================================================
 * Счётчики
 * =========================================================
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
            : 'Показать скрытые игры';
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


/*
 * =========================================================
 * Фильтрация
 * =========================================================
 */

function gameMatchesFilters(
    game,
    searchValue,
    selectedTag,
    selectedVideo,
    favoritesFilterActive,
    activeFavoriteIds
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

    const matchesVideo =
        !selectedVideo ||
        getVideoUrl(
            game
        ) === selectedVideo;

    const matchesFavorites =
        !favoritesFilterActive ||
        activeFavoriteIds.has(
            String(
                game?.ID || ''
            ).trim()
        );

    return (
        matchesSearch &&
        matchesTag &&
        matchesVideo &&
        matchesFavorites
    );
}
function getSelectedVideo() {
    const select =
        document.querySelector(
            '#custom-video-filter'
        );

    return select
        ? select.value
        : '';
}
function updateCustomFavoritesFilterState() {
    const button =
        document.querySelector(
            '#custom-favorites-filter'
        );

    if (
        !button
    ) {
        return;
    }

    const isActive =
        isFavoritesFilterActive();

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

    button.setAttribute(
        'aria-label',
        isActive
            ? 'Показывать все игры'
            : 'Показывать только избранные игры'
    );

    button.title =
        isActive
            ? 'Показывать все игры'
            : 'Показывать только избранные игры';

    const icon =
        button.querySelector(
            'span'
        );

    if (
        icon
    ) {
        icon.textContent =
            isActive
                ? '★'
                : '☆';
    }
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


/*
 * =========================================================
 * Сохранение и ссылки
 * =========================================================
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


/*
 * =========================================================
 * Уведомления
 * =========================================================
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
            updateModeTexts,
            1800
        );
}


/*
 * =========================================================
 * Копирование текста
 * =========================================================
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
 * =========================================================
 * Вспомогательные функции
 * =========================================================
 */

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

async function downloadCustomScreenshot() {
    const tierList =
        document.querySelector(
            '.custom-tier-list'
        );

    if (
        !tierList
    ) {
        return;
    }

    if (
        typeof window.html2canvas !==
        'function'
    ) {
        showStatus(
            'Модуль скриншота ещё не загрузился'
        );

        return;
    }

    const button =
        document.querySelector(
            '#download-custom-screenshot'
        );

    if (
        button
    ) {
        button.disabled =
            true;

        button.textContent =
            'Создание скриншота…';
    }

    /*
     * Popup не должен попасть
     * в изображение.
     */
    closeAllPreviews();

    try {
        const canvas =
            await window.html2canvas(
                tierList,
                {
                    backgroundColor:
                        '#f3f4f6',

                    scale:
                        Math.min(
                            2,
                            window.devicePixelRatio ||
                            1
                        ),

                    useCORS:
                        true,

                    allowTaint:
                        false,

                    logging:
                        false,

                    imageTimeout:
                        15000,

                    scrollX:
                        0,

                    scrollY:
                        -window.scrollY,

                    windowWidth:
                        document.documentElement
                            .scrollWidth,

                    windowHeight:
                        document.documentElement
                            .scrollHeight
                }
            );

        const link =
            document.createElement(
                'a'
            );

        link.download =
            'my-roguelike-tierlist.png';

        link.href =
            canvas.toDataURL(
                'image/png'
            );

        link.click();

        showStatus(
            'Скриншот сохранён'
        );
    } catch (
        error
    ) {
        console.error(
            'Не удалось создать скриншот:',
            error
        );

        showStatus(
            'Не удалось создать скриншот'
        );
    } finally {
        if (
            button
        ) {
            button.disabled =
                false;

            button.textContent =
                'Скачать скриншот';
        }
    }
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

import {
    appState
} from './state.js';

import {
    loadGames,
    normalizeTier,
    compareGamesByOrder,
    getVideoUrl
} from './data.js';


import {
    fillTagFilter,
    fillVideoFilter,
    getSearchValue,
    getSelectedTag,
    getSelectedVideo,
    gameMatchesFilters,
    setFiltersFromUrl,
    updateUrlFromFilters
} from './filters.js';

import {
    isFavoritesFilterActive,
    getActiveFavoriteIds,
    getGameId,
    setFavoritesFilter,
    addFavoritesToUrl,
    hasSharedFavorites
} from './favorites.js';



import {
    createGameCard
} from './cards.js';

import {
    setPriceMode
} from './steam-price.js';

import {
    closeAllPreviews,
    updateVisiblePreviewPositions
} from './previews.js';

import {
    renderSelectedVideo
} from './video.js';

import {
    TIER_NAMES,
    VIDEO_FILTER_ACTIVE_CLASS
} from './config.js';


const SEARCH_RENDER_DELAY =
    150;
const VIDEO_PRESENTATION_INTERVAL =
    1000;

const VIDEO_PRESENTATION_ACTIVE_CLASS =
    'video-presentation-active';

const VIDEO_PRESENTATION_TIER_ACTIVE_CLASS =
    'tier-row-presentation-active';
const VIDEO_PRESENTATION_ANIMATION_CLASSES =
    [
        'presentation-animation-rise',
        'presentation-animation-drop',
        'presentation-animation-slide-left',
        'presentation-animation-slide-right',
        'presentation-animation-pop',
        'presentation-animation-tilt-left',
        'presentation-animation-tilt-right',
        'presentation-animation-flip',
        'presentation-animation-zoom',
        'presentation-animation-bounce'
    ];

const BACK_TO_TOP_VISIBLE_CLASS =
    'is-visible';

const SHARE_BUTTON_DEFAULT_LABEL =
    'Скопировать ссылку на подборку';

const SHARE_BUTTON_SUCCESS_LABEL =
    'Ссылка скопирована';

const SHARE_BUTTON_ERROR_LABEL =
    'Не удалось скопировать';


let searchRenderTimer =
    null;

let shareButtonResetTimer =
    null;
let screenshotFormatMenu =
    null;

let screenshotFormatMenuCleanup =
    null;
let videoPresentationTimer =
    null;

let videoPresentationGames =
    [];

let videoPresentationStep =
    0;

let videoPresentationVideoUrl =
    '';



const tierContainers =
    {};


document.addEventListener(
    'DOMContentLoaded',
    init
);


document.addEventListener(
    'visibilitychange',
    () => {
        if (
            document.visibilityState ===
            'visible'
        ) {
            closeAllPreviews();
        }
    }
);


window.addEventListener(
    'pageshow',
    closeAllPreviews
);


window.addEventListener(
    'resize',
    updateVisiblePreviewPositions
);


window.addEventListener(
    'scroll',
    updateVisiblePreviewPositions,
    true
);


window.addEventListener(
    'popstate',
    () => {
        setFiltersFromUrl();
        renderGames();
    }
);



function init() {
    const searchInput =
        document.querySelector(
            '#search'
        );

    const tagFilter =
        document.querySelector(
            '#tag-filter'
        );

    const videoFilter =
        document.querySelector(
            '#video-filter'
        );
    const favoritesFilter =
    document.querySelector(
        '#favorites-filter'
    );


    const priceModeToggle =
        document.querySelector(
            '#price-mode-toggle'
        );

    const resetFiltersButton =
        document.querySelector(
            '#reset-filters'
        );

    const shareFiltersButton =
        document.querySelector(
            '#share-filters'
        );

    const backToTopButton =
        document.querySelector(
            '#back-to-top'
        );


    const tierCardScaleRange =
        document.querySelector(
            '#tier-card-scale-range'
        );

    const screenshotButton =
        document.querySelector(
            '#download-tierlist-screenshot'
        );
    const videoPresentationButton =
    document.querySelector(
        '#video-presentation'
    );




    cacheTierContainers();


    if (
        searchInput
    ) {
        searchInput.addEventListener(
            'input',
            scheduleSearchRender
        );
    }


    if (
        tagFilter
    ) {
        tagFilter.addEventListener(
            'change',
            renderGames
        );
    }


    if (
        videoFilter
    ) {
        videoFilter.addEventListener(
            'change',
            renderGames
        );
    }
    videoPresentationButton?.addEventListener(
    'click',
    toggleVideoPresentation
);

    if (
    favoritesFilter
    ) {
        favoritesFilter.addEventListener(
            'click',
            () => {
                const isActive =
                    isFavoritesFilterActive();
    
                setFavoritesFilter(
                    !isActive
                );
    
                renderGames();
            }
        );
    }



    if (
        priceModeToggle
    ) {
        priceModeToggle.addEventListener(
            'change',
            event => {
                setPriceMode(
                    event.target.checked
                );
            }
        );
    }


    if (
        resetFiltersButton
    ) {
        resetFiltersButton.addEventListener(
            'click',
            resetFilters
        );
    }


    if (
        shareFiltersButton
    ) {
        shareFiltersButton.addEventListener(
            'click',
            () => {
                shareCurrentFilters(
                    shareFiltersButton
                );
            }
        );
    }


    setupMobileTierNavigation();
    window.addEventListener(
    'favoriteschange',
    () => {
        renderGames();
    }
);



    setupBackToTop(
        backToTopButton
    );
        setupTierListAppearanceControls(
        tierCardScaleRange
    );

screenshotButton?.addEventListener(
    'click',
    openTierListScreenshotDialog
);




    loadApplicationData();
}


function cacheTierContainers() {
    TIER_NAMES.forEach(
        tier => {
            tierContainers[tier] =
                document.querySelector(
                    `#tier-${tier}`
                );
        }
    );
}


async function loadApplicationData() {
    try {
        appState.games =
            await loadGames();

        fillTagFilter();
        fillVideoFilter();

        setFiltersFromUrl();

        renderGames();
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


function scheduleSearchRender() {
    if (
        searchRenderTimer
    ) {
        clearTimeout(
            searchRenderTimer
        );
    }

    searchRenderTimer =
        setTimeout(
            () => {
                renderGames();

                searchRenderTimer =
                    null;
            },
            SEARCH_RENDER_DELAY
        );
}


function renderGames() {
    /*
     * Обычная смена фильтров отменяет показ,
     * включая уже завершённую презентацию.
     */
    if (
        isVideoPresentationActive()
    ) {
        stopVideoPresentation({
            restoreRegularView:
                false
        });
    }

    closeAllPreviews();

    clearTierContainers();

    updateUrlFromFilters();

    const searchValue =
        getSearchValue();

    const selectedTag =
        getSelectedTag();

    const selectedVideo =
        getSelectedVideo();

    updateVideoFilterState(
        selectedVideo
    );

    updateFavoritesFilterState();

    updateVideoPresentationButton(
        selectedVideo
    );

    const favoritesFilterActive =
        isFavoritesFilterActive();

    const activeFavoriteIds =
        getActiveFavoriteIds();

    const filteredGames =
        appState.games
            .filter(
                game => {
                    const matchesRegularFilters =
                        gameMatchesFilters(
                            game,
                            searchValue,
                            selectedTag,
                            selectedVideo
                        );

                    const matchesFavorites =
                        !favoritesFilterActive ||
                        activeFavoriteIds.has(
                            getGameId(
                                game
                            )
                        );

                    return (
                        matchesRegularFilters &&
                        matchesFavorites
                    );
                }
            )
            .sort(
                compareGamesByOrder
            );

    filteredGames.forEach(
        game => {
            appendGameCardToTier(
                game,
                {
                    videoFilterActive:
                        selectedVideo !== ''
                }
            );
        }
    );

    renderSelectedVideo(
        appState.games,
        selectedVideo
    );
}


/*
 * =========================================================
 * Презентация вердиктов выбранного видео
 * =========================================================
 *
 * Режим предназначен для записи видео:
 * игры выбранного ролика появляются по одной,
 * в глобальном порядке из поля Order.
 */


/*
 * Добавляет карточку в её тир.
 *
 * Обычный рендер использует эту функцию без анимации.
 * Режим презентации передаёт presentationEntry: true,
 * чтобы карточка появилась с эффектом «помещения» в тир.
 */
function getRandomPresentationAnimationClass() {
    const randomIndex =
        Math.floor(
            Math.random() *
            VIDEO_PRESENTATION_ANIMATION_CLASSES.length
        );

    return VIDEO_PRESENTATION_ANIMATION_CLASSES[
        randomIndex
    ];
}

function appendGameCardToTier(
    game,
    {
        videoFilterActive = false,
        presentationEntry = false
    } = {}
) {
    const tier =
        normalizeTier(
            game['Tier']
        );

    const container =
        tierContainers[tier];

    if (
        !container
    ) {
        return null;
    }

    const card =
        createGameCard(
            game,
            {
                videoFilterActive,

                /*
                 * Во время записи не нужны звёздочка,
                 * popup и реакция карточки на клик.
                 */
                showFavorite:
                    !presentationEntry,

                openOnCardClick:
                    !presentationEntry
            }
        );

if (
    presentationEntry
) {
    card.classList.add(
        'presentation-card-entering'
    );

    card.classList.add(
        getRandomPresentationAnimationClass()
    );
}


    container.appendChild(
        card
    );

    if (
        presentationEntry
    ) {
        animatePresentationCard(
            card,
            tier
        );
    }

    return card;
}


/*
 * Запускает CSS-анимацию новой карточки и кратко
 * подсвечивает ряд, в который она была добавлена.
 */
function animatePresentationCard(
    card,
    tier
) {
    const tierRow =
        tierContainers[tier]?.closest(
            '.tier-row'
        );

    /*
     * Первый requestAnimationFrame даёт браузеру
     * применить стартовое состояние карточки.
     *
     * Второй гарантирует, что переход к анимации
     * не будет склеен с её вставкой в DOM.
     */
    requestAnimationFrame(
        () => {
            requestAnimationFrame(
                () => {
                    if (
                        !card.isConnected
                    ) {
                        return;
                    }

                    card.classList.remove(
                        'presentation-card-entering'
                    );

                    card.classList.add(
                        'presentation-card-visible'
                    );

                    if (
                        !tierRow
                    ) {
                        return;
                    }

                    tierRow.classList.remove(
                        VIDEO_PRESENTATION_TIER_ACTIVE_CLASS
                    );

                    /*
                     * Перезапускаем подсветку тира,
                     * если игры подряд попали в один
                     * и тот же уровень.
                     */
                    void tierRow.offsetWidth;

                    tierRow.classList.add(
                        VIDEO_PRESENTATION_TIER_ACTIVE_CLASS
                    );

                    window.setTimeout(
                        () => {
                            tierRow.classList.remove(
                                VIDEO_PRESENTATION_TIER_ACTIVE_CLASS
                            );
                        },
                        720
                    );
                }
            );
        }
    );
}


/*
 * Кнопка работает в двух состояниях:
 *
 * ▶ Показать тирлист — начать анимацию;
 * ■ Остановить показ — отменить её и вернуть
 * обычный интерактивный список выбранного ролика.
 */
function toggleVideoPresentation() {
    if (
        isVideoPresentationActive()
    ) {
        stopVideoPresentation({
            restoreRegularView:
                true
        });

        return;
    }

    startVideoPresentation();
}


/*
 * Запускает показ игр выбранного ролика.
 *
 * Важно: поиск, жанры и избранное намеренно
 * не учитываются. Используется только выбранный
 * URL видео и глобальный порядок Order.
 */
function startVideoPresentation() {
    const selectedVideo =
        getSelectedVideo();

    if (
        !selectedVideo
    ) {
        return;
    }

    closeAllPreviews();

    const gamesForVideo =
        appState.games
            .filter(
                game =>
                    getVideoUrl(
                        game
                    ) === selectedVideo
            )
            .sort(
                compareGamesByOrder
            );

    /*
     * На случай некорректных данных или видео,
     * в котором пока нет ни одной игры.
     */
    if (
        gamesForVideo.length === 0
    ) {
        return;
    }

    clearTierContainers();

    videoPresentationGames =
        gamesForVideo;

    videoPresentationStep =
        0;

    videoPresentationVideoUrl =
        selectedVideo;

    const layout =
        document.querySelector(
            '.tier-list-layout'
        );

    layout?.classList.add(
        VIDEO_PRESENTATION_ACTIVE_CLASS
    );

    updateVideoPresentationButton(
        selectedVideo
    );

    /*
     * Первую игру показываем мгновенно —
     * не нужно ждать одну секунду после клика.
     */
    showNextVideoPresentationGame();

    /*
     * Если ролик состоял только из одной игры,
     * showNextVideoPresentationGame() уже завершил
     * показ и запускать interval не требуется.
     */
    if (
        videoPresentationStep >=
        videoPresentationGames.length
    ) {
        finishVideoPresentation();

        return;
    }

    videoPresentationTimer =
        window.setInterval(
            showNextVideoPresentationGame,
            VIDEO_PRESENTATION_INTERVAL
        );
}


/*
 * Показывает одну следующую игру в порядке Order.
 */
function showNextVideoPresentationGame() {
    const game =
        videoPresentationGames[
            videoPresentationStep
        ];

    if (
        !game
    ) {
        finishVideoPresentation();

        return;
    }

    appendGameCardToTier(
        game,
        {
            videoFilterActive:
                true,

            presentationEntry:
                true
        }
    );

    videoPresentationStep += 1;

    if (
        videoPresentationStep >=
        videoPresentationGames.length
    ) {
        finishVideoPresentation();
    }
}


/*
 * Завершение происходит автоматически после
 * последней карточки.
 *
 * Сам режим остаётся визуально активным:
 * - справа не возвращается панель YouTube;
 * - карточки не становятся интерактивными;
 * - итоговый тирлист остаётся чистой сценой
 *   для записи или захвата в OBS.
 *
 * Кнопка остаётся «Остановить показ»: она вернёт
 * обычный вид со звёздочками, popup и панелью видео.
 */
function finishVideoPresentation() {
    if (
        videoPresentationTimer
    ) {
        window.clearInterval(
            videoPresentationTimer
        );

        videoPresentationTimer =
            null;
    }

    updateVideoPresentationButton(
        videoPresentationVideoUrl
    );
}


/*
 * Полностью завершает презентационный режим.
 *
 * restoreRegularView: true:
 * пользователь нажал Stop — нужно перерисовать
 * обычный тирлист и вернуть все его элементы.
 *
 * restoreRegularView: false:
 * renderGames() уже сам готовится нарисовать
 * новый список после смены фильтра.
 */
function stopVideoPresentation(
    {
        restoreRegularView = false
    } = {}
) {
    if (
        videoPresentationTimer
    ) {
        window.clearInterval(
            videoPresentationTimer
        );

        videoPresentationTimer =
            null;
    }

    videoPresentationGames =
        [];

    videoPresentationStep =
        0;

    videoPresentationVideoUrl =
        '';

    const layout =
        document.querySelector(
            '.tier-list-layout'
        );

    layout?.classList.remove(
        VIDEO_PRESENTATION_ACTIVE_CLASS
    );

    /*
     * Убираем возможную краткую подсветку,
     * если остановка произошла прямо во время
     * появления карточки.
     */
    document
        .querySelectorAll(
            `.${VIDEO_PRESENTATION_TIER_ACTIVE_CLASS}`
        )
        .forEach(
            tierRow => {
                tierRow.classList.remove(
                    VIDEO_PRESENTATION_TIER_ACTIVE_CLASS
                );
            }
        );

    if (
        restoreRegularView
    ) {
        renderGames();

        return;
    }

    updateVideoPresentationButton(
        getSelectedVideo()
    );
}


/*
 * Режим считается активным не только пока работает
 * таймер, но и после завершения последней игры.
 *
 * Благодаря этому готовый тирлист остаётся «чистой
 * сценой», пока пользователь сам не нажмёт Stop.
 */
function isVideoPresentationActive() {
    const layout =
        document.querySelector(
            '.tier-list-layout'
        );

    return Boolean(
        layout?.classList.contains(
            VIDEO_PRESENTATION_ACTIVE_CLASS
        )
    );
}


/*
 * Обновляет доступность и внешний вид кнопки.
 */
function updateVideoPresentationButton(
    selectedVideo =
        getSelectedVideo()
) {
    const button =
        document.querySelector(
            '#video-presentation'
        );

    if (
        !button
    ) {
        return;
    }

    const hasSelectedVideo =
        Boolean(
            selectedVideo
        );

    const isActive =
        isVideoPresentationActive();

    button.hidden =
        !hasSelectedVideo;

    button.disabled =
        !hasSelectedVideo;

    const icon =
        button.querySelector(
            '.video-presentation-button-icon'
        );

    const text =
        button.querySelector(
            '.video-presentation-button-text'
        );

    if (
        isActive
    ) {
        button.classList.add(
            'is-active'
        );

        button.setAttribute(
            'aria-label',
            'Остановить показ и вернуть обычный тирлист'
        );

        button.title =
            'Остановить показ и вернуть обычный тирлист';

        if (
            icon
        ) {
            icon.textContent =
                '■';
        }

        if (
            text
        ) {
            text.textContent =
                'Остановить показ';
        }

        return;
    }

    button.classList.remove(
        'is-active'
    );

    button.setAttribute(
        'aria-label',
        'Запустить показ тирлиста выбранного видео'
    );

    button.title =
        'Запустить показ тирлиста выбранного видео';

    if (
        icon
    ) {
        icon.textContent =
            '▶';
    }

    if (
        text
    ) {
        text.textContent =
            'Показать тирлист';
    }
}

function clearTierContainers() {
    TIER_NAMES.forEach(
        tier => {
            const container =
                tierContainers[tier];

            if (
                container
            ) {
                container.replaceChildren();
            }
        }
    );
}


function updateVideoFilterState(
    selectedVideo
) {
    const layout =
        document.querySelector(
            '.tier-list-layout'
        );

    if (
        !layout
    ) {
        return;
    }

    layout.classList.toggle(
        VIDEO_FILTER_ACTIVE_CLASS,
        selectedVideo !== ''
    );
}

function updateFavoritesFilterState() {
    const button =
        document.querySelector(
            '#favorites-filter'
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

function resetFilters() {
    const searchInput =
        document.querySelector(
            '#search'
        );

    const tagFilter =
        document.querySelector(
            '#tag-filter'
        );

    const videoFilter =
        document.querySelector(
            '#video-filter'
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

    const url =
        new URL(
            window.location.href
        );

    url.search = '';

    window.history.replaceState(
        {},
        '',
        url
    );

    renderGames();
}


async function shareCurrentFilters(
    button
) {
    /*
     * Перед копированием синхронизируем
     * обычные фильтры с URL.
     */
    updateUrlFromFilters();

    const url =
        new URL(
            window.location.href
        );

    /*
     * Если активен локальный фильтр избранного,
     * добавляем локальный список в ссылку.
     *
     * Если открыта чужая ссылка, её список
     * сохраняется без перезаписи.
     */
        if (
            isFavoritesFilterActive()
        ) {
            addFavoritesToUrl(
                url
            );
        }


    const shareUrl =
        url.href;

    try {
        await copyText(
            shareUrl
        );

        showShareButtonMessage(
            button,
            SHARE_BUTTON_SUCCESS_LABEL
        );
    } catch (
        error
    ) {
        console.warn(
            'Не удалось скопировать ссылку:',
            error
        );

        showShareButtonMessage(
            button,
            SHARE_BUTTON_ERROR_LABEL
        );
    }
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


function showShareButtonMessage(
    button,
    message
) {
    if (
        !button
    ) {
        return;
    }

    button.title =
        message;

    button.setAttribute(
        'aria-label',
        message
    );


    if (
        shareButtonResetTimer
    ) {
        clearTimeout(
            shareButtonResetTimer
        );
    }


    shareButtonResetTimer =
        setTimeout(
            () => {
                button.title =
                    SHARE_BUTTON_DEFAULT_LABEL;

                button.setAttribute(
                    'aria-label',
                    SHARE_BUTTON_DEFAULT_LABEL
                );

                shareButtonResetTimer =
                    null;
            },
            1800
        );
}


function setupMobileTierNavigation() {
    const navigation =
        document.querySelector(
            '.mobile-tier-navigation'
        );

    if (
        !navigation
    ) {
        return;
    }


    navigation.addEventListener(
        'click',
        event => {
            const button =
                event.target.closest(
                    '[data-tier-target]'
                );

            if (
                !button
            ) {
                return;
            }

            const target =
                button.dataset.tierTarget;


            if (
                target === 'HOME'
            ) {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });

                return;
            }


            const container =
                document.querySelector(
                    `#tier-${target}`
                );

            const tierRow =
                container?.closest(
                    '.tier-row'
                );

            if (
                !tierRow
            ) {
                return;
            }

            tierRow.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    );
}


function setupBackToTop(
    button
) {
    const controls =
        document.querySelector(
            '.controls'
        );

    if (
        !button ||
        !controls
    ) {
        return;
    }


    const updateButtonVisibility =
        () => {
            const controlsRect =
                controls.getBoundingClientRect();
            
            const shouldShow =
                controlsRect.bottom < 0;


            button.classList.toggle(
                BACK_TO_TOP_VISIBLE_CLASS,
                shouldShow
            );
        };


    button.addEventListener(
        'click',
        () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    );


    window.addEventListener(
        'scroll',
        updateButtonVisibility,
        {
            passive: true
        }
    );


    window.addEventListener(
        'resize',
        updateButtonVisibility
    );


    updateButtonVisibility();
}


function showLoadingError() {
    const tierList =
        document.querySelector(
            '.tier-list'
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
/*
 * =========================================================
 * Настройка размеров тир-листа
 * =========================================================
 */
function setupTierListAppearanceControls(
    cardScaleRange
) {
    const cardScaleValue =
        document.querySelector(
            '#tier-card-scale-value'
        );

    const updateCardScale =
        () => {
            if (
                !cardScaleRange
            ) {
                return;
            }

            const value =
                Number(
                    cardScaleRange.value
                );

            document.documentElement.style.setProperty(
                '--tier-card-scale',
                String(
                    value / 100
                )
            );

            if (
                cardScaleValue
            ) {
                cardScaleValue.textContent =
                    `${value}%`;
            }
        };

    cardScaleRange?.addEventListener(
        'input',
        updateCardScale
    );

    updateCardScale();
}

/*
 * =========================================================
 * Скриншот тир-листа
 * =========================================================
 */
/*
 * =========================================================
 * Выбор формата скриншота
 * =========================================================
 */

/*
 * =========================================================
 * Меню выбора формата скриншота
 * =========================================================
 *
 * Вместо системного <dialog> используем собственное
 * компактное меню над кнопкой загрузки.
 */
function openTierListScreenshotDialog() {
    const triggerButton =
        document.querySelector(
            '#download-tierlist-screenshot'
        );

    if (
        !triggerButton
    ) {
        downloadTierListScreenshot(
            'vertical'
        );

        return;
    }

    /*
     * Повторное нажатие на кнопку закрывает меню.
     */
    if (
        screenshotFormatMenu
    ) {
        closeTierListScreenshotMenu();

        return;
    }

    const menu =
        document.createElement(
            'div'
        );

    menu.className =
        'screenshot-format-menu';

    menu.setAttribute(
        'role',
        'menu'
    );

    menu.setAttribute(
        'aria-label',
        'Выбор формата скриншота'
    );

    menu.innerHTML = `
        <button
            class="screenshot-format-option"
            type="button"
            role="menuitem"
            data-screenshot-format="vertical"
        >
            <span
                class="screenshot-format-icon screenshot-format-icon-vertical"
                aria-hidden="true"
            >
                <svg
                    viewBox="0 0 24 24"
                    focusable="false"
                >
                    <rect
                        x="7"
                        y="3"
                        width="10"
                        height="18"
                        rx="1.8"
                    ></rect>
                    <path
                        d="M9.5 7.5h5M9.5 10.5h5M9.5 13.5h3.2"
                    ></path>
                </svg>
            </span>

            <span class="screenshot-format-text">
                Вертикальный
            </span>

            <span class="screenshot-format-ratio">
                Обычный
            </span>
        </button>

        <button
            class="screenshot-format-option"
            type="button"
            role="menuitem"
            data-screenshot-format="landscape"
        >
            <span
                class="screenshot-format-icon screenshot-format-icon-landscape"
                aria-hidden="true"
            >
                <svg
                    viewBox="0 0 24 24"
                    focusable="false"
                >
                    <rect
                        x="3"
                        y="6"
                        width="18"
                        height="12"
                        rx="1.8"
                    ></rect>
                    <path
                        d="M6.5 10h11M6.5 13h7"
                    ></path>
                </svg>
            </span>

            <span class="screenshot-format-text">
                Горизонтальный
            </span>

            <span class="screenshot-format-ratio">
                16:9
            </span>
        </button>
    `;

    document.body.appendChild(
        menu
    );

    screenshotFormatMenu =
        menu;

    triggerButton.setAttribute(
        'aria-expanded',
        'true'
    );

    positionTierListScreenshotMenu(
        menu,
        triggerButton
    );

    menu.addEventListener(
        'click',
        event => {
            const option =
                event.target.closest(
                    '[data-screenshot-format]'
                );

            if (
                !option
            ) {
                return;
            }

            const format =
                option.dataset.screenshotFormat;

            closeTierListScreenshotMenu();

            downloadTierListScreenshot(
                format
            );
        }
    );

    /*
     * Добавляем обработчики после текущего клика,
     * иначе клик по исходной кнопке сразу закрыл бы меню.
     */
    window.setTimeout(
        () => {
            const closeOnOutsideClick =
                event => {
                    if (
                        menu.contains(
                            event.target
                        ) ||
                        triggerButton.contains(
                            event.target
                        )
                    ) {
                        return;
                    }

                    closeTierListScreenshotMenu();
                };

            const closeOnEscape =
                event => {
                    if (
                        event.key ===
                        'Escape'
                    ) {
                        closeTierListScreenshotMenu();

                        triggerButton.focus();
                    }
                };

            document.addEventListener(
                'pointerdown',
                closeOnOutsideClick
            );

            document.addEventListener(
                'keydown',
                closeOnEscape
            );

            screenshotFormatMenuCleanup =
                () => {
                    document.removeEventListener(
                        'pointerdown',
                        closeOnOutsideClick
                    );

                    document.removeEventListener(
                        'keydown',
                        closeOnEscape
                    );
                };
        },
        0
    );
}


/*
 * Ставит меню над кнопкой и не даёт ему выйти
 * за левую или правую границу экрана.
 */
function positionTierListScreenshotMenu(
    menu,
    triggerButton
) {
    const buttonRect =
        triggerButton.getBoundingClientRect();

    const menuRect =
        menu.getBoundingClientRect();

    const viewportPadding =
        10;

    const gap =
        8;

    let left =
        buttonRect.right -
        menuRect.width;

    left =
        Math.max(
            viewportPadding,
            Math.min(
                left,
                window.innerWidth -
                menuRect.width -
                viewportPadding
            )
        );

    const top =
        Math.max(
            viewportPadding,
            buttonRect.top -
            menuRect.height -
            gap
        );

    menu.style.left =
        `${left}px`;

    menu.style.top =
        `${top}px`;
}


function closeTierListScreenshotMenu() {
    if (
        screenshotFormatMenuCleanup
    ) {
        screenshotFormatMenuCleanup();

        screenshotFormatMenuCleanup =
            null;
    }

    if (
        screenshotFormatMenu
    ) {
        screenshotFormatMenu.remove();

        screenshotFormatMenu =
            null;
    }

    const triggerButton =
        document.querySelector(
            '#download-tierlist-screenshot'
        );

    triggerButton?.setAttribute(
        'aria-expanded',
        'false'
    );
}


async function downloadTierListScreenshot(
    format = 'vertical'
) {

    const tierList =
        document.querySelector(
            '.tier-list'
        );

    if (
        !tierList
    ) {
        return;
    }
        const isLandscape =
        format === 'landscape';


    if (
        typeof window.html2canvas !==
        'function'
    ) {
        window.alert(
            'Модуль скриншота ещё не загрузился.'
        );

        return;
    }

    const button =
        document.querySelector(
            '#download-tierlist-screenshot'
        );

    if (
        button
    ) {
        button.disabled =
            true;

        button.title =
            'Создание скриншота…';

        button.setAttribute(
            'aria-label',
            'Создание скриншота…'
        );
    }

    closeAllPreviews();

    /*
     * Lazy-изображения из нижних тиров могут ещё
     * не быть загружены. На время скриншота просим
     * браузер загрузить их сразу.
     */
    const images =
        [
            ...tierList.querySelectorAll(
                'img'
            )
        ];

    images.forEach(
        image => {
            image.loading =
                'eager';
        }
    );

    await Promise.all(
        images.map(
            image =>
                waitForImage(
                    image
                )
        )
    );

    /*
     * Даём браузеру один кадр на перерасчёт
     * размеров после загрузки обложек.
     */
    await new Promise(
        resolve => {
            requestAnimationFrame(
                () => {
                    requestAnimationFrame(
                        resolve
                    );
                }
            );
        }
    );
const screenshotOptions =
    isLandscape
        ? {
            width: 1920,
            height: 1080,
            windowWidth: 1920,
            windowHeight: 1080
        }
        : {};




    try {
        const canvas =
            await window.html2canvas(
                tierList,
                {
                    backgroundColor:
                        '#f3f4f6',

                    scale: 2,

                    useCORS:
                        true,

                    allowTaint:
                        false,

                    logging:
                        false,

                    imageTimeout:
                        15000,

                    /*
                     * Захватываем реальную ширину
                     * и высоту всего списка, включая
                     * все тиры S–F.
                     */


                    scrollX:
                        0,

                    scrollY:
                        0,

                    onclone:
                        clonedDocument => {
                            const clonedTierList =
                                clonedDocument.querySelector(
                                    '.tier-list'
                                );

                            if (
                                !clonedTierList
                            ) {
                                return;
                            }

                            clonedTierList.classList.add(
                                'tierlist-screenshot-render'
                            );
                            if (
    isLandscape
) {
    clonedTierList.classList.add(
        'tierlist-screenshot-landscape'
    );
}


                            const style =
                                clonedDocument.createElement(
                                    'style'
                                );

                            style.textContent = `
                                *,
                                *::before,
                                *::after {
                                    animation: none !important;
                                    transition: none !important;
                                }
                                    .tierlist-screenshot-render
                                .game-media {
                                    position: relative !important;
                                    overflow: hidden !important;
                                }
                                
                            
                               .tierlist-screenshot-render
                                .game-cover {
                                    position: absolute !important;
                                
                                    display: block !important;
                                
                                    min-width: 0 !important;
                                    min-height: 0 !important;
                                    max-width: none !important;
                                    max-height: none !important;
                                
                                    /*
                                     * Точные width / height / top / left
                                     * назначаются ниже через JavaScript.
                                     */
                                    object-position: center !important;
                                }
                                
                                /*
 * =====================================================
 * Адаптивный горизонтальный экспорт 16:9
 * =====================================================
 *
 * Реальные высоты тиров, количество строк и размер
 * карточек выставляет applyAdaptiveLandscapeScreenshotLayout().
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape {
    display: flex !important;
    flex-direction: column !important;
    gap: 6px !important;

    width: 1920px !important;
    min-width: 1920px !important;
    max-width: none !important;

    height: 1080px !important;
    min-height: 1080px !important;
    max-height: 1080px !important;

    padding: 18px !important;
    overflow: hidden !important;

    background: #f3f4f6 !important;
}


/*
 * Высоту каждого тира задаёт JavaScript.
 * Ряд не должен самопроизвольно растягиваться.
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape
.tier-row {
    display: flex !important;
    flex: 0 0 auto !important;

    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;

    overflow: hidden !important;
    box-shadow: none !important;
}


/*
 * Цветная полоса с буквой тира.
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape
.tier-label {
    flex: 0 0 76px !important;

    width: 76px !important;
    min-width: 76px !important;
    height: 100% !important;

    font-size: 25px !important;
    line-height: 1 !important;
}


/*
 * Карточки могут переходить на вторую, третью
 * и дальнейшие строки внутри конкретного тира.
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape
.games-container {
    display: flex !important;
    flex: 1 1 auto !important;
    flex-wrap: wrap !important;
    align-content: center !important;
    align-items: flex-start !important;
    justify-content: flex-start !important;
    gap: 6px !important;

    min-width: 0 !important;
    max-width: none !important;
    height: 100% !important;
    min-height: 0 !important;
    padding: 5px 8px !important;

    overflow: hidden !important;
}


/*
 * Ширина и высота карточек назначаются inline-стилями
 * адаптивным JavaScript-расчётом.
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape
.game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-S .game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-A .game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-B .game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-C .game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-D .game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-E .game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-F .game-card {
    flex-grow: 0 !important;
    flex-shrink: 0 !important;

    max-width: none !important;
    aspect-ratio: 1 / 1 !important;
}


/*
 * Уравниваем сетку всех карточек.
 * Иначе S/A использовали бы иную раскладку,
 * чем B–F, из-за обычных правил сайта.
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape
.game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-S .game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-A .game-card {
    grid-template-rows:
        minmax(0, 72%)
        minmax(0, 1fr)
        auto !important;
}


/*
 * Компактная типографика экспортного изображения.
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape
.game-title,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-B .game-title,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-C .game-title,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-D .game-title,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-E .game-title,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-F .game-title {
    display: -webkit-box !important;

    width: calc(100% - 8px) !important;
    min-height: 0 !important;
    margin: 3px auto 2px !important;
    overflow: hidden !important;

    font-size: 9px !important;
    line-height: 1.1 !important;
    text-align: center !important;
    text-overflow: clip !important;
    white-space: normal !important;

    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
}


.tierlist-screenshot-render.tierlist-screenshot-landscape
.game-tags,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-D .game-tags,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-E .game-tags,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-F .game-tags {
    width: calc(100% - 8px) !important;
    max-height: 20px !important;
    margin: 0 auto 4px !important;
    gap: 2px !important;

    overflow: hidden !important;
}


/*
 * Если общий размер карточек пришлось уменьшить,
 * теги становятся нечитаемыми — скрываем их.
 */



/*
 * В экстремально заполненном тир-листе карточки
 * остаются с обложками, но без нечитаемого текста.
 */


                                
                                
                                .tierlist-screenshot-render.tierlist-screenshot-landscape
                                .game-tag,
                                .tierlist-screenshot-render.tierlist-screenshot-landscape
                                #tier-D .game-tag,
                                .tierlist-screenshot-render.tierlist-screenshot-landscape
                                #tier-E .game-tag,
                                .tierlist-screenshot-render.tierlist-screenshot-landscape
                                #tier-F .game-tag {
                                    max-width: 100% !important;
                                    padding: 2px 3px !important;
                                
                                    font-size: 7px !important;
                                    line-height: 1 !important;
                                }
                                
/*
 * В горизонтальном экспорте у карточки есть только:
 * 1. обложка;
 * 2. зона для названия.
 *
 * Отдаём названию 36% высоты: этого хватает
 * для двух строк без обрезания.
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape
.game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-S .game-card,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-A .game-card {
    grid-template-rows:
        minmax(0, 64%)
        minmax(0, 36%) !important;
}



.tierlist-screenshot-render.tierlist-screenshot-landscape
.game-tags,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-D .game-tags,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-E .game-tags,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-F .game-tags {
    display: none !important;
}


/*
 * Название занимает всю нижнюю секцию карточки
 * и центрируется в ней вертикально.
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape
.game-title,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-B .game-title,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-C .game-title,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-D .game-title,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-E .game-title,
.tierlist-screenshot-render.tierlist-screenshot-landscape
#tier-F .game-title {
    display: -webkit-box !important;
    align-self: stretch !important;

    width: calc(100% - 8px) !important;
    min-height: 0 !important;
    max-height: none !important;
    margin: 0 auto !important;
    padding: 2px 0 !important;
    overflow: hidden !important;

    font-size: 9px !important;
    line-height: 1.12 !important;
    text-align: center !important;
    white-space: normal !important;

    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
}



/*
 * Цена тоже находится поверх нижней части карточки,
 * поэтому в PNG её не показываем.
 */
.tierlist-screenshot-render.tierlist-screenshot-landscape
.game-price {
    display: none !important;
}

                                .tierlist-screenshot-render
                                .game-card,
                                .tierlist-screenshot-render
                                .game-card:hover,
                                .tierlist-screenshot-render
                                .game-card:focus,
                                .tierlist-screenshot-render
                                .game-card:focus-within {
                                    transform: none !important;
                                    opacity: 1 !important;
                                    filter: none !important;
                                    box-shadow: none !important;
                                }

                                .tierlist-screenshot-render
                                .tier-row {
                                    overflow: hidden !important;
                                    box-shadow: none !important;
                                }

                                .tierlist-screenshot-render
                                .games-container {
                                    overflow: hidden !important;
                                }

                                .tierlist-screenshot-render
                                .favorite-button,
                                .tierlist-screenshot-render
                                .game-preview-popup {
                                    display: none !important;
                                }

                                .tierlist-screenshot-render
                                .game-card {
                                    flex-shrink: 0 !important;
                                }
                            `;

                            clonedDocument.head.appendChild(
                                style
                            );
                            if (
    isLandscape
) {
    applyAdaptiveLandscapeScreenshotLayout(
        clonedTierList
    );
}

                            /*
 * html2canvas ненадёжно поддерживает object-fit: cover.
 *
 * Поэтому вручную рассчитываем размер обложки:
 * она полностью заполняет .game-media, а лишние части
 * выходят за границы контейнера и обрезаются через overflow.
 */
clonedDocument
    .querySelectorAll(
        '.tierlist-screenshot-render .game-media'
    )
    .forEach(
        media => {
            const image =
                media.querySelector(
                    '.game-cover'
                );

            if (
                !image ||
                !image.naturalWidth ||
                !image.naturalHeight
            ) {
                return;
            }

            const mediaWidth =
                media.offsetWidth;

            const mediaHeight =
                media.offsetHeight;

            if (
                !mediaWidth ||
                !mediaHeight
            ) {
                return;
            }

            const imageRatio =
                image.naturalWidth /
                image.naturalHeight;

            const mediaRatio =
                mediaWidth /
                mediaHeight;

            let renderedWidth;
            let renderedHeight;

            /*
             * Повторяем object-fit: cover:
             *
             * Если изображение относительно шире блока,
             * ограничиваем его по высоте — обрежутся края.
             *
             * Если оно относительно выше блока,
             * ограничиваем по ширине — обрежутся верх и низ.
             */
            if (
                imageRatio >
                mediaRatio
            ) {
                renderedHeight =
                    mediaHeight;

                renderedWidth =
                    mediaHeight *
                    imageRatio;
            } else {
                renderedWidth =
                    mediaWidth;

                renderedHeight =
                    mediaWidth /
                    imageRatio;
            }

            const offsetLeft =
                (
                    mediaWidth -
                    renderedWidth
                ) / 2;

            const offsetTop =
                (
                    mediaHeight -
                    renderedHeight
                ) / 2;

            image.style.setProperty(
                'position',
                'absolute',
                'important'
            );

            image.style.setProperty(
                'display',
                'block',
                'important'
            );

            image.style.setProperty(
                'width',
                `${renderedWidth}px`,
                'important'
            );

            image.style.setProperty(
                'height',
                `${renderedHeight}px`,
                'important'
            );

            image.style.setProperty(
                'max-width',
                'none',
                'important'
            );

            image.style.setProperty(
                'max-height',
                'none',
                'important'
            );

            image.style.setProperty(
                'left',
                `${offsetLeft}px`,
                'important'
            );

            image.style.setProperty(
                'top',
                `${offsetTop}px`,
                'important'
            );

            image.style.setProperty(
                'right',
                'auto',
                'important'
            );

            image.style.setProperty(
                'bottom',
                'auto',
                'important'
            );

            /*
             * Теперь object-fit уже не нужен:
             * размеры рассчитаны вручную.
             */
            image.style.setProperty(
                'object-fit',
                'fill',
                'important'
            );
        }
    );

                        }
                }
            );

        const link =
            document.createElement(
                'a'
            );

        link.download =
            isLandscape
                ? 'raider-roguelike-tierlist-16x9.png'
                : 'raider-roguelike-tierlist.png';


        link.href =
            canvas.toDataURL(
                'image/png'
            );

        link.click();
    } catch (
        error
    ) {
        console.error(
            'Ошибка создания скриншота:',
            error
        );

        window.alert(
            'Не удалось создать скриншот.'
        );
    } finally {
        if (
            button
        ) {
            button.disabled =
                false;

            button.title =
                'Скачать скриншот тир-листа';

            button.setAttribute(
                'aria-label',
                'Скачать скриншот тир-листа'
            );
        }
    }
}
/*
 * =========================================================
 * Умная раскладка горизонтального PNG
 * =========================================================
 *
 * Холст всегда 1920 × 1080.
 *
 * Функция ищет максимально возможный единый размер карточек,
 * при котором все тиры и все карточки в них помещаются.
 *
 * Если игр в тире слишком много для одной строки:
 * - тир получает вторую / третью строку;
 * - его высота увеличивается;
 * - соседние тиры получают меньше свободной высоты;
 * - если суммарной высоты не хватает, карточки уменьшаются.
 */

function applyAdaptiveLandscapeScreenshotLayout(
    tierList
) {
    const screenshotWidth =
        1920;

    const screenshotHeight =
        1080;

    const outerPaddingX =
        18;

    const outerPaddingY =
        18;

    const tierGap =
        6;

    const tierLabelWidth =
        76;

    const gamesPaddingX =
        8 * 2;

    const gamesPaddingY =
        5 * 2;

    const cardGap =
        6;

    const minimumTierHeight =
        48;

    /*
     * Пространство, доступное именно карточкам
     * внутри строки: без внешних отступов PNG,
     * ярлыка S/A/B... и внутренних отступов игр.
     */
    const gamesAvailableWidth =
        screenshotWidth -
        outerPaddingX * 2 -
        tierLabelWidth -
        gamesPaddingX -
        2;

    /*
     * Пространство для семи рядов без внешних отступов
     * и шести промежутков между рядами.
     */
    const availableRowsHeight =
        screenshotHeight -
        outerPaddingY * 2 -
        tierGap * 6;

    const tierRows =
        [
            ...tierList.querySelectorAll(
                '.tier-row'
            )
        ];

    /*
     * Сначала пробуем крупные карточки.
     * Затем уменьшаем их по одному пикселю, пока
     * все строки не смогут поместиться по высоте.
     */
    const maximumCardSize =
        150;

    const minimumCardSize =
        32;

    let selectedLayout =
        null;

    for (
        let cardSize = maximumCardSize;
        cardSize >= minimumCardSize;
        cardSize -= 1
    ) {
        const cardsPerLine =
            Math.max(
                1,
                Math.floor(
                    (
                        gamesAvailableWidth +
                        cardGap
                    ) /
                    (
                        cardSize +
                        cardGap
                    )
                )
            );

        const tiers =
            tierRows.map(
                tierRow => {
                    const gamesContainer =
                        tierRow.querySelector(
                            '.games-container'
                        );

                    const cardsCount =
                        gamesContainer
                            ? gamesContainer.querySelectorAll(
                                '.game-card'
                            ).length
                            : 0;

                    /*
                     * Пустой тир всё равно остаётся
                     * видимой полосой с буквой.
                     */
                    const linesCount =
                        cardsCount > 0
                            ? Math.ceil(
                                cardsCount /
                                cardsPerLine
                            )
                            : 0;

                    const cardsHeight =
                        linesCount > 0
                            ? (
                                linesCount *
                                cardSize
                            ) +
                            (
                                (
                                    linesCount -
                                    1
                                ) *
                                cardGap
                            )
                            : 0;

                    const requiredHeight =
                        Math.max(
                            minimumTierHeight,
                            cardsHeight +
                            gamesPaddingY +
                            2
                        );

                    return {
                        tierRow,
                        gamesContainer,
                        cardsCount,
                        linesCount,
                        requiredHeight
                    };
                }
            );

        const totalRowsHeight =
            tiers.reduce(
                (
                    total,
                    tier
                ) => (
                    total +
                    tier.requiredHeight
                ),
                0
            );

        if (
            totalRowsHeight <=
            availableRowsHeight
        ) {
            selectedLayout =
                {
                    cardSize,
                    cardsPerLine,
                    tiers,
                    totalRowsHeight
                };

            break;
        }
    }

    /*
     * На практике этот fallback не должен срабатывать,
     * но не даём экспорту упасть, если игр окажется
     * экстремально много.
     */
    if (
        !selectedLayout
    ) {
        const cardSize =
            minimumCardSize;

        const cardsPerLine =
            Math.max(
                1,
                Math.floor(
                    (
                        gamesAvailableWidth +
                        cardGap
                    ) /
                    (
                        cardSize +
                        cardGap
                    )
                )
            );

        const tiers =
            tierRows.map(
                tierRow => {
                    const gamesContainer =
                        tierRow.querySelector(
                            '.games-container'
                        );

                    const cardsCount =
                        gamesContainer
                            ? gamesContainer.querySelectorAll(
                                '.game-card'
                            ).length
                            : 0;

                    const linesCount =
                        cardsCount > 0
                            ? Math.ceil(
                                cardsCount /
                                cardsPerLine
                            )
                            : 0;

                    const cardsHeight =
                        linesCount > 0
                            ? (
                                linesCount *
                                cardSize
                            ) +
                            (
                                (
                                    linesCount -
                                    1
                                ) *
                                cardGap
                            )
                            : 0;

                    return {
                        tierRow,
                        gamesContainer,
                        cardsCount,
                        linesCount,
                        requiredHeight:
                            Math.max(
                                minimumTierHeight,
                                cardsHeight +
                                gamesPaddingY +
                                2
                            )
                    };
                }
            );

        selectedLayout =
            {
                cardSize,
                cardsPerLine,
                tiers,
                totalRowsHeight:
                    tiers.reduce(
                        (
                            total,
                            tier
                        ) => (
                            total +
                            tier.requiredHeight
                        ),
                        0
                    )
            };
    }

    const {
        cardSize,
        tiers,
        totalRowsHeight
    } = selectedLayout;

    /*
     * Неиспользуемую высоту распределяем между тирами.
     *
     * Благодаря этому список занимает весь холст,
     * а карточки красиво центрируются по вертикали
     * внутри своей цветной полосы.
     */
    const freeHeight =
        Math.max(
            0,
            availableRowsHeight -
            totalRowsHeight
        );

    const extraHeightPerTier =
        freeHeight /
        Math.max(
            1,
            tiers.length
        );

    tierList.classList.toggle(
        'landscape-screenshot-compact',
        cardSize <= 82
    );

    tierList.classList.toggle(
        'landscape-screenshot-tiny',
        cardSize <= 54
    );

    tierList.style.setProperty(
        'width',
        `${screenshotWidth}px`,
        'important'
    );

    tierList.style.setProperty(
        'height',
        `${screenshotHeight}px`,
        'important'
    );

    tierList.style.setProperty(
        'min-height',
        `${screenshotHeight}px`,
        'important'
    );

    tiers.forEach(
        tier => {
            const rowHeight =
                tier.requiredHeight +
                extraHeightPerTier;

            const {
                tierRow,
                gamesContainer
            } = tier;

            tierRow.style.setProperty(
                'height',
                `${rowHeight}px`,
                'important'
            );

            tierRow.style.setProperty(
                'min-height',
                `${rowHeight}px`,
                'important'
            );

            tierRow.style.setProperty(
                'max-height',
                `${rowHeight}px`,
                'important'
            );

            tierRow.style.setProperty(
                'flex',
                `0 0 ${rowHeight}px`,
                'important'
            );

            if (
                !gamesContainer
            ) {
                return;
            }

            gamesContainer.style.setProperty(
                'flex-wrap',
                'wrap',
                'important'
            );

            gamesContainer.style.setProperty(
                'gap',
                `${cardGap}px`,
                'important'
            );

            gamesContainer.style.setProperty(
                'align-content',
                'center',
                'important'
            );

            gamesContainer
                .querySelectorAll(
                    '.game-card'
                )
                .forEach(
                    card => {
                        card.style.setProperty(
                            'width',
                            `${cardSize}px`,
                            'important'
                        );

                        card.style.setProperty(
                            'height',
                            `${cardSize}px`,
                            'important'
                        );

                        card.style.setProperty(
                            'min-width',
                            `${cardSize}px`,
                            'important'
                        );

                        card.style.setProperty(
                            'min-height',
                            `${cardSize}px`,
                            'important'
                        );

                        card.style.setProperty(
                            'max-width',
                            `${cardSize}px`,
                            'important'
                        );

                        card.style.setProperty(
                            'max-height',
                            `${cardSize}px`,
                            'important'
                        );

                        card.style.setProperty(
                            'flex',
                            `0 0 ${cardSize}px`,
                            'important'
                        );
                    }
                );
        }
    );
}


function waitForImage(
    image
) {
    if (
        image.complete
    ) {
        return image.decode?.()
            .catch(
                () => {}
            ) ||
            Promise.resolve();
    }

    return new Promise(
        resolve => {
            const timeout =
                window.setTimeout(
                    resolve,
                    15000
                );

            const finish =
                () => {
                    window.clearTimeout(
                        timeout
                    );

                    resolve();
                };

            image.addEventListener(
                'load',
                finish,
                {
                    once: true
                }
            );

            image.addEventListener(
                'error',
                finish,
                {
                    once: true
                }
            );
        }
    );
}


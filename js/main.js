/*
 * =========================================================
 * Точка входа приложения
 * =========================================================
 *
 * main.js намеренно остаётся небольшим:
 *
 * - инициализирует DOM-ссылки;
 * - загружает данные;
 * - связывает независимые модули;
 * - обрабатывает глобальные browser-события;
 * - запускает обычный рендер тир-листа.
 *
 * Логика интерфейса, PNG, презентации и рендера вынесена
 * в отдельные модули.
 */

import {
    appState
} from './state.js';

import {
    loadGames
} from './data.js';

import {
    fillTagFilter,
    fillVideoFilter,
    setFiltersFromUrl
} from './filters.js';

import {
    closeAllPreviews,
    updateVisiblePreviewPositions
} from './previews.js';

import {
    cacheDomElements,
    elements
} from './dom.js';

import {
    renderTierList
} from './tier-renderer.js';

import {
    toggleVideoPresentation,
    stopPresentationForRegularRender,
    updateVideoPresentationButton
} from './presentation.js';

import {
    setupTierListScreenshot
} from './screenshot.js';

import {
    setupUiControls
} from './ui-controls.js';


/*
 * =========================================================
 * Внутреннее состояние main.js
 * =========================================================
 */

const mainState = {
    previewPositionFrameId: null,
    isInitialized: false
};


/*
 * =========================================================
 * Запуск приложения
 * =========================================================
 */

document.addEventListener(
    'DOMContentLoaded',
    init
);


function init() {
    if (
        mainState.isInitialized
    ) {
        return;
    }

    mainState.isInitialized =
        true;

    cacheDomElements();

    setupGlobalBrowserEvents();

    setupUiControls(
        {
            renderRegularView,
            togglePresentation:
                toggleVideoPresentation
        }
    );

    setupTierListScreenshot();

    loadApplicationData();
}


/*
 * =========================================================
 * Загрузка данных
 * =========================================================
 */

async function loadApplicationData() {
    try {
        appState.games =
            await loadGames();

        fillTagFilter();
        fillVideoFilter();

        /*
         * URL является исходным источником состояния
         * при первой загрузке страницы.
         */
        setFiltersFromUrl();

        renderRegularView(
            {
                syncUrl:
                    false
            }
        );
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
 * Обычный интерактивный рендер
 * =========================================================
 *
 * Это единая функция, которую вызывают:
 *
 * - поиск;
 * - фильтры тегов и видео;
 * - избранное;
 * - кнопка сброса;
 * - browser Back / Forward;
 * - остановка презентационного режима.
 *
 * Она гарантирует, что перед обычным списком:
 * - завершится презентационный режим;
 * - закроются preview-popup;
 * - обновится кнопка презентации.
 */

export function renderRegularView(
    {
        syncUrl = true
    } = {}
) {
    stopPresentationForRegularRender();

    closeAllPreviews();

    const renderResult =
        renderTierList(
            {
                syncUrl
            }
        );

    updateVideoPresentationButton(
        renderResult.filterState.selectedVideo
    );

    return renderResult;
}


/*
 * =========================================================
 * Глобальные события браузера
 * =========================================================
 */

function setupGlobalBrowserEvents() {
    document.addEventListener(
        'visibilitychange',
        onDocumentVisibilityChange
    );

    window.addEventListener(
        'pageshow',
        closeAllPreviews
    );

    window.addEventListener(
        'resize',
        schedulePreviewPositionUpdate,
        {
            passive: true
        }
    );

    /*
     * capture: true нужен, чтобы реагировать также
     * на прокрутку вложенных scroll-контейнеров.
     *
     * requestAnimationFrame не позволяет выполнять
     * updateVisiblePreviewPositions() десятки раз
     * в течение одного кадра.
     */
    window.addEventListener(
        'scroll',
        schedulePreviewPositionUpdate,
        {
            passive: true,
            capture: true
        }
    );

    window.addEventListener(
        'popstate',
        onPopState
    );
}


function onDocumentVisibilityChange() {
    if (
        document.visibilityState ===
        'visible'
    ) {
        closeAllPreviews();

        schedulePreviewPositionUpdate();
    }
}


/*
 * При Back / Forward фильтры сначала читаются из URL,
 * а затем список перерисовывается без обратной записи
 * параметров в history.
 */
function onPopState() {
    setFiltersFromUrl();

    renderRegularView(
        {
            syncUrl:
                false
        }
    );
}


function schedulePreviewPositionUpdate() {
    if (
        mainState.previewPositionFrameId
    ) {
        return;
    }

    mainState.previewPositionFrameId =
        window.requestAnimationFrame(
            () => {
                mainState.previewPositionFrameId =
                    null;

                updateVisiblePreviewPositions();
            }
        );
}


/*
 * =========================================================
 * Ошибка загрузки
 * =========================================================
 */

function showLoadingError() {
    const tierList =
        elements.tierList;

    if (
        !tierList
    ) {
        return;
    }

    const message =
        document.createElement(
            'p'
        );

    message.className =
        'loading-error';

    message.textContent =
        'Не удалось загрузить данные из Google Sheets.';

    tierList.replaceChildren(
        message
    );
}

/*
 * =========================================================
 * Презентация тир-листа для видео
 * =========================================================
 *
 * Режим предназначен для записи роликов:
 * игры выбранного видео появляются по одной в глобальном
 * порядке поля Order.
 *
 * Пока режим активен:
 * - правая панель выбранного видео скрыта CSS-классом;
 * - карточки не интерактивны;
 * - итоговый список остаётся чистой сценой для OBS;
 * - кнопка позволяет вернуть обычный режим.
 */

import {
    appState
} from './state.js';

import {
    compareGamesByOrder,
    getVideoUrl
} from './data.js';

import {
    getSelectedVideo
} from './filters.js';

import {
    closeAllPreviews
} from './previews.js';

import {
    appendGameCardToTier,
    clearTierContainers,
    renderTierList
} from './tier-renderer.js';

import {
    elements,
    getTierRow
} from './dom.js';


const PRESENTATION_INTERVAL =
    1000;

const PRESENTATION_ACTIVE_CLASS =
    'video-presentation-active';

const PRESENTATION_TIER_ACTIVE_CLASS =
    'tier-row-presentation-active';

const PRESENTATION_ENTERING_CLASS =
    'presentation-card-entering';

const PRESENTATION_VISIBLE_CLASS =
    'presentation-card-visible';

const PRESENTATION_ANIMATION_CLASSES =
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

const START_BUTTON_ICON =
    '▶';

const STOP_BUTTON_ICON =
    '■';

const START_BUTTON_TEXT =
    'Показать тирлист';

const STOP_BUTTON_TEXT =
    'Остановить показ';

const START_BUTTON_LABEL =
    'Запустить показ тирлиста выбранного видео';

const STOP_BUTTON_LABEL =
    'Остановить показ и вернуть обычный тирлист';


/*
 * =========================================================
 * Внутреннее состояние презентации
 * =========================================================
 *
 * Состояние собрано в одном объекте вместо нескольких
 * разрозненных глобальных переменных.
 */

const presentationState = {
    timerId: null,
    games: [],
    currentStep: 0,
    videoUrl: ''
};


/*
 * =========================================================
 * Публичное состояние
 * =========================================================
 */

export function isVideoPresentationActive() {
    return Boolean(
        elements.layout?.classList.contains(
            PRESENTATION_ACTIVE_CLASS
        )
    );
}


export function getVideoPresentationState() {
    return {
        active:
            isVideoPresentationActive(),

        currentStep:
            presentationState.currentStep,

        totalGames:
            presentationState.games.length,

        videoUrl:
            presentationState.videoUrl,

        isRunning:
            Boolean(
                presentationState.timerId
            )
    };
}


/*
 * =========================================================
 * Кнопка запуска / остановки
 * =========================================================
 */

export function updateVideoPresentationButton(
    selectedVideo =
        getSelectedVideo()
) {
    const button =
        elements.videoPresentationButton;

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

    button.classList.toggle(
        'is-active',
        isActive
    );

    const buttonLabel =
        isActive
            ? STOP_BUTTON_LABEL
            : START_BUTTON_LABEL;

    button.setAttribute(
        'aria-label',
        buttonLabel
    );

    button.title =
        buttonLabel;

    if (
        icon
    ) {
        icon.textContent =
            isActive
                ? STOP_BUTTON_ICON
                : START_BUTTON_ICON;
    }

    if (
        text
    ) {
        text.textContent =
            isActive
                ? STOP_BUTTON_TEXT
                : START_BUTTON_TEXT;
    }
}


/*
 * =========================================================
 * Управление режимом
 * =========================================================
 */

export function toggleVideoPresentation() {
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
 * Запускает показ игр выбранного видео.
 *
 * Обычные фильтры — поиск, тег и избранное — специально
 * не участвуют в отборе. Для презентации важны только:
 * - выбранное видео;
 * - глобальный порядок Order.
 */
export function startVideoPresentation() {
    const selectedVideo =
        getSelectedVideo();

    if (
        !selectedVideo
    ) {
        return;
    }

    const gamesForVideo =
        getPresentationGames(
            selectedVideo
        );

    /*
     * Не запускаем пустую презентацию, если для видео
     * по какой-либо причине не найдено ни одной игры.
     */
    if (
        gamesForVideo.length === 0
    ) {
        return;
    }

    closeAllPreviews();
    clearTierContainers();

    resetPresentationState();

    presentationState.games =
        gamesForVideo;

    presentationState.videoUrl =
        selectedVideo;

    elements.layout?.classList.add(
        PRESENTATION_ACTIVE_CLASS
    );

    updateVideoPresentationButton(
        selectedVideo
    );

    /*
     * Первая игра выводится сразу после нажатия.
     */
    showNextVideoPresentationGame();

    /*
     * Если игра была всего одна, режим уже закончен,
     * но визуально остаётся активным до Stop.
     */
    if (
        presentationState.currentStep >=
        presentationState.games.length
    ) {
        finishVideoPresentation();

        return;
    }

    scheduleNextPresentationStep();
}


/*
 * Останавливает режим презентации.
 *
 * restoreRegularView:
 * - true: пользователь нажал Stop, возвращаем обычный
 *   тир-лист со звёздочками, popup и панелью видео;
 * - false: вызывающий код сам готовится отрисовать другой
 *   список — например после изменения фильтра.
 */
export function stopVideoPresentation(
    {
        restoreRegularView = false
    } = {}
) {
    clearPresentationTimer();
    clearPresentationTierHighlights();

    resetPresentationState();

    elements.layout?.classList.remove(
        PRESENTATION_ACTIVE_CLASS
    );

    if (
        restoreRegularView
    ) {
        renderTierList();

        updateVideoPresentationButton();

        return;
    }

    updateVideoPresentationButton();
}


/*
 * Подготавливает обычный рендер после смены фильтра.
 *
 * Эта функция нужна main.js: перед renderTierList() можно
 * безопасно завершить презентацию, не вызывая второй
 * промежуточный renderTierList() внутри stop().
 */
export function stopPresentationForRegularRender() {
    if (
        !isVideoPresentationActive()
    ) {
        return;
    }

    stopVideoPresentation({
        restoreRegularView:
            false
    });
}


/*
 * =========================================================
 * Получение и показ игр
 * =========================================================
 */

function getPresentationGames(
    videoUrl
) {
    return appState.games
        .filter(
            game =>
                getVideoUrl(
                    game
                ) === videoUrl
        )
        .sort(
            compareGamesByOrder
        );
}


function showNextVideoPresentationGame() {
    const game =
        presentationState.games[
            presentationState.currentStep
        ];

    if (
        !game
    ) {
        finishVideoPresentation();

        return;
    }

    const card =
        appendGameCardToTier(
            game,
            {
                videoFilterActive:
                    true,

                presentationEntry:
                    true
            }
        );

    if (
        card
    ) {
        animatePresentationCard(
            card,
            game
        );
    }

    presentationState.currentStep += 1;

    if (
        presentationState.currentStep >=
        presentationState.games.length
    ) {
        finishVideoPresentation();

        return;
    }

    scheduleNextPresentationStep();
}


/*
 * setTimeout вместо setInterval:
 *
 * Следующий шаг планируется только после завершения
 * текущей обработки. Это удобнее для будущих паузы,
 * изменения скорости показа и ручного переключения.
 */
function scheduleNextPresentationStep() {
    clearPresentationTimer();

    presentationState.timerId =
        window.setTimeout(
            () => {
                presentationState.timerId =
                    null;

                if (
                    !isVideoPresentationActive()
                ) {
                    return;
                }

                showNextVideoPresentationGame();
            },
            PRESENTATION_INTERVAL
        );
}


/*
 * После последней игры очищаем только таймер.
 *
 * Сам режим остаётся активным: финальный тир-лист
 * продолжает быть «чистой сценой» для записи.
 */
function finishVideoPresentation() {
    clearPresentationTimer();

    updateVideoPresentationButton(
        presentationState.videoUrl
    );
}


/*
 * =========================================================
 * Анимация добавленной карточки
 * =========================================================
 */

function animatePresentationCard(
    card,
    game
) {
    const tierRow =
        getTierRow(
            game['Tier']
        );

    card.classList.add(
        PRESENTATION_ENTERING_CLASS,
        getRandomPresentationAnimationClass()
    );

    /*
     * Два кадра гарантируют, что браузер успеет применить
     * стартовое CSS-состояние перед включением keyframes.
     */
    requestAnimationFrame(
        () => {
            requestAnimationFrame(
                () => {
                    if (
                        !card.isConnected ||
                        !isVideoPresentationActive()
                    ) {
                        return;
                    }

                    card.classList.remove(
                        PRESENTATION_ENTERING_CLASS
                    );

                    card.classList.add(
                        PRESENTATION_VISIBLE_CLASS
                    );

                    flashPresentationTier(
                        tierRow
                    );
                }
            );
        }
    );
}


function getRandomPresentationAnimationClass() {
    const randomIndex =
        Math.floor(
            Math.random() *
            PRESENTATION_ANIMATION_CLASSES.length
        );

    return PRESENTATION_ANIMATION_CLASSES[
        randomIndex
    ];
}


function flashPresentationTier(
    tierRow
) {
    if (
        !tierRow
    ) {
        return;
    }

    tierRow.classList.remove(
        PRESENTATION_TIER_ACTIVE_CLASS
    );

    /*
     * Принудительный reflow перезапускает CSS-анимацию,
     * если несколько игр подряд попали в один тир.
     */
    void tierRow.offsetWidth;

    tierRow.classList.add(
        PRESENTATION_TIER_ACTIVE_CLASS
    );

    window.setTimeout(
        () => {
            tierRow.classList.remove(
                PRESENTATION_TIER_ACTIVE_CLASS
            );
        },
        720
    );
}


function clearPresentationTierHighlights() {
    document
        .querySelectorAll(
            `.${PRESENTATION_TIER_ACTIVE_CLASS}`
        )
        .forEach(
            tierRow => {
                tierRow.classList.remove(
                    PRESENTATION_TIER_ACTIVE_CLASS
                );
            }
        );
}


/*
 * =========================================================
 * Очистка состояния
 * =========================================================
 */

function clearPresentationTimer() {
    if (
        !presentationState.timerId
    ) {
        return;
    }

    window.clearTimeout(
        presentationState.timerId
    );

    presentationState.timerId =
        null;
}


function resetPresentationState() {
    clearPresentationTimer();

    presentationState.games =
        [];

    presentationState.currentStep =
        0;

    presentationState.videoUrl =
        '';
}

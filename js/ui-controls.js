/*
 * =========================================================
 * Элементы управления интерфейсом
 * =========================================================
 *
 * Модуль отвечает за:
 * - поля фильтров;
 * - поиск с debounce;
 * - локальное избранное;
 * - сброс и шаринг фильтров;
 * - переключатель цен;
 * - масштаб карточек;
 * - мобильную навигацию по тирам;
 * - кнопку «Наверх».
 *
 * Сам рендер игр сюда не входит. Его передаёт main.js
 * через callback renderRegularView().
 */

import {
    isFavoritesFilterActive,
    setFavoritesFilter,
    addFavoritesToUrl
} from './favorites.js';

import {
    updateUrlFromFilters
} from './filters.js';

import {
    setPriceMode
} from './steam-price.js';

import {
    elements,
    getTierRow
} from './dom.js';


const SEARCH_RENDER_DELAY =
    150;

const BACK_TO_TOP_VISIBLE_CLASS =
    'is-visible';

const SHARE_BUTTON_DEFAULT_LABEL =
    'Скопировать ссылку на подборку';

const SHARE_BUTTON_SUCCESS_LABEL =
    'Ссылка скопирована';

const SHARE_BUTTON_ERROR_LABEL =
    'Не удалось скопировать';


/*
 * =========================================================
 * Внутреннее состояние
 * =========================================================
 */

const uiState = {
    searchRenderTimer: null,
    shareButtonResetTimer: null,

    backToTopFrameId: null,

    cleanupFunctions: []
};


/*
 * =========================================================
 * Инициализация
 * =========================================================
 *
 * renderRegularView:
 * единая функция обычной перерисовки списка.
 *
 * В main.js она будет:
 * 1. завершать presentation-режим при необходимости;
 * 2. закрывать popup;
 * 3. запускать renderTierList();
 * 4. обновлять кнопку презентации.
 *
 * togglePresentation:
 * обработчик кнопки «Показать тирлист».
 */
export function setupUiControls(
    {
        renderRegularView,
        togglePresentation
    } = {}
) {
    cleanupUiControls();

    setupSearchControl(
        renderRegularView
    );

    setupSelectFilters(
        renderRegularView
    );

    setupFavoritesFilter(
        renderRegularView
    );

    setupPriceModeToggle();

    setupResetFiltersButton(
        renderRegularView
    );

    setupShareFiltersButton();

    setupTierCardScaleControl();

    setupMobileTierNavigation();

    setupBackToTop();

    setupPresentationButton(
        togglePresentation
    );

    setupFavoritesChangeListener(
        renderRegularView
    );
}


/*
 * Если модуль будет повторно инициализирован
 * в будущем, старые обработчики не останутся висеть.
 */
export function cleanupUiControls() {
    uiState.cleanupFunctions.forEach(
        cleanup => {
            cleanup();
        }
    );

    uiState.cleanupFunctions =
        [];

    if (
        uiState.searchRenderTimer
    ) {
        window.clearTimeout(
            uiState.searchRenderTimer
        );

        uiState.searchRenderTimer =
            null;
    }

    if (
        uiState.shareButtonResetTimer
    ) {
        window.clearTimeout(
            uiState.shareButtonResetTimer
        );

        uiState.shareButtonResetTimer =
            null;
    }

    if (
        uiState.backToTopFrameId
    ) {
        window.cancelAnimationFrame(
            uiState.backToTopFrameId
        );

        uiState.backToTopFrameId =
            null;
    }
}


/*
 * =========================================================
 * Поиск и select-фильтры
 * =========================================================
 */

function setupSearchControl(
    renderRegularView
) {
    const input =
        elements.searchInput;

    if (
        !input ||
        typeof renderRegularView !==
        'function'
    ) {
        return;
    }

    const onInput =
        () => {
            scheduleSearchRender(
                renderRegularView
            );
        };

    input.addEventListener(
        'input',
        onInput
    );

    addCleanup(
        () => {
            input.removeEventListener(
                'input',
                onInput
            );
        }
    );
}


function scheduleSearchRender(
    renderRegularView
) {
    if (
        uiState.searchRenderTimer
    ) {
        window.clearTimeout(
            uiState.searchRenderTimer
        );
    }

    uiState.searchRenderTimer =
        window.setTimeout(
            () => {
                uiState.searchRenderTimer =
                    null;

                renderRegularView();
            },
            SEARCH_RENDER_DELAY
        );
}


function setupSelectFilters(
    renderRegularView
) {
    if (
        typeof renderRegularView !==
        'function'
    ) {
        return;
    }

    [
        elements.tagFilter,
        elements.videoFilter
    ]
        .filter(
            Boolean
        )
        .forEach(
            select => {
                const onChange =
                    () => {
                        renderRegularView();
                    };

                select.addEventListener(
                    'change',
                    onChange
                );

                addCleanup(
                    () => {
                        select.removeEventListener(
                            'change',
                            onChange
                        );
                    }
                );
            }
        );
}


/*
 * =========================================================
 * Избранное
 * =========================================================
 */

function setupFavoritesFilter(
    renderRegularView
) {
    const button =
        elements.favoritesFilter;

    if (
        !button ||
        typeof renderRegularView !==
        'function'
    ) {
        return;
    }

    const onClick =
        () => {
            setFavoritesFilter(
                !isFavoritesFilterActive()
            );

            renderRegularView();
        };

    button.addEventListener(
        'click',
        onClick
    );

    addCleanup(
        () => {
            button.removeEventListener(
                'click',
                onClick
            );
        }
    );
}


/*
 * Событие должно отправляться модулем favorites.js
 * после добавления или удаления карточки из избранного.
 *
 * Это позволяет сразу перерисовать список, если активен
 * фильтр «только избранное»: удалённая карточка исчезнет.
 */
function setupFavoritesChangeListener(
    renderRegularView
) {
    if (
        typeof renderRegularView !==
        'function'
    ) {
        return;
    }

    const onFavoritesChange =
        () => {
            renderRegularView();
        };

    window.addEventListener(
        'favoriteschange',
        onFavoritesChange
    );

    addCleanup(
        () => {
            window.removeEventListener(
                'favoriteschange',
                onFavoritesChange
            );
        }
    );
}


/*
 * =========================================================
 * Режим цен
 * =========================================================
 */

function setupPriceModeToggle() {
    const toggle =
        elements.priceModeToggle;

    if (
        !toggle
    ) {
        return;
    }

    const onChange =
        event => {
            setPriceMode(
                event.target.checked
            );
        };

    toggle.addEventListener(
        'change',
        onChange
    );

    addCleanup(
        () => {
            toggle.removeEventListener(
                'change',
                onChange
            );
        }
    );
}


/*
 * =========================================================
 * Сброс фильтров
 * =========================================================
 *
 * В отличие от старой версии, сбрасывается также
 * фильтр избранного. Иначе визуально фильтры могли быть
 * пустыми, но на странице оставались только избранные игры.
 */

function setupResetFiltersButton(
    renderRegularView
) {
    const button =
        elements.resetFiltersButton;

    if (
        !button ||
        typeof renderRegularView !==
        'function'
    ) {
        return;
    }

    const onClick =
        () => {
            resetFilters(
                renderRegularView
            );
        };

    button.addEventListener(
        'click',
        onClick
    );

    addCleanup(
        () => {
            button.removeEventListener(
                'click',
                onClick
            );
        }
    );
}


export function resetFilters(
    renderRegularView
) {
    if (
        elements.searchInput
    ) {
        elements.searchInput.value =
            '';
    }

    if (
        elements.tagFilter
    ) {
        elements.tagFilter.value =
            '';
    }

    if (
        elements.videoFilter
    ) {
        elements.videoFilter.value =
            '';
    }

    /*
     * Сбрасываем именно активный режим «только избранное».
     * Локальные сохранённые избранные игры не удаляются.
     */
    setFavoritesFilter(
        false
    );

    const url =
        new URL(
            window.location.href
        );

    /*
     * Очищает обычные фильтры и, если была открыта
     * расшаренная подборка, её параметры из URL.
     *
     * Hash не затрагивается.
     */
    url.search =
        '';

    window.history.replaceState(
        {},
        '',
        url
    );

    renderRegularView?.();
}


/*
 * =========================================================
 * Шаринг фильтров
 * =========================================================
 */

function setupShareFiltersButton() {
    const button =
        elements.shareFiltersButton;

    if (
        !button
    ) {
        return;
    }

    const onClick =
        () => {
            shareCurrentFilters(
                button
            );
        };

    button.addEventListener(
        'click',
        onClick
    );

    addCleanup(
        () => {
            button.removeEventListener(
                'click',
                onClick
            );
        }
    );
}


export async function shareCurrentFilters(
    button =
        elements.shareFiltersButton
) {
    /*
     * Сначала синхронизируем с URL строку поиска,
     * тег и выбранное видео.
     */
    updateUrlFromFilters();

    const url =
        new URL(
            window.location.href
        );

    /*
     * Избранное добавляется только если активирован
     * фильтр «только избранное».
     *
     * addFavoritesToUrl() должен сохранить существующий
     * shared-набор, если пользователь открыл чужую ссылку.
     */
    if (
        isFavoritesFilterActive()
    ) {
        addFavoritesToUrl(
            url
        );
    }

    try {
        await copyText(
            url.href
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

    /*
     * Fallback для окружений без Clipboard API,
     * включая некоторые варианты локального запуска.
     */
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

    textarea.style.padding =
        '0';

    textarea.style.border =
        '0';

    textarea.style.opacity =
        '0';

    textarea.setAttribute(
        'readonly',
        ''
    );

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
        uiState.shareButtonResetTimer
    ) {
        window.clearTimeout(
            uiState.shareButtonResetTimer
        );
    }

    uiState.shareButtonResetTimer =
        window.setTimeout(
            () => {
                button.title =
                    SHARE_BUTTON_DEFAULT_LABEL;

                button.setAttribute(
                    'aria-label',
                    SHARE_BUTTON_DEFAULT_LABEL
                );

                uiState.shareButtonResetTimer =
                    null;
            },
            1800
        );
}


/*
 * =========================================================
 * Масштаб карточек тир-листа
 * =========================================================
 */

function setupTierCardScaleControl() {
    const range =
        elements.tierCardScaleRange;

    if (
        !range
    ) {
        return;
    }

    const updateScale =
        () => {
            updateTierCardScale(
                range.value
            );
        };

    range.addEventListener(
        'input',
        updateScale
    );

    addCleanup(
        () => {
            range.removeEventListener(
                'input',
                updateScale
            );
        }
    );

    /*
     * Применяем начальное значение ползунка сразу
     * после загрузки страницы.
     */
    updateScale();
}


export function updateTierCardScale(
    rawValue
) {
    const value =
        Number(
            rawValue
        );

    if (
        !Number.isFinite(
            value
        )
    ) {
        return;
    }

    const normalizedScale =
        value / 100;

    document.documentElement.style.setProperty(
        '--tier-card-scale',
        String(
            normalizedScale
        )
    );

    if (
        elements.tierCardScaleValue
    ) {
        elements.tierCardScaleValue.textContent =
            `${value}%`;
    }
}


/*
 * =========================================================
 * Мобильная навигация по тирам
 * =========================================================
 */

function setupMobileTierNavigation() {
    const navigation =
        elements.mobileTierNavigation;

    if (
        !navigation
    ) {
        return;
    }

    const onClick =
        event => {
            const button =
                event.target.closest(
                    '[data-tier-target]'
                );

            if (
                !button ||
                !navigation.contains(
                    button
                )
            ) {
                return;
            }

            scrollToMobileTierTarget(
                button.dataset.tierTarget
            );
        };

    navigation.addEventListener(
        'click',
        onClick
    );

    addCleanup(
        () => {
            navigation.removeEventListener(
                'click',
                onClick
            );
        }
    );
}


function scrollToMobileTierTarget(
    target
) {
    if (
        target ===
        'HOME'
    ) {
        window.scrollTo(
            {
                top: 0,
                behavior: 'smooth'
            }
        );

        return;
    }

    if (
        !target
    ) {
        return;
    }

    const tierRow =
        getTierRow(
            target
        );

    if (
        !tierRow
    ) {
        return;
    }

    tierRow.scrollIntoView(
        {
            behavior: 'smooth',
            block: 'start'
        }
    );
}


/*
 * =========================================================
 * Кнопка «Наверх»
 * =========================================================
 *
 * Используется requestAnimationFrame-throttle:
 * при частом scroll обработчик запрашивает измерения DOM
 * не чаще одного раза за кадр.
 */

function setupBackToTop() {
    const button =
        elements.backToTopButton;

    const anchor =
        elements.controlsAnchor;

    if (
        !button ||
        !anchor
    ) {
        return;
    }

    const updateVisibility =
        () => {
            const anchorRect =
                anchor.getBoundingClientRect();

            const shouldShow =
                anchorRect.bottom < 0;

            button.classList.toggle(
                BACK_TO_TOP_VISIBLE_CLASS,
                shouldShow
            );
        };

    const scheduleVisibilityUpdate =
        () => {
            if (
                uiState.backToTopFrameId
            ) {
                return;
            }

            uiState.backToTopFrameId =
                window.requestAnimationFrame(
                    () => {
                        uiState.backToTopFrameId =
                            null;

                        updateVisibility();
                    }
                );
        };

    const onClick =
        () => {
            window.scrollTo(
                {
                    top: 0,
                    behavior: 'smooth'
                }
            );
        };

    button.addEventListener(
        'click',
        onClick
    );

    window.addEventListener(
        'scroll',
        scheduleVisibilityUpdate,
        {
            passive: true
        }
    );

    window.addEventListener(
        'resize',
        scheduleVisibilityUpdate,
        {
            passive: true
        }
    );

    addCleanup(
        () => {
            button.removeEventListener(
                'click',
                onClick
            );

            window.removeEventListener(
                'scroll',
                scheduleVisibilityUpdate
            );

            window.removeEventListener(
                'resize',
                scheduleVisibilityUpdate
            );
        }
    );

    updateVisibility();
}


/*
 * =========================================================
 * Кнопка презентации
 * =========================================================
 */

function setupPresentationButton(
    togglePresentation
) {
    const button =
        elements.videoPresentationButton;

    if (
        !button ||
        typeof togglePresentation !==
        'function'
    ) {
        return;
    }

    button.addEventListener(
        'click',
        togglePresentation
    );

    addCleanup(
        () => {
            button.removeEventListener(
                'click',
                togglePresentation
            );
        }
    );
}


/*
 * =========================================================
 * Служебные функции
 * =========================================================
 */

function addCleanup(
    cleanup
) {
    uiState.cleanupFunctions.push(
        cleanup
    );
}

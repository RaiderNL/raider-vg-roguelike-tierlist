/*
 * =========================================================
 * DOM-элементы приложения
 * =========================================================
 *
 * Все часто используемые элементы страницы кэшируются здесь
 * после события DOMContentLoaded.
 *
 * Остальные модули импортируют `elements` и не выполняют
 * повторные document.querySelector(...) без необходимости.
 */

import {
    TIER_NAMES
} from './config.js';


export const elements = {
    /*
     * Основная структура.
     */
    layout: null,
    tierList: null,
    controlsAnchor: null,

    /*
     * Фильтры.
     */
    searchInput: null,
    tagFilter: null,
    videoFilter: null,
    favoritesFilter: null,
    priceModeToggle: null,
    resetFiltersButton: null,
    shareFiltersButton: null,

    /*
     * Управление тир-листом.
     */
    tierCardScaleRange: null,
    tierCardScaleValue: null,
    screenshotButton: null,
    videoPresentationButton: null,

    /*
     * Навигация.
     */
    mobileTierNavigation: null,
    backToTopButton: null,

    /*
     * Контейнеры тиров.
     *
     * Пример:
     * elements.tierContainers.S
     * elements.tierContainers.A
     */
    tierContainers: {}
};


/*
 * =========================================================
 * Инициализация ссылок
 * =========================================================
 */

export function cacheDomElements() {
    elements.layout =
        document.querySelector(
            '.tier-list-layout'
        );

    elements.tierList =
        document.querySelector(
            '.tier-list'
        );

    /*
     * Новый интерфейс использует .tier-controls.
     * .controls оставлен как fallback для старой разметки.
     */
    elements.controlsAnchor =
        document.querySelector(
            '.tier-controls'
        ) ||
        document.querySelector(
            '.controls'
        );

    elements.searchInput =
        document.querySelector(
            '#search'
        );

    elements.tagFilter =
        document.querySelector(
            '#tag-filter'
        );

    elements.videoFilter =
        document.querySelector(
            '#video-filter'
        );

    elements.favoritesFilter =
        document.querySelector(
            '#favorites-filter'
        );

    elements.priceModeToggle =
        document.querySelector(
            '#price-mode-toggle'
        );

    elements.resetFiltersButton =
        document.querySelector(
            '#reset-filters'
        );

    elements.shareFiltersButton =
        document.querySelector(
            '#share-filters'
        );

    elements.tierCardScaleRange =
        document.querySelector(
            '#tier-card-scale-range'
        );

    elements.tierCardScaleValue =
        document.querySelector(
            '#tier-card-scale-value'
        );

    elements.screenshotButton =
        document.querySelector(
            '#download-tierlist-screenshot'
        );

    elements.videoPresentationButton =
        document.querySelector(
            '#video-presentation'
        );

    elements.mobileTierNavigation =
        document.querySelector(
            '.mobile-tier-navigation'
        );

    elements.backToTopButton =
        document.querySelector(
            '#back-to-top'
        );

    cacheTierContainers();
}


/*
 * =========================================================
 * Контейнеры тиров
 * =========================================================
 */

export function cacheTierContainers() {
    elements.tierContainers = {};

    TIER_NAMES.forEach(
        tier => {
            elements.tierContainers[tier] =
                document.querySelector(
                    `#tier-${tier}`
                );
        }
    );
}


export function getTierContainer(
    tier
) {
    return (
        elements.tierContainers[tier] ||
        null
    );
}


export function getTierRow(
    tier
) {
    const container =
        getTierContainer(
            tier
        );

    return (
        container?.closest(
            '.tier-row'
        ) ||
        null
    );
}


/*
 * =========================================================
 * Вспомогательные DOM-функции
 * =========================================================
 */

export function getElement(
    selector,
    parent = document
) {
    return parent.querySelector(
        selector
    );
}


export function getElements(
    selector,
    parent = document
) {
    return [
        ...parent.querySelectorAll(
            selector
        )
    ];
}

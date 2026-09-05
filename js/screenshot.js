/*
 * =========================================================
 * Экспорт тир-листа в PNG
 * =========================================================
 *
 * Поддерживаются два формата:
 *
 * - vertical:
 *   обычный вертикальный снимок всей высоты тир-листа;
 *
 * - landscape:
 *   адаптивный холст 1920 × 1080 для роликов, OBS,
 *   превью и публикаций в формате 16:9.
 *
 * Для горизонтального режима рассчитывается единый размер
 * карточек: все тиры вместе должны уместиться в 1920 × 1080.
 */

import {
    closeAllPreviews
} from './previews.js';

import {
    elements
} from './dom.js';


const SCREENSHOT_FORMAT_VERTICAL =
    'vertical';

const SCREENSHOT_FORMAT_LANDSCAPE =
    'landscape';

const SCREENSHOT_MENU_CLASS =
    'screenshot-format-menu';

const SCREENSHOT_MENU_OPTION_SELECTOR =
    '[data-screenshot-format]';

const SCREENSHOT_RENDER_CLASS =
    'tierlist-screenshot-render';

const SCREENSHOT_LANDSCAPE_CLASS =
    'tierlist-screenshot-landscape';

const SCREENSHOT_BUTTON_DEFAULT_LABEL =
    'Скачать скриншот тир-листа';

const SCREENSHOT_BUTTON_LOADING_LABEL =
    'Создание скриншота…';

const SCREENSHOT_IMAGE_TIMEOUT =
    15000;

const LANDSCAPE_WIDTH =
    1920;

const LANDSCAPE_HEIGHT =
    1080;


/*
 * =========================================================
 * Внутреннее состояние меню
 * =========================================================
 */

const screenshotState = {
    menuElement: null,
    cleanupMenuListeners: null,
    isDownloading: false
};


/*
 * =========================================================
 * Инициализация
 * =========================================================
 */

export function setupTierListScreenshot() {
    const button =
        elements.screenshotButton;

    if (
        !button
    ) {
        return;
    }

    button.setAttribute(
        'aria-haspopup',
        'menu'
    );

    button.setAttribute(
        'aria-expanded',
        'false'
    );

    button.addEventListener(
        'click',
        openTierListScreenshotDialog
    );
}


/*
 * =========================================================
 * Меню выбора формата
 * =========================================================
 */

export function openTierListScreenshotDialog() {
    const triggerButton =
        elements.screenshotButton;

    /*
     * Если кнопки в разметке нет, сохраняем полезное
     * fallback-поведение: создаём вертикальный скриншот.
     */
    if (
        !triggerButton
    ) {
        downloadTierListScreenshot(
            SCREENSHOT_FORMAT_VERTICAL
        );

        return;
    }

    /*
     * Повторный клик по кнопке закрывает меню.
     */
    if (
        screenshotState.menuElement
    ) {
        closeTierListScreenshotMenu();

        return;
    }

    const menu =
        createScreenshotFormatMenu();

    document.body.appendChild(
        menu
    );

    screenshotState.menuElement =
        menu;

    triggerButton.setAttribute(
        'aria-expanded',
        'true'
    );

    positionTierListScreenshotMenu(
        menu,
        triggerButton
    );

    setupScreenshotMenuEvents(
        menu,
        triggerButton
    );

    /*
     * Первый пункт получает фокус: меню можно сразу
     * использовать с клавиатуры.
     */
    const firstOption =
        menu.querySelector(
            SCREENSHOT_MENU_OPTION_SELECTOR
        );

    firstOption?.focus();
}


function createScreenshotFormatMenu() {
    const menu =
        document.createElement(
            'div'
        );

    menu.className =
        SCREENSHOT_MENU_CLASS;

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
                class="screenshot-format-icon"
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
                class="screenshot-format-icon"
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

    return menu;
}


function setupScreenshotMenuEvents(
    menu,
    triggerButton
) {
    const onMenuClick =
        event => {
            const option =
                event.target.closest(
                    SCREENSHOT_MENU_OPTION_SELECTOR
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
        };

    const onOutsidePointerDown =
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

    const onKeyDown =
        event => {
            if (
                event.key ===
                'Escape'
            ) {
                event.preventDefault();

                closeTierListScreenshotMenu();

                triggerButton.focus();

                return;
            }

            handleScreenshotMenuKeyboardNavigation(
                event,
                menu
            );
        };

    const updateMenuPosition =
        () => {
            if (
                screenshotState.menuElement !==
                menu
            ) {
                return;
            }

            positionTierListScreenshotMenu(
                menu,
                triggerButton
            );
        };

    menu.addEventListener(
        'click',
        onMenuClick
    );

    document.addEventListener(
        'pointerdown',
        onOutsidePointerDown
    );

    document.addEventListener(
        'keydown',
        onKeyDown
    );

    window.addEventListener(
        'resize',
        updateMenuPosition,
        {
            passive: true
        }
    );

    /*
     * При прокрутке кнопка может менять позицию,
     * поэтому закрываем меню — это проще и надёжнее,
     * чем держать меню «приклеенным» к движущейся кнопке.
     */
    window.addEventListener(
        'scroll',
        closeTierListScreenshotMenu,
        {
            passive: true,
            capture: true
        }
    );

    screenshotState.cleanupMenuListeners =
        () => {
            menu.removeEventListener(
                'click',
                onMenuClick
            );

            document.removeEventListener(
                'pointerdown',
                onOutsidePointerDown
            );

            document.removeEventListener(
                'keydown',
                onKeyDown
            );

            window.removeEventListener(
                'resize',
                updateMenuPosition
            );

            window.removeEventListener(
                'scroll',
                closeTierListScreenshotMenu,
                true
            );
        };
}


/*
 * Базовая keyboard-навигация по пунктам меню:
 * ArrowUp, ArrowDown, Home, End.
 */
function handleScreenshotMenuKeyboardNavigation(
    event,
    menu
) {
    const navigationKeys =
        [
            'ArrowDown',
            'ArrowUp',
            'Home',
            'End'
        ];

    if (
        !navigationKeys.includes(
            event.key
        )
    ) {
        return;
    }

    const options =
        [
            ...menu.querySelectorAll(
                SCREENSHOT_MENU_OPTION_SELECTOR
            )
        ];

    if (
        options.length === 0
    ) {
        return;
    }

    event.preventDefault();

    const currentIndex =
        options.indexOf(
            document.activeElement
        );

    let nextIndex =
        currentIndex;

    if (
        event.key ===
        'ArrowDown'
    ) {
        nextIndex =
            currentIndex < 0 ||
            currentIndex ===
            options.length - 1
                ? 0
                : currentIndex + 1;
    }

    if (
        event.key ===
        'ArrowUp'
    ) {
        nextIndex =
            currentIndex <= 0
                ? options.length - 1
                : currentIndex - 1;
    }

    if (
        event.key ===
        'Home'
    ) {
        nextIndex =
            0;
    }

    if (
        event.key ===
        'End'
    ) {
        nextIndex =
            options.length - 1;
    }

    options[
        nextIndex
    ]?.focus();
}


/*
 * Ставит меню над кнопкой и не даёт ему выйти
 * за левую или правую границу viewport.
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


export function closeTierListScreenshotMenu() {
    screenshotState.cleanupMenuListeners?.();

    screenshotState.cleanupMenuListeners =
        null;

    screenshotState.menuElement?.remove();

    screenshotState.menuElement =
        null;

    elements.screenshotButton?.setAttribute(
        'aria-expanded',
        'false'
    );
}


/*
 * =========================================================
 * Создание PNG
 * =========================================================
 */

export async function downloadTierListScreenshot(
    format = SCREENSHOT_FORMAT_VERTICAL
) {
    const tierList =
        elements.tierList;

    if (
        !tierList ||
        screenshotState.isDownloading
    ) {
        return;
    }

    if (
        typeof window.html2canvas !==
        'function'
    ) {
        window.alert(
            'Модуль скриншота ещё не загрузился.'
        );

        return;
    }

    const isLandscape =
        format ===
        SCREENSHOT_FORMAT_LANDSCAPE;

    screenshotState.isDownloading =
        true;

    setScreenshotButtonLoadingState(
        true
    );

    closeAllPreviews();

    try {
        await prepareImagesForScreenshot(
            tierList
        );

        /*
         * Даём браузеру два кадра на применение eager-loading
         * и перерасчёт размеров после загрузки изображений.
         */
        await waitForTwoAnimationFrames();

        const captureOptions =
            getScreenshotCaptureOptions(
                tierList,
                {
                    isLandscape
                }
            );

        const canvas =
            await window.html2canvas(
                tierList,
                captureOptions
            );

        downloadCanvasAsPng(
            canvas,
            {
                isLandscape
            }
        );
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
        screenshotState.isDownloading =
            false;

        setScreenshotButtonLoadingState(
            false
        );
    }
}


function setScreenshotButtonLoadingState(
    isLoading
) {
    const button =
        elements.screenshotButton;

    if (
        !button
    ) {
        return;
    }

    button.disabled =
        isLoading;

    const label =
        isLoading
            ? SCREENSHOT_BUTTON_LOADING_LABEL
            : SCREENSHOT_BUTTON_DEFAULT_LABEL;

    button.title =
        label;

    button.setAttribute(
        'aria-label',
        label
    );
}


/*
 * =========================================================
 * Опции html2canvas
 * =========================================================
 */

function getScreenshotCaptureOptions(
    tierList,
    {
        isLandscape = false
    } = {}
) {
    const sourceWidth =
        Math.ceil(
            tierList.scrollWidth
        );

    const sourceHeight =
        Math.ceil(
            tierList.scrollHeight
        );

    const width =
        isLandscape
            ? LANDSCAPE_WIDTH
            : sourceWidth;

    const height =
        isLandscape
            ? LANDSCAPE_HEIGHT
            : sourceHeight;

    return {
        backgroundColor:
            '#f3f4f6',

        /*
         * Retinа-качество без чрезмерно тяжёлых файлов.
         */
        scale:
            2,

        useCORS:
            true,

        allowTaint:
            false,

        logging:
            false,

        imageTimeout:
            SCREENSHOT_IMAGE_TIMEOUT,

        scrollX:
            0,

        scrollY:
            0,

        width,
        height,

        /*
         * В горизонтальном режиме cloned document получает
         * desktop viewport, чтобы мобильные media-query
         * не влияли на экспортную раскладку.
         */
        windowWidth:
            isLandscape
                ? LANDSCAPE_WIDTH
                : window.innerWidth,

        windowHeight:
            isLandscape
                ? LANDSCAPE_HEIGHT
                : window.innerHeight,

        onclone:
            clonedDocument => {
                prepareClonedTierListForScreenshot(
                    clonedDocument,
                    {
                        isLandscape
                    }
                );
            }
    };
}


/*
 * =========================================================
 * Подготовка клона для html2canvas
 * =========================================================
 */

function prepareClonedTierListForScreenshot(
    clonedDocument,
    {
        isLandscape = false
    } = {}
) {
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
        SCREENSHOT_RENDER_CLASS
    );

    if (
        isLandscape
    ) {
        clonedTierList.classList.add(
            SCREENSHOT_LANDSCAPE_CLASS
        );
    }

    const screenshotStyles =
        clonedDocument.createElement(
            'style'
        );

    screenshotStyles.textContent =
        getScreenshotCloneStyles();

    clonedDocument.head.appendChild(
        screenshotStyles
    );

    if (
        isLandscape
    ) {
        applyAdaptiveLandscapeScreenshotLayout(
            clonedTierList
        );
    }

    /*
     * html2canvas не всегда корректно обрабатывает
     * object-fit: cover. Заменяем его ручным расчётом
     * геометрии изображения в каждом .game-media.
     */
    applyCoverImageLayout(
        clonedTierList
    );
}


/*
 * Стили применяются только к клону, а не к живой странице.
 *
 * Важно: строка вынесена в отдельную функцию, чтобы
 * downloadTierListScreenshot() не превращалась в огромный
 * нечитаемый блок.
 */
function getScreenshotCloneStyles() {
    return `
        *,
        *::before,
        *::after {
            animation: none !important;
            transition: none !important;
        }

        .tierlist-screenshot-render .game-card,
        .tierlist-screenshot-render .game-card:hover,
        .tierlist-screenshot-render .game-card:focus,
        .tierlist-screenshot-render .game-card:focus-within {
            opacity: 1 !important;
            filter: none !important;
            transform: none !important;
            box-shadow: none !important;
        }

        .tierlist-screenshot-render .tier-row {
            overflow: hidden !important;
            box-shadow: none !important;
        }

        .tierlist-screenshot-render .games-container {
            overflow: hidden !important;
        }

        .tierlist-screenshot-render .favorite-button,
        .tierlist-screenshot-render .game-preview-popup {
            display: none !important;
        }

        .tierlist-screenshot-render .game-card {
            flex-shrink: 0 !important;
        }

        .tierlist-screenshot-render .game-media {
            position: relative !important;
            overflow: hidden !important;
        }

        .tierlist-screenshot-render .game-cover {
            position: absolute !important;

            display: block !important;

            min-width: 0 !important;
            min-height: 0 !important;
            max-width: none !important;
            max-height: none !important;

            object-position: center !important;
        }

        /*
         * =================================================
         * Горизонтальный экспорт 1920 × 1080
         * =================================================
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

        .tierlist-screenshot-render.tierlist-screenshot-landscape
        .tier-row {
            display: flex !important;
            flex: 0 0 auto !important;

            width: 100% !important;
            min-width: 0 !important;
            min-height: 0 !important;

            overflow: hidden !important;
        }

        .tierlist-screenshot-render.tierlist-screenshot-landscape
        .tier-label {
            flex: 0 0 76px !important;

            width: 76px !important;
            min-width: 76px !important;
            height: 100% !important;

            font-size: 25px !important;
            line-height: 1 !important;
        }

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

            grid-template-rows:
                minmax(0, 64%)
                minmax(0, 36%) !important;
        }

        /*
         * В горизонтальном PNG скрываем теги и цену:
         * они слишком малы при большом числе карточек.
         * Обложка и название остаются читаемыми.
         */
        .tierlist-screenshot-render.tierlist-screenshot-landscape
        .game-tags,
        .tierlist-screenshot-render.tierlist-screenshot-landscape
        .game-price {
            display: none !important;
        }

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
            text-overflow: clip !important;
            white-space: normal !important;

            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
        }
    `;
}


/*
 * =========================================================
 * Подготовка изображений
 * =========================================================
 */

async function prepareImagesForScreenshot(
    tierList
) {
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
            waitForImage
        )
    );
}


function waitForImage(
    image
) {
    if (
        image.complete
    ) {
        /*
         * decode() даёт более надёжный результат,
         * но поддерживается не во всех браузерах.
         */
        if (
            typeof image.decode ===
            'function'
        ) {
            return image.decode().catch(
                () => {}
            );
        }

        return Promise.resolve();
    }

    return new Promise(
        resolve => {
            const timeoutId =
                window.setTimeout(
                    resolve,
                    SCREENSHOT_IMAGE_TIMEOUT
                );

            const finish =
                () => {
                    window.clearTimeout(
                        timeoutId
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


function waitForTwoAnimationFrames() {
    return new Promise(
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
}


/*
 * =========================================================
 * Исправление object-fit: cover для html2canvas
 * =========================================================
 */

function applyCoverImageLayout(
    root
) {
    root
        .querySelectorAll(
            '.game-media'
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
                 * Аналог object-fit: cover.
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

                setImportantStyle(
                    image,
                    {
                        position: 'absolute',
                        display: 'block',
                        width: `${renderedWidth}px`,
                        height: `${renderedHeight}px`,
                        maxWidth: 'none',
                        maxHeight: 'none',
                        left: `${offsetLeft}px`,
                        top: `${offsetTop}px`,
                        right: 'auto',
                        bottom: 'auto',
                        objectFit: 'fill'
                    }
                );
            }
        );
}


function setImportantStyle(
    element,
    styles
) {
    Object.entries(
        styles
    ).forEach(
        (
            [
                property,
                value
            ]
        ) => {
            const cssProperty =
                property.replace(
                    /[A-Z]/g,
                    letter =>
                        `-${letter.toLowerCase()}`
                );

            element.style.setProperty(
                cssProperty,
                value,
                'important'
            );
        }
    );
}


/*
 * =========================================================
 * Умная раскладка горизонтального PNG
 * =========================================================
 *
 * Холст: 1920 × 1080.
 *
 * Алгоритм перебирает размер карточки от крупного к мелкому
 * и выбирает максимальный единый размер, при котором:
 *
 * - карточки могут переноситься на несколько строк;
 * - семь тиров S–F помещаются по общей высоте;
 * - пустые тиры остаются видимыми;
 * - список не выходит за границы 16:9-кадра.
 */

function applyAdaptiveLandscapeScreenshotLayout(
    tierList
) {
    const outerPaddingX =
        18;

    const outerPaddingY =
        18;

    const tierGap =
        6;

    const tierLabelWidth =
        76;

    const gamesPaddingX =
        16;

    const gamesPaddingY =
        10;

    const cardGap =
        6;

    const minimumTierHeight =
        48;

    const maximumCardSize =
        150;

    const minimumCardSize =
        32;

    const tierRows =
        [
            ...tierList.querySelectorAll(
                '.tier-row'
            )
        ];

    const gamesAvailableWidth =
        LANDSCAPE_WIDTH -
        outerPaddingX * 2 -
        tierLabelWidth -
        gamesPaddingX -
        2;

    const availableRowsHeight =
        LANDSCAPE_HEIGHT -
        outerPaddingY * 2 -
        tierGap *
        Math.max(
            0,
            tierRows.length - 1
        );

    const layout =
        findLandscapeLayout(
            tierRows,
            {
                gamesAvailableWidth,
                availableRowsHeight,
                cardGap,
                gamesPaddingY,
                minimumTierHeight,
                maximumCardSize,
                minimumCardSize
            }
        );

    applyLandscapeLayoutToDom(
        tierList,
        layout,
        {
            availableRowsHeight
        }
    );
}


/*
 * Чистый расчёт: функция не меняет DOM.
 */
function findLandscapeLayout(
    tierRows,
    {
        gamesAvailableWidth,
        availableRowsHeight,
        cardGap,
        gamesPaddingY,
        minimumTierHeight,
        maximumCardSize,
        minimumCardSize
    }
) {
    for (
        let cardSize = maximumCardSize;
        cardSize >= minimumCardSize;
        cardSize -= 1
    ) {
        const candidate =
            createLandscapeLayoutCandidate(
                tierRows,
                {
                    cardSize,
                    gamesAvailableWidth,
                    cardGap,
                    gamesPaddingY,
                    minimumTierHeight
                }
            );

        if (
            candidate.totalRowsHeight <=
            availableRowsHeight
        ) {
            return candidate;
        }
    }

    /*
     * Экстремальный fallback: даже при огромном количестве
     * игр экспорт не должен падать.
     */
    return createLandscapeLayoutCandidate(
        tierRows,
        {
            cardSize:
                minimumCardSize,

            gamesAvailableWidth,
            cardGap,
            gamesPaddingY,
            minimumTierHeight
        }
    );
}


function createLandscapeLayoutCandidate(
    tierRows,
    {
        cardSize,
        gamesAvailableWidth,
        cardGap,
        gamesPaddingY,
        minimumTierHeight
    }
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
                                linesCount - 1
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

    return {
        cardSize,
        cardsPerLine,
        tiers,
        totalRowsHeight
    };
}


/*
 * DOM-применение подготовленного расчёта.
 */
function applyLandscapeLayoutToDom(
    tierList,
    layout,
    {
        availableRowsHeight
    }
) {
    const {
        cardSize,
        tiers,
        totalRowsHeight
    } = layout;

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

    tierList.style.setProperty(
        'width',
        `${LANDSCAPE_WIDTH}px`,
        'important'
    );

    tierList.style.setProperty(
        'height',
        `${LANDSCAPE_HEIGHT}px`,
        'important'
    );

    tierList.style.setProperty(
        'min-height',
        `${LANDSCAPE_HEIGHT}px`,
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

            setImportantStyle(
                tierRow,
                {
                    height:
                        `${rowHeight}px`,

                    minHeight:
                        `${rowHeight}px`,

                    maxHeight:
                        `${rowHeight}px`,

                    flex:
                        `0 0 ${rowHeight}px`
                }
            );

            if (
                !gamesContainer
            ) {
                return;
            }

            setImportantStyle(
                gamesContainer,
                {
                    flexWrap:
                        'wrap',

                    gap:
                        '6px',

                    alignContent:
                        'center'
                }
            );

            gamesContainer
                .querySelectorAll(
                    '.game-card'
                )
                .forEach(
                    card => {
                        setImportantStyle(
                            card,
                            {
                                width:
                                    `${cardSize}px`,

                                height:
                                    `${cardSize}px`,

                                minWidth:
                                    `${cardSize}px`,

                                minHeight:
                                    `${cardSize}px`,

                                maxWidth:
                                    `${cardSize}px`,

                                maxHeight:
                                    `${cardSize}px`,

                                flex:
                                    `0 0 ${cardSize}px`
                            }
                        );
                    }
                );
        }
    );
}


/*
 * =========================================================
 * Скачивание canvas
 * =========================================================
 */

function downloadCanvasAsPng(
    canvas,
    {
        isLandscape = false
    } = {}
) {
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
}

let currentDragState = null;

let currentLayoutGetter = null;
let currentLayoutChangeHandler = null;

let dragAndDropIsInitialized = false;
let customCardsObserver = null;

let layoutAnimationFrame = null;
const SIDE_TRASH_ZONE_SELECTOR =
    '.custom-side-trash-zone';

const SIDE_TRASH_EDGE_GAP =
    4;

let pendingPlaceholderUpdateTimer = null;
let lastPointerSample = null;

const PLACEHOLDER_SPEED_LIMIT = 0.45;
const PLACEHOLDER_SETTLE_DELAY = 70;

let placeholderAnimation = null;



/*
 * =========================================================
 * Инициализация drag-and-drop
 * =========================================================
 */

export function setupCustomDragAndDrop({
    getLayout,
    onLayoutChange
} = {}) {
    currentLayoutGetter =
        typeof getLayout === 'function'
            ? getLayout
            : null;

    currentLayoutChangeHandler =
        typeof onLayoutChange === 'function'
            ? onLayoutChange
            : null;

    if (
        dragAndDropIsInitialized
    ) {
        updateDraggableCards();

        return;
    }

    document.addEventListener(
        'dragstart',
        handleDragStart
    );

    document.addEventListener(
        'dragover',
        handleDragOver
    );

    document.addEventListener(
        'dragenter',
        handleDragEnter
    );

    document.addEventListener(
        'dragleave',
        handleDragLeave
    );

    document.addEventListener(
        'drop',
        handleDrop
    );

    document.addEventListener(
        'dragend',
        handleDragEnd
    );

    dragAndDropIsInitialized =
        true;

    updateDraggableCards();
    setupCardsObserver();
}


/*
 * =========================================================
 * Начало перетаскивания
 * =========================================================
 */

function handleDragStart(
    event
) {
    if (
        !isEditMode()
    ) {
        event.preventDefault();

        return;
    }

    const card =
        getGameCard(
            event.target
        );

    if (
        !card
    ) {
        return;
    }

    const gameId =
        String(
            card.dataset.gameId || ''
        ).trim();

    const layout =
        currentLayoutGetter?.();

    const sourceTier =
        findGameTier(
            layout,
            gameId
        );

    if (
        !gameId ||
        !sourceTier ||
        !Array.isArray(
            layout?.[sourceTier]
        )
    ) {
        return;
    }

    currentDragState = {
        gameId,
        card,
        sourceTier,
        sourceIndex:
            layout[sourceTier].indexOf(
                gameId
            ),
        dropZone: null,
        placement: null
    };
    lastPointerSample =
    null;

cancelPendingPlaceholderUpdate();


    card.classList.add(
        'is-dragging'
    );

    document.body.classList.add(
        'custom-drag-active'
    );

    if (
        event.dataTransfer
    ) {
        event.dataTransfer.effectAllowed =
            'move';

        event.dataTransfer.setData(
            'text/plain',
            gameId
        );
    }
}


/*
 * =========================================================
 * Наведение во время перетаскивания
 * =========================================================
 */

function handleDragOver(
    event
) {
    if (
        !isEditMode() ||
        !currentDragState
    ) {
        return;
    }

    event.preventDefault();

    if (
        event.dataTransfer
    ) {
        event.dataTransfer.dropEffect =
            'move';
    }

    /*
     * Сначала проверяем выход курсора
     * за левую или правую границу основного
     * содержимого.
     */
    const sideTrashZone =
        updateSideTrashZones(
            event
        );

    if (
        sideTrashZone
    ) {
        currentDragState.dropZone =
            sideTrashZone;

        currentDragState.placement =
            null;

        currentDragState.placeholderKey =
            null;

        removeDropPlaceholder();

        setActiveDropZone(
            sideTrashZone
        );

        return;
    }

    /*
     * Если курсор вернулся в основную область,
     * боковые зоны скрываются.
     */
    hideSideTrashZones();

    const dropZone =
        getDropZone(
            event.target
        );

    if (
        !dropZone
    ) {
        return;
    }

    currentDragState.dropZone =
        dropZone;

    setActiveDropZone(
        dropZone
    );

    updateDropPlaceholder(
        event,
        dropZone
    );
}

function updateSideTrashZones(
    event
) {
    const editorContent =
        document.querySelector(
            '#custom-editor-content'
        );

    const leftZone =
        document.querySelector(
            '#custom-trash-zone-left'
        );

    const rightZone =
        document.querySelector(
            '#custom-trash-zone-right'
        );

    if (
        !editorContent ||
        !leftZone ||
        !rightZone
    ) {
        return null;
    }

    const editorRect =
        editorContent.getBoundingClientRect();

    const isOutsideLeft =
        event.clientX <
        editorRect.left -
        SIDE_TRASH_EDGE_GAP;

    const isOutsideRight =
        event.clientX >
        editorRect.right +
        SIDE_TRASH_EDGE_GAP;

    leftZone.classList.toggle(
        'is-edge-visible',
        isOutsideLeft
    );

    rightZone.classList.toggle(
        'is-edge-visible',
        isOutsideRight
    );

    if (
        isOutsideLeft
    ) {
        return leftZone;
    }

    if (
        isOutsideRight
    ) {
        return rightZone;
    }

    return null;
}
function hideSideTrashZones() {
    document
        .querySelectorAll(
            SIDE_TRASH_ZONE_SELECTOR
        )
        .forEach(
            zone => {
                zone.classList.remove(
                    'is-edge-visible'
                );

                zone.classList.remove(
                    'is-drop-target'
                );
            }
        );
}


function updatePointerSpeed(
    event
) {
    const now =
        performance.now();

    const currentSample = {
        x: event.clientX,
        y: event.clientY,
        time: now
    };

    if (
        !lastPointerSample
    ) {
        lastPointerSample =
            currentSample;

        return 0;
    }

    const elapsed =
        Math.max(
            1,
            now -
            lastPointerSample.time
        );

    const distance =
        Math.hypot(
            currentSample.x -
                lastPointerSample.x,
            currentSample.y -
                lastPointerSample.y
        );

    const speed =
        distance /
        elapsed;

    lastPointerSample =
        currentSample;

    return speed;
}

function schedulePlaceholderUpdate(
    event,
    dropZone
) {
    if (
        pendingPlaceholderUpdateTimer
    ) {
        clearTimeout(
            pendingPlaceholderUpdateTimer
        );
    }

    const pointerPosition = {
        clientX: event.clientX,
        clientY: event.clientY
    };

    pendingPlaceholderUpdateTimer =
        window.setTimeout(
            () => {
                pendingPlaceholderUpdateTimer =
                    null;

                if (
                    !currentDragState ||
                    !isEditMode() ||
                    !dropZone.isConnected
                ) {
                    return;
                }

                /*
                 * К этому моменту курсор должен был
                 * немного замедлиться или остановиться.
                 * Используем последнюю запомненную
                 * координату, а не старый DragEvent.
                 */
                updateDropPlaceholder(
                    pointerPosition,
                    dropZone
                );
            },
            PLACEHOLDER_SETTLE_DELAY
        );
}


function cancelPendingPlaceholderUpdate() {
    if (
        pendingPlaceholderUpdateTimer
    ) {
        clearTimeout(
            pendingPlaceholderUpdateTimer
        );

        pendingPlaceholderUpdateTimer =
            null;
    }
}

function handleDragEnter(
    event
) {
    if (
        !isEditMode() ||
        !currentDragState
    ) {
        return;
    }

    const sideTrashZone =
        updateSideTrashZones(
            event
        );

    if (
        sideTrashZone
    ) {
        currentDragState.dropZone =
            sideTrashZone;

        currentDragState.placement =
            null;

        removeDropPlaceholder();

        setActiveDropZone(
            sideTrashZone
        );

        return;
    }

    hideSideTrashZones();

    const dropZone =
        getDropZone(
            event.target
        );

    if (
        !dropZone
    ) {
        return;
    }

    currentDragState.dropZone =
        dropZone;

    setActiveDropZone(
        dropZone
    );
}



function handleDragLeave(
    event
) {
    const sideTrashZone =
        event.target instanceof Element
            ? event.target.closest(
                SIDE_TRASH_ZONE_SELECTOR
            )
            : null;

    if (
        sideTrashZone
    ) {
        /*
         * Не скрываем зоны при переходе
         * между самой зоной и её дочерними
         * элементами.
         */
        if (
            event.relatedTarget instanceof Node &&
            sideTrashZone.contains(
                event.relatedTarget
            )
        ) {
            return;
        }

        sideTrashZone.classList.remove(
            'is-drop-target'
        );

        return;
    }

    const dropZone =
        getDropZone(
            event.target
        );

    if (
        !dropZone
    ) {
        return;
    }

    if (
        event.relatedTarget instanceof Node &&
        dropZone.contains(
            event.relatedTarget
        )
    ) {
        return;
    }

    dropZone.classList.remove(
        'is-drop-target'
    );
}


/*
 * =========================================================
 * Расчёт позиции placeholder
 * =========================================================
 */

function updateDropPlaceholder(
    event,
    dropZone
) {
    if (
        !currentDragState
    ) {
        return;
    }

    const targetTier =
        getTargetTier(
            dropZone
        );

    if (
        !targetTier
    ) {
        return;
    }

    /*
     * В корзине placeholder не используется.
     */
    if (
        targetTier === 'REMOVED'
    ) {
        removeDropPlaceholder();

        currentDragState.placement =
            null;

        return;
    }

    const placeholder =
        getDropPlaceholder();

    /*
     * Пока курсор находится над placeholder,
     * не переставляем его повторно.
     */
    if (
        placeholder.parentElement === dropZone &&
        isPointerInsideExpandedElement(
            event,
            placeholder
        )
    ) {
        return;
    }

    const targetCard =
        getCardUnderPointer(
            event,
            dropZone
        );

    /*
     * Если курсор находится над исходной
     * карточкой, сохраняем текущую позицию.
     */
    if (
        targetCard === currentDragState.card
    ) {
        return;
    }

    /*
     * Если курсор не над карточкой,
     * вставляем placeholder в конец.
     */
        /*
     * Если курсор находится в свободной области,
     * ничего не меняем.
     *
     * Placeholder остаётся на последней
     * подтверждённой позиции и не перескакивает
     * в конец списка.
     */
    if (
        !targetCard
    ) {
        return;
    }


    const targetGameId =
        String(
            targetCard.dataset.gameId || ''
        ).trim();

    const layout =
        currentLayoutGetter?.();

    const targetIndex =
        layout?.[targetTier]?.indexOf(
            targetGameId
        );

    if (
        targetIndex === undefined ||
        targetIndex < 0
    ) {
        return;
    }

    const targetBounds =
        targetCard.getBoundingClientRect();

    const insertAfter =
        isPointerAfterCard(
            event,
            targetBounds
        );

    const referenceCard =
        insertAfter
            ? getNextGameCard(
                targetCard,
                dropZone
            )
            : targetCard;

    const insertionIndex =
        targetIndex +
        (
            insertAfter
                ? 1
                : 0
        );

    placePlaceholderBefore(
        placeholder,
        dropZone,
        referenceCard
    );

    currentDragState.placement = {
        tier: targetTier,
        index: insertionIndex
    };
}


/*
 * =========================================================
 * Определение карточки под курсором
 * =========================================================
 */

function getCardUnderPointer(
    event,
    dropZone
) {
    const cards =
        getDropZoneCards(
            dropZone
        );

    for (
        const card of cards
    ) {
        const bounds =
            card.getBoundingClientRect();

        const isInside =
            event.clientX >= bounds.left &&
            event.clientX <= bounds.right &&
            event.clientY >= bounds.top &&
            event.clientY <= bounds.bottom;

        if (
            isInside
        ) {
            return card;
        }
    }

    return null;
}


function getDropZoneCards(
    dropZone
) {
    return [
        ...dropZone.querySelectorAll(
            '[data-game-id]'
        )
    ].filter(
        card =>
            card !== currentDragState?.card &&
            card.id !== 'custom-drop-placeholder'
    );
}


function getGameCard(
    element
) {
    if (
        !(element instanceof Element)
    ) {
        return null;
    }

    const card =
        element.closest(
            '[data-game-id]'
        );

    if (
        !card ||
        card.id === 'custom-drop-placeholder'
    ) {
        return null;
    }

    return card;
}


function getNextGameCard(
    card,
    dropZone
) {
    let nextElement =
        card.nextElementSibling;

    while (
        nextElement
    ) {
        if (
            nextElement !==
            currentDragState?.card &&
            nextElement.id !==
            'custom-drop-placeholder' &&
            nextElement.matches(
                '[data-game-id]'
            )
        ) {
            return nextElement;
        }

        nextElement =
            nextElement.nextElementSibling;
    }

    return null;
}


/*
 * =========================================================
 * Размещение placeholder
 * =========================================================
 */



function placePlaceholderBefore(
    placeholder,
    dropZone,
    referenceCard
) {
    /*
     * Если referenceCard отсутствует,
     * значит placeholder должен находиться
     * после последней карточки.
     */
    if (
        !referenceCard
    ) {
        const lastElement =
            dropZone.lastElementChild;

        if (
            lastElement === placeholder
        ) {
            return;
        }

        animateDropZoneChange(
            dropZone,
            () => {
                dropZone.appendChild(
                    placeholder
                );

                showPlaceholder(
                    placeholder
                );
            }
        );

        return;
    }

    /*
     * Placeholder уже находится
     * непосредственно перед нужной карточкой.
     */
    if (
        placeholder.parentElement === dropZone &&
        placeholder.nextElementSibling === referenceCard
    ) {
        return;
    }

    animateDropZoneChange(
        dropZone,
        () => {
            dropZone.insertBefore(
                placeholder,
                referenceCard
            );

            showPlaceholder(
                placeholder
            );
        }
    );
}

function showPlaceholder(
    placeholder
) {
    if (
        placeholder.classList.contains(
            'is-visible'
        )
    ) {
        return;
    }

    requestAnimationFrame(
        () => {
            placeholder.classList.add(
                'is-visible'
            );
        }
    );
}


/*
 * =========================================================
 * FLIP-анимация layout
 * =========================================================
 */

/*
 * Анимирует карточки и строки после изменения
 * положения placeholder или перерисовки списка.
 */
export function animateCustomLayoutChange(
    root,
    change,
    {
        animateRows: shouldAnimateRows = true
    } = {}
) {
    if (
        !root ||
        typeof change !== 'function' ||
        isReducedMotion()
    ) {
        change?.();

        return;
    }

    const cards =
        [
            ...root.querySelectorAll(
                '.game-card'
            )
        ].filter(
            card =>
                card !== currentDragState?.card &&
                card.id !== 'custom-drop-placeholder'
        );

    const rows =
        shouldAnimateRows
            ? [
                ...root.querySelectorAll(
                    '.custom-tier-row'
                )
            ]
            : [];

    const previousCardRects =
        new Map();

    const previousRowRects =
        new Map();

    cards.forEach(
        card => {
            previousCardRects.set(
                card,
                card.getBoundingClientRect()
            );
        }
    );

    rows.forEach(
        row => {
            previousRowRects.set(
                row,
                row.getBoundingClientRect()
            );
        }
    );

    change();

    /*
     * Принудительно рассчитываем новый layout
     * до начала анимации.
     */
    root.getBoundingClientRect();

    if (
        layoutAnimationFrame
    ) {
        cancelAnimationFrame(
            layoutAnimationFrame
        );
    }

    layoutAnimationFrame =
        requestAnimationFrame(
            () => {
                animateCards(
                    cards,
                    previousCardRects
                );

                if (
                    shouldAnimateRows
                ) {
                    animateRows(
                        rows,
                        previousRowRects
                    );
                }

                layoutAnimationFrame =
                    null;
            }
        );
}


function animateDropZoneChange(
    dropZone,
    change
) {
    const root =
        document.querySelector(
            '.custom-editor-content'
        ) ||
        dropZone;

    const placeholder =
        document.querySelector(
            '#custom-drop-placeholder'
        );

    const previousRect =
        capturePlaceholderRect(
            placeholder
        );

    /*
     * Во время перемещения placeholder
     * не анимируем transform самих строк.
     *
     * Иначе transform строки и transform
     * placeholder начинают складываться.
     */
    animateCustomLayoutChange(
        root,
        change,
        {
            animateRows: false
        }
    );

    /*
     * Сразу после изменения DOM измеряем новое
     * реальное положение placeholder.
     *
     * Не откладываем это ещё на один rAF:
     * именно это вызывало первые рывки.
     */
    animatePlaceholderMove(
        placeholder,
        previousRect
    );
}


function capturePlaceholderRect(
    placeholder
) {
    if (
        !placeholder ||
        !placeholder.isConnected
    ) {
        return null;
    }

    /*
     * Сначала получаем фактическое визуальное
     * положение placeholder на экране.
     */
    const rect =
        placeholder.getBoundingClientRect();

    if (
        placeholderAnimation
    ) {
        placeholderAnimation.cancel();

        placeholderAnimation =
            null;
    }

    return rect;
}


function animatePlaceholderMove(
    placeholder,
    previousRect
) {
    if (
        !placeholder ||
        !placeholder.isConnected ||
        !previousRect ||
        isReducedMotion()
    ) {
        return;
    }

    const currentRect =
        placeholder.getBoundingClientRect();

    const deltaX =
        previousRect.left -
        currentRect.left;

    const deltaY =
        previousRect.top -
        currentRect.top;

    if (
        Math.abs(deltaX) < 1 &&
        Math.abs(deltaY) < 1
    ) {
        return;
    }

    if (
        placeholderAnimation
    ) {
        placeholderAnimation.cancel();

        placeholderAnimation =
            null;
    }

    const animation =
        placeholder.animate(
            [
                {
                    transform:
                        `translate(${deltaX}px, ${deltaY}px)`
                },
                {
                    transform:
                        'translate(0, 0)'
                }
            ],
            {
                duration: 180,
                easing:
                    'cubic-bezier(0.22, 1, 0.36, 1)',
                fill: 'both'
            }
        );

    placeholderAnimation =
        animation;

    animation.onfinish =
        () => {
            if (
                placeholderAnimation !== animation
            ) {
                return;
            }

            animation.cancel();

            placeholderAnimation =
                null;
        };

    animation.oncancel =
        () => {
            if (
                placeholderAnimation === animation
            ) {
                placeholderAnimation =
                    null;
            }
        };
}



function animateCards(
    cards,
    previousRects
) {
    cards.forEach(
        card => {
            const previousRect =
                previousRects.get(
                    card
                );

            if (
                !previousRect ||
                !card.isConnected
            ) {
                return;
            }

            const currentRect =
                card.getBoundingClientRect();

            const deltaX =
                previousRect.left -
                currentRect.left;

            const deltaY =
                previousRect.top -
                currentRect.top;

            if (
                Math.abs(deltaX) < 1 &&
                Math.abs(deltaY) < 1
            ) {
                return;
            }

            animateElement(
                card,
                [
                    {
                        transform:
                            `translate(${deltaX}px, ${deltaY}px)`
                    },
                    {
                        transform:
                            'translate(0, 0)'
                    }
                ],
                260
            );
        }
    );
}


function animateRows(
    rows,
    previousRects
) {
    rows.forEach(
        row => {
            const previousRect =
                previousRects.get(
                    row
                );

            if (
                !previousRect ||
                !row.isConnected
            ) {
                return;
            }

            const currentRect =
                row.getBoundingClientRect();

            const deltaX =
                previousRect.left -
                currentRect.left;

            const deltaY =
                previousRect.top -
                currentRect.top;

            const heightChanged =
                Math.abs(
                    previousRect.height -
                    currentRect.height
                ) >= 1;

            const positionChanged =
                Math.abs(deltaX) >= 1 ||
                Math.abs(deltaY) >= 1;

            if (
                !heightChanged &&
                !positionChanged
            ) {
                return;
            }

            const animations = [];

            if (
                positionChanged
            ) {
                animations.push({
                    transform:
                        `translate(${deltaX}px, ${deltaY}px)`
                });
            }

            if (
                heightChanged
            ) {
                animations[0] = {
                    ...(animations[0] || {}),
                    height:
                        `${previousRect.height}px`
                };

                animations.push({
                    transform:
                        'translate(0, 0)',
                    height:
                        `${currentRect.height}px`
                });
            } else {
                animations.push({
                    transform:
                        'translate(0, 0)'
                });
            }

            const animation =
                row.animate(
                    animations,
                    {
                        duration: 300,
                        easing:
                            'cubic-bezier(0.22, 1, 0.36, 1)',
                        fill: 'both'
                    }
                );

            animation.onfinish =
                () => {
                    row.style.height =
                        '';

                    animation.cancel();
                };
        }
    );
}


function animateElement(
    element,
    keyframes,
    duration
) {
    const animation =
        element.animate(
            keyframes,
            {
                duration,
                easing:
                    'cubic-bezier(0.22, 1, 0.36, 1)',
                fill: 'both'
            }
        );

    animation.onfinish =
        () => {
            animation.cancel();
        };
}


/*
 * =========================================================
 * Определение стороны карточки
 * =========================================================
 */

function isPointerAfterCard(
    event,
    bounds
) {
    const verticalMiddle =
        bounds.top +
        (
            bounds.height / 2
        );

    const horizontalMiddle =
        bounds.left +
        (
            bounds.width / 2
        );

    const isSameRow =
        Math.abs(
            event.clientY - verticalMiddle
        ) <
        (
            bounds.height / 3
        );

    if (
        isSameRow
    ) {
        return event.clientX > horizontalMiddle;
    }

    return event.clientY > verticalMiddle;
}


/*
 * =========================================================
 * Проверка нахождения мыши внутри элемента
 * =========================================================
 */

function isPointerInsideExpandedElement(
    event,
    element
) {
    const bounds =
        element.getBoundingClientRect();

    const tolerance = 8;

    return (
        event.clientX >=
            bounds.left - tolerance &&
        event.clientX <=
            bounds.right + tolerance &&
        event.clientY >=
            bounds.top - tolerance &&
        event.clientY <=
            bounds.bottom + tolerance
    );
}


/*
 * =========================================================
 * Drop
 * =========================================================
 */

function handleDrop(
    event
) {
    if (
        !isEditMode() ||
        !currentDragState
    ) {
        return;
    }

    const dropZone =
        getDropZone(
            event.target
        ) ||
        currentDragState.dropZone;

    if (
        !dropZone
    ) {
        clearDragState();

        return;
    }

    event.preventDefault();

    const targetTier =
        getTargetTier(
            dropZone
        );

    const layout =
        currentLayoutGetter?.();

    if (
        !targetTier ||
        !layout
    ) {
        clearDragState();

        return;
    }

    const gameId =
        currentDragState.gameId;

    /*
     * Перенос в корзину.
     */
    if (
        targetTier === 'REMOVED'
    ) {
        const updatedLayout =
            moveGameToTier(
                layout,
                gameId,
                targetTier,
                null
            );

        const transitionInfo = {
            gameId,
            targetTier
        };

        clearDragState();

        currentLayoutChangeHandler?.(
            updatedLayout,
            transitionInfo
        );

        return;
    }

    /*
     * Если placeholder не был создан,
     * добавляем игру в конец текущего тира.
     */
    const placement =
        currentDragState.placement || {
            tier: targetTier,
            index:
                Array.isArray(
                    layout[targetTier]
                )
                    ? layout[targetTier].length
                    : 0
        };

    const updatedLayout =
        moveGameToTier(
            layout,
            gameId,
            placement.tier,
            placement.index
        );

    const transitionInfo = {
        gameId,
        targetTier:
            placement.tier
    };

    clearDragState();

    currentLayoutChangeHandler?.(
        updatedLayout,
        transitionInfo
    );
}


function handleDragEnd() {
    clearDragState();
}


/*
 * =========================================================
 * Placeholder
 * =========================================================
 */

function getDropPlaceholder() {
    let placeholder =
        document.querySelector(
            '#custom-drop-placeholder'
        );

    if (
        placeholder
    ) {
        return placeholder;
    }

    placeholder =
        document.createElement(
            'div'
        );

    placeholder.id =
        'custom-drop-placeholder';

    placeholder.className =
        'custom-drop-placeholder';

    placeholder.setAttribute(
        'aria-hidden',
        'true'
    );

    placeholder.style.pointerEvents =
        'none';

    return placeholder;
}


function removeDropPlaceholder() {
    cancelPendingPlaceholderUpdate();

    const placeholder =
        document.querySelector(
            '#custom-drop-placeholder'
        );

    if (
        placeholderAnimation
    ) {
        placeholderAnimation.cancel();

        placeholderAnimation =
            null;
    }

    if (
        !placeholder
    ) {
        return;
    }

    placeholder.classList.remove(
        'is-visible'
    );

    placeholder.remove();
}




/*
 * =========================================================
 * Drop-зоны
 * =========================================================
 */

function getDropZone(
    element
) {
    if (
        !(element instanceof Element)
    ) {
        return null;
    }

    return element.closest(
        '[data-trash-container], [data-tier-container]'
    );
}


function getTargetTier(
    dropZone
) {
    if (
        !dropZone
    ) {
        return null;
    }

    if (
        dropZone.hasAttribute(
            'data-trash-container'
        )
    ) {
        return 'REMOVED';
    }

    return String(
        dropZone.dataset.tierContainer || ''
    ).trim() || null;
}


function setActiveDropZone(
    dropZone
) {
    document
        .querySelectorAll(
            '.is-drop-target'
        )
        .forEach(
            element => {
                if (
                    element !== dropZone
                ) {
                    element.classList.remove(
                        'is-drop-target'
                    );
                }
            }
        );

    dropZone.classList.add(
        'is-drop-target'
    );
}


/*
 * =========================================================
 * Изменение layout
 * =========================================================
 */

function moveGameToTier(
    layout,
    gameId,
    targetTier,
    requestedIndex
) {
    const updatedLayout =
        cloneLayout(
            layout
        );

    const sourceTier =
        findGameTier(
            updatedLayout,
            gameId
        );

    const sourceIndex =
        sourceTier
            ? updatedLayout[sourceTier].indexOf(
                gameId
            )
            : -1;

    /*
     * Сначала удаляем игру из всех тиров.
     */
    Object.keys(
        updatedLayout
    ).forEach(
        tier => {
            updatedLayout[tier] =
                updatedLayout[tier].filter(
                    value =>
                        String(
                            value
                        ) !== String(
                            gameId
                        )
                );
        }
    );

    if (
        !Array.isArray(
            updatedLayout[targetTier]
        )
    ) {
        updatedLayout[targetTier] =
            [];
    }

    let insertionIndex =
        Number.isInteger(
            requestedIndex
        )
            ? requestedIndex
            : updatedLayout[targetTier].length;

    /*
     * При перемещении внутри одного тира
     * индекс уменьшается после удаления карточки.
     */
    if (
        sourceTier === targetTier &&
        sourceIndex >= 0 &&
        sourceIndex < insertionIndex
    ) {
        insertionIndex--;
    }

    insertionIndex =
        Math.max(
            0,
            Math.min(
                insertionIndex,
                updatedLayout[targetTier].length
            )
        );

    updatedLayout[targetTier].splice(
        insertionIndex,
        0,
        gameId
    );

    return updatedLayout;
}


function findGameTier(
    layout,
    gameId
) {
    if (
        !layout
    ) {
        return null;
    }

    return Object.keys(
        layout
    ).find(
        tier =>
            Array.isArray(
                layout[tier]
            ) &&
            layout[tier].some(
                value =>
                    String(
                        value
                    ) === String(
                        gameId
                    )
            )
    ) || null;
}


function cloneLayout(
    layout
) {
    const clonedLayout = {};

    Object.entries(
        layout
    ).forEach(
        ([
            tier,
            gameIds
        ]) => {
            clonedLayout[tier] =
                Array.isArray(
                    gameIds
                )
                    ? [
                        ...gameIds
                    ]
                    : [];
        }
    );

    return clonedLayout;
}


/*
 * =========================================================
 * Очистка состояния
 * =========================================================
 */

function clearDragState() {
    hideSideTrashZones();

    cancelPendingPlaceholderUpdate();

    lastPointerSample =
        null;

    removeDropPlaceholder();

    // остальной код без изменений


    document
        .querySelectorAll(
            '.is-drop-target'
        )
        .forEach(
            element => {
                element.classList.remove(
                    'is-drop-target'
                );
            }
        );


    document
        .querySelectorAll(
            '.is-dragging'
        )
        .forEach(
            element => {
                element.classList.remove(
                    'is-dragging'
                );
            }
        );

    document.body.classList.remove(
        'custom-drag-active'
    );

    currentDragState =
        null;
}


/*
 * =========================================================
 * Состояние draggable
 * =========================================================
 */

function setupCardsObserver() {
    if (
        customCardsObserver ||
        !document.body
    ) {
        return;
    }

    customCardsObserver =
        new MutationObserver(
            () => {
                if (
                    !currentDragState
                ) {
                    updateDraggableCards();
                }
            }
        );

    customCardsObserver.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );
}


function updateDraggableCards() {
    const editable =
        isEditMode();

    document
        .querySelectorAll(
            [
                '.custom-games-container [data-game-id]',
                '.custom-unranked-container [data-game-id]',
                '.custom-removed-games-container [data-game-id]'
            ].join(',')
        )
        .forEach(
            card => {
                card.draggable =
                    editable;

                card.setAttribute(
                    'draggable',
                    editable
                        ? 'true'
                        : 'false'
                );
            }
        );
}


/*
 * =========================================================
 * Вспомогательные функции
 * =========================================================
 */

function isEditMode() {
    return document.body.classList.contains(
        'custom-mode-edit'
    );
}


function isReducedMotion() {
    return window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    ).matches;
}

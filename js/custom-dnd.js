let currentDragState = null;

let currentLayoutGetter = null;
let currentLayoutChangeHandler = null;

let dragAndDropIsInitialized = false;
let customCardsObserver = null;

let layoutAnimationFrame = null;
let placeholderAnimation = null;
let placeholderAnimationFrame = null;



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

    const dropZone =
        getDropZone(
            event.target
        );

    if (
        !dropZone
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


function handleDragEnter(
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
    const dropZone =
        getDropZone(
            event.target
        );

    if (
        !dropZone
    ) {
        return;
    }

    /*
     * Не снимаем подсветку при переходе
     * с контейнера на его дочерний элемент.
     */
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
    if (
        !targetCard
    ) {
        placePlaceholderAtEnd(
            placeholder,
            dropZone
        );

        const layout =
            currentLayoutGetter?.();

        const targetIds =
            Array.isArray(
                layout?.[targetTier]
            )
                ? layout[targetTier]
                : [];

        currentDragState.placement = {
            tier: targetTier,
            index: targetIds.length
        };

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

function placePlaceholderAtEnd(
    placeholder,
    dropZone
) {
    const lastElement =
        dropZone.lastElementChild;

    /*
     * Placeholder уже находится последним.
     */
    if (
        placeholder.parentElement === dropZone &&
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
}


function placePlaceholderBefore(
    placeholder,
    dropZone,
    referenceCard
) {
    /*
     * Если карточки справа нет,
     * ставим placeholder в конец.
     */
    if (
        !referenceCard
    ) {
        placePlaceholderAtEnd(
            placeholder,
            dropZone
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
    change
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
        [
            ...root.querySelectorAll(
                '.custom-tier-row'
            )
        ];

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

                animateRows(
                    rows,
                    previousRowRects
                );

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

    /*
     * Если предыдущая анимация ещё идёт,
     * фиксируем её текущее визуальное положение.
     */
    const previousRect =
        capturePlaceholderRect(
            placeholder
        );

    animateCustomLayoutChange(
        root,
        change
    );

    if (
        placeholderAnimationFrame
    ) {
        cancelAnimationFrame(
            placeholderAnimationFrame
        );
    }

    placeholderAnimationFrame =
        requestAnimationFrame(
            () => {
                placeholderAnimationFrame =
                    null;

                animatePlaceholderMove(
                    placeholder,
                    previousRect
                );
            }
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

    const rect =
        placeholder.getBoundingClientRect();

    /*
     * Перед новым измерением убираем старую
     * transform-анимацию, иначе новая позиция
     * будет рассчитана относительно промежуточного
     * положения placeholder.
     */
    if (
        placeholderAnimation
    ) {
        try {
            placeholderAnimation.commitStyles();
        } catch (
            error
        ) {
            /*
             * commitStyles может отсутствовать
             * в некоторых старых браузерах.
             */
        }

        placeholderAnimation.cancel();
        placeholderAnimation =
            null;

        placeholder.style.transform =
            '';
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

    /*
     * Если положение практически не изменилось,
     * новую анимацию не запускаем.
     */
    if (
        Math.abs(deltaX) < 2 &&
        Math.abs(deltaY) < 2
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

    placeholderAnimation =
        placeholder.animate(
            [
                {
                    opacity: 0.72,
                    transform:
                        `translate(${deltaX}px, ${deltaY}px) scale(0.82)`
                },
                {
                    opacity: 1,
                    transform:
                        'translate(0, 0) scale(1)'
                }
            ],
            {
                duration: 220,
                easing:
                    'cubic-bezier(0.22, 1, 0.36, 1)',
                fill: 'both'
            }
        );

    const animation =
        placeholderAnimation;

    animation.onfinish =
        () => {
            if (
                placeholderAnimation !== animation
            ) {
                return;
            }

            placeholder.style.transform =
                '';

            placeholder.style.opacity =
                '';

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
    const placeholder =
        document.querySelector(
            '#custom-drop-placeholder'
        );

    if (
        !placeholder
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


    placeholder.classList.remove(
        'is-visible'
    );

    /*
     * Удаляем сразу, чтобы при следующем
     * drag не осталось старого placeholder.
     */
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
    removeDropPlaceholder();

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

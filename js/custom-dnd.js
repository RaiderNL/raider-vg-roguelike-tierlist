let currentDragState = null;

let currentLayoutGetter = null;
let currentLayoutChangeHandler = null;
let flipAnimationFrame = null;

let dragAndDropIsInitialized = false;
let customCardsObserver = null;


/*
 * =========================================================
 * Инициализация
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

    event.dataTransfer.effectAllowed =
        'move';

    event.dataTransfer.setData(
        'text/plain',
        gameId
    );
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

    event.dataTransfer.dropEffect =
        'move';

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
     * Если курсор находится над placeholder,
     * вообще не изменяем DOM.
     *
     * Это предотвращает цикл:
     *
     * конец контейнера →
     * перед правой карточкой →
     * конец контейнера.
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
     * Если курсор над текущей карточкой,
     * оставляем placeholder на прежнем месте.
     */
    if (
        targetCard === currentDragState.card
    ) {
        return;
    }

    /*
     * Если курсор находится не над карточкой,
     * помещаем placeholder в конец контейнера.
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
     * Ничего не меняем.
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
    }
);

}


function placePlaceholderBefore(
    placeholder,
    dropZone,
    referenceCard
) {
    /*
     * Если referenceCard отсутствует,
     * placeholder должен быть последним.
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
     * Placeholder уже стоит непосредственно
     * перед нужной карточкой.
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
    }
);

}
function animateDropZoneChange(
    dropZone,
    change
) {
    if (
        typeof change !== 'function'
    ) {
        return;
    }

    if (
        flipAnimationFrame
    ) {
        cancelAnimationFrame(
            flipAnimationFrame
        );

        flipAnimationFrame =
            null;
    }

    const cards =
        [
            ...dropZone.querySelectorAll(
                '[data-game-id]'
            )
        ].filter(
            card =>
                card !==
                currentDragState?.card
        );

    const previousPositions =
        new Map();

    cards.forEach(
        card => {
            previousPositions.set(
                card,
                card.getBoundingClientRect()
            );
        }
    );

    change();

    flipAnimationFrame =
        requestAnimationFrame(
            () => {
                cards.forEach(
                    card => {
                        const previous =
                            previousPositions.get(
                                card
                            );

                        if (
                            !previous
                        ) {
                            return;
                        }

                        const current =
                            card.getBoundingClientRect();

                        const deltaX =
                            previous.left -
                            current.left;

                        const deltaY =
                            previous.top -
                            current.top;

                        if (
                            Math.abs(deltaX) < 1 &&
                            Math.abs(deltaY) < 1
                        ) {
                            return;
                        }

                        card.animate(
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
                                duration: 220,
                                easing:
                                    'cubic-bezier(0.22, 1, 0.36, 1)',
                                fill: 'both'
                            }
                        );
                    }
                );

                flipAnimationFrame =
                    null;
            }
        );
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

    /*
     * Небольшая зона устойчивости предотвращает
     * переключение позиции на границе placeholder.
     */
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

        clearDragState();

        currentLayoutChangeHandler?.(
            updatedLayout
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

    clearDragState();

    currentLayoutChangeHandler?.(
        updatedLayout
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

    /*
     * Placeholder не перехватывает события мыши.
     * Его положение контролируется координатами курсора.
     */
    placeholder.style.pointerEvents =
        'none';

    return placeholder;
}


function removeDropPlaceholder() {
    document
        .querySelector(
            '#custom-drop-placeholder'
        )
        ?.remove();
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
     * индекс нужно уменьшить после удаления
     * исходной карточки.
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





function isEditMode() {
    return document.body.classList.contains(
        'custom-mode-edit'
    );
}

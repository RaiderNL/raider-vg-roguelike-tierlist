let currentDragState = null;

let currentLayoutGetter = null;
let currentLayoutChangeHandler = null;

let dragAndDropIsInitialized = false;


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
}


/*
 * =========================================================
 * Начало переноса
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
        placement: null,
        lastDropZone: null
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
 * Перемещение placeholder
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

    setActiveDropZone(
        dropZone
    );

    currentDragState.dropZone =
        dropZone;

    updateDropPlaceholder(
        event,
        dropZone
    );
}


/*
 * =========================================================
 * Вход в drop-зону
 * =========================================================
 */

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

    setActiveDropZone(
        dropZone
    );

    currentDragState.lastDropZone =
        dropZone;
}


/*
 * =========================================================
 * Выход из drop-зоны
 * =========================================================
 */

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
 * Завершение drop
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
        clearDropZoneState();

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
        clearDropZoneState();

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

        clearDropZoneState();

        currentLayoutChangeHandler?.(
            updatedLayout
        );

        return;
    }

    /*
     * Если курсор был отпущен в свободной части контейнера,
     * добавляем игру в конец выбранного тира.
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

    clearDropZoneState();

    currentLayoutChangeHandler?.(
        updatedLayout
    );
}



function handleDragEnd() {
    clearDropZoneState();
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

    /*
     * В корзине placeholder не нужен.
     */
    if (
        dropZone.hasAttribute(
            'data-trash-container'
        )
    ) {
        removeDropPlaceholder();

        currentDragState.placement =
            null;

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

    const targetCard =
        getGameCard(
            event.target
        );

    /*
     * Если курсор находится над свободным местом контейнера,
     * карточка должна попасть в конец этого тира.
     */
    if (
        !targetCard ||
        targetCard === currentDragState.card
    ) {
        const visibleCards =
            getDropZoneCards(
                dropZone
            );

        const lastCard =
            visibleCards[
                visibleCards.length - 1
            ];

        if (
            lastCard
        ) {
            const lastCardBounds =
                lastCard.getBoundingClientRect();

            const placeholder =
                getDropPlaceholder();

            const isAlreadyAfterLastCard =
                placeholder.parentElement === dropZone &&
                placeholder.previousElementSibling === lastCard;

            if (
                !isAlreadyAfterLastCard
            ) {
                dropZone.appendChild(
                    placeholder
                );
            }
        } else {
            /*
             * Пустой тир: placeholder можно показать
             * в начале контейнера.
             */
            const placeholder =
                getDropPlaceholder();

            const isAlreadyFirstChild =
                placeholder.parentElement === dropZone &&
                placeholder === dropZone.firstElementChild;

            if (
                !isAlreadyFirstChild
            ) {
                dropZone.prepend(
                    placeholder
                );
            }
        }

        currentDragState.placement = {
            tier: targetTier,
            index:
                Array.isArray(
                    currentLayoutGetter?.()?.[
                        targetTier
                    ]
                )
                    ? currentLayoutGetter()
                        [targetTier].length
                    : 0
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

    const cardBounds =
        targetCard.getBoundingClientRect();

    const insertAfter =
        isPointerAfterCard(
            event,
            cardBounds
        );

    const insertionIndex =
        targetIndex +
        (
            insertAfter
                ? 1
                : 0
        );

    const placeholder =
        getDropPlaceholder();

    const referenceCard =
        insertAfter
            ? getNextGameCard(
                targetCard
            )
            : targetCard;

    const isAlreadyInPosition =
        placeholder.parentElement === dropZone &&
        placeholder.nextElementSibling === referenceCard;

    if (
        !isAlreadyInPosition
    ) {
        dropZone.insertBefore(
            placeholder,
            referenceCard
        );
    }

    currentDragState.placement = {
        tier: targetTier,
        index: insertionIndex
    };
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


/*
 * =========================================================
 * Работа с карточками
 * =========================================================
 */

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
    card
) {
    let nextElement =
        card.nextElementSibling;

    while (
        nextElement
    ) {
        if (
            nextElement.id !==
            'custom-drop-placeholder'
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
 * Определение стороны карточки
 * =========================================================
 */

function isPointerAfterCard(
    event,
    cardBounds
) {
    const verticalMiddle =
        cardBounds.top +
        (
            cardBounds.height / 2
        );

    const horizontalMiddle =
        cardBounds.left +
        (
            cardBounds.width / 2
        );

    const isSameRow =
        Math.abs(
            event.clientY - verticalMiddle
        ) <
        (
            cardBounds.height / 3
        );

    return isSameRow
        ? event.clientX > horizontalMiddle
        : event.clientY > verticalMiddle;
}


/*
 * =========================================================
 * Перемещение игры между тирами
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
     * При переносе внутри одного тира
     * индекс корректируется после удаления карточки.
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


/*
 * =========================================================
 * Работа с layout
 * =========================================================
 */

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
    document
        .querySelector(
            '#custom-drop-placeholder'
        )
        ?.remove();
}


/*
 * =========================================================
 * Очистка состояния
 * =========================================================
 */

function clearDropZoneState() {
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
 * Draggable-состояние карточек
 * =========================================================
 */

function updateDraggableCards() {
    const editable =
        isEditMode();

    document
        .querySelectorAll(
            '[data-game-id]'
        )
        .forEach(
            card => {
                card.draggable =
                    editable;
            }
        );
}


function isEditMode() {
    return document.body.classList.contains(
        'custom-mode-edit'
    );
}

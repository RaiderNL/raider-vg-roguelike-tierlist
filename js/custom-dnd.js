let currentDragState = null;

let currentLayoutGetter = null;
let currentLayoutChangeHandler = null;

let dragAndDropIsInitialized = false;


/*
 * Подключает drag-and-drop к пользовательскому тир-листу.
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
 * Начало переноса: запоминаем исходную позицию.
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
        event.target.closest(
            '[data-game-id]'
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
        !sourceTier
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
 * Показывает допустимую область и позицию вставки.
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

    dropZone.classList.add(
        'is-drop-target'
    );
    const targetContainer = getDropContainer(event);

    if (!targetContainer) {
        return;
    }
    
    const beforeElement = getInsertBeforeElement(event, targetContainer);
    
    if (
        placeholder.parentElement === targetContainer &&
        placeholder.nextElementSibling === beforeElement
    ) {
        return;
    }
    
    targetContainer.insertBefore(placeholder, beforeElement);


    updateDropPlaceholder(
        event,
        dropZone
    );
}


function handleDragEnter(
    event
) {
    if (
        !isEditMode()
    ) {
        return;
    }

    const dropZone =
        getDropZone(
            event.target
        );

    if (
        dropZone
    ) {
        dropZone.classList.add(
            'is-drop-target'
        );
    }
}


function handleDragLeave(
    event
) {
    const dropZone =
        getDropZone(
            event.target
        );

    if (
        !dropZone ||
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
 * Вставляет игру в рассчитанную позицию.
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
        );

    if (
        !dropZone
    ) {
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

    const placement =
        currentDragState.placement;

    /*
     * Сброс в пустую часть исходного тира
     * не должен менять порядок списка.
     */
    if (
        targetTier === currentDragState.sourceTier &&
        !placement
    ) {
        clearDropZoneState();

        return;
    }

    const updatedLayout =
        moveGameToTier(
            layout,
            currentDragState.gameId,
            targetTier,
            placement?.index
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
 * Рисует временное свободное место перед или после карточки.
 */
function updateDropPlaceholder(
    event,
    dropZone
) {
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

    const targetCard =
        event.target.closest(
            '[data-game-id]'
        );

    /*
     * В пустой части тира не создаём вставку.
     * Это сохраняет позицию карточки при отмене переноса.
     */
    if (
        !targetTier ||
        !targetCard ||
        targetCard === currentDragState.card
    ) {
        removeDropPlaceholder();

        currentDragState.placement =
            null;

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

    /*
     * Убираем placeholder перед расчётом nextElementSibling,
     * иначе он может стать точкой вставки для самого себя.
     */
    placeholder.remove();

    const referenceCard =
        insertAfter
            ? targetCard.nextElementSibling
            : targetCard;

    dropZone.insertBefore(
        placeholder,
        referenceCard
    );

    currentDragState.placement = {
        tier: targetTier,
        index: insertionIndex
    };
}


/*
 * На карточках в одной строке ориентируемся по X,
 * на разных строках - по Y.
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
 * Удаляет игру из всех тиров и вставляет в нужный индекс.
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
                        ) !== gameId
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
     * После удаления из этого же тира
     * все элементы после исходной карточки смещаются влево.
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
                    ) === gameId
            )
    ) || null;
}


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
        dropZone.hasAttribute(
            'data-trash-container'
        )
    ) {
        return 'REMOVED';
    }

    const tier =
        String(
            dropZone.dataset.tierContainer || ''
        ).trim();

    return tier || null;
}


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

    return placeholder;
}


function removeDropPlaceholder() {
    document
        .querySelector(
            '#custom-drop-placeholder'
        )
        ?.remove();
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

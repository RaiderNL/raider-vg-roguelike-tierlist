let currentDragState = null;

let currentLayoutGetter = null;
let currentLayoutChangeHandler = null;

let dragAndDropIsInitialized = false;


/*
 * Подключает drag-and-drop к пользовательскому тир-листу.
 * Обработчики документа добавляются один раз.
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
 * Начало перетаскивания карточки.
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

    if (
        !gameId
    ) {
        return;
    }

    currentDragState = {
        gameId,
        card
    };

    card.classList.add(
        'is-dragging'
    );

    event.dataTransfer.effectAllowed =
        'move';

    event.dataTransfer.setData(
        'text/plain',
        gameId
    );
}


/*
 * Разрешает сброс над допустимой зоной.
 */
function handleDragOver(
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
        !dropZone
    ) {
        return;
    }

    event.preventDefault();

    event.dataTransfer.dropEffect =
        'move';
}


/*
 * Подсвечивает целевую область.
 */
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
        !dropZone
    ) {
        return;
    }

    dropZone.classList.add(
        'is-drop-target'
    );
}


/*
 * Убирает подсветку при выходе из области.
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
 * Перемещает игру в целевой тир или корзину.
 */
function handleDrop(
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
        !dropZone ||
        !currentDragState
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

    const updatedLayout =
        moveGameToTier(
            layout,
            currentDragState.gameId,
            targetTier
        );

    clearDropZoneState();

    currentLayoutChangeHandler?.(
        updatedLayout
    );
}


/*
 * Завершение перетаскивания.
 */
function handleDragEnd() {
    clearDropZoneState();
}


/*
 * Перемещает игру, удаляя её из всех остальных зон.
 */
function moveGameToTier(
    layout,
    gameId,
    targetTier
) {
    const updatedLayout =
        cloneLayout(
            layout
        );

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

    updatedLayout[targetTier].push(
        gameId
    );

    return updatedLayout;
}


/*
 * Определяет допустимую drop-зону.
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


/*
 * Корзина использует REMOVED,
 * остальные зоны берут значение data-tier-container.
 */
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


/*
 * Создаёт независимую копию структуры.
 */
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
 * Очищает временные состояния drag-and-drop.
 */
function clearDropZoneState() {
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

    currentDragState =
        null;
}


/*
 * После повторной отрисовки обновляет draggable.
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

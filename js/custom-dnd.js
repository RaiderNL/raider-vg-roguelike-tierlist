let currentDragState = null;

let currentLayoutGetter = null;
let currentLayoutChangeHandler = null;

let dragAndDropIsInitialized = false;


/*
 * Подключает drag-and-drop к пользовательскому тир-листу.
 *
 * Обработчики добавляются только один раз,
 * поэтому повторная отрисовка страницы
 * не создаёт дубликаты событий.
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
 * Начало перемещения карточки.
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
 * Разрешаем сброс только в режиме редактирования.
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
 * Подсветка зоны при входе карточки.
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
 * Убираем подсветку,
 * когда карточка покидает зону.
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

    /*
     * Если курсор перешёл
     * во вложенный элемент той же зоны,
     * подсветку не убираем.
     */
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
 * Обрабатываем сброс карточки.
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

    if (
        !targetTier
    ) {
        clearDropZoneState();

        return;
    }

    const gameId =
        currentDragState.gameId;

    const layout =
        currentLayoutGetter?.();

    if (
        !layout
    ) {
        clearDropZoneState();

        return;
    }

    const updatedLayout =
        moveGameToTier(
            layout,
            gameId,
            targetTier
        );

    clearDropZoneState();

    if (
        updatedLayout
    ) {
        currentLayoutChangeHandler?.(
            updatedLayout
        );

        /*
         * custom-main.js после изменения layout
         * снова отрисует карточки.
         */

        );
    }
}


/*
 * Завершение перемещения.
 */
function handleDragEnd() {
    clearDropZoneState();
}


/*
 * Перемещает игру в указанную зону.
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

    const allTiers =
        Object.keys(
            updatedLayout
        );

    /*
     * Сначала удаляем игру
     * из всех возможных уровней.
     */
    allTiers.forEach(
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

    /*
     * Если игра уже находилась в этой зоне,
     * повторно добавляем её в конец.
     */
    updatedLayout[targetTier].push(
        gameId
    );

    return updatedLayout;
}


/*
 * Определяет drop-зону по элементу,
 * над которым находится курсор.
 */
function getDropZone(
    element
) {
    if (
        !(element instanceof Element)
    ) {
        return null;
    }

    const trashZone =
        element.closest(
            '[data-trash-container]'
        );

    if (
        trashZone
    ) {
        return trashZone;
    }

    return element.closest(
        '[data-tier-container]'
    );
}


/*
 * Возвращает целевой уровень.
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
        dropZone.dataset.tierContainer;

    return tier
        ? String(
            tier
        ).trim()
        : null;
}


/*
 * Копирует layout,
 * не изменяя исходный объект.
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
 * Добавляет или снимает
 * визуальное состояние drop-зоны.
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
 * Обновляет draggable после отрисовки.
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


/*
 * Проверяет активный режим страницы.
 */
function isEditMode() {
    return document.body.classList.contains(
        'custom-mode-edit'
    );
}

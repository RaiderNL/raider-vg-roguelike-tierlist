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

    /*
     * Повторно обработчики событий не подключаем.
     * Обновляем только состояние draggable у карточек.
     */
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
 * Начало переноса карточки
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

    /*
     * Обязательно вызываем preventDefault(),
     * иначе браузер не разрешит drop.
     */
    event.preventDefault();

    event.dataTransfer.dropEffect =
        'move';

    /*
     * Активной оставляем только текущую drop-зону.
     */
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

    /*
     * Placeholder перемещается только здесь.
     * Вторая вставка из handleDragOver удалена.
     */
    updateDropPlaceholder(
        event,
        dropZone
    );
}


/*
 * =========================================================
 * Наведение на drop-зону
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
 * Выход курсора из drop-зоны
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

    /*
     * При переходе с контейнера на его дочерний элемент
     * drop-зону не деактивируем.
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
     * Перенос в корзину.
     */
    if (
        targetTier === 'REMOVED'
    ) {
        const updatedLayout =
            moveGameToTier(
                layout,
                currentDragState.gameId,
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
     * Если карточка была брошена в пустую часть
     * исходного тира, порядок не меняем.
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


/*
 * =========================================================
 * Завершение переноса
 * =========================================================
 */

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

    const targetCard =
        getTargetCard(
            event.target
        );

    /*
     * Если курсор находится не на карточке
     * или наведён на саму перетаскиваемую карточку,
     * позицию вставки не показываем.
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

    /*
     * Получаем placeholder, но не вставляем его сразу.
     */
    const placeholder =
        getDropPlaceholder();

    /*
     * Берём referenceCard до удаления placeholder.
     * При этом placeholder пропускается.
     */
    const referenceCard =
        insertAfter
            ? getNextCard(
                targetCard
            )
            : targetCard;

    /*
     * Если placeholder уже находится
     * в точно такой же позиции, DOM не изменяем.
     *
     * Это основное исправление мерцания.
     */
    const isAlreadyInPosition =
        placeholder.parentElement === dropZone &&
        placeholder.nextElementSibling === referenceCard;

    if (
        !isAlreadyInPosition
    ) {
        placeholder.remove();

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


/*
 * Возвращает карточку под курсором.
 * Placeholder намеренно не учитывается.
 */
function getTargetCard(
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


/*
 * Возвращает следующую карточку после targetCard.
 * Placeholder пропускается.
 */
function getNextCard(
    targetCard
) {
    let nextElement =
        targetCard.nextElementSibling;

    while (
        nextElement &&
        nextElement.id === 'custom-drop-placeholder'
    ) {
        nextElement =
            nextElement.nextElementSibling;
    }

    return nextElement;
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

    /*
     * Удаляем игру из всех тиров.
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

    /*
     * Если целевого тира ещё нет,
     * создаём пустой массив.
     */
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
     * после удаления исходной карточки
     * индекс уменьшается на единицу.
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

    const tier =
        String(
            dropZone.dataset.tierContainer || ''
        ).trim();

    return tier || null;
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
     * Placeholder не должен становиться
     * самостоятельной целью dragover.
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
 * Обновление draggable-состояния
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

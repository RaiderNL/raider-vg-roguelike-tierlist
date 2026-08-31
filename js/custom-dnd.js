const DRAGGING_CLASS =
    'is-dragging';

const DROP_TARGET_CLASS =
    'is-drop-target';


/*
 * Подключает перетаскивание карточек
 * к текущей разметке тир-листа.
 */
export function setupCustomDragAndDrop({
    getLayout,
    onLayoutChange
}) {
    const containers =
        [
            ...document.querySelectorAll(
                '[data-tier-container]'
            )
        ];

    containers.forEach(
        container => {
            setupDropContainer(
                container,
                getLayout,
                onLayoutChange
            );
        }
    );

    const cards =
        [
            ...document.querySelectorAll(
                '.custom-games-container .game-card'
            )
        ];

    cards.forEach(
        card => {
            setupDraggableCard(
                card
            );
        }
    );
}


/*
 * Подключает карточку к Drag and Drop API.
 */
function setupDraggableCard(
    card
) {
    const gameId =
        card.dataset.gameId;

    if (
        !gameId
    ) {
        return;
    }

    card.draggable =
        true;

    card.addEventListener(
        'dragstart',
        event => {
            event.stopPropagation();

            card.classList.add(
                DRAGGING_CLASS
            );

            event.dataTransfer.effectAllowed =
                'move';

            event.dataTransfer.setData(
                'text/plain',
                gameId
            );
        }
    );

    card.addEventListener(
        'dragend',
        () => {
            card.classList.remove(
                DRAGGING_CLASS
            );

            removeDropTargetClasses();
        }
    );
}


/*
 * Подключает контейнер уровня
 * как зону для сброса карточки.
 */
function setupDropContainer(
    container,
    getLayout,
    onLayoutChange
) {
    container.addEventListener(
        'dragover',
        event => {
            event.preventDefault();

            event.dataTransfer.dropEffect =
                'move';

            container.classList.add(
                DROP_TARGET_CLASS
            );

            const draggingCard =
                document.querySelector(
                    `.game-card.${DRAGGING_CLASS}`
                );

            if (
                !draggingCard ||
                draggingCard.parentElement !==
                    container
            ) {
                return;
            }

            const afterElement =
                getCardAfterPointer(
                    container,
                    event.clientX,
                    event.clientY
                );

            if (
                afterElement
            ) {
                container.insertBefore(
                    draggingCard,
                    afterElement
                );
            } else {
                container.appendChild(
                    draggingCard
                );
            }
        }
    );

    container.addEventListener(
        'dragleave',
        event => {
            if (
                event.relatedTarget &&
                container.contains(
                    event.relatedTarget
                )
            ) {
                return;
            }

            container.classList.remove(
                DROP_TARGET_CLASS
            );
        }
    );

    container.addEventListener(
        'drop',
        event => {
            event.preventDefault();
            event.stopPropagation();

            const gameId =
                event.dataTransfer.getData(
                    'text/plain'
                );

            if (
                !gameId
            ) {
                return;
            }

            const draggingCard =
                document.querySelector(
                    `.game-card.${DRAGGING_CLASS}`
                );

            if (
                draggingCard &&
                draggingCard.parentElement !==
                    container
            ) {
                const afterElement =
                    getCardAfterPointer(
                        container,
                        event.clientX,
                        event.clientY
                    );

                if (
                    afterElement
                ) {
                    container.insertBefore(
                        draggingCard,
                        afterElement
                    );
                } else {
                    container.appendChild(
                        draggingCard
                    );
                }
            }

            const updatedLayout =
                createLayoutFromDom();

            onLayoutChange(
                updatedLayout
            );

            removeDropTargetClasses();
        }
    );
}


/*
 * Определяет карточку, перед которой
 * нужно вставить перетаскиваемую игру.
 */
function getCardAfterPointer(
    container,
    pointerX,
    pointerY
) {
    const cards =
        [
            ...container.querySelectorAll(
                '.game-card:not(.is-dragging)'
            )
        ];

    let closestCard = null;
    let closestDistance = -Infinity;

    cards.forEach(
        card => {
            const rect =
                card.getBoundingClientRect();

            const offset =
                pointerY -
                rect.top -
                rect.height / 2;

            const horizontalOffset =
                pointerX -
                rect.left -
                rect.width / 2;

            /*
             * Используем координаты указателя
             * для естественной вставки в сетку.
             */
            const distance =
                offset <= 0 &&
                horizontalOffset <= 0
                    ? offset
                    : offset > 0 &&
                        horizontalOffset < 0
                        ? offset
                        : -Infinity;

            if (
                distance > closestDistance
            ) {
                closestDistance =
                    distance;

                closestCard =
                    card;
            }
        }
    );

    return closestCard;
}


/*
 * Собирает новую структуру тир-листа
 * на основании текущего DOM.
 */
function createLayoutFromDom() {
    const layout = {};

    document
        .querySelectorAll(
            '[data-tier-container]'
        )
        .forEach(
            container => {
                const tier =
                    container.dataset.tierContainer;

                layout[tier] =
                    [
                        ...container.querySelectorAll(
                            '.game-card'
                        )
                    ]
                        .map(
                            card =>
                                card.dataset.gameId
                        )
                        .filter(
                            Boolean
                        );
            }
        );

    return layout;
}


function removeDropTargetClasses() {
    document
        .querySelectorAll(
            `.${DROP_TARGET_CLASS}`
        )
        .forEach(
            element => {
                element.classList.remove(
                    DROP_TARGET_CLASS
                );
            }
        );
}

// ============================================
// ИГРА - ПАЗЛ
// ============================================

console.log('✅ game.js загружен')

// Конфигурация уровней
const LEVELS = {
    1: {
        pieces: 12,
        cols: 4,
        rows: 3,
        imageUrl: 'https://veryqkmxvgmwsbfzzqvj.supabase.co/storage/v1/object/public/item-images/Game-3lvl.jpeg',
        discount: 5,
        code: '5STSP',
        promoText: 'ТВОЙ ПРОМОКОД НА СКИДКУ 5% : 5STSP'
    }
}

// Состояние игры
let currentLevel = 1
let puzzleImage = null
let puzzlePieces = []
let puzzleBoard = []
let draggedPiece = null // Может быть DOM элементом (из контейнера) или объектом (с доски)
let startTime = null
let timerInterval = null
let correctOrder = []

// DOM элементы
const puzzleBoardEl = document.getElementById('puzzleBoard')
const puzzlePiecesEl = document.getElementById('puzzlePieces')
const currentLevelEl = document.getElementById('currentLevel')
const timerDisplayEl = document.getElementById('timerDisplay')
const returnToShopBtn = document.getElementById('returnToShopBtn')
const successModal = document.getElementById('successModal')
const modalImageEl = document.getElementById('modalImage')
const modalCloseBtn = document.getElementById('modalClose')
const downloadBtn = document.getElementById('downloadBtn')
const promoTextEl = document.getElementById('promoText')
const nextLevelBtn = document.getElementById('nextLevelBtn')

// ============================================
// ИНИЦИАЛИЗАЦИЯ ИГРЫ
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Игра инициализируется...')
    
    // Кнопка возврата в магазин
    returnToShopBtn.addEventListener('click', () => {
        window.location.href = 'index.html'
    })
    
    // Кнопка закрытия модального окна
    modalCloseBtn.addEventListener('click', () => {
        hideModal()
    })
    
    // Кнопка скачать изображение
    downloadBtn.addEventListener('click', downloadImage)
    
    // Кнопка следующего уровня - обработчик устанавливается в showSuccessModal
    
    // Закрытие модального окна по клику вне его
    successModal.addEventListener('click', (e) => {
        if (e.target === successModal) {
            hideModal()
        }
    })
    
    // Начинаем первый уровень
    startLevel(1)
    
    // Добавляем обработчики для контейнера частей (возврат элементов с доски)
    setupPiecesContainerDropHandlers()
    
    // Защита от масштабирования при двойном нажатии
    let lastTouchEnd = 0
    document.addEventListener('touchend', (e) => {
        const now = Date.now()
        if (now - lastTouchEnd <= 300) {
            e.preventDefault()
        }
        lastTouchEnd = now
    }, false)
})

// ============================================
// ОБРАБОТЧИКИ ДЛЯ КОНТЕЙНЕРА ЧАСТЕЙ (возврат с доски)
// ============================================

function setupPiecesContainerDropHandlers() {
    if (!puzzlePiecesEl) return
    
    // Разрешаем drop на контейнер (для десктопа)
    puzzlePiecesEl.addEventListener('dragover', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
        
        // Визуально отмечаем контейнер
        puzzlePiecesEl.classList.add('drag-over-container')
    })
    
    puzzlePiecesEl.addEventListener('dragleave', (e) => {
        // Проверяем, что мы действительно покинули контейнер
        if (!puzzlePiecesEl.contains(e.relatedTarget)) {
            puzzlePiecesEl.classList.remove('drag-over-container')
        }
    })
    
    puzzlePiecesEl.addEventListener('drop', (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        const dragType = e.dataTransfer.getData('text/plain')
        
        // Если перетаскиваем часть с доски - возвращаем в контейнер
        if (dragType === 'cell-piece') {
            const fromCellIndex = parseInt(e.dataTransfer.getData('cell-index'))
            const pieceIndex = parseInt(e.dataTransfer.getData('piece-index'))
            const piece = puzzlePieces.find(p => p.index === pieceIndex)
            
            if (piece && fromCellIndex !== -1) {
                // Убираем часть с доски
                removePieceFromBoard(fromCellIndex)
                
                // Возвращаем часть в контейнер
                piece.element.style.display = 'block'
                piece.isOnBoard = false
                piece.cellIndex = -1
            }
        }
        
        puzzlePiecesEl.classList.remove('drag-over-container')
    })
    
    // Touch события для возврата элементов в контейнер (только для touch-устройств)
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        puzzlePiecesEl.addEventListener('touchmove', (e) => {
            if (touchElement && touchElement.dataset.touchType === 'cell-piece') {
                const touch = e.touches[0]
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY)
                
                if (puzzlePiecesEl.contains(elementBelow) || elementBelow === puzzlePiecesEl) {
                    puzzlePiecesEl.classList.add('drag-over-container')
                } else {
                    puzzlePiecesEl.classList.remove('drag-over-container')
                }
            }
        }, { passive: false })
        
        puzzlePiecesEl.addEventListener('touchend', (e) => {
            if (touchElement && touchElement.dataset.touchType === 'cell-piece') {
                const touch = e.changedTouches[0]
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY)
                
                if (puzzlePiecesEl.contains(elementBelow) || elementBelow === puzzlePiecesEl) {
                    // Возвращаем элемент в контейнер
                    const fromCellIndex = parseInt(touchElement.dataset.touchCellIndex)
                    const pieceIndex = parseInt(touchElement.dataset.touchPieceIndex)
                    const piece = puzzlePieces.find(p => p.index === pieceIndex)
                    
                    if (piece) {
                        // Убираем часть с доски
                        removePieceFromBoard(fromCellIndex)
                        
                        // Возвращаем часть в контейнер
                        piece.element.style.display = 'block'
                        piece.isOnBoard = false
                        piece.cellIndex = -1
                    }
                    
                    puzzlePiecesEl.classList.remove('drag-over-container')
                }
            }
        }, { passive: false })
    }
}

// ============================================
// ЗАГРУЗКА И НАЧАЛО УРОВНЯ
// ============================================

async function startLevel(level) {
    console.log(`\n=== НАЧИНАЕМ УРОВЕНЬ ${level} ===`)
    
    if (level > 1) {
        // Игра завершена
        nextLevelBtn.textContent = 'Вернуться в магазин'
        nextLevelBtn.onclick = () => {
            window.location.href = 'index.html'
        }
        return
    }
    
    // Проверяем конфигурацию уровня
    const levelConfig = LEVELS[level]
    if (!levelConfig) {
        console.error(`Конфигурация уровня ${level} не найдена!`)
        return
    }
    
    console.log(`Конфигурация уровня ${level}:`)
    console.log(`- Колонки: ${levelConfig.cols}, Строки: ${levelConfig.rows}`)
    console.log(`- Всего элементов: ${levelConfig.pieces}`)
    console.log(`- URL изображения: ${levelConfig.imageUrl}`)
    
    // Устанавливаем текущий уровень
    currentLevel = level
    currentLevelEl.textContent = level
    
    // Обновляем классы для правильной сетки
    puzzleBoardEl.className = `puzzle-board level-${level}`
    puzzlePiecesEl.className = `puzzle-pieces level-${level}`
    
    // Сбрасываем состояние
    console.log('Сбрасываем состояние...')
    puzzleBoard = []
    puzzlePieces = []
    correctOrder = []
    
    // Полностью очищаем доску и контейнер
    console.log('Очищаем доску...')
    while (puzzleBoardEl.firstChild) {
        puzzleBoardEl.removeChild(puzzleBoardEl.firstChild)
    }
    console.log('Очищаем контейнер элементов...')
    while (puzzlePiecesEl.firstChild) {
        puzzlePiecesEl.removeChild(puzzlePiecesEl.firstChild)
    }
    console.log(`Контейнер очищен. Осталось элементов: ${puzzlePiecesEl.children.length}`)
    
    // Загружаем изображение
    console.log(`Загружаем изображение для уровня ${level}...`)
    await loadImage(levelConfig.imageUrl)
    console.log(`Изображение загружено: ${puzzleImage.width}x${puzzleImage.height}`)
    
    // Создаем доску
    console.log(`Создаем доску (${levelConfig.cols}x${levelConfig.rows} = ${levelConfig.cols * levelConfig.rows} ячеек)...`)
    createBoard(levelConfig)
    console.log(`Доска создана. Ячеек: ${puzzleBoardEl.children.length}`)
    
    // Разрезаем изображение на части
    console.log(`Создаем элементы пазла...`)
    createPuzzlePieces(levelConfig)
    console.log(`=== УРОВЕНЬ ${level} ГОТОВ ===\n`)
    
    // Запускаем таймер
    startTimer()
}

// ============================================
// ЗАГРУЗКА ИЗОБРАЖЕНИЯ
// ============================================

function loadImage(url) {
    return new Promise((resolve, reject) => {
        puzzleImage = new Image()
        puzzleImage.crossOrigin = 'anonymous'
        
        puzzleImage.onload = () => {
            console.log('Изображение загружено:', url)
            resolve()
        }
        
        puzzleImage.onerror = () => {
            console.error('Ошибка загрузки изображения:', url)
            reject(new Error('Не удалось загрузить изображение'))
        }
        
        puzzleImage.src = url
    })
}

// ============================================
// СОЗДАНИЕ ДОСКИ
// ============================================

function createBoard(levelConfig) {
    const totalCells = levelConfig.cols * levelConfig.rows
    
    for (let i = 0; i < totalCells; i++) {
        const cell = document.createElement('div')
        cell.className = 'puzzle-cell'
        cell.dataset.index = i
        cell.dataset.pieceIndex = -1 // -1 означает пустая ячейка
        
        // Drag & Drop события (для десктопа)
        cell.addEventListener('dragover', handleDragOver, false)
        cell.addEventListener('dragleave', handleDragLeave, false)
        cell.addEventListener('drop', handleDrop, false)
        
        // Touch события (только для touch-устройств, чтобы не мешать drag на десктопе)
        // Проверяем более точно - только если это действительно touch устройство (не гибрид)
        const isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && 
                               window.matchMedia('(pointer: coarse)').matches
        if (isTouchDevice) {
            setupCellTouchHandlers(cell)
        }
        
        puzzleBoardEl.appendChild(cell)
        puzzleBoard.push({
            element: cell,
            pieceIndex: -1
        })
    }
}

// ============================================
// СОЗДАНИЕ ЧАСТЕЙ ПАЗЛА
// ============================================

function createPuzzlePieces(levelConfig) {
    // Проверяем, что изображение загружено
    if (!puzzleImage || !puzzleImage.complete) {
        console.error('Изображение не загружено!')
        return
    }
    
    console.log(`\n=== СОЗДАНИЕ ЭЛЕМЕНТОВ ПАЗЛА ===`)
    console.log(`Уровень: ${currentLevel}`)
    console.log(`- Колонки: ${levelConfig.cols}, Строки: ${levelConfig.rows}`)
    console.log(`- Всего элементов должно быть: ${levelConfig.pieces}`)
    console.log(`- Размер изображения: ${puzzleImage.width}x${puzzleImage.height}`)
    console.log(`- Элементов в контейнере ДО создания: ${puzzlePiecesEl.children.length}`)
    console.log(`- Элементов в массиве puzzlePieces ДО создания: ${puzzlePieces.length}`)
    
    // ВАЖНО: Проверяем, что контейнер действительно пуст
    if (puzzlePiecesEl.children.length > 0) {
        console.error('❌ ОШИБКА: Контейнер НЕ пуст! Удаляем все элементы...')
        while (puzzlePiecesEl.firstChild) {
            puzzlePiecesEl.removeChild(puzzlePiecesEl.firstChild)
        }
        console.log(`Элементов в контейнере ПОСЛЕ очистки: ${puzzlePiecesEl.children.length}`)
    }
    
    // Очищаем массивы
    puzzlePieces = []
    correctOrder = []
    console.log(`Массивы очищены`)
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    // Размеры одной части
    const pieceWidth = Math.floor(puzzleImage.width / levelConfig.cols)
    const pieceHeight = Math.floor(puzzleImage.height / levelConfig.rows)
    
    canvas.width = pieceWidth
    canvas.height = pieceHeight
    
    // Создаем части пазла
    const pieces = []
    
    for (let row = 0; row < levelConfig.rows; row++) {
        for (let col = 0; col < levelConfig.cols; col++) {
            const pieceIndex = row * levelConfig.cols + col
            
            // Очищаем canvas перед рисованием
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            
            // Координаты на исходном изображении
            const sourceX = col * pieceWidth
            const sourceY = row * pieceHeight
            
            // Рисуем часть изображения на canvas
            ctx.drawImage(
                puzzleImage,
                sourceX, sourceY, pieceWidth, pieceHeight,
                0, 0, pieceWidth, pieceHeight
            )
            
            // Создаем data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
            
            pieces.push({
                index: pieceIndex,
                dataUrl: dataUrl,
                correctPosition: pieceIndex
            })
        }
    }
    
    console.log(`Создано ${pieces.length} частей пазла (ожидалось: ${levelConfig.pieces})`)
    
    // ВАЖНО: Проверяем, что количество элементов правильное
    if (pieces.length !== levelConfig.pieces) {
        console.error(`❌ ОШИБКА: Создано ${pieces.length} элементов, но должно быть ${levelConfig.pieces}!`)
        return
    }
    
    // Сохраняем правильный порядок
    correctOrder = pieces.map(p => p.index)
    
    // Перемешиваем части
    const shuffledPieces = shuffleArray([...pieces])
    
    // ВАЖНО: Проверяем, что контейнер все еще пуст перед добавлением
    if (puzzlePiecesEl.children.length > 0) {
        console.error(`❌ КРИТИЧЕСКАЯ ОШИБКА: Контейнер не пуст перед добавлением элементов! Количество: ${puzzlePiecesEl.children.length}`)
        return
    }
    
    // Создаем DOM элементы для частей
    let addedCount = 0
    shuffledPieces.forEach((piece, index) => {
        const pieceElement = document.createElement('div')
        pieceElement.className = 'puzzle-piece'
        pieceElement.setAttribute('draggable', 'true') // Устанавливаем как HTML атрибут для надежности
        pieceElement.dataset.pieceIndex = piece.index
        pieceElement.dataset.correctPosition = piece.correctPosition
        
        const img = document.createElement('img')
        img.src = piece.dataUrl
        img.alt = `Часть пазла ${piece.index + 1}`
        img.style.width = '100%'
        img.style.height = '100%'
        img.style.objectFit = 'cover'
        img.setAttribute('draggable', 'false') // Изображение не должно быть draggable, только контейнер
        img.style.pointerEvents = 'none' // Изображение не должно перехватывать события
        pieceElement.appendChild(img)
        
        // Drag & Drop события (для десктопа) - добавляем на сам элемент, не на img
        pieceElement.addEventListener('dragstart', handlePieceDragStart, false)
        pieceElement.addEventListener('dragend', handlePieceDragEnd, false)
        
        // Touch события (только для touch-устройств, чтобы не мешать drag на десктопе)
        // Проверяем более точно - только если это действительно touch устройство (не гибрид)
        const isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && 
                               window.matchMedia('(pointer: coarse)').matches
        if (isTouchDevice) {
            setupTouchHandlers(pieceElement, 'piece')
        }
        
        puzzlePiecesEl.appendChild(pieceElement)
        puzzlePieces.push({
            element: pieceElement,
            index: piece.index,
            correctPosition: piece.correctPosition,
            dataUrl: piece.dataUrl,
            isOnBoard: false,
            cellIndex: -1
        })
    })
    
    console.log(`Добавлено ${puzzlePiecesEl.children.length} элементов в контейнер`)
    console.log(`Массив puzzlePieces содержит ${puzzlePieces.length} элементов`)
}

// ============================================
// ПЕРЕМЕШИВАНИЕ МАССИВА
// ============================================

function shuffleArray(array) {
    const shuffled = [...array]
    // Усиленное перемешивание - делаем больше перестановок
    for (let round = 0; round < 3; round++) {
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
    }
    return shuffled
}

// ============================================
// TOUCH ОБРАБОТЧИКИ ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ
// ============================================

let touchStartX = 0
let touchStartY = 0
let touchElement = null
let touchOffsetX = 0
let touchOffsetY = 0
let touchGhost = null

function setupTouchHandlers(element, type) {
    // Проверяем, что это действительно touch-устройство (не гибрид)
    const isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && 
                           window.matchMedia('(pointer: coarse)').matches
    if (!isTouchDevice) {
        return // Не добавляем touch обработчики на десктопе
    }
    
    element.addEventListener('touchstart', (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        const touch = e.touches[0]
        touchStartX = touch.clientX
        touchStartY = touch.clientY
        touchElement = element
        
        // Получаем позицию элемента
        const rect = element.getBoundingClientRect()
        touchOffsetX = touch.clientX - rect.left
        touchOffsetY = touch.clientY - rect.top
        
        // Добавляем визуальный класс
        element.classList.add('touching')
        
        // Создаем "призрачный" элемент для визуализации
        createTouchGhost(element, touch.clientX, touch.clientY)
        
        // Сохраняем тип элемента
        element.dataset.touchType = type
        if (type === 'cell-piece') {
            element.dataset.touchCellIndex = element.dataset.cellIndex
            element.dataset.touchPieceIndex = element.dataset.pieceIndex
        }
    }, { passive: false })
    
    element.addEventListener('touchmove', (e) => {
        if (!touchElement || touchElement !== element) return
        
        e.preventDefault()
        e.stopPropagation()
        
        const touch = e.touches[0]
        const currentX = touch.clientX
        const currentY = touch.clientY
        
        // Обновляем позицию призрачного элемента
        if (touchGhost) {
            touchGhost.style.left = (currentX - touchOffsetX) + 'px'
            touchGhost.style.top = (currentY - touchOffsetY) + 'px'
        }
        
        // Находим ячейку под пальцем
        const elementBelow = document.elementFromPoint(currentX, currentY)
        const cellBelow = elementBelow?.closest('.puzzle-cell')
        
        // Убираем подсветку со всех ячеек
        document.querySelectorAll('.puzzle-cell').forEach(c => {
            c.classList.remove('drag-over')
        })
        
        // Подсвечиваем ячейку под пальцем
        if (cellBelow) {
            cellBelow.classList.add('drag-over')
        }
    }, { passive: false })
    
    element.addEventListener('touchend', (e) => {
        if (!touchElement || touchElement !== element) return
        
        e.preventDefault()
        e.stopPropagation()
        
        const touch = e.changedTouches[0]
        const endX = touch.clientX
        const endY = touch.clientY
        
        // Убираем визуальные эффекты
        element.classList.remove('touching')
        document.querySelectorAll('.puzzle-cell').forEach(c => {
            c.classList.remove('drag-over')
        })
        
        // Находим ячейку под пальцем в момент отпускания
        const elementBelow = document.elementFromPoint(endX, endY)
        const cellBelow = elementBelow?.closest('.puzzle-cell')
        
        // Удаляем призрачный элемент
        if (touchGhost) {
            touchGhost.remove()
            touchGhost = null
        }
        
        // Обрабатываем drop
        if (cellBelow) {
            handleTouchDrop(element, cellBelow, element.dataset.touchType)
        }
        
        // Сбрасываем состояние
        touchElement = null
        touchStartX = 0
        touchStartY = 0
    }, { passive: false })
    
    element.addEventListener('touchcancel', (e) => {
        if (touchElement === element) {
            element.classList.remove('touching')
            document.querySelectorAll('.puzzle-cell').forEach(c => {
                c.classList.remove('drag-over')
            })
            if (touchGhost) {
                touchGhost.remove()
                touchGhost = null
            }
            touchElement = null
        }
    }, { passive: false })
}

function setupCellTouchHandlers(cell) {
    // Проверяем, что это действительно touch-устройство
    if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
        return // Не добавляем touch обработчики на десктопе
    }
    
    cell.addEventListener('touchmove', (e) => {
        // Разрешаем touchmove для ячеек, чтобы можно было перетаскивать элементы
        if (touchElement) {
            e.preventDefault()
        }
    }, { passive: false })
}

function createTouchGhost(element, x, y) {
    // Создаем копию элемента для визуализации
    touchGhost = element.cloneNode(true)
    touchGhost.style.position = 'fixed'
    touchGhost.style.left = (x - touchOffsetX) + 'px'
    touchGhost.style.top = (y - touchOffsetY) + 'px'
    touchGhost.style.width = element.offsetWidth + 'px'
    touchGhost.style.height = element.offsetHeight + 'px'
    touchGhost.style.opacity = '0.7'
    touchGhost.style.pointerEvents = 'none'
    touchGhost.style.zIndex = '10000'
    touchGhost.classList.add('touching')
    document.body.appendChild(touchGhost)
}

function handleTouchDrop(element, targetCell, type) {
    const cellIndex = parseInt(targetCell.dataset.index)
    
    if (type === 'piece') {
        // Перетаскиваем часть из контейнера
        const pieceIndex = parseInt(element.dataset.pieceIndex)
        const piece = puzzlePieces.find(p => p.index === pieceIndex)
        if (!piece) return
        
        // Если ячейка уже занята - возвращаем старую часть в контейнер
        if (targetCell.dataset.pieceIndex !== '-1') {
            returnPieceToContainer(targetCell, cellIndex)
        }
        
        // Размещаем новую часть на доске
        placePieceOnBoard(targetCell, cellIndex, pieceIndex, piece)
        
        // Скрываем часть из контейнера
        element.style.display = 'none'
        piece.isOnBoard = true
        piece.cellIndex = cellIndex
        
    } else if (type === 'cell-piece') {
        // Перетаскиваем часть с доски
        const fromCellIndex = parseInt(element.dataset.touchCellIndex)
        const pieceIndex = parseInt(element.dataset.touchPieceIndex)
        const piece = puzzlePieces.find(p => p.index === pieceIndex)
        
        if (!piece || fromCellIndex === cellIndex) return
        
        // Если целевая ячейка занята - возвращаем старую часть в контейнер
        if (targetCell.dataset.pieceIndex !== '-1') {
            const targetPieceIndex = parseInt(targetCell.dataset.pieceIndex)
            const targetPiece = puzzlePieces.find(p => p.index === targetPieceIndex)
            
            if (targetPiece) {
                returnPieceToContainerAtPosition(cellIndex, targetPieceIndex, targetPiece)
            }
        }
        
        // Убираем текущий элемент из исходной ячейки
        removePieceFromBoard(fromCellIndex)
        
        // Размещаем перетаскиваемую часть на новое место
        placePieceOnBoard(targetCell, cellIndex, pieceIndex, piece)
        piece.isOnBoard = true
        piece.cellIndex = cellIndex
    }
    
    // Проверяем, собран ли пазл
    checkPuzzleComplete()
}

// ============================================
// DRAG & DROP ОБРАБОТЧИКИ
// ============================================

// Перетаскивание частей из контейнера
function handlePieceDragStart(e) {
    // Проверяем, что это действительно drag событие (не touch)
    if (e.type === 'touchstart' || (e.touches && e.touches.length > 0)) {
        return // Пропускаем touch события, они обрабатываются отдельно
    }
    
    // Находим элемент .puzzle-piece (может быть сам элемент или его дочерний элемент)
    draggedPiece = e.target.closest('.puzzle-piece')
    if (!draggedPiece) {
        // Если клик по img внутри, находим родительский .puzzle-piece
        draggedPiece = e.target.parentElement?.closest('.puzzle-piece')
    }
    if (!draggedPiece) {
        console.warn('Не найден .puzzle-piece для drag')
        return
    }
    
    console.log('✅ Drag start на десктопе:', draggedPiece, 'pieceIndex:', draggedPiece.dataset.pieceIndex)
    draggedPiece.classList.add('dragging')
    
    // Устанавливаем данные для drag
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', 'piece') // Маркер, что это часть из контейнера
    e.dataTransfer.setData('piece-index', draggedPiece.dataset.pieceIndex || '')
    
    // Создаем визуальный эффект
    draggedPiece.style.opacity = '0.5'
}

function handlePieceDragEnd(e) {
    if (draggedPiece) {
        draggedPiece.classList.remove('dragging')
        draggedPiece.style.opacity = '1'
        draggedPiece = null
    }
    // Убираем класс drag-over со всех ячеек
    document.querySelectorAll('.puzzle-cell').forEach(c => {
        c.classList.remove('drag-over')
    })
}

// Перетаскивание частей с доски
function handleCellDragStart(e) {
    // Проверяем, что это действительно drag событие (не touch)
    if (e.type === 'touchstart' || (e.touches && e.touches.length > 0)) {
        return // Пропускаем touch события, они обрабатываются отдельно
    }
    
    const img = e.target
    if (!img.classList.contains('puzzle-piece-placed')) {
        return
    }
    
    const cellIndex = parseInt(img.dataset.cellIndex)
    const pieceIndex = parseInt(img.dataset.pieceIndex)
    
    if (isNaN(cellIndex) || isNaN(pieceIndex) || cellIndex === -1) {
        return
    }
    
    console.log('✅ Cell drag start на десктопе:', { cellIndex, pieceIndex })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', 'cell-piece') // Маркер, что это часть с доски
    e.dataTransfer.setData('cell-index', cellIndex.toString())
    e.dataTransfer.setData('piece-index', pieceIndex.toString())
    
    // Визуально отмечаем изображение как перетаскиваемое
    img.style.opacity = '0.5'
    
    // Находим родительскую ячейку
    const cell = img.closest('.puzzle-cell')
    if (cell) {
        cell.classList.add('dragging')
    }
}

function handleCellDragEnd(e) {
    const img = e.target
    if (img.classList.contains('puzzle-piece-placed')) {
        img.style.opacity = '1'
    }
    
    // Убираем класс dragging со всех ячеек
    document.querySelectorAll('.puzzle-cell').forEach(c => {
        c.classList.remove('dragging')
    })
    
    // Убираем класс drag-over со всех ячеек
    document.querySelectorAll('.puzzle-cell').forEach(c => {
        c.classList.remove('drag-over')
    })
}

function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    
    const cell = e.target.closest('.puzzle-cell')
    if (cell) {
        cell.classList.add('drag-over')
    }
}

function handleDragLeave(e) {
    const cell = e.target.closest('.puzzle-cell')
    if (cell) {
        cell.classList.remove('drag-over')
    }
}

function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    
    const cell = e.target.closest('.puzzle-cell')
    if (!cell) {
        document.querySelectorAll('.puzzle-cell').forEach(c => {
            c.classList.remove('drag-over')
        })
        return
    }
    
    const cellIndex = parseInt(cell.dataset.index)
    const dragType = e.dataTransfer.getData('text/plain')
    
    // Если перетаскиваем часть из контейнера
    if (dragType === 'piece' && draggedPiece && typeof draggedPiece === 'object' && draggedPiece.nodeType) {
        const pieceIndex = parseInt(draggedPiece.dataset.pieceIndex)
        const piece = puzzlePieces.find(p => p.index === pieceIndex)
        if (!piece) {
            cell.classList.remove('drag-over')
            return
        }
        
        // Если ячейка уже занята - возвращаем старую часть в контейнер
        if (cell.dataset.pieceIndex !== '-1') {
            returnPieceToContainer(cell, cellIndex)
        }
        
        // Размещаем новую часть на доске
        placePieceOnBoard(cell, cellIndex, pieceIndex, piece)
        
        // Скрываем часть из контейнера
        draggedPiece.style.display = 'none'
        piece.isOnBoard = true
        piece.cellIndex = cellIndex
        
    } 
    // Если перетаскиваем часть с доски
    else if (dragType === 'cell-piece') {
        const fromCellIndex = parseInt(e.dataTransfer.getData('cell-index'))
        const pieceIndex = parseInt(e.dataTransfer.getData('piece-index'))
        const piece = puzzlePieces.find(p => p.index === pieceIndex)
        
        if (!piece || fromCellIndex === cellIndex) {
            cell.classList.remove('drag-over')
            return
        }
        
        // Если целевая ячейка занята - возвращаем старую часть в контейнер, размещаем новую
        if (cell.dataset.pieceIndex !== '-1') {
            const targetPieceIndex = parseInt(cell.dataset.pieceIndex)
            const targetPiece = puzzlePieces.find(p => p.index === targetPieceIndex)
            
            // Убираем элемент из целевой ячейки (возвращаем в контейнер)
            if (targetPiece) {
                returnPieceToContainerAtPosition(cellIndex, targetPieceIndex, targetPiece)
            }
        }
        
        // Убираем текущий элемент из исходной ячейки
        removePieceFromBoard(fromCellIndex)
        
        // Размещаем перетаскиваемую часть на новое место
        placePieceOnBoard(cell, cellIndex, pieceIndex, piece)
        piece.isOnBoard = true
        piece.cellIndex = cellIndex
    }
    
    cell.classList.remove('drag-over')
    
    // Проверяем, собран ли пазл
    checkPuzzleComplete()
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С ДОСКОЙ
// ============================================

function placePieceOnBoard(cell, cellIndex, pieceIndex, piece) {
    cell.dataset.pieceIndex = pieceIndex
    cell.classList.add('filled')
    cell.classList.remove('drag-over')
    
    // Очищаем ячейку перед размещением
    const existingImg = cell.querySelector('.puzzle-piece-placed')
    if (existingImg) {
        existingImg.remove()
    }
    
    // Создаем изображение в ячейке
    const img = document.createElement('img')
    img.src = piece.dataUrl
    img.className = 'puzzle-piece-placed'
    img.alt = `Часть пазла ${pieceIndex + 1}`
    img.setAttribute('draggable', 'true') // Устанавливаем как HTML атрибут для надежности
    img.dataset.cellIndex = cellIndex
    img.dataset.pieceIndex = pieceIndex
    
    // Обработчики для перетаскивания элементов с доски (десктоп)
    img.addEventListener('dragstart', handleCellDragStart, false)
    img.addEventListener('dragend', handleCellDragEnd, false)
    
    // Touch события (только для touch-устройств, чтобы не мешать drag на десктопе)
    // Проверяем более точно - только если это действительно touch устройство (не гибрид)
    const isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && 
                           window.matchMedia('(pointer: coarse)').matches
    if (isTouchDevice) {
        setupTouchHandlers(img, 'cell-piece')
    }
    
    cell.appendChild(img)
    
    // Обновляем состояние доски
    puzzleBoard[cellIndex].pieceIndex = pieceIndex
}

function removePieceFromBoard(cellIndex) {
    const cell = puzzleBoard[cellIndex].element
    if (!cell) return
    
    const pieceIndex = parseInt(cell.dataset.pieceIndex)
    if (pieceIndex === -1) return
    
    const piece = puzzlePieces.find(p => p.index === pieceIndex)
    if (piece) {
        piece.isOnBoard = false
        piece.cellIndex = -1
    }
    
    // Очищаем ячейку
    cell.dataset.pieceIndex = '-1'
    cell.classList.remove('filled')
    const img = cell.querySelector('.puzzle-piece-placed')
    if (img) {
        img.remove()
    }
    
    puzzleBoard[cellIndex].pieceIndex = -1
}

function returnPieceToContainer(cell, cellIndex) {
    const oldPieceIndex = parseInt(cell.dataset.pieceIndex)
    if (oldPieceIndex === -1) return
    
    const oldPiece = puzzlePieces.find(p => p.index === oldPieceIndex)
    if (!oldPiece) return
    
    // Убираем часть с доски
    removePieceFromBoard(cellIndex)
    
    // Возвращаем часть в контейнер
    oldPiece.element.style.display = 'block'
    oldPiece.isOnBoard = false
    oldPiece.cellIndex = -1
}

function returnPieceToContainerAtPosition(cellIndex, pieceIndex, piece) {
    // Убираем часть с доски
    removePieceFromBoard(cellIndex)
    
    // Возвращаем часть в контейнер
    piece.element.style.display = 'block'
    piece.isOnBoard = false
    piece.cellIndex = -1
}

// ============================================
// ПРОВЕРКА ЗАВЕРШЕНИЯ ПАЗЛА
// ============================================

function checkPuzzleComplete() {
    // Проверяем, все ли ячейки заполнены
    const allFilled = puzzleBoard.every(cell => cell.pieceIndex !== -1)
    
    if (!allFilled) {
        return
    }
    
    // Проверяем правильность расположения
    const isCorrect = puzzleBoard.every((cell, index) => {
        const piece = puzzlePieces.find(p => p.index === cell.pieceIndex)
        return piece && piece.correctPosition === index
    })
    
    if (isCorrect) {
        // Пазл собран правильно!
        stopTimer()
        showSuccessModal()
    }
}

// ============================================
// ТАЙМЕР
// ============================================

function startTimer() {
    startTime = Date.now()
    timerInterval = setInterval(updateTimer, 100)
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
    }
}

function updateTimer() {
    if (!startTime) return
    
    const elapsed = Date.now() - startTime
    const seconds = Math.floor(elapsed / 1000)
    const minutes = Math.floor(seconds / 60)
    const displaySeconds = seconds % 60
    
    timerDisplayEl.textContent = `${String(minutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`
}

// ============================================
// МОДАЛЬНОЕ ОКНО УСПЕХА
// ============================================

function showSuccessModal() {
    // ВАЖНО: Сохраняем текущий уровень СРАЗУ в начале функции
    const completedLevel = currentLevel
    console.log(`\n=== ПОКАЗЫВАЕМ МОДАЛЬНОЕ ОКНО ===`)
    console.log(`Завершен уровень: ${completedLevel}`)
    
    const levelConfig = LEVELS[completedLevel]
    if (!levelConfig) {
        console.error(`Конфигурация уровня ${completedLevel} не найдена!`)
        return
    }
    
    console.log(`Конфигурация уровня ${completedLevel}:`, levelConfig)
    
    // Устанавливаем изображение
    modalImageEl.src = levelConfig.imageUrl
    console.log(`Изображение модального окна: ${levelConfig.imageUrl}`)
    
    // Устанавливаем текст промокода
    promoTextEl.textContent = levelConfig.promoText
    
    // Устанавливаем текст кнопки и обработчик
    const nextLevel = completedLevel + 1
    
    // После уровня 1 игра завершается
    console.log('Устанавливаем кнопку "Вернуться в магазин"')
    nextLevelBtn.textContent = 'Вернуться в магазин'
    nextLevelBtn.onclick = () => {
        window.location.href = 'index.html'
    }
    
    // Показываем модальное окно
    successModal.classList.add('show')
    console.log(`Модальное окно показано`)
}

function hideModal() {
    successModal.classList.remove('show')
}

// ============================================
// СКАЧИВАНИЕ ИЗОБРАЖЕНИЯ
// ============================================

function downloadImage() {
    const levelConfig = LEVELS[currentLevel]
    const link = document.createElement('a')
    link.href = levelConfig.imageUrl
    link.download = `puzzle-level-${currentLevel}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

// ============================================
// ПЕРЕХОД НА СЛЕДУЮЩИЙ УРОВЕНЬ
// ============================================

// Функция goToNextLevel больше не используется - переход происходит напрямую из showSuccessModal


// ============================================
// АДМИН-ПАНЕЛЬ - ОСНОВНАЯ ЛОГИКА
// ============================================

// Защита от масштабирования при двойном нажатии на мобильных
let lastTouchEnd = 0
document.addEventListener('touchend', (e) => {
    const now = Date.now()
    if (now - lastTouchEnd <= 300) {
        e.preventDefault()
    }
    lastTouchEnd = now
}, false)

// Элементы DOM
const loginScreen = document.getElementById('loginScreen')
const adminPanel = document.getElementById('adminPanel')
const loginForm = document.getElementById('loginForm')
const logoutBtn = document.getElementById('logoutBtn')
const loginError = document.getElementById('loginError')

// Навигация
const navButtons = document.querySelectorAll('.nav-btn')
const tabContents = document.querySelectorAll('.tab-content')

// Форма добавления товара
const addItemForm = document.getElementById('addItemForm')
const photoInput = document.getElementById('photoInput')
const uploadPhotoBtn = document.getElementById('uploadPhotoBtn')
const photoPreview = document.getElementById('photoPreview')
const resetBtn = document.getElementById('resetBtn')
const addItemMessage = document.getElementById('addItemMessage')

// Список товаров
const itemsList = document.getElementById('itemsList')
const refreshItemsBtn = document.getElementById('refreshItemsBtn')
const itemsCount = document.getElementById('itemsCount')

// Статистика
const statsContent = document.getElementById('statsContent')
const refreshStatsBtn = document.getElementById('refreshStatsBtn')

// Состояние
let isAuthenticated = false
let selectedPhotos = []

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Админ-панель загружается...')
    
    // Проверяем, авторизован ли пользователь
    const savedAuth = sessionStorage.getItem('admin_authenticated')
    if (savedAuth === 'true') {
        isAuthenticated = true
        showAdminPanel()
    } else {
        showLoginScreen()
    }
    
    // Настройка обработчиков
    setupEventListeners()
})

// ============================================
// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
// ============================================

function setupEventListeners() {
    // Форма входа
    loginForm.addEventListener('submit', handleLogin)
    
    // Выход
    logoutBtn.addEventListener('click', handleLogout)
    
    // Навигация
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab
            switchTab(tab)
        })
    })
    
    // Загрузка фото
    uploadPhotoBtn.addEventListener('click', () => photoInput.click())
    photoInput.addEventListener('change', handlePhotoSelect)
    
    // Форма добавления товара
    addItemForm.addEventListener('submit', handleAddItem)
    resetBtn.addEventListener('click', resetForm)
    
    // Обновление списка товаров
    refreshItemsBtn.addEventListener('click', loadItems)
    
    // Обновление статистики
    refreshStatsBtn.addEventListener('click', loadStats)
}

// ============================================
// АВТОРИЗАЦИЯ
// ============================================

async function handleLogin(e) {
    e.preventDefault()
    
    const username = document.getElementById('username').value
    const password = document.getElementById('password').value
    
    loginError.style.display = 'none'
    
    try {
        const { supabase } = await import('./supabase.js')
        
        console.log('Попытка входа:', username)
        
        // Сначала пробуем простой запрос для проверки доступа
        console.log('Проверяю доступ к таблице admin_auth...')
        const { data: testData, error: testError } = await supabase
            .from('admin_auth')
            .select('id')
            .limit(1)
        
        if (testError) {
            console.error('❌ Ошибка доступа к таблице:', testError)
            
            // Ошибка 406 или 403 означает, что политика безопасности блокирует доступ
            if (testError.code === 'PGRST116' || 
                testError.message?.includes('406') || 
                testError.message?.includes('403') || 
                testError.code === '42501' ||
                testError.status === 406 ||
                testError.status === 403) {
                loginError.innerHTML = `
                    <strong>❌ Политика безопасности блокирует доступ!</strong><br><br>
                    <strong>Что делать:</strong><br>
                    1. Откройте <a href="https://supabase.com/dashboard" target="_blank">Supabase Dashboard</a><br>
                    2. Выберите ваш проект<br>
                    3. Откройте <strong>SQL Editor</strong><br>
                    4. Настройте политики безопасности для таблицы admin_auth<br>
                    5. Обновите эту страницу (F5) и попробуйте снова
                `
            } else {
                loginError.textContent = `Ошибка подключения: ${testError.message || testError.code || 'Неизвестная ошибка'}`
            }
            loginError.style.display = 'block'
            return
        }
        
        console.log('✅ Доступ к таблице есть, проверяю логин и пароль...')
        
        // Проверяем логин и пароль в базе данных
        // НЕ используем .single() - он вызывает ошибку если записей нет
        const { data, error } = await supabase
            .from('admin_auth')
            .select('*')
            .eq('username', username)
            .eq('password_hash', password) // Пока простое сравнение (без хеширования)
        
        console.log('Результат запроса:', { data, error, dataLength: data?.length })
        
        // Проверяем ошибки
        if (error) {
            console.error('Ошибка Supabase:', error)
            loginError.textContent = `Ошибка: ${error.message || 'Не удалось проверить логин и пароль'}`
            loginError.style.display = 'block'
            return
        }
        
        // Проверяем, найдена ли запись
        // data должен быть массивом, даже если записей нет
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.log('Запись не найдена. Проверьте логин и пароль.')
            loginError.textContent = 'Неверный логин или пароль'
            loginError.style.display = 'block'
            return
        }
        
        // Проверяем, что нашли ровно одну запись
        if (data.length > 1) {
            console.warn('Найдено несколько записей с таким логином!')
        }
        
        // Успешный вход
        console.log('✅ Вход выполнен успешно')
        isAuthenticated = true
        sessionStorage.setItem('admin_authenticated', 'true')
        showAdminPanel()
        
    } catch (error) {
        console.error('Ошибка входа:', error)
        loginError.innerHTML = `
            <strong>Критическая ошибка!</strong><br>
            ${error.message || 'Не удалось подключиться к базе данных'}<br>
            Проверьте консоль браузера для подробностей.
        `
        loginError.style.display = 'block'
    }
}

function handleLogout() {
    isAuthenticated = false
    sessionStorage.removeItem('admin_authenticated')
    showLoginScreen()
    resetForm()
}

function showLoginScreen() {
    loginScreen.style.display = 'flex'
    adminPanel.style.display = 'none'
    document.getElementById('username').value = ''
    document.getElementById('password').value = ''
}

function showAdminPanel() {
    loginScreen.style.display = 'none'
    adminPanel.style.display = 'block'
    
    // Загружаем данные при открытии
    switchTab('add')
}

// ============================================
// НАВИГАЦИЯ ПО ВКЛАДКАМ
// ============================================

function switchTab(tabName) {
    // Обновляем кнопки
    navButtons.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active')
        } else {
            btn.classList.remove('active')
        }
    })
    
    // Обновляем вкладки
    tabContents.forEach(tab => {
        if (tab.id === `tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`) {
            tab.classList.add('active')
            
            // Загружаем данные при открытии вкладки
            if (tabName === 'items') {
                loadItems()
            } else if (tabName === 'stats') {
                loadStats()
            }
        } else {
            tab.classList.remove('active')
        }
    })
}

// ============================================
// ЗАГРУЗКА ФОТО
// ============================================

function handlePhotoSelect(e) {
    const files = Array.from(e.target.files)
    
    // Ограничиваем до 10 фото
    const remainingSlots = 10 - selectedPhotos.length
    const filesToAdd = files.slice(0, remainingSlots)
    
    if (files.length > remainingSlots) {
        alert(`Можно загрузить максимум 10 фото. Добавлено ${filesToAdd.length} из ${files.length}`)
    }
    
    // Добавляем файлы
    filesToAdd.forEach(file => {
        if (file.type.startsWith('image/')) {
            selectedPhotos.push(file)
            displayPhotoPreview(file)
        }
    })
    
    // Очищаем input
    photoInput.value = ''
}

function displayPhotoPreview(file, index = null) {
    const reader = new FileReader()
    
    reader.onload = (e) => {
        const previewItem = document.createElement('div')
        previewItem.className = 'photo-preview-item'
        previewItem.draggable = true
        previewItem.dataset.fileIndex = index !== null ? index : selectedPhotos.length - 1
        
        // Номер фото
        const photoNumber = document.createElement('div')
        photoNumber.className = 'photo-number'
        photoNumber.textContent = (index !== null ? index : selectedPhotos.length - 1) + 1
        
        const img = document.createElement('img')
        img.src = e.target.result
        img.alt = 'Превью фото'
        img.draggable = false
        
        // Кнопки управления
        const controls = document.createElement('div')
        controls.className = 'photo-controls'
        
        // Кнопка удаления
        const removeBtn = document.createElement('button')
        removeBtn.className = 'remove-photo'
        removeBtn.textContent = '×'
        removeBtn.type = 'button'
        removeBtn.title = 'Удалить фото'
        removeBtn.onclick = () => {
            const fileIndex = parseInt(previewItem.dataset.fileIndex)
            if (fileIndex > -1 && fileIndex < selectedPhotos.length) {
                selectedPhotos.splice(fileIndex, 1)
            }
            previewItem.remove()
            updatePhotoPreviews()
        }
        
        // Кнопка вверх
        const upBtn = document.createElement('button')
        upBtn.className = 'move-photo move-up'
        upBtn.textContent = '↑'
        upBtn.type = 'button'
        upBtn.title = 'Переместить вверх'
        upBtn.onclick = () => {
            const fileIndex = parseInt(previewItem.dataset.fileIndex)
            if (fileIndex > 0) {
                const temp = selectedPhotos[fileIndex]
                selectedPhotos[fileIndex] = selectedPhotos[fileIndex - 1]
                selectedPhotos[fileIndex - 1] = temp
                updatePhotoPreviews()
            }
        }
        
        // Кнопка вниз
        const downBtn = document.createElement('button')
        downBtn.className = 'move-photo move-down'
        downBtn.textContent = '↓'
        downBtn.type = 'button'
        downBtn.title = 'Переместить вниз'
        downBtn.onclick = () => {
            const fileIndex = parseInt(previewItem.dataset.fileIndex)
            if (fileIndex < selectedPhotos.length - 1) {
                const temp = selectedPhotos[fileIndex]
                selectedPhotos[fileIndex] = selectedPhotos[fileIndex + 1]
                selectedPhotos[fileIndex + 1] = temp
                updatePhotoPreviews()
            }
        }
        
        controls.appendChild(upBtn)
        controls.appendChild(downBtn)
        controls.appendChild(removeBtn)
        
        previewItem.appendChild(photoNumber)
        previewItem.appendChild(img)
        previewItem.appendChild(controls)
        
        // Drag & Drop
        previewItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/html', previewItem.outerHTML)
            previewItem.classList.add('dragging')
        })
        
        previewItem.addEventListener('dragend', () => {
            previewItem.classList.remove('dragging')
        })
        
        previewItem.addEventListener('dragover', (e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            const dragging = document.querySelector('.photo-preview-item.dragging')
            if (dragging && dragging !== previewItem) {
                const allItems = Array.from(photoPreview.querySelectorAll('.photo-preview-item'))
                const draggingIndex = allItems.indexOf(dragging)
                const currentIndex = allItems.indexOf(previewItem)
                
                if (draggingIndex < currentIndex) {
                    photoPreview.insertBefore(dragging, previewItem.nextSibling)
                } else {
                    photoPreview.insertBefore(dragging, previewItem)
                }
            }
        })
        
        previewItem.addEventListener('drop', (e) => {
            e.preventDefault()
            const dragging = document.querySelector('.photo-preview-item.dragging')
            if (dragging && dragging !== previewItem) {
                const allItems = Array.from(photoPreview.querySelectorAll('.photo-preview-item'))
                const draggingIndex = allItems.indexOf(dragging)
                const currentIndex = allItems.indexOf(previewItem)
                
                // Обновляем массив selectedPhotos
                const temp = selectedPhotos[draggingIndex]
                selectedPhotos[draggingIndex] = selectedPhotos[currentIndex]
                selectedPhotos[currentIndex] = temp
                
                updatePhotoPreviews()
            }
        })
        
        if (index !== null) {
            photoPreview.insertBefore(previewItem, photoPreview.children[index] || null)
        } else {
            photoPreview.appendChild(previewItem)
        }
    }
    
    reader.readAsDataURL(file)
}

function updatePhotoPreviews() {
    console.log('Обновляю превью фото. Всего фото:', selectedPhotos.length)
    
    // Сохраняем текущие файлы
    const files = [...selectedPhotos]
    
    // Очищаем превью
    photoPreview.innerHTML = ''
    
    // Пересоздаем превью в правильном порядке
    files.forEach((file, index) => {
        console.log(`Создаю превью фото ${index + 1}/${files.length}`)
        displayPhotoPreview(file, index)
    })
    
    console.log('Превью обновлено. Фото в порядке:', files.map((_, i) => i + 1).join(', '))
}

// ============================================
// ЗАГРУЗКА ФОТО В SUPABASE STORAGE
// ============================================

async function uploadPhotosToStorage() {
    if (selectedPhotos.length === 0) {
        return []
    }
    
    const { supabase } = await import('./supabase.js')
    const uploadedUrls = []
    
    showMessage('Загрузка фото...', 'info')
    
    for (let i = 0; i < selectedPhotos.length; i++) {
        const file = selectedPhotos[i]
        const timestamp = Date.now()
        const fileName = `${timestamp}_${i}_${file.name}`
        const filePath = fileName
        
        try {
            // Загружаем файл в Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('item-images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                })
            
            if (uploadError) {
                console.error('Ошибка загрузки фото:', uploadError)
                throw uploadError
            }
            
            // Получаем публичный URL
            const { data: urlData } = supabase.storage
                .from('item-images')
                .getPublicUrl(filePath)
            
            uploadedUrls.push(urlData.publicUrl)
            console.log(`Фото ${i + 1}/${selectedPhotos.length} загружено:`, urlData.publicUrl)
            
        } catch (error) {
            console.error(`Ошибка загрузки фото ${i + 1}:`, error)
            throw new Error(`Не удалось загрузить фото ${i + 1}`)
        }
    }
    
    return uploadedUrls
}

// ============================================
// ДОБАВЛЕНИЕ ТОВАРА
// ============================================

async function handleAddItem(e) {
    e.preventDefault()
    
    const submitBtn = document.getElementById('submitBtn')
    submitBtn.disabled = true
    submitBtn.textContent = '⏳ Добавление...'
    
    try {
        // Получаем данные формы
        const title = document.getElementById('itemTitle').value.trim()
        const description = document.getElementById('itemDescription').value.trim()
        const price = parseFloat(document.getElementById('itemPrice').value)
        const collection = document.getElementById('itemCollection').value
        const size = document.getElementById('itemSize').value
        
        // Валидация
        if (!title || !price || !collection || !size) {
            throw new Error('Заполните все обязательные поля')
        }
        
        if (price <= 0) {
            throw new Error('Цена должна быть больше 0')
        }
        
        // Загружаем фото
        let imageUrls = []
        if (selectedPhotos.length > 0) {
            imageUrls = await uploadPhotosToStorage()
        }
        
        // Добавляем товар в базу данных
        const { supabase } = await import('./supabase.js')
        
        const { data, error } = await supabase
            .from('items')
            .insert({
                title,
                description: description || null,
                price,
                image_urls: imageUrls,
                collection,
                size,
                is_active: true
            })
            .select()
            .single()
        
        if (error) {
            console.error('Ошибка добавления товара:', error)
            throw new Error(`Ошибка: ${error.message}`)
        }
        
        // Успех
        showMessage('✅ Товар успешно добавлен!', 'success')
        resetForm()
        
        // Переключаемся на вкладку со списком товаров
        setTimeout(() => {
            switchTab('items')
        }, 1500)
        
    } catch (error) {
        console.error('Ошибка:', error)
        showMessage(`❌ ${error.message}`, 'error')
    } finally {
        submitBtn.disabled = false
        submitBtn.textContent = '✅ Добавить товар'
    }
}

function resetForm() {
    addItemForm.reset()
    selectedPhotos = []
    photoPreview.innerHTML = ''
    addItemMessage.style.display = 'none'
    updatePhotoPreviews()
}

function showMessage(text, type) {
    addItemMessage.textContent = text
    addItemMessage.className = `message ${type}`
    addItemMessage.style.display = 'block'
    
    if (type === 'success') {
        setTimeout(() => {
            addItemMessage.style.display = 'none'
        }, 3000)
    }
}

// ============================================
// ЗАГРУЗКА СПИСКА ТОВАРОВ
// ============================================

async function loadItems() {
    itemsList.innerHTML = '<div class="loading">Загрузка товаров...</div>'
    
    try {
        const { supabase } = await import('./supabase.js')
        
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .order('created_at', { ascending: false })
        
        if (error) {
            throw error
        }
        
        itemsCount.textContent = data.length
        
        if (data.length === 0) {
            itemsList.innerHTML = '<div class="loading">Товаров пока нет</div>'
            return
        }
        
        itemsList.innerHTML = ''
        data.forEach(item => {
            const card = createItemCard(item)
            itemsList.appendChild(card)
        })
        
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error)
        itemsList.innerHTML = '<div class="loading" style="color: #dc3545;">Ошибка загрузки товаров</div>'
    }
}

function createItemCard(item) {
    const card = document.createElement('div')
    card.className = 'item-card-admin'
    
    // Фото
    const img = document.createElement('img')
    if (item.image_urls && item.image_urls.length > 0) {
        img.src = item.image_urls[0]
        img.alt = item.title
    } else {
        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EНет фото%3C/text%3E%3C/svg%3E'
    }
    
    // Название
    const title = document.createElement('h3')
    title.textContent = item.title
    
    // Информация
    const info = document.createElement('div')
    info.className = 'item-info'
    info.innerHTML = `
        <div>Коллекция: ${item.collection}</div>
        <div>Размер: ${item.size}</div>
        <div>Статус: ${item.is_active ? '✅ Активен' : '❌ Неактивен'}</div>
    `
    
    // Цена
    const price = document.createElement('div')
    price.className = 'item-price'
    price.textContent = formatPrice(item.price)
    
    // Действия
    const actions = document.createElement('div')
    actions.className = 'item-actions'
    
    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'btn btn-danger'
    deleteBtn.textContent = item.is_active ? '🗑️ Удалить навсегда' : '✅ Восстановить'
    deleteBtn.onclick = () => {
        if (item.is_active) {
            // При удалении - полное удаление с фото
            toggleItemStatus(item.id, false)
        } else {
            // При восстановлении - просто меняем статус
            toggleItemStatus(item.id, true)
        }
    }
    
    actions.appendChild(deleteBtn)
    
    // Собираем карточку
    card.appendChild(img)
    card.appendChild(title)
    card.appendChild(info)
    card.appendChild(price)
    card.appendChild(actions)
    
    return card
}

async function toggleItemStatus(itemId, newStatus) {
    if (!confirm(`Вы уверены, что хотите ${newStatus ? 'восстановить' : 'удалить'} этот товар?`)) {
        return
    }
    
    try {
        const { supabase } = await import('./supabase.js')
        
        if (newStatus) {
            // Восстановление товара
            const { error } = await supabase
                .from('items')
                .update({ is_active: true })
                .eq('id', itemId)
            
            if (error) {
                throw error
            }
            
            alert('✅ Товар восстановлен!')
        } else {
            // Полное удаление товара
            // Сначала получаем данные товара для удаления фото
            const { data: item, error: fetchError } = await supabase
                .from('items')
                .select('image_urls')
                .eq('id', itemId)
                .single()
            
            if (fetchError) {
                throw new Error(`Ошибка получения данных товара: ${fetchError.message}`)
            }
            
            // Удаляем фото из Storage
            if (item && item.image_urls && Array.isArray(item.image_urls) && item.image_urls.length > 0) {
                console.log('Удаляю фото из Storage:', item.image_urls.length, 'файлов')
                
                for (const imageUrl of item.image_urls) {
                    try {
                        // Извлекаем путь к файлу из URL
                        // URL выглядит как: https://xxx.supabase.co/storage/v1/object/public/item-images/filename.jpg
                        const urlParts = imageUrl.split('/storage/v1/object/public/item-images/')
                        if (urlParts.length === 2) {
                            const fileName = urlParts[1]
                            console.log('Удаляю файл:', fileName)
                            
                            const { error: deleteError } = await supabase.storage
                                .from('item-images')
                                .remove([fileName])
                            
                            if (deleteError) {
                                console.warn('Не удалось удалить файл:', fileName, deleteError)
                                // Продолжаем удаление других файлов даже если один не удалился
                            } else {
                                console.log('✅ Файл удален:', fileName)
                            }
                        }
                    } catch (fileError) {
                        console.warn('Ошибка при удалении файла:', imageUrl, fileError)
                        // Продолжаем удаление других файлов
                    }
                }
            }
            
            // Удаляем товар из базы данных
            const { error: deleteError } = await supabase
                .from('items')
                .delete()
                .eq('id', itemId)
            
            if (deleteError) {
                throw new Error(`Ошибка удаления товара: ${deleteError.message}`)
            }
            
            alert('✅ Товар и все его фото успешно удалены!')
        }
        
        // Обновляем список
        loadItems()
        
    } catch (error) {
        console.error('Ошибка:', error)
        alert(`❌ Ошибка: ${error.message || 'Не удалось выполнить операцию'}`)
    }
}

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(price)
}

// ============================================
// СТАТИСТИКА
// ============================================

async function loadStats() {
    statsContent.innerHTML = '<div class="loading">Загрузка статистики...</div>'
    
    try {
        const { supabase } = await import('./supabase.js')
        
        console.log('Загружаю статистику...')
        
        // Получаем все события
        const { data, error } = await supabase
            .from('visits')
            .select('*')
            .order('visited_at', { ascending: false })
        
        console.log('Результат загрузки статистики:', { data, error })
        
        if (error) {
            console.error('Ошибка загрузки статистики:', error)
            
            // Если ошибка 406 или 403 - политика блокирует доступ
            if (error.code === 'PGRST116' || error.message?.includes('406') || error.message?.includes('403') || error.code === '42501' || error.status === 406) {
                statsContent.innerHTML = `
                    <div class="message error">
                        <strong>❌ Ошибка доступа к статистике!</strong><br><br>
                        Политика безопасности блокирует доступ к таблице visits.<br><br>
                        <strong>Решение:</strong><br>
                        1. Откройте Supabase → SQL Editor<br>
                        2. Выполните скрипт для настройки политик безопасности<br>
                        3. Обновите эту страницу (F5)
                    </div>
                `
                return
            }
            
            throw error
        }
        
        console.log('Загружено событий:', data?.length || 0)
        
        // Подсчитываем статистику
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        
        const stats = {
            visits: { today: 0, week: 0, month: 0, total: 0 },
            buyClicks: { today: 0, week: 0, month: 0, total: 0 },
            collectionClicks: { today: 0, week: 0, month: 0, total: 0 },
            collections: {} // Статистика по каждой коллекции
        }
        
        // Список всех коллекций
        const allCollections = [
            'Куртки и Пуховики',
            'Ветровки и Жилеты',
            'Кофты и Худи',
            'Футболки и Майки',
            'Штаны и Шорты',
            'Головные уборы',
            'Аксессуары'
        ]
        
        // Инициализируем статистику для каждой коллекции
        allCollections.forEach(collection => {
            stats.collections[collection] = { today: 0, week: 0, month: 0, total: 0 }
        })
        
        data.forEach(visit => {
            const visitDate = new Date(visit.visited_at)
            
            // Посещения
            if (visit.event_type === 'page_visit') {
                stats.visits.total++
                if (visitDate >= monthAgo) stats.visits.month++
                if (visitDate >= weekAgo) stats.visits.week++
                if (visitDate >= today) stats.visits.today++
            }
            
            // Клики "Купить"
            if (visit.event_type === 'buy_click') {
                stats.buyClicks.total++
                if (visitDate >= monthAgo) stats.buyClicks.month++
                if (visitDate >= weekAgo) stats.buyClicks.week++
                if (visitDate >= today) stats.buyClicks.today++
            }
            
            // Переходы в коллекции
            if (visit.event_type === 'collection_click') {
                stats.collectionClicks.total++
                if (visitDate >= monthAgo) stats.collectionClicks.month++
                if (visitDate >= weekAgo) stats.collectionClicks.week++
                if (visitDate >= today) stats.collectionClicks.today++
                
                // Подсчитываем статистику по конкретной коллекции
                if (visit.collection_name && stats.collections[visit.collection_name]) {
                    stats.collections[visit.collection_name].total++
                    if (visitDate >= monthAgo) stats.collections[visit.collection_name].month++
                    if (visitDate >= weekAgo) stats.collections[visit.collection_name].week++
                    if (visitDate >= today) stats.collections[visit.collection_name].today++
                }
            }
        })
        
        // Отображаем статистику
        displayStats(stats)
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error)
        statsContent.innerHTML = '<div class="loading" style="color: #dc3545;">Ошибка загрузки статистики</div>'
    }
}

function displayStats(stats) {
    // Формируем список коллекций с их статистикой
    let collectionsList = ''
    const collectionsArray = Object.entries(stats.collections)
        .sort((a, b) => b[1].total - a[1].total) // Сортируем по убыванию общего количества
    
    if (collectionsArray.length > 0) {
        collectionsList = '<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">'
        collectionsArray.forEach(([collectionName, collectionStats]) => {
            if (collectionStats.total > 0) {
                collectionsList += `
                    <div style="margin-bottom: 12px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                        <div style="font-weight: 600; margin-bottom: 4px;">${collectionName}</div>
                        <div style="font-size: 0.875rem; color: #666;">
                            Всего: <strong>${collectionStats.total}</strong> | 
                            Сегодня: ${collectionStats.today} | 
                            Неделя: ${collectionStats.week} | 
                            Месяц: ${collectionStats.month}
                        </div>
                    </div>
                `
            }
        })
        collectionsList += '</div>'
    }
    
    statsContent.innerHTML = `
        <div class="stat-card">
            <h3>Посещения сайта</h3>
            <div class="stat-value">${stats.visits.total}</div>
            <div class="stat-label">Всего</div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                <div>Сегодня: ${stats.visits.today}</div>
                <div>Неделя: ${stats.visits.week}</div>
                <div>Месяц: ${stats.visits.month}</div>
            </div>
        </div>
        
        <div class="stat-card">
            <h3>Клики "Купить"</h3>
            <div class="stat-value">${stats.buyClicks.total}</div>
            <div class="stat-label">Всего</div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                <div>Сегодня: ${stats.buyClicks.today}</div>
                <div>Неделя: ${stats.buyClicks.week}</div>
                <div>Месяц: ${stats.buyClicks.month}</div>
            </div>
        </div>
        
        <div class="stat-card" style="grid-column: 1 / -1;">
            <h3>Переходы в коллекции</h3>
            <div class="stat-value">${stats.collectionClicks.total}</div>
            <div class="stat-label">Всего переходов</div>
            ${collectionsList || '<div style="margin-top: 15px; color: #999;">Нет данных по коллекциям</div>'}
        </div>
    `
}


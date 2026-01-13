// ============================================
// СТРАНИЦА ТОВАРА - ЛОГИКА
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

// Конфигурация
const TELEGRAM_USERNAME = window.TELEGRAM_USERNAME || 'your_telegram_username'

// Элементы DOM
const loadingState = document.getElementById('loadingState')
const errorState = document.getElementById('errorState')
const itemDetails = document.getElementById('itemDetails')
const itemGallery = document.getElementById('itemGallery')
const itemTitle = document.getElementById('itemTitle')
const itemBadges = document.getElementById('itemBadges')
const itemPrice = document.getElementById('itemPrice')
const itemDescription = document.getElementById('itemDescription')
const itemCollection = document.getElementById('itemCollection')
const itemSize = document.getElementById('itemSize')
const buyButton = document.getElementById('buyButton')

// Состояние
let currentItem = null
let currentImageIndex = 0

// ============================================
// ЗАГРУЗКА ТОВАРА
// ============================================

async function loadItem() {
    try {
        showLoading()
        hideError()
        hideItemDetails()

        console.log('Начинаю загрузку товара...')

        // Получаем ID товара из URL
        const urlParams = new URLSearchParams(window.location.search)
        const itemId = urlParams.get('id')

        console.log('ID товара из URL:', itemId)

        if (!itemId) {
            throw new Error('ID товара не указан в URL')
        }

        // Импортируем supabase
        console.log('Импортирую Supabase...')
        const { supabase } = await import('./supabase.js')
        console.log('Supabase импортирован')

        // Загружаем товар из базы данных
        console.log('Загружаю товар из базы данных...')
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('id', itemId)
            .eq('is_active', true)
            .single()

        console.log('Ответ от Supabase:', { data, error })

        if (error) {
            console.error('Ошибка Supabase:', error)
            throw error
        }
        
        if (!data) {
            throw new Error('Товар не найден')
        }

        console.log('Товар загружен:', data)
        currentItem = data
        hideLoading()
        renderItem(data)

        // Записываем статистику посещения
        await trackVisit('page_visit')

    } catch (error) {
        console.error('Ошибка загрузки товара:', error)
        console.error('Детали ошибки:', error.message)
        hideLoading()
        showError()
    }
}

// ============================================
// ОТОБРАЖЕНИЕ ТОВАРА
// ============================================

function renderItem(item) {
    console.log('Отображаю товар:', item)
    
    // Название
    if (itemTitle) {
        itemTitle.textContent = item.title || 'Без названия'
    }

    // Бейджи
    if (itemBadges) {
        itemBadges.innerHTML = ''
        if (item.collection) {
            const collectionBadge = document.createElement('span')
            collectionBadge.className = 'badge badge-collection'
            collectionBadge.textContent = item.collection
            itemBadges.appendChild(collectionBadge)
        }
        if (item.size) {
            const sizeBadge = document.createElement('span')
            sizeBadge.className = 'badge badge-size'
            sizeBadge.textContent = item.size
            itemBadges.appendChild(sizeBadge)
        }
    }

    // Цена
    if (itemPrice) {
        if (item.price) {
            itemPrice.textContent = formatPrice(item.price)
        } else {
            itemPrice.textContent = 'Цена не указана'
        }
    }

    // Описание
    if (itemDescription) {
        if (item.description) {
            itemDescription.textContent = item.description
        } else {
            itemDescription.textContent = 'Описание отсутствует'
        }
    }

    // Характеристики
    if (itemCollection) {
        itemCollection.textContent = item.collection || 'Не указано'
    }
    if (itemSize) {
        itemSize.textContent = item.size || 'Не указано'
    }

    // Галерея фото
    renderGallery(item.image_urls || [])

    // Кнопка "Купить"
    if (buyButton) {
        buyButton.onclick = () => handleBuyClick(item)
    }

    showItemDetails()
}

// ============================================
// ГАЛЕРЕЯ ФОТО
// ============================================

function renderGallery(imageUrls) {
    itemGallery.innerHTML = ''

    if (!imageUrls || imageUrls.length === 0) {
        // Заглушка если нет фото
        const placeholder = document.createElement('div')
        placeholder.className = 'gallery-main'
        placeholder.innerHTML = '<div class="gallery-main-placeholder">📷</div>'
        itemGallery.appendChild(placeholder)
        return
    }

    // Основное фото
    const mainContainer = document.createElement('div')
    mainContainer.className = 'gallery-main'

    const mainImage = document.createElement('img')
    mainImage.className = 'gallery-main-image'
    mainImage.src = imageUrls[0]
    mainImage.alt = 'Фото товара'
    mainImage.id = 'mainImage'

    // Навигация
    const prevBtn = document.createElement('button')
    prevBtn.className = 'gallery-nav prev'
    prevBtn.innerHTML = '‹'
    prevBtn.onclick = () => changeImage(-1, imageUrls)
    if (imageUrls.length <= 1) prevBtn.disabled = true

    const nextBtn = document.createElement('button')
    nextBtn.className = 'gallery-nav next'
    nextBtn.innerHTML = '›'
    nextBtn.onclick = () => changeImage(1, imageUrls)
    if (imageUrls.length <= 1) nextBtn.disabled = true

    mainContainer.appendChild(mainImage)
    mainContainer.appendChild(prevBtn)
    mainContainer.appendChild(nextBtn)
    itemGallery.appendChild(mainContainer)

    // Миниатюры (если больше 1 фото)
    if (imageUrls.length > 1) {
        const thumbnailsContainer = document.createElement('div')
        thumbnailsContainer.className = 'gallery-thumbnails'

        imageUrls.forEach((url, index) => {
            const thumbnail = document.createElement('div')
            thumbnail.className = `gallery-thumbnail ${index === 0 ? 'active' : ''}`
            thumbnail.onclick = () => selectImage(index, imageUrls)

            const img = document.createElement('img')
            img.src = url
            img.alt = `Фото ${index + 1}`
            img.loading = 'lazy'

            thumbnail.appendChild(img)
            thumbnailsContainer.appendChild(thumbnail)
        })

        itemGallery.appendChild(thumbnailsContainer)
    }

    currentImageIndex = 0
}

function changeImage(direction, imageUrls) {
    currentImageIndex += direction

    if (currentImageIndex < 0) {
        currentImageIndex = imageUrls.length - 1
    } else if (currentImageIndex >= imageUrls.length) {
        currentImageIndex = 0
    }

    const mainImage = document.getElementById('mainImage')
    if (mainImage) {
        mainImage.src = imageUrls[currentImageIndex]
    }

    // Обновляем активную миниатюру
    const thumbnails = document.querySelectorAll('.gallery-thumbnail')
    thumbnails.forEach((thumb, index) => {
        thumb.classList.toggle('active', index === currentImageIndex)
    })
}

function selectImage(index, imageUrls) {
    currentImageIndex = index
    const mainImage = document.getElementById('mainImage')
    if (mainImage) {
        mainImage.src = imageUrls[currentImageIndex]
    }

    // Обновляем активную миниатюру
    const thumbnails = document.querySelectorAll('.gallery-thumbnail')
    thumbnails.forEach((thumb, i) => {
        thumb.classList.toggle('active', i === currentImageIndex)
    })
}

// ============================================
// КНОПКА "КУПИТЬ"
// ============================================

function handleBuyClick(item) {
    // Записываем статистику
    trackVisit('buy_click')

    // Получаем ссылку на текущий товар
    const itemUrl = window.location.href

    // Формируем сообщение для Telegram
    const message = encodeURIComponent(
        `Здравствуйте!\n` +
        `Заинтересовал данный товар, еще в продаже ?\n` +
        `${itemUrl}`
    )

    // Открываем Telegram с правильным username
    const telegramUrl = `https://t.me/${TELEGRAM_USERNAME}?text=${message}`
    window.open(telegramUrl, '_blank')
}

// ============================================
// СТАТИСТИКА
// ============================================

async function trackVisit(eventType) {
    try {
        const { supabase } = await import('./supabase.js')
        
        const { error } = await supabase
            .from('visits')
            .insert({
                event_type: eventType,
                collection_name: null,
                ip_address: null,
                user_agent: navigator.userAgent
            })

        if (error) {
            console.error('Ошибка записи статистики:', error)
        }
    } catch (error) {
        console.error('Ошибка записи статистики:', error)
    }
}

// ============================================
// УТИЛИТЫ
// ============================================

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(price)
}

function showLoading() {
    if (loadingState) {
        loadingState.style.display = 'block'
    }
    if (itemDetails) {
        itemDetails.style.display = 'none'
    }
    if (errorState) {
        errorState.style.display = 'none'
    }
}

function hideLoading() {
    if (loadingState) {
        loadingState.style.display = 'none'
    }
}

function showError() {
    if (errorState) {
        errorState.style.display = 'block'
    }
    if (itemDetails) {
        itemDetails.style.display = 'none'
    }
    if (loadingState) {
        loadingState.style.display = 'none'
    }
}

function hideError() {
    if (errorState) {
        errorState.style.display = 'none'
    }
}

function showItemDetails() {
    if (itemDetails) {
        itemDetails.style.display = 'grid'
    }
    if (loadingState) {
        loadingState.style.display = 'none'
    }
    if (errorState) {
        errorState.style.display = 'none'
    }
}

function hideItemDetails() {
    if (itemDetails) {
        itemDetails.style.display = 'none'
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadItem()
})


// ============================================
// ГЛАВНАЯ СТРАНИЦА - ЛОГИКА
// ============================================

console.log('✅ main.js загружен - версия без кнопки "Купить"')

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

// Элементы DOM (будут инициализированы после загрузки DOM)
const itemsGrid = document.getElementById('itemsGrid')
const loadingState = document.getElementById('loadingState')
const emptyState = document.getElementById('emptyState')
const errorState = document.getElementById('errorState')
const filtersSection = document.getElementById('filtersSection')

// Состояние
let currentFilter = localStorage.getItem('selectedFilter') || 'all'
let allItems = []
let activePriceFilter = {
    from: null,
    to: null
}
let activeSizeFilter = []

// ============================================
// ЗАГРУЗКА ТОВАРОВ
// ============================================

async function loadItems() {
    // Записываем статистику посещения
    await trackVisit('page_visit')
    
    // Восстанавливаем сохраненный фильтр
    const savedFilter = localStorage.getItem('selectedFilter') || 'all'
    currentFilter = savedFilter
    
    console.log('Восстанавливаю сохраненный фильтр:', savedFilter)
    
    // Устанавливаем активную кнопку фильтра
    const filterButtonsEl = document.querySelectorAll('.filter-btn')
    filterButtonsEl.forEach(btn => {
        if (btn.dataset.collection === savedFilter) {
            btn.classList.add('active')
        } else {
            btn.classList.remove('active')
        }
    })
    
    // Загружаем товары с сохраненным фильтром
    await loadItemsWithFilter(savedFilter)
    
    // Подписка на изменения в реальном времени
    setupRealtimeSubscription()
}

// ============================================
// ОТОБРАЖЕНИЕ ТОВАРОВ
// ============================================

function renderItems(items) {
    if (!itemsGrid) {
        console.error('❌ itemsGrid не найден!')
        return
    }
    
    // ВСЕГДА сначала скрываем все состояния
    if (emptyState) emptyState.style.display = 'none'
    if (errorState) errorState.style.display = 'none'
    if (loadingState) loadingState.style.display = 'none'
    
    // Очищаем сетку
    itemsGrid.innerHTML = ''

    if (!items || items.length === 0) {
        showEmpty()
        return
    }

    // Применяем фильтры по цене и размеру
    let filteredItems = applyPriceAndSizeFilters(items)

    if (!filteredItems || filteredItems.length === 0) {
        showEmpty()
        return
    }

    // ПОКАЗЫВАЕМ сетку ПЕРЕД добавлением карточек
    itemsGrid.style.display = 'grid'
    
    // Создаем карточки
    filteredItems.forEach((item) => {
        try {
            const card = createItemCard(item)
            if (card) {
                itemsGrid.appendChild(card)
            }
        } catch (error) {
            console.error('Ошибка создания карточки:', error)
        }
    })
    
    console.log(`✅ Отображено ${items.length} товаров`)
    
    // Принудительно удаляем все кнопки "Купить" из карточек (на всякий случай)
    // Делаем несколько попыток, чтобы точно удалить
    setTimeout(() => {
        const allBuyButtons = document.querySelectorAll('.item-card .buy-button')
        if (allBuyButtons.length > 0) {
            console.log('⚠️ Найдены кнопки "Купить" в карточках, удаляю:', allBuyButtons.length)
            allBuyButtons.forEach(btn => {
                console.log('Удаляю кнопку "Купить" из карточки')
                btn.style.display = 'none' // Скрываем сразу
                btn.remove() // Удаляем
            })
        } else {
            console.log('✅ Кнопок "Купить" в карточках нет - все правильно')
        }
    }, 50)
    
    // Еще одна попытка через большее время
    setTimeout(() => {
        const allBuyButtons = document.querySelectorAll('.item-card .buy-button')
        if (allBuyButtons.length > 0) {
            console.log('⚠️ Вторая попытка: Найдены кнопки "Купить", удаляю:', allBuyButtons.length)
            allBuyButtons.forEach(btn => {
                btn.style.display = 'none'
                btn.remove()
            })
        }
    }, 500)
    
    console.log('✅ Все карточки созданы и добавлены на страницу')
}

function createItemCard(item) {
    const card = document.createElement('div')
    card.className = 'item-card'

    // Карусель фото
    const imageSection = createImageCarousel(item.image_urls || [])
    
    // Контент карточки
    const content = document.createElement('div')
    content.className = 'item-content'

    // Название
    const title = document.createElement('h3')
    title.className = 'item-title'
    title.textContent = item.title || 'Без названия'
    content.appendChild(title)

    // Бейджи
    const badges = document.createElement('div')
    badges.className = 'item-badges'
    
    if (item.collection) {
        const collectionBadge = document.createElement('span')
        collectionBadge.className = 'badge badge-collection'
        collectionBadge.textContent = item.collection
        badges.appendChild(collectionBadge)
    }

    if (item.size) {
        const sizeBadge = document.createElement('span')
        sizeBadge.className = 'badge badge-size'
        sizeBadge.textContent = item.size
        badges.appendChild(sizeBadge)
    }

    content.appendChild(badges)

    // Описание
    if (item.description) {
        const description = document.createElement('p')
        description.className = 'item-description'
        description.textContent = item.description
        content.appendChild(description)
    }

    // Цена
    if (item.price) {
        const price = document.createElement('div')
        price.className = 'item-price'
        price.textContent = formatPrice(item.price)
        content.appendChild(price)
    }

    // КНОПКА "КУПИТЬ" УДАЛЕНА - она только на странице товара
    // НЕ создаем кнопку здесь!
    // Если кнопка каким-то образом появилась - удаляем ее принудительно
    setTimeout(() => {
        const buyButtons = card.querySelectorAll('.buy-button')
        if (buyButtons.length > 0) {
            console.log('⚠️ Найдена кнопка "Купить" в карточке, удаляю')
            buyButtons.forEach(btn => {
                btn.style.display = 'none'
                btn.remove()
            })
        }
    }, 0)
    
    // Еще одна попытка удаления
    setTimeout(() => {
        const buyButtons = card.querySelectorAll('.buy-button')
        if (buyButtons.length > 0) {
            console.log('⚠️ Вторая попытка: Найдена кнопка "Купить" в карточке, удаляю')
            buyButtons.forEach(btn => {
                btn.style.display = 'none'
                btn.remove()
            })
        }
    }, 200)

    card.appendChild(imageSection)
    card.appendChild(content)

    // Делаем карточку кликабельной - клик по фото тоже переходит на страницу товара
    card.onclick = function(e) {
        // Исключаем только индикаторы - они управляют каруселью
        const clickedElement = e.target
        const isCarouselIndicator = clickedElement.closest('.carousel-indicator') ||
                                    clickedElement.closest('.carousel-dot')
        
        if (isCarouselIndicator) {
            // Клик по индикаторам карусели - не переходим на страницу товара
            return false
        }
        
        // Если клик по кнопке "Купить" - тоже не переходим
        if (clickedElement.closest('.buy-button')) {
            return false
        }
        
        // ВСЕ остальные клики (включая фото) переходят на страницу товара
        const url = `item.html?id=${item.id}`
        window.location.href = url
    }
    
    card.style.cursor = 'pointer'
    card.setAttribute('data-item-id', item.id) // Добавляем data-атрибут для отладки

    return card
}

function createImageCarousel(imageUrls) {
    const container = document.createElement('div')
    container.className = 'item-image-container'

    if (!imageUrls || imageUrls.length === 0) {
        // Заглушка если нет фото
        const placeholder = document.createElement('div')
        placeholder.className = 'item-image-placeholder'
        placeholder.innerHTML = '📷'
        container.appendChild(placeholder)
        return container
    }

    // Карусель
    const carousel = document.createElement('div')
    carousel.className = 'image-carousel'
    // Отключаем pointer events для карточки при взаимодействии с каруселью
    carousel.style.pointerEvents = 'auto'

    const imagesWrapper = document.createElement('div')
    imagesWrapper.className = 'carousel-images'
    imagesWrapper.id = `carousel-${Date.now()}-${Math.random()}`
    imagesWrapper.style.pointerEvents = 'auto'
    
    // Убеждаемся, что wrapper имеет правильные размеры
    imagesWrapper.style.width = '100%'
    imagesWrapper.style.height = '100%'
    imagesWrapper.style.display = 'flex'
    imagesWrapper.style.flexDirection = 'row'

    imageUrls.forEach((url, index) => {
        const wrapper = document.createElement('div')
        wrapper.className = 'carousel-image-wrapper'
        wrapper.style.flexShrink = '0'
        wrapper.style.width = '100%'
        wrapper.style.height = '100%'
        
        const img = document.createElement('img')
        img.src = url
        img.alt = 'Фото товара'
        img.className = 'item-image'
        img.loading = 'lazy'
        
        wrapper.appendChild(img)
        imagesWrapper.appendChild(wrapper)
    })
    
    console.log('Карусель создана:', {
        id: imagesWrapper.id,
        childrenCount: imagesWrapper.children.length,
        width: imagesWrapper.clientWidth
    })

    carousel.appendChild(imagesWrapper)

    // Навигация (только если больше 1 фото)
    // СТРЕЛКИ УДАЛЕНЫ - используется только свайп/скролл
    if (imageUrls.length > 1) {
        // Индикатор
        const indicator = document.createElement('div')
        indicator.className = 'carousel-indicator'
        indicator.onclick = function(e) {
            e.stopPropagation()
            return false
        }
        imageUrls.forEach((_, index) => {
            const dot = document.createElement('span')
            dot.className = `carousel-dot ${index === 0 ? 'active' : ''}`
            dot.onclick = function(e) {
                e.stopPropagation()
                return false
            }
            indicator.appendChild(dot)
        })
        carousel.appendChild(indicator)

        // Swipe для мобильных
        setupCarouselSwipe(imagesWrapper, indicator)
    }

    container.appendChild(carousel)
    return container
}

// Функция scrollCarousel удалена - стрелки больше не используются
// Прокрутка карусели теперь только через свайп/скролл

// Останавливаем всплытие событий для индикаторов карусели
document.addEventListener('click', (e) => {
    if (e.target.closest('.carousel-indicator') || e.target.closest('.carousel-dot')) {
        e.stopPropagation()
    }
}, true)

function updateCarouselIndicator(wrapper) {
    const indicator = wrapper.parentElement.querySelector('.carousel-indicator')
    if (!indicator) return

    const scrollIndex = Math.round(wrapper.scrollLeft / wrapper.clientWidth)
    const dots = indicator.querySelectorAll('.carousel-dot')
    
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === scrollIndex)
    })
}

function setupCarouselSwipe(wrapper, indicator) {
    let startX = 0
    let isDragging = false
    let startScrollLeft = 0

    console.log('Настройка свайпа для карусели:', wrapper)

    wrapper.addEventListener('touchstart', (e) => {
        console.log('Touchstart на карусели')
        startX = e.touches[0].clientX
        startScrollLeft = wrapper.scrollLeft
        isDragging = true
        wrapper.style.scrollBehavior = 'auto' // Отключаем плавную прокрутку при свайпе
        e.stopPropagation() // Останавливаем всплытие
    }, { passive: true })

    wrapper.addEventListener('touchmove', (e) => {
        if (!isDragging) return
        
        const currentX = e.touches[0].clientX
        const diff = startX - currentX
        const newScrollLeft = startScrollLeft + diff
        
        // Прокручиваем карусель вручную во время свайпа
        wrapper.scrollLeft = newScrollLeft
        e.stopPropagation() // Останавливаем всплытие
    }, { passive: true })

    wrapper.addEventListener('touchend', (e) => {
        if (!isDragging) return
        isDragging = false
        
        console.log('Touchend на карусели')
        
        // Включаем обратно плавную прокрутку
        wrapper.style.scrollBehavior = 'smooth'

        const endX = e.changedTouches[0].clientX
        const diff = startX - endX
        const scrollThreshold = 50

        if (Math.abs(diff) > scrollThreshold) {
            // Определяем направление и переходим к следующему/предыдущему фото
            const currentIndex = Math.round(wrapper.scrollLeft / wrapper.clientWidth)
            let newIndex = currentIndex
            
            if (diff > scrollThreshold) {
                // Свайп влево - следующее фото
                newIndex = Math.min(currentIndex + 1, wrapper.children.length - 1)
            } else if (diff < -scrollThreshold) {
                // Свайп вправо - предыдущее фото
                newIndex = Math.max(currentIndex - 1, 0)
            }
            
            // Прокручиваем к нужному фото
            wrapper.scrollTo({
                left: newIndex * wrapper.clientWidth,
                behavior: 'smooth'
            })
        } else {
            // Если свайп был маленьким, возвращаемся к ближайшему фото
            const currentIndex = Math.round(wrapper.scrollLeft / wrapper.clientWidth)
            wrapper.scrollTo({
                left: currentIndex * wrapper.clientWidth,
                behavior: 'smooth'
            })
        }
        
        e.stopPropagation() // Останавливаем всплытие
    }, { passive: true })

    // Обновляем индикатор при прокрутке
    wrapper.addEventListener('scroll', () => {
        updateCarouselIndicator(wrapper)
    }, { passive: true })
    
    // Поддержка прокрутки колесиком мыши на десктопе
    wrapper.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            // Горизонтальная прокрутка
            e.preventDefault()
            wrapper.scrollLeft += e.deltaX
        }
    }, { passive: false })
}

// ============================================
// ФИЛЬТРАЦИЯ ПО КОЛЛЕКЦИЯМ
// ============================================

function initCollectionFilters() {
    const filterButtonsEl = document.querySelectorAll('.filter-btn')
    
    filterButtonsEl.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            // Проверяем, что клик не на бургер-меню
            if (e.target.closest('.filter-menu-wrapper') || e.target.closest('.filter-toggle')) {
                return
            }
            
            e.preventDefault()
            e.stopPropagation()
            
            console.log('=== ПЕРЕКЛЮЧЕНИЕ ФИЛЬТРА ===')
            console.log('Кнопка:', btn)
            console.log('Текст кнопки:', btn.textContent)
            console.log('data-collection атрибут:', btn.dataset.collection)
            
            // Убираем активный класс у всех
            filterButtonsEl.forEach(b => b.classList.remove('active'))
            // Добавляем активный класс к нажатой
            btn.classList.add('active')
            
            // Получаем коллекцию
            const selectedCollection = btn.dataset.collection || 'all'
            console.log('Выбранная коллекция (из data-collection):', selectedCollection)
            console.log('Тип:', typeof selectedCollection)
            console.log('Длина:', selectedCollection.length)
            console.log('Текущий фильтр был:', currentFilter)
            
            // Обновляем текущий фильтр
            currentFilter = selectedCollection
            
            // Сохраняем выбранный фильтр в localStorage
            localStorage.setItem('selectedFilter', selectedCollection)
            console.log('Фильтр сохранен в localStorage:', selectedCollection)
            console.log('Новый фильтр:', currentFilter)
            
            // Загружаем товары из базы данных с учетом фильтра
            console.log('Начинаю загрузку товаров для фильтра:', selectedCollection)
            await loadItemsWithFilter(selectedCollection)
            console.log('Загрузка товаров завершена')
            
            // Записываем статистику
            if (selectedCollection && selectedCollection !== 'all') {
                trackVisit('collection_click', selectedCollection)
            }
        })
    })
}

async function loadItemsWithFilter(collection = 'all') {
    try {
        console.log('=== ЗАГРУЗКА ТОВАРОВ ===')
        console.log('Фильтр коллекции:', collection)
        console.log('Тип коллекции:', typeof collection)
        console.log('Длина коллекции:', collection ? collection.length : 0)
        showLoading()
        hideError()
        hideEmpty()

        // Импортируем supabase
        const { supabase } = await import('./supabase.js')

        // Формируем запрос
        let query = supabase
            .from('items')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        // Если выбрана конкретная коллекция - добавляем фильтр
        if (collection && collection !== 'all') {
            console.log('Применяю фильтр по коллекции:', collection)
            console.log('Точное значение коллекции (с пробелами):', JSON.stringify(collection))
            query = query.eq('collection', collection)
        } else {
            console.log('Загружаю ВСЕ товары (без фильтра)')
        }

        // Загружаем товары из базы данных
        console.log('Отправляю запрос к базе данных...')
        const { data, error } = await query

        if (error) {
            console.error('❌ Ошибка загрузки товаров:', error)
            console.error('Код ошибки:', error.code)
            console.error('Сообщение ошибки:', error.message)
            throw error
        }

        console.log('✅ Загружено товаров:', data?.length || 0)
        if (data && data.length > 0) {
            console.log('Товары:', data.map(item => ({ 
                id: item.id, 
                title: item.title, 
                collection: item.collection,
                'collection_length': item.collection ? item.collection.length : 0
            })))
        } else {
            console.log('⚠️ Данные пустые или null')
            console.log('Тип данных:', typeof data)
            console.log('Данные:', data)
        }

        console.log('Данные получены:', data)
        console.log('Тип данных:', typeof data)
        console.log('Это массив?', Array.isArray(data))
        
        allItems = Array.isArray(data) ? data : []
        console.log('allItems установлен:', allItems.length, 'товаров')
        
        hideLoading()
        
        if (allItems.length === 0) {
            console.log('⚠️ Товаров не найдено для коллекции:', collection)
            console.log('Проверяю все товары в базе...')
            
            // Дополнительная проверка - загружаем все товары
            const { data: allData, error: allError } = await supabase
                .from('items')
                .select('*')
                .eq('is_active', true)
            
            if (!allError && allData) {
                console.log('Всего товаров в базе:', allData.length)
                if (allData.length > 0) {
                    const collections = [...new Set(allData.map(item => item.collection))]
                    console.log('Все коллекции в базе:', collections)
                    console.log('Ищем коллекцию:', collection)
                    console.log('Совпадение найдено?', collections.includes(collection))
                    
                    // Показываем все товары для отладки
                    allData.forEach(item => {
                        console.log(`Товар ID ${item.id}: коллекция="${item.collection}" (длина: ${item.collection?.length})`)
                    })
                }
            } else if (allError) {
                console.error('Ошибка при проверке всех товаров:', allError)
            }
            
            showEmpty()
        } else {
            console.log('✅ Найдено товаров:', allItems.length)
            renderItems(allItems)
        }

    } catch (error) {
        console.error('❌ Ошибка загрузки товаров:', error)
        console.error('Детали ошибки:', error.message)
        console.error('Стек ошибки:', error.stack)
        hideLoading()
        showError()
    }
}

function filterItems() {
    // Эта функция больше не используется, но оставляем для совместимости
    if (currentFilter === 'all') {
        renderItems(allItems)
    } else {
        const filtered = allItems.filter(item => item.collection === currentFilter)
        renderItems(filtered)
    }
}

// ============================================
// КНОПКА "КУПИТЬ"
// ============================================

function handleBuyClick(item) {
    // Записываем статистику
    trackVisit('buy_click')

    // Формируем сообщение для Telegram
    const message = encodeURIComponent(
        `Хочу купить: ${item.title || 'Товар'}\n` +
        `Цена: ${item.price ? formatPrice(item.price) : 'Не указана'}`
    )

    // Открываем Telegram
    const telegramUrl = `https://t.me/${TELEGRAM_USERNAME}?text=${message}`
    window.open(telegramUrl, '_blank')
}

// ============================================
// СТАТИСТИКА
// ============================================

async function trackVisit(eventType, collectionName = null) {
    try {
        // Импортируем supabase динамически
        const { supabase } = await import('./supabase.js')
        
        console.log('📊 Записываю статистику:', { eventType, collectionName })
        
        const { data, error } = await supabase
            .from('visits')
            .insert({
                event_type: eventType,
                collection_name: collectionName,
                ip_address: null, // Будет определяться на сервере
                user_agent: navigator.userAgent
            })
            .select()

        if (error) {
            console.error('❌ Ошибка записи статистики:', error)
            console.error('Код ошибки:', error.code)
            console.error('Сообщение:', error.message)
            
            // Если ошибка 406 или 403 - политика блокирует запись
            if (error.code === '42501' || error.status === 406 || error.status === 403) {
                console.warn('⚠️ Политика безопасности блокирует запись статистики. Нужно исправить политику для таблицы visits.')
            }
        } else {
            console.log('✅ Статистика записана успешно:', data)
        }
    } catch (error) {
        console.error('❌ Критическая ошибка записи статистики:', error)
    }
}

// ============================================
// REALTIME ПОДПИСКА
// ============================================

async function setupRealtimeSubscription() {
    try {
        const { supabase } = await import('./supabase.js')
        
        supabase
            .channel('items-changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'items' 
                },
                () => {
                    // Обновляем товары при изменениях (с текущим фильтром)
                    console.log('Обнаружены изменения в базе данных, обновляю товары...')
                    loadItemsWithFilter(currentFilter)
                }
            )
            .subscribe()
    } catch (error) {
        console.error('Ошибка настройки realtime:', error)
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
    loadingState.style.display = 'grid'
    itemsGrid.style.display = 'none'
    emptyState.style.display = 'none'
    errorState.style.display = 'none'
}

function hideLoading() {
    loadingState.style.display = 'none'
    itemsGrid.style.display = 'grid'
}

function showEmpty() {
    if (emptyState) emptyState.style.display = 'block'
    if (itemsGrid) itemsGrid.style.display = 'none'
    if (loadingState) loadingState.style.display = 'none'
    if (errorState) errorState.style.display = 'none'
}

function hideEmpty() {
    emptyState.style.display = 'none'
}

function showError() {
    errorState.style.display = 'block'
    itemsGrid.style.display = 'none'
    loadingState.style.display = 'none'
    emptyState.style.display = 'none'
}

function hideError() {
    errorState.style.display = 'none'
}

// ============================================
// ФИЛЬТРАЦИЯ ПО ЦЕНЕ И РАЗМЕРУ
// ============================================

function applyPriceAndSizeFilters(items) {
    let filtered = [...items]

    // Фильтр по цене
    if (activePriceFilter.from !== null && activePriceFilter.from !== '') {
        const from = parseFloat(activePriceFilter.from)
        if (!isNaN(from)) {
            filtered = filtered.filter(item => item.price >= from)
        }
    }

    if (activePriceFilter.to !== null && activePriceFilter.to !== '') {
        const to = parseFloat(activePriceFilter.to)
        if (!isNaN(to)) {
            filtered = filtered.filter(item => item.price <= to)
        }
    }

    // Фильтр по размеру
    if (activeSizeFilter.length > 0) {
        filtered = filtered.filter(item => 
            item.size && activeSizeFilter.includes(item.size)
        )
    }

    return filtered
}

function updateFiltersFromInputs() {
    // Получаем элементы динамически
    const priceFromEl = document.getElementById('priceFrom')
    const priceToEl = document.getElementById('priceTo')
    const sizeInputsEl = document.querySelectorAll('.size-input')
    
    // Обновляем фильтр по цене
    activePriceFilter.from = priceFromEl ? priceFromEl.value : null
    activePriceFilter.to = priceToEl ? priceToEl.value : null

    // Обновляем фильтр по размеру
    activeSizeFilter = []
    if (sizeInputsEl) {
        sizeInputsEl.forEach(input => {
            if (input.checked) {
                activeSizeFilter.push(input.value)
            }
        })
    }
}

function resetFilters() {
    // Получаем элементы динамически
    const priceFromEl = document.getElementById('priceFrom')
    const priceToEl = document.getElementById('priceTo')
    const sizeInputsEl = document.querySelectorAll('.size-input')
    const filterDropdownEl = document.getElementById('filterDropdown')
    const filterToggleEl = document.getElementById('filterToggle')
    
    // Сбрасываем фильтр по цене
    if (priceFromEl) priceFromEl.value = ''
    if (priceToEl) priceToEl.value = ''
    activePriceFilter.from = null
    activePriceFilter.to = null

    // Сбрасываем фильтр по размеру
    if (sizeInputsEl) {
        sizeInputsEl.forEach(input => {
            input.checked = false
        })
    }
    activeSizeFilter = []

    // Перерисовываем товары
    renderItems(allItems)
}

function applyFilters() {
    updateFiltersFromInputs()
    // Перерисовываем товары с примененными фильтрами
    renderItems(allItems)
    // Закрываем выпадающее меню
    closeFilterMenu(false) // Фильтры уже применены выше
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

// Загружаем товары при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadItems()
    
    // Инициализация обработчиков после загрузки DOM
    initFilterMenu()
    initCollectionFilters()
    initGameButton()
})

function initGameButton() {
    const gameButton = document.getElementById('gameButton')
    if (gameButton) {
        console.log('✅ Кнопка игры найдена, добавляю обработчик')
        gameButton.addEventListener('click', (e) => {
            e.preventDefault()
            console.log('🎮 Переход на страницу игры...')
            window.location.href = 'game.html'
        })
    } else {
        console.error('❌ Кнопка игры не найдена!')
    }
}

function closeFilterMenu(applyFiltersOnClose = false) {
    const filterDropdownEl = document.getElementById('filterDropdown')
    const filterToggleEl = document.getElementById('filterToggle')
    
    if (filterDropdownEl && filterToggleEl) {
        // Если нужно применить фильтры при закрытии
        if (applyFiltersOnClose) {
            updateFiltersFromInputs()
            renderItems(allItems)
        }
        
        filterDropdownEl.style.display = 'none'
        filterToggleEl.classList.remove('active')
        
        // Возвращаем меню обратно в исходное место при закрытии
        const originalParent = document.querySelector('.filter-menu-wrapper')
        if (originalParent && filterDropdownEl.parentElement !== originalParent) {
            originalParent.appendChild(filterDropdownEl)
        }
        
        console.log('✅ Меню закрыто', applyFiltersOnClose ? '(фильтры применены)' : '')
    }
}

function initFilterMenu() {
    // Получаем элементы заново после загрузки DOM
    const filterToggleEl = document.getElementById('filterToggle')
    const filterDropdownEl = document.getElementById('filterDropdown')
    const filterDropdownCloseEl = document.getElementById('filterDropdownClose')
    const applyFiltersBtnEl = document.getElementById('applyFiltersBtn')
    const resetFiltersBtnEl = document.getElementById('resetFiltersBtn')
    
    console.log('Инициализация меню фильтров:', {
        filterToggle: filterToggleEl,
        filterDropdown: filterDropdownEl,
        filterDropdownClose: filterDropdownCloseEl
    })
    
    // Toggle выпадающего меню фильтров
    if (filterToggleEl && filterDropdownEl) {
        // Убеждаемся, что меню изначально скрыто
        filterDropdownEl.style.display = 'none'
        
        filterToggleEl.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
            
            console.log('Клик по бургер-меню')
            console.log('Текущий display:', filterDropdownEl.style.display)
            console.log('Текущий computed display:', window.getComputedStyle(filterDropdownEl).display)
            
            const isVisible = filterDropdownEl.style.display === 'block' || 
                             window.getComputedStyle(filterDropdownEl).display === 'block'
            
            if (isVisible) {
                closeFilterMenu(false) // Закрываем без применения фильтров
            } else {
                // Перемещаем меню в body для гарантированного отображения поверх всего
                if (filterDropdownEl.parentElement !== document.body) {
                    document.body.appendChild(filterDropdownEl)
                }
                
                // Вычисляем позицию кнопки относительно viewport
                const buttonRect = filterToggleEl.getBoundingClientRect()
                const scrollY = window.scrollY || window.pageYOffset
                const scrollX = window.scrollX || window.pageXOffset
                
                // Позиционируем меню под кнопкой
                filterDropdownEl.style.position = 'fixed'
                filterDropdownEl.style.top = `${buttonRect.bottom + 8}px` // 8px отступ от кнопки
                filterDropdownEl.style.left = `${buttonRect.left}px`
                filterDropdownEl.style.display = 'block'
                filterDropdownEl.style.visibility = 'visible'
                filterDropdownEl.style.opacity = '1'
                filterDropdownEl.style.zIndex = '99999'
                filterDropdownEl.style.pointerEvents = 'auto'
                filterToggleEl.classList.add('active')
                
                console.log('✅ Меню открыто')
                console.log('Позиция кнопки:', {
                    top: buttonRect.top,
                    bottom: buttonRect.bottom,
                    left: buttonRect.left,
                    right: buttonRect.right,
                    scrollY: scrollY,
                    scrollX: scrollX
                })
                console.log('Позиция меню:', {
                    top: filterDropdownEl.style.top,
                    left: filterDropdownEl.style.left,
                    zIndex: filterDropdownEl.style.zIndex,
                    parent: filterDropdownEl.parentElement
                })
            }
        })
    } else {
        console.error('❌ Не найдены элементы меню фильтров:', {
            filterToggle: filterToggleEl,
            filterDropdown: filterDropdownEl
        })
    }
    
    // Обработчик для кнопки закрытия
    if (filterDropdownCloseEl) {
        filterDropdownCloseEl.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            closeFilterMenu(true) // Закрываем с применением фильтров
        })
    }
    
    // Закрываем выпадающее меню при клике вне его
    document.addEventListener('click', (e) => {
        if (filterDropdownEl && filterToggleEl) {
            const isClickInside = filterDropdownEl.contains(e.target) || filterToggleEl.contains(e.target)
            if (!isClickInside && filterDropdownEl.style.display === 'block') {
                closeFilterMenu(false) // Закрываем без применения фильтров
            }
        }
    })
    
    // Обновляем позицию меню при прокрутке или изменении размера окна
    let updateMenuPosition = () => {
        if (filterDropdownEl && filterToggleEl && filterDropdownEl.style.display === 'block') {
            const buttonRect = filterToggleEl.getBoundingClientRect()
            
            filterDropdownEl.style.top = `${buttonRect.bottom + 8}px`
            filterDropdownEl.style.left = `${buttonRect.left}px`
        }
    }
    
    window.addEventListener('scroll', updateMenuPosition, { passive: true })
    window.addEventListener('resize', updateMenuPosition, { passive: true })
    
    // Обработчики для кнопок фильтров
    if (applyFiltersBtnEl) {
        applyFiltersBtnEl.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            applyFilters()
        })
    }
    
    if (resetFiltersBtnEl) {
        resetFiltersBtnEl.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            resetFilters()
        })
    }
}


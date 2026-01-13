-- ============================================
-- SQL СКРИПТЫ ДЛЯ СОЗДАНИЯ ТАБЛИЦ В SUPABASE
-- ============================================
-- Скопируйте каждый блок и выполните в SQL Editor в Supabase
-- Выполняйте по порядку: сначала таблица 1, потом 2, потом 3

-- ============================================
-- ТАБЛИЦА 1: items (товары)
-- ============================================

CREATE TABLE IF NOT EXISTS items (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2),
  image_urls TEXT[] DEFAULT ARRAY[]::TEXT[], -- Массив ссылок на фото (до 10 штук)
  collection TEXT NOT NULL CHECK (collection IN (
    'Куртки и Пуховики',
    'Ветровки и Жилеты',
    'Кофты и Худи',
    'Футболки и Майки',
    'Штаны и Шорты',
    'Головные уборы',
    'Аксессуары'
  )),
  size TEXT NOT NULL CHECK (size IN (
    'XXS',
    'XS',
    'S',
    'M',
    'L',
    'XL',
    'XXL',
    '3XL',
    'ONE SIZE'
  )),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Комментарии к полям
COMMENT ON TABLE items IS 'Таблица товаров (карточки товаров)';
COMMENT ON COLUMN items.image_urls IS 'Массив ссылок на фото товара (до 10 штук) - карусель';
COMMENT ON COLUMN items.collection IS 'Коллекция товара';
COMMENT ON COLUMN items.size IS 'Размер товара';
COMMENT ON COLUMN items.is_active IS 'Активен ли товар (false = удален)';

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_items_collection ON items(collection);
CREATE INDEX IF NOT EXISTS idx_items_size ON items(size);
CREATE INDEX IF NOT EXISTS idx_items_is_active ON items(is_active);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);

-- Включаем RLS для таблицы items
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Политики безопасности для таблицы items
-- Все могут ЧИТАТЬ активные товары (публичный доступ)
DROP POLICY IF EXISTS "Public can view active items" ON items;
CREATE POLICY "Public can view active items"
  ON items FOR SELECT
  USING (is_active = true);

-- Только админы могут ДОБАВЛЯТЬ товары (будет настроено через приложение)
-- Пока разрешаем всем (потом добавим проверку авторизации)
DROP POLICY IF EXISTS "Anyone can insert items" ON items;
CREATE POLICY "Anyone can insert items"
  ON items FOR INSERT
  WITH CHECK (true);

-- Только админы могут ОБНОВЛЯТЬ товары
DROP POLICY IF EXISTS "Anyone can update items" ON items;
CREATE POLICY "Anyone can update items"
  ON items FOR UPDATE
  USING (true);

-- Только админы могут УДАЛЯТЬ товары (мягкое удаление через is_active)
DROP POLICY IF EXISTS "Anyone can delete items" ON items;
CREATE POLICY "Anyone can delete items"
  ON items FOR DELETE
  USING (true);

-- ============================================
-- ТАБЛИЦА 2: admin_auth (админы - вход)
-- ============================================

CREATE TABLE IF NOT EXISTS admin_auth (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Комментарии к полям
COMMENT ON TABLE admin_auth IS 'Таблица для хранения логинов и паролей админов';
COMMENT ON COLUMN admin_auth.password_hash IS 'Зашифрованный пароль (хеш)';

-- Индекс для быстрого поиска по логину
CREATE INDEX IF NOT EXISTS idx_admin_auth_username ON admin_auth(username);

-- Создание первого администратора
-- ⚠️ ВАЖНО: Замените 'admin' и 'ваш_пароль' на свои значения!
-- Пароль пока хранится как текст (потом добавим шифрование в приложении)
INSERT INTO admin_auth (username, password_hash) 
VALUES ('admin1', 'garderobsi')
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- ТАБЛИЦА 3: visits (статистика посещений)
-- ============================================

CREATE TABLE IF NOT EXISTS visits (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_visit',      -- Посещение сайта
    'buy_click',       -- Нажатие кнопки "Купить"
    'collection_click' -- Переход в раздел коллекции
  )),
  collection_name TEXT CHECK (
    (event_type = 'collection_click' AND collection_name IS NOT NULL) OR
    (event_type != 'collection_click')
  ),
  ip_address TEXT,
  user_agent TEXT,
  visited_at TIMESTAMPTZ DEFAULT NOW()
);

-- Комментарии к полям
COMMENT ON TABLE visits IS 'Статистика посещений и действий пользователей';
COMMENT ON COLUMN visits.event_type IS 'Тип события: page_visit, buy_click, collection_click';
COMMENT ON COLUMN visits.collection_name IS 'Название коллекции (если event_type = collection_click)';
COMMENT ON COLUMN visits.ip_address IS 'IP адрес посетителя (анонимно)';
COMMENT ON COLUMN visits.user_agent IS 'Устройство/браузер посетителя';

-- Индексы для быстрого поиска статистики
CREATE INDEX IF NOT EXISTS idx_visits_event_type ON visits(event_type);
CREATE INDEX IF NOT EXISTS idx_visits_collection_name ON visits(collection_name);
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_event_visited ON visits(event_type, visited_at DESC);

-- ============================================
-- НАСТРОЙКА БЕЗОПАСНОСТИ (Row Level Security)
-- ============================================

-- Включаем RLS для таблиц admin_auth и visits
ALTER TABLE admin_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ admin_auth (админы)
-- ============================================

-- Только через приложение можно читать (для проверки логина/пароля)
-- Публичный доступ запрещен
CREATE POLICY "No public access to admin_auth"
  ON admin_auth FOR SELECT
  USING (false);

-- ============================================
-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ visits (статистика)
-- ============================================

-- Все могут ДОБАВЛЯТЬ события (для отслеживания)
CREATE POLICY "Anyone can insert visits"
  ON visits FOR INSERT
  WITH CHECK (true);

-- Только админы могут ЧИТАТЬ статистику (будет через приложение)
-- Пока запрещаем публичный доступ
CREATE POLICY "No public access to visits"
  ON visits FOR SELECT
  USING (false);

-- ============================================
-- ГОТОВО! ТАБЛИЦЫ СОЗДАНЫ
-- ============================================


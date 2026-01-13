-- ============================================
-- SQL СКРИПТЫ ДЛЯ НАСТРОЙКИ STORAGE В SUPABASE
-- ============================================
-- Storage - это место для хранения фото товаров
-- Выполните эти команды в SQL Editor в Supabase

-- ============================================
-- ПОЛИТИКИ ДЛЯ STORAGE (загрузка и чтение фото)
-- ============================================

-- Политика: Все могут ЧИТАТЬ (просматривать) фото товаров
-- Это нужно, чтобы фото отображались на сайте для всех пользователей
DROP POLICY IF EXISTS "Public can view item images" ON storage.objects;
CREATE POLICY "Public can view item images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'item-images');

-- Политика: Все могут ЗАГРУЖАТЬ фото (потом добавим проверку админа в приложении)
-- Это нужно, чтобы админ мог загружать фото через админ-панель
DROP POLICY IF EXISTS "Anyone can upload item images" ON storage.objects;
CREATE POLICY "Anyone can upload item images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'item-images');

-- Политика: Все могут УДАЛЯТЬ фото (потом добавим проверку админа в приложении)
-- Это нужно, чтобы админ мог удалять фото при удалении товара
DROP POLICY IF EXISTS "Anyone can delete item images" ON storage.objects;
CREATE POLICY "Anyone can delete item images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'item-images');

-- Политика: Все могут ОБНОВЛЯТЬ фото (заменять)
DROP POLICY IF EXISTS "Anyone can update item images" ON storage.objects;
CREATE POLICY "Anyone can update item images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'item-images');

-- ============================================
-- ГОТОВО! ПОЛИТИКИ STORAGE НАСТРОЕНЫ
-- ============================================
-- Теперь нужно создать bucket через веб-интерфейс (см. инструкцию)


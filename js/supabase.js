// ============================================
// ПОДКЛЮЧЕНИЕ К SUPABASE
// ============================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Получаем ключи из window (config.js должен быть загружен первым)
const supabaseUrl = window.SUPABASE_URL
const supabaseAnonKey = window.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase credentials not found!')
    console.error('Проверьте, что config.js загружен и содержит правильные ключи')
    console.error('URL:', supabaseUrl)
    console.error('Key:', supabaseAnonKey ? 'Установлен' : 'НЕ УСТАНОВЛЕН!')
}

// Создаем клиент Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('✅ Supabase подключен')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseAnonKey ? 'Установлен' : 'НЕ УСТАНОВЛЕН!')


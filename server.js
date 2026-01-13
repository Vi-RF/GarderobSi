// ============================================
// ПРОСТОЙ СЕРВЕР ДЛЯ RENDER WEB SERVICE
// ============================================

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Отдаем статические файлы из корня проекта
app.use(express.static(path.join(__dirname, '.')));

// Все маршруты ведут на соответствующие HTML файлы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/game.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'game.html'));
});

app.get('/item.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'item.html'));
});

// Fallback для всех остальных маршрутов - отдаем index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📁 Статические файлы из: ${__dirname}`);
});


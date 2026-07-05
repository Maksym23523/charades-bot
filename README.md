# Telegram Mini App для гадания на картах

Проект уже содержит фронтенд, API для расклада и заготовку Telegram-бота. Фотографии берутся из папки `фото` и доступны в приложении как карты.

## Запуск локально

1. Установите Node.js 18 или новее.
2. В папке проекта запустите:

```bash
npm start
```

3. Откройте `http://localhost:3000`.

## Настройка Telegram

Создайте файл `.env` рядом с `server.js`:

```env
PORT=3000
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
MINI_APP_URL=https://ваш-публичный-https-адрес
```

Для Telegram Mini App нужен публичный HTTPS-адрес. На время разработки можно использовать туннель вроде ngrok или Cloudflare Tunnel.

После публикации адреса установите webhook:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=<MINI_APP_URL>/api/telegram/webhook"
```

Команда `/start` в боте отправит кнопку открытия мини-приложения.

## Что уже есть

- Фронтенд мини-приложения с выбором расклада на 1 или 3 карты.
- Backend API: `/api/cards`, `/api/reading`, `/api/telegram/validate`, `/api/telegram/webhook`.
- 18 базовых значений карт.
- Отправка результата из Mini App обратно в чат Telegram через `sendData`.

Дальше можно добавить оплату, личный кабинет, историю раскладов, админку для текстов карт и красивые анимации выбора.

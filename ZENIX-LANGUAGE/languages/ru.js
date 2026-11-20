
(function (root) {
    "use strict";

    const language = {
        code: "ru",
        name: "Русский",
        direction: "ltr",

        messages: {
            welcome: "Добро пожаловать в ZENIX.",
            goodbye: "До свидания.",
            loading: "Загрузка...",
            thinking: "Думаю...",
            listening: "Я слушаю...",
            speaking: "Говорю...",
            error: "Произошла ошибка.",
            notFound: "Не найдено.",
            languageChanged: "Язык изменён."
        },

        navigation: {
            home: "Главная",
            chats: "Чаты",
            favorites: "Избранное",
            back: "← На главную"
        },

        interface: {
            title: "Искусственный интеллект ZENIX",
            description: "Твой персональный искусственный интеллект",
            greeting: "Привет! Я готов помочь тебе ❤️",
            placeholder: "Напиши своё сообщение...",
            send: "Отправить",
            clear: "Очистить",
            settings: "Настройки",
            language: "Язык",
            languageDescription: "Выбери рабочий язык ZENIX.",
            selectLanguage: "Выбери язык:",
            voice: "Голос",
            microphone: "Микрофон",
            stop: "Остановить",
            start: "Начать",
            close: "Закрыть",
            save: "Сохранить",
            cancel: "Отмена",
            login: "Войти / Зарегистрироваться"
        },

        chats: {
            description: "Просматривай и управляй своими беседами.",
            search: "Поиск бесед...",
            new: "Новый чат",
            recent: "Недавние беседы",
            history: "История чатов",
            all: "Все беседы",
            emptyTitle: "Пока нет бесед",
            emptyDescription: "Твои беседы появятся здесь.",
            footer: "Твои беседы надёжно сохраняются."
        },

        voice: {
            startListening: "Нажми, чтобы говорить.",
            stopListening: "Прослушивание завершено.",
            permissionDenied: "Доступ к микрофону запрещён.",
            notSupported: "Голосовая система не поддерживается.",
            recognitionError: "Ошибка распознавания речи.",
            speechError: "Ошибка воспроизведения речи."
        },

        chat: {
            user: "Ты",
            assistant: "ZENIX",
            empty: "Сообщений пока нет.",
            thinking: "ZENIX думает...",
            connectionError: "Ошибка соединения. Попробуй ещё раз."
        },

        favorites: {
            empty: "Здесь будут сохранены твои любимые ответы.",
            description: "Твои сохранённые избранные ответы.",
            search: "Поиск в избранном...",
            collection: "Моя коллекция",
            collectionDescription: "Все твои сохранённые ответы в одном месте.",
            filter: "Все избранное",
            emptyTitle: "Пока нет избранного",
            emptyDescription: "Сохраняй понравившиеся ответы, и они появятся здесь.",
            footer: "Твои избранные ответы всегда будут доступны здесь."
        },

        settings: {
            description: "Настрой ZENIX под себя.",
            general: "Общие настройки",
            generalDescription: "Управляй основными настройками приложения.",
            appearance: "Внешний вид",
            appearanceDescription: "Настрой внешний вид ZENIX.",
            darkMode: "Тёмная тема",
            darkModeDescription: "Использовать тёмный интерфейс.",
            neon: "Неоновые эффекты",
            neonDescription: "Включить неоновые визуальные эффекты.",
            active: "Активно",
            ai: "Искусственный интеллект",
            aiDescription: "Управляй настройками ИИ ZENIX.",
            footer: "ZENIX — Intelligence Beyond Limits."
        },

        memory: {
            saved: "Информация сохранена.",
            updated: "Информация обновлена.",
            deleted: "Информация удалена.",
            empty: "Нет сохранённой информации.",
            confirmation: "Хочешь сохранить эту информацию?"
        }
    };

    root.ZENIX_LANGUAGES = root.ZENIX_LANGUAGES || {};
    root.ZENIX_LANGUAGES.ru = language;
    root.ZENIX_RU = language;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = language;
    }

})(typeof window !== "undefined" ? window : globalThis);

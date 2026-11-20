
(function (root) {
    "use strict";

    const language = {
        code: "en",
        name: "English",
        direction: "ltr",

        messages: {
            welcome: "Welcome to ZENIX.",
            goodbye: "Goodbye.",
            loading: "Loading...",
            thinking: "Thinking...",
            listening: "I'm listening...",
            speaking: "Speaking...",
            error: "An error occurred.",
            notFound: "Not found.",
            languageChanged: "Language changed."
        },

        navigation: {
            home: "Home",
            chats: "Chats",
            favorites: "Favorites",
            back: "← Home"
        },

        interface: {
            title: "ZENIX Artificial Intelligence",
            description: "Your personal artificial intelligence",
            greeting: "Hello! I'm ready to help you ❤️",
            placeholder: "Write your message...",
            send: "Send",
            clear: "Clear",
            settings: "Settings",
            language: "Language",
            languageDescription: "Choose ZENIX's working language.",
            selectLanguage: "Select a language:",
            voice: "Voice",
            microphone: "Microphone",
            stop: "Stop",
            start: "Start",
            close: "Close",
            save: "Save",
            cancel: "Cancel",
            login: "Login / Register"
        },

        chats: {
            description: "View and manage your conversations.",
            search: "Search conversations...",
            new: "New chat",
            recent: "Recent conversations",
            history: "Chat history",
            all: "All conversations",
            emptyTitle: "No conversations yet",
            emptyDescription: "Your conversations will appear here.",
            footer: "Your conversations are saved securely."
        },

        voice: {
            startListening: "Press to speak.",
            stopListening: "Listening stopped.",
            permissionDenied: "Microphone permission denied.",
            notSupported: "Voice system is not supported.",
            recognitionError: "Speech recognition error.",
            speechError: "Speech synthesis error."
        },

        chat: {
            user: "You",
            assistant: "ZENIX",
            empty: "No messages yet.",
            thinking: "ZENIX is thinking...",
            connectionError: "Connection error. Try again."
        },

        favorites: {
            empty: "Your favorite responses will be saved here.",
            description: "Your saved favorite responses.",
            search: "Search favorites...",
            collection: "My collection",
            collectionDescription: "Your saved responses in one place.",
            filter: "All favorites",
            emptyTitle: "No favorites yet",
            emptyDescription: "Save responses you like, and they will appear here.",
            footer: "Your favorite responses are always available here."
        },

        settings: {
            description: "Customize your ZENIX experience.",
            general: "General settings",
            generalDescription: "Manage the basic application settings.",
            appearance: "Appearance",
            appearanceDescription: "Customize the appearance of ZENIX.",
            darkMode: "Dark mode",
            darkModeDescription: "Use a dark interface.",
            neon: "Neon effects",
            neonDescription: "Enable neon visual effects.",
            active: "Active",
            ai: "Artificial intelligence",
            aiDescription: "Manage ZENIX AI settings.",
            footer: "ZENIX — Intelligence Beyond Limits."
        },

        memory: {
            saved: "Information saved.",
            updated: "Information updated.",
            deleted: "Information deleted.",
            empty: "No saved information.",
            confirmation: "Do you want to save this information?"
        }
    };

    root.ZENIX_LANGUAGES = root.ZENIX_LANGUAGES || {};
    root.ZENIX_LANGUAGES.en = language;
    root.ZENIX_EN = language;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = language;
    }

})(typeof window !== "undefined" ? window : globalThis);

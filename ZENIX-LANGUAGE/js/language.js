(function (root) {
    "use strict";

    const DEFAULT_LANGUAGE = "hy";

    const SUPPORTED_LANGUAGES = ["hy", "en", "ru",];

    let currentLanguage = DEFAULT_LANGUAGE;

    function isSupportedLanguage(code) {
        return SUPPORTED_LANGUAGES.includes(code);
    }

    function getLanguage(code = currentLanguage) {
        return root.ZENIX_LANGUAGES?.[code] || null;
    }

    function setLanguage(code) {
        if (!isSupportedLanguage(code)) {
            throw new Error("Unsupported language: " + code);
        }

        const language = getLanguage(code);

        if (!language) {
            throw new Error("Language file not loaded: " + code);
        }

        currentLanguage = code;

        root.document?.documentElement?.setAttribute(
            "lang",
            code
        );

        root.document?.documentElement?.setAttribute(
            "dir",
            language.direction || "ltr"
        );

        root.dispatchEvent?.(
            new CustomEvent("zenix:languageChanged", {
                detail: {
                    code,
                    language
                }
            })
        );

        return language;
    }

    function getCurrentLanguage() {
        return currentLanguage;
    }

    function getSupportedLanguages() {
        return [...SUPPORTED_LANGUAGES];
    }

    const api = {
        setLanguage,
        getLanguage,
        getCurrentLanguage,
        getSupportedLanguages,
        isSupportedLanguage
    };

    root.ZENIX_LANGUAGE = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }

})(typeof window !== "undefined" ? window : globalThis);
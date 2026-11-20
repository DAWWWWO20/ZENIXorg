    (function (root) {
        "use strict";

        function getTranslations() {
            const languageCode =
                root.ZENIX_LANGUAGE?.getCurrentLanguage() || "hy";

            return root.ZENIX_LANGUAGES?.[languageCode] || null;
        }

        function translate(path, fallback = "") {
            const language = getTranslations();

            if (!language || typeof path !== "string") {
                return fallback;
            }

            const value = path.split(".").reduce(
                (object, key) => object?.[key],
                language
            );

            return typeof value === "string" ? value : fallback;
        }

        const api = {
            getTranslations,
            translate
        };

        root.ZENIX_TRANSLATIONS = api;
        root.ZENIX_T = translate;

        if (typeof module !== "undefined" && module.exports) {
            module.exports = api;
        }

    })(typeof window !== "undefined" ? window : globalThis);
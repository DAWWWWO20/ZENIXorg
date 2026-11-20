(function (root) {
    "use strict";

    const LANGUAGE_VOICES = {
        hy: "hy-AM",
        en: "en-US",
        ru: "ru-RU",
    };

    function getCurrentLocale() {
        const code =
            root.ZENIX_LANGUAGE?.getCurrentLanguage() || "hy";

        return LANGUAGE_VOICES[code] || "hy-AM";
    }

    function speak(text) {
        if (!("speechSynthesis" in root)) {
            throw new Error("Speech synthesis is not supported.");
        }

        if (typeof text !== "string" || !text.trim()) {
            return false;
        }

        root.speechSynthesis.cancel();

        const utterance = new root.SpeechSynthesisUtterance(text);
        utterance.lang = getCurrentLocale();
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        root.speechSynthesis.speak(utterance);

        return true;
    }

    function stopSpeaking() {
        if ("speechSynthesis" in root) {
            root.speechSynthesis.cancel();
        }
    }

    function isSupported() {
        return "speechSynthesis" in root;
    }

    const api = {
        speak,
        stopSpeaking,
        isSupported,
        getCurrentLocale
    };

    root.ZENIX_SPEECH = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }

})(typeof window !== "undefined" ? window : globalThis);
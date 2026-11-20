
(function (root) {
    "use strict";

    const Recognition =
        root.SpeechRecognition ||
        root.webkitSpeechRecognition;

    let recognition = null;
    let listening = false;
    let starting = false;
    let stopping = false;

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

    function isSupported() {
        return Boolean(Recognition);
    }

    function startListening(callbacks = {}) {
        if (!Recognition) {
            callbacks.onError?.("not-supported");
            return false;
        }

        if (listening || starting) {
            return false;
        }

        recognition = new Recognition();

        const currentRecognition = recognition;

        let finalTranscript = "";

        starting = true;
        stopping = false;

        currentRecognition.lang = getCurrentLocale();
        currentRecognition.continuous = true;
        currentRecognition.interimResults = true;
        currentRecognition.maxAlternatives = 1;

        currentRecognition.onstart = function () {
            if (recognition !== currentRecognition) return;

            starting = false;
            listening = true;

            callbacks.onStart?.();
        };

        currentRecognition.onresult = function (event) {
            if (recognition !== currentRecognition) return;

            let interimTranscript = "";

            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {
                const result = event.results[i];
                const transcript = result[0]?.transcript || "";

                if (result.isFinal) {
                    finalTranscript += transcript + " ";
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript.trim()) {
                callbacks.onResult?.(
                    finalTranscript.trim(),
                    interimTranscript,
                    true
                );

                finalTranscript = "";
            } else if (interimTranscript) {
                callbacks.onResult?.(
                    interimTranscript.trim(),
                    interimTranscript,
                    false
                );
            }
        };

        currentRecognition.onerror = function (event) {
            if (recognition !== currentRecognition) return;

            callbacks.onError?.(event.error);
        };

        currentRecognition.onend = function () {
            if (recognition !== currentRecognition) return;

            listening = false;
            starting = false;
            stopping = false;

            recognition = null;

            callbacks.onEnd?.();
        };

        try {
            currentRecognition.start();
            return true;
        } catch (error) {
            starting = false;
            listening = false;
            stopping = false;

            if (recognition === currentRecognition) {
                recognition = null;
            }

            callbacks.onError?.(error.name || error.message);

            return false;
        }
    }

    function stopListening() {
        if (!recognition || stopping) {
            return;
        }

        stopping = true;

        try {
            recognition.stop();
        } catch (error) {
            try {
                recognition.abort();
            } catch (abortError) {
                // Recognition is already stopped.
            }

            listening = false;
            starting = false;
            stopping = false;
        }
    }

    function isListening() {
        return listening || starting;
    }

    const api = {
        startListening,
        stopListening,
        isListening,
        isSupported,
        getCurrentLocale
    };

    root.ZENIX_VOICE = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }

})(typeof window !== "undefined" ? window : globalThis);

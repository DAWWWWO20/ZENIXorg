
(function (root) {
    "use strict";

    // Հաճախ օգտագործվող բառերի ճշգրիտ տարբերակներ
    const WORD_MAP = {
        "barev": "բարև",
        "vonc": "ոնց",
        "es": "ես",
        "shnorhakalutyun": "շնորհակալություն",
        "ynker": "ընկեր",
        "poqr": "փոքր",
        "qez": "քեզ",
        "dzayn": "ձայն"
    };

    // Բարդ տառային համակցություններ
    const MAP = {
        "tch": "ճ",
        "yev": "և",
        "sh": "շ",
        "ch": "չ",
        "zh": "ժ",
        "gh": "ղ",
        "kh": "խ",
        "dz": "ձ",
        "rr": "ռ",
        "ev": "և",
        "oo": "ու",
        "ph": "փ",
        "th": "թ",
        "ts'": "ց",
        "tz": "ծ",
        "dj": "ջ",
        "jh": "ժ",
        "t'": "թ",
        "p'": "փ",
        "k'": "ք",
        "rh": "ռ",
        "ē": "է",
        "eh": "է",
        "ə": "ը",
        "vo": "ո",
        "ye": "ե",
        "oh": "օ",
"x": "խ",

        "a": "ա",
        "b": "բ",
        "g": "գ",
        "d": "դ",
        "z": "զ",
        "e": "ե",
        "y": "յ",
        "i": "ի",
        "l": "լ",
        "k": "կ",
        "h": "հ",
        "c": "ց",
        "m": "մ",
        "n": "ն",
        "o": "ո",
        "p": "պ",
        "j": "ջ",
        "r": "ր",
        "s": "ս",
        "v": "վ",
        "w": "վ",
        "t": "տ",
        "u": "ու",
        "q": "ք",
        "f": "ֆ"
    };

    const KEYS = Object.keys(MAP).sort(
        (a, b) => b.length - a.length
    );

    function convertWord(word) {
        const lower = word.toLowerCase();

        if (WORD_MAP[lower]) {
            const converted = WORD_MAP[lower];

            return word === word.toUpperCase()
                ? converted.toUpperCase()
                : converted;
        }

        let result = "";
        let i = 0;

        while (i < lower.length) {
            const remaining = lower.slice(i);

            const matched = KEYS.find(key =>
                remaining.startsWith(key)
            );

            if (matched) {
                result += MAP[matched];
                i += matched.length;
            } else {
                result += word[i];
                i++;
            }
        }

        return result;
    }

    function convert(text) {
        if (typeof text !== "string" || !text) {
            return text;
        }

        return text.replace(
            /[a-zA-ZēəƏ']+/g,
            word => {
                if (/^[A-Z]{2,}$/.test(word)) {
                    return word;
                }

                return convertWord(word);
            }
        );
    }

    root.ZENIX_ARMENIAN_TRANSLITERATOR = {
        convert
    };

})(typeof window !== "undefined" ? window : globalThis);

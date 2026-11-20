
    (function (root) {
        "use strict";

        const language = {
            code: "hy",
            name: "Հայերեն",
            direction: "ltr",

            messages: {
                welcome: "Բարի գալուստ ZENIX։",
                goodbye: "Ցտեսություն։",
                loading: "Բեռնվում է...",
                thinking: "Մտածում եմ...",
                listening: "Լսում եմ քեզ...",
                speaking: "Խոսում եմ...",
                error: "Տեղի է ունեցել սխալ։",
                notFound: "Չգտնվեց։",
                languageChanged: "Լեզուն փոխվեց։"
            },

            navigation: {
                home: "Գլխավոր",
                chats: "Զրույցներ",
                favorites: "Սիրվածներ",
                back: "← Գլխավոր էջ"
            },

            interface: {
                title: "ZENIX արհեստական բանականություն",
                description: "Քո անձնական արհեստական բանականությունը",
                greeting: "Բարև՛։ Ես պատրաստ եմ օգնել քեզ ❤️",
                placeholder: "Գրիր քո հաղորդագրությունը...",
                send: "Ուղարկել",
                clear: "Մաքրել",
                settings: "Կարգավորումներ",
                language: "Լեզու",
                languageDescription: "Ընտրիր ZENIX-ի աշխատանքային լեզուն։",
                selectLanguage: "Ընտրիր լեզուն՝",
                voice: "Ձայն",
                microphone: "Խոսափող",
                stop: "Կանգնեցնել",
                start: "Սկսել",
                close: "Փակել",
                save: "Պահպանել",
                cancel: "Չեղարկել",
                login: "Մուտք / Գրանցում"
            },

            voice: {
                startListening: "Սեղմիր՝ խոսելու համար։",
                stopListening: "Լսումն ավարտվեց։",
                permissionDenied: "Խոսափողի թույլտվությունը մերժված է։",
                notSupported: "Ձայնային համակարգը չի աջակցվում։",
                recognitionError: "Խոսքի ճանաչման սխալ։",
                speechError: "Ձայնի արտաբերման սխալ։"
            },

            chat: {
                user: "Դու",
                assistant: "ZENIX",
                empty: "Դեռ հաղորդագրություններ չկան։",
                thinking: "ZENIX-ը մտածում է...",
                connectionError: "Կապի սխալ։ Փորձիր կրկին։"
            },

            // CHATS PAGE
            chats: {
                description: "Քո բոլոր զրույցները մեկ վայրում",
                search: "Որոնել զրույցներ...",
                new: "Նոր զրույց",
                recent: "Վերջին զրույցները",
                history: "Քո զրույցների պատմությունը",
                all: "Բոլորը",
                emptyTitle: "Դեռ զրույցներ չկան",
                emptyDescription: "Երբ սկսես զրուցել ZENIX-ի հետ, քո զրույցները կհայտնվեն այստեղ։",
                footer: "Քո զրույցները նախատեսված են քեզ համար"
            },

            // FAVORITES PAGE
            favorites: {
                empty: "Այստեղ կպահպանվեն քո սիրելի պատասխանները.",
                description: "Քո պահպանած կարևոր զրույցները",
                search: "Որոնել սիրվածներում...",
                collection: "Իմ հավաքածուն",
                collectionDescription: "Քեզ համար առանձնացված զրույցներ",
                filter: "Սիրվածներ",
                emptyTitle: "Դեռ սիրվածներ չունես",
                emptyDescription: "Քեզ կարևոր զրույցները կարող ես հետագայում ավելացնել այս բաժնում։",
                footer: "Քո ամենակարևոր զրույցները՝ մեկ վայրում"
            },

            // SETTINGS PAGE
            settings: {
                description: "Կառավարիր ZENIX-ի նախընտրությունները",

                general: "Ընդհանուր",
                generalDescription: "Հիմնական կարգավորումներ",

                appearance: "Արտաքին տեսք",
                appearanceDescription: "ZENIX-ի տեսողական ոճը",

                darkMode: "Մուգ թեմա",
                darkModeDescription: "ZENIX-ի հիմնական մուգ դիզայնը",

                neon: "Նեոնային ոճ",
                neonDescription: "Կապույտ լուսային էֆեկտներ",

                active: "Ակտիվ",

                ai: "ZENIX AI",
                aiDescription: "Քո անձնական արհեստական բանականությունը",

                footer: "ZENIX-ի կառավարման կենտրոն"
            },

            memory: {
                saved: "Տեղեկությունը պահպանվեց։",
                updated: "Տեղեկությունը թարմացվեց։",
                deleted: "Տեղեկությունը ջնջվեց։",
                empty: "Պահպանված տեղեկություններ չկան։",
                confirmation: "Ցանկանո՞ւմ ես պահպանել այս տեղեկությունը։"
            }
        };

        root.ZENIX_LANGUAGES = root.ZENIX_LANGUAGES || {};
        root.ZENIX_LANGUAGES.hy = language;
        root.ZENIX_HY = language;

        if (typeof module !== "undefined" && module.exports) {
            module.exports = language;
        }

    })(typeof window !== "undefined" ? window : globalThis);


// ==========================================
// ZENIX CONFIG
// ==========================================

const API_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://zenixorg.onrender.com";


const robot = document.getElementById("robot");
const mouth = document.querySelector(".robot-mouth");

const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
// ==========================================
// ZENIX CHAT ELEMENTS
// ==========================================

const newChatBtn = document.getElementById("newChatBtn");
const chatList = document.getElementById("chatList");
const chatEmptyState = document.getElementById("chatEmptyState");
const chatSearchInput = document.getElementById("chatSearchInput");
const voiceBtn = document.getElementById("voiceBtn");
const messages = document.getElementById("messages");

let talking = false;
let busy = false;
let history = [];

let mediaRecorder = null;
let recordedChunks = [];
let listening = false;
let starting = false;
let micStartCancelled = false;

// ==========================================
// SESSION ID
// ==========================================

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

function makeSessionId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 12) +
        Math.random().toString(36).slice(2, 12)
    );
}

let fallbackSessionId = null;

    function getSessionId() {
    try {
        const saved = localStorage.getItem("zenix_session");

        if (saved && SESSION_ID_PATTERN.test(saved)) {
            return saved;
        }

        const id = makeSessionId();
        localStorage.setItem("zenix_session", id);

        return id;

    } catch {
        if (!fallbackSessionId) {
            fallbackSessionId = makeSessionId();
        }

        return fallbackSessionId;
    }
}

let sessionId = getSessionId();

// ==========================================
// AUTHENTICATION
// ==========================================

const AUTH_TOKEN_KEY = "zenix_auth_token";

let authToken = null;

try {
    authToken = localStorage.getItem(AUTH_TOKEN_KEY);
} catch (error) {
    console.error("AUTH STORAGE ERROR:", error);
}

function getAuthToken() {
    try {
        const token =
            localStorage.getItem(AUTH_TOKEN_KEY) ||
            sessionStorage.getItem(AUTH_TOKEN_KEY);

        authToken = token;

        if (!token) {
            throw new Error("AUTH_REQUIRED");
        }

        return token;

    } catch (error) {
        if (error.message === "AUTH_REQUIRED") {
            throw error;
        }

        throw new Error("AUTH_STORAGE_ERROR");
    }
}

function saveAuthToken(token, remember = true) {
    if (typeof token !== "string" || !token.trim()) {
        throw new Error("INVALID_AUTH_TOKEN");
    }

    try {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);

        if (remember) {
            localStorage.setItem(AUTH_TOKEN_KEY, token);
        } else {
            sessionStorage.setItem(AUTH_TOKEN_KEY, token);
        }

        authToken = token;

    } catch (error) {
        console.error("AUTH TOKEN SAVE ERROR:", error);
        throw new Error("AUTH_STORAGE_ERROR");
    }
}

function saveAuthUser(data, remember = true) {
    if (!data || typeof data.name !== "string" || !data.name.trim()) {
        throw new Error("INVALID_AUTH_USER");
    }

    try {
        localStorage.removeItem("zenix_user_name");
        sessionStorage.removeItem("zenix_user_name");

        const storage = remember ? localStorage : sessionStorage;

        storage.setItem("zenix_user_name", data.name.trim());

    } catch (error) {
        console.error("AUTH USER SAVE ERROR:", error);
        throw new Error("AUTH_STORAGE_ERROR");
    }
}

function logoutUser() {
    try {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem("zenix_user_name");
        sessionStorage.removeItem("zenix_user_name");

    } catch (error) {
        console.error("AUTH LOGOUT ERROR:", error);
    }

    authToken = null;
    window.location.href = "register.html";
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[char];
    });
}

function updateAuthArea() {
    const authArea = document.getElementById("authArea");

    if (!authArea) return;

    let userName = "";

    try {
        userName =
            localStorage.getItem("zenix_user_name") ||
            sessionStorage.getItem("zenix_user_name") ||
            "";
    } catch (error) {
        console.error("AUTH USER READ ERROR:", error);
    }

    if (userName) {
        authArea.innerHTML = `
            <div class="auth-user">
                <span class="user-profile">
                    <i data-lucide="user-round"></i>
                    ${escapeHTML(userName)}
                </span>

                <button
                    class="logout-button"
                    onclick="logoutUser()"
                    title="Ելք"
                    aria-label="Ելք"
                    type="button"
                >
                    ↪
                </button>
            </div>
        `;
    } else {
        authArea.innerHTML = `
            <a href="register.html" class="auth-link">
                Մուտք / Գրանցում
            </a>
        `;
    }
}

updateAuthArea();


// ==========================================
// LOGIN AND REGISTER
// ==========================================

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

const loginButton = document.getElementById("login-button");
const registerButton = document.getElementById("register-button");

const authMessage = document.getElementById("auth-message");

function showAuthMessage(message, isError = false) {
    if (!authMessage) {
        alert(message);
        return;
    }

    authMessage.hidden = false;
    authMessage.textContent = message;
    authMessage.style.color = isError ? "#ff7777" : "#00d5ff";
    authMessage.style.marginTop = "15px";
    authMessage.style.fontSize = "13px";
    authMessage.style.textAlign = "center";
}
function setAuthLoading(button, loading, originalText) {
    if (!button) return;

    const isLoading = Boolean(loading);

    button.disabled = isLoading;
    button.style.opacity = isLoading ? "0.6" : "1";
    button.style.cursor = isLoading ? "wait" : "pointer";

    button.setAttribute("aria-busy", String(isLoading));

    const textElement = button.querySelector(".button-text");

    if (textElement) {
        if (isLoading) {
            textElement.textContent = "Խնդրում եմ սպասիր...";
        } else if (typeof originalText === "string") {
            textElement.textContent = originalText;
        }
    }
}
async function authRequest(endpoint, payload) {
    const response = await fetch(API_URL + endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error("Սերվերը սխալ պատասխան է վերադարձրել։");
    }

    if (!response.ok || !data.success) {
        const errors = {
            ALL_FIELDS_REQUIRED: "Լրացրու բոլոր դաշտերը։",
            INVALID_NAME: "Անունը պետք է լինի 2-50 նիշ։",
            INVALID_EMAIL: "Էլեկտրոնային փոստը ճիշտ չէ։",
            INVALID_PASSWORD: "Գաղտնաբառը պետք է լինի առնվազն 8 նիշ։",
            EMAIL_ALREADY_REGISTERED: "Այս էլեկտրոնային փոստով արդեն գրանցվել ես։",
            EMAIL_AND_PASSWORD_REQUIRED: "Լրացրու էլեկտրոնային փոստն ու գաղտնաբառը։",
            INVALID_CREDENTIALS: "Էլեկտրոնային փոստը կամ գաղտնաբառը սխալ է։",
            REGISTRATION_FAILED: "Գրանցումը չհաջողվեց։",
            LOGIN_FAILED: "Մուտքը չհաջողվեց։"
        };

        throw new Error(
            errors[data.error] || data.error || "Գործողությունը չհաջողվեց։"
        );
    }

    return data;
}


// REGISTER

 
async function registerUser() {
    if (!registerForm || !registerButton) return;

    if (!registerForm.reportValidity()) return;

    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (password !== confirmPassword) {
        showAuthMessage("Գաղտնաբառերը չեն համընկնում։", true);
        return;
    }

    const originalText = "ԳՐԱՆՑՎԵԼ <span>→</span>";

    try {
        setAuthLoading(registerButton, true, originalText);

        const data = await authRequest("/api/register", {
            name,
            email,
            password
        });

        saveAuthToken(data.token, true);
        saveAuthUser(data, true);

        showAuthMessage("Գրանցումը հաջողվեց։ Բարի գալուստ ZENIX։");

        window.location.href = "index.html";

    } catch (error) {
        console.error("ZENIX REGISTER ERROR:", error);
        showAuthMessage(error.message, true);

    } finally {
        setAuthLoading(registerButton, false, originalText);
    }
}


// LOGIN

async function loginUser() {
    if (!loginForm || !loginButton) return;

    if (!loginForm.reportValidity()) return;

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    const remember =
        document.getElementById("remember-me")?.checked ?? false;

    const originalText = "ՄՈՒՏՔ ԳՈՐԾԵԼ <span>→</span>";

    try {
        setAuthLoading(loginButton, true, originalText);

        const data = await authRequest("/api/login", {
            email,
            password
        });

        saveAuthToken(data.token, remember);
        saveAuthUser(data, remember);

        showAuthMessage("Մուտքը հաջողվեց։ Բարի վերադարձ։");

        window.location.href = "index.html";

    } catch (error) {
        console.error("ZENIX LOGIN ERROR:", error);
        showAuthMessage(error.message, true);

    } finally {
        setAuthLoading(loginButton, false, originalText);
    }
}




if (loginForm) {
    loginForm.addEventListener("submit", event => {
        event.preventDefault();
        loginUser();
    });
}

if (registerForm) {
    registerForm.addEventListener("submit", event => {
        event.preventDefault();
        registerUser();
    });
}

if (authMessage) {
    const forgotPassword = document.getElementById("forgot-password");

    if (forgotPassword) {
        forgotPassword.addEventListener("click", event => {
            event.preventDefault();

            showAuthMessage(
                "Գաղտնաբառի վերականգնումը դեռ միացված չէ։"
            );
        });
    }
}


// ==========================================
// ROBOT ANIMATIONS
// ==========================================

function startTalking() {
    if (talking) return;

    talking = true;

    try {
        mouth?.classList?.add("talking");
        robot?.classList?.add("talking");
    } catch (error) {
        console.warn("ZENIX START TALKING ERROR:", error);
    }
}

function stopTalking() {
    talking = false;

    try {
        mouth?.classList?.remove("talking");
        robot?.classList?.remove("talking");
    } catch (error) {
        console.warn("ZENIX STOP TALKING ERROR:", error);
    }
}
function robotTalk() {
    try {
        startTalking();

        if (robotTalkTimer) {
            clearTimeout(robotTalkTimer);
        }

        robotTalkTimer = setTimeout(() => {
            robotTalkTimer = null;

            try {
                stopTalking();
            } catch (error) {
                console.warn("ZENIX STOP TALKING ERROR:", error);
            }
        }, 1800);

    } catch (error) {
        console.warn("ZENIX ROBOT TALK ERROR:", error);
    }
}
function waveRobot() {
    if (!robot) return;

    robot.classList.remove("waving");

    void robot.offsetWidth;

    robot.classList.add("waving");

    setTimeout(() => {
        robot.classList.remove("waving");
    }, 3400);
}


function checkGreeting(text) {
    if (typeof text !== "string" || !text.trim()) {
        return false;
    }

    const normalized = text
        .toLowerCase()
        .normalize("NFC")
        .replace(/[!?.,՝։՞՜]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const greetings = [
        "բարև",
        "բարեւ",
        "բարև ձեզ",
        "բարեւ ձեզ",
        "բարև զենիքս",
        "բարև zenix",
        "ողջույն",
        "ողջույն ձեզ",
        "hello",
        "hi",
        "hey",
        "privet",
        "привет",
        "здравствуйте"
    ];

    return greetings.some(greeting =>
        normalized === greeting ||
        normalized.startsWith(greeting + " ")
    );
}


// ==========================================
// CHAT MESSAGES
// ==========================================

function addMessage(text, sender = "bot") {
    if (!messages) return null;

    const message = document.createElement("div");

    message.className = sender === "user"
        ? "message user-message"
        : "message";

    message.textContent = text;

    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;

    return message;
}

function showLoading() {
    if (!messages) return null;

    const loading = document.createElement("div");

    loading.className = "message loading-message";
loading.textContent = "ZENIX-ը մտածում է... 💙";
    messages.appendChild(loading);
    messages.scrollTop = messages.scrollHeight;

    return loading;
}


// ==========================================
// AUDIO UTILITIES
// ==========================================

function base64ToWav(base64, sampleRate = 24000) {
    if (typeof base64 !== "string" || !base64.trim()) {
        throw new Error("INVALID_AUDIO_BASE64");
    }

    if (
        !Number.isInteger(sampleRate) ||
        sampleRate < 1 ||
        sampleRate > 384000
    ) {
        throw new Error("INVALID_AUDIO_SAMPLE_RATE");
    }

    let binary;

    try {
        binary = atob(base64.replace(/\s/g, ""));
    } catch (error) {
        throw new Error("INVALID_AUDIO_BASE64");
    }

    const length = binary.length;

    if (length === 0 || length % 2 !== 0) {
        throw new Error("INVALID_PCM_AUDIO_LENGTH");
    }

    if (length > 0xFFFFFFFF - 36) {
        throw new Error("AUDIO_FILE_TOO_LARGE");
    }

    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);

    function writeString(offset, value) {
        for (let i = 0; i < value.length; i++) {
            view.setUint8(offset + i, value.charCodeAt(i));
        }
    }

    writeString(0, "RIFF");
    view.setUint32(4, 36 + length, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length, true);

    for (let i = 0; i < length; i++) {
        view.setUint8(44 + i, binary.charCodeAt(i));
    }

    return new Blob([buffer], {
        type: "audio/wav"
    });
}


// ==========================================
// BROWSER VOICE FALLBACK
// ==========================================

function speakWithBrowser(text) {
    return new Promise((resolve, reject) => {
        if (typeof text !== "string" || !text.trim()) {
            reject(new Error("INVALID_SPEECH_TEXT"));
            return;
        }

        if (
            !("speechSynthesis" in window) ||
            typeof SpeechSynthesisUtterance === "undefined"
        ) {
            reject(new Error("Browser speech is not supported."));
            return;
        }

        const synthesis = window.speechSynthesis;

        try {
            synthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);

            const currentLanguage =
                window.ZENIX_LANGUAGE?.getCurrentLanguage() || "hy";

            const voiceLanguages = {
                hy: "hy-AM",
                en: "en-US",
                ru: "ru-RU",
                es: "es-ES",
                fr: "fr-FR"
            };

            const selectedLanguage =
                voiceLanguages[currentLanguage] || "hy-AM";

            utterance.lang = selectedLanguage;

            const selectVoice = () => {
                const voices = synthesis.getVoices();

                return voices.find(voice =>
                    voice.lang.toLowerCase() === selectedLanguage.toLowerCase()
                ) || voices.find(voice =>
                    voice.lang.toLowerCase().startsWith(currentLanguage)
                );
            };

            const selectedVoice = selectVoice();

            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }

            let completed = false;

            const finish = (error = null) => {
                if (completed) return;

                completed = true;

                stopTalking();

                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            };

            utterance.onstart = () => {
                startTalking();
            };

            utterance.onend = () => {
                finish();
            };

            utterance.onerror = event => {
                finish(new Error(event.error || "Browser voice error"));
            };

            synthesis.speak(utterance);

        } catch (error) {
            stopTalking();
            reject(error);
        }
    });
}


// ==========================================
// MAIN ZENIX VOICE
// ==========================================


async function speakReply(text) {
    let audioUrl = null;
    let audio = null;

    try {
        if (typeof text !== "string" || !text.trim()) {
            throw new Error("INVALID_SPEECH_TEXT");
        }

        const response = await fetch(API_URL + "/api/speech", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text })
        });

        const responseText = await response.text();

        let data;

        try {
            data = responseText
                ? JSON.parse(responseText)
                : null;
        } catch (error) {
            throw new Error("SPEECH_INVALID_JSON");
        }

        if (!response.ok) {
            throw new Error(
                data?.error || "Speech API error"
            );
        }

        if (
            !data ||
            typeof data.audio !== "string" ||
            !data.audio.trim()
        ) {
            throw new Error("INVALID_AUDIO_DATA");
        }

        const mimeType = String(data.mimeType || "")
            .toLowerCase();

        let audioBlob;

        if (mimeType.includes("wav")) {
            const binary = atob(data.audio);
            const bytes = new Uint8Array(binary.length);

            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }

            audioBlob = new Blob([bytes], {
                type: "audio/wav"
            });

        } else {
            const match = mimeType.match(/rate=(\d+)/i);

            const sampleRate = match
                ? Number(match[1])
                : 24000;

            audioBlob = base64ToWav(
                data.audio,
                sampleRate
            );
        }

        if (!audioBlob || !audioBlob.size) {
            throw new Error("INVALID_AUDIO_BLOB");
        }

        audioUrl = URL.createObjectURL(audioBlob);
        audio = new Audio(audioUrl);

        await new Promise((resolve, reject) => {
            let completed = false;

            const finish = (error = null) => {
                if (completed) return;

                completed = true;

                audio.onended = null;
                audio.onerror = null;

                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            };

            audio.onended = () => {
                finish();
            };

            audio.onerror = () => {
                finish(new Error("Audio playback failed."));
            };

            audio.play()
                .then(() => {
                    startTalking();
                })
                .catch(error => {
                    finish(error);
                });
        });

    } catch (error) {
        console.warn(
            "GEMINI VOICE UNAVAILABLE. USING BROWSER VOICE:",
            error.message
        );

        try {
            await speakWithBrowser(text);

        } catch (browserError) {
            console.error(
                "BROWSER VOICE ERROR:",
                browserError
            );

            addMessage(
                "ZENIX-ը չկարողացավ խոսել։ Փորձիր կրկին 💙"
            );
        }

    } finally {
        stopTalking();

        if (audio) {
            audio.onended = null;
            audio.onerror = null;
        }

        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
    }
}


// ==========================================
// SEND MESSAGE
// ==========================================



async function sendMessage() {
    if (!input || !messages || busy) return;

    const text = input.value.trim();

    if (!text) return;

    let token;

    try {
        token = getAuthToken();
    } catch (error) {
        logoutUser();
        return;
    }

    busy = true;
    let loading = null;

    if (sendBtn) {
        sendBtn.disabled = true;
    }

    try {
        try {
            if (checkGreeting(text)) {
                waveRobot();
            }
        } catch (error) {
            console.warn("ZENIX GREETING ERROR:", error);
        }

        // Պատրաստում ենք հարցման պատմությունը
        // առանց հիմնական history-ն փոխելու։
        const requestHistory = [
            ...history,
            {
                role: "user",
                text
            }
        ];

        loading = showLoading();

  

let response = await fetch(API_URL + "/api/chat", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
        sessionId,
        history: requestHistory
    })
});

// Եթե զրույցը սերվերում գոյություն չունի՝ ստեղծում ենք նորը։
if (response.status === 404) {
    const errorText = await response.text();

    let errorData = null;

    try {
        errorData = errorText ? JSON.parse(errorText) : null;
    } catch {
        throw new Error("SERVER_INVALID_JSON");
    }

    if (errorData?.error !== "CHAT_NOT_FOUND") {
        throw new Error(
            errorData?.error || "ZENIX CHAT ERROR"
        );
    }

    // Ստեղծում ենք նոր զրույց սերվերում։
    const createResponse = await fetch(API_URL + "/api/chats", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        }
    });

    if (createResponse.status === 401) {
        logoutUser();
        return;
    }

    const createText = await createResponse.text();

    let createData = null;

    try {
        createData = createText
            ? JSON.parse(createText)
            : null;
    } catch {
        throw new Error("SERVER_INVALID_JSON");
    }

    if (
        !createResponse.ok ||
        !createData?.success ||
        !createData?.chat?.id
    ) {
        throw new Error(
            createData?.error || "CHAT_CREATE_FAILED"
        );
    }

    // Պահպանում ենք սերվերի ստեղծած իրական ID-ն։
    sessionId = createData.chat.id;

    localStorage.setItem("zenix_session", sessionId);

    // Կրկին ուղարկում ենք նույն հաղորդագրությունը։
    response = await fetch(API_URL + "/api/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
            sessionId,
            history: requestHistory
        })
    });
}


        if (response.status === 401) {
            logoutUser();
            return;
        }

        const responseText = await response.text();

        let data = null;

        try {
            data = responseText
                ? JSON.parse(responseText)
                : null;
        } catch (error) {
            throw new Error("SERVER_INVALID_JSON");
        }

        if (!response.ok) {
            throw new Error(
                data?.error || "ZENIX CHAT ERROR"
            );
        }

        if (
            !data ||
            typeof data.reply !== "string" ||
            !data.reply.trim()
        ) {
            throw new Error("INVALID_CHAT_REPLY");
        }

        // Միայն հաջող պատասխանից հետո
        // պահպանում ենք հաղորդագրությունները։
        history.push({
            role: "user",
            text
        });

        history.push({
            role: "assistant",
            text: data.reply
        });

        // Ցուցադրում ենք հաղորդագրությունները։
        addMessage(text, "user");
        addMessage(data.reply, "bot");

        // Մաքրում ենք դաշտը միայն այն դեպքում,
        // եթե օգտատերը նոր տեքստ չի մուտքագրել։
        if (input.value.trim() === text) {
            input.value = "";
        }

        robotTalk();

    } catch (error) {
        console.error("ZENIX CHAT ERROR:", error);

        addMessage(
            "Կներես, հաղորդագրությունն ուղարկելիս սխալ առաջացավ։ Փորձիր կրկին։"
        );

    } finally {
        if (loading) {
            loading.remove();
        }

        busy = false;

        if (sendBtn) {
            sendBtn.disabled = false;
        }

        if (input) {
            input.focus();
        }
    }
}




// SEND BUTTON
if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
} else {
    console.error("ZENIX: sendBtn not found");
}

// ==========================================
// ZENIX SEND MESSAGE
// ==========================================





// ENTER KEY

if (input) {
    input.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
}


// ==========================================
// MICROPHONE
// ==========================================

// ==========================================
// MICROPHONE
// ==========================================

async function startListening() {
    if (starting || listening) {
        return;
    }

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia ||
        typeof MediaRecorder === "undefined"
    ) {
        addMessage("Քո դիտարկիչը չի աջակցում ձայնագրությանը։");
        return;
    }

    starting = true;
    micStartCancelled = false;

    let stream = null;

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });

        // Եթե օգտատերը չեղարկել է միացումը։
        if (micStartCancelled) {
            stream.getTracks().forEach(track => track.stop());
            return;
        }

        recordedChunks = [];

        const mimeTypes = [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/mp4"
        ];

        let recorderOptions = {};

        if (typeof MediaRecorder.isTypeSupported === "function") {
            const supportedType = mimeTypes.find(type =>
                MediaRecorder.isTypeSupported(type)
            );

            if (supportedType) {
                recorderOptions.mimeType = supportedType;
            }
        }

        const recorder = new MediaRecorder(
            stream,
            recorderOptions
        );

        mediaRecorder = recorder;

        let recordingFailed = false;

        recorder.ondataavailable = event => {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        recorder.onerror = event => {
            recordingFailed = true;

            console.error(
                "MEDIA RECORDER ERROR:",
                event.error || event
            );

            addMessage(
                "Ձայնագրության ընթացքում սխալ առաջացավ։ Խնդրում եմ կրկին փորձիր։"
            );
        };

        recorder.onstop = async () => {
            const audioBlob = new Blob(recordedChunks, {
                type: recorder.mimeType || "audio/webm"
            });

            recordedChunks = [];

            stream.getTracks().forEach(track => track.stop());

            if (mediaRecorder === recorder) {
                mediaRecorder = null;
            }

            listening = false;

            if (voiceBtn) {
                voiceBtn.textContent = "🎤";
                voiceBtn.classList.remove("listening");
            }

            if (!recordingFailed && audioBlob.size > 0) {
                await sendAudioForTranscription(
                    audioBlob,
                    audioBlob.type
                );
            }
        };

        recorder.start();

        listening = true;

        if (voiceBtn) {
            voiceBtn.textContent = "⏹️";
            voiceBtn.classList.add("listening");
        }

    } catch (error) {
        console.error("START RECORDING ERROR:", error);

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        if (mediaRecorder) {
            mediaRecorder = null;
        }

        listening = false;

        if (voiceBtn) {
            voiceBtn.textContent = "🎤";
            voiceBtn.classList.remove("listening");
        }

        if (error.name === "NotAllowedError") {
            addMessage(
                "Խոսափողի օգտագործման թույլտվությունը մերժված է։ Խնդրում եմ թույլատրի՛ր այն։"
            );
        } else if (error.name === "NotFoundError") {
            addMessage(
                "Խոսափող չի հայտնաբերվել։"
            );
        } else if (error.name === "NotReadableError") {
            addMessage(
                "Խոսափողը հասանելի չէ։ Հնարավոր է՝ այն օգտագործվում է մեկ այլ ծրագրի կողմից։"
            );
        } else {
            addMessage(
                "Չհաջողվեց միացնել խոսափողը։ Խնդրում եմ կրկին փորձիր։"
            );
        }

    } finally {
        starting = false;
        micStartCancelled = false;
    }
}


// STOP LISTENING

function stopListening() {
    if (starting) {
        micStartCancelled = true;
    }

    listening = false;

    try {
        if (
            mediaRecorder &&
            mediaRecorder.state !== "inactive"
        ) {
            mediaRecorder.stop();
        }
    } catch (error) {
        console.error("STOP RECORDING ERROR:", error);
    }

    if (voiceBtn) {
        voiceBtn.textContent = "🎤";
        voiceBtn.classList.remove("listening");
    }
}


// ==========================================
// MICROPHONE BUTTON
// ==========================================

if (voiceBtn) {
    voiceBtn.type = "button";

    voiceBtn.addEventListener("click", () => {
        if (listening) {
            stopListening();
        } else {
            startListening();
        }
    });
}

// ==========================================


// TRANSCRIPTION

async function sendAudioForTranscription(blob, mimeType) {
    if (!blob || !blob.size) {
        addMessage("Ձայնագրությունը դատարկ է։ Խնդրում եմ կրկին փորձիր։");
        return;
    }

    const reader = new FileReader();

    reader.onloadend = async () => {
        try {
            if (reader.error) {
                throw new Error("Չհաջողվեց կարդալ ձայնագրության ֆայլը։");
            }

            if (typeof reader.result !== "string") {
                throw new Error("Ձայնագրության տվյալները սխալ են։");
            }

            const base64 = reader.result.split(",")[1];

            if (!base64) {
                throw new Error("Չհաջողվեց ստանալ ձայնագրության տվյալները։");
            }

            addMessage("ZENIX-ը մշակում է քո ձայնային հաղորդագրությունը... 🎧");

            const response = await fetch(API_URL + "/api/transcribe", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    audio: base64,
                    mimeType: mimeType || blob.type || "audio/webm"
                })
            });

            let data;

            try {
                data = await response.json();
            } catch {
                throw new Error("Սերվերը վերադարձրել է սխալ պատասխան։");
            }

            if (!response.ok) {
                throw new Error(
                    data.error || "Ձայնի մշակման ժամանակ սխալ առաջացավ։"
                );
            }

            if (
                typeof data.text !== "string" ||
                !data.text.trim()
            ) {
                throw new Error("Ձայնից խոսքը հնարավոր չեղավ ճանաչել։");
            }

            if (!input) {
                throw new Error("Մուտքագրման դաշտը հասանելի չէ։");
            }

            input.value = data.text.trim();

            await sendMessage();

        } catch (error) {
            console.error("TRANSCRIPTION ERROR:", error);

            const message = String(error.message || "").toLowerCase();

            if (
                message.includes("quota") ||
                message.includes("429") ||
                message.includes("resource_exhausted")
            ) {
                addMessage(
                    "ZENIX-ի ձայնային ծառայության օգտագործման սահմանաչափը ժամանակավորապես սպառվել է 💙 Խնդրում եմ փորձիր ավելի ուշ։"
                );
            } else {
                addMessage(
                    "Ձայնի մշակման ժամանակ սխալ առաջացավ։ Խնդրում եմ ստուգիր ինտերնետային կապը և կրկին փորձիր։"
                );
            }
        }
    };

    reader.onerror = () => {
        console.error("AUDIO FILE ERROR:", reader.error);

        addMessage(
            "Չհաջողվեց կարդալ ձայնագրության ֆայլը։ Խնդրում եմ կրկին փորձիր։"
        );
    };

    reader.readAsDataURL(blob);
}




// MICROPHONE BUTTON

if (voiceBtn) {
    voiceBtn.type = "button";

    voiceBtn.addEventListener("click", () => {
        if (listening) {
            stopListening();
        } else {
            startListening();
        }
    });
}


// ==========================================
// START ZENIX
// ==========================================

console.log("ZENIX CHAT CONNECTED! рџ’™");

waveRobot();


// ==========================================
// ZENIX PAGE NAVIGATION
// ==========================================

(function initZenixNavigation() {
    "use strict";

    const pages = {
        home: document.getElementById("homePage"),
        chats: document.getElementById("chatsPage"),
        favorites: document.getElementById("favoritesPage"),
        settings: document.getElementById("settingsPanel")
    };

    const titleKeys = {
        home: "interface.title",
        chats: "navigation.chats",
        favorites: "navigation.favorites",
        settings: "interface.settings"
    };

    const fallbackTitles = {
        home: "ФІХЎЦЂХ« ХЈХЎХ¬ХёЦ‚ХЅХї ZENIX",
        chats: "Ф¶ЦЂХёЦ‚ХµЦЃХ¶ХҐЦЂ",
        favorites: "ХЌХ«ЦЂХѕХЎХ®Х¶ХҐЦЂ",
        settings: "ФїХЎЦЂХЈХЎХѕХёЦЂХёЦ‚ХґХ¶ХҐЦЂ"
    };

    const title = document.getElementById("pageTitle");

    const buttons = document.querySelectorAll(
        ".sidebar nav button[data-page]"
    );

    let currentPage = "home";

    function updatePageTitle() {
        if (!title) return;

        const key = titleKeys[currentPage];

        const translated = window.ZENIX_T
            ? window.ZENIX_T(key, "")
            : "";

        title.textContent =
            translated || fallbackTitles[currentPage];
    }

    function openPage(name) {
        if (!pages[name]) return;

        currentPage = name;

        Object.entries(pages).forEach(([key, page]) => {
            if (!page) return;

            page.hidden = key !== name;
            page.classList.toggle("active", key === name);
        });

        buttons.forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.page === name
            );
        });

        updatePageTitle();

        try {
            sessionStorage.setItem("zenix_current_page", name);
        } catch (error) {
            console.warn("PAGE STORAGE ERROR:", error);
        }
    }

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            openPage(button.dataset.page);
        });
    });

    document.querySelectorAll(".back-home").forEach(button => {
        button.addEventListener("click", () => {
            openPage("home");
        });
    });

    openPage("home");

    window.ZENIX_NAVIGATION = {
        openPage,
        getCurrentPage: () => currentPage,
        updatePageTitle
    };

    console.log("ZENIX NAVIGATION CONNECTED рџ’™");
})();


// ==========================================
// ZENIX LANGUAGE SYSTEM
// ==========================================

(function initZenixLanguage() {
    "use strict";

    const languageSelect = document.getElementById("languageSelect");

    const LANGUAGE_STORAGE_KEY = "zenix_language";

    if (!languageSelect) {
        console.error("ZENIX LANGUAGE: languageSelect not found");
        return;
    }

    if (
        !window.ZENIX_LANGUAGE ||
        !window.ZENIX_TRANSLATIONS ||
        typeof window.ZENIX_T !== "function"
    ) {
        console.error("ZENIX LANGUAGE SYSTEM NOT LOADED");
        return;
    }

    function getSavedLanguage() {
        try {
            const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);

            return window.ZENIX_LANGUAGE.isSupportedLanguage(saved)
                ? saved
                : "hy";

        } catch (error) {
            console.warn("LANGUAGE STORAGE ERROR:", error);
            return "hy";
        }
    }

    function applyPageTranslations() {
        const translate = window.ZENIX_T;

        if (typeof translate !== "function") return;

        document.querySelectorAll("[data-i18n]").forEach(element => {
            const key = element.getAttribute("data-i18n");

            const translated = translate(key, "");

            if (translated) {
                element.textContent = translated;
            }
        });

        document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
            const key = element.getAttribute("data-i18n-placeholder");

            const translated = translate(key, "");

            if (translated) {
                element.placeholder = translated;
            }
        });

        document.querySelectorAll("[data-i18n-title]").forEach(element => {
            const key = element.getAttribute("data-i18n-title");

            const translated = translate(key, "");

            if (translated) {
                element.title = translated;
            }
        });

        document.documentElement.lang =
            window.ZENIX_LANGUAGE.getCurrentLanguage();

        const language = window.ZENIX_LANGUAGE.getLanguage();

        document.documentElement.dir =
            language?.direction || "ltr";

        window.ZENIX_NAVIGATION?.updatePageTitle();
    }

    function changeLanguage(code) {
        try {
            const language = window.ZENIX_LANGUAGE.setLanguage(code);

            languageSelect.value = code;

            try {
                localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
            } catch (error) {
                console.warn("LANGUAGE SAVE ERROR:", error);
            }

            applyPageTranslations();

            console.log("ZENIX LANGUAGE CHANGED:", language.name);

        } catch (error) {
            console.error("ZENIX LANGUAGE ERROR:", error);

            languageSelect.value =
                window.ZENIX_LANGUAGE.getCurrentLanguage();
        }
    }

    // RESTORE SAVED LANGUAGE

    const savedLanguage = getSavedLanguage();

    changeLanguage(savedLanguage);

    // LANGUAGE SELECTOR

    languageSelect.addEventListener("change", event => {
        changeLanguage(event.target.value);
    });

    // LANGUAGE CHANGE EVENT

    window.addEventListener(
        "zenix:languageChanged",
        applyPageTranslations
    );

    console.log("ZENIX LANGUAGE CONNECTED рџ’™");

})();
// ==========================================
// ZENIX MOBILE PANEL CONTROL
// Ф±ХѕХҐХ¬ХЎЦЃХ¶ХҐХ¬ cods.js-Х« ХЎХґХҐХ¶ХЎХѕХҐЦЂХ»ХёЦ‚Хґ
// ==========================================

(function initZenixMobilePanels() {
    "use strict";

    const menuBtn = document.getElementById("mobileMenuBtn");
    const statusBtn = document.getElementById("mobileStatusBtn");
    const overlay = document.getElementById("mobileOverlay");

    const sidebar = document.querySelector(".sidebar");
    const rightbar = document.querySelector(".rightbar");

    if (!menuBtn || !statusBtn || !overlay || !sidebar || !rightbar) {
        console.warn("ZENIX MOBILE PANELS: Required elements not found");
        return;
    }

    function closePanels() {
        document.body.classList.remove(
            "zenix-left-open",
            "zenix-right-open"
        );

        menuBtn.setAttribute("aria-expanded", "false");
        statusBtn.setAttribute("aria-expanded", "false");
        overlay.setAttribute("aria-hidden", "true");
    }

    function openLeftPanel() {
        closePanels();

        document.body.classList.add("zenix-left-open");

        menuBtn.setAttribute("aria-expanded", "true");
        overlay.setAttribute("aria-hidden", "false");
    }

    function openRightPanel() {
        closePanels();

        document.body.classList.add("zenix-right-open");

        statusBtn.setAttribute("aria-expanded", "true");
        overlay.setAttribute("aria-hidden", "false");
    }

    menuBtn.addEventListener("click", () => {
        const isOpen = document.body.classList.contains("zenix-left-open");

        if (isOpen) {
            closePanels();
        } else {
            openLeftPanel();
        }
    });

    statusBtn.addEventListener("click", () => {
        const isOpen = document.body.classList.contains("zenix-right-open");

        if (isOpen) {
            closePanels();
        } else {
            openRightPanel();
        }
    });

    overlay.addEventListener("click", closePanels);

    // Х„ХҐХ¶ХµХёЦ‚Х«ЦЃ Х§Х» ХЁХ¶ХїЦЂХҐХ¬ХёЦ‚ЦЃ Х°ХҐХїХё ЦѓХЎХЇХёЦ‚Хґ ХҐХ¶Ц„ ХѕХЎХ°ХЎХ¶ХЎХЇХЁ
    sidebar.addEventListener("click", event => {
        const pageButton = event.target.closest(
            "nav button[data-page]"
        );

        if (pageButton) {
            closePanels();
        }
    });

    // Х“ХЎХЇХёЦ‚Хґ ХҐХ¶Ц„ Escape ХЇХёХіХЎХЇХёХѕ
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closePanels();
        }
    });

    // ФµХ©ХҐ Х°ХҐХјХЎХ­ХёХЅХ«ЦЃ ХЎХ¶ЦЃХ¶ХёЦ‚Хґ ХҐХ¶Ц„ ХґХҐХ® Х§ХЇЦЂХЎХ¶, ЦѓХЎХЇХёЦ‚Хґ ХҐХ¶Ц„ ХѕХЎХ°ХЎХ¶ХЎХЇХ¶ХҐЦЂХЁ
    window.addEventListener("resize", () => {
        if (window.innerWidth > 750) {
            closePanels();
        }
    });

    console.log("ZENIX MOBILE PANELS CONNECTED рџ’™");

})();



/* =====================================================
   ZENIX AI — COMPLETE SERVER
   Unified Memory + Gemini + Google News
===================================================== */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");

const app = express();

app.use(express.json());

const { AsyncLocalStorage } = require("async_hooks");

const memoryStorage = new AsyncLocalStorage();
const dotenv = require("dotenv");
dotenv.config({ override: true });

const PORT = process.env.PORT || 3000;

const MEMORY_DIR = path.resolve(
    process.env.MEMORY_DIR || __dirname
);

const DEFAULT_MEMORY_FILE = path.join(MEMORY_DIR, "memory.json");


function getMemoryPaths() {
    const store = memoryStorage.getStore();
    const userId = store?.userId;

    // Հիշողության գործողություններն առանց
    // օգտատիրոջ կոնտեքստի արգելված են։
    if (
        typeof userId !== "string" ||
        !/^USER_\d{3,}$/.test(userId)
    ) {
        throw new Error(
            "USER_MEMORY_CONTEXT_REQUIRED"
        );
    }

    const directory = path.join(
        USERS_DIR,
        userId
    );

    const file = path.join(
        directory,
        "memory.json"
    );

    return {
        directory,
        file,
        temp: file + ".tmp",
        backup: file + ".backup"
    };
}
// ==========================================
// ZENIX USER CHAT HISTORY SYSTEM
// ==========================================

function getHistoryPaths() {
    const store = memoryStorage.getStore();
    const userId = store?.userId;

    if (
        typeof userId !== "string" ||
        !/^USER_\d{3,}$/.test(userId)
    ) {
        throw new Error("USER_HISTORY_CONTEXT_REQUIRED");
    }

    const directory = path.join(USERS_DIR, userId);

    return {
        directory,
        file: path.join(directory, "history.json"),
        temp: path.join(directory, "history.json.tmp")
    };
}

// ==========================================
// LOAD USER HISTORY
// ==========================================

function loadUserHistory() {
    try {
        const paths = getHistoryPaths();

        if (!fs.existsSync(paths.file)) {
            fs.writeFileSync(
                paths.file,
                "[]",
                "utf8"
            );

            return [];
        }

        const history = JSON.parse(
            fs.readFileSync(paths.file, "utf8")
        );

        return Array.isArray(history) ? history : [];

    } catch (error) {
        console.error(
            "ZENIX HISTORY LOAD ERROR:",
            error.message
        );

        throw error;
    }
}


// ==========================================
// SAVE USER HISTORY
// ==========================================
function saveUserHistory(history) {
    try {
        if (!Array.isArray(history)) {
            throw new Error("INVALID_HISTORY");
        }

        const paths = getHistoryPaths();

        const safeHistory = history
            .filter(item =>
                item &&
                ["user", "assistant"].includes(item.role) &&
                typeof item.text === "string"
            )
            .slice(-500);

        fs.mkdirSync(paths.directory, {
            recursive: true
        });

        fs.writeFileSync(
            paths.temp,
            JSON.stringify(safeHistory, null, 4),
            "utf8"
        );

        fs.renameSync(
            paths.temp,
            paths.file
        );

        return true;

    } catch (error) {
        console.error(
            "ZENIX HISTORY SAVE ERROR:",
            error.message
        );

        return false;
    }
}
 // ==========================================
// ZENIX CHAT ID GENERATOR
// ==========================================

function makeChatId() {
    return crypto.randomUUID();
}

// ==========================================
// ZENIX MULTI CHAT STORAGE
// ==========================================

function getUserChatsPaths() {
    const store = memoryStorage.getStore();
    const userId = store?.userId;

    if (
        typeof userId !== "string" ||
        !/^USER_\d{3,}$/.test(userId)
    ) {
        throw new Error("USER_CHAT_CONTEXT_REQUIRED");
    }

    const userDirectory = path.join(USERS_DIR, userId);
    const chatsDirectory = path.join(userDirectory, "chats");

    return {
        userDirectory,
        chatsDirectory,
        listFile: path.join(userDirectory, "chats.json")
    };
}

 // ==========================================
// ZENIX LOAD USER CHATS
// ==========================================

function loadUserChats() {
    try {
        const paths = getUserChatsPaths();

        fs.mkdirSync(paths.userDirectory, {
            recursive: true
        });

        fs.mkdirSync(paths.chatsDirectory, {
            recursive: true
        });

        if (!fs.existsSync(paths.listFile)) {
            fs.writeFileSync(
                paths.listFile,
                "[]",
                "utf8"
            );

            return [];
        }

        const chats = JSON.parse(
            fs.readFileSync(paths.listFile, "utf8")
        );

        return Array.isArray(chats) ? chats : [];

    } catch (error) {
        console.error(
            "ZENIX CHATS LOAD ERROR:",
            error.message
        );

        throw error;
    }
}


// ==========================================
// ZENIX SAVE USER CHATS
// ==========================================

function saveUserChats(chats) {
    try {
        if (!Array.isArray(chats)) {
            throw new Error("INVALID_CHATS");
        }

        const paths = getUserChatsPaths();

        fs.mkdirSync(paths.userDirectory, {
            recursive: true
        });

        const safeChats = chats
            .filter(chat =>
                chat &&
                typeof chat.id === "string" &&
                /^[A-Za-z0-9_-]{8,64}$/.test(chat.id) &&
                typeof chat.title === "string"
            )
            .map(chat => ({
                id: chat.id,
                title: chat.title.slice(0, 100),
                createdAt: chat.createdAt || new Date().toISOString(),
                updatedAt: chat.updatedAt || new Date().toISOString()
            }));

        const tempFile = paths.listFile + ".tmp";

        fs.writeFileSync(
            tempFile,
            JSON.stringify(safeChats, null, 4),
            "utf8"
        );

        fs.renameSync(
            tempFile,
            paths.listFile
        );

        return true;

    } catch (error) {
        console.error(
            "ZENIX CHATS SAVE ERROR:",
            error.message
        );

        return false;
    }
}

const GEMINI_MODEL =
    process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const GEMINI_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    GEMINI_MODEL +
    ":generateContent?key=";


const allowedOrigins = [
    "https://dawwwwo20.github.io",
    "https://zenixorg.onrender.com"
];

app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
    }

    res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
    );

    res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );

    res.header("Vary", "Origin");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});


app.use(express.json({ limit: "15mb" }));

/* =====================================================
   ZENIX AUTHENTICATION
===================================================== */

const AUTH_SECRET = process.env.ZENIX_AUTH_SECRET;

if (!AUTH_SECRET || AUTH_SECRET.length < 32) {
    throw new Error("ZENIX_AUTH_SECRET is missing or too short");
}

const AUTH_TOKEN_LIFETIME = 7 * 24 * 60 * 60 * 1000;

const USERS_DIR = path.join(MEMORY_DIR, "users");
const USERS_FILE = path.join(MEMORY_DIR, "users.json");
function initializeMemoryStorage() {
    fs.mkdirSync(MEMORY_DIR, {
        recursive: true
    });

    const oldUsersFile = path.join(
        __dirname,
        "users.json"
    );

    const oldUsersDirectory = path.join(
        __dirname,
        "users"
    );

    // Հին users.json-ի տեղափոխում՝ եթե նորում չկա
    if (
        path.resolve(oldUsersFile) !==
            path.resolve(USERS_FILE) &&
        fs.existsSync(oldUsersFile) &&
        !fs.existsSync(USERS_FILE)
    ) {
        fs.copyFileSync(
            oldUsersFile,
            USERS_FILE
        );

        console.log("ZENIX USERS DATABASE MIGRATED!");
    }

    // Հին օգտատերերի պանակների տեղափոխում
    if (
        path.resolve(oldUsersDirectory) !==
            path.resolve(USERS_DIR) &&
        fs.existsSync(oldUsersDirectory)
    ) {
        fs.mkdirSync(USERS_DIR, {
            recursive: true
        });

        const entries = fs.readdirSync(
            oldUsersDirectory,
            { withFileTypes: true }
        );

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const oldPath = path.join(
                oldUsersDirectory,
                entry.name
            );

            const newPath = path.join(
                USERS_DIR,
                entry.name
            );

            // Գոյություն ունեցող նոր տվյալները չենք վերագրում
            if (!fs.existsSync(newPath)) {
                fs.cpSync(oldPath, newPath, {
                    recursive: true
                });

                console.log(
                    "ZENIX USER DATA MIGRATED:",
                    entry.name
                );
            }
        }
    }

    console.log(
        "ZENIX PERSISTENT STORAGE:",
        MEMORY_DIR
    );
}
initializeMemoryStorage();
fs.mkdirSync(MEMORY_DIR, {
    recursive: true
});
function loadUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            fs.writeFileSync(
                USERS_FILE,
                "[]",
                "utf8"
            );
        }

        const users = JSON.parse(
            fs.readFileSync(USERS_FILE, "utf8")
        );

        return Array.isArray(users) ? users : [];

    } catch (error) {
        console.error("USERS LOAD ERROR:", error.message);
        throw new Error("USERS_DATABASE_ERROR");
    }
}

function saveUsers(users) {
    const tempFile = USERS_FILE + ".tmp";

    try {
        fs.writeFileSync(
            tempFile,
            JSON.stringify(users, null, 4),
            "utf8"
        );

        JSON.parse(fs.readFileSync(tempFile, "utf8"));

        fs.renameSync(tempFile, USERS_FILE);

        return true;

    } catch (error) {
        console.error("USERS SAVE ERROR:", error.message);
        return false;

    } finally {
        try {
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        } catch {}
    }
}


function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");

    const hash = crypto.scryptSync(
        password,
        salt,
        64
    ).toString("hex");

    return {
        passwordSalt: salt,
        passwordHash: hash
    };
}

function verifyPassword(password, user) {
    try {
        if (
            typeof password !== "string" ||
            !user?.passwordSalt ||
            !user?.passwordHash
        ) {
            return false;
        }

        const hash = crypto.scryptSync(
            password,
            user.passwordSalt,
            64
        );

        const storedHash = Buffer.from(
            user.passwordHash,
            "hex"
        );

        return (
            storedHash.length === hash.length &&
            crypto.timingSafeEqual(hash, storedHash)
        );

    } catch {
        return false;
    }
}

  
function createNewUser(name, email, password) {
    fs.mkdirSync(USERS_DIR, { recursive: true });

    const users = loadUsers();

    const normalizedEmail = email.trim().toLowerCase();

    // Կրկնակի էլեկտրոնային փոստի արգելում
    const emailExists = users.some(
        user =>
            typeof user.email === "string" &&
            user.email.toLowerCase() === normalizedEmail
    );

    if (emailExists) {
        throw new Error("EMAIL_ALREADY_REGISTERED");
    }

    const numbers = users.map(user => {
        const match = /^USER_(\d+)$/.exec(user.id || "");
        return match ? Number(match[1]) : 0;
    });

    const nextNumber = Math.max(0, ...numbers) + 1;

    const userId = "USER_" +
        String(nextNumber).padStart(3, "0");

    const userDirectory = path.join(USERS_DIR, userId);

    // Օգտագործում ենք առկա պանակը, եթե այն արդեն կա։
    fs.mkdirSync(userDirectory, {
        recursive: true
    });

    const memoryFile = path.join(
        userDirectory,
        "memory.json"
    );

    const backupFile = memoryFile + ".backup";

    const historyFile = path.join(
        userDirectory,
        "history.json"
    );

    const emptyMemory = {
        facts: [],
        preferences: [],
        interests: [],
        devices: [],
        goals: [],
        projects: [],
        games: [],
        tasks: [],
        user_name: name.trim(),
        youtube_channel: "",
        pending_memory: null
    };

    // Ստեղծում ենք հիշողությունը միայն այն դեպքում,
    // երբ ֆայլը գոյություն չունի։
    if (!fs.existsSync(memoryFile)) {
        fs.writeFileSync(
            memoryFile,
            JSON.stringify(emptyMemory, null, 4),
            "utf8"
        );
    } else {
        JSON.parse(fs.readFileSync(memoryFile, "utf8"));
    }

    // Ստեղծում ենք backup միայն բացակայության դեպքում։
    if (!fs.existsSync(backupFile)) {
        fs.copyFileSync(memoryFile, backupFile);
    } else {
        JSON.parse(fs.readFileSync(backupFile, "utf8"));
    }

    // Պատմությունը նույնպես չենք վերագրում։
    if (!fs.existsSync(historyFile)) {
        fs.writeFileSync(historyFile, "[]", "utf8");
    } else {
        JSON.parse(fs.readFileSync(historyFile, "utf8"));
    }

    const credentials = hashPassword(password);

    const user = {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        ...credentials,
        createdAt: new Date().toISOString()
    };

    users.push(user);

    if (!saveUsers(users)) {
        throw new Error("USERS_DATABASE_SAVE_FAILED");
    }

    console.log("NEW ZENIX USER:", userId);

    return user;
}


function createAuthToken(userId) {
    const payload = {
        userId,
        expiresAt: Date.now() + AUTH_TOKEN_LIFETIME
    };

    const encoded = Buffer
        .from(JSON.stringify(payload))
        .toString("base64url");

    const signature = crypto
        .createHmac("sha256", AUTH_SECRET)
        .update(encoded)
        .digest("base64url");

    return `${encoded}.${signature}`;
}

function verifyAuthToken(token) {
    try {
        if (typeof token !== "string") return null;

        const parts = token.split(".");
        if (parts.length !== 2) return null;

        const [encoded, signature] = parts;

        const expected = crypto
            .createHmac("sha256", AUTH_SECRET)
            .update(encoded)
            .digest();

        const received = Buffer.from(signature, "base64url");

        if (
            received.length !== expected.length ||
            !crypto.timingSafeEqual(received, expected)
        ) {
            return null;
        }

        const payload = JSON.parse(
            Buffer.from(encoded, "base64url").toString("utf8")
        );

        if (
            !payload ||
            typeof payload.userId !== "string" ||
            !/^USER_[A-Z0-9_-]{1,40}$/.test(payload.userId) ||
            !Number.isFinite(payload.expiresAt) ||
            payload.expiresAt <= Date.now()
        ) {
            return null;
        }

        return {
            userId: payload.userId
        };

    } catch {
        return null;
    }
}

function requireAuth(req, res, next) {
    const authorization = req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "AUTH_REQUIRED"
        });
    }

    const token = authorization.slice(7);
    const user = verifyAuthToken(token);

    if (!user) {
        return res.status(401).json({
            error: "INVALID_AUTH_TOKEN"
        });
    }

    req.user = user;

    next();
}

function userMemoryContext(req, res, next) {
    try {
        const userId = req.user?.userId;

        if (
            typeof userId !== "string" ||
            !/^USER_\d{3,}$/.test(userId)
        ) {
            return res.status(403).json({
                error: "INVALID_USER_ID"
            });
        }

        const users = loadUsers();

        const registeredUser = users.some(
            user => user.id === userId
        );

        if (!registeredUser) {
            return res.status(403).json({
                error: "USER_NOT_REGISTERED"
            });
        }

        const userDirectory = path.join(
            USERS_DIR,
            userId
        );

        const memoryFile = path.join(
            userDirectory,
            "memory.json"
        );

        const backupFile = memoryFile + ".backup";

        if (
            !fs.existsSync(userDirectory) ||
            (
                !fs.existsSync(memoryFile) &&
                !fs.existsSync(backupFile)
            )
        ) {
            console.error(
                "USER MEMORY FILES MISSING:",
                userId
            );

            return res.status(500).json({
                error: "USER_MEMORY_FILES_MISSING"
            });
        }

        memoryStorage.run(
            { userId },
            () => next()
        );

    } catch (error) {
        console.error(
            "USER MEMORY CONTEXT ERROR:",
            error.message
        );

        return res.status(500).json({
            error: "USER_MEMORY_CONTEXT_FAILED"
        });
    }
}
/* =====================================================
   AUTOMATIC USER REGISTRATION
===================================================== */


/* =====================================================
   ZENIX USER AUTHENTICATION API
===================================================== */

// ՆՈՐ ՕԳՏԱՏԻՐՈՋ ԳՐԱՆՑՈՒՄ

// ==========================================
// ZENIX — CHAT HISTORY SYSTEM
// ==========================================

function getUserHistoryFile(userId) {
    if (!/^USER_\d+$/.test(userId)) {
        throw new Error("INVALID_USER_ID");
    }

    const userDirectory = path.join(USERS_DIR, userId);

    if (!fs.existsSync(userDirectory)) {
        throw new Error("USER_DIRECTORY_NOT_FOUND");
    }

    return path.join(userDirectory, "history.json");
}

// Կարդալ օգտատիրոջ զրույցների պատմությունը
function loadUserHistory(userId) {
    const historyFile = getUserHistoryFile(userId);

    if (!fs.existsSync(historyFile)) {
        fs.writeFileSync(historyFile, "[]", "utf8");
    }

    const history = JSON.parse(
        fs.readFileSync(historyFile, "utf8")
    );

    if (!Array.isArray(history)) {
        throw new Error("INVALID_HISTORY_FILE");
    }

    return history;
}



// Պահպանել օգտատիրոջ զրույցների պատմությունը
function saveUserHistory(userId, history) {
    if (!Array.isArray(history)) {
        throw new Error("INVALID_HISTORY_DATA");
    }

    const historyFile = getUserHistoryFile(userId);

    const tempFile = historyFile + ".tmp";

    fs.writeFileSync(
        tempFile,
        JSON.stringify(history, null, 4),
        "utf8"
    );

    fs.renameSync(tempFile, historyFile);

    return true;
}

app.post("/api/register", (req, res) => {
    try {
        const { name, email, password } = req.body || {};

        // Ստուգում ենք պարտադիր դաշտերը
        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                success: false,
                error: "ALL_FIELDS_REQUIRED"
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanName.length < 2 || cleanName.length > 50) {
            return res.status(400).json({
                success: false,
                error: "INVALID_NAME"
            });
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
        ) {
            return res.status(400).json({
                success: false,
                error: "INVALID_EMAIL"
            });
        }

        if (password.length < 8 || password.length > 128) {
            return res.status(400).json({
                success: false,
                error: "INVALID_PASSWORD"
            });
        }

        // Ստեղծում ենք նոր օգտատիրոջը
        const user = createNewUser(
            cleanName,
            cleanEmail,
            password
        );

        // Ստեղծում ենք նրա անձնական Token-ը
        const token = createAuthToken(user.id);

        return res.status(201).json({
            success: true,
            userId: user.id,
            name: user.name,
            token
        });

    } catch (error) {
        console.error(
            "USER REGISTRATION ERROR:",
            error.message
        );

        if (error.message === "EMAIL_ALREADY_REGISTERED") {
            return res.status(409).json({
                success: false,
                error: "EMAIL_ALREADY_REGISTERED"
            });
        }

        return res.status(500).json({
            success: false,
            error: "REGISTRATION_FAILED"
        });
    }
});

// ԳՈՐԾՈՂ ՕԳՏԱՏԻՐՈՋ ՄՈՒՏՔ
app.post("/api/login", (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                error: "EMAIL_AND_PASSWORD_REQUIRED"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const users = loadUsers();

        const user = users.find(
            item =>
                typeof item.email === "string" &&
                item.email.toLowerCase() === normalizedEmail
        );

        if (!user || !verifyPassword(password, user)) {
            return res.status(401).json({
                success: false,
                error: "INVALID_CREDENTIALS"
            });
        }

        const token = createAuthToken(user.id);

        return res.status(200).json({
            success: true,
            userId: user.id,
            name: user.name,
            token
        });

    } catch (error) {
        console.error(
            "USER LOGIN ERROR:",
            error.message
        );

        return res.status(500).json({
            success: false,
            error: "LOGIN_FAILED"
        });
    }
});

// Պաշտպանում ենք անձնական հիշողության ֆայլերը հանրային հասանելիությունից։


/* =====================================================
   ZENIX SECURITY — PRIVATE FILE PROTECTION
===================================================== */

app.use((req, res, next) => {
    const privatePaths = [
        // Անհատական հիշողություն
        /^\/memory\.json(?:\.tmp|\.backup)?$/i,
        /^\/memory_users(?:\/|$)/i,
        /^\/users(?:\/|$)/i,
        /^\/legacy(?:\/|$)/i,

        // Օգտատերերի տվյալներ և Token-ներ
        /^\/users\.json$/i,
        /^\/[^/]*token[^/]*\.txt$/i,

        // Պահուստային պանակներ
        /^\/SAFE_BACKUP[^/]*(?:\/|$)/i,
        /^\/users-full-backup[^/]*(?:\/|$)/i,
        /^\/backup[^/]*(?:\/|$)/i,

        // Սերվերի գաղտնի ֆայլեր
        /^\/server\.js$/i,
        /^\/\.env(?:\..*)?$/i,
        /^\/\.git(?:\/|$)/i
    ];

    if (privatePaths.some(pattern => pattern.test(req.path))) {
        return res.sendStatus(404);
    }

    next();
});

// Միայն մեկ հանրային ստատիկ սերվեր
app.use(express.static(__dirname));

/* =====================================================
   LANGUAGE
===================================================== */


function reply(armenian, russian, english, language = "Armenian") {
    const lang = String(language || "").toLowerCase();

    if (lang.startsWith("ru") || lang.startsWith("russian")) {
        return russian;
    }

    if (lang.startsWith("en") || lang.startsWith("english")) {
        return english;
    }

    return armenian;
}

/* =====================================================
   MEMORY STRUCTURE
===================================================== */

function armenianTransliterate(value) {
    let text = String(value || "").normalize("NFC").trim();

    const dictionary = {
          im: "իմ",
        du: "դու",
        qo: "քո",
        sireli: "սիրելի",
        sirac: "սիրած",

        hishir: "հիշիր",
        hishum: "հիշում",
        sirum: "սիրում",
        xaghy: "խաղը",
        xagh: "խաղ",
        guyny: "գույնը",
        guyn: "գույն",
        kapuyt: "կապույտ",
        sev: "սև",
        karmir: "կարմիր",
        deghin: "դեղին",
        kanach: "կանաչ",

        mirg: "միրգ",
        mirgy: "միրգը",
        banan: "բանան",
        xndzor: "խնձոր",

        meqena: "մեքենա",
        meqenan: "մեքենան",
        kendani: "կենդանի",
        katu: "կատու",
        shun: "շուն",

        sport: "սպորտ",
        sportadze: "սպորտաձև",
        sportadzev: "սպորտաձև",
        box: "բոքս",
        futbol: "ֆուտբոլ",

        ashun: "աշուն",
        ashuny: "աշունը",

        e: "է",
        em: "եմ",
        es: "ես",
        en: "են",
        chi: "չի",
        che: "չէ",
        inch: "ինչ",
        vor: "որ"
    };

    const map = {
        sh: "շ",
        ch: "չ",
        ts: "ց",
        dz: "ձ",
        gh: "ղ",
        kh: "խ",
        zh: "ժ",
        ph: "փ",
        jh: "ժ",
        ju: "յու",
        yo: "յո",
        ye: "յե",
        ev: "և",

        a: "ա",
        b: "բ",
        g: "գ",
        d: "դ",
        e: "ե",
        z: "զ",
        i: "ի",
        l: "լ",
        x: "խ",
        c: "ծ",
        k: "կ",
        h: "հ",
        m: "մ",
        y: "յ",
        n: "ն",
        o: "ո",
        p: "պ",
        j: "ջ",
        r: "ր",
        s: "ս",
        v: "վ",
        t: "տ",
        u: "ու",
        f: "ֆ",
        q: "ք",
        w: "վ"
    };

    const keys = Object.keys(map)
        .sort((a, b) => b.length - a.length);

    return text.replace(/[a-z]+/gi, word => {
        const lower = word.toLowerCase();

        if (dictionary[lower]) {
            return dictionary[lower];
        }

        let result = "";

        for (let i = 0; i < lower.length;) {
            const key = keys.find(k => lower.startsWith(k, i));

            if (key) {
                result += map[key];
                i += key.length;
            } else {
                result += lower[i++];
            }
        }

        return result;
    });
}


function normalizePreferenceItem(item) {
    const original = String(item || "").trim();

    if (!original) return "";

    if (original.includes(":")) {
        const parts = original.split(":");
        const category = normalizePreferenceCategory(parts.shift());
        const value = parts.join(":").trim();

        if (!category || !value) return original;

        return `${category}: ${value}`;
    }

    const match = original.match(
        /^(?:իմ\s+)?սիրելի\s+(միրգյ?|մրգ|սպորտաձև|սպորտաձեվ|սպորտ|կենդանի|կենդանին|մեքենա|գույն)\s*(?:՝|:|-)?\s*(.+?)\s+է$/iu
    );

    if (!match) return original;

    const category = normalizePreferenceCategory(match[1]);
    let value = match[2].trim();

    if (category === "կենդանի") {
        value = value.replace(/ն$/u, "");
    }

    if (category === "միրգ") {
        value = value.replace(/ը$/u, "");
    }

    if (!category || !value) return original;

    return `${category}: ${value}`;
}



function normalizeText(value) {
    return armenianTransliterate(String(value || ""))
        .toLowerCase()
        .normalize("NFC")
        .replace(/[։.,!?՝'"]/gu, "")
        .replace(/\s+/gu, " ")
        .trim();
}


/* =====================================================
   MEMORY DIRECTORY
===================================================== */

/* =====================================================
   MEMORY DIRECTORY
===================================================== */
function createMemoryBackup() {
    const paths = getMemoryPaths();

    try {
        fs.mkdirSync(paths.directory, { recursive: true });

        if (!fs.existsSync(paths.file)) return true;

        const current = fs.readFileSync(paths.file, "utf8");
        JSON.parse(current);

        fs.copyFileSync(paths.file, paths.backup);

        return true;

    } catch (error) {
        console.error("MEMORY BACKUP ERROR:", error.message);
        return false;
    }
}

/* =====================================================
   MEMORY BACKUP
===================================================== */

/* =====================================================
   SAVE MEMORY
===================================================== */

function ensureMemoryDirectory() {
    try {
        fs.mkdirSync(MEMORY_DIR, {
            recursive: true
        });

        return fs.statSync(MEMORY_DIR).isDirectory();
    } catch (error) {
        console.error(
            "MEMORY DIRECTORY ERROR:",
            error.message
        );

        return false;
    }
}









/* =====================================================
   MEMORY DIRECTORY
===================================================== */



/* =====================================================
   MEMORY DIRECTORY
===================================================== */
function createMemoryBackup() {
    const paths = getMemoryPaths();

    try {
        fs.mkdirSync(paths.directory, { recursive: true });

        if (!fs.existsSync(paths.file)) return true;

        const current = fs.readFileSync(paths.file, "utf8");
        JSON.parse(current);

        fs.copyFileSync(paths.file, paths.backup);

        return true;

    } catch (error) {
        console.error("MEMORY BACKUP ERROR:", error.message);
        return false;
    }
}


/* =====================================================
   MEMORY BACKUP
===================================================== */



/* =====================================================
   SAVE MEMORY
===================================================== */

function ensureMemoryDirectory() {
    try {
        fs.mkdirSync(MEMORY_DIR, {
            recursive: true
        });

        return fs.statSync(MEMORY_DIR).isDirectory();
    } catch (error) {
        console.error(
            "MEMORY DIRECTORY ERROR:",
            error.message
        );

        return false;
    }
}

function saveMemory(memory) {
  
    const paths = getMemoryPaths();



    let savedSuccessfully = false;

    try {
        fs.mkdirSync(paths.directory, { recursive: true });

        const safeMemory = normalizeMemory(memory);

        const memoryJSON = JSON.stringify(
            safeMemory,
            null,
            4
        );

        // Ժամանակավոր ֆայլի պահպանում
        fs.writeFileSync(
            paths.temp,
            memoryJSON,
            "utf8"
        );

        // Ստուգում ենք JSON-ը
        const verifiedMemory = JSON.parse(
            fs.readFileSync(paths.temp, "utf8")
        );

        if (
            !verifiedMemory ||
            typeof verifiedMemory !== "object" ||
            Array.isArray(verifiedMemory)
        ) {
            throw new Error("INVALID MEMORY JSON");
        }

        // Փոխարինում ենք հիմնական ֆայլը
        fs.renameSync(
            paths.temp,
            paths.file
        );

        savedSuccessfully = true;

        console.log("ZENIX MEMORY SAVED!");

        console.log(
            "ZENIX PREFERENCES:",
            safeMemory.preferences
        );

        // Backup-ի թարմացում
        try {
            fs.copyFileSync(
                paths.file,
                paths.backup
            );

            console.log("ZENIX BACKUP UPDATED!");

        } catch (backupError) {
            console.error(
                "BACKUP UPDATE WARNING:",
                backupError.message
            );
        }

        return true;

    } catch (error) {
        console.error(
            "MEMORY SAVE ERROR:",
            error.message
        );

        return savedSuccessfully;

    } finally {
        try {
            if (fs.existsSync(paths.temp)) {
                fs.unlinkSync(paths.temp);
            }
        } catch {}
    }
}




function removeMemoryItem(
    memory,
    collection,
    value
) {
    const allowedCollections = [
        "facts",
        "preferences",
        "interests",
        "devices",
        "goals",
        "projects",
        "games",
        "tasks"
    ];

    if (
        !memory ||
        !allowedCollections.includes(collection) ||
        !Array.isArray(memory[collection])
    ) {
        return false;
    }

    const normalizeItem = item => {
        if (collection === "games") {
            return normalizeText(normalizeGame(item));
        }

        if (collection === "preferences") {
            return normalizeText(normalizePreferenceItem(item));
        }

        return normalizeText(item);
    };

    const target = normalizeItem(value);

    if (!target) return false;

    const oldLength = memory[collection].length;

    memory[collection] = memory[collection].filter(
        item => normalizeItem(item) !== target
    );

    if (memory[collection].length === oldLength) {
        return "not_found";
    }

    const saved = saveMemory(memory);

    if (!saved) {
        return false;
    }

    console.log(
        "ZENIX MEMORY REMOVED:",
        collection,
        value
    );

    return true;
}



/* =====================================================
   LOAD MEMORY
===================================================== */


function loadMemory() {
    const paths = getMemoryPaths();

    const empty = normalizeMemory({});

    try {
        fs.mkdirSync(paths.directory, { recursive: true });

        // 1. Ստուգում ենք հիմնական հիշողությունը
        if (fs.existsSync(paths.file)) {
            try {
                const raw = JSON.parse(
                    fs.readFileSync(paths.file, "utf8")
                );

                if (
                    !raw ||
                    typeof raw !== "object" ||
                    Array.isArray(raw)
                ) {
                    throw new Error("INVALID MAIN MEMORY");
                }

                const memory = normalizeMemory(raw);

                console.log("ZENIX MEMORY LOADED!");

                // Backup-ի թարմացում
                try {
                    fs.copyFileSync(
                        paths.file,
                        paths.backup
                    );

                    console.log("ZENIX BACKUP UPDATED!");

                } catch (error) {
                    console.error(
                        "BACKUP UPDATE WARNING:",
                        error.message
                    );
                }

                return memory;

            } catch (error) {
                console.error(
                    "MAIN MEMORY LOAD ERROR:",
                    error.message
                );
            }
        }

        // 2. Փորձում ենք վերականգնել Backup-ից
        if (fs.existsSync(paths.backup)) {
            try {
                const backup = JSON.parse(
                    fs.readFileSync(
                        paths.backup,
                        "utf8"
                    )
                );

                if (
                    !backup ||
                    typeof backup !== "object" ||
                    Array.isArray(backup)
                ) {
                    throw new Error("INVALID BACKUP MEMORY");
                }

                const restored = normalizeMemory(backup);

                // Վերականգնում ենք հիմնական ֆայլը
                if (!saveMemory(restored)) {
                    console.error(
                        "MEMORY BACKUP RESTORE FAILED"
                    );
                } else {
                    console.log(
                        "MEMORY RESTORED FROM BACKUP"
                    );
                }

                return restored;

            } catch (error) {
                console.error(
                    "BACKUP LOAD ERROR:",
                    error.message
                );
            }
        }

        // 3. Երկու ֆայլերն էլ օգտագործելի չեն
        console.error(
            "NO VALID MEMORY OR BACKUP FOUND"
        );

        return empty;

    } catch (error) {
        console.error(
            "MEMORY LOAD ERROR:",
            error.message
        );

        return empty;
    }
}







/* =====================================================
   SECURITY
===================================================== */

const SENSITIVE_PATTERN =
    /password|api[\s_-]*key|secret|token|գաղտնաբառ|пароль|գաղտնիք/i;

function isSensitiveMemory(value) {
    return SENSITIVE_PATTERN.test(String(value || ""));
}

/* =====================================================
   MEMORY ITEM
===================================================== */

function normalizeTaskKey(value) {
    return normalizeText(value)
        .replace(/\b(?:պետք է|պիտի|անհրաժեշտ է|հիշեցրու|հիշեցնել|հիշիր)\b/gu, " ")
        .replace(/\b(?:վաղը|այսօր|մյուս օրը)\b/gu, " ")
        .replace(/\s+/gu, " ")
        .trim();
}
function addMemoryItem(
    memory,
    collection,
    value,
    oldValue = null
) {
    const allowedCollections = [
        "facts",
        "preferences",
        "interests",
        "devices",
        "goals",
        "projects",
        "games",
        "tasks"
    ];

    // Բաժնի ստուգում
    if (!allowedCollections.includes(collection)) {
        console.error(
            "ZENIX MEMORY: Invalid collection:",
            collection
        );
        return false;
    }

    if (!Array.isArray(memory[collection])) {
        memory[collection] = [];
    }

    let cleanValue = String(value ?? "").trim();

    if (!cleanValue || isSensitiveMemory(cleanValue)) {
        return false;
    }

    // Նախասիրությունների միասնական ձևաչափ
    if (collection === "preferences") {
        cleanValue = normalizePreferenceItem(cleanValue);
    }

const normalized = collection === "tasks"
    ? normalizeTaskKey(cleanValue)
    : normalizeText(cleanValue);
    if (!normalized) return false;

    // Հին արժեքի հեռացում
    if (oldValue) {
        let oldNormalized = normalizeText(oldValue);

        if (collection === "preferences") {
            oldNormalized = normalizeText(
                normalizePreferenceItem(oldValue)
            );
        }

        memory[collection] = memory[collection].filter(item => {
            let itemNormalized = normalizeText(item);

            if (collection === "preferences") {
                itemNormalized = normalizeText(
                    normalizePreferenceItem(item)
                );
            }

            return itemNormalized !== oldNormalized;
        });
    }

    // Կրկնությունների ստուգում
    const exists = memory[collection].some(item => {
       let itemNormalized = collection === "tasks"
    ? normalizeTaskKey(item)
    : normalizeText(item);
        if (collection === "preferences") {
            itemNormalized = normalizeText(
                normalizePreferenceItem(item)
            );
        }

        return itemNormalized === normalized;
    });

    if (exists) return "exists";

    memory[collection].push(cleanValue);

    return true;
}


/* =====================================================
   PREFERENCE CATEGORY
===================================================== */


function normalizePreferenceItem(item) {
    const original = String(item || "").trim();

    if (!original) return "";

    if (original.includes(":")) {
        const parts = original.split(":");
        const category = normalizePreferenceCategory(
            parts.shift()
        );
        const value = parts.join(":").trim();

        if (!category || !value) return original;

        return `${category}: ${value}`;
    }

    const match = original.match(
        /^(?:իմ\s+)?սիրելի\s+(միրգյ?|մրգ|սպորտաձև|սպորտաձեվ|սպորտ|կենդանի|կենդանին|մեքենա|գույն)\s*(?:՝|:|-)?\s*(.+?)\s+է$/iu
    );

    if (!match) return original;

    const category = normalizePreferenceCategory(
        match[1]
    );

    let value = match[2].trim();

    if (category === "կենդանի") {
        value = value.replace(/ն$/u, "");
    }

    if (category === "միրգ") {
        value = value.replace(/ը$/u, "");
    }

    if (!category || !value) return original;

    return `${category}: ${value}`;
}


function emptyMemory() {
    return {
        facts: [],
        preferences: [],
        interests: [],
        devices: [],
        goals: [],
        projects: [],
        games: [],
        tasks: [],
        user_name: "",
        youtube_channel: "",
        pending_memory: null
    };
}



function normalizeMemory(memory) {
    const empty = emptyMemory();

    if (
        !memory ||
        typeof memory !== "object" ||
        Array.isArray(memory)
    ) {
        return empty;
    }

    const safeMemory = {};

    const collections = [
        "facts",
        "preferences",
        "interests",
        "devices",
        "goals",
        "projects",
        "games",
        "tasks"
    ];

    for (const collection of collections) {
        const items = Array.isArray(memory[collection])
            ? memory[collection]
            : [];

        const normalizedItems = [];
        const seen = new Set();

        for (const item of items) {
            if (typeof item !== "string") continue;

            const value = item.trim();

            if (!value || isSensitiveMemory(value)) {
                continue;
            }

            let normalized;

            if (collection === "preferences") {
                normalized = normalizePreferenceItem(value);
            } else if (collection === "games") {
                normalized = normalizeGame(value);
            } else {
                normalized = value;
            }

            if (
                typeof normalized !== "string" ||
                !normalized.trim() ||
                isSensitiveMemory(normalized.trim())
            ) {
                continue;
            }

            const cleanValue = normalized.trim();
            const duplicateKey = normalizeText(cleanValue);

            if (!duplicateKey || seen.has(duplicateKey)) {
                continue;
            }

            seen.add(duplicateKey);
            normalizedItems.push(cleanValue);
        }

        safeMemory[collection] = normalizedItems;
    }

    safeMemory.user_name =
        typeof memory.user_name === "string" &&
        memory.user_name.trim() &&
        !isSensitiveMemory(memory.user_name.trim())
            ? memory.user_name.trim()
            : "";

    safeMemory.youtube_channel =
        typeof memory.youtube_channel === "string" &&
        memory.youtube_channel.trim() &&
        !isSensitiveMemory(memory.youtube_channel.trim())
            ? memory.youtube_channel.trim()
            : "";

    const pending = memory.pending_memory;

    const validPending =
        pending &&
        typeof pending === "object" &&
        !Array.isArray(pending) &&
        typeof pending.type === "string" &&
        pending.type.trim() &&
        typeof pending.value === "string" &&
        pending.value.trim() &&
        !isSensitiveMemory(pending.value.trim()) &&
        (
            pending.category === null ||
            (
                typeof pending.category === "string" &&
                pending.category.trim()
            )
        ) &&
        typeof pending.confidence === "number" &&
        Number.isFinite(pending.confidence) &&
        typeof pending.createdAt === "number" &&
        Number.isFinite(pending.createdAt);

    if (validPending) {
        safeMemory.pending_memory = {
            type: pending.type.trim(),
            category: pending.category,
            value: pending.value.trim(),
            confidence: pending.confidence,
            createdAt: pending.createdAt
        };
    } else {
        safeMemory.pending_memory = null;
    }

    return safeMemory;
}



function normalizeText(value) {
    return armenianTransliterate(String(value || ""))
        .toLowerCase()
        .normalize("NFC")
        .replace(/[։.,!?՝'"]/gu, "")
        .replace(/\s+/gu, " ")
        .trim();
}



function normalizePreferenceCategory(value) {
    const category = normalizeText(value)
        .replace(/^իմ սիրելի\s+/u, "")
        .replace(/[:՝-]$/u, "")
        .trim();

    const aliases = {
        "միրգ": "միրգ",
        "միրգյ": "միրգ",
        "մրգ": "միրգ",

        "սպորտ": "սպորտ",
        "սպորտաձև": "սպորտ",
        "սպորտաձեվ": "սպորտ",

        "կենդանի": "կենդանի",
        "կենդանին": "կենդանի",

        "մեքենա": "մեքենա",
        "մեքենայի ապրանքանիշ": "մեքենա",
        "ավտոմեքենա": "մեքենա",
        "ավտոմեքենայի ապրանքանիշ": "մեքենա",

        "գույն": "գույն"
    };

    return aliases[category] || category;
}


function getSavedPreferenceCategory(item) {
    const text = String(item || "").trim();

    if (!text) return "";

    // Նոր ձևաչափ
    if (text.includes(":")) {
        return normalizePreferenceCategory(
            text.split(":")[0]
        );
    }

    // Հին ձևաչափ
    const match = text.match(
        /^(?:իմ\s+)?սիրելի\s+(մեքենայի\s+ապրանքանիշ|ավտոմեքենայի\s+ապրանքանիշ|ավտոմեքենա|միրգյ?|սպորտաձև|սպորտաձեվ|սպորտ|կենդանի|կենդանին|մեքենա|գույն)\s*(?:՝|:|-)?\s*(.+?)\s+է$/iu
    );

    if (match) {
        return normalizePreferenceCategory(match[1]);
    }

    return "";
}



function getSavedPreferenceValue(item) {
    const text = String(item || "").trim();

    if (!text) return "";

    // Նոր միասնական ձևաչափ
    if (text.includes(":")) {
        return text.split(":").slice(1).join(":").trim();
    }

    // Հին նախադասությունների ձևաչափ
    const match = text.match(
        /^(?:իմ\s+)?սիրելի\s+(?:միրգյ?|սպորտաձև|սպորտ|կենդանի|կենդանին|մեքենա|գույն)\s*(?:՝|:|-)?\s*(.+?)\s+է$/iu
    );

    return match ? match[1].trim() : "";
}


/* =====================================================
   SAVE PREFERENCE
===================================================== */

function savePreference(memory, category, value) {
    if (!Array.isArray(memory.preferences)) {
        memory.preferences = [];
    }

    const cleanValue = String(value || "").trim();

    if (
        !category ||
        !cleanValue ||
        isSensitiveMemory(cleanValue)
    ) {
        return false;
    }

    const normalizedCategory =
        normalizePreferenceCategory(category);

    if (!normalizedCategory) return false;

    // Հեռացնում ենք նույն կատեգորիայի բոլոր հին գրառումները
    memory.preferences = memory.preferences.filter(item => {
        const savedCategory =
            getSavedPreferenceCategory(item);

        return savedCategory !== normalizedCategory;
    });

    // Պահպանում ենք միասնական ձևաչափով
    const newItem =
        `${normalizedCategory}: ${cleanValue}`;

    memory.preferences.push(newItem);

    return true;
}



function saveGame(memory, value) {
    if (!Array.isArray(memory.games)) {
        memory.games = [];
    }

    const cleanValue = String(value || "").trim();

    if (!cleanValue || isSensitiveMemory(cleanValue)) {
        return false;
    }

    const newKey = normalizeGame(cleanValue);

    if (!newKey) return false;

    const existingGame = memory.games.some(game =>
        normalizeGame(game) === newKey
    );

    if (existingGame) {
        return "exists";
    }

    memory.games.push(cleanValue);

    return "saved";
}



/* =====================================================
   MEMORY COLLECTION
===================================================== */


function getMemoryCollection(type) {
    const map = {
        fact: "facts",
        interest: "interests",
        device: "devices",
        goal: "goals",
        project: "projects",
        game: "games",
        task: "tasks"
    };

    return map[type] || null;
}


/* =====================================================
   GEMINI MEMORY ANALYZER
===================================================== */

  
async function analyzeMemoryWithGemini(message) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return null;

    const text = String(message || "").trim();

    if (!text || text.length > 3000) return null;

    const prompt = `
Դու ZENIX-ի հիշողության ճանաչման համակարգն ես։

Վերլուծիր օգտատիրոջ վերջին հաղորդագրությունը։

Ճանաչիր միայն հստակ տեղեկություններ հենց օգտատիրոջ մասին։

Հնարավոր տեսակները՝
name, preference, interest, fact, device, game, project, goal, task, none։
ԱՌԱՋԱԴՐԱՆՔՆԵՐ

1. Կոնկրետ անելիքները դասակարգիր որպես task։
2. Ժամանակով սահմանված անելիքները դասակարգիր որպես task։
3. Վաղվա կամ առաջիկա օրերի անելիքները դասակարգիր որպես task։
4. Առաջադրանքը երբեք մի դասակարգիր project։
5. Վերադարձիր միայն առաջադրանքի նկարագրությունը։

ՕՐԻՆԱԿ

Հաղորդագրություն՝ Վաղը պետք է շարունակեմ ZENIX-ի ծրագրավորումը։

{
    "type": "task",
    "category": null,
    "value": "Շարունակել ZENIX-ի ծրագրավորումը",
    "confidence": 0.98
}
ԸՆԴՀԱՆՈՒՐ ԿԱՆՈՆՆԵՐ

ԼԵԶՎԻ ՄԻԱՍՆԱԿԱՆԱՑՈՒՄ

1. Հիշողության բոլոր առաջադրանքների value-ն պետք է լինի հայերեն։
2. Եթե օգտատիրոջ առաջադրանքը անգլերեն է, թարգմանիր հայերեն։
3. Եթե առաջադրանքը ռուսերեն է, թարգմանիր հայերեն։
4. Եթե առաջադրանքն արդեն հայերեն է, պահպանիր առանց փոփոխության։
5. Պահպանիր սկզբնական իմաստը՝ առանց նոր տեղեկություն ավելացնելու։
6. Տեխնիկական անվանումները, օրինակ՝ ZENIX, API, Node.js, մի թարգմանիր։
7. Առաջադրանքի value-ում մի պահպանիր ժամանակային ավելորդ բառերը, եթե դրանք առաջադրանքի իմաստի համար անհրաժեշտ չեն։
8. Այս կանոնները պարտադիր են հատկապես type = task դեպքերում։

1. Հասկացիր հայերենը։
2. Հասկացիր լատինատառ հայերենը։
3. Հասկացիր բնական խոսքը։
4. Մի պահանջիր կոնկրետ նախադասության կառուցվածք։
5. Մի գրանցիր հարցերը որպես փաստ։
6. Մի գրանցիր ուրիշ մարդկանց մասին տեղեկությունները։
7. Մի հորինիր արժեքներ։
8. Անորոշության դեպքում վերադարձիր none։
9. Մի ճանաչիր հիպոթետիկ նախադասությունները։
10. Մի ճանաչիր մեջբերված տեքստի տեղեկությունը որպես օգտատիրոջ փաստ։
11. Մի պահպանիր գաղտնաբառեր, API key-եր կամ գաղտնի տվյալներ։

ԽԱՂԵՐԻ ՃԱՆԱՉՈՒՄ

12. Խաղերի անունները միշտ դասակարգիր որպես game։
13. Սիրելի խաղերը նույնպես դասակարգիր որպես game։
14. Խաղ խաղալու մասին տեղեկությունը նույնպես դասակարգիր որպես game։
15. Խաղերի անունները մի գրանցիր preference կամ interest բաժիններում։
16. Խաղերի համար category-ն պետք է լինի null։
17. Օգտագործիր խաղերի ընդհանուր գիտելիքներդ։
18. Ճանաչիր խաղերի կրճատ անվանումները։
19. Ճանաչիր GTA 5, GTA V, GTA5 և նման տարբերակները։
20. Ճանաչիր RDR2, CS2, ETS2, FH6 և նման կրճատումները։
21. Յուրաքանչյուր ճանաչված խաղի համար վերադարձիր պաշտոնական ամբողջական անվանումը։
22. Նույն խաղի տարբեր անվանումները վերածիր մեկ միասնական անվան։
23. Տարբեր խաղերի անունները երբեք մի միավորիր։
24. Նոր խաղերի համար մի պահանջիր, որ դրանք նախապես լինեն կոդում։
25. Եթե խաղի անունը վստահորեն չես ճանաչում, վերադարձիր none։
26. Երբեք մի հորինիր խաղի գոյություն կամ անվանում։

ՆԱԽԱՍԻՐՈՒԹՅՈՒՆՆԵՐ

27. Նախասիրությունները դասակարգիր որպես preference։
28. Նախասիրության category-ն գրիր կարճ և ստանդարտ ձևով։
29. Preference-ի value-ում գրիր միայն նախընտրած արժեքը։
30. Ընդհանուր հետաքրքրությունները դասակարգիր որպես interest։
ՆԱԽԱԳԾԵՐ ԵՎ ՆՊԱՏԱԿՆԵՐ

31. Նախագծերը դասակարգիր որպես project։
32. Օգտատիրոջ ստեղծած կամ ստեղծվող նախագծերը պահպանիր project տեսակով։
33. Ռոբոտի, ծրագրի, բիզնեսի կամ այլ սեփական նախագծի մասին հստակ տեղեկությունը դասակարգիր project։
34. Նպատակները դասակարգիր որպես goal։
35. Նախագիծը երբեք մի դասակարգիր interest։
36. Եթե օգտատերը հայտնում է իր նախագիծը պահպանելու հստակ ցանկություն, վերադարձիր project։
37. Վերադարձիր միայն իրականում նշված նախագծի անունը կամ նկարագրությունը։

ՕՐԻՆԱԿ

Հաղորդագրություն՝ Հիշիր, որ իմ գլխավոր նախագիծը ZENIX ռոբոտի ստեղծումն է։

{
    "type": "project",
    "category": null,
    "value": "ZENIX ռոբոտի ստեղծում",
    "confidence": 0.98
}

Հաղորդագրություն՝ Իմ նպատակն է սովորել ծրագրավորում։

{
    "type": "goal",
    "category": null,
    "value": "Սովորել ծրագրավորում",
    "confidence": 0.98
}
ՕՐԻՆԱԿՆԵՐ

Հաղորդագրություն՝ Հիշիր, որ սիրում եմ ETS 2։

{
    "type": "game",
    "category": null,
    "value": "Euro Truck Simulator 2",
    "confidence": 0.98
}

Հաղորդագրություն՝ Հիշիր, որ սիրում եմ CS2։

{
    "type": "game",
    "category": null,
    "value": "Counter-Strike 2",
    "confidence": 0.98
}

Հաղորդագրություն՝ Իմ սիրելի խաղը GTA 5-ն է։

{
    "type": "game",
    "category": null,
    "value": "Grand Theft Auto V",
    "confidence": 0.98
}

Հաղորդագրություն՝ Ես սիրում եմ RDR2։

{
    "type": "game",
    "category": null,
    "value": "Red Dead Redemption 2",
    "confidence": 0.98
}

Հաղորդագրություն՝ Իմ սիրելի խաղը Evolve RP-ն է։

{
    "type": "game",
    "category": null,
    "value": "EVOLVE RP",
    "confidence": 0.98
}

Հաղորդագրություն՝ Ես սիրում եմ ֆուտբոլ։

{
    "type": "interest",
    "category": null,
    "value": "ֆուտբոլ",
    "confidence": 0.98
}

Հաղորդագրություն՝ Իմ սիրելի գույնը սև է։

{
    "type": "preference",
    "category": "գույն",
    "value": "սև",
    "confidence": 0.98
}



Եթե տեղեկություն չկա՝

{
    "type": "none",
    "category": null,
    "value": null,
    "confidence": 0
}

Վերադարձիր միայն վավեր JSON։
Մի ավելացրու Markdown կամ բացատրություններ։

Օգտատիրոջ հաղորդագրություն՝
${JSON.stringify(text)}
`;

    try {
        const response = await fetch(
            GEMINI_URL + encodeURIComponent(apiKey),
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: prompt }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 300,
                        responseMimeType: "application/json"
                    }
                }),
                signal: AbortSignal.timeout(30000)
            }
        );

        if (!response.ok) {
            console.error(
                "MEMORY ANALYZER ERROR:",
                await response.text()
            );

            return null;
        }

        const data = await response.json();

        const raw = data.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();

        if (!raw) return null;

        const result = JSON.parse(raw);
console.log(
    "ZENIX TASK ANALYZER RESULT:",
    result
);

 const allowed = [
    "name",
    "preference",
    "interest",
    "fact",
    "device",
    "game",
    "project",
    "goal",
    "task",
    "none"
];

        if (!allowed.includes(result.type)) return null;

        if (result.type === "none") return null;

        if (
            typeof result.value !== "string" ||
            !result.value.trim()
        ) {
            return null;
        }

        if (
            typeof result.confidence !== "number" ||
            result.confidence < 0.65 ||
            result.confidence > 1
        ) {
            return null;
        }

        if (
            result.value.length > 300 ||
            isSensitiveMemory(result.value)
        ) {
            return null;
        }

        if (
            result.type === "preference" &&
            (
                typeof result.category !== "string" ||
                !result.category.trim()
            )
        ) {
            return null;
        }

        if (
            result.type === "game" &&
            result.category !== null
        ) {
            return null;
        }

        return {
            type: result.type,
         category: result.category == null
    ? null
    : String(result.category).trim(),
            value: result.value.trim(),
            confidence: result.confidence
        };

    } catch (error) {
        console.error(
            "MEMORY ANALYZER ERROR:",
            error.message
        );

        return null;
    }
}


/* =====================================================
   SAVE DETECTED MEMORY
===================================================== */



function saveDetectedMemory(memory, detected) {
    if (!memory || !detected) return false;

    const value = String(detected.value || "").trim();

    if (!value || isSensitiveMemory(value)) {
        return false;
    }

    // Անվան պահպանում
    if (detected.type === "name") {
        if (
            normalizeText(memory.user_name) ===
            normalizeText(value)
        ) {
            return "exists";
        }

        memory.user_name = value;
        return "saved";
    }

    // Խաղերի պահպանում
    if (detected.type === "game") {
        return saveGame(memory, value);
    }

    // Նախասիրությունների պահպանում
    if (detected.type === "preference") {
        if (!Array.isArray(memory.preferences)) {
            memory.preferences = [];
        }

        const category = normalizePreferenceCategory(
            detected.category
        );

        if (!category) return false;

        const same = memory.preferences.some(item =>
            getSavedPreferenceCategory(item) === category &&
            normalizeText(getSavedPreferenceValue(item)) ===
            normalizeText(value)
        );

        if (same) return "exists";

        return savePreference(memory, category, value)
            ? "saved"
            : false;
    }

    // Մնացած հիշողության բաժինները
    const collection = getMemoryCollection(detected.type);

    const allowedCollections = [
        "facts",
        "interests",
        "devices",
        "goals",
        "projects",
        "games",
        "tasks"
    ];

    if (!allowedCollections.includes(collection)) {
        return false;
    }

    const result = addMemoryItem(
        memory,
        collection,
        value
    );

    if (result === "exists") return "exists";

    return result === true ? "saved" : false;
}


/* =====================================================
   AUTOMATIC MEMORY
===================================================== */
async function saveAutomaticMemory(message) {
    const detected = await analyzeMemoryWithGemini(message);

    if (!detected) return false;

    if (detected.confidence < 0.90) {
        return {
            status: "confirmation",
            detected
        };
    }

    const memory = loadMemory();

    const result = saveDetectedMemory(memory, detected);

    if (result === "exists") return "exists";

    if (result !== "saved" && result !== true) {
        return false;
    }

    const saved = saveMemory(memory);

    return saved ? "saved" : false;
}
/* =====================================================
   PENDING MEMORY
===================================================== */

function setPendingMemory(detected) {
    if (!detected) return false;

    const memory = loadMemory();

    memory.pending_memory = {
        type: detected.type,
        category: detected.category || null,
        value: detected.value,
        confidence: detected.confidence,
        createdAt: Date.now()
    };

    return saveMemory(memory);
}

function handleMemoryConfirmation(message) {
    const text = normalizeText(message);

    if (!text) return null;

    const yes =
        /^(այո|հա|իհարկե|հիշիր|պահիր|այո հիշիր|այո պահիր|yes|yeah|да|конечно)$/iu;

    const no =
        /^(ոչ|չէ|մի հիշիր|չպահես|ոչ մի հիշիր|no|nope|нет)$/iu;

    if (!yes.test(text) && !no.test(text)) {
        return null;
    }

    const memory = loadMemory();
    const pending = memory.pending_memory;

    if (!pending) return null;

    // Նախ մաքրում ենք pending-ը։
    memory.pending_memory = null;

    if (no.test(text)) {
        return saveMemory(memory)
            ? "cancelled"
            : "error";
    }

    const result = saveDetectedMemory(memory, pending);

    if (result === "exists") {
        return saveMemory(memory)
            ? "exists"
            : "error";
    }

    if (result !== "saved" && result !== true) {
        return "error";
    }

    return saveMemory(memory)
        ? "saved"
        : "error";
}

/* =====================================================
   EXPLICIT REMEMBER COMMAND
===================================================== */

function hasRememberCommand(message) {
    const text = String(message || "").trim();

    return /^(?:հիշիր|հիշի|պահիր հիշողության մեջ|պահպանիր այս տեղեկությունը|remember(?:\s+that)?|запомни(?:\s+что)?)(?=\s|[,՝:]|$)/iu.test(text);
}

function cleanRememberCommand(message) {
    return String(message || "")
        .replace(
    /^(?:հիշիր|հիշի|hishir|hishi|պահիր հիշողության մեջ|պահպանիր այս տեղեկությունը|remember(?:\s+that)?|запомни(?:\s+что)?)[\s,՝:]*/iu,
    ""
)
        
        .trim();
}

/* =====================================================
   MEMORY FORGET
===================================================== */

function isForgetCommand(message) {
    return /^(?:մոռացիր|ջնջիր(?:\s+հիշողությունից)?|մոռացիր իմ մասին|forget|forget that|забудь|удали из памяти)(?=\s|[,՝:]|$)/iu.test(
        String(message || "").trim()
    );
}


async function forgetFact(message) {
    const memory = loadMemory();
    const text = String(message || "").trim();

    if (!text) return false;

    const collections = [
        "facts", "preferences", "interests",
        "devices", "goals", "projects",
        "games", "tasks"
    ];

 
const forgetAll =
    /^(?:մոռացիր\s+(?:ամեն ինչ|ամբողջ հիշողությունդ|ամբողջ հիշողությունը|ամբողջ հիշողությունս)|ջնջիր\s+(?:ամեն ինչ|ամբողջ հիշողությունը)|forget\s+everything|забудь\s+всё)[.!?։]*$/iu;

    if (forgetAll.test(text)) {
        for (const collection of collections) {
            memory[collection] = [];
        }

        memory.user_name = "";
        memory.youtube_channel = "";
        memory.pending_memory = null;

        return saveMemory(memory) ? "all" : "error";
    }

    // Պաշտպանություն. սովորական հաղորդագրությունները
    // չպետք է ջնջման հրաման համարվեն։
    const forgetCommand =
        /^(?:մոռացիր|ջնջիր(?:\s+հիշողությունից)?|forget|забудь|удали(?:\s+из памяти)?)(?:\s|$)/iu;

    if (!forgetCommand.test(text)) return false;

    let target = text
        .replace(
            /^(?:մոռացիր|ջնջիր(?:\s+հիշողությունից)?|forget|забудь|удали(?:\s+из памяти)?)[\s,՝:]*/iu,
            ""
        )
        .replace(/[.!?։]+$/u, "")
        .trim();

    target = target
        .replace(/^որ\s+/u, "")
        .replace(/^ես\s+/u, "")
        .replace(/^(?:սիրում եմ|խաղում եմ|ունեմ)\s+/u, "")
        .trim();

    if (!target) return false;

    const normalizedTarget = normalizeText(target);

    const categories = [
        { name: "color", pattern: /գույն(?:ը|ի|ս)?/u },
        { name: "fruit", pattern: /միրգ(?:ը|ի|ս|յ)?/u },
        { name: "sport", pattern: /սպորտ(?:աձևը|աձևի|ի)?|բոքս/u },
        { name: "animal", pattern: /կենդանի(?:ն|ը|ի|ս)?|կատու|շուն/u },
        { name: "car", pattern: /մեքենա(?:ն|ը|յի|ի|ս)?|ավտոմեքենա/u },
        { name: "game", pattern: /խաղ(?:ը|ի|ս)?/u },
        { name: "music", pattern: /երաժշտություն(?:ը|ի|ս)?/u },
        { name: "food", pattern: /ուտելիք(?:ը|ի|ս)?|սնունդ(?:ը|ի)?/u }
    ];

    const matchedCategory = categories.find(category =>
        category.pattern.test(normalizedTarget)
    );

    let targetGameKey = "";

    // Խաղի ճանաչում Gemini-ով
    if (!matchedCategory || matchedCategory.name === "game") {
        try {
            const analysis = await analyzeMemoryWithGemini(
                "Հիշիր, որ սիրում եմ " + target
            );

            if (
                analysis &&
                analysis.type === "game" &&
                typeof analysis.value === "string" &&
                analysis.confidence >= 0.75
            ) {
                targetGameKey = normalizeGame(analysis.value);
            }
        } catch (error) {
            console.error(
                "GAME FORGET ANALYSIS ERROR:",
                error.message
            );

            return "error";
        }
    }

    let removed = false;

    for (const collection of collections) {
        if (!Array.isArray(memory[collection])) continue;

        const before = memory[collection].length;

        memory[collection] = memory[collection].filter(item => {
            const normalizedItem = normalizeText(
                String(item || "")
            );

            if (!normalizedItem) return true;

            // Խաղերի ճշգրիտ համեմատություն
            if (collection === "games") {
                if (!targetGameKey) return true;

                return normalizeGame(item) !== targetGameKey;
            }

            // Նախասիրության կատեգորիայի ջնջում
            if (
                matchedCategory &&
                collection === "preferences" &&
                matchedCategory.pattern.test(normalizedItem)
            ) {
                return false;
            }

            // Մնացած հիշողությունների ջնջում
            if (
                normalizedItem === normalizedTarget ||
                normalizedItem.includes(normalizedTarget)
            ) {
                return false;
            }

            return true;
        });

        if (memory[collection].length < before) {
            removed = true;
        }
    }

    // Անվան ջնջում
    if (
        /անուն(?:ս|ը|ի)?/u.test(normalizedTarget) &&
        memory.user_name
    ) {
        memory.user_name = "";
        removed = true;
    }

    // YouTube ալիքի ջնջում
    if (
        /youtube|յություբ|ալիք/u.test(normalizedTarget) &&
        memory.youtube_channel
    ) {
        memory.youtube_channel = "";
        removed = true;
    }

    console.log("FORGET RESULT:", {
        target,
        targetGameKey,
        games: memory.games,
        removed
    });

    if (!removed) {
        return "not_found";
    }

    return saveMemory(memory) ? true : "error";
}


function normalizeGame(value) {
    let text = String(value || "")
        .toLowerCase()
        .normalize("NFC")
        .replace(/[։.,!?՝'"`()\[\]{}]/gu, " ")
        .replace(/[-_]/gu, " ")
        .replace(/\s+/gu, " ")
        .trim();

    if (!text) return "";

    // Հեռացնում ենք հրամանի բառերը
    text = text
        .replace(/^(?:հիշիր|մոռացիր|ջնջիր|պահպանիր)\s+/u, "")
        .replace(/^(?:remember|forget|delete)\s+/iu, "")
        .replace(/^(?:որ\s+)?ես\s+/u, "")
        .replace(/^(?:խաղում եմ|սիրում եմ)\s+/u, "")
        .trim();

    // Հեռացնում ենք միայն առանձին վերջում ավելացված հոդը
    // Խաղի անվան վերջին տառերը չենք փոխում։
    text = text
        .replace(/\s+(?:ը|ն|ս)$/u, "")
        .trim();

    // Միասնականացնում ենք բացատները
    text = text
        .replace(/\s+/gu, " ")
        .trim();

    return text;
}





/* =====================================================
   UPDATE FUTURE PREFERENCE
===================================================== */
// ===============================
// ZENIX GAME NORMALIZATION TESTS
// ===============================

console.log("\n========== END GAME TEST ==========\n");


function updateFuturePreference(message) {
    const memory = loadMemory();
    const text = normalizeText(String(message || "").trim());

    if (!text) return false;

    const patterns = [
        /^(?:այսուհետ|այսուհետից|հետայսու|from now on|с этого момента)\s+(.+?)$/iu,
        /^(?:նախընտրում եմ|ուզում եմ այսուհետ)\s+(.+?)$/iu
    ];

    let value = null;

    for (const pattern of patterns) {
        const match = text.match(pattern);

        if (match) {
            value = match[1].trim();
            break;
        }
    }

    if (!value || isSensitiveMemory(value)) return false;

    // Հեռացնում ենք նախադասության վերջի կետադրությունը
    value = value.replace(/[։.!?]+$/u, "").trim();

    // Ճանաչում ենք կատեգորիաները և դրանց վերջավորությունները
    const preferenceMatch = value.match(
        /^(?:իմ\s+)?սիրելի\s+(միրգ(?:ը|ս)?|միրգյ|մրգ(?:ը|ս)?|սպորտաձև(?:ը|ս)?|սպորտաձեվ(?:ը|ս)?|սպորտ(?:ը|ս)?|կենդանի(?:ն|ս)?|մեքենա(?:ն|ս)?|գույն(?:ը|ս)?)\s+(.+)$/iu
    );

    if (preferenceMatch) {
        const rawCategory = preferenceMatch[1]
            .replace(/(?:ը|ն|ս)$/u, "");

        const category = normalizePreferenceCategory(rawCategory);

        const preferenceValue = preferenceMatch[2]
            .replace(/\s+է$/u, "")
            .trim();

        if (!category || !preferenceValue) return false;

        if (isSensitiveMemory(preferenceValue)) return false;

        const saved = savePreference(
            memory,
            category,
            preferenceValue
        );

        return saved ? saveMemory(memory) : false;
    }

    // Չճանաչված ձևերը պահպանում ենք հին մեխանիզմով
    const saved = addMemoryItem(
        memory,
        "preferences",
        `Ապագա նախընտրություն: ${value}`
    );

    return saved && saved !== "exists"
        ? saveMemory(memory)
        : saved === "exists";
}


/* =====================================================
   MEMORY SUMMARY
===================================================== */



function getMemorySummary(memory) {
    const lines = [];

    if (!memory || typeof memory !== "object") {
        return "Դեռ պահպանված հիշողություններ չկան։";
    }

    if (memory.user_name) {
        lines.push(`Անուն՝ ${memory.user_name}`);
    }

    if (memory.youtube_channel) {
        lines.push(`YouTube ալիք՝ ${memory.youtube_channel}`);
    }

    // Նախասիրությունների կրկնությունների մաքրում
    const preferences = Array.isArray(memory.preferences)
        ? memory.preferences.filter(
            item => typeof item === "string" && item.trim()
        )
        : [];

    const uniquePreferences = new Map();

    for (const item of preferences) {
        const category = getSavedPreferenceCategory(item);

        if (!category) {
            uniquePreferences.set(
                `unknown:${item}`,
                item
            );
            continue;
        }

        const oldItem = uniquePreferences.get(category);

        const oldCategory = oldItem
            ? normalizeText(oldItem.split(":")[0]).trim()
            : "";

        const newCategory = normalizeText(
            item.split(":")[0]
        ).trim();

        // Հիմնական կատեգորիան նախընտրում ենք
        if (
            !oldItem ||
            oldCategory !== category ||
            newCategory === category
        ) {
            uniquePreferences.set(category, item);
        }
    }

    const sections = [
        ["preferences", "Նախասիրություններ"],
        ["interests", "Հետաքրքրություններ"],
        ["facts", "Փաստեր"],
        ["devices", "Սարքեր"],
        ["goals", "Նպատակներ"],
        ["projects", "Նախագծեր"],
        ["games", "Խաղեր"],
        ["tasks", "Առաջադրանքներ"]
    ];

    for (const [key, title] of sections) {
        let items;

        if (key === "preferences") {
            items = [...uniquePreferences.values()];
        } else {
            items = Array.isArray(memory[key])
                ? memory[key].filter(
                    item =>
                        typeof item === "string" &&
                        item.trim()
                )
                : [];
        }

        if (items.length) {
            lines.push(
                `${title}՝ ${items.join(", ")}`
            );
        }
    }

    return lines.length
        ? lines.join("\n")
        : "Դեռ պահպանված հիշողություններ չկան։";
}


/* =====================================================
   MEMORY ANSWERS
===================================================== */



function getMemoryAnswer(memory, language, question = "") {
const text = normalizeText(question)
    .replace(/[՞?։!,.՝]/g, "");
    memory = memory && typeof memory === "object"
        ? memory
        : {};

    console.log("ORIGINAL QUESTION:", question);
    console.log("NORMALIZED QUESTION:", text);

    const hasAny = (...words) =>
        words.some(word => text.includes(normalizeText(word)));

    const categories = [
        {
            key: "games",
            title: "Խաղեր",
            words: ["խաղ", "խաղեր", "games", "game"]
        },
        {
            key: "tasks",
            title: "Առաջադրանքներ",
            words: ["առաջադրանք", "անելիք", "tasks", "task"]
        },
        {
            key: "preferences",
            title: "Նախասիրություններ",
            words: ["նախասիր", "սիրելի", "preferences"]
        },
        {
            key: "interests",
            title: "Հետաքրքրություններ",
            words: ["հետաքրքր", "interests"]
        },
        {
            key: "facts",
            title: "Փաստեր",
            words: ["փաստ", "տեղեկություն", "facts"]
        },
        {
            key: "devices",
            title: "Սարքեր",
            words: ["սարք", "հեռախոս", "համակարգիչ", "devices"]
        },
        {
            key: "goals",
            title: "Նպատակներ",
            words: ["նպատակ", "goals"]
        },
        {
            key: "projects",
            title: "Նախագծեր",
            words: ["նախագիծ", "նախագծեր", "projects"]
        }
    ];

    const questionAboutMemory = hasAny(
        "ինչ",
        "ինչ՞",
        "ի՞նչ",
        "որ",
        "թվարկիր",
        "հիշում",
        "պահպանված"
    );

    if (!questionAboutMemory) {
        return null;
    }

    // Ամբողջ հիշողության ամփոփում
    if (
        hasAny("հիշում", "հիշող", "պահպանված") &&
        hasAny("իմ մասին", "տեղեկություն", "հիշողություն")
    ) {
        return getMemorySummary(memory);
    }

    const answers = [];

    // Անուն
    if (hasAny("անուն", "ով եմ")) {
        answers.push(
            memory.user_name
                ? `Քո անունը ${memory.user_name} է։ ❤️`
                : "Քո անունը դեռ չեմ հիշում։"
        );
    }

    // YouTube ալիք
    if (hasAny("youtube", "յություբ")) {
        answers.push(
            memory.youtube_channel
                ? `Քո YouTube ալիքն է՝ ${memory.youtube_channel}։ ❤️`
                : "YouTube ալիք դեռ չեմ հիշում։"
        );
    }

    // Անհատական նախասիրություններ
    const preferenceQuestions = [
        {
            key: "մեքենա",
            words: ["մեքենա", "ավտոմեքենա"]
        },
        {
            key: "միրգ",
            words: ["միրգ", "մրգ"]
        },
        {
            key: "սպորտ",
            words: ["սպորտ", "բոքս", "բռնցքամարտ"]
        },
        {
            key: "կենդանի",
            words: ["կենդանի", "կենդանին", "ընտանի կենդանի"]
        },
        {
            key: "գույն",
            words: ["գույն"]
        }
    ];

    const matchedPreferences = preferenceQuestions.filter(item =>
        hasAny(...item.words)
    );

    for (const preferenceQuestion of matchedPreferences) {
        const saved = Array.isArray(memory.preferences)
            ? memory.preferences.find(item =>
                typeof item === "string" &&
                normalizeText(item).startsWith(
                    normalizeText(preferenceQuestion.key) + ":"
                )
            )
            : null;

        if (saved) {
            const value = saved
                .substring(saved.indexOf(":") + 1)
                .trim();

            answers.push(
                `Քո սիրելի ${preferenceQuestion.key}ը ${value} է։ ❤️`
            );
        } else {
            answers.push(
                `Քո սիրելի ${preferenceQuestion.key}ը դեռ չեմ հիշում։`
            );
        }
    }

    // Հիշողության բաժիններ
    const matchedCategories = categories.filter(item => {
        if (!hasAny(...item.words)) {
            return false;
        }

        // Եթե կոնկրետ նախասիրություն է հարցվել,
        // ընդհանուր նախասիրությունների բաժինը չենք կրկնում։
        if (
            item.key === "preferences" &&
            matchedPreferences.length > 0
        ) {
            return false;
        }

        return true;
    });

    for (const category of matchedCategories) {
        const items = Array.isArray(memory[category.key])
            ? memory[category.key].filter(
                item =>
                    typeof item === "string" &&
                    item.trim()
            )
            : [];

        console.log(
            "MEMORY CATEGORY:",
            category.key,
            "COUNT:",
            items.length
        );

        if (items.length === 0) {
            answers.push(
                `Առայժմ պահպանված ${category.title.toLowerCase()} չեմ հիշում։`
            );
            continue;
        }

        answers.push(
            `Ահա քո մասին հիշած ${category.title.toLowerCase()}ը։ ❤️\n\n` +
            items.map((item, index) =>
                `${index + 1}. ${item}`
            ).join("\n")
        );
    }

    // Եթե գտնվել են մի քանի պատասխաններ, վերադարձնում ենք բոլորը։
    if (answers.length > 0) {
        return answers.join("\n\n");
    }

    return null;
}



/* =====================================================
   GOOGLE NEWS
===================================================== */

async function searchGoogleNews(query) {
    try {
        const originalQuery = String(query || "")
            .normalize("NFC")
            .trim();

        const isGTA6Query =
            /\bGTA\s*[- ]?\s*6\b|Grand Theft Auto\s*(?:VI|6)\b/i
                .test(originalQuery);

        const searchQuery = isGTA6Query
            ? '"GTA 6"'
            : originalQuery;

        if (!searchQuery) return [];

        const params = new URLSearchParams({
            q: searchQuery,
            hl: "en-US",
            gl: "US",
            ceid: "US:en"
        });

        const response = await fetch(
            "https://news.google.com/rss/search?" +
            params.toString(),
            {
                headers: {
                    "User-Agent": "Mozilla/5.0 ZENIX/1.0",
                    "Accept": "application/rss+xml, application/xml, text/xml"
                },
                signal: AbortSignal.timeout(15000)
            }
        );

        if (!response.ok) {
            throw new Error("News search failed: " + response.status);
        }

        const xml = await response.text();

        function decodeXML(value) {
            return String(value || "")
                .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
                .replace(/&amp;/g, "&")
                .replace(/&quot;/g, '"')
                .replace(/&#39;|&apos;/g, "'")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&#(\d+);/g, (_, code) =>
                    String.fromCodePoint(Number(code))
                )
                .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
                    String.fromCodePoint(parseInt(code, 16))
                )
                .trim();
        }

        function getValue(item, tag) {
            const regex = new RegExp(
                `<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`,
                "i"
            );

            const match = item.match(regex);

            return match ? decodeXML(match[1]) : "";
        }

        function getSourceUrl(item) {
            const match = item.match(
                /<source\b[^>]*\burl=["']([^"']+)["']/i
            );

            return match ? decodeXML(match[1]) : "";
        }

        const items = xml.match(
            /<item\b[^>]*>[\s\S]*?<\/item>/gi
        ) || [];

        let results = items.map(item => ({
            title: getValue(item, "title"),
            link: getValue(item, "link"),
            date: getValue(item, "pubDate"),
            source: getValue(item, "source"),
            sourceUrl: getSourceUrl(item)
        }));

        results = results.filter(item => {
            if (!item.title || !item.link) return false;

            if (isGTA6Query) {
                const gtaPattern =
                    /\bGTA\s*[- ]?\s*6\b|\bGrand Theft Auto\s*(?:VI|6)\b/i;

                const match = item.title.match(gtaPattern);

                if (!match || match.index > 35) return false;

                const excluded = [
                    /air force 1/i,
                    /10 things that have happened in f1/i,
                    /before we got gta 6/i
                ];

                if (excluded.some(pattern => pattern.test(item.title))) {
                    return false;
                }
            }

            return true;
        });

        const unique = [
            ...new Map(
                results.map(item => [item.link, item])
            ).values()
        ];

        unique.sort((a, b) =>
            (Date.parse(b.date) || 0) -
            (Date.parse(a.date) || 0)
        );

        return unique.slice(0, 10);

    } catch (error) {
        console.error("ZENIX NEWS ERROR:", error.message);
        return [];
    }
}

function getNewsPublicationDate(date) {
    if (!date) return "Ամսաթիվը նշված չէ";

    const parsed = new Date(date);

    if (isNaN(parsed.getTime())) {
        return "Ամսաթիվը հնարավոր չէ ստուգել";
    }

    return parsed.toISOString();
}

function getNewsSourceStatus(item) {
    const officialDomains = [
        "rockstargames.com",
        "take2games.com"
    ];

    try {
        const hostname = new URL(item.sourceUrl).hostname
            .toLowerCase()
            .replace(/^www\./, "");

        if (officialDomains.some(domain =>
            hostname === domain ||
            hostname.endsWith("." + domain)
        )) {
            return "OFFICIAL DOMAIN - ARTICLE CONTENT NOT VERIFIED";
        }
    } catch {}

    return "MEDIA REPORT - NOT OFFICIALLY VERIFIED";
}

function buildNewsContext(newsResults) {
    if (!newsResults.length) {
        return `
Google News-ը արդյունքներ չի վերադարձրել։
Մի հորինիր նորություններ։
Հստակ ասա, որ որոնումը արդյունք չի տվել։
`;
    }

    const articles = newsResults.map((item, index) => [
        `${index + 1}. TITLE: ${item.title}`,
        `LINK: ${item.link}`,
        `PUBLICATION DATE: ${getNewsPublicationDate(item.date)}`,
        `SOURCE: ${item.source || "Unknown"}`,
        `SOURCE URL: ${item.sourceUrl || "Unknown"}`,
        `SOURCE STATUS: ${getNewsSourceStatus(item)}`,
        "ARTICLE CONTENT: NOT PROVIDED"
    ].join("\n")).join("\n\n");

    return `
GOOGLE NEWS SEARCH RESULTS:

${articles}

RULES:
- Մի հորինիր հոդվածների բովանդակություն։
- Տարբերակիր պաշտոնական և լրատվական հաղորդումները։
- Վերնագիրը ապացույց չէ։
- Ցույց տուր հրապարակման ամսաթիվը։
- Նշիր աղբյուրի հղումը։
- Մի ներկայացրու հին լուրը որպես այսօրվա նորություն։
- Մի պնդիր, որ Rockstar-ը հաստատել է տեղեկությունը,
  եթե դրա իրական պաշտոնական ապացույցը չկա։
`;
}

/* =====================================================
   NAME USAGE CONTROL
===================================================== */

const nameUsage = new Map();

function canUseUserName(sessionId) {
    if (!sessionId) return false;

    const now = Date.now();
    const lastUsed = nameUsage.get(sessionId) || 0;

    if (now - lastUsed < 60000) return false;

    nameUsage.set(sessionId, now);

    return true;
}

/* =====================================================
   GEMINI CHAT
===================================================== */

async function askGemini(history, memory) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing in .env");
    }

const contents = history
    .filter(item =>
        item &&
        ["user", "assistant", "model"].includes(item.role) &&
        typeof item.text === "string" &&
        item.text.trim()
    )
    .slice(-20)
    .map(item => ({
        role: item.role === "assistant"
            ? "model"
            : item.role,
        parts: [{ text: item.text }]
    }));

// Gemini-ի պատմությունը պետք է սկսվի user հաղորդագրությամբ։
while (contents.length && contents[0].role !== "user") {
    contents.shift();
}

if (!contents.length) {
    throw new Error("Gemini conversation history is empty.");
}

    const systemPrompt = `
Դու ZENIX-ն ես՝ հայկական AI օգնական։

Պատասխանիր բնական, ընկերական և կարճ հայերենով։
Օգտագործիր դու/քո/քեզ ձևերը։
Հասկացիր նաև լատինատառ հայերենը։
Հիշիր խոսակցության համատեքստը։
Մի հորինիր օգտատիրոջ մասին տեղեկություններ։

Օգտատիրոջ անունը՝ ${memory.user_name || "անհայտ"}։

YouTube ալիք՝ ${memory.youtube_channel || "անհայտ"}։

Պահպանված փաստեր՝
${memory.facts.join("\n")}

Նախասիրություններ՝
${memory.preferences.join("\n")}

Հետաքրքրություններ՝
${memory.interests.join("\n")}

Սարքեր՝
${memory.devices.join("\n")}

Հիշողության տվյալներն օգտագործիր միայն համապատասխան հարցերի դեպքում։
Մի հորինիր բացակայող տեղեկություններ։
Մի ասա, որ հիշողություն ես պահպանել, եթե այն իրականում չի պահպանվել։
`;

    const response = await fetch(
        GEMINI_URL + encodeURIComponent(apiKey),
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                contents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            }),
            signal: AbortSignal.timeout(60000)
        }
    );

    const responseText = await response.text();

    let data;

    try {
        data = JSON.parse(responseText);
    } catch {
        console.error("GEMINI NON-JSON:", responseText);

        throw new Error("Gemini returned invalid JSON.");
    }

    if (!response.ok) {
        console.error("GEMINI ERROR:", data);

        throw new Error(
            data.error?.message || "Gemini API error"
        );
    }

    const answer = data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!answer) {
        throw new Error("Gemini returned an empty response.");
    }

    return answer;
}

/* =====================================================
   API CHAT
===================================================== */


app.post(
    "/api/chat",
    requireAuth,
    userMemoryContext,
    async (req, res) => {
        try {
            const { history } = req.body;
            const userId = req.user.userId;

            if (!Array.isArray(history)) {
                return res.status(400).json({
                    error: "History must be an array."
                });
            }

            const lastMessage = [...history]
                .reverse()
                .find(item => item && item.role === "user");

            const userMessage = String(
                lastMessage?.text || ""
            ).trim();

            if (!userMessage) {
                return res.status(400).json({
                    error: "Message is empty."
                });
            }

            // Պահպանում ենք օգտատիրոջ հաղորդագրությունների պատմությունը
            console.log("HISTORY DEBUG:", {
    userId,
    historyIsArray: Array.isArray(history),
    historyType: typeof history,
    historyValue: history
});
            if (!saveUserHistory(userId, history)) {
                return res.status(500).json({
                    error: "HISTORY_SAVE_FAILED"
                });
            }

            // Պահպանում ենք նաև ZENIX-ի պատասխանը
            const originalJson = res.json.bind(res);

            res.json = function (data) {
                if (
                    data &&
                    typeof data.reply === "string" &&
                    data.reply.trim()
                ) {
                    const updatedHistory = [
                        ...history,
                        {
                            role: "assistant",
                            text: data.reply
                        }
                    ];

                    try {
                        saveUserHistory(userId, updatedHistory);
                    } catch (error) {
                        console.error(
                            "ZENIX ASSISTANT HISTORY SAVE FAILED:",
                            error
                        );
                    }
                }

                return originalJson(data);
            };

            console.log("ZENIX USER:", userMessage);

            let memory = loadMemory();

            // ======================================
            // 1. PENDING CONFIRMATION
            // ======================================

            const confirmation =
                handleMemoryConfirmation(userMessage);

            if (confirmation === "saved") {
                return res.json({
                    reply: "Լավ, պահպանեցի այս տեղեկությունը հիշողությանս մեջ։ ❤️"
                });
            }

            if (confirmation === "exists") {
                return res.json({
                    reply: "Այս տեղեկությունն արդեն հիշում եմ։ ❤️"
                });
            }

            if (confirmation === "cancelled") {
                return res.json({
                    reply: "Լավ, այս տեղեկությունը չեմ պահպանի։ ❤️"
                });
            }

            if (confirmation === "error") {
                return res.json({
                    reply: "Չհաջողվեց պահպանել տեղեկությունը։"
                });
            }

            // ======================================
            // 2. FORGET COMMANDS
            // ======================================

            const forgetResult = await forgetFact(userMessage);

            if (forgetResult === true) {
                return res.json({
                    reply: "Հաջողությամբ մոռացա և ջնջեցի այդ տեղեկությունը։ ❤️"
                });
            }

            if (forgetResult === "all") {
                return res.json({
                    reply: "Հիշողությանս ամբողջ տեղեկությունը ջնջեցի։ ❤️"
                });
            }

            if (forgetResult === "not_found") {
                return res.json({
                    reply: "Այդ տեղեկությունը հիշողությանս մեջ չգտա։"
                });
            }

            if (forgetResult === "error") {
                return res.json({
                    reply: "Չհաջողվեց ջնջել տեղեկությունը։"
                });
            }

            // ======================================
            // 3. FUTURE PREFERENCE
            // ======================================

            if (updateFuturePreference(userMessage)) {
                return res.json({
                    reply: "Հիշողությունս հաջողությամբ թարմացրի։ ❤️"
                });
            }

            // ======================================
            // 4. EXPLICIT REMEMBER COMMAND
            // ======================================

            const normalizedUserMessage =
                armenianTransliterate(userMessage);

            if (hasRememberCommand(normalizedUserMessage)) {
                const cleanMessage =
                    cleanRememberCommand(userMessage);

                const detected =
                    await analyzeMemoryWithGemini(cleanMessage);

                if (detected) {
                    if (detected.confidence >= 0.90) {
                        const currentMemory = loadMemory();

                        const result = saveDetectedMemory(
                            currentMemory,
                            detected
                        );

                        if (
                            result === "saved" ||
                            result === true
                        ) {
                            return res.json({
                                reply: saveMemory(currentMemory)
                                    ? "Հիշեցի և պահպանեցի հիշողությանս մեջ։ ❤️"
                                    : "Չհաջողվեց պահպանել տեղեկությունը։"
                            });
                        }

                        if (result === "exists") {
                            return res.json({
                                reply: "Այս տեղեկությունն արդեն հիշում եմ։ ❤️"
                            });
                        }
                    }

                    if (setPendingMemory(detected)) {
                        return res.json({
                            reply: `Ցանկանո՞ւմ ես, որ հիշեմ՝ ${detected.value}։ ❤️`
                        });
                    }
                }

                return res.json({
                    reply: "Չկարողացա հստակ հասկանալ՝ ինչ տեղեկություն պահպանեմ։"
                });
            }

            // ======================================
            // 5. MEMORY QUESTIONS
            // ======================================

            memory = loadMemory();

            console.log("ZENIX MEMORY GAMES:", memory.games);
            console.log("ZENIX USER QUESTION:", userMessage);

            console.log(
                "USER MEMORY BEFORE ANSWER:",
                JSON.stringify(memory, null, 2)
            );

            console.log("USER PREFERENCES:", memory?.preferences);

            const memoryAnswer = getMemoryAnswer(
                memory,
                "Armenian",
                userMessage
            );

            console.log("ZENIX MEMORY ANSWER:", memoryAnswer);

            if (memoryAnswer) {
                return res.json({
                    reply: memoryAnswer
                });
            }

            // ======================================
            // 6. AUTOMATIC MEMORY
            // ======================================

            console.log("MEMORY TEST MESSAGE:", userMessage);

            const automaticMemory =
                await saveAutomaticMemory(userMessage);

            console.log(
                "MEMORY TEST RESULT:",
                automaticMemory
            );

            if (automaticMemory === "saved") {
                return res.json({
                    reply: "Հասկացա և պահպանեցի հիշողությանս մեջ։ ❤️"
                });
            }

            if (automaticMemory === "exists") {
                return res.json({
                    reply: "Այս տեղեկությունն արդեն հիշում եմ։ ❤️"
                });
            }

            if (
                automaticMemory &&
                automaticMemory.status === "confirmation"
            ) {
                const detected = automaticMemory.detected;

                if (setPendingMemory(detected)) {
                    return res.json({
                        reply: `Ցանկանո՞ւմ ես, որ հիշեմ՝ ${detected.value}։ ❤️`
                    });
                }
            }

            if (automaticMemory === false) {
                console.log("MEMORY NOT SAVED");
            }

            // ======================================
            // 7. GEMINI CHAT
            // ======================================

            memory = loadMemory();

            const answer = await askGemini(
                history,
                memory
            );

            return res.json({
                reply: answer
            });

        } catch (error) {
            console.error("ZENIX CHAT ERROR:", error);

            return res.status(500).json({
                error: error.message || "Internal server error"
            });
        }
    }
);


/* =====================================================
   MEMORY STATUS
===================================================== */


app.get(
    "/api/memory",
    requireAuth,
    userMemoryContext,
    (req, res) => {
        try {
const history = loadUserHistory(req.user.userId);
            return res.json({
                userId: req.user.userId,
                summary: getMemorySummary(memory),
                memory
            });

        } catch (error) {
            console.error(
                "MEMORY API ERROR:",
                error.message
            );

            return res.status(500).json({
                error: "MEMORY_LOAD_FAILED"
            });
        }
    }
);

/* =====================================================
   START SERVER
===================================================== */

app.listen(PORT, () => {
    console.log(
        `ZENIX server running at http://localhost:${PORT}`
    );

    console.log(
        "ZENIX MEMORY DIRECTORY:",
        MEMORY_DIR
    );

    console.log(
        "ZENIX GEMINI MODEL:",
        GEMINI_MODEL
    );
});
// ==========================================
// GET USER CHAT HISTORY
// ==========================================

app.get(
    "/api/history",
    requireAuth,
    userMemoryContext,
    (req, res) => {
        try {
            const history = loadUserHistory();

            return res.json({
                success: true,
                history
            });

        } catch (error) {
            console.error(
                "HISTORY API ERROR:",
                error.message
            );

            return res.status(500).json({
                success: false,
                error: "HISTORY_LOAD_FAILED"
            });
        }
    }
);

 // ==========================================
// ZENIX CREATE NEW CHAT API
// ==========================================

app.post(
    "/api/chats",
    requireAuth,
    userMemoryContext,
    (req, res) => {
        let chatFile = null;

        try {
            const chats = loadUserChats();

            const chatId = makeChatId();
            const now = new Date().toISOString();

            const newChat = {
                id: chatId,
                title: "Նոր զրույց",
                createdAt: now,
                updatedAt: now
            };

            const paths = getUserChatsPaths();

            chatFile = path.join(
                paths.chatsDirectory,
                chatId + ".json"
            );

            fs.writeFileSync(
                chatFile,
                "[]",
                "utf8"
            );

            chats.unshift(newChat);

            if (!saveUserChats(chats)) {
                fs.unlinkSync(chatFile);

                return res.status(500).json({
                    success: false,
                    error: "CHAT_CREATE_FAILED"
                });
            }

            return res.json({
                success: true,
                chat: newChat
            });

        } catch (error) {
            if (chatFile && fs.existsSync(chatFile)) {
                fs.unlinkSync(chatFile);
            }

            console.error(
                "ZENIX CREATE CHAT ERROR:",
                error.message
            );

            return res.status(500).json({
                success: false,
                error: "CHAT_CREATE_FAILED"
            });
        }
    }
);

// ==========================================
// ZENIX CREATE NEW CHAT
// ==========================================

app.post(
    "/api/chats",
    requireAuth,
    userMemoryContext,
    (req, res) => {
        try {
            const chats = loadUserChats();

            const chatId = makeChatId();

            const now = new Date().toISOString();

            const newChat = {
                id: chatId,
                title: "Նոր զրույց",
                createdAt: now,
                updatedAt: now
            };

            chats.unshift(newChat);

            if (!saveUserChats(chats)) {
                return res.status(500).json({
                    success: false,
                    error: "CHAT_CREATE_FAILED"
                });
            }

            const paths = getUserChatsPaths();

            const chatFile = path.join(
                paths.chatsDirectory,
                chatId + ".json"
            );

            fs.writeFileSync(
                chatFile,
                "[]",
                "utf8"
            );

            return res.json({
                success: true,
                chat: newChat
            });

        } catch (error) {
            console.error(
                "ZENIX CREATE CHAT ERROR:",
                error.message
            );

            return res.status(500).json({
                success: false,
                error: "CHAT_CREATE_FAILED"
            });
        }
    }
);

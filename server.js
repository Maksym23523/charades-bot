const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "";
const MINI_APP_URL = process.env.MINI_APP_URL || "";
const BOT_MODE = process.env.TELEGRAM_BOT_MODE || "webhook";
const PUBLIC_DIR = path.join(__dirname, "public");
const PHOTO_DIR = path.join(__dirname, "фото");

const cardMeanings = [
  {
    id: 1,
    title: "Искра",
    keywords: ["начало", "смелость", "честный шаг"],
    meaning: "Эта карта говорит о моменте, где лучше начать с малого, но настоящего действия. Не ждите идеального знака: первый шаг уже открывает дорогу."
  },
  {
    id: 2,
    title: "Порог",
    keywords: ["выбор", "граница", "новый этап"],
    meaning: "Ситуация стоит на переходе. Важно не тащить старые сомнения туда, где уже требуется более ясное решение."
  },
  {
    id: 3,
    title: "Голос",
    keywords: ["разговор", "правда", "прояснение"],
    meaning: "Ответ придет через честные слова. То, что долго обходили молчанием, просит спокойного и прямого обсуждения."
  },
  {
    id: 4,
    title: "Опора",
    keywords: ["стабильность", "дом", "ресурс"],
    meaning: "Сейчас помогают простые вещи: режим, порядок, поддержка близких и внимание к телу. Не усложняйте там, где нужна прочная основа."
  },
  {
    id: 5,
    title: "Течение",
    keywords: ["мягкость", "адаптация", "доверие"],
    meaning: "Лучшее движение сейчас не силовое. Карта советует прислушаться к ритму событий и не ломать то, что можно обойти мягко."
  },
  {
    id: 6,
    title: "Зеркало",
    keywords: ["самоанализ", "честность", "отражение"],
    meaning: "Вопрос показывает не только внешнюю ситуацию, но и ваш внутренний настрой. Посмотрите, где ожидания меняют восприятие фактов."
  },
  {
    id: 7,
    title: "Дорога",
    keywords: ["движение", "поездка", "развитие"],
    meaning: "Путь уже складывается, даже если он пока не виден полностью. Выиграет тот вариант, где есть рост и живое движение."
  },
  {
    id: 8,
    title: "Узел",
    keywords: ["сложность", "привязка", "терпение"],
    meaning: "Не все решается одним рывком. Разделите проблему на части: узел ослабнет, когда вы перестанете тянуть сразу за все нити."
  },
  {
    id: 9,
    title: "Свет",
    keywords: ["ясность", "ответ", "открытие"],
    meaning: "Становится видно то, что раньше было скрыто. Доверяйте фактам и не отмахивайтесь от очевидного."
  },
  {
    id: 10,
    title: "Ключ",
    keywords: ["возможность", "решение", "доступ"],
    meaning: "У вас уже есть нужный инструмент или человек, который поможет открыть дверь. Вопрос в том, готовы ли вы им воспользоваться."
  },
  {
    id: 11,
    title: "Сад",
    keywords: ["рост", "забота", "созревание"],
    meaning: "Результат требует ухода и времени. Эта карта хороша для тем, где важны постепенность, внимание и бережное развитие."
  },
  {
    id: 12,
    title: "Ветер",
    keywords: ["перемены", "новости", "быстрый поворот"],
    meaning: "События могут ускориться. Оставьте себе пространство для маневра и не привязывайтесь к одному сценарию слишком жестко."
  },
  {
    id: 13,
    title: "Тень",
    keywords: ["страх", "скрытое", "границы"],
    meaning: "Карта просит посмотреть на то, чего вы избегаете. Не для тревоги, а чтобы вернуть себе контроль и поставить здоровые границы."
  },
  {
    id: 14,
    title: "Мост",
    keywords: ["связь", "примирение", "переход"],
    meaning: "Есть шанс соединить разные стороны вопроса. Ищите не победу любой ценой, а путь, где сохраняется контакт."
  },
  {
    id: 15,
    title: "Пламя",
    keywords: ["желание", "энергия", "страсть"],
    meaning: "В ситуации много силы и притяжения. Важно направить энергию в действие, а не в импульсивные обещания."
  },
  {
    id: 16,
    title: "Башня",
    keywords: ["перестройка", "кризис", "освобождение"],
    meaning: "Что-то старое может требовать пересмотра. Это не обязательно потеря: иногда освобождение начинается с честного демонтажа ненужного."
  },
  {
    id: 17,
    title: "Звезда",
    keywords: ["надежда", "ориентир", "исцеление"],
    meaning: "Карта возвращает веру в хороший исход, но просит держаться реального ориентира. Маленькие признаки улучшения важнее громких обещаний."
  },
  {
    id: 18,
    title: "Луна",
    keywords: ["интуиция", "тайна", "сон"],
    meaning: "Не все известно прямо сейчас. Дайте себе время, прислушайтесь к ощущениям и проверяйте догадки перед решением."
  }
];

const spreadPositions = {
  one: ["Ответ"]
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(requestUrl.pathname);

    if (req.method === "GET" && pathname === "/health") {
      return sendJson(res, 200, { ok: true });
    }

    if (pathname.startsWith("/api/")) {
      return handleApi(req, res, pathname);
    }

    if (req.method === "GET" && pathname.startsWith("/cards/")) {
      const fileName = path.basename(pathname);
      return serveFile(res, path.join(PHOTO_DIR, fileName), PHOTO_DIR);
    }

    if (req.method === "GET" && pathname.startsWith("/media/")) {
      const fileName = path.basename(pathname);
      return serveFile(res, path.join(PHOTO_DIR, fileName), PHOTO_DIR);
    }

    if (req.method === "GET") {
      const target = pathname === "/" ? "index.html" : pathname.slice(1);
      return serveFile(res, path.join(PUBLIC_DIR, target), PUBLIC_DIR);
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, async () => {
  console.log(`Card reading app is running on http://localhost:${PORT}`);
  console.log(getTelegramStatusText());

  const status = getTelegramStatus();
  if (status.readyForTelegramMiniApp) {
    try {
      console.log("Automatically registering webhook and menu button with Telegram...");
      const result = await setTelegramWebhook();
      console.log("Telegram registration result:", JSON.stringify(result));
    } catch (err) {
      console.error("Failed to automatically register with Telegram:", err.message);
    }
  }
});

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/cards") {
    return sendJson(res, 200, { cards: getCards() });
  }

  if (req.method === "GET" && pathname === "/api/telegram/status") {
    return sendJson(res, 200, getTelegramStatus());
  }

  if (req.method === "POST" && pathname === "/api/telegram/set-webhook") {
    return sendJson(res, 200, await setTelegramWebhook());
  }

  if (req.method === "POST" && pathname === "/api/reading") {
    const body = await readJson(req);
    const spread = "one";
    const pick = clampPick(body.pick);
    const question = normalizeText(body.question, 180);
    const positions = spreadPositions[spread];
    const cards = drawCards(positions.length).map((card, index) => ({
      ...card,
      position: positions[index]
    }));

    return sendJson(res, 200, {
      spread,
      pick,
      question,
      cards,
      summary: buildSummary(question, cards)
    });
  }

  if (req.method === "POST" && pathname === "/api/telegram/validate") {
    const body = await readJson(req);
    return sendJson(res, 200, validateTelegramInitData(body.initData || ""));
  }

  if (req.method === "POST" && pathname === "/api/telegram/webhook") {
    const update = await readJson(req);
    await handleTelegramUpdate(update, req);
    return sendJson(res, 200, { ok: true });
  }

  sendJson(res, 404, { error: "API route not found" });
}

function getCards() {
  return cardMeanings
    .filter((card) => fs.existsSync(path.join(PHOTO_DIR, `${card.id}.jpg`)))
    .map((card) => ({
      ...card,
      imageUrl: `/cards/${card.id}.jpg`
    }));
}

function drawCards(count) {
  const cards = getCards();
  const pool = [...cards];
  const result = [];

  while (result.length < count && pool.length > 0) {
    const index = crypto.randomInt(pool.length);
    result.push(pool.splice(index, 1)[0]);
  }

  return result;
}

function buildSummary(question, cards) {
  const focus = question ? `По вопросу "${question}"` : "По текущему запросу";
  const names = cards.map((card) => card.title).join(", ");

  if (cards.length === 1) {
    return `${focus} главная карта - ${names}. Она советует действовать спокойнее и опираться на самый ясный факт, который уже есть перед вами.`;
  }

  return `${focus} расклад показывает путь через ${names}. Сначала разберите причину, затем оцените реальность сегодняшнего дня и только после этого выбирайте действие.`;
}

async function handleTelegramUpdate(update, req) {
  if (!BOT_TOKEN) {
    console.log("Telegram update received, but TELEGRAM_BOT_TOKEN is empty.");
    return;
  }

  const message = update.message || update.edited_message;
  if (!message) {
    return;
  }

  const chatId = message.chat && message.chat.id;
  if (!chatId) {
    return;
  }

  if (message.web_app_data && message.web_app_data.data) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: formatWebAppResult(message.web_app_data.data)
    });
    return;
  }

  const text = typeof message.text === "string" ? message.text.trim() : "";

  if (text.startsWith("/start")) {
    if (!isPublicMiniAppUrl(MINI_APP_URL)) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: [
          "CHARADES почти готов.",
          "Чтобы открыть мини-приложение из Telegram, укажите публичный HTTPS-адрес в MINI_APP_URL и поставьте webhook."
        ].join("\n")
      });
      return;
    }

    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: "Открой CHARADES и выбери карту.",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Открыть CHARADES",
              web_app: { url: MINI_APP_URL }
            }
          ]
        ]
      }
    });
    return;
  }

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: "Напишите /start, чтобы открыть CHARADES."
  });
}

function formatWebAppResult(rawData) {
  try {
    const data = JSON.parse(rawData);
    const cards = Array.isArray(data.cards)
      ? data.cards.map((card) => `${card.position}: ${card.title}`).join("\n")
      : "";

    return ["Ваш расклад:", cards].filter(Boolean).join("\n\n");
  } catch {
    return `Ваш расклад:\n\n${rawData}`;
  }
}

function isPublicMiniAppUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1";
  } catch {
    return false;
  }
}

function getTelegramStatusText() {
  if (!BOT_TOKEN) {
    return "Telegram bot is not configured: TELEGRAM_BOT_TOKEN is empty.";
  }

  const botName = BOT_USERNAME ? `@${BOT_USERNAME}` : "bot";

  if (!isPublicMiniAppUrl(MINI_APP_URL)) {
    return `Telegram ${botName} token is configured. Set MINI_APP_URL to a public HTTPS URL before enabling the Mini App button.`;
  }

  return `Telegram ${botName} is configured in ${BOT_MODE} mode. Mini App URL: ${MINI_APP_URL}`;
}

function getTelegramStatus() {
  const publicMiniAppUrl = isPublicMiniAppUrl(MINI_APP_URL);

  return {
    botConfigured: Boolean(BOT_TOKEN),
    botUsername: BOT_USERNAME ? `@${BOT_USERNAME}` : "",
    mode: BOT_MODE,
    miniAppUrl: MINI_APP_URL,
    publicMiniAppUrl,
    webhookUrl: publicMiniAppUrl ? `${MINI_APP_URL.replace(/\/+$/, "")}/api/telegram/webhook` : "",
    readyForTelegramMiniApp: Boolean(BOT_TOKEN && publicMiniAppUrl)
  };
}

async function setTelegramWebhook() {
  const status = getTelegramStatus();

  if (!status.botConfigured) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured", status };
  }

  if (!status.publicMiniAppUrl) {
    return { ok: false, error: "MINI_APP_URL must be a public HTTPS URL", status };
  }

  const telegramResponse = await callTelegram("setWebhook", {
    url: status.webhookUrl,
    allowed_updates: ["message"]
  });

  const menuResponse = await callTelegram("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "CHARADES",
      web_app: { url: status.miniAppUrl }
    }
  });

  return { ok: true, telegramResponse, menuResponse, status };
}

async function callTelegram(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Telegram API error ${response.status}: ${text}`);
    return { ok: false, status: response.status, error: text };
  }

  return response.json();
}

function validateTelegramInitData(initData) {
  if (!BOT_TOKEN) {
    return { valid: false, reason: "TELEGRAM_BOT_TOKEN is not configured" };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    return { valid: false, reason: "Missing hash" };
  }

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
  const valid = safeCompare(hash, calculatedHash);

  return { valid };
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeText(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function clampPick(value) {
  const pick = Number(value);

  if (!Number.isInteger(pick)) {
    return 1;
  }

  return Math.min(5, Math.max(1, pick));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error("Request body is too large"));
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });

    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function serveFile(res, filePath, rootDir) {
  const normalizedRoot = path.resolve(rootDir);
  const normalizedPath = path.resolve(filePath);

  if (!isPathInside(normalizedRoot, normalizedPath)) {
    return sendJson(res, 403, { error: "Forbidden" });
  }

  fs.readFile(normalizedPath, (error, content) => {
    if (error) {
      if (path.extname(normalizedPath)) {
        return sendJson(res, 404, { error: "File not found" });
      }

      return serveFile(res, path.join(PUBLIC_DIR, "index.html"), PUBLIC_DIR);
    }

    const extension = path.extname(normalizedPath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": extension === ".html" ? "no-store" : "public, max-age=3600"
    });
    res.end(content);
  });
}

function isPathInside(rootDir, filePath) {
  const relative = path.relative(rootDir, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function getRequestBaseUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}`;
}

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

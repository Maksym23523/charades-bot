const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "";
const MINI_APP_URL = process.env.MINI_APP_URL || "";
const BOT_MODE = process.env.TELEGRAM_BOT_MODE || "webhook";
const PUBLIC_DIR = path.join(__dirname, "public");
const PHOTO_DIR = path.join(__dirname, "фото");

const VIP_BYPASS_USERNAMES = ["ue_herosava", "perekati_pole67", "hahaxyu", "maksim_0000", "krytish_07"];
const ADMIN_USERNAMES = ["maksim_0000"];
const ADMIN_USERIDS = ["488863311"];

// --- DATABASE LAYER (SUPABASE) ---
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

async function callSupabase(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Supabase URL or Key is not configured!");
    return null;
  }

  const url = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`;
  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`Supabase API error (${response.status}): ${text}`);
      return null;
    }
    
    if (response.status === 204) {
      return true;
    }

    return await response.json();
  } catch (err) {
    console.error("Supabase request failed:", err);
    return null;
  }
}

function decodeUserData(record) {
  const timestamps = (record && Array.isArray(record.reading_timestamps)) ? record.reading_timestamps : [];
  
  let telegramSubscribed = false;
  let invitedFriendsCount = 0;
  let extraSpins = 0;
  let blocked = false;
  let streakDay = 0;
  let lastStreakClaimDays = 0;
  const actualReadingTimestamps = [];

  for (const t of timestamps) {
    if (t === -10000) {
      telegramSubscribed = true;
    } else if (t === -40000) {
      blocked = true;
    } else if (t <= -20000 && t > -30000) {
      invitedFriendsCount = Math.abs(t) - 20000;
    } else if (t <= -30000 && t > -40000) {
      extraSpins = Math.abs(t) - 30000;
    } else if (t <= -50000 && t > -60000) {
      streakDay = Math.abs(t) - 50000;
    } else if (t <= -60000 && t > -200000) {
      lastStreakClaimDays = Math.abs(t) - 60000;
    } else if (t > 0) {
      actualReadingTimestamps.push(t);
    }
  }

  return {
    telegramSubscribed,
    invitedFriendsCount,
    extraSpins,
    blocked,
    streakDay,
    lastStreakClaimDays,
    readingTimestamps: actualReadingTimestamps
  };
}

function encodeUserData(actualReadingTimestamps, telegramSubscribed, invitedFriendsCount, extraSpins, blocked, streakDay = 0, lastStreakClaimDays = 0) {
  const arr = [...actualReadingTimestamps];
  if (telegramSubscribed) {
    arr.push(-10000);
  }
  if (blocked) {
    arr.push(-40000);
  }
  if (invitedFriendsCount > 0) {
    arr.push(-20000 - invitedFriendsCount);
  }
  if (extraSpins > 0) {
    arr.push(-30000 - extraSpins);
  }
  if (streakDay > 0) {
    arr.push(-50000 - streakDay);
  }
  if (lastStreakClaimDays > 0) {
    arr.push(-60000 - lastStreakClaimDays);
  }
  return arr;
}

async function getUserRecord(userId, username) {
  const strUserId = userId ? String(userId) : null;
  const cleanUsername = username ? username.toLowerCase().replace(/^@/, "") : null;
  
  if (!strUserId && !cleanUsername) {
    return null;
  }

  let query = "";
  if (strUserId && cleanUsername) {
    query = `or=(id.eq.${strUserId},username.ilike.${cleanUsername})`;
  } else if (strUserId) {
    query = `id.eq.${strUserId}`;
  } else {
    query = `username.ilike.${cleanUsername}`;
  }

  const records = await callSupabase(`users?${query}`);
  if (!records || records.length === 0) {
    return null;
  }

  let record = records.find(r => r.id === strUserId);
  if (!record) {
    record = records[0];
  }

  return record;
}

async function getUserData(userId, username) {
  const strUserId = userId ? String(userId) : null;
  const cleanUsername = username ? username.toLowerCase().replace(/^@/, "") : null;
  
  let record = await getUserRecord(strUserId, cleanUsername);
  
  if (record) {
    // Migration: If record was stored under username key
    if (strUserId && record.id !== strUserId) {
      const oldId = record.id;
      await callSupabase(`users?id=eq.${oldId}`, { method: "DELETE" });
      
      record.id = strUserId;
      if (cleanUsername) record.username = cleanUsername;
      
      await callSupabase("users", {
        method: "POST",
        body: JSON.stringify(record)
      });
    } else if (cleanUsername && record.username !== cleanUsername) {
      record.username = cleanUsername;
      await callSupabase("users", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates" },
        body: JSON.stringify({
          id: record.id,
          username: cleanUsername
        })
      });
    }
  } else {
    record = {
      id: strUserId || cleanUsername,
      username: cleanUsername,
      vip_until: null,
      reading_timestamps: []
    };
    
    await callSupabase("users", {
      method: "POST",
      body: JSON.stringify(record)
    });
  }

  const decoded = decodeUserData(record);

  const appUser = {
    id: record.id,
    username: record.username,
    vipUntil: record.vip_until,
    readingTimestamps: decoded.readingTimestamps,
    telegramSubscribed: decoded.telegramSubscribed,
    invitedFriendsCount: decoded.invitedFriendsCount,
    extraSpins: decoded.extraSpins,
    blocked: decoded.blocked,
    streakDay: decoded.streakDay || 0,
    lastStreakClaimDays: decoded.lastStreakClaimDays || 0
  };

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const originalLength = appUser.readingTimestamps.length;
  appUser.readingTimestamps = appUser.readingTimestamps.filter(t => t > oneDayAgo);

  if (appUser.readingTimestamps.length !== originalLength) {
    const encodedTimestamps = encodeUserData(
      appUser.readingTimestamps,
      appUser.telegramSubscribed,
      appUser.invitedFriendsCount,
      appUser.extraSpins,
      appUser.blocked,
      appUser.streakDay,
      appUser.lastStreakClaimDays
    );
    await callSupabase("users", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({
        id: appUser.id,
        reading_timestamps: encodedTimestamps
      })
    });
  }

  return appUser;
}

async function updateUserData(userId, username, updater) {
  const appUser = await getUserData(userId, username);
  if (!appUser) return;

  updater(appUser);

  const encodedTimestamps = encodeUserData(
    appUser.readingTimestamps,
    appUser.telegramSubscribed,
    appUser.invitedFriendsCount,
    appUser.extraSpins,
    appUser.blocked,
    appUser.streakDay,
    appUser.lastStreakClaimDays
  );

  await callSupabase("users", {
    method: "POST",
    headers: { "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify({
      id: appUser.id,
      username: appUser.username,
      vip_until: appUser.vipUntil,
      reading_timestamps: encodedTimestamps
    })
  });
}

function getRewardForDay(d) {
  if (d === 1) return { extraSpins: 5, label: "+5 прокрутов", icon: "⚡️" };
  if (d === 2) return { extraSpins: 10, label: "+10 прокрутов", icon: "⚡️" };
  if (d === 3) return { extraSpins: 15, label: "+15 прокрутов", icon: "⚡️" };
  if (d === 4) return { extraSpins: 20, label: "+20 прокрутов", icon: "⚡️" };
  if (d === 5) return { extraSpins: 25, label: "+25 прокрутов", icon: "⚡️" };
  if (d === 6) return { extraSpins: 30, label: "+30 прокрутов", icon: "⚡️" };
  if (d % 7 === 0) return { vipHours: 1, label: "🎁 VIP-статус на 1 час", icon: "🎁", isVip: true };
  return { extraSpins: 25, label: "+25 прокрутов", icon: "⚡️" };
}

function getStreakInfo(userData) {
  const todayDays = Math.floor(Date.now() / 86400000);
  const lastDays = userData.lastStreakClaimDays || 0;
  const currentStreakDay = userData.streakDay || 0;

  let canClaim = false;
  let nextDay = 1;

  if (lastDays === todayDays) {
    canClaim = false;
    nextDay = currentStreakDay === 0 ? 1 : currentStreakDay;
  } else if (lastDays === todayDays - 1) {
    canClaim = true;
    nextDay = currentStreakDay + 1;
  } else {
    canClaim = true;
    nextDay = 1;
  }

  return {
    currentStreakDay,
    lastStreakClaimDays: lastDays,
    todayDays,
    canClaim,
    nextDay,
    claimedToday: lastDays === todayDays
  };
}

function isUserVip(user) {
  if (!user.vipUntil) return false;
  return new Date(user.vipUntil) > new Date();
}

async function callTelegramMultipart(method, fields, fileField) {
  if (!BOT_TOKEN) {
    throw new Error("Telegram bot token is not configured");
  }

  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
  const chunks = [];

  for (const [key, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${typeof value === "object" ? JSON.stringify(value) : value}\r\n`
    ));
  }

  if (fileField) {
    const { name, filename, contentType, data } = fileField;
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
    ));
    chunks.push(data);
    chunks.push(Buffer.from("\r\n"));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  const bodyBuffer = Buffer.concat(chunks);

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`
    },
    body: bodyBuffer
  });

  return await res.json();
}

async function generateMasterStickerBuffer(name, avatarUrl) {
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, 512, 512);

  // Outer Glow
  const outerGrad = ctx.createRadialGradient(256, 256, 180, 256, 256, 250);
  outerGrad.addColorStop(0, "rgba(255, 215, 0, 0.15)");
  outerGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = outerGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Background Card
  const cardGrad = ctx.createLinearGradient(36, 36, 476, 476);
  cardGrad.addColorStop(0, "#221c10");
  cardGrad.addColorStop(0.5, "#16120c");
  cardGrad.addColorStop(1, "#0d0b08");

  ctx.fillStyle = cardGrad;
  ctx.beginPath();
  ctx.roundRect(36, 36, 440, 440, 32);
  ctx.fill();

  // Gold Border
  const borderGrad = ctx.createLinearGradient(36, 36, 476, 476);
  borderGrad.addColorStop(0, "#ffd700");
  borderGrad.addColorStop(0.5, "#b38728");
  borderGrad.addColorStop(1, "#fbf5b7");
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 6;
  ctx.stroke();

  // Inner Glow Ring
  ctx.strokeStyle = "rgba(255, 215, 0, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(48, 48, 416, 416, 24);
  ctx.stroke();

  // Seal Emoji 🏆
  ctx.font = "46px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🏆", 256, 92);

  // Eyebrow
  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = "#cca625";
  ctx.fillText("ОФИЦИАЛЬНЫЙ СЕРТИФИКАТ", 256, 138);

  // Title "ВЕЛИКИЙ МАГИСТР"
  ctx.font = "bold 21px sans-serif";
  ctx.fillStyle = "#ffd700";
  ctx.fillText("ВЕЛИКИЙ МАГИСТР", 256, 168);

  // Subtitle "CHARADES"
  ctx.font = "900 26px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("CHARADES", 256, 202);

  // Gold Line
  ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(96, 224);
  ctx.lineTo(416, 224);
  ctx.stroke();

  // Avatar Circle
  const avatarX = 256;
  const avatarY = 284;
  const avatarRadius = 38;

  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 3, 0, Math.PI * 2);
  ctx.fillStyle = borderGrad;
  ctx.fill();

  let avatarLoaded = false;
  if (avatarUrl) {
    try {
      const img = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
      ctx.restore();
      avatarLoaded = true;
    } catch (e) {
      console.error("Failed to load user avatar for sticker:", e.message);
    }
  }

  if (!avatarLoaded) {
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#3a2e18";
    ctx.fill();
    ctx.font = "34px sans-serif";
    ctx.fillStyle = "#ffd700";
    ctx.fillText("🔮", avatarX, avatarY + 2);
  }

  // User Name
  ctx.font = "bold 19px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(name || "Игрок", 256, 354);

  // Badge "100% КОЛЛЕКЦИЯ"
  ctx.fillStyle = "rgba(255, 215, 0, 0.15)";
  ctx.beginPath();
  ctx.roundRect(136, 386, 240, 34, 17);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = "#ffd700";
  ctx.fillText("100% КОЛЛЕКЦИЯ ОТКРЫТА", 256, 403);

  return canvas.toBuffer("image/png");
}
// ----------------------

const cardMeanings = [
  {
    id: 1,
    title: "Кенгуру со сковородкой",
    meaning: "Внуки утонут на отдыхе."
  },
  {
    id: 2,
    title: "Енот на машине",
    meaning: "Смерть обоих родителей в течение недели, вас завтра собьёт машина."
  },
  {
    id: 4,
    title: "Медведь на скейтборде",
    meaning: "Завтра к матери домой прилетает шахед."
  },
  {
    id: 5,
    title: "Конь с удочкой",
    meaning: "Смерть всех детей."
  },
  {
    id: 6,
    title: "Белка плавает",
    meaning: "Завтра ноги отнимутся, смерть в течение года от рака."
  },
  {
    id: 8,
    title: "Жирафик с пузыриками",
    meaning: "Возвращение с СВО, но без всех конечностей, а также смерть матери к тому времени."
  },
  {
    id: 9,
    title: "Собака с клюшкой",
    meaning: "Денег у вас никогда не будет, жизнь в нищете, смерть под мостом."
  },
  {
    id: 11,
    title: "Дельфин боксёр",
    meaning: "Смерть матери на завтрашний день."
  },
  {
    id: 12,
    title: "Цыплёнок с кисточкой",
    meaning: "Благоприятный исход, смерть к 34 годам от наркотиков под мостом."
  },
  {
    id: 13,
    title: "Свинья балерина",
    meaning: "Смерть матери послезавтра."
  },
  {
    id: 14,
    title: "Конь с пампушками",
    meaning: "Вся семья на СВО."
  },
  {
    id: 15,
    title: "Лев с футбольным мячом",
    meaning: "Мама в болоте утонет."
  },
  {
    id: 16,
    title: "Тигрёнок фокусник",
    meaning: "Завтра умирает мать и от горя ноги отнимутся."
  },
  {
    id: 18,
    title: "Сова со скакалкой",
    meaning: ""
  },
  {
    id: 19,
    title: "Индюк-пират",
    meaning: "Хуй на СВО оторвёт."
  },
  {
    id: 20,
    title: "Цыпля с тележкой",
    meaning: "Мать будет лежать в гробу."
  },
  {
    id: 21,
    title: "Пингвин с воздушным змеем",
    meaning: "К вашей маме прилетит фламинго и оторвёт ей 2 ноги."
  },
  {
    id: 22,
    title: "Хуй знает",
    meaning: "Точно не хуже совы со скакалкой."
  },
  {
    id: 23,
    title: "Курица-космонавт",
    meaning: "Вся семья на СВО сдохнет."
  },
  {
    id: 24,
    title: "Мартышка с шариками",
    meaning: "Вас пустят по кругу и сломают хребет."
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
  ".mp3": "audio/mpeg",
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
  if (req.method === "POST" && pathname === "/api/admin/stats") {
    const body = await readJson(req);
    const initDataValidation = validateTelegramInitData(body.initData || "");
    if (!initDataValidation.valid || !initDataValidation.user) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }
    
    const userId = initDataValidation.user.id;
    const username = initDataValidation.user.username;
    const cleanUsername = username ? username.toLowerCase().replace(/^@/, "") : "";
    
    if (!ADMIN_USERNAMES.includes(cleanUsername) && !ADMIN_USERIDS.includes(String(userId))) {
      return sendJson(res, 403, { error: "Forbidden" });
    }
    
    const records = await callSupabase("users") || [];
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    let totalUsers = records.length;
    let vipUsers = 0;
    let activeUsersToday = 0;
    let totalDrawsToday = 0;
    let blockedUsers = 0;
    
    const processedUsers = records.map(record => {
      const decoded = decodeUserData(record);
      const usernameClean = record.username ? record.username.toLowerCase().replace(/^@/, "") : "";
      const isVip = VIP_BYPASS_USERNAMES.includes(usernameClean) || (record.vip_until && new Date(record.vip_until) > new Date());
      
      if (isVip) vipUsers++;
      if (decoded.blocked) blockedUsers++;
      
      const todayTimestamps = decoded.readingTimestamps.filter(t => t > oneDayAgo);
      const drawsTodayCount = todayTimestamps.length;
      if (drawsTodayCount > 0) {
        activeUsersToday++;
        totalDrawsToday += drawsTodayCount;
      }
      
      return {
        id: record.id,
        username: record.username || "unknown",
        isVip,
        vipUntil: record.vip_until,
        drawsTodayCount,
        invitedFriendsCount: decoded.invitedFriendsCount,
        extraSpins: decoded.extraSpins,
        isBlocked: decoded.blocked
      };
    });
    
    processedUsers.sort((a, b) => b.drawsTodayCount - a.drawsTodayCount || a.username.localeCompare(b.username));
    
    return sendJson(res, 200, {
      stats: {
        totalUsers,
        vipUsers,
        activeUsersToday,
        totalDrawsToday,
        blockedUsers
      },
      users: processedUsers
    });
  }

  if (req.method === "GET" && pathname === "/api/cards") {
    return sendJson(res, 200, { cards: getCards() });
  }

  if (req.method === "GET" && pathname === "/api/telegram/status") {
    return sendJson(res, 200, getTelegramStatus());
  }

  if (req.method === "POST" && pathname === "/api/telegram/set-webhook") {
    return sendJson(res, 200, await setTelegramWebhook());
  }

  if (req.method === "POST" && pathname === "/api/user/status") {
    const body = await readJson(req);
    const initDataValidation = validateTelegramInitData(body.initData || "");
    if (!initDataValidation.valid || !initDataValidation.user) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }
    
    const userId = initDataValidation.user.id;
    const username = initDataValidation.user.username;
    const userData = await getUserData(userId, username);
    
    // Check for hardcoded unlimited users (VIP overrides)
    const cleanUsername = username ? username.toLowerCase().replace(/^@/, "") : "";
    const hasUnlimitedAccess = VIP_BYPASS_USERNAMES.includes(cleanUsername);
    
    const isVip = hasUnlimitedAccess || isUserVip(userData);
    
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    userData.readingTimestamps = (userData.readingTimestamps || []).filter(t => t > oneDayAgo);
    
    const count = userData.readingTimestamps.length;
    let nextAvailableInMs = 0;
    if (count >= 5) {
      const oldest = Math.min(...userData.readingTimestamps);
      nextAvailableInMs = Math.max(0, oldest + 24 * 60 * 60 * 1000 - Date.now());
    }
    
    return sendJson(res, 200, {
      userId,
      isVip,
      isAdmin: ADMIN_USERNAMES.includes(cleanUsername) || ADMIN_USERIDS.includes(String(userId)),
      vipUntil: userData.vipUntil,
      readingsToday: count,
      limit: 5,
      nextAvailableInMs,
      extraSpins: userData.extraSpins || 0,
      telegramSubscribed: userData.telegramSubscribed || false,
      invitedFriendsCount: userData.invitedFriendsCount || 0,
      streakInfo: getStreakInfo(userData),
      botUsername: BOT_USERNAME,
      telegramChannelUsername: process.env.TELEGRAM_CHANNEL_USERNAME || "@charadesgame"
    });
  }

  if (req.method === "POST" && pathname === "/api/streak/claim") {
    const body = await readJson(req);
    const initDataValidation = validateTelegramInitData(body.initData || "");
    if (!initDataValidation.valid || !initDataValidation.user) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    const userId = initDataValidation.user.id;
    const username = initDataValidation.user.username;

    let claimResult = null;
    let errorMsg = null;

    await updateUserData(userId, username, (u) => {
      const streak = getStreakInfo(u);
      if (!streak.canClaim) {
        errorMsg = "Вы уже забрали сегодня бонус! Приходите завтра.";
        return;
      }

      const dayToClaim = streak.nextDay;
      const reward = getRewardForDay(dayToClaim);

      u.streakDay = dayToClaim;
      u.lastStreakClaimDays = streak.todayDays;

      if (reward.extraSpins) {
        u.extraSpins = (u.extraSpins || 0) + reward.extraSpins;
      }

      if (reward.vipHours) {
        const nowMs = Date.now();
        const currentVipMs = u.vipUntil ? new Date(u.vipUntil).getTime() : 0;
        const baseMs = Math.max(nowMs, currentVipMs);
        u.vipUntil = new Date(baseMs + reward.vipHours * 60 * 60 * 1000).toISOString();
      }

      claimResult = {
        claimedDay: dayToClaim,
        rewardLabel: reward.label,
        reward
      };
    });

    if (errorMsg) {
      return sendJson(res, 400, { error: errorMsg });
    }

    const updatedUser = await getUserData(userId, username);
    const updatedStreak = getStreakInfo(updatedUser);

    const cleanUsername = username ? username.toLowerCase().replace(/^@/, "") : "";
    const hasUnlimitedAccess = VIP_BYPASS_USERNAMES.includes(cleanUsername);
    const isVip = hasUnlimitedAccess || isUserVip(updatedUser);

    return sendJson(res, 200, {
      ok: true,
      claimResult,
      streakInfo: updatedStreak,
      extraSpins: updatedUser.extraSpins || 0,
      vipUntil: updatedUser.vipUntil,
      isVip
    });
  }

  if (req.method === "POST" && pathname === "/api/collector/sticker-pack") {
    const body = await readJson(req);
    const initDataValidation = validateTelegramInitData(body.initData || "");
    if (!initDataValidation.valid || !initDataValidation.user) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    const completionCount = Number(body.completionCount || 1);
    if (completionCount >= 2) {
      return sendJson(res, 200, { ok: true, stickerPackUrl: "https://t.me/addstickers/Charades5" });
    }

    const userId = initDataValidation.user.id;
    const tgUser = initDataValidation.user;

    const cleanBotUsername = BOT_USERNAME.replace("@", "").toLowerCase() || "charadesgame_bot";
    const setName = `master_${userId}_by_${cleanBotUsername}`;
    const stickerPackUrl = `https://t.me/addstickers/${setName}`;

    try {
      const checkResult = await callTelegram("getStickerSet", { name: setName });
      if (checkResult.ok) {
        return sendJson(res, 200, { ok: true, stickerPackUrl });
      }
    } catch (e) {}

    let nameStr = "Игрок";
    if (tgUser.username) {
      nameStr = `@${tgUser.username}`;
    } else {
      nameStr = `${tgUser.first_name || ""} ${tgUser.last_name || ""}`.trim() || "Игрок";
    }

    try {
      const pngBuffer = await generateMasterStickerBuffer(nameStr, tgUser.photo_url || null);

      const stickersPayload = [
        {
          emoji_list: ["🏆", "🔮"],
          format: "static",
          sticker: "attach://sticker_file"
        }
      ];

      const createResult = await callTelegramMultipart(
        "createNewStickerSet",
        {
          user_id: userId,
          name: setName,
          title: `CHARADES — ${nameStr}`,
          stickers: JSON.stringify(stickersPayload),
          sticker_format: "static"
        },
        {
          name: "sticker_file",
          filename: "sticker.png",
          contentType: "image/png",
          data: pngBuffer
        }
      );

      if (createResult.ok) {
        return sendJson(res, 200, { ok: true, stickerPackUrl });
      } else {
        console.error("createNewStickerSet failed:", JSON.stringify(createResult));
        return sendJson(res, 200, { ok: true, stickerPackUrl: "https://t.me/addstickers/Charades5", fallback: true });
      }
    } catch (err) {
      console.error("Sticker generation error:", err);
      return sendJson(res, 200, { ok: true, stickerPackUrl: "https://t.me/addstickers/Charades5", fallback: true });
    }
  }

  if (req.method === "POST" && pathname === "/api/telegram/create-invoice") {
    const body = await readJson(req);
    const initDataValidation = validateTelegramInitData(body.initData || "");
    if (!initDataValidation.valid || !initDataValidation.user) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    const userId = initDataValidation.user.id;
    
    const result = await callTelegram("createInvoiceLink", {
      title: "VIP Статус — 1 месяц",
      description: "Безлимитные гадания и доступ к полной коллекции карт на 30 дней",
      payload: `vip_subscription_30days_${userId}_${Date.now()}`,
      currency: "XTR",
      prices: [
        { label: "VIP Статус", amount: 49 }
      ]
    });

    if (result.ok) {
      return sendJson(res, 200, { ok: true, invoiceLink: result.result });
    } else {
      console.error("Failed to create invoice link:", result);
      return sendJson(res, 500, { ok: false, error: "Failed to create invoice" });
    }
  }

  if (req.method === "POST" && pathname === "/api/reading") {
    const body = await readJson(req);
    
    const initDataValidation = validateTelegramInitData(body.initData || "");
    if (!initDataValidation.valid || !initDataValidation.user) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }
    
    const userId = initDataValidation.user.id;
    const username = initDataValidation.user.username;
    const userData = await getUserData(userId, username);
    
    // Check for hardcoded unlimited users (VIP overrides)
    const cleanUsername = username ? username.toLowerCase().replace(/^@/, "") : "";
    const hasUnlimitedAccess = VIP_BYPASS_USERNAMES.includes(cleanUsername);
    
    const isVip = hasUnlimitedAccess || isUserVip(userData);
    
    if (!isVip) {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      userData.readingTimestamps = (userData.readingTimestamps || []).filter(t => t > oneDayAgo);
      
      const count = userData.readingTimestamps.length;
      if (count >= 5) {
        if (userData.extraSpins > 0) {
          // Consume one extra spin!
          await updateUserData(userId, username, (u) => {
            u.extraSpins = Math.max(0, (u.extraSpins || 0) - 1);
          });
        } else {
          const oldest = Math.min(...userData.readingTimestamps);
          const cooldown = Math.max(0, oldest + 24 * 60 * 60 * 1000 - Date.now());
          return sendJson(res, 403, { 
            error: "Limit reached", 
            reason: "DAILY_LIMIT_EXHAUSTED",
            nextAvailableInMs: cooldown
          });
        }
      } else {
        // Use standard daily limit
        await updateUserData(userId, username, (u) => {
          if (!u.readingTimestamps) u.readingTimestamps = [];
          u.readingTimestamps.push(Date.now());
        });
      }
    }

    const spread = "one";
    const pick = clampPick(body.pick);
    const question = normalizeText(body.question, 180);
    const positions = spreadPositions[spread];
    const cards = drawCardsForUser(positions.length, cleanUsername).map((card, index) => ({
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

  if (req.method === "POST" && pathname === "/api/quests/verify-telegram") {
    const body = await readJson(req);
    const initDataValidation = validateTelegramInitData(body.initData || "");
    if (!initDataValidation.valid || !initDataValidation.user) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }
    
    const userId = initDataValidation.user.id;
    const username = initDataValidation.user.username;
    
    const channel = process.env.TELEGRAM_CHANNEL_USERNAME || "@charadesgame";
    
    const chatMember = await callTelegram("getChatMember", {
      chat_id: channel,
      user_id: userId
    });
    
    if (chatMember && chatMember.ok) {
      const status = chatMember.result.status;
      const isSubscribed = ["member", "administrator", "creator"].includes(status);
      
      if (isSubscribed) {
        let rewardClaimed = false;
        await updateUserData(userId, username, (u) => {
          if (!u.telegramSubscribed) {
            u.telegramSubscribed = true;
            u.extraSpins = (u.extraSpins || 0) + 5;
            rewardClaimed = true;
          }
        });
        return sendJson(res, 200, { ok: true, isSubscribed: true, rewardClaimed });
      } else {
        return sendJson(res, 200, { ok: true, isSubscribed: false, error: "Вы не подписаны на канал." });
      }
    } else {
      console.error("Failed to check chat member status:", chatMember);
      return sendJson(res, 200, {
        ok: false,
        isSubscribed: false,
        error: "Не удалось подтвердить подписку. Убедитесь, что вы подписались на канал, а бот добавлен в администраторы канала."
      });
    }
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

function drawCardsForUser(count, cleanUsername) {
  // If the user is @anonim1951, card 18 (Сова со скакалкой) has a 100% chance to drop
  if (cleanUsername === "anonim1951" && count === 1) {
    const cards = getCards();
    const card18 = cards.find(c => c.id === 18);
    if (card18) {
      return [card18];
    }
  }

  // If the user is @perekati_pole67, card 18 (Сова со скакалкой) has a 33% chance to drop
  if (cleanUsername === "perekati_pole67" && count === 1) {
    const isSpecialDraw = crypto.randomInt(100) < 33;
    if (isSpecialDraw) {
      const cards = getCards();
      const card18 = cards.find(c => c.id === 18);
      if (card18) {
        return [card18];
      }
    }
  }

  return drawCards(count);
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

  if (update.my_chat_member) {
    const chat = update.my_chat_member.chat;
    if (chat && chat.type === "private") {
      const userId = chat.id;
      const username = update.my_chat_member.from && update.my_chat_member.from.username;
      const status = update.my_chat_member.new_chat_member && update.my_chat_member.new_chat_member.status;
      
      const isBlocked = status === "kicked";
      
      await updateUserData(userId, username, (u) => {
        u.blocked = isBlocked;
      });
    }
    return;
  }

  if (update.pre_checkout_query) {
    await callTelegram("answerPreCheckoutQuery", {
      pre_checkout_query_id: update.pre_checkout_query.id,
      ok: true
    });
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

  const userId = message.from && message.from.id;
  const username = message.from && message.from.username;
  if (userId) {
    await updateUserData(userId, username, (u) => {
      u.blocked = false;
    });
  }

  if (message.successful_payment) {
    const payload = message.successful_payment.invoice_payload;
    const userId = message.from && message.from.id;
    const username = message.from && message.from.username;
    
    if (userId && payload && payload.startsWith("vip_subscription_30days")) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      await updateUserData(userId, username, (u) => {
        u.vipUntil = thirtyDaysFromNow.toISOString();
      });

      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: "🎉 Спасибо! Ваша оплата получена. VIP-статус на 1 месяц успешно активирован! Теперь у вас безлимитное количество гаданий. Откройте приложение снова, чтобы проверить."
      });
    }
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
    // Parse referral code if present
    const parts = text.split(" ");
    let referrerId = null;
    if (parts.length > 1) {
      const param = parts[1].trim();
      if (param.startsWith("ref_")) {
        referrerId = param.slice(4);
      } else if (param.startsWith("ref")) {
        referrerId = param.slice(3);
      } else if (/^\d+$/.test(param)) {
        referrerId = param;
      }
    }

    const currentUserId = message.from && message.from.id;
    const currentUsername = message.from && message.from.username;

    if (currentUserId && referrerId && String(referrerId) !== String(currentUserId)) {
      const existingUser = await getUserRecord(currentUserId, currentUsername);
      if (!existingUser) {
        // Initialize the new user record to prevent multiple referral rewards
        await getUserData(currentUserId, currentUsername);

        const referrerRecord = await getUserRecord(referrerId, null);
        if (referrerRecord) {
          let addedReward = 20;
          await updateUserData(referrerId, referrerRecord.username, (u) => {
            u.extraSpins = (u.extraSpins || 0) + addedReward;
            u.invitedFriendsCount = (u.invitedFriendsCount || 0) + 1;
          });

          await callTelegram("sendMessage", {
            chat_id: referrerId,
            text: `🎉 По вашей реферальной ссылке зарегистрировался новый пользователь! Вам начислено ${addedReward} дополнительных прокрутов.`
          });
        }
      }
    }

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
      text: [
        "🔮 Добро пожаловать в CHARADES — ваш проводник в мир гаданий и предсказаний!",
        "",
        "Как пользоваться ботом:",
        "1️⃣ Нажмите кнопку «Открыть CHARADES» ниже, чтобы запустить приложение.",
        "2️⃣ Введите свой вопрос или сферу жизни, о которой хотите узнать.",
        "3️⃣ Выберите карту из колоды — она покажет ответ на ваш вопрос.",
        "4️⃣ Открывайте новые карты, чтобы пополнить свою личную коллекцию в Профиле!",
        "",
        "🎁 Каждый день вам доступно 5 бесплатных гаданий.",
        "👑 Чтобы получить неограниченный доступ и отключить рекламу, вы можете приобрести VIP-статус.",
        "",
        "Готовы узнать свою судьбу? Нажмите кнопку ниже! 👇"
      ].join("\n"),
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
    allowed_updates: ["message", "pre_checkout_query", "my_chat_member"]
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

  let user = null;
  if (valid) {
    try {
      const userStr = params.get("user");
      if (userStr) {
        user = JSON.parse(userStr);
      }
    } catch (e) {
      console.error("Error parsing user in initData:", e);
    }
  }

  return { valid, user };
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

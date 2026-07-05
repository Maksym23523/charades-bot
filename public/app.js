const PROFILE_STORAGE_PREFIX = "card-reading-profile:v3";
const COUNT_STEP_MS = 420;

const state = {
  cards: [],
  lastReading: null,
  profile: {
    discovered: []
  },
  profileKey: PROFILE_STORAGE_PREFIX,
  userStatus: {
    isVip: false,
    readingsToday: 0,
    limit: 5
  }
};

const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
const pickButtons = [...document.querySelectorAll(".pick-option")];
const questionInput = document.querySelector("#question");
const resultPanel = document.querySelector("#resultPanel");
const resultCards = document.querySelector("#resultCards");
const resultTitle = document.querySelector("#resultTitle");
const resetButton = document.querySelector("#resetButton");
const sendButton = document.querySelector("#sendButton");
const profileButton = document.querySelector("#profileButton");
const profilePanel = document.querySelector("#profilePanel");
const closeProfileButton = document.querySelector("#closeProfileButton");
const profileGrid = document.querySelector("#profileGrid");
const collectionCount = document.querySelector("#collectionCount");
const collectionProgress = document.querySelector("#collectionProgress");
const shuffleLayer = document.querySelector("#shuffleLayer");
const countStack = document.querySelector("#countStack");
const countNumber = document.querySelector("#countNumber");
const deckButton = document.querySelector("#deckButton");
const countCardTemplate = document.querySelector("#countCardTemplate");
const resultCardTemplate = document.querySelector("#resultCardTemplate");
const profileCardTemplate = document.querySelector("#profileCardTemplate");

const vipBadge = document.querySelector("#vipBadge");
const limitCounter = document.querySelector("#limitCounter");
const limitOverlay = document.querySelector("#limitOverlay");
const buyVipButton = document.querySelector("#buyVipButton");
const buyVipHeaderButton = document.querySelector("#buyVipHeaderButton");

init();

async function init() {
  setupTelegram();
  loadProfile();
  bindEvents();
  await loadCards();
  await refreshUserStatus();
}

function setupTelegram() {
  if (!tg) {
    return;
  }

  tg.ready();
  tg.expand();

  const telegramUserId = tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id;
  if (telegramUserId) {
    state.profileKey = `${PROFILE_STORAGE_PREFIX}:${telegramUserId}`;
  }

  const theme = tg.themeParams || {};
  setThemeColor("--bg", theme.bg_color);
  setThemeColor("--panel", theme.secondary_bg_color);
  setThemeColor("--text", theme.text_color);
  setThemeColor("--muted", theme.hint_color);

  if (sendButton) {
    sendButton.hidden = true;
  }
}

function setThemeColor(name, value) {
  if (value) {
    document.documentElement.style.setProperty(name, value);
  }
}

function bindEvents() {
  pickButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const pick = Number(button.dataset.pick);
      drawReading(pick);
    });
  });

  resetButton.addEventListener("click", resetReading);
  if (sendButton) {
    sendButton.addEventListener("click", sendReadingToTelegram);
  }
  profileButton.addEventListener("click", openProfile);
  closeProfileButton.addEventListener("click", closeProfile);
  profilePanel.addEventListener("click", (event) => {
    if (event.target === profilePanel) {
      closeProfile();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !profilePanel.hidden) {
      closeProfile();
    }
  });

  if (buyVipButton) {
    buyVipButton.addEventListener("click", buyVip);
  }
  if (buyVipHeaderButton) {
    buyVipHeaderButton.addEventListener("click", buyVip);
  }
}

async function loadCards() {
  try {
    const response = await fetch("/api/cards");
    const data = await response.json();
    state.cards = data.cards || [];
    renderProfile();
  } catch {
    resultTitle.textContent = "Нет связи";
  }
}

async function drawReading(pick) {
  if (!Number.isInteger(pick) || pick < 1 || pick > 5) {
    return;
  }

  setDrawBusy(true, pick);
  resultPanel.hidden = true;

  try {
    const [reading] = await Promise.all([fetchReading(pick).catch(() => buildLocalReading(pick)), playCountAnimation(pick)]);
    state.lastReading = reading;
    unlockCards(reading.cards || []);
    renderReading(reading, pick);
    await refreshUserStatus();
  } catch (error) {
    console.error(error);
    resultTitle.textContent = "Не получилось";
    resultCards.innerHTML = "";
    resultPanel.hidden = false;
  } finally {
    hideShuffle();
    setDrawBusy(false);
  }
}

async function fetchReading(pick) {
  const response = await fetch("/api/reading", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pick,
      question: questionInput.value,
      initData: tg ? tg.initData : ""
    })
  });

  if (!response.ok) {
    throw new Error("Reading request failed");
  }

  return response.json();
}

async function refreshUserStatus() {
  if (!tg || !tg.initData) {
    updateLimitUI();
    return;
  }

  try {
    const response = await fetch("/api/user/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData })
    });

    if (response.ok) {
      const data = await response.json();
      state.userStatus = {
        isVip: data.isVip,
        readingsToday: data.readingsToday,
        limit: data.limit
      };
    }
  } catch (error) {
    console.error("Failed to load user status:", error);
  }

  updateLimitUI();
}

function updateLimitUI() {
  const isVip = state.userStatus.isVip;
  const readingsToday = state.userStatus.readingsToday;
  const limit = state.userStatus.limit;

  if (vipBadge) {
    vipBadge.style.display = isVip ? "inline-flex" : "none";
  }

  if (buyVipHeaderButton) {
    buyVipHeaderButton.style.display = isVip ? "none" : "inline-flex";
  }

  if (limitCounter) {
    if (isVip) {
      limitCounter.textContent = "Безлимитно";
      limitCounter.classList.add("is-vip");
    } else {
      const remaining = Math.max(0, limit - readingsToday);
      limitCounter.textContent = `Осталось гаданий сегодня: ${remaining}/${limit}`;
      limitCounter.classList.remove("is-vip");
    }
  }

  if (limitOverlay) {
    const isExhausted = !isVip && readingsToday >= limit;
    limitOverlay.hidden = !isExhausted;
    if (isExhausted) {
      document.body.classList.add("has-modal");
    } else {
      document.body.classList.remove("has-modal");
    }
  }
}

async function buyVip() {
  if (!tg || !tg.initData) {
    alert("Оплата со звездами доступна только внутри Telegram.");
    return;
  }

  try {
    const response = await fetch("/api/telegram/create-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.ok && data.invoiceLink) {
        tg.openInvoice(data.invoiceLink, async (status) => {
          if (status === "paid") {
            await refreshUserStatus();
          } else {
            console.log("Payment status:", status);
          }
        });
      } else {
        alert("Не удалось создать счет на оплату.");
      }
    } else {
      alert("Ошибка при запросе счета.");
    }
  } catch (error) {
    console.error("Payment request error:", error);
    alert("Произошла ошибка при оплате.");
  }
}

function buildLocalReading(pick) {
  if (state.cards.length === 0) {
    throw new Error("No cards loaded");
  }

  const index = Math.floor(Math.random() * state.cards.length);
  return {
    spread: "one",
    pick,
    cards: [
      {
        ...state.cards[index],
        position: "Ответ"
      }
    ]
  };
}

async function playCountAnimation(pick) {
  countStack.innerHTML = "";
  countNumber.textContent = "1";

  for (let index = 0; index < pick; index += 1) {
    const node = countCardTemplate.content.firstElementChild.cloneNode(true);
    node.style.setProperty("--i", index);
    node.style.setProperty("--x", `${(index - (pick - 1) / 2) * 34}px`);
    node.style.setProperty("--r", `${(index - (pick - 1) / 2) * 8}deg`);
    node.style.animationDelay = `${index * COUNT_STEP_MS}ms`;
    countStack.appendChild(node);
  }

  shuffleLayer.hidden = false;
  shuffleLayer.classList.remove("is-fading");
  requestAnimationFrame(() => {
    shuffleLayer.classList.add("is-active");
  });

  for (let index = 1; index <= pick; index += 1) {
    countNumber.textContent = String(index);
    await wait(COUNT_STEP_MS);
  }

  await wait(360);
}

function hideShuffle() {
  shuffleLayer.classList.add("is-fading");
  shuffleLayer.classList.remove("is-active");

  window.setTimeout(() => {
    shuffleLayer.hidden = true;
    shuffleLayer.classList.remove("is-fading");
    countStack.innerHTML = "";
  }, 260);
}

function setDrawBusy(isBusy, pick = null) {
  pickButtons.forEach((button) => {
    button.disabled = isBusy;
    button.classList.toggle("is-active", isBusy && Number(button.dataset.pick) === pick);
  });

  deckButton.classList.toggle("is-busy", isBusy);
}

function renderReading(reading, pick) {
  const cards = reading.cards || [];

  resultCards.innerHTML = "";
  resultTitle.textContent = `Карта ${pick}`;

  cards.slice(0, 1).forEach((card) => {
    const node = resultCardTemplate.content.firstElementChild.cloneNode(true);
    const image = node.querySelector("img");

    image.src = card.imageUrl;
    image.alt = card.title;
    resultCards.appendChild(node);
  });

  resultPanel.hidden = false;
  resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetReading() {
  state.lastReading = null;
  resultPanel.hidden = true;
  setDrawBusy(false);
}

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(state.profileKey) || "{}");
    const discovered = Array.isArray(saved.discovered) ? saved.discovered : [];
    state.profile.discovered = normalizeIds(discovered);
  } catch {
    state.profile.discovered = [];
  }
}

function saveProfile() {
  localStorage.setItem(
    state.profileKey,
    JSON.stringify({
      discovered: state.profile.discovered,
      updatedAt: new Date().toISOString()
    })
  );
}

function unlockCards(cards) {
  const known = new Set(state.profile.discovered);

  cards.forEach((card) => {
    if (Number.isInteger(card.id)) {
      known.add(card.id);
    }
  });

  state.profile.discovered = [...known].sort((a, b) => a - b);
  saveProfile();
  renderProfile();
}

function normalizeIds(values) {
  return [...new Set(values.map(Number).filter(Number.isInteger))].sort((a, b) => a - b);
}

function openProfile() {
  renderProfile();
  profilePanel.hidden = false;
  document.body.classList.add("has-modal");
  closeProfileButton.focus();
}

function closeProfile() {
  profilePanel.hidden = true;
  document.body.classList.remove("has-modal");
  profileButton.focus();
}

function renderProfile() {
  if (!profileGrid || state.cards.length === 0) {
    return;
  }

  const discovered = new Set(state.profile.discovered);
  const openedCount = state.cards.filter((card) => discovered.has(card.id)).length;
  const total = state.cards.length;
  const progress = total === 0 ? 0 : Math.round((openedCount / total) * 100);

  collectionCount.textContent = `${openedCount}/${total}`;
  collectionProgress.style.width = `${progress}%`;
  profileGrid.innerHTML = "";

  state.cards.forEach((card) => {
    const isOpen = discovered.has(card.id);
    const node = profileCardTemplate.content.firstElementChild.cloneNode(true);
    const image = node.querySelector("img");

    image.src = isOpen ? card.imageUrl : "/media/карта.jpg";
    image.alt = isOpen ? card.title : "Закрытая карта";
    node.classList.toggle("is-locked", !isOpen);
    profileGrid.appendChild(node);
  });
}

function sendReadingToTelegram() {
  if (!state.lastReading || !tg) {
    return;
  }

  const payload = {
    cards: state.lastReading.cards.slice(0, 1).map((card) => ({
      position: "Ответ",
      title: card.title
    }))
  };

  tg.sendData(JSON.stringify(payload));
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

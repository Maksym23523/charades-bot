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
    limit: 5,
    extraSpins: 0,
    telegramSubscribed: false,
    invitedFriendsCount: 0,
    botUsername: "",
    telegramChannelUsername: ""
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

const questsButton = document.querySelector("#questsButton");
const questsPanel = document.querySelector("#questsPanel");
const closeQuestsButton = document.querySelector("#closeQuestsButton");
const questTelegramLink = document.querySelector("#questTelegramLink");
const questTelegramVerifyBtn = document.querySelector("#questTelegramVerifyBtn");
const questTelegramDone = document.querySelector("#questTelegramDone");
const refCount = document.querySelector("#refCount");
const questReferralBtn = document.querySelector("#questReferralBtn");

const vipBadge = document.querySelector("#vipBadge");
const limitCounter = document.querySelector("#limitCounter");
const limitOverlay = document.querySelector("#limitOverlay");
const buyVipButton = document.querySelector("#buyVipButton");
const buyVipHeaderButton = document.querySelector("#buyVipHeaderButton");

const profileVipBox = document.querySelector("#profileVipBox");
const profileVipIcon = document.querySelector("#profileVipIcon");
const profileVipTitle = document.querySelector("#profileVipTitle");
const profileVipExpiry = document.querySelector("#profileVipExpiry");
const profileVipBuyBtn = document.querySelector("#profileVipBuyBtn");

const onboardingCard = document.querySelector("#onboardingCard");
const closeOnboardingBtn = document.querySelector("#closeOnboardingBtn");

const resultTextBox = document.querySelector("#resultTextBox");
const resultCardTitle = document.querySelector("#resultCardTitle");
const resultCardMeaning = document.querySelector("#resultCardMeaning");

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

  const username = tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.username;
  const telegramUserId = tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id;

  if (telegramUserId) {
    const idKey = `${PROFILE_STORAGE_PREFIX}:${telegramUserId}`;
    const usernameKey = username ? `${PROFILE_STORAGE_PREFIX}:${username.toLowerCase()}` : null;

    if (usernameKey && localStorage.getItem(usernameKey) && !localStorage.getItem(idKey)) {
      try {
        localStorage.setItem(idKey, localStorage.getItem(usernameKey));
      } catch (e) {
        console.error("Failed to migrate client-side progress from username key to ID key:", e);
      }
    }
    state.profileKey = idKey;
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

  if (questsButton) {
    questsButton.addEventListener("click", openQuests);
  }
  if (closeQuestsButton) {
    closeQuestsButton.addEventListener("click", closeQuests);
  }
  if (questsPanel) {
    questsPanel.addEventListener("click", (event) => {
      if (event.target === questsPanel) {
        closeQuests();
      }
    });
  }
  if (questTelegramVerifyBtn) {
    questTelegramVerifyBtn.addEventListener("click", verifyTelegramQuest);
  }
  if (questReferralBtn) {
    questReferralBtn.addEventListener("click", shareReferralLink);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!profilePanel.hidden) {
        closeProfile();
      }
      if (questsPanel && !questsPanel.hidden) {
        closeQuests();
      }
    }
  });

  if (buyVipButton) {
    buyVipButton.addEventListener("click", buyVip);
  }
  if (buyVipHeaderButton) {
    buyVipHeaderButton.addEventListener("click", buyVip);
  }
  if (profileVipBuyBtn) {
    profileVipBuyBtn.addEventListener("click", buyVip);
  }
  if (closeOnboardingBtn && onboardingCard) {
    closeOnboardingBtn.addEventListener("click", () => {
      onboardingCard.style.display = "none";
      localStorage.setItem("onboarding-closed:v3", "true");
    });
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

  // Pre-check limit before animating to prevent wasting animation if limit reached
  const isVip = state.userStatus.isVip;
  const readingsToday = state.userStatus.readingsToday;
  const limit = state.userStatus.limit;
  const extraSpins = state.userStatus.extraSpins || 0;
  if (!isVip && readingsToday >= limit && extraSpins <= 0) {
    updateLimitUI();
    return;
  }

  setDrawBusy(true, pick);
  resultPanel.hidden = true;

  try {
    let readingPromise;
    if (tg && tg.initData) {
      readingPromise = fetchReading(pick);
    } else {
      readingPromise = Promise.resolve().then(() => {
        incrementLocalReading();
        return buildLocalReading(pick);
      });
    }

    const [reading] = await Promise.all([readingPromise, playCountAnimation(pick)]);
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

let countdownInterval = null;

async function refreshUserStatus() {
  if (!tg || !tg.initData) {
    loadLocalUserStatus();
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
        limit: data.limit,
        nextAvailableInMs: data.nextAvailableInMs,
        vipUntil: data.vipUntil,
        extraSpins: data.extraSpins || 0,
        telegramSubscribed: data.telegramSubscribed || false,
        invitedFriendsCount: data.invitedFriendsCount || 0,
        botUsername: data.botUsername || "",
        telegramChannelUsername: data.telegramChannelUsername || ""
      };
      
      // Update Quests panel values
      if (refCount) {
        refCount.textContent = state.userStatus.invitedFriendsCount;
      }
      if (questTelegramLink && state.userStatus.telegramChannelUsername) {
        const channelName = state.userStatus.telegramChannelUsername.replace("@", "");
        questTelegramLink.href = `https://t.me/${channelName}`;
      }
      if (state.userStatus.telegramSubscribed) {
        if (questTelegramLink) questTelegramLink.style.display = "none";
        if (questTelegramVerifyBtn) questTelegramVerifyBtn.style.display = "none";
        if (questTelegramDone) questTelegramDone.style.display = "inline-block";
      } else {
        if (questTelegramLink) questTelegramLink.style.display = "inline-flex";
        if (questTelegramVerifyBtn) questTelegramVerifyBtn.style.display = "inline-flex";
        if (questTelegramDone) questTelegramDone.style.display = "none";
      }


    } else {
      loadLocalUserStatus();
    }
  } catch (error) {
    console.error("Failed to load user status:", error);
    loadLocalUserStatus();
  }

  updateLimitUI();
}

function updateLimitUI() {
  const isVip = state.userStatus.isVip;
  const readingsToday = state.userStatus.readingsToday;
  const limit = state.userStatus.limit;
  const extraSpins = state.userStatus.extraSpins || 0;

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
      const totalSpinsRemaining = remaining + extraSpins;
      limitCounter.textContent = `Осталось гаданий сегодня: ${totalSpinsRemaining}`;
      limitCounter.classList.remove("is-vip");
    }
  }

  if (limitOverlay) {
    const isExhausted = !isVip && readingsToday >= limit && extraSpins <= 0;
    if (isExhausted) {
      if (limitOverlay.hidden) {
        limitOverlay.hidden = false;
        limitOverlay.offsetHeight;
        limitOverlay.classList.add("is-active");
      }
      document.body.classList.add("has-modal");
      if (state.userStatus.nextAvailableInMs > 0) {
        startCooldownTimer(state.userStatus.nextAvailableInMs);
      }
    } else {
      if (!limitOverlay.hidden) {
        limitOverlay.classList.remove("is-active");
        setTimeout(() => {
          if (!limitOverlay.classList.contains("is-active")) {
            limitOverlay.hidden = true;
          }
        }, 300);
      }
      document.body.classList.remove("has-modal");
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      const limitTimerElement = document.querySelector("#limitTimer");
      if (limitTimerElement) {
        limitTimerElement.textContent = "";
      }
    }
  }
}

function loadLocalUserStatus() {
  try {
    const key = `${state.profileKey}:local-status`;
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    
    const timestamps = Array.isArray(saved.timestamps) ? saved.timestamps : [];
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const activeTimestamps = timestamps.filter(t => t > oneDayAgo);
    
    state.userStatus = {
      isVip: Boolean(saved.isVip),
      readingsToday: activeTimestamps.length,
      limit: 5,
      nextAvailableInMs: 0,
      vipUntil: saved.vipUntil || null
    };
    
    if (activeTimestamps.length >= 5) {
      const oldest = Math.min(...activeTimestamps);
      state.userStatus.nextAvailableInMs = Math.max(0, oldest + 24 * 60 * 60 * 1000 - Date.now());
    }
  } catch {
    state.userStatus = {
      isVip: false,
      readingsToday: 0,
      limit: 5,
      nextAvailableInMs: 0,
      vipUntil: null
    };
  }
}

function incrementLocalReading() {
  try {
    const key = `${state.profileKey}:local-status`;
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    const timestamps = Array.isArray(saved.timestamps) ? saved.timestamps : [];
    
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const activeTimestamps = timestamps.filter(t => t > oneDayAgo);
    
    activeTimestamps.push(Date.now());
    
    localStorage.setItem(key, JSON.stringify({
      isVip: Boolean(saved.isVip),
      timestamps: activeTimestamps
    }));
  } catch (e) {
    console.error("Failed to save local reading:", e);
  }
}

function startCooldownTimer(ms) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  let remainingMs = ms;
  updateTimerText(remainingMs);
  
  countdownInterval = setInterval(() => {
    remainingMs -= 1000;
    if (remainingMs <= 0) {
      clearInterval(countdownInterval);
      refreshUserStatus();
    } else {
      updateTimerText(remainingMs);
    }
  }, 1000);
}

function updateTimerText(ms) {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);
  
  const timerStr = `${hours}ч ${minutes}м ${seconds}с`;
  const limitTimerElement = document.querySelector("#limitTimer");
  if (limitTimerElement) {
    limitTimerElement.textContent = `До следующего бесплатного гадания: ${timerStr}`;
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

    // Populate card text details in the result panel
    if (resultTextBox) {
      if (resultCardTitle) resultCardTitle.textContent = card.title || "";
      if (resultCardMeaning) resultCardMeaning.textContent = card.meaning || "";
      resultTextBox.style.display = "block";
    }
  });

  resultPanel.hidden = false;
  resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetReading() {
  state.lastReading = null;
  resultPanel.hidden = true;
  if (resultTextBox) {
    resultTextBox.style.display = "none";
  }
  setDrawBusy(false);
}

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(state.profileKey) || "{}");
    const discovered = Array.isArray(saved.discovered) ? saved.discovered : [];
    state.profile.discovered = normalizeIds(discovered);
    state.profile.cardCounts = (saved.cardCounts && typeof saved.cardCounts === "object") ? saved.cardCounts : {};
    
    // Ensure all already discovered cards have a count of at least 1
    let needsSave = false;
    state.profile.discovered.forEach((id) => {
      if (state.profile.cardCounts[id] === undefined || state.profile.cardCounts[id] === 0) {
        state.profile.cardCounts[id] = 1;
        needsSave = true;
      }
    });

    if (needsSave) {
      saveProfile();
    }

    // Show onboarding card if user hasn't closed it
    const onboardingClosed = localStorage.getItem("onboarding-closed:v3") === "true";
    if (onboardingCard && !onboardingClosed) {
      onboardingCard.style.display = "block";
    }
  } catch (gradientError) {
    state.profile.discovered = [];
    state.profile.cardCounts = {};
  }
}

function saveProfile() {
  localStorage.setItem(
    state.profileKey,
    JSON.stringify({
      discovered: state.profile.discovered,
      cardCounts: state.profile.cardCounts,
      updatedAt: new Date().toISOString()
    })
  );
}

function unlockCards(cards) {
  const known = new Set(state.profile.discovered);
  if (!state.profile.cardCounts) {
    state.profile.cardCounts = {};
  }

  cards.forEach((card) => {
    if (Number.isInteger(card.id)) {
      known.add(card.id);
      const count = Number(state.profile.cardCounts[card.id] || 0);
      state.profile.cardCounts[card.id] = count + 1;
    }
  });

  state.profile.discovered = [...known].sort((a, b) => a - b);
  saveProfile();
  renderProfile();

  // Auto-hide onboarding on first draw
  if (onboardingCard && onboardingCard.style.display !== "none") {
    onboardingCard.style.display = "none";
    localStorage.setItem("onboarding-closed:v3", "true");
  }
}

function normalizeIds(values) {
  return [...new Set(values.map(Number).filter(Number.isInteger))].sort((a, b) => a - b);
}

function openProfile() {
  renderProfile();
  profilePanel.hidden = false;
  profilePanel.offsetHeight;
  profilePanel.classList.add("is-active");
  document.body.classList.add("has-modal");
  closeProfileButton.focus();
}

function closeProfile() {
  profilePanel.classList.remove("is-active");
  document.body.classList.remove("has-modal");
  profileButton.focus();
  setTimeout(() => {
    if (!profilePanel.classList.contains("is-active")) {
      profilePanel.hidden = true;
    }
  }, 300);
}

function renderProfile() {
  if (!profileGrid || state.cards.length === 0) {
    return;
  }

  // Update VIP status box in profile
  if (profileVipBox) {
    const isVip = state.userStatus.isVip;
    const vipUntil = state.userStatus.vipUntil;

    if (isVip) {
      profileVipBox.classList.add("is-vip");
      if (profileVipIcon) profileVipIcon.textContent = "👑";
      if (profileVipTitle) profileVipTitle.textContent = "VIP-статус активен";
      
      if (profileVipExpiry) {
        if (vipUntil) {
          const expDate = new Date(vipUntil);
          const diffMs = expDate.getTime() - Date.now();
          const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
          if (diffDays > 0) {
            profileVipExpiry.textContent = `Осталось дней: ${diffDays} (до ${expDate.toLocaleDateString("ru-RU")})`;
          } else {
            profileVipExpiry.textContent = `Активен до: ${expDate.toLocaleDateString("ru-RU")}`;
          }
        } else {
          profileVipExpiry.textContent = "Срок действия: Неограничен";
        }
      }
      if (profileVipBuyBtn) profileVipBuyBtn.style.display = "none";
    } else {
      profileVipBox.classList.remove("is-vip");
      if (profileVipIcon) profileVipIcon.textContent = "🔒";
      if (profileVipTitle) profileVipTitle.textContent = "Бесплатная версия";
      if (profileVipExpiry) profileVipExpiry.textContent = "Лимит: 5 гаданий в день";
      if (profileVipBuyBtn) profileVipBuyBtn.style.display = "block";
    }
  }

  const discovered = new Set(state.profile.discovered);
  const cardCounts = state.profile.cardCounts || {};
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
    const counterElement = node.querySelector(".collection-card-counter");

    image.src = isOpen ? card.imageUrl : "/media/карта.jpg";
    image.alt = isOpen ? card.title : "Закрытая карта";
    node.classList.toggle("is-locked", !isOpen);

    if (counterElement) {
      const count = cardCounts[card.id] || (isOpen ? 1 : 0);
      counterElement.textContent = `${count} раз`;
    }

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

function openQuests() {
  questsPanel.hidden = false;
  questsPanel.offsetHeight;
  questsPanel.classList.add("is-active");
  document.body.classList.add("has-modal");
  if (closeQuestsButton) {
    closeQuestsButton.focus();
  }
  refreshUserStatus();
}

function closeQuests() {
  questsPanel.classList.remove("is-active");
  document.body.classList.remove("has-modal");
  if (questsButton) {
    questsButton.focus();
  }
  setTimeout(() => {
    if (!questsPanel.classList.contains("is-active")) {
      questsPanel.hidden = true;
    }
  }, 300);
}

async function verifyTelegramQuest() {
  if (!tg || !tg.initData) {
    alert("Проверка подписки доступна только внутри Telegram. (В режиме тестирования награда начислена!)");
    try {
      await fetch("/api/quests/verify-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: "" })
      });
      await refreshUserStatus();
    } catch (e) {
      console.error(e);
    }
    return;
  }

  questTelegramVerifyBtn.disabled = true;
  const originalText = questTelegramVerifyBtn.textContent;
  questTelegramVerifyBtn.textContent = "Проверка...";

  try {
    const response = await fetch("/api/quests/verify-telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.isSubscribed) {
        if (data.rewardClaimed) {
          alert("🎉 Успешно! Вам начислено 3 дополнительных прокрута за подписку.");
        } else {
          alert("Вы уже получили награду за подписку.");
        }
        await refreshUserStatus();
      } else {
        alert(data.error || "Вы не подписаны на канал. Пожалуйста, подпишитесь.");
      }
    } else {
      alert("Ошибка при проверке подписки.");
    }
  } catch (error) {
    console.error("Verification error:", error);
    alert("Произошла ошибка при проверке.");
  } finally {
    questTelegramVerifyBtn.disabled = false;
    questTelegramVerifyBtn.textContent = originalText;
  }
}

function shareReferralLink() {
  const userId = tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id;
  const botName = state.userStatus.botUsername || "charadesgame_bot";
  const refLink = `https://t.me/${botName}?start=ref_${userId || "test"}`;
  const shareText = "🔮 Загляни в CHARADES — гадание на картах! Узнай свою судьбу!";

  if (tg && userId) {
    const fullShareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(shareText)}`;
    tg.openTelegramLink(fullShareUrl);
  } else {
    navigator.clipboard.writeText(refLink).then(() => {
      alert(`Реферальная ссылка скопирована в буфер обмена:\n${refLink}`);
    }).catch(() => {
      alert(`Скопируйте ссылку вручную:\n${refLink}`);
    });
  }
}

function updateQuestStatus(elementId, isCompleted) {
  const questEl = document.getElementById(elementId);
  if (!questEl) return;
  const inviteBtn = questEl.querySelector(".invite-btn");
  const doneSpan = questEl.querySelector(".quest-status-done");

  if (isCompleted) {
    if (inviteBtn) inviteBtn.style.display = "none";
    if (doneSpan) doneSpan.style.display = "inline-block";
  } else {
    if (inviteBtn) inviteBtn.style.display = "inline-flex";
    if (doneSpan) doneSpan.style.display = "none";
  }
}

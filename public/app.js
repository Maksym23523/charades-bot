const PROFILE_STORAGE_PREFIX = "card-reading-profile:v3";
const COUNT_STEP_MS = 420;

const state = {
  cards: [],
  lastReading: null,
  profile: {
    discovered: []
  },
  profileKey: PROFILE_STORAGE_PREFIX,
  limitOverlayDismissed: false,
  userStatus: {
    isVip: false,
    isAdmin: false,
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

const card15Audio = new Audio(encodeURI("/media/карта 15 а1.mp3"));
const card16Audio = new Audio(encodeURI("/media/карта 16 а1.mp3"));
const card18Audios = [
  new Audio(encodeURI("/media/видео 1 (online-audio-converter.com).mp3")),
  new Audio(encodeURI("/media/видео 2.mp3")),
  new Audio(encodeURI("/media/видео 3.mp3"))
];
const globalAudios = [card15Audio, card16Audio, ...card18Audios];
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
const refBonusCount = document.querySelector("#refBonusCount");
const questReferralBtn = document.querySelector("#questReferralBtn");
const questCopyRefBtn = document.querySelector("#questCopyRefBtn");
const questOpenStreakBtn = document.querySelector("#questOpenStreakBtn");
const questOpenRewardsBtn = document.querySelector("#questOpenRewardsBtn");

const vipBadge = document.querySelector("#vipBadge");
const limitCounter = document.querySelector("#limitCounter");
const limitOverlay = document.querySelector("#limitOverlay");
const closeLimitButton = document.querySelector("#closeLimitButton");
const limitQuestsButton = document.querySelector("#limitQuestsButton");
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

const collectorCertificate = document.querySelector("#collectorCertificate");
const certificateUserName = document.querySelector("#certificateUserName");
const certificateAvatar = document.querySelector("#certificateAvatar");
const claimStickerPackBtn = document.querySelector("#claimStickerPackBtn");

const collectorCelebrationModal = document.querySelector("#collectorCelebrationModal");
const closeCelebrationBtn = document.querySelector("#closeCelebrationBtn");
const celebrationUserName = document.querySelector("#celebrationUserName");
const celebrationAvatar = document.querySelector("#celebrationAvatar");
const modalStickerPackBtn = document.querySelector("#modalStickerPackBtn");

const streakButton = document.querySelector("#streakButton");
const streakCountText = document.querySelector("#streakCountText");
const streakBadgeClaim = document.querySelector("#streakBadgeClaim");
const streakPanel = document.querySelector("#streakPanel");
const closeStreakButton = document.querySelector("#closeStreakButton");
const streakDaysGrid = document.querySelector("#streakDaysGrid");
const claimStreakActionBtn = document.querySelector("#claimStreakActionBtn");

const shareStoryButton = document.querySelector("#shareStoryButton");
const profileBadgeDot = document.querySelector("#profileBadgeDot");

const bottomNav = document.querySelector("#bottomNav");
const tabStreak = document.querySelector("#tabStreak");
const tabQuests = document.querySelector("#tabQuests");
const tabMain = document.querySelector("#tabMain");
const tabRewards = document.querySelector("#tabRewards");
const tabProfile = document.querySelector("#tabProfile");
const navStreakBadge = document.querySelector("#navStreakBadge");

const rewardsPanel = document.querySelector("#rewardsPanel");
const closeRewardsButton = document.querySelector("#closeRewardsButton");
const rewardsCertificateCard = document.querySelector("#rewardsCertificateCard");
const rewardsAvatar = document.querySelector("#rewardsAvatar");
const rewardsUserName = document.querySelector("#rewardsUserName");
const rewardsStatusText = document.querySelector("#rewardsStatusText");
const rewardsStickerBtn1 = document.querySelector("#rewardsStickerBtn1");
const rewardsStickerBtn2 = document.querySelector("#rewardsStickerBtn2");

const CARD_SKINS = [
  { id: "default", name: "Классическая", url: "/media/карта.jpg", requiredRound: 0 },
  { id: "skin_2", name: "Красный", url: "/media/карта 2.JPEG", requiredRound: 3 },
  { id: "skin_3", name: "Зеленый", url: "/media/карта 3.JPEG", requiredRound: 4 },
  { id: "skin_4", name: "Желтый", url: "/media/карта 4.JPEG", requiredRound: 5 },
  { id: "skin_5", name: "Серый", url: "/media/карта 5.JPEG", requiredRound: 6 },
  { id: "skin_6", name: "Черный", url: "/media/карта 6.JPEG", requiredRound: 7 },
  { id: "skin_7", name: "Серебристый", url: "/media/карта 7.PNG", requiredRound: 8 },
  { id: "skin_8", name: "Золотой", url: "/media/карта 8.PNG", requiredRound: 9 },
  { id: "skin_9", name: "Золото про", url: "/media/карта 9.PNG", requiredRound: 10 }
];

const cardSkinsSection = document.querySelector("#cardSkinsSection");
const cardSkinsCarousel = document.querySelector("#cardSkinsCarousel");
const cardSkinsStatusBadge = document.querySelector("#cardSkinsStatusBadge");

const STICKER_PACK_URL = "https://t.me/addstickers/Charades5";

init();

async function init() {
  setupTelegram();
  loadProfile();
  applyCardSkin(getSelectedSkin().id);
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

function stopAllAudios() {
  globalAudios.forEach((audio) => {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {}
  });
}

async function openStickerPack(round = 1) {
  const btn1 = rewardsStickerBtn1 || document.querySelector("#claimStickerPackBtn1");
  const btn2 = rewardsStickerBtn2 || document.querySelector("#claimStickerPackBtn2");
  const mBtn1 = document.querySelector("#modalStickerPackBtn1");
  const mBtn2 = document.querySelector("#modalStickerPackBtn2");

  const targetBtn = round === 2 ? (btn2 || mBtn2) : (btn1 || mBtn1);
  const originalText = targetBtn ? targetBtn.textContent : "";
  if (targetBtn) targetBtn.textContent = "⏳ Получаем ваш стикерпак...";

  try {
    const response = await fetch("/api/collector/sticker-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData: tg ? tg.initData : "",
        completionCount: round
      })
    });

    const data = await response.json();
    const url = (data && data.stickerPackUrl) ? data.stickerPackUrl : STICKER_PACK_URL;

    if (tg && typeof tg.openTelegramLink === "function") {
      tg.openTelegramLink(url);
    } else {
      window.open(url, "_blank");
    }
  } catch (err) {
    console.error("Failed to generate sticker pack:", err);
    if (tg && typeof tg.openTelegramLink === "function") {
      tg.openTelegramLink(STICKER_PACK_URL);
    } else {
      window.open(STICKER_PACK_URL, "_blank");
    }
  } finally {
    if (targetBtn) targetBtn.textContent = originalText;
  }
}

function openCelebrationModal(round = 1) {
  if (!collectorCelebrationModal) return;
  updateUserCertificateDetails(celebrationUserName, celebrationAvatar);

  const modalTitle = collectorCelebrationModal.querySelector(".certificate-title");
  const modalStatus = collectorCelebrationModal.querySelector(".certificate-user-status");
  const modalBtn1 = document.querySelector("#modalStickerPackBtn1");
  const modalBtn2 = document.querySelector("#modalStickerPackBtn2");

  if (round === 1) {
    if (modalTitle) modalTitle.textContent = "Великий Магистр CHARADES";
    if (modalStatus) modalStatus.textContent = "1-й сбор коллекции завершен (100%)";
    if (modalBtn1) modalBtn1.style.display = "block";
    if (modalBtn2) modalBtn2.style.display = "none";
  } else if (round === 2) {
    if (modalTitle) modalTitle.textContent = "Великий Магистр (2-й сбор)";
    if (modalStatus) modalStatus.textContent = "2-й сбор коллекции завершен (100%)";
    if (modalBtn1) modalBtn1.style.display = "block";
    if (modalBtn2) modalBtn2.style.display = "block";
  } else {
    const skin = CARD_SKINS.find((s) => s.requiredRound === round);
    const skinName = skin ? skin.name : `Скин ${round}`;
    if (modalTitle) modalTitle.textContent = `Разблокирован скин «${skinName}»!`;
    if (modalStatus) modalStatus.textContent = `${round}-й сбор коллекции завершен (100%)`;
    if (modalBtn1) modalBtn1.style.display = "none";
    if (modalBtn2) modalBtn2.style.display = "none";
  }

  collectorCelebrationModal.hidden = false;
  collectorCelebrationModal.offsetHeight;
  collectorCelebrationModal.classList.add("is-active");
  document.body.classList.add("has-modal");
}

function closeCelebrationModal() {
  if (!collectorCelebrationModal) return;
  collectorCelebrationModal.classList.remove("is-active");
  document.body.classList.remove("has-modal");
  setTimeout(() => {
    if (!collectorCelebrationModal.classList.contains("is-active")) {
      collectorCelebrationModal.hidden = true;
    }
  }, 300);
}

function updateUserCertificateDetails(nameEl, avatarEl) {
  const tgUser = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) ? tg.initDataUnsafe.user : null;
  let nameStr = "Игрок";
  if (tgUser) {
    if (tgUser.username) {
      nameStr = `@${tgUser.username}`;
    } else {
      nameStr = `${tgUser.first_name || ""} ${tgUser.last_name || ""}`.trim() || "Игрок";
    }
  } else if (state.userStatus && state.userStatus.username) {
    nameStr = `@${state.userStatus.username}`;
  }
  
  if (nameEl) nameEl.textContent = nameStr;

  if (avatarEl) {
    if (tgUser && tgUser.photo_url) {
      avatarEl.innerHTML = `<img src="${tgUser.photo_url}" alt="${nameStr}">`;
    } else {
      avatarEl.textContent = "🔮";
    }
  }
}

function getSelectedSkin() {
  const profileKey = state.profileKey || "default_user";
  const savedId = localStorage.getItem(`${profileKey}:selectedSkin`) || "default";
  return CARD_SKINS.find((s) => s.id === savedId) || CARD_SKINS[0];
}

function getSelectedSkinUrl() {
  return getSelectedSkin().url;
}

function applyCardSkin(skinId) {
  const skin = CARD_SKINS.find((s) => s.id === skinId) || CARD_SKINS[0];
  const profileKey = state.profileKey || "default_user";
  localStorage.setItem(`${profileKey}:selectedSkin`, skin.id);

  // Apply CSS custom property for idle-card shuffle
  document.documentElement.style.setProperty("--card-back", `url("${encodeURI(skin.url)}")`);

  // Apply to deckButton image
  if (deckButton) {
    const deckImg = deckButton.querySelector("img");
    if (deckImg) deckImg.src = skin.url;
  }

  // Apply to countCardTemplate for shuffle animation
  if (countCardTemplate && countCardTemplate.content) {
    const countImg = countCardTemplate.content.querySelector("img");
    if (countImg) countImg.src = skin.url;
  }

  // Apply to any currently mounted count cards
  document.querySelectorAll(".count-card img").forEach((img) => {
    img.src = skin.url;
  });

  // Update status badge in profile
  if (cardSkinsStatusBadge) {
    cardSkinsStatusBadge.textContent = skin.name;
  }

  renderCardSkins();
}

function getCollectionRoundStats() {
  const cardCounts = state.profile.cardCounts || {};
  const total = state.cards.length || 24;
  const MAX_ROUNDS = 10;

  const roundCounts = [];
  for (let r = 1; r <= MAX_ROUNDS; r++) {
    const count = state.cards.filter((c) => Number(cardCounts[c.id] || 0) >= r).length;
    roundCounts.push({
      round: r,
      count: count,
      isCompleted: total > 0 && count >= total
    });
  }

  let currentRound = 1;
  let currentRoundCount = roundCounts[0] ? roundCounts[0].count : 0;
  for (let i = 0; i < MAX_ROUNDS; i++) {
    if (!roundCounts[i].isCompleted) {
      currentRound = i + 1;
      currentRoundCount = roundCounts[i].count;
      break;
    }
    if (i === MAX_ROUNDS - 1) {
      currentRound = MAX_ROUNDS;
      currentRoundCount = total;
    }
  }

  const completedRounds = roundCounts.filter((rc) => rc.isCompleted).length;

  return {
    total,
    MAX_ROUNDS,
    roundCounts,
    currentRound,
    currentRoundCount,
    completedRounds
  };
}

function renderCardSkins() {
  if (!cardSkinsCarousel) return;
  cardSkinsCarousel.innerHTML = "";

  const selectedSkin = getSelectedSkin();
  const stats = getCollectionRoundStats();
  const completedRounds = stats.completedRounds;

  if (cardSkinsStatusBadge) {
    cardSkinsStatusBadge.textContent = selectedSkin.name;
  }

  CARD_SKINS.forEach((skin) => {
    const isUnlocked = skin.requiredRound === 0 || completedRounds >= skin.requiredRound;
    const isCurrent = skin.id === selectedSkin.id;

    const item = document.createElement("div");
    item.className = "card-skin-item";
    if (isCurrent) item.classList.add("is-selected");
    if (!isUnlocked) item.classList.add("is-locked");

    const preview = document.createElement("div");
    preview.className = "card-skin-preview";

    const img = document.createElement("img");
    img.src = skin.url;
    img.alt = skin.name;
    preview.appendChild(img);

    if (isCurrent) {
      const check = document.createElement("div");
      check.className = "card-skin-check";
      check.textContent = "✓";
      preview.appendChild(check);
    }

    if (!isUnlocked) {
      const lock = document.createElement("div");
      lock.className = "card-skin-lock-overlay";
      lock.textContent = "🔒";
      preview.appendChild(lock);
    }

    item.appendChild(preview);

    const name = document.createElement("div");
    name.className = "card-skin-name";
    name.textContent = skin.name;
    item.appendChild(name);

    const badge = document.createElement("div");
    badge.className = "card-skin-badge";
    if (isCurrent) {
      badge.classList.add("badge-active");
      badge.textContent = "Выбрано";
    } else if (isUnlocked) {
      badge.classList.add("badge-select");
      badge.textContent = "Выбрать";
    } else {
      badge.classList.add("badge-locked");
      badge.textContent = `🔒 Сбор ${skin.requiredRound}`;
    }
    item.appendChild(badge);

    item.addEventListener("click", () => {
      if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");

      if (!isUnlocked) {
        if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("warning");
        const msg = `🔒 Скин «${skin.name}» откроется после ${skin.requiredRound}-го сбора всех ${stats.total || 24} карт! (Пройдено сборов: ${completedRounds}/${stats.MAX_ROUNDS})`;
        if (tg && typeof tg.showAlert === "function") {
          tg.showAlert(msg);
        } else {
          alert(msg);
        }
        return;
      }

      applyCardSkin(skin.id);
      if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
    });

    cardSkinsCarousel.appendChild(item);
  });
}

function getRewardForDay(d) {
  if (d === 1) return { extraSpins: 5, label: "+5 гаданий", icon: "⚡️" };
  if (d === 2) return { extraSpins: 10, label: "+10 гаданий", icon: "⚡️" };
  if (d === 3) return { extraSpins: 15, label: "+15 гаданий", icon: "⚡️" };
  if (d === 4) return { extraSpins: 20, label: "+20 гаданий", icon: "⚡️" };
  if (d === 5) return { extraSpins: 25, label: "+25 гаданий", icon: "⚡️" };
  if (d === 6) return { extraSpins: 30, label: "+30 гаданий", icon: "⚡️" };
  if (d % 7 === 0) return { vipHours: 1, label: "1 ч. VIP", icon: "🎁", isVip: true };
  return { extraSpins: 25, label: "+25 гаданий", icon: "⚡️" };
}

function setActiveTab(tabId) {
  const tabs = [tabStreak, tabQuests, tabMain, tabRewards, tabProfile];
  tabs.forEach((tab) => {
    if (tab) {
      tab.classList.toggle("is-active", tab.id === tabId);
    }
  });
}

function closeOtherModals(exceptPanel) {
  const allPanels = [profilePanel, questsPanel, streakPanel, rewardsPanel, adminPanel, collectorCelebrationModal, limitOverlay];
  allPanels.forEach((p) => {
    if (p && p !== exceptPanel && !p.hidden) {
      p.classList.remove("is-active");
      p.hidden = true;
    }
  });
}

function openStreak() {
  closeOtherModals(streakPanel);
  renderStreakUI();
  if (streakPanel) {
    streakPanel.hidden = false;
    streakPanel.offsetHeight;
    streakPanel.classList.add("is-active");
    document.body.classList.add("has-modal");
    if (closeStreakButton) closeStreakButton.focus();
  }
  setActiveTab("tabStreak");
}

function closeStreak() {
  if (!streakPanel) return;
  streakPanel.classList.remove("is-active");
  document.body.classList.remove("has-modal");
  setTimeout(() => {
    if (!streakPanel.classList.contains("is-active")) {
      streakPanel.hidden = true;
    }
  }, 300);
  setActiveTab("tabMain");
}

function renderStreakUI() {
  if (!streakDaysGrid) return;
  const streakInfo = (state.userStatus && state.userStatus.streakInfo)
    ? state.userStatus.streakInfo
    : { currentStreakDay: 0, canClaim: true, nextDay: 1, claimedToday: false };

  streakDaysGrid.innerHTML = "";

  const activeDay = streakInfo.claimedToday ? (streakInfo.currentStreakDay || 1) : streakInfo.nextDay;
  const weekIndex = Math.floor((activeDay - 1) / 7);
  const startDay = weekIndex * 7 + 1;

  for (let d = startDay; d < startDay + 7; d++) {
    const reward = getRewardForDay(d);

    const card = document.createElement("div");
    card.className = "streak-day-card";
    if (reward.isVip) card.classList.add("is-vip-day");

    const isClaimed = streakInfo.claimedToday
      ? d <= streakInfo.currentStreakDay
      : d < streakInfo.nextDay;

    const isActiveNext = streakInfo.canClaim && d === streakInfo.nextDay;

    if (isClaimed) card.classList.add("is-claimed");
    if (isActiveNext) card.classList.add("is-active-next");

    const dayNum = document.createElement("div");
    dayNum.className = "streak-day-number";
    dayNum.textContent = `День ${d}`;

    const icon = document.createElement("div");
    icon.className = "streak-day-icon";
    icon.textContent = isClaimed ? "✅" : reward.icon;

    const rewardEl = document.createElement("div");
    rewardEl.className = "streak-day-reward";
    rewardEl.textContent = isClaimed ? "Забрано" : reward.label;

    card.appendChild(dayNum);
    card.appendChild(icon);
    card.appendChild(rewardEl);
    streakDaysGrid.appendChild(card);
  }

  if (claimStreakActionBtn) {
    if (streakInfo.canClaim) {
      const nextReward = getRewardForDay(streakInfo.nextDay);
      claimStreakActionBtn.disabled = false;
      claimStreakActionBtn.textContent = `🔥 Забрать ${nextReward.label}`;
    } else {
      claimStreakActionBtn.disabled = true;
      claimStreakActionBtn.textContent = "✅ Получено! Приходите завтра";
    }
  }

  const count = streakInfo.currentStreakDay || 0;
  if (streakCountText) {
    streakCountText.textContent = `${count}🔥`;
  }
  if (streakBadgeClaim) {
    streakBadgeClaim.style.display = streakInfo.canClaim ? "inline-block" : "none";
  }
  if (profileBadgeDot) {
    profileBadgeDot.style.display = streakInfo.canClaim ? "inline-block" : "none";
  }
  if (navStreakBadge) {
    navStreakBadge.style.display = streakInfo.canClaim ? "block" : "none";
  }
}

async function claimStreakReward() {
  if (!claimStreakActionBtn) return;
  claimStreakActionBtn.disabled = true;
  claimStreakActionBtn.textContent = "Загрузка...";

  try {
    const response = await fetch("/api/streak/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg ? tg.initData : "" })
    });

    const data = await response.json();
    if (!response.ok) {
      alert(data.error || "Не удалось забрать награду.");
      renderStreakUI();
      return;
    }

    alert(`🎉 Вы получили награду: ${data.claimResult.rewardLabel}!`);
    await refreshUserStatus();
    renderStreakUI();
  } catch (err) {
    console.error(err);
    alert("Ошибка сети при получении награды.");
    renderStreakUI();
  }
}

function shareToStory() {
  if (!state.lastReading || !state.lastReading.cards || state.lastReading.cards.length === 0) {
    return;
  }

  const card = state.lastReading.cards[0];
  const absoluteMediaUrl = new URL(card.imageUrl, window.location.href).href;
  const noMeaningCards = [15, 16, 18];
  const captionText = (!noMeaningCards.includes(card.id) && card.meaning)
    ? `🔮 Моё гадание в CHARADES: «${card.title}» — ${card.meaning}`
    : `🔮 Моё гадание в CHARADES: «${card.title}»`;
  
  const botUsername = (state.userStatus && state.userStatus.botUsername)
    ? state.userStatus.botUsername.replace("@", "")
    : "charadesgame_bot";

  const appUrl = `https://t.me/${botUsername}`;

  if (tg && typeof tg.shareToStory === "function") {
    try {
      tg.shareToStory(absoluteMediaUrl, {
        text: captionText,
        widget_link: {
          url: appUrl,
          name: "Гадать в CHARADES"
        }
      });
      return;
    } catch (e) {
      console.error("tg.shareToStory error, falling back to share link:", e);
    }
  }

  const shareText = `${captionText}\n\nПопробуй гадание в CHARADES 👇`;
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(shareText)}`;
  
  if (tg && typeof tg.openTelegramLink === "function") {
    tg.openTelegramLink(shareUrl);
  } else {
    window.open(shareUrl, "_blank");
  }
}

function bindEvents() {
  pickButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const pick = Number(button.dataset.pick);
      stopAllAudios();
      // Pre-unlock audio files silently on user click to bypass iOS WebKit autoplay policy without sound leaks
      globalAudios.forEach((audio) => {
        audio.muted = true;
        const p = audio.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = false;
          }).catch(() => {
            audio.muted = false;
          });
        } else {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        }
      });
      drawReading(pick);
    });
  });

  resetButton.addEventListener("click", resetReading);
  if (sendButton) {
    sendButton.addEventListener("click", sendReadingToTelegram);
  }
  if (shareStoryButton) {
    shareStoryButton.addEventListener("click", shareToStory);
  }
  // Bottom Navigation tabs
  if (tabStreak) {
    tabStreak.addEventListener("click", () => {
      if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
      if (streakPanel && !streakPanel.hidden && streakPanel.classList.contains("is-active")) {
        closeStreak();
      } else {
        openStreak();
      }
    });
  }

  if (tabQuests) {
    tabQuests.addEventListener("click", () => {
      if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
      if (questsPanel && !questsPanel.hidden && questsPanel.classList.contains("is-active")) {
        closeQuests();
      } else {
        openQuests();
      }
    });
  }

  if (tabMain) {
    tabMain.addEventListener("click", () => {
      if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
      closeOtherModals(null);
      document.body.classList.remove("has-modal");
      setActiveTab("tabMain");
    });
  }

  if (tabRewards) {
    tabRewards.addEventListener("click", () => {
      if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
      if (rewardsPanel && !rewardsPanel.hidden && rewardsPanel.classList.contains("is-active")) {
        closeRewards();
      } else {
        openRewards();
      }
    });
  }

  if (tabProfile) {
    tabProfile.addEventListener("click", () => {
      if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
      if (profilePanel && !profilePanel.hidden && profilePanel.classList.contains("is-active")) {
        closeProfile();
      } else {
        openProfile();
      }
    });
  }

  if (closeRewardsButton) {
    closeRewardsButton.addEventListener("click", closeRewards);
  }
  if (rewardsPanel) {
    rewardsPanel.addEventListener("click", (event) => {
      if (event.target === rewardsPanel) {
        closeRewards();
      }
    });
  }

  if (rewardsStickerBtn1) {
    rewardsStickerBtn1.addEventListener("click", () => openStickerPack(1));
  }
  if (rewardsStickerBtn2) {
    rewardsStickerBtn2.addEventListener("click", () => openStickerPack(2));
  }

  if (profileButton) {
    profileButton.addEventListener("click", openProfile);
  }
  if (closeProfileButton) {
    closeProfileButton.addEventListener("click", closeProfile);
  }
  if (profilePanel) {
    profilePanel.addEventListener("click", (event) => {
      if (event.target === profilePanel) {
        closeProfile();
      }
    });
  }

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
  if (questCopyRefBtn) {
    questCopyRefBtn.addEventListener("click", () => {
      if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
      const userId = tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id;
      const botName = state.userStatus.botUsername || "charadesgame_bot";
      const refLink = `https://t.me/${botName}?start=ref_${userId || "test"}`;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(refLink).then(() => {
          if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
          if (tg && typeof tg.showAlert === "function") {
            tg.showAlert("✅ Реферальная ссылка скопирована в буфер обмена!");
          } else {
            alert("✅ Реферальная ссылка скопирована в буфер обмена!");
          }
        }).catch(() => {
          prompt("Скопируйте ссылку:", refLink);
        });
      } else {
        prompt("Скопируйте ссылку:", refLink);
      }
    });
  }
  if (questOpenStreakBtn) {
    questOpenStreakBtn.addEventListener("click", () => {
      if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
      closeQuests();
      openStreak();
    });
  }
  if (questOpenRewardsBtn) {
    questOpenRewardsBtn.addEventListener("click", () => {
      if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
      closeQuests();
      openRewards();
    });
  }

  if (streakButton) {
    streakButton.addEventListener("click", openStreak);
  }
  if (closeStreakButton) {
    closeStreakButton.addEventListener("click", closeStreak);
  }
  if (streakPanel) {
    streakPanel.addEventListener("click", (event) => {
      if (event.target === streakPanel) {
        closeStreak();
      }
    });
  }
  if (claimStreakActionBtn) {
    claimStreakActionBtn.addEventListener("click", claimStreakReward);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (profilePanel && !profilePanel.hidden) {
        closeProfile();
      }
      if (questsPanel && !questsPanel.hidden) {
        closeQuests();
      }
      if (streakPanel && !streakPanel.hidden) {
        closeStreak();
      }
      if (rewardsPanel && !rewardsPanel.hidden) {
        closeRewards();
      }
      if (limitOverlay && !limitOverlay.hidden) {
        closeLimitOverlay();
      }
      if (collectorCelebrationModal && !collectorCelebrationModal.hidden) {
        closeCelebrationModal();
      }
    }
  });

  const claimBtn1 = document.querySelector("#claimStickerPackBtn1");
  const claimBtn2 = document.querySelector("#claimStickerPackBtn2");
  const modalBtn1 = document.querySelector("#modalStickerPackBtn1");
  const modalBtn2 = document.querySelector("#modalStickerPackBtn2");

  if (claimBtn1) claimBtn1.addEventListener("click", () => openStickerPack(1));
  if (claimBtn2) claimBtn2.addEventListener("click", () => openStickerPack(2));
  if (modalBtn1) modalBtn1.addEventListener("click", () => openStickerPack(1));
  if (modalBtn2) modalBtn2.addEventListener("click", () => openStickerPack(2));
  if (closeCelebrationBtn) {
    closeCelebrationBtn.addEventListener("click", closeCelebrationModal);
  }
  if (collectorCelebrationModal) {
    collectorCelebrationModal.addEventListener("click", (event) => {
      if (event.target === collectorCelebrationModal) {
        closeCelebrationModal();
      }
    });
  }

  if (closeLimitButton) {
    closeLimitButton.addEventListener("click", closeLimitOverlay);
  }
  if (limitQuestsButton) {
    limitQuestsButton.addEventListener("click", () => {
      closeLimitOverlay();
      openQuests();
    });
  }
  if (limitOverlay) {
    limitOverlay.addEventListener("click", (event) => {
      if (event.target === limitOverlay) {
        closeLimitOverlay();
      }
    });
  }

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
    state.limitOverlayDismissed = false;
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
        isAdmin: data.isAdmin || false,
        readingsToday: data.readingsToday,
        limit: data.limit,
        nextAvailableInMs: data.nextAvailableInMs,
        vipUntil: data.vipUntil,
        extraSpins: data.extraSpins || 0,
        telegramSubscribed: data.telegramSubscribed || false,
        invitedFriendsCount: data.invitedFriendsCount || 0,
        streakInfo: data.streakInfo || null,
        botUsername: data.botUsername || "",
        telegramChannelUsername: data.telegramChannelUsername || ""
      };
      
      const adminBtn = document.querySelector("#adminHeaderButton");
      if (adminBtn) {
        adminBtn.style.display = state.userStatus.isAdmin ? "inline-block" : "none";
      }

      renderStreakUI();
      
      // Update Quests panel values
      if (refCount) {
        refCount.textContent = state.userStatus.invitedFriendsCount;
      }
      if (refBonusCount) {
        refBonusCount.textContent = `+${(state.userStatus.invitedFriendsCount || 0) * 20}`;
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

  renderStreakUI();
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
      if (limitOverlay.hidden && !state.limitOverlayDismissed) {
        limitOverlay.hidden = false;
        limitOverlay.offsetHeight;
        limitOverlay.classList.add("is-active");
        document.body.classList.add("has-modal");
      }
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
        const link = data.invoiceLink.replace("telegram.me", "t.me");
        tg.openInvoice(link, async (status) => {
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
    alert("Произошла ошибка при оплате: " + error.message + "\n" + (error.stack || ""));
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
    const img = node.querySelector("img");
    if (img) img.src = getSelectedSkinUrl();
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
  stopAllAudios();
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

      const noMeaningCards = [15, 16, 18];
      if (resultCardMeaning) {
        if (!noMeaningCards.includes(card.id) && card.meaning) {
          resultCardMeaning.textContent = card.meaning;
          resultCardMeaning.style.display = "block";
        } else {
          resultCardMeaning.textContent = "";
          resultCardMeaning.style.display = "none";
        }
      }
      resultTextBox.style.display = "block";
    }

    if (card.id === 15) {
      card15Audio.muted = false;
      card15Audio.currentTime = 0;
      card15Audio.play().catch((err) => console.error("Audio playback failed:", err));
    } else if (card.id === 16) {
      card16Audio.muted = false;
      card16Audio.currentTime = 0;
      card16Audio.play().catch((err) => console.error("Audio playback failed:", err));
    } else if (card.id === 18) {
      const randomIndex = Math.floor(Math.random() * card18Audios.length);
      const audio = card18Audios[randomIndex];
      audio.muted = false;
      audio.currentTime = 0;
      audio.play().catch((err) => console.error("Audio playback failed:", err));
    }
  });

  resultPanel.hidden = false;
  resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetReading() {
  stopAllAudios();
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

  // Check multi-round collection completion
  const totalCardsCount = state.cards.length;
  if (totalCardsCount > 0) {
    const stats = getCollectionRoundStats();
    for (let r = 1; r <= stats.MAX_ROUNDS; r++) {
      const isCompleted = stats.roundCounts[r - 1] && stats.roundCounts[r - 1].isCompleted;
      if (isCompleted) {
        const celKey = `${state.profileKey}:celebrated-round${r}`;
        if (!localStorage.getItem(celKey)) {
          localStorage.setItem(celKey, "true");
          setTimeout(() => {
            openCelebrationModal(r);
          }, 700);
          break;
        }
      }
    }
  }

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
  closeOtherModals(profilePanel);
  renderProfile();
  profilePanel.hidden = false;
  profilePanel.offsetHeight;
  profilePanel.classList.add("is-active");
  document.body.classList.add("has-modal");
  closeProfileButton.focus();
  setActiveTab("tabProfile");
}

function closeProfile() {
  profilePanel.classList.remove("is-active");
  document.body.classList.remove("has-modal");
  setTimeout(() => {
    if (!profilePanel.classList.contains("is-active")) {
      profilePanel.hidden = true;
    }
  }, 300);
  setActiveTab("tabMain");
}

function openRewards() {
  closeOtherModals(rewardsPanel);
  renderRewards();
  if (rewardsPanel) {
    rewardsPanel.hidden = false;
    rewardsPanel.offsetHeight;
    rewardsPanel.classList.add("is-active");
    document.body.classList.add("has-modal");
    if (closeRewardsButton) closeRewardsButton.focus();
  }
  setActiveTab("tabRewards");
}

function closeRewards() {
  if (!rewardsPanel) return;
  rewardsPanel.classList.remove("is-active");
  document.body.classList.remove("has-modal");
  setTimeout(() => {
    if (!rewardsPanel.classList.contains("is-active")) {
      rewardsPanel.hidden = true;
    }
  }, 300);
  setActiveTab("tabMain");
}

function renderRewards() {
  if (!rewardsCertificateCard) return;
  updateUserCertificateDetails(rewardsUserName, rewardsAvatar);

  const stats = getCollectionRoundStats();
  const total = stats.total;
  const round1Count = stats.roundCounts[0] ? stats.roundCounts[0].count : 0;
  const round2Count = stats.roundCounts[1] ? stats.roundCounts[1].count : 0;

  if (round1Count < total) {
    if (rewardsStatusText) {
      rewardsStatusText.textContent = `Собрано ${round1Count}/${total} карт (1-й сбор)`;
    }
    if (rewardsStickerBtn1) {
      rewardsStickerBtn1.disabled = true;
      rewardsStickerBtn1.textContent = `🔒 Откройте ещё ${total - round1Count} карт для 1-го сбора`;
      rewardsStickerBtn1.style.opacity = "0.6";
      rewardsStickerBtn1.style.cursor = "not-allowed";
    }
    if (rewardsStickerBtn2) {
      rewardsStickerBtn2.style.display = "none";
    }
  } else if (round2Count < total) {
    if (rewardsStatusText) {
      rewardsStatusText.textContent = "1-й сбор коллекции завершен (100%)";
    }
    if (rewardsStickerBtn1) {
      rewardsStickerBtn1.disabled = false;
      rewardsStickerBtn1.textContent = "🎁 Забрать персональный стикерпак (1-й сбор)";
      rewardsStickerBtn1.style.opacity = "1";
      rewardsStickerBtn1.style.cursor = "pointer";
    }
    if (rewardsStickerBtn2) {
      rewardsStickerBtn2.style.display = "block";
      rewardsStickerBtn2.disabled = true;
      rewardsStickerBtn2.textContent = `🔒 2-й сбор: ${round2Count}/${total} карт`;
      rewardsStickerBtn2.style.opacity = "0.6";
      rewardsStickerBtn2.style.cursor = "not-allowed";
    }
  } else {
    if (rewardsStatusText) {
      rewardsStatusText.textContent = `Завершено сборов: ${stats.completedRounds}/${stats.MAX_ROUNDS}`;
    }
    if (rewardsStickerBtn1) {
      rewardsStickerBtn1.disabled = false;
      rewardsStickerBtn1.textContent = "🎁 Забрать персональный стикерпак (1-й сбор)";
      rewardsStickerBtn1.style.opacity = "1";
      rewardsStickerBtn1.style.cursor = "pointer";
    }
    if (rewardsStickerBtn2) {
      rewardsStickerBtn2.style.display = "block";
      rewardsStickerBtn2.disabled = false;
      rewardsStickerBtn2.textContent = "🎁 Забрать стикерпак Charades5 (2-й сбор)";
      rewardsStickerBtn2.style.opacity = "1";
      rewardsStickerBtn2.style.cursor = "pointer";
    }
  }
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

  const cardCounts = state.profile.cardCounts || {};
  const stats = getCollectionRoundStats();
  const total = stats.total;

  if (stats.completedRounds >= stats.MAX_ROUNDS) {
    collectionCount.textContent = `Все ${stats.MAX_ROUNDS} сборов завершено (100%)`;
    collectionProgress.style.width = `100%`;
  } else {
    const progress = total === 0 ? 0 : Math.round((stats.currentRoundCount / total) * 100);
    collectionCount.textContent = `Сбор ${stats.currentRound}/${stats.MAX_ROUNDS}: ${stats.currentRoundCount}/${total}`;
    collectionProgress.style.width = `${progress}%`;
  }

  renderCardSkins();

  profileGrid.innerHTML = "";

  const skinUrl = getSelectedSkinUrl();

  state.cards.forEach((card) => {
    const count = Number(cardCounts[card.id] || 0);
    const isOpen = count >= 1;
    const node = profileCardTemplate.content.firstElementChild.cloneNode(true);
    const image = node.querySelector("img");
    const counterElement = node.querySelector(".collection-card-counter");

    image.src = isOpen ? card.imageUrl : skinUrl;
    image.alt = isOpen ? card.title : "Закрытая карта";
    node.classList.toggle("is-locked", !isOpen);

    if (counterElement) {
      counterElement.textContent = `${count}/${stats.MAX_ROUNDS}`;
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
  closeOtherModals(questsPanel);
  questsPanel.hidden = false;
  questsPanel.offsetHeight;
  questsPanel.classList.add("is-active");
  document.body.classList.add("has-modal");
  if (closeQuestsButton) {
    closeQuestsButton.focus();
  }
  refreshUserStatus();
  setActiveTab("tabQuests");
}

function closeQuests() {
  questsPanel.classList.remove("is-active");
  document.body.classList.remove("has-modal");
  setTimeout(() => {
    if (!questsPanel.classList.contains("is-active")) {
      questsPanel.hidden = true;
    }
  }, 300);
  setActiveTab("tabMain");
}

function closeLimitOverlay() {
  if (!limitOverlay) return;
  state.limitOverlayDismissed = true;
  limitOverlay.classList.remove("is-active");
  document.body.classList.remove("has-modal");
  setTimeout(() => {
    if (limitOverlay && !limitOverlay.classList.contains("is-active")) {
      limitOverlay.hidden = true;
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

// --- ADMIN PANEL SECTION ---
const adminPanel = document.querySelector("#adminPanel");
const closeAdminButton = document.querySelector("#closeAdminButton");
const adminHeaderButton = document.querySelector("#adminHeaderButton");
const adminUserSearch = document.querySelector("#adminUserSearch");
const adminUsersList = document.querySelector("#adminUsersList");

let adminStatsData = null;

if (adminHeaderButton) {
  adminHeaderButton.addEventListener("click", openAdminPanel);
}
if (closeAdminButton) {
  closeAdminButton.addEventListener("click", closeAdminPanel);
}
if (adminPanel) {
  adminPanel.addEventListener("click", (event) => {
    if (event.target === adminPanel) {
      closeAdminPanel();
    }
  });
}
if (adminUserSearch) {
  adminUserSearch.addEventListener("input", filterAdminUsers);
}

async function openAdminPanel() {
  if (!adminPanel) return;
  adminPanel.hidden = false;
  adminPanel.offsetHeight;
  adminPanel.classList.add("is-active");
  document.body.classList.add("has-modal");
  
  await loadAdminStats();
}

function closeAdminPanel() {
  if (!adminPanel) return;
  adminPanel.classList.remove("is-active");
  document.body.classList.remove("has-modal");
  setTimeout(() => {
    if (adminPanel && !adminPanel.classList.contains("is-active")) {
      adminPanel.hidden = true;
    }
  }, 300);
}

async function loadAdminStats() {
  if (!adminUsersList) return;
  try {
    adminUsersList.innerHTML = "<p style='text-align:center;color:var(--muted);padding:20px;'>Загрузка...</p>";
    
    const response = await fetch("/api/admin/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg ? tg.initData : "" })
    });
    
    if (!response.ok) {
      adminUsersList.innerHTML = "<p style='text-align:center;color:#ff4a4a;padding:20px;'>Доступ ограничен</p>";
      return;
    }
    
    const data = await response.json();
    adminStatsData = data;
    
    const totUsersEl = document.querySelector("#statTotalUsers");
    const vipUsersEl = document.querySelector("#statVipUsers");
    const actTodayEl = document.querySelector("#statActiveToday");
    const totDrawsEl = document.querySelector("#statTotalDraws");
    const blkUsersEl = document.querySelector("#statBlockedUsers");
    
    if (totUsersEl) totUsersEl.textContent = data.stats.totalUsers;
    if (vipUsersEl) vipUsersEl.textContent = data.stats.vipUsers;
    if (actTodayEl) actTodayEl.textContent = data.stats.activeUsersToday;
    if (totDrawsEl) totDrawsEl.textContent = data.stats.totalDrawsToday;
    if (blkUsersEl) blkUsersEl.textContent = data.stats.blockedUsers || 0;
    
    renderAdminUsers(data.users);
  } catch (error) {
    console.error(error);
    adminUsersList.innerHTML = "<p style='text-align:center;color:#ff4a4a;padding:20px;'>Ошибка загрузки</p>";
  }
}

function renderAdminUsers(users) {
  if (!adminUsersList) return;
  adminUsersList.innerHTML = "";
  if (users.length === 0) {
    adminUsersList.innerHTML = "<p style='text-align:center;color:var(--muted);padding:20px;'>Пользователи не найдены</p>";
    return;
  }
  
  users.forEach(user => {
    const item = document.createElement("div");
    item.className = "admin-user-item";
    
    const info = document.createElement("div");
    info.className = "admin-user-info";
    
    const nameWrap = document.createElement("div");
    nameWrap.style.display = "flex";
    nameWrap.style.alignItems = "center";
    
    const name = document.createElement("span");
    name.className = "admin-user-name";
    name.textContent = user.username && user.username !== "unknown" ? `@${user.username}` : `id: ${user.id}`;
    nameWrap.appendChild(name);
    
    if (user.isVip) {
      const badge = document.createElement("span");
      badge.className = "admin-user-badge-vip";
      badge.textContent = "VIP";
      nameWrap.appendChild(badge);
    }
    
    if (user.isBlocked) {
      const blockBadge = document.createElement("span");
      blockBadge.className = "admin-user-badge-vip"; // we can reuse classes or define custom inline styles
      blockBadge.style.cssText = "font-size: 10px; font-weight: 800; color: #ef4444; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); padding: 2px 6px; border-radius: 4px; margin-left: 6px; text-shadow: 0 1px 4px rgba(239, 68, 68, 0.2);";
      blockBadge.textContent = "Блок";
      nameWrap.appendChild(blockBadge);
    }
    
    const meta = document.createElement("span");
    meta.className = "admin-user-meta";
    meta.textContent = `Спинов: ${user.extraSpins} | Рефералов: ${user.invitedFriendsCount}`;
    
    info.appendChild(nameWrap);
    info.appendChild(meta);
    
    const draws = document.createElement("div");
    draws.className = "admin-user-draws";
    
    const drawsCount = document.createElement("span");
    drawsCount.className = "admin-user-draws-count";
    drawsCount.textContent = user.drawsTodayCount;
    
    const drawsLabel = document.createElement("span");
    drawsLabel.className = "admin-user-draws-label";
    drawsLabel.textContent = "за 24ч";
    
    draws.appendChild(drawsCount);
    draws.appendChild(drawsLabel);
    
    item.appendChild(info);
    item.appendChild(draws);
    
    adminUsersList.appendChild(item);
  });
}

function filterAdminUsers() {
  if (!adminStatsData || !adminStatsData.users) return;
  const query = adminUserSearch.value.toLowerCase().trim();
  
  const filtered = adminStatsData.users.filter(user => {
    const username = (user.username || "").toLowerCase();
    const id = String(user.id);
    return username.includes(query) || id.includes(query);
  });
  
  renderAdminUsers(filtered);
}

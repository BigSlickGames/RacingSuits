import { GAME_CONSTANTS, GameState } from "./state/gameState.js";
import { SUITS } from "./data/suits.js";
import { SuitSelectionScreen } from "./screens/suitSelectionScreen.js";
import { AnteSelectionScreen } from "./screens/anteSelectionScreen.js";
import { RaceScreen } from "./screens/raceScreen.js";
import { ResultsScreen } from "./screens/resultsScreen.js";

const MIN_BANNER_SCREEN_MS = 2800;

const gameState = new GameState(GAME_CONSTANTS.STARTING_CHIPS);
let currentScreenKey = "banner";
let menuReturnTarget = "suit";
let activeLeaderboardPage = "wins";
const settingsState = {
  soundEnabled: true,
  musicEnabled: true,
  instantWinEnabled: false
};

const appShellEl = document.getElementById("app");
const appHeaderEl = document.querySelector(".app-header");
const chipCountEl = document.getElementById("chip-count");
const bannerScreenEl = document.getElementById("screen-banner");
const floatingNavEl = document.getElementById("floating-nav");
const floatingMenuButton = document.getElementById("floating-menu-btn");
const screenTransitionStreakEl = document.getElementById("screen-transition-streak");

const menuScreenEl = document.getElementById("screen-menu");
const statsScreenEl = document.getElementById("screen-stats");
const bsgScreenEl = document.getElementById("screen-bsg");
const storeScreenEl = document.getElementById("screen-store");
const settingsScreenEl = document.getElementById("screen-settings");

const menuLeaderboardButton = document.getElementById("menu-leaderboard-btn");
const menuHomeButton = document.getElementById("menu-home-btn");
const menuSettingsButton = document.getElementById("menu-settings-btn");
const menuBsgButton = document.getElementById("menu-bsg-btn");
const menuStoreButton = document.getElementById("menu-store-btn");
const menuBackButton = document.getElementById("menu-back-btn");

const statsMenuButton = document.getElementById("stats-menu-btn");
const statsSelectionButton = document.getElementById("stats-selection-btn");
const bsgMenuButton = document.getElementById("bsg-menu-btn");
const storeMenuButton = document.getElementById("store-menu-btn");
const settingsMenuButton = document.getElementById("settings-menu-btn");
const settingsSoundToggle = document.getElementById("settings-sound-toggle");
const settingsMusicToggle = document.getElementById("settings-music-toggle");
const settingsInstantWinToggle = document.getElementById("settings-instant-win-toggle");

const winsMainValueEl = document.getElementById("wins-main-value");
const streakMainValueEl = document.getElementById("streak-main-value");
const chipsMainValueEl = document.getElementById("chips-main-value");

const winsPlayerPositionEl = document.getElementById("wins-player-position");
const streakPlayerPositionEl = document.getElementById("streak-player-position");
const chipsPlayerPositionEl = document.getElementById("chips-player-position");

const statsPageWinsButton = document.getElementById("stats-page-wins-btn");
const statsPageStreakButton = document.getElementById("stats-page-streak-btn");
const statsPageChipsButton = document.getElementById("stats-page-chips-btn");

const winsBoardPageEl = document.getElementById("wins-board-page");
const streakBoardPageEl = document.getElementById("streak-board-page");
const chipsBoardPageEl = document.getElementById("chips-board-page");

function createScreenController(screenEl) {
  return {
    show() {
      screenEl.classList.add("active");
    },
    hide() {
      screenEl.classList.remove("active");
    }
  };
}

const bannerScreen = createScreenController(bannerScreenEl);
const menuScreen = createScreenController(menuScreenEl);
const statsScreen = createScreenController(statsScreenEl);
const bsgScreen = createScreenController(bsgScreenEl);
const storeScreen = createScreenController(storeScreenEl);
const settingsScreen = createScreenController(settingsScreenEl);

const suitSelectionScreen = new SuitSelectionScreen({
  screenEl: document.getElementById("screen-suit"),
  optionsEl: document.getElementById("suit-options"),
  confirmButton: document.getElementById("suit-confirm-btn")
});

const anteSelectionScreen = new AnteSelectionScreen({
  screenEl: document.getElementById("screen-ante"),
  racerImageEl: document.getElementById("ante-racer-image"),
  sliderEl: document.getElementById("ante-slider"),
  minLabelEl: document.getElementById("ante-min-label"),
  maxLabelEl: document.getElementById("ante-max-label"),
  valueEl: document.getElementById("ante-value"),
  chipsEl: document.getElementById("available-chip-count"),
  backButton: document.getElementById("ante-back-btn"),
  confirmButton: document.getElementById("ante-confirm-btn")
});

const raceScreen = new RaceScreen({
  screenEl: document.getElementById("screen-race"),
  summaryEl: document.getElementById("race-summary"),
  gridEl: document.getElementById("race-grid"),
  leaderboardEl: document.getElementById("race-rankings"),
  drawCardEl: document.getElementById("current-draw-card"),
  startButton: document.getElementById("start-race-btn")
});

const resultsScreen = new ResultsScreen({
  screenEl: document.getElementById("screen-result"),
  bannerEl: document.getElementById("result-banner"),
  winnerImageEl: document.getElementById("result-winner-image"),
  confettiEl: document.getElementById("result-confetti"),
  copyEl: document.getElementById("result-copy"),
  raceAgainButton: document.getElementById("race-again-btn")
});

const allScreens = [
  bannerScreen,
  suitSelectionScreen,
  anteSelectionScreen,
  menuScreen,
  statsScreen,
  bsgScreen,
  storeScreen,
  settingsScreen,
  raceScreen,
  resultsScreen
];

let screenTransitionTimeoutId = null;

function formatSigned(value) {
  if (value > 0) {
    return `+${value}`;
  }
  return String(value);
}

function updateChipDisplay() {
  chipCountEl.textContent = String(gameState.chips);
}

function updateLeaderboardDisplay() {
  winsMainValueEl.textContent = String(gameState.wins);
  streakMainValueEl.textContent = String(gameState.bestStreak);
  chipsMainValueEl.textContent = formatSigned(gameState.totalChipsWon);

  winsPlayerPositionEl.textContent = `Your position: #1 | ${gameState.wins} total wins`;
  streakPlayerPositionEl.textContent = `Your position: #1 | best ${gameState.bestStreak} | current ${gameState.currentStreak}`;
  chipsPlayerPositionEl.textContent = `Your position: #1 | ${formatSigned(gameState.totalChipsWon)} over ${gameState.totalGames} games`;
}

function syncSettingsControls() {
  settingsSoundToggle.checked = settingsState.soundEnabled;
  settingsMusicToggle.checked = settingsState.musicEnabled;
  settingsInstantWinToggle.checked = settingsState.instantWinEnabled;
}

function setLeaderboardPage(pageId) {
  const normalizedPage = ["wins", "streak", "chips"].includes(pageId) ? pageId : "wins";
  activeLeaderboardPage = normalizedPage;

  const showWins = normalizedPage === "wins";
  const showStreak = normalizedPage === "streak";
  const showChips = normalizedPage === "chips";

  winsBoardPageEl.classList.toggle("active", showWins);
  streakBoardPageEl.classList.toggle("active", showStreak);
  chipsBoardPageEl.classList.toggle("active", showChips);

  statsPageWinsButton.classList.toggle("active", showWins);
  statsPageStreakButton.classList.toggle("active", showStreak);
  statsPageChipsButton.classList.toggle("active", showChips);

  statsPageWinsButton.setAttribute("aria-pressed", showWins ? "true" : "false");
  statsPageStreakButton.setAttribute("aria-pressed", showStreak ? "true" : "false");
  statsPageChipsButton.setAttribute("aria-pressed", showChips ? "true" : "false");
}

function hideAllScreens() {
  allScreens.forEach((screen) => screen.hide());
}

function setLoadingMode(isLoading) {
  appShellEl.classList.toggle("loading", isLoading);
}

function setSelectionHeaderVisible(isVisible) {
  appHeaderEl.classList.toggle("hidden", !isVisible);
}

function setFloatingMenuVisible(isVisible) {
  floatingNavEl.classList.toggle("hidden", !isVisible);
}

function playScreenTransition() {
  if (!screenTransitionStreakEl) {
    return;
  }

  screenTransitionStreakEl.classList.remove("is-active");
  void screenTransitionStreakEl.offsetWidth;
  screenTransitionStreakEl.classList.add("is-active");

  window.clearTimeout(screenTransitionTimeoutId);
  screenTransitionTimeoutId = window.setTimeout(() => {
    screenTransitionStreakEl.classList.remove("is-active");
  }, 620);
}

function setCurrentScreen(screenKey) {
  const hasChanged = currentScreenKey !== screenKey;
  currentScreenKey = screenKey;
  if (hasChanged) {
    playScreenTransition();
  }
}

function showBannerScreen() {
  hideAllScreens();
  setLoadingMode(true);
  setSelectionHeaderVisible(false);
  setFloatingMenuVisible(false);
  bannerScreen.show();
  setCurrentScreen("banner");
}

function showSuitSelectionScreen() {
  hideAllScreens();
  setLoadingMode(false);
  setSelectionHeaderVisible(true);
  setFloatingMenuVisible(true);
  suitSelectionScreen.show(gameState.selectedSuitId);
  setCurrentScreen("suit");
}

function showAnteSelectionScreen() {
  hideAllScreens();
  setLoadingMode(false);
  setSelectionHeaderVisible(true);
  setFloatingMenuVisible(true);

  anteSelectionScreen.show({
    chips: gameState.chips,
    ante: gameState.setAnte(gameState.ante),
    anteOptions: GAME_CONSTANTS.ANTE_OPTIONS,
    selectedSuitId: gameState.selectedSuitId
  });

  setCurrentScreen("ante");
}

function showMenuScreen() {
  hideAllScreens();
  setLoadingMode(false);
  setSelectionHeaderVisible(true);
  setFloatingMenuVisible(true);
  menuScreen.show();
  setCurrentScreen("menu");
}

function showStatsScreen() {
  hideAllScreens();
  setLoadingMode(false);
  setSelectionHeaderVisible(true);
  setFloatingMenuVisible(true);
  updateLeaderboardDisplay();
  setLeaderboardPage(activeLeaderboardPage);
  statsScreen.show();
  setCurrentScreen("stats");
}

function showBigSlickScreen() {
  hideAllScreens();
  setLoadingMode(false);
  setSelectionHeaderVisible(true);
  setFloatingMenuVisible(true);
  bsgScreen.show();
  setCurrentScreen("bsg");
}

function showStoreScreen() {
  hideAllScreens();
  setLoadingMode(false);
  setSelectionHeaderVisible(true);
  setFloatingMenuVisible(true);
  storeScreen.show();
  setCurrentScreen("store");
}

function showSettingsScreen() {
  hideAllScreens();
  setLoadingMode(false);
  setSelectionHeaderVisible(true);
  setFloatingMenuVisible(true);
  syncSettingsControls();
  settingsScreen.show();
  setCurrentScreen("settings");
}

function showRaceScreen() {
  hideAllScreens();
  setLoadingMode(false);
  setSelectionHeaderVisible(false);
  setFloatingMenuVisible(true);

  raceScreen.show({
    playerSuitId: gameState.selectedSuitId,
    ante: gameState.ante,
    trackLength: GAME_CONSTANTS.TRACK_LENGTH,
    instantResolveEnabled: settingsState.instantWinEnabled
  });

  setCurrentScreen("race");
}

function showResultScreen({ winnerSuitId, turnCount, settlement }) {
  hideAllScreens();
  setLoadingMode(false);
  setSelectionHeaderVisible(false);
  setFloatingMenuVisible(true);

  resultsScreen.show({
    winnerSuitId,
    playerSuitId: gameState.selectedSuitId,
    ante: gameState.ante,
    turnCount,
    settlement,
    startingChips: GAME_CONSTANTS.STARTING_CHIPS
  });

  setCurrentScreen("result");
}

function showScreenByKey(screenKey) {
  if (screenKey === "ante") {
    showAnteSelectionScreen();
    return;
  }
  if (screenKey === "race") {
    showRaceScreen();
    return;
  }
  if (screenKey === "result") {
    showSuitSelectionScreen();
    return;
  }
  if (screenKey === "stats") {
    showStatsScreen();
    return;
  }
  if (screenKey === "bsg") {
    showBigSlickScreen();
    return;
  }
  if (screenKey === "store") {
    showStoreScreen();
    return;
  }
  if (screenKey === "settings") {
    showSettingsScreen();
    return;
  }
  showSuitSelectionScreen();
}

function openMenuFromCurrentScreen() {
  if (currentScreenKey !== "menu") {
    menuReturnTarget = currentScreenKey;
  }
  showMenuScreen();
}

function returnFromMenu() {
  showScreenByKey(menuReturnTarget);
}

function goHome() {
  menuReturnTarget = "suit";
  showSuitSelectionScreen();
}

function waitMs(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function preloadImages(paths) {
  const tasks = paths.map((path) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = () => reject(new Error(`Failed to load image: ${path}`));
      image.src = path;
    });
  });

  return Promise.allSettled(tasks);
}

async function runInitialLoadScreen() {
  showBannerScreen();

  const screenStart = Date.now();
  const preloadResults = await preloadImages([
    "./assets/racing_suits_banner.png",
    ...SUITS.map((suit) => suit.racerImage)
  ]);

  const elapsed = Date.now() - screenStart;
  const failedLoads = preloadResults.filter((result) => result.status === "rejected").length;

  if (failedLoads > 0) {
    console.warn(`Racing Suits loaded with ${failedLoads} missing image asset(s).`);
  }

  if (elapsed < MIN_BANNER_SCREEN_MS) {
    await waitMs(MIN_BANNER_SCREEN_MS - elapsed);
  }

  if (failedLoads > 0) {
    await waitMs(600);
  }

  showSuitSelectionScreen();
}

suitSelectionScreen.init({
  onSuitPicked: (suitId) => {
    gameState.selectSuit(suitId);
  },
  onSuitLocked: (suitId) => {
    gameState.selectSuit(suitId);
    showAnteSelectionScreen();
  }
});

anteSelectionScreen.init({
  onBack: () => {
    showSuitSelectionScreen();
  },
  onAnteChanged: (nextAnte) => {
    gameState.setAnte(nextAnte);
  },
  onAnteLocked: (ante) => {
    gameState.setAnte(ante);
    showRaceScreen();
  }
});

raceScreen.init({
  onRaceFinished: ({ winnerSuitId, turnCount }) => {
    const settlement = gameState.settleRace(winnerSuitId);
    updateChipDisplay();
    updateLeaderboardDisplay();
    showResultScreen({ winnerSuitId, turnCount, settlement });
  }
});

resultsScreen.init({
  onRaceAgain: () => {
    showSuitSelectionScreen();
  }
});

floatingMenuButton.addEventListener("click", () => {
  openMenuFromCurrentScreen();
});

menuHomeButton.addEventListener("click", () => {
  goHome();
});

menuLeaderboardButton.addEventListener("click", () => {
  showStatsScreen();
});

menuSettingsButton.addEventListener("click", () => {
  showSettingsScreen();
});

menuBsgButton.addEventListener("click", () => {
  showBigSlickScreen();
});

menuStoreButton.addEventListener("click", () => {
  showStoreScreen();
});

menuBackButton.addEventListener("click", () => {
  returnFromMenu();
});

statsMenuButton.addEventListener("click", () => {
  showMenuScreen();
});

statsSelectionButton.addEventListener("click", () => {
  returnFromMenu();
});

bsgMenuButton.addEventListener("click", () => {
  showMenuScreen();
});

storeMenuButton.addEventListener("click", () => {
  showMenuScreen();
});

settingsMenuButton.addEventListener("click", () => {
  showMenuScreen();
});

settingsSoundToggle.addEventListener("change", () => {
  settingsState.soundEnabled = settingsSoundToggle.checked;
});

settingsMusicToggle.addEventListener("change", () => {
  settingsState.musicEnabled = settingsMusicToggle.checked;
});

settingsInstantWinToggle.addEventListener("change", () => {
  settingsState.instantWinEnabled = settingsInstantWinToggle.checked;
});

statsPageWinsButton.addEventListener("click", () => {
  setLeaderboardPage("wins");
});

statsPageStreakButton.addEventListener("click", () => {
  setLeaderboardPage("streak");
});

statsPageChipsButton.addEventListener("click", () => {
  setLeaderboardPage("chips");
});

updateChipDisplay();
updateLeaderboardDisplay();
syncSettingsControls();
setLeaderboardPage("wins");
runInitialLoadScreen();

import { GAME_CONSTANTS, GameState } from "./state/gameState.js";
import { SUITS } from "./data/suits.js";
import { SuitSelectionScreen } from "./screens/suitSelectionScreen.js";
import { AnteSelectionScreen } from "./screens/anteSelectionScreen.js";
import { RaceScreen } from "./screens/raceScreen.js";
import { ResultsScreen } from "./screens/resultsScreen.js";

const MIN_BANNER_SCREEN_MS = 2800;

const gameState = new GameState(GAME_CONSTANTS.STARTING_CHIPS);

const appShellEl = document.getElementById("app");
const appHeaderEl = document.querySelector(".app-header");
const chipCountEl = document.getElementById("chip-count");
const bannerScreenEl = document.getElementById("screen-banner");

const bannerScreen = {
  show() {
    bannerScreenEl.classList.add("active");
  },
  hide() {
    bannerScreenEl.classList.remove("active");
  }
};

const suitSelectionScreen = new SuitSelectionScreen({
  screenEl: document.getElementById("screen-suit"),
  optionsEl: document.getElementById("suit-options"),
  confirmButton: document.getElementById("suit-confirm-btn")
});

const anteSelectionScreen = new AnteSelectionScreen({
  screenEl: document.getElementById("screen-ante"),
  buttonGroupEl: document.getElementById("ante-button-group"),
  valueEl: document.getElementById("ante-value"),
  chipsEl: document.getElementById("available-chip-count"),
  backButton: document.getElementById("ante-back-btn"),
  confirmButton: document.getElementById("ante-confirm-btn")
});

const raceScreen = new RaceScreen({
  screenEl: document.getElementById("screen-race"),
  summaryEl: document.getElementById("race-summary"),
  gridEl: document.getElementById("race-grid"),
  drawCardEl: document.getElementById("current-draw-card"),
  startButton: document.getElementById("start-race-btn"),
  logEl: document.getElementById("race-log")
});

const resultsScreen = new ResultsScreen({
  screenEl: document.getElementById("screen-result"),
  bannerEl: document.getElementById("result-banner"),
  copyEl: document.getElementById("result-copy"),
  raceAgainButton: document.getElementById("race-again-btn")
});

const allScreens = [
  bannerScreen,
  suitSelectionScreen,
  anteSelectionScreen,
  raceScreen,
  resultsScreen
];

function updateChipDisplay() {
  chipCountEl.textContent = String(gameState.chips);
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

function showBannerScreen() {
  hideAllScreens();
  setLoadingMode(true);
  setSelectionHeaderVisible(false);
  bannerScreen.show();
}

function showSuitSelectionScreen() {
  hideAllScreens();
  setLoadingMode(false);
  setSelectionHeaderVisible(true);
  suitSelectionScreen.show(gameState.selectedSuitId);
}

function showAnteSelectionScreen() {
  hideAllScreens();
  setSelectionHeaderVisible(true);
  const normalizedAnte = gameState.setAnte(gameState.ante);

  anteSelectionScreen.show({
    chips: gameState.chips,
    ante: normalizedAnte,
    anteOptions: GAME_CONSTANTS.ANTE_OPTIONS
  });
}

function showRaceScreen() {
  hideAllScreens();
  setSelectionHeaderVisible(false);
  raceScreen.show({
    playerSuitId: gameState.selectedSuitId,
    ante: gameState.ante,
    trackLength: GAME_CONSTANTS.TRACK_LENGTH
  });
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
  onAnteLocked: (lockedAnte) => {
    gameState.setAnte(lockedAnte);
    showRaceScreen();
  }
});

raceScreen.init({
  onRaceFinished: ({ winnerSuitId, turnCount }) => {
    const settlement = gameState.settleRace(winnerSuitId);
    updateChipDisplay();

    hideAllScreens();
    setSelectionHeaderVisible(false);
    resultsScreen.show({
      winnerSuitId,
      playerSuitId: gameState.selectedSuitId,
      ante: gameState.ante,
      turnCount,
      settlement,
      startingChips: GAME_CONSTANTS.STARTING_CHIPS
    });
  }
});

resultsScreen.init({
  onRaceAgain: () => {
    showSuitSelectionScreen();
  }
});

updateChipDisplay();
runInitialLoadScreen();

import { GAME_CONSTANTS, GameState } from "./state/gameState.js";
import { SUITS } from "./data/suits.js";
import { SuitSelectionScreen } from "./screens/suitSelectionScreen.js";
import { AnteSelectionScreen } from "./screens/anteSelectionScreen.js";
import { RaceScreen } from "./screens/raceScreen.js";
import { ResultsScreen } from "./screens/resultsScreen.js";

const MIN_BANNER_SCREEN_MS = 2800;

const gameState = new GameState(GAME_CONSTANTS.STARTING_CHIPS);
let selectionReturnTarget = "suit";

const appShellEl = document.getElementById("app");
const appHeaderEl = document.querySelector(".app-header");
const chipCountEl = document.getElementById("chip-count");
const bannerScreenEl = document.getElementById("screen-banner");

const menuScreenEl = document.getElementById("screen-menu");
const statsScreenEl = document.getElementById("screen-stats");

const openMenuButton = document.getElementById("open-menu-btn");
const menuStatsButton = document.getElementById("menu-stats-btn");
const menuBackButton = document.getElementById("menu-back-btn");
const statsMenuButton = document.getElementById("stats-menu-btn");
const statsSelectionButton = document.getElementById("stats-selection-btn");

const statsWinsValueEl = document.getElementById("stats-wins-value");
const statsStreakValueEl = document.getElementById("stats-streak-value");
const statsGamesValueEl = document.getElementById("stats-games-value");
const statsNetChipsValueEl = document.getElementById("stats-netchips-value");
const winsLeaderboardBodyEl = document.getElementById("wins-leaderboard-body");
const chipsLeaderboardBodyEl = document.getElementById("chips-leaderboard-body");
const suitLookup = SUITS.reduce((accumulator, suit) => {
  accumulator[suit.id] = suit;
  return accumulator;
}, {});

const bannerScreen = {
  show() {
    bannerScreenEl.classList.add("active");
  },
  hide() {
    bannerScreenEl.classList.remove("active");
  }
};

const menuScreen = {
  show() {
    menuScreenEl.classList.add("active");
  },
  hide() {
    menuScreenEl.classList.remove("active");
  }
};

const statsScreen = {
  show() {
    statsScreenEl.classList.add("active");
  },
  hide() {
    statsScreenEl.classList.remove("active");
  }
};

const suitSelectionScreen = new SuitSelectionScreen({
  screenEl: document.getElementById("screen-suit"),
  optionsEl: document.getElementById("suit-options"),
  confirmButton: document.getElementById("suit-confirm-btn")
});

const anteSelectionScreen = new AnteSelectionScreen({
  screenEl: document.getElementById("screen-ante"),
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
  raceScreen,
  resultsScreen
];

function updateChipDisplay() {
  chipCountEl.textContent = String(gameState.chips);
}

function formatSigned(value) {
  if (value > 0) {
    return `+${value}`;
  }
  return String(value);
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function renderWinsLeaderboard(entries) {
  winsLeaderboardBodyEl.innerHTML = entries.map((entry, index) => {
    const suit = suitLookup[entry.suitId];
    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <span class="stats-racer-tag">
            <img class="stats-racer-thumb" src="${suit.racerImage}" alt="${suit.name}">
            <span>${suit.name}</span>
          </span>
        </td>
        <td>${entry.wins}</td>
        <td>${entry.bestStreak}</td>
      </tr>
    `;
  }).join("");
}

function renderChipLeaderboard(entries) {
  chipsLeaderboardBodyEl.innerHTML = entries.map((entry, index) => {
    const suit = suitLookup[entry.suitId];
    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <span class="stats-racer-tag">
            <img class="stats-racer-thumb" src="${suit.racerImage}" alt="${suit.name}">
            <span>${suit.name}</span>
          </span>
        </td>
        <td>${formatSigned(entry.chipsNet)}</td>
        <td>${entry.games}</td>
        <td>${entry.bestStreak}</td>
        <td>${formatPercent(entry.winRatePct)}</td>
        <td>${formatPercent(entry.roiPct)}</td>
      </tr>
    `;
  }).join("");
}

function updateStatsDisplay() {
  statsWinsValueEl.textContent = String(gameState.wins);
  statsStreakValueEl.textContent = String(gameState.currentStreak);
  statsGamesValueEl.textContent = String(gameState.totalGames);
  statsNetChipsValueEl.textContent = formatSigned(gameState.totalChipDelta);

  const { winsLeaderboard, chipLeaderboard } = gameState.getSuitLeaderboards();
  renderWinsLeaderboard(winsLeaderboard);
  renderChipLeaderboard(chipLeaderboard);
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
  selectionReturnTarget = "suit";

  suitSelectionScreen.show(gameState.selectedSuitId);
}

function showAnteSelectionScreen() {
  hideAllScreens();
  setLoadingMode(false);
  setSelectionHeaderVisible(true);
  selectionReturnTarget = "ante";

  anteSelectionScreen.show({
    chips: gameState.chips,
    ante: gameState.setAnte(gameState.ante),
    anteOptions: GAME_CONSTANTS.ANTE_OPTIONS
  });
}

function showMenuScreen() {
  hideAllScreens();
  setLoadingMode(false);
  setSelectionHeaderVisible(true);
  menuScreen.show();
}

function showStatsScreen() {
  hideAllScreens();
  setLoadingMode(false);
  setSelectionHeaderVisible(true);
  updateStatsDisplay();
  statsScreen.show();
}

function returnToSelectionTarget() {
  if (selectionReturnTarget === "ante") {
    showAnteSelectionScreen();
    return;
  }

  showSuitSelectionScreen();
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
  onAnteLocked: (ante) => {
    gameState.setAnte(ante);
    showRaceScreen();
  }
});

raceScreen.init({
  onRaceFinished: ({ winnerSuitId, turnCount }) => {
    const settlement = gameState.settleRace(winnerSuitId);
    updateChipDisplay();
    updateStatsDisplay();

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

openMenuButton.addEventListener("click", () => {
  showMenuScreen();
});

menuStatsButton.addEventListener("click", () => {
  showStatsScreen();
});

menuBackButton.addEventListener("click", () => {
  returnToSelectionTarget();
});

statsMenuButton.addEventListener("click", () => {
  showMenuScreen();
});

statsSelectionButton.addEventListener("click", () => {
  returnToSelectionTarget();
});

updateChipDisplay();
updateStatsDisplay();
runInitialLoadScreen();


import { GAME_CONSTANTS, GameState } from "./state/gameState.js";
import { SuitSelectionScreen } from "./screens/suitSelectionScreen.js";
import { AnteSelectionScreen } from "./screens/anteSelectionScreen.js";
import { RaceScreen } from "./screens/raceScreen.js";
import { ResultsScreen } from "./screens/resultsScreen.js";

const gameState = new GameState(GAME_CONSTANTS.STARTING_CHIPS);

const chipCountEl = document.getElementById("chip-count");

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

function showSuitSelectionScreen() {
  hideAllScreens();
  suitSelectionScreen.show(gameState.selectedSuitId);
}

function showAnteSelectionScreen() {
  hideAllScreens();
  const normalizedAnte = gameState.setAnte(gameState.ante);

  anteSelectionScreen.show({
    chips: gameState.chips,
    ante: normalizedAnte,
    anteOptions: GAME_CONSTANTS.ANTE_OPTIONS
  });
}

function showRaceScreen() {
  hideAllScreens();
  raceScreen.show({
    playerSuitId: gameState.selectedSuitId,
    ante: gameState.ante,
    trackLength: GAME_CONSTANTS.TRACK_LENGTH
  });
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
showSuitSelectionScreen();

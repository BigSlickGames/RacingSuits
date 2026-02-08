import { SUITS, getSuitById } from "../data/suits.js";
import { RaceEngine } from "../engine/raceEngine.js";

const RACE_TICK_MS = 850;

const LANE_TONES = Object.freeze({
  hearts: {
    dark: "rgb(54 20 29)",
    lit: "rgb(245 82 118)"
  },
  clubs: {
    dark: "rgb(21 45 64)",
    lit: "rgb(86 197 255)"
  },
  diamonds: {
    dark: "rgb(30 52 36)",
    lit: "rgb(118 236 143)"
  },
  spades: {
    dark: "rgb(34 34 42)",
    lit: "rgb(174 174 188)"
  }
});

function getLaneToneColor(suitId, isLit) {
  const tone = LANE_TONES[suitId] ?? { dark: "rgb(38 38 46)", lit: "rgb(168 168 180)" };
  return isLit ? tone.lit : tone.dark;
}

function getRankLabel(rank) {
  if (rank % 10 === 1 && rank % 100 !== 11) {
    return `${rank}st`;
  }

  if (rank % 10 === 2 && rank % 100 !== 12) {
    return `${rank}nd`;
  }

  if (rank % 10 === 3 && rank % 100 !== 13) {
    return `${rank}rd`;
  }

  return `${rank}th`;
}

function getOrderedSuitsByPosition(positions) {
  const suitOrderMap = SUITS.reduce((accumulator, suit, index) => {
    accumulator[suit.id] = index;
    return accumulator;
  }, {});

  return [...SUITS].sort((left, right) => {
    const positionDiff = positions[right.id] - positions[left.id];
    if (positionDiff !== 0) {
      return positionDiff;
    }

    return suitOrderMap[left.id] - suitOrderMap[right.id];
  });
}

export class RaceScreen {
  constructor({
    screenEl,
    summaryEl,
    gridEl,
    leaderboardEl,
    drawCardEl,
    startButton
  }) {
    this.screenEl = screenEl;
    this.summaryEl = summaryEl;
    this.gridEl = gridEl;
    this.leaderboardEl = leaderboardEl;
    this.drawCardEl = drawCardEl;
    this.startButton = startButton;

    this.engine = null;
    this.intervalId = null;
    this.playerSuitId = null;
    this.trackLength = 10;
    this.ante = 10;

    this.handlers = {
      onRaceFinished: () => {}
    };

    this.startButton.addEventListener("click", () => {
      this.startRace();
    });
  }

  init(handlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  show({ playerSuitId, ante, trackLength }) {
    this.stopRaceLoop();
    this.playerSuitId = playerSuitId;
    this.ante = ante;
    this.trackLength = trackLength;
    this.engine = new RaceEngine(trackLength);

    this.renderSummary();
    this.renderRaceState(this.engine.snapshot());
    this.setDrawCard(null);

    this.startButton.disabled = false;
    this.startButton.textContent = "Start Race!";
    this.screenEl.classList.add("active");
  }

  hide() {
    this.stopRaceLoop();
    this.screenEl.classList.remove("active");
  }

  renderSummary() {
    const playerSuit = getSuitById(this.playerSuitId);
    this.summaryEl.innerHTML = `
      Backing <strong>${playerSuit.name}</strong>
      | Ante <strong>${this.ante} chips</strong>
      | Track <strong>${this.trackLength} lengths</strong>
    `;
  }

  renderRaceState(snapshot) {
    this.renderGrid(snapshot.positions, snapshot.checkpoints);
    this.renderLeaderboard(snapshot.positions);
  }

  renderGrid(positions, checkpoints) {
    const rowMarkup = [];

    for (let length = this.trackLength; length >= 0; length -= 1) {
      const isFinish = length === this.trackLength;
      const isStart = length === 0;

      const rowClasses = [
        "track-row",
        isFinish ? "finish-row" : "",
        isStart ? "start-row" : ""
      ].join(" ").trim();

      const laneCellsMarkup = SUITS.map((suit) => {
        const isCurrentPosition = length === positions[suit.id];
        const isPlayerCurrentPosition = isCurrentPosition && suit.id === this.playerSuitId;
        const laneColor = getLaneToneColor(suit.id, isCurrentPosition);
        const markerMarkup = isCurrentPosition
          ? `<img class="lane-racer-icon${isPlayerCurrentPosition ? " player" : ""}" src="${suit.racerImage}" alt="" aria-hidden="true">`
          : "";

        return `
          <div
            class="track-cell lane-cell ${suit.id}${isFinish ? " finish" : ""}${isCurrentPosition ? " lit" : ""}${isPlayerCurrentPosition ? " player-lit" : ""}"
            style="--lane-fill: ${laneColor};"
            data-suit-id="${suit.id}"
            data-length="${length}"
          >${markerMarkup}</div>
        `;
      }).join("");

      let sideCardMarkup = "";
      if (isStart || isFinish) {
        sideCardMarkup = `<div class="track-cell side-card-cell no-card" aria-hidden="true">-</div>`;
      } else {
        const checkpoint = checkpoints[length - 1];
        if (!checkpoint || !checkpoint.revealed) {
          sideCardMarkup = `<div class="track-cell side-card-cell face-down" title="Length ${length} checkpoint">?</div>`;
        } else {
          const revealedSuit = getSuitById(checkpoint.suitId);
          sideCardMarkup = `
            <div class="track-cell side-card-cell ${revealedSuit.id}" title="Length ${length} flipped ${revealedSuit.name}">
              <img class="side-card-image" src="${revealedSuit.racerImage}" alt="${revealedSuit.name} card">
            </div>
          `;
        }
      }

      rowMarkup.push(`
        <div class="${rowClasses}">
          ${laneCellsMarkup}
          ${sideCardMarkup}
        </div>
      `);
    }

    this.gridEl.innerHTML = rowMarkup.join("");
  }

  renderLeaderboard(positions) {
    const orderedSuits = getOrderedSuitsByPosition(positions);

    this.leaderboardEl.innerHTML = orderedSuits.map((suit, index) => {
      const rank = index + 1;
      const isLeader = rank === 1;
      const isPlayer = suit.id === this.playerSuitId;

      return `
        <div class="leaderboard-entry${isLeader ? " leader" : ""}${isPlayer ? " player" : ""}">
          <span class="leaderboard-rank">${getRankLabel(rank)}</span>
          <img class="leaderboard-racer" src="${suit.racerImage}" alt="${suit.name} racer">
          <span class="leaderboard-distance">L${positions[suit.id]}</span>
        </div>
      `;
    }).join("");
  }

  setDrawCard(suitId) {
    this.drawCardEl.classList.remove("flip");
    void this.drawCardEl.offsetWidth;
    this.drawCardEl.classList.add("flip");

    if (!suitId) {
      this.drawCardEl.className = "draw-card face-down flip";
      this.drawCardEl.innerHTML = "<span class=\"draw-card-back\">?</span>";
      return;
    }

    const suit = getSuitById(suitId);
    this.drawCardEl.className = `draw-card ${suit.id} flip`;
    this.drawCardEl.innerHTML = `<img class="draw-card-image" src="${suit.racerImage}" alt="${suit.name} card">`;
  }

  startRace() {
    if (!this.engine || this.intervalId) {
      return;
    }

    this.startButton.disabled = true;
    this.startButton.textContent = "Racing...";

    this.intervalId = setInterval(() => {
      this.runTurn();
    }, RACE_TICK_MS);
  }

  runTurn() {
    const turnResult = this.engine.playTurn();

    this.setDrawCard(turnResult.drawnSuitId);
    this.renderRaceState(turnResult);

    if (turnResult.winnerSuitId) {
      this.finishRace(turnResult);
    }
  }

  finishRace(turnResult) {
    this.stopRaceLoop();
    this.startButton.textContent = "Race Complete";
    this.startButton.disabled = true;

    window.setTimeout(() => {
      this.handlers.onRaceFinished({
        winnerSuitId: turnResult.winnerSuitId,
        turnCount: turnResult.turnCount
      });
    }, 1100);
  }

  stopRaceLoop() {
    if (!this.intervalId) {
      return;
    }
    clearInterval(this.intervalId);
    this.intervalId = null;
  }
}


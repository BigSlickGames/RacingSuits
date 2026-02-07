import { SUITS, getSuitById } from "../data/suits.js";
import { RaceEngine } from "../engine/raceEngine.js";

const RACE_TICK_MS = 850;
const MAX_LOG_ENTRIES = 10;
const LANE_BASE_COLORS = Object.freeze({
  hearts: [255, 94, 94],
  clubs: [158, 223, 255],
  diamonds: [167, 247, 176],
  spades: [112, 112, 112]
});

function getLaneShadeColor(suitId, length, trackLength) {
  const baseColor = LANE_BASE_COLORS[suitId] ?? [140, 140, 140];
  const progress = trackLength === 0 ? 0 : length / trackLength;
  const darkness = 0.08 + (progress * 0.55);

  const [r, g, b] = baseColor.map((channel) => {
    return Math.max(16, Math.round(channel * (1 - darkness)));
  });

  return `rgb(${r} ${g} ${b})`;
}

export class RaceScreen {
  constructor({
    screenEl,
    summaryEl,
    gridEl,
    drawCardEl,
    startButton,
    logEl
  }) {
    this.screenEl = screenEl;
    this.summaryEl = summaryEl;
    this.gridEl = gridEl;
    this.drawCardEl = drawCardEl;
    this.startButton = startButton;
    this.logEl = logEl;

    this.engine = null;
    this.intervalId = null;
    this.playerSuitId = null;
    this.trackLength = 10;
    this.ante = 10;
    this.logEntries = [];

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
    this.logEntries = [];

    this.renderSummary();
    this.renderRaceState(this.engine.snapshot());
    this.setDrawCard(null);
    this.logEntries = [];
    this.logEl.innerHTML = "";

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
      Backing <strong>${playerSuit.symbol} ${playerSuit.name}</strong>
      | Ante <strong>${this.ante} chips</strong>
      | Track <strong>${this.trackLength} lengths</strong>
    `;
  }

  renderRaceState(snapshot) {
    this.renderGrid(snapshot.positions, snapshot.checkpoints);
  }

  renderGrid(positions, checkpoints) {
    const headerCellsMarkup = SUITS.map((suit) => {
      return `
        <div class="track-header-cell suit-header ${suit.id}">
          <span class="header-symbol">${suit.symbol}</span>
          <span class="header-name">${suit.name}</span>
        </div>
      `;
    }).join("");

    const rowMarkup = [];

    for (let length = this.trackLength; length >= 0; length -= 1) {
      const isFinish = length === this.trackLength;
      const isStart = length === 0;

      const lengthLabel = isFinish ? "FINISH" : (isStart ? "START" : `L${length}`);
      const rowClasses = [
        "track-row",
        isFinish ? "finish-row" : "",
        isStart ? "start-row" : ""
      ].join(" ").trim();

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
              ${revealedSuit.symbol}
            </div>
          `;
        }
      }

      const laneCellsMarkup = SUITS.map((suit) => {
        const hasToken = positions[suit.id] === length;
        const laneColor = getLaneShadeColor(suit.id, length, this.trackLength);
        const tokenMarkup = hasToken
          ? `<div class="racer-token ${suit.id}" aria-label="${suit.name} racer">${suit.symbol}</div>`
          : "";

        return `
          <div
            class="track-cell lane-cell ${suit.id}${isFinish ? " finish" : ""}${isStart ? " start" : ""}"
            style="background-color: ${laneColor};"
            data-suit-id="${suit.id}"
            data-length="${length}"
          >
            ${tokenMarkup}
          </div>
        `;
      }).join("");

      rowMarkup.push(`
        <div class="${rowClasses}">
          <div class="track-header-cell length-cell">${lengthLabel}</div>
          ${sideCardMarkup}
          ${laneCellsMarkup}
        </div>
      `);
    }

    this.gridEl.innerHTML = `
      <div class="track-header-row">
        <div class="track-header-cell length-head">Length</div>
        <div class="track-header-cell side-card-head">Card</div>
        ${headerCellsMarkup}
      </div>
      ${rowMarkup.join("")}
    `;
  }

  setDrawCard(suitId) {
    this.drawCardEl.classList.remove("flip");
    void this.drawCardEl.offsetWidth;
    this.drawCardEl.classList.add("flip");

    if (!suitId) {
      this.drawCardEl.className = "draw-card face-down flip";
      this.drawCardEl.textContent = "?";
      return;
    }

    const suit = getSuitById(suitId);
    this.drawCardEl.className = `draw-card ${suit.id} flip`;
    this.drawCardEl.textContent = suit.symbol;
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
    const drawnSuit = getSuitById(turnResult.drawnSuitId);

    this.setDrawCard(turnResult.drawnSuitId);
    this.renderRaceState(turnResult);

    this.pushLog(`${drawnSuit.symbol} ${drawnSuit.name} moves to length ${turnResult.movedTo}.`);

    turnResult.checkpointEvents.forEach((event) => {
      const setbackSuit = getSuitById(event.suitId);
      if (event.to < event.from) {
        this.pushLog(
          `Length ${event.length} flips ${setbackSuit.symbol} ${setbackSuit.name}. It falls back to ${event.to}.`
        );
      } else {
        this.pushLog(
          `Length ${event.length} flips ${setbackSuit.symbol} ${setbackSuit.name}. It was already on that length.`
        );
      }
    });

    if (turnResult.winnerSuitId) {
      this.finishRace(turnResult);
    }
  }

  finishRace(turnResult) {
    this.stopRaceLoop();
    this.startButton.textContent = "Race Complete";
    this.startButton.disabled = true;

    const winner = getSuitById(turnResult.winnerSuitId);
    this.pushLog(`${winner.symbol} ${winner.name} hits the finish line!`);

    window.setTimeout(() => {
      this.handlers.onRaceFinished({
        winnerSuitId: turnResult.winnerSuitId,
        turnCount: turnResult.turnCount
      });
    }, 1100);
  }

  pushLog(message) {
    this.logEntries.push(message);
    if (this.logEntries.length > MAX_LOG_ENTRIES) {
      this.logEntries.shift();
    }

    this.logEl.innerHTML = this.logEntries
      .map((entry) => `<div class="log-entry">${entry}</div>`)
      .join("");

    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  stopRaceLoop() {
    if (!this.intervalId) {
      return;
    }
    clearInterval(this.intervalId);
    this.intervalId = null;
  }
}

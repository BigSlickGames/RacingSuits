import { SUITS, getSuitById } from "../data/suits.js";
import { RaceEngine } from "../engine/raceEngine.js";

const RACE_TICK_MS = 850;
const MAX_LOG_ENTRIES = 10;

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
    this.pushLog("Click Start Race! to flip cards and move the suits.");

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
    this.gridEl.style.setProperty("--track-column-count", String(this.trackLength + 1));

    const lengthHeaderCells = [];
    const checkpointCells = [];

    for (let length = 0; length <= this.trackLength; length += 1) {
      const isFinish = length === this.trackLength;

      let headerLabel = String(length);
      if (length === 0) {
        headerLabel = "S";
      } else if (isFinish) {
        headerLabel = "F";
      }

      lengthHeaderCells.push(`
        <div class="length-header-cell${isFinish ? " finish" : ""}">${headerLabel}</div>
      `);

      if (length === 0) {
        checkpointCells.push(`
          <div class="track-cell checkpoint-slot start-gap" aria-hidden="true">-</div>
        `);
        continue;
      }

      const checkpoint = checkpoints[length - 1];
      if (!checkpoint || !checkpoint.revealed) {
        checkpointCells.push(`
          <div class="track-cell checkpoint-slot face-down" title="Length ${length} checkpoint">?</div>
        `);
        continue;
      }

      const suit = getSuitById(checkpoint.suitId);
      checkpointCells.push(`
        <div class="track-cell checkpoint-slot ${suit.id}" title="Length ${length} flipped ${suit.name}">
          ${suit.symbol}
        </div>
      `);
    }

    const guideRows = `
      <div class="race-lane">
        <div class="lane-label length-label">Lengths</div>
        ${lengthHeaderCells.join("")}
      </div>
      <div class="race-lane">
        <div class="lane-label checkpoint-label">Side Cards</div>
        ${checkpointCells.join("")}
      </div>
    `;

    const lanesMarkup = SUITS.map((suit) => {
      const laneCells = [];

      for (let length = 0; length <= this.trackLength; length += 1) {
        const isFinish = length === this.trackLength;
        const hasToken = positions[suit.id] === length;

        const tokenMarkup = hasToken
          ? `<div class="racer-token ${suit.id}" aria-label="${suit.name} racer">${suit.symbol}</div>`
          : "";

        laneCells.push(`
          <div class="track-cell${isFinish ? " finish" : ""}" data-length="${length}">
            ${tokenMarkup}
          </div>
        `);
      }

      return `
        <div class="race-lane">
          <div class="lane-label">${suit.symbol} ${suit.name}</div>
          ${laneCells.join("")}
        </div>
      `;
    }).join("");

    this.gridEl.innerHTML = `${guideRows}${lanesMarkup}`;
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
    this.pushLog("The starter bell rings and the race is on.");

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

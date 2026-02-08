import { SUITS, getSuitById } from "../data/suits.js";
import { RaceEngine } from "../engine/raceEngine.js";

const RACE_TICK_MS = 850;

const LANE_TONES = Object.freeze({
  hearts: {
    dark: "rgb(126 0 0)",
    lit: "rgb(255 22 22)"
  },
  clubs: {
    dark: "rgb(20 45 160)",
    lit: "rgb(20 57 255)"
  },
  diamonds: {
    dark: "rgb(0 92 10)",
    lit: "rgb(122 245 122)"
  },
  spades: {
    dark: "rgb(8 12 22)",
    lit: "rgb(234 234 234)"
  }
});

function getLaneToneColor(suitId, isLit) {
  const tone = LANE_TONES[suitId] ?? { dark: "rgb(38 38 46)", lit: "rgb(168 168 180)" };
  return isLit ? tone.lit : tone.dark;
}

function getRankLabel(rank) {
  if (rank === 1) {
    return "\uD83E\uDD47";
  }
  if (rank === 2) {
    return "\uD83E\uDD48";
  }
  if (rank === 3) {
    return "\uD83E\uDD49";
  }
  return `#${rank}`;
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
    this.instantResolveEnabled = false;
    this.leaderboardNodes = new Map();

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

  show({ playerSuitId, ante, trackLength, instantResolveEnabled }) {
    this.stopRaceLoop();
    this.playerSuitId = playerSuitId;
    this.ante = ante;
    this.trackLength = trackLength;
    this.instantResolveEnabled = Boolean(instantResolveEnabled);
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
        const position = positions[suit.id];
        const isCurrentPosition = length === positions[suit.id];
        const isLit = length <= position;
        const isPlayerCurrentPosition = isCurrentPosition && suit.id === this.playerSuitId;
        const laneColor = getLaneToneColor(suit.id, isLit);
        const markerMarkup = isCurrentPosition
          ? `<img class="lane-racer-icon${isPlayerCurrentPosition ? " player" : ""}" src="${suit.racerImage}" alt="" aria-hidden="true">`
          : "";

        return `
          <div
            class="track-cell lane-cell ${suit.id}${isFinish ? " finish" : ""}${isLit ? " lit" : ""}${isPlayerCurrentPosition ? " player-lit" : ""}"
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
    this.ensureLeaderboardNodes();

    const firstY = new Map();
    this.leaderboardNodes.forEach((entryNode, suitId) => {
      firstY.set(suitId, entryNode.getBoundingClientRect().top);
    });

    orderedSuits.forEach((suit, index) => {
      const rank = index + 1;
      const isLeader = rank === 1;
      const isPlayer = suit.id === this.playerSuitId;
      const entryNode = this.leaderboardNodes.get(suit.id);

      entryNode.classList.toggle("leader", isLeader);
      entryNode.classList.toggle("player", isPlayer);
      entryNode.querySelector(".leaderboard-rank").textContent = getRankLabel(rank);
      entryNode.querySelector(".leaderboard-distance").textContent = `L${positions[suit.id]}`;

      this.leaderboardEl.appendChild(entryNode);
    });

    this.animateLeaderboardReorder(firstY);
  }

  ensureLeaderboardNodes() {
    if (this.leaderboardNodes.size === SUITS.length) {
      return;
    }

    this.leaderboardNodes.clear();
    this.leaderboardEl.innerHTML = "";

    SUITS.forEach((suit) => {
      const entryNode = document.createElement("div");
      entryNode.className = "leaderboard-entry";
      entryNode.dataset.suitId = suit.id;
      entryNode.innerHTML = `
        <span class="leaderboard-rank"></span>
        <img class="leaderboard-racer" src="${suit.racerImage}" alt="${suit.name} racer">
        <span class="leaderboard-distance">L0</span>
      `;

      this.leaderboardNodes.set(suit.id, entryNode);
      this.leaderboardEl.appendChild(entryNode);
    });
  }

  animateLeaderboardReorder(firstY) {
    this.leaderboardNodes.forEach((entryNode, suitId) => {
      const previousY = firstY.get(suitId);
      if (previousY === undefined) {
        return;
      }

      const currentY = entryNode.getBoundingClientRect().top;
      const deltaY = previousY - currentY;
      if (Math.abs(deltaY) < 0.5) {
        return;
      }

      entryNode.style.transition = "none";
      entryNode.style.transform = `translateY(${deltaY}px)`;
      void entryNode.offsetWidth;
      entryNode.style.transition = "transform 280ms ease";
      entryNode.style.transform = "translateY(0)";
    });
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
    this.startButton.textContent = this.instantResolveEnabled ? "Resolving..." : "Racing...";

    if (this.instantResolveEnabled) {
      this.resolveRaceInstantly();
      return;
    }

    this.intervalId = setInterval(() => {
      this.runTurn();
    }, RACE_TICK_MS);
  }

  resolveRaceInstantly() {
    if (!this.engine) {
      return;
    }

    let turnResult = null;
    const maxTurns = Math.max(30, this.trackLength * 250);

    for (let index = 0; index < maxTurns; index += 1) {
      turnResult = this.engine.playTurn();
      if (turnResult.winnerSuitId) {
        break;
      }
    }

    if (!turnResult) {
      return;
    }

    this.setDrawCard(turnResult.drawnSuitId);
    this.renderRaceState(turnResult);

    if (turnResult.winnerSuitId) {
      window.setTimeout(() => {
        this.finishRace(turnResult);
      }, 420);
    }
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
    const resultDelayMs = this.instantResolveEnabled ? 260 : 1100;

    window.setTimeout(() => {
      this.handlers.onRaceFinished({
        winnerSuitId: turnResult.winnerSuitId,
        turnCount: turnResult.turnCount
      });
    }, resultDelayMs);
  }

  stopRaceLoop() {
    if (!this.intervalId) {
      return;
    }
    clearInterval(this.intervalId);
    this.intervalId = null;
  }
}


import { AnimationManager } from "../animation/animationManager.js";
import { SUITS, getSuitById } from "../data/suits.js";

const RACE_TICK_MS = 820;

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

const SUIT_ORDER = SUITS.reduce((accumulator, suit, index) => {
  accumulator[suit.id] = index;
  return accumulator;
}, {});

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
  return [...SUITS].sort((left, right) => {
    const positionDiff = positions[right.id] - positions[left.id];
    if (positionDiff !== 0) {
      return positionDiff;
    }
    return SUIT_ORDER[left.id] - SUIT_ORDER[right.id];
  });
}

function markerTransform(anchor) {
  return `translate3d(${anchor.x}px, ${anchor.y}px, 0)`;
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

    this.animationManager = new AnimationManager();

    this.playerSuitId = null;
    this.ante = 10;
    this.trackLength = 10;
    this.instantResolveEnabled = false;
    this.replay = null;
    this.playbackTimerId = null;
    this.playbackCursor = 0;

    this.laneCells = new Map();
    this.markerNodes = new Map();
    this.markerAnchors = new Map();
    this.checkpointNodes = new Map();
    this.leaderboardNodes = new Map();
    this.currentFrame = null;

    this.handlers = {
      onRaceFinished: () => {}
    };

    this.startButton.addEventListener("click", () => {
      this.startRace();
    });

    window.addEventListener("resize", () => {
      this.recalculateAnchors();
    });
  }

  init(handlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  show({ playerSuitId, ante, raceResult, replay, instantResolveEnabled }) {
    this.stopRaceLoop();
    this.playerSuitId = playerSuitId;
    this.ante = ante;
    this.trackLength = raceResult.config.trackLength;
    this.replay = replay;
    this.instantResolveEnabled = Boolean(instantResolveEnabled);

    this.renderSummary(raceResult.seed);
    this.buildGrid(raceResult.frames[0]);
    this.ensureLeaderboardNodes();
    this.applyFrame(raceResult.frames[0], false);
    this.setDrawCard(null);

    this.startButton.disabled = false;
    this.startButton.textContent = "Start Race!";
    this.playbackCursor = 0;
    this.screenEl.classList.add("active");
  }

  hide() {
    this.stopRaceLoop();
    this.screenEl.classList.remove("active");
  }

  renderSummary(seed) {
    const playerSuit = getSuitById(this.playerSuitId);
    this.summaryEl.innerHTML = `
      Backing <strong>${playerSuit.name}</strong>
      | Ante <strong>${this.ante} chips</strong>
      | Track <strong>${this.trackLength} lengths</strong>
      | Seed <strong>${seed}</strong>
    `;
  }

  buildGrid(initialFrame) {
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
        return `
          <div
            class="track-cell lane-cell ${suit.id}"
            style="--lane-fill: ${getLaneToneColor(suit.id, false)};"
            data-suit-id="${suit.id}"
            data-length="${length}"
          ></div>
        `;
      }).join("");

      let sideCardMarkup = "";
      if (isStart || isFinish) {
        sideCardMarkup = `<div class="track-cell side-card-cell no-card" aria-hidden="true">-</div>`;
      } else {
        sideCardMarkup = `
          <div class="track-cell side-card-cell face-down" data-checkpoint-length="${length}" title="Length ${length} checkpoint">?</div>
        `;
      }

      rowMarkup.push(`
        <div class="${rowClasses}" data-row-length="${length}">
          ${laneCellsMarkup}
          ${sideCardMarkup}
        </div>
      `);
    }

    this.gridEl.innerHTML = rowMarkup.join("");
    this.gridEl.classList.add("race-grid-ready");

    this.cacheGridNodes();
    this.createMarkerLayer();
    this.recalculateAnchors();
    this.applyCheckpointState(initialFrame.checkpoints);
  }

  cacheGridNodes() {
    this.laneCells.clear();
    this.checkpointNodes.clear();

    SUITS.forEach((suit) => {
      this.laneCells.set(suit.id, new Map());
    });

    this.gridEl.querySelectorAll(".track-cell.lane-cell").forEach((cellNode) => {
      const suitId = cellNode.dataset.suitId;
      const length = Number(cellNode.dataset.length);
      const laneMap = this.laneCells.get(suitId);
      if (laneMap) {
        laneMap.set(length, cellNode);
      }
    });

    this.gridEl.querySelectorAll("[data-checkpoint-length]").forEach((cardNode) => {
      const length = Number(cardNode.dataset.checkpointLength);
      this.checkpointNodes.set(length, cardNode);
    });
  }

  createMarkerLayer() {
    const existingLayer = this.gridEl.querySelector(".race-marker-layer");
    if (existingLayer) {
      existingLayer.remove();
    }

    const markerLayer = document.createElement("div");
    markerLayer.className = "race-marker-layer";
    this.gridEl.appendChild(markerLayer);

    this.markerNodes.clear();

    SUITS.forEach((suit) => {
      const markerNode = document.createElement("div");
      markerNode.className = `lane-racer-marker${suit.id === this.playerSuitId ? " player" : ""}`;
      markerNode.dataset.suitId = suit.id;
      markerNode.innerHTML = `<img class="lane-racer-icon" src="${suit.racerImage}" alt="" aria-hidden="true">`;
      markerLayer.appendChild(markerNode);
      this.markerNodes.set(suit.id, markerNode);
    });
  }

  recalculateAnchors() {
    if (!this.gridEl.classList.contains("race-grid-ready")) {
      return;
    }

    this.markerAnchors.clear();

    SUITS.forEach((suit) => {
      const laneAnchorMap = new Map();
      for (let length = 0; length <= this.trackLength; length += 1) {
        const laneCell = this.laneCells.get(suit.id)?.get(length);
        if (!laneCell) {
          continue;
        }

        laneAnchorMap.set(length, {
          x: laneCell.offsetLeft + (laneCell.offsetWidth / 2),
          y: laneCell.offsetTop + (laneCell.offsetHeight / 2)
        });
      }
      this.markerAnchors.set(suit.id, laneAnchorMap);
    });

    if (this.currentFrame) {
      this.updateMarkerPositions(this.currentFrame.positions, false);
    }
  }

  applyFrame(frame, animate) {
    this.currentFrame = frame;
    this.applyLaneLighting(frame.positions);
    this.applyCheckpointState(frame.checkpoints);
    this.updateMarkerPositions(frame.positions, animate);
    this.renderLeaderboard(frame.positions, animate);
  }

  applyLaneLighting(positions) {
    SUITS.forEach((suit) => {
      for (let length = 0; length <= this.trackLength; length += 1) {
        const laneCell = this.laneCells.get(suit.id)?.get(length);
        if (!laneCell) {
          continue;
        }

        const position = positions[suit.id];
        const isLit = length <= position;
        const isPlayerCurrent = suit.id === this.playerSuitId && length === position;
        laneCell.classList.toggle("lit", isLit);
        laneCell.classList.toggle("player-lit", isPlayerCurrent);
        laneCell.style.setProperty("--lane-fill", getLaneToneColor(suit.id, isLit));
      }
    });
  }

  applyCheckpointState(checkpoints) {
    checkpoints.forEach((checkpoint) => {
      const cardNode = this.checkpointNodes.get(checkpoint.length);
      if (!cardNode) {
        return;
      }

      if (!checkpoint.revealed || cardNode.dataset.revealed === "true") {
        return;
      }

      const revealedSuit = getSuitById(checkpoint.suitId);
      cardNode.dataset.revealed = "true";
      cardNode.classList.remove("face-down");
      cardNode.classList.add(revealedSuit.id);
      cardNode.innerHTML = `<img class="side-card-image" src="${revealedSuit.racerImage}" alt="${revealedSuit.name} card">`;
    });
  }

  updateMarkerPositions(positions, animate) {
    SUITS.forEach((suit) => {
      const markerNode = this.markerNodes.get(suit.id);
      const anchor = this.markerAnchors.get(suit.id)?.get(positions[suit.id]);
      if (!markerNode || !anchor) {
        return;
      }

      const nextTransform = markerTransform(anchor);
      if (animate) {
        const fromTransform = markerNode.style.transform || nextTransform;
        this.animationManager.animateTransform(markerNode, fromTransform, nextTransform, 230);
      }

      markerNode.style.transform = nextTransform;
    });
  }

  renderLeaderboard(positions, animate) {
    this.ensureLeaderboardNodes();
    const orderedSuits = getOrderedSuitsByPosition(positions);
    const orderedNodes = [];

    orderedSuits.forEach((suit, index) => {
      const rank = index + 1;
      const entry = this.leaderboardNodes.get(suit.id);
      if (!entry) {
        return;
      }

      entry.root.classList.toggle("leader", rank === 1);
      entry.root.classList.toggle("player", suit.id === this.playerSuitId);
      entry.rank.textContent = getRankLabel(rank);
      entry.distance.textContent = `L${positions[suit.id]}`;
      orderedNodes.push(entry.root);
    });

    if (animate) {
      this.animationManager.animateReorder(this.leaderboardEl, orderedNodes);
      return;
    }

    orderedNodes.forEach((node) => {
      this.leaderboardEl.appendChild(node);
    });
  }

  ensureLeaderboardNodes() {
    if (this.leaderboardNodes.size === SUITS.length) {
      return;
    }

    this.leaderboardNodes.clear();
    this.leaderboardEl.innerHTML = "";

    SUITS.forEach((suit) => {
      const rootNode = document.createElement("div");
      rootNode.className = "leaderboard-entry";
      rootNode.dataset.suitId = suit.id;

      const rankNode = document.createElement("span");
      rankNode.className = "leaderboard-rank";

      const racerNode = document.createElement("img");
      racerNode.className = "leaderboard-racer";
      racerNode.src = suit.racerImage;
      racerNode.alt = `${suit.name} racer`;

      const distanceNode = document.createElement("span");
      distanceNode.className = "leaderboard-distance";
      distanceNode.textContent = "L0";

      rootNode.appendChild(rankNode);
      rootNode.appendChild(racerNode);
      rootNode.appendChild(distanceNode);
      this.leaderboardEl.appendChild(rootNode);

      this.leaderboardNodes.set(suit.id, {
        root: rootNode,
        rank: rankNode,
        distance: distanceNode
      });
    });
  }

  setDrawCard(suitId) {
    this.animationManager.animateDrawCardFlip(this.drawCardEl, () => {
      if (!suitId) {
        this.drawCardEl.className = "draw-card face-down";
        this.drawCardEl.innerHTML = "<span class=\"draw-card-back\">?</span>";
        return;
      }

      const suit = getSuitById(suitId);
      this.drawCardEl.className = `draw-card ${suit.id}`;
      this.drawCardEl.innerHTML = `<img class="draw-card-image" src="${suit.racerImage}" alt="${suit.name} card">`;
    });
  }

  startRace() {
    if (!this.replay || this.playbackTimerId) {
      return;
    }

    this.startButton.disabled = true;
    this.startButton.textContent = this.instantResolveEnabled ? "Resolving..." : "Racing...";

    if (this.instantResolveEnabled) {
      this.resolveRaceInstantly();
      return;
    }

    this.playbackCursor = 0;
    this.scheduleNextTurn();
  }

  scheduleNextTurn() {
    this.playbackTimerId = window.setTimeout(() => {
      this.playbackTimerId = null;
      this.runTurn();
    }, RACE_TICK_MS);
  }

  resolveRaceInstantly() {
    if (!this.replay) {
      return;
    }

    const finalEvent = this.replay.events[this.replay.events.length - 1];
    const finalFrame = this.replay.frames[this.replay.frames.length - 1];

    this.setDrawCard(finalEvent?.drawnSuitId ?? null);
    this.applyFrame(finalFrame, false);
    this.finishRace(finalEvent, 240);
  }

  runTurn() {
    if (!this.replay) {
      return;
    }

    const turnEvent = this.replay.events[this.playbackCursor];
    const nextFrame = this.replay.frames[this.playbackCursor + 1];

    if (!turnEvent || !nextFrame) {
      this.finishRace(this.replay.events[this.replay.events.length - 1], 120);
      return;
    }

    this.setDrawCard(turnEvent.drawnSuitId);
    this.applyFrame(nextFrame, true);
    this.playbackCursor += 1;

    if (turnEvent.winnerSuitId) {
      this.finishRace(turnEvent, 900);
      return;
    }

    this.scheduleNextTurn();
  }

  finishRace(turnEvent, delayMs) {
    this.stopRaceLoop();
    this.startButton.textContent = "Race Complete";
    this.startButton.disabled = true;

    window.setTimeout(() => {
      this.handlers.onRaceFinished({
        winnerSuitId: turnEvent.winnerSuitId,
        turnCount: turnEvent.turnCount,
        seed: this.replay.seed,
        replay: this.replay
      });
    }, delayMs);
  }

  stopRaceLoop() {
    if (!this.playbackTimerId) {
      return;
    }

    clearTimeout(this.playbackTimerId);
    this.playbackTimerId = null;
  }
}


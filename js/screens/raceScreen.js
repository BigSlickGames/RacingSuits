import { AnimationManager } from "../animation/animationManager.js";
import { SUITS, getSuitById } from "../data/suits.js";

const RACE_TICK_MS = 820;
const START_SEQUENCE_STEP_MS = 620;

const LANE_TONES = Object.freeze({
  hearts: {
    dark: "rgba(255, 70, 70, 0.08)",
    lit: "rgb(255 22 22)"
  },
  clubs: {
    dark: "rgba(72, 114, 255, 0.08)",
    lit: "rgb(20 57 255)"
  },
  diamonds: {
    dark: "rgba(79, 240, 120, 0.08)",
    lit: "rgb(122 245 122)"
  },
  spades: {
    dark: "rgba(255, 255, 255, 0.08)",
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
    gridEl,
    leaderboardEl,
    drawCardEl,
    startSequenceEl
  }) {
    this.screenEl = screenEl;
    this.gridEl = gridEl;
    this.leaderboardEl = leaderboardEl;
    this.leaderboardEnabled = Boolean(leaderboardEl);
    this.drawCardEl = drawCardEl;
    this.startSequenceEl = startSequenceEl;

    this.animationManager = new AnimationManager();

    this.playerSuitId = null;
    this.ante = 10;
    this.trackLength = 10;
    this.instantResolveEnabled = false;
    this.replay = null;
    this.playbackTimerId = null;
    this.playbackCursor = 0;
    this.startSequenceTimers = [];

    this.laneCells = new Map();
    this.markerNodes = new Map();
    this.markerAnchors = new Map();
    this.checkpointNodes = new Map();
    this.leaderboardNodes = new Map();
    this.spriteMarkers = new Map();
    this.currentFrame = null;
    this.spriteAnimationFrameId = null;
    this.spriteAnimationTimestamp = 0;

    this.handlers = {
      onRaceFinished: () => {}
    };

    if (this.leaderboardEl) {
      this.leaderboardEl.hidden = true;
      this.leaderboardEl.setAttribute("aria-hidden", "true");
    }

    window.addEventListener("resize", () => {
      this.recalculateAnchors();
    });
  }

  init(handlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  show({ playerSuitId, ante, raceResult, replay, instantResolveEnabled }) {
    this.stopRaceLoop();
    this.screenEl.classList.remove("race-live");
    this.playerSuitId = playerSuitId;
    this.ante = ante;
    this.trackLength = raceResult.config.trackLength;
    this.replay = replay;
    this.instantResolveEnabled = Boolean(instantResolveEnabled);
    this.screenEl.classList.add("active");

    this.buildGrid(raceResult.frames[0]);
    if (this.leaderboardEnabled) {
      this.ensureLeaderboardNodes();
    }
    this.applyFrame(raceResult.frames[0], false);
    this.setDrawCard(null);

    this.playbackCursor = 0;

    window.requestAnimationFrame(() => {
      this.recalculateAnchors();
      if (this.currentFrame) {
        this.updateMarkerPositions(this.currentFrame.positions, false);
      }
      this.startRaceSequence();
    });
  }

  hide() {
    this.stopRaceLoop();
    this.screenEl.classList.remove("active");
  }

  buildGrid(initialFrame) {
    const trackBoardEl = this.gridEl.closest(".track-board");
    if (trackBoardEl) {
      trackBoardEl.style.setProperty("--track-rows", String(SUITS.length));
      trackBoardEl.style.setProperty("--track-cols", String(this.trackLength + 1));
    }

    const checkpointCellsMarkup = [];
    for (let length = 0; length <= this.trackLength; length += 1) {
      if (length === 0 || length === this.trackLength) {
        checkpointCellsMarkup.push(`<div class="track-cell side-card-cell no-card" aria-hidden="true"></div>`);
        continue;
      }

      checkpointCellsMarkup.push(`
        <div class="track-cell side-card-cell face-down" data-checkpoint-length="${length}" title="Length ${length} checkpoint">?</div>
      `);
    }

    const laneRowsMarkup = SUITS.map((suit) => {
      const laneCellsMarkup = [];
      for (let length = 0; length <= this.trackLength; length += 1) {
        const cellClasses = [
          "track-cell",
          "lane-cell",
          "camera-lane-cell",
          suit.id,
          length === 0 ? "start-cell" : "",
          length === this.trackLength ? "finish-cell" : ""
        ].join(" ").trim();

        laneCellsMarkup.push(`
          <div
            class="${cellClasses}"
            style="--lane-fill: ${getLaneToneColor(suit.id, false)};"
            data-suit-id="${suit.id}"
            data-length="${length}"
          ></div>
        `);
      }

      return `
        <div class="track-row lane-row ${suit.id}" data-suit-id="${suit.id}">
          ${laneCellsMarkup.join("")}
        </div>
      `;
    }).join("");

    this.gridEl.innerHTML = `
      <div class="track-row checkpoint-row" aria-label="Checkpoint cards">
        ${checkpointCellsMarkup.join("")}
      </div>
      ${laneRowsMarkup}
    `;
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
    this.spriteMarkers.clear();

    SUITS.forEach((suit) => {
      const markerNode = document.createElement("div");
      markerNode.className = `lane-racer-marker${suit.id === this.playerSuitId ? " player" : ""}`;
      markerNode.dataset.suitId = suit.id;
      if (Array.isArray(suit.raceFrames) && suit.raceFrames.length > 0) {
        const frames = suit.raceFrames
          .map((framePath) => String(framePath))
          .filter((framePath) => framePath.length > 0);
        const frameCount = Math.max(1, frames.length);
        const fps = Math.max(1, Number(suit.raceFramesFps) || 12);

        markerNode.classList.add("uses-frame-cycle");
        markerNode.innerHTML = `<img class="lane-racer-icon lane-racer-frame ${suit.id}" src="${frames[0]}" alt="" aria-hidden="true">`;
        const frameNode = markerNode.querySelector(".lane-racer-frame");
        if (frameNode) {
          this.spriteMarkers.set(suit.id, {
            mode: "frames",
            node: frameNode,
            frames,
            frameCount,
            fps,
            frame: 0,
            accumulatorMs: 0
          });
          this.setSpriteFrame(this.spriteMarkers.get(suit.id), 0);
        }
      } else if (suit.raceSprite) {
        const columns = Math.max(1, Number(suit.raceSprite.columns) || 1);
        const rows = Math.max(1, Number(suit.raceSprite.rows) || 1);
        const frameCount = Math.max(1, Number(suit.raceSprite.frames) || (columns * rows));
        const fps = Math.max(1, Number(suit.raceSprite.fps) || 12);

        markerNode.classList.add("uses-sprite");
        markerNode.innerHTML = `<span class="lane-racer-sprite ${suit.id}" aria-hidden="true"></span>`;
        const spriteNode = markerNode.querySelector(".lane-racer-sprite");
        if (spriteNode) {
          spriteNode.style.setProperty("--sprite-sheet", `url("${suit.raceSprite.sheet}")`);
          spriteNode.style.setProperty("--sprite-cols", String(columns));
          spriteNode.style.setProperty("--sprite-rows", String(rows));
          this.spriteMarkers.set(suit.id, {
            mode: "sprite-sheet",
            node: spriteNode,
            columns,
            rows,
            frameCount: Math.min(frameCount, columns * rows),
            fps,
            frame: 0,
            accumulatorMs: 0
          });
          this.setSpriteFrame(this.spriteMarkers.get(suit.id), 0);
        }
      } else {
        markerNode.innerHTML = `<img class="lane-racer-icon" src="${suit.racerImage}" alt="" aria-hidden="true">`;
      }
      markerLayer.appendChild(markerNode);
      this.markerNodes.set(suit.id, markerNode);
    });
  }

  setSpriteFrame(spriteState, nextFrame) {
    if (!spriteState || !spriteState.node) {
      return;
    }

    const normalizedFrame = ((nextFrame % spriteState.frameCount) + spriteState.frameCount) % spriteState.frameCount;
    if (spriteState.mode === "frames") {
      spriteState.node.src = spriteState.frames[normalizedFrame];
      spriteState.frame = normalizedFrame;
      return;
    }

    const column = normalizedFrame % spriteState.columns;
    const row = Math.floor(normalizedFrame / spriteState.columns);
    const xPercent = spriteState.columns > 1 ? (column / (spriteState.columns - 1)) * 100 : 0;
    const yPercent = spriteState.rows > 1 ? (row / (spriteState.rows - 1)) * 100 : 0;

    spriteState.node.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
    spriteState.frame = normalizedFrame;
  }

  startSpriteAnimation() {
    this.stopSpriteAnimation(false);
    if (this.spriteMarkers.size === 0) {
      return;
    }

    this.spriteMarkers.forEach((spriteState) => {
      spriteState.frame = 0;
      spriteState.accumulatorMs = 0;
      this.setSpriteFrame(spriteState, 0);
    });

    this.spriteAnimationTimestamp = window.performance.now();

    const animateSprites = (timestamp) => {
      const deltaMs = Math.max(0, timestamp - this.spriteAnimationTimestamp);
      this.spriteAnimationTimestamp = timestamp;

      this.spriteMarkers.forEach((spriteState) => {
        const frameDurationMs = 1000 / spriteState.fps;
        spriteState.accumulatorMs += deltaMs;

        while (spriteState.accumulatorMs >= frameDurationMs) {
          spriteState.accumulatorMs -= frameDurationMs;
          this.setSpriteFrame(spriteState, spriteState.frame + 1);
        }
      });

      this.spriteAnimationFrameId = window.requestAnimationFrame(animateSprites);
    };

    this.spriteAnimationFrameId = window.requestAnimationFrame(animateSprites);
  }

  stopSpriteAnimation(resetFrame = true) {
    if (this.spriteAnimationFrameId) {
      window.cancelAnimationFrame(this.spriteAnimationFrameId);
      this.spriteAnimationFrameId = null;
    }

    if (!resetFrame) {
      return;
    }

    this.spriteMarkers.forEach((spriteState) => {
      spriteState.accumulatorMs = 0;
      this.setSpriteFrame(spriteState, 0);
    });
  }

  recalculateAnchors() {
    if (!this.gridEl.classList.contains("race-grid-ready")) {
      return;
    }

    const gridRect = this.gridEl.getBoundingClientRect();
    this.markerAnchors.clear();

    SUITS.forEach((suit) => {
      const laneAnchorMap = new Map();
      for (let length = 0; length <= this.trackLength; length += 1) {
        const laneCell = this.laneCells.get(suit.id)?.get(length);
        if (!laneCell) {
          continue;
        }

        const laneRect = laneCell.getBoundingClientRect();
        laneAnchorMap.set(length, {
          x: (laneRect.left - gridRect.left) + (laneRect.width / 2),
          y: (laneRect.top - gridRect.top) + (laneRect.height / 2)
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
    if (this.leaderboardEnabled) {
      this.renderLeaderboard(frame.positions, animate);
    }
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
      const rawLength = Number(positions[suit.id]);
      const laneLength = Number.isFinite(rawLength)
        ? Math.min(this.trackLength, Math.max(0, rawLength))
        : 0;
      const suitAnchors = this.markerAnchors.get(suit.id);
      const anchor = suitAnchors?.get(laneLength) ?? suitAnchors?.get(0);
      if (!markerNode || !anchor) {
        return;
      }

      markerNode.classList.toggle("at-start", laneLength === 0);

      const nextTransform = markerTransform(anchor);
      if (animate) {
        const fromTransform = markerNode.style.transform || nextTransform;
        this.animationManager.animateTransform(markerNode, fromTransform, nextTransform, 230);
      }

      markerNode.style.transform = nextTransform;
    });
  }

  renderLeaderboard(positions, animate) {
    if (!this.leaderboardEnabled || !this.leaderboardEl) {
      return;
    }

    this.ensureLeaderboardNodes();
    const orderedSuits = getOrderedSuitsByPosition(positions);
    const orderedNodes = [];

    orderedSuits.forEach((suit, index) => {
      const entry = this.leaderboardNodes.get(suit.id);
      if (!entry) {
        return;
      }

      entry.root.classList.toggle("leader", index === 0);
      entry.root.classList.toggle("player", suit.id === this.playerSuitId);
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
    if (!this.leaderboardEnabled || !this.leaderboardEl) {
      return;
    }

    if (this.leaderboardNodes.size === SUITS.length) {
      return;
    }

    this.leaderboardNodes.clear();
    this.leaderboardEl.innerHTML = "";

    SUITS.forEach((suit) => {
      const rootNode = document.createElement("div");
      rootNode.className = `leaderboard-entry ${suit.id}`;
      rootNode.dataset.suitId = suit.id;

      const racerNode = document.createElement("img");
      racerNode.className = "leaderboard-racer";
      racerNode.src = suit.racerImage;
      racerNode.alt = `${suit.name} racer`;
      rootNode.appendChild(racerNode);
      this.leaderboardEl.appendChild(rootNode);

      this.leaderboardNodes.set(suit.id, {
        root: rootNode
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

    this.clearStartSequence();
    this.screenEl.classList.add("race-live");
    this.startSpriteAnimation();

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
    if (this.playbackTimerId) {
      clearTimeout(this.playbackTimerId);
      this.playbackTimerId = null;
    }
    this.screenEl.classList.remove("race-live");
    this.stopSpriteAnimation(true);
    this.clearStartSequence();
  }

  startRaceSequence() {
    this.clearStartSequence();

    if (!this.replay) {
      return;
    }

    if (!this.startSequenceEl) {
      this.startRace();
      return;
    }

    this.startSequenceEl.classList.add("active");
    this.startSequenceEl.dataset.phase = "red";

    const orangeTimerId = window.setTimeout(() => {
      if (this.startSequenceEl) {
        this.startSequenceEl.dataset.phase = "orange";
      }
    }, START_SEQUENCE_STEP_MS);

    const greenTimerId = window.setTimeout(() => {
      if (this.startSequenceEl) {
        this.startSequenceEl.dataset.phase = "green";
      }
    }, START_SEQUENCE_STEP_MS * 2);

    const goTimerId = window.setTimeout(() => {
      this.startRace();
    }, START_SEQUENCE_STEP_MS * 3);

    this.startSequenceTimers.push(orangeTimerId, greenTimerId, goTimerId);
  }

  clearStartSequence() {
    this.startSequenceTimers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    this.startSequenceTimers = [];

    if (!this.startSequenceEl) {
      return;
    }

    this.startSequenceEl.classList.remove("active");
    this.startSequenceEl.dataset.phase = "idle";
  }
}


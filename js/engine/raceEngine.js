import { SUITS } from "../data/suits.js";
import { SeededRNG, normalizeSeed } from "../utils/seededRng.js";
import { SUIT_DECK_CONSTANTS, SuitDeck } from "./suitDeck.js";

const DEFAULT_MAX_TURNS_MULTIPLIER = 250;

function cloneCheckpoints(checkpoints) {
  return checkpoints.map((checkpoint) => ({ ...checkpoint }));
}

function clonePositions(positions) {
  return { ...positions };
}

function createPositionMap(suitIds) {
  return suitIds.reduce((accumulator, suitId) => {
    accumulator[suitId] = 0;
    return accumulator;
  }, {});
}

export class RaceEngine {
  constructor({
    seed,
    trackLength = 10,
    suitIds = SUITS.map((suit) => suit.id),
    deckCopiesPerSuit = SUIT_DECK_CONSTANTS.DEFAULT_COPIES_PER_SUIT,
    checkpointsEnabled = true
  } = {}) {
    this.seed = normalizeSeed(seed);
    this.trackLength = trackLength;
    this.suitIds = [...suitIds];
    this.deckCopiesPerSuit = deckCopiesPerSuit;
    this.checkpointsEnabled = checkpointsEnabled;

    this.rng = new SeededRNG(this.seed);
    this.raceDeck = new SuitDeck({
      suitIds: this.suitIds,
      copiesPerSuit: this.deckCopiesPerSuit,
      rng: this.rng.fork("race-deck")
    });

    this.sideCardDeck = new SuitDeck({
      suitIds: this.suitIds,
      copiesPerSuit: this.deckCopiesPerSuit,
      rng: this.rng.fork("checkpoint-deck")
    });
  }

  createInitialCheckpoints() {
    if (!this.checkpointsEnabled) {
      return [];
    }

    return Array.from({ length: Math.max(0, this.trackLength - 1) }, (_, index) => {
      return {
        length: index + 1,
        suitId: this.sideCardDeck.draw(),
        revealed: false
      };
    });
  }

  allSuitsPassed(length, positions) {
    return this.suitIds.every((suitId) => positions[suitId] > length);
  }

  buildFrame({ turnCount, positions, checkpoints }) {
    return {
      turnCount,
      positions: clonePositions(positions),
      checkpoints: cloneCheckpoints(checkpoints)
    };
  }

  playTurn({ turnCount, positions, checkpoints }) {
    const nextPositions = clonePositions(positions);
    const nextCheckpoints = cloneCheckpoints(checkpoints);

    const drawnSuitId = this.raceDeck.draw();
    const movedFrom = nextPositions[drawnSuitId];
    const movedTo = Math.min(this.trackLength, movedFrom + 1);
    nextPositions[drawnSuitId] = movedTo;

    const nextTurnCount = turnCount + 1;
    const checkpointEvents = [];

    if (movedTo < this.trackLength) {
      for (const checkpoint of nextCheckpoints) {
        if (checkpoint.revealed) {
          continue;
        }

        if (!this.allSuitsPassed(checkpoint.length, nextPositions)) {
          break;
        }

        checkpoint.revealed = true;

        const setbackSuitId = checkpoint.suitId;
        const setbackFrom = nextPositions[setbackSuitId];
        const setbackTo = Math.min(setbackFrom, checkpoint.length);
        nextPositions[setbackSuitId] = setbackTo;

        checkpointEvents.push({
          length: checkpoint.length,
          suitId: setbackSuitId,
          from: setbackFrom,
          to: setbackTo
        });
      }
    }

    const winnerSuitId = movedTo >= this.trackLength ? drawnSuitId : null;

    return {
      turnCount: nextTurnCount,
      positions: nextPositions,
      checkpoints: nextCheckpoints,
      event: {
        turnCount: nextTurnCount,
        drawnSuitId,
        movedFrom,
        movedTo,
        checkpointEvents,
        winnerSuitId
      }
    };
  }

  simulate() {
    const frames = [];
    const events = [];

    let turnCount = 0;
    let positions = createPositionMap(this.suitIds);
    let checkpoints = this.createInitialCheckpoints();
    let winnerSuitId = null;

    frames.push(this.buildFrame({ turnCount, positions, checkpoints }));

    const maxTurns = Math.max(30, this.trackLength * DEFAULT_MAX_TURNS_MULTIPLIER);

    for (let index = 0; index < maxTurns; index += 1) {
      const turnResult = this.playTurn({ turnCount, positions, checkpoints });
      turnCount = turnResult.turnCount;
      positions = turnResult.positions;
      checkpoints = turnResult.checkpoints;
      winnerSuitId = turnResult.event.winnerSuitId;

      events.push(turnResult.event);
      frames.push(this.buildFrame({ turnCount, positions, checkpoints }));

      if (winnerSuitId) {
        break;
      }
    }

    if (!winnerSuitId) {
      throw new Error(`RaceEngine failed to resolve winner for seed "${this.seed}".`);
    }

    return {
      seed: this.seed,
      config: {
        trackLength: this.trackLength,
        suitIds: [...this.suitIds],
        deckCopiesPerSuit: this.deckCopiesPerSuit,
        checkpointsEnabled: this.checkpointsEnabled
      },
      winnerSuitId,
      turnCount,
      frames,
      events
    };
  }

  static run({ seed, config = {} } = {}) {
    const engine = new RaceEngine({
      seed,
      ...config
    });

    return engine.simulate();
  }
}

export const RACE_ENGINE_CONSTANTS = Object.freeze({
  DEFAULT_MAX_TURNS_MULTIPLIER
});

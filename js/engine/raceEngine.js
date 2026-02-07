import { SUITS } from "../data/suits.js";
import { SuitDeck } from "./suitDeck.js";

export class RaceEngine {
  constructor(trackLength) {
    this.trackLength = trackLength;
    this.turnCount = 0;
    this.positions = this.createStartingPositions();
    this.raceDeck = new SuitDeck();
    this.sideCardDeck = new SuitDeck();
    this.checkpoints = this.dealCheckpoints();
  }

  createStartingPositions() {
    return SUITS.reduce((accumulator, suit) => {
      accumulator[suit.id] = 0;
      return accumulator;
    }, {});
  }

  dealCheckpoints() {
    // No side card on the finish row. For a 10-length track, cards are L1..L9.
    return Array.from({ length: Math.max(0, this.trackLength - 1) }, (_, index) => {
      return {
        length: index + 1,
        suitId: this.sideCardDeck.draw(),
        revealed: false
      };
    });
  }

  allSuitsPassed(length) {
    // Side card flips only after every racer is beyond the row.
    return SUITS.every((suit) => this.positions[suit.id] > length);
  }

  snapshot() {
    return {
      turnCount: this.turnCount,
      positions: { ...this.positions },
      checkpoints: this.checkpoints.map((checkpoint) => ({ ...checkpoint }))
    };
  }

  playTurn() {
    const drawnSuitId = this.raceDeck.draw();
    const movedFrom = this.positions[drawnSuitId];
    const movedTo = Math.min(this.trackLength, movedFrom + 1);
    this.positions[drawnSuitId] = movedTo;
    this.turnCount += 1;

    if (movedTo >= this.trackLength) {
      return {
        ...this.snapshot(),
        drawnSuitId,
        movedFrom,
        movedTo,
        checkpointEvents: [],
        winnerSuitId: drawnSuitId
      };
    }

    const checkpointEvents = [];

    for (const checkpoint of this.checkpoints) {
      if (checkpoint.revealed) {
        continue;
      }

      if (!this.allSuitsPassed(checkpoint.length)) {
        break;
      }

      checkpoint.revealed = true;

      const setbackSuitId = checkpoint.suitId;
      const setbackFrom = this.positions[setbackSuitId];
      const setbackTo = Math.min(setbackFrom, checkpoint.length);
      this.positions[setbackSuitId] = setbackTo;

      checkpointEvents.push({
        length: checkpoint.length,
        suitId: setbackSuitId,
        from: setbackFrom,
        to: setbackTo
      });
    }

    return {
      ...this.snapshot(),
      drawnSuitId,
      movedFrom,
      movedTo,
      checkpointEvents,
      winnerSuitId: null
    };
  }
}

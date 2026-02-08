import { SUITS } from "../data/suits.js";
import { SeededRNG } from "../utils/seededRng.js";

const DEFAULT_COPIES_PER_SUIT = 13;

export class SuitDeck {
  constructor({
    suitIds = SUITS.map((suit) => suit.id),
    copiesPerSuit = DEFAULT_COPIES_PER_SUIT,
    rng = null
  } = {}) {
    this.suitIds = [...suitIds];
    this.copiesPerSuit = copiesPerSuit;
    this.rng = rng ?? new SeededRNG(`suit-deck:${this.suitIds.join(",")}:${this.copiesPerSuit}`);
    this.cards = [];
    this.reset();
  }

  reset() {
    this.cards = this.suitIds.flatMap((suitId) => {
      return Array(this.copiesPerSuit).fill(suitId);
    });

    this.rng.shuffleInPlace(this.cards);
  }

  draw() {
    if (this.cards.length === 0) {
      this.reset();
    }
    return this.cards.pop();
  }
}

export const SUIT_DECK_CONSTANTS = Object.freeze({
  DEFAULT_COPIES_PER_SUIT
});

import { SUITS } from "../data/suits.js";

const COPIES_PER_SUIT = 13;

export class SuitDeck {
  constructor() {
    this.cards = [];
    this.reset();
  }

  reset() {
    this.cards = SUITS.flatMap((suit) => {
      return Array(COPIES_PER_SUIT).fill(suit.id);
    });
    this.shuffle();
  }

  shuffle() {
    for (let index = this.cards.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [this.cards[index], this.cards[swapIndex]] = [this.cards[swapIndex], this.cards[index]];
    }
  }

  draw() {
    if (this.cards.length === 0) {
      this.reset();
    }
    return this.cards.pop();
  }
}

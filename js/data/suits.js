export const SUITS = Object.freeze([
  {
    id: "hearts",
    name: "Hearts",
    symbol: "\u2665",
    racerImage: "./assets/hearts_racer.png"
  },
  {
    id: "clubs",
    name: "Clubs",
    symbol: "\u2663",
    racerImage: "./assets/clubs_racer.png"
  },
  {
    id: "diamonds",
    name: "Diamonds",
    symbol: "\u2666",
    racerImage: "./assets/diamonds_racer.png"
  },
  {
    id: "spades",
    name: "Spades",
    symbol: "\u2660",
    racerImage: "./assets/spades_racer.png"
  }
]);

const suitMap = SUITS.reduce((accumulator, suit) => {
  accumulator[suit.id] = suit;
  return accumulator;
}, {});

export function getSuitById(suitId) {
  return suitMap[suitId] ?? null;
}


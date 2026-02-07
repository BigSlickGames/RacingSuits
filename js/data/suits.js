export const SUITS = Object.freeze([
  { id: "hearts", name: "Hearts", symbol: "♥" },
  { id: "clubs", name: "Clubs", symbol: "♣" },
  { id: "diamonds", name: "Diamonds", symbol: "♦" },
  { id: "spades", name: "Spades", symbol: "♠" }
]);

const suitMap = SUITS.reduce((accumulator, suit) => {
  accumulator[suit.id] = suit;
  return accumulator;
}, {});

export function getSuitById(suitId) {
  return suitMap[suitId] ?? null;
}

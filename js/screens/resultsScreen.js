import { SUITS, getSuitById } from "../data/suits.js";

const CONFETTI_COLORS = Object.freeze([
  "#ffb703",
  "#ff006e",
  "#00d4b3",
  "#9cd8ff",
  "#ffffff"
]);

const SUIT_ORDER = SUITS.reduce((accumulator, suit, index) => {
  accumulator[suit.id] = index;
  return accumulator;
}, {});

function getOrderedSuitsByPosition(positions) {
  return [...SUITS].sort((left, right) => {
    const rightPosition = Number(positions?.[right.id] ?? 0);
    const leftPosition = Number(positions?.[left.id] ?? 0);
    const positionDiff = rightPosition - leftPosition;
    if (positionDiff !== 0) {
      return positionDiff;
    }
    return SUIT_ORDER[left.id] - SUIT_ORDER[right.id];
  });
}

export class ResultsScreen {
  constructor({
    screenEl,
    bannerEl,
    showcaseEl,
    crowdEl,
    winnerImageEl,
    confettiEl,
    copyEl,
    raceAgainButton
  }) {
    this.screenEl = screenEl;
    this.bannerEl = bannerEl;
    this.showcaseEl = showcaseEl;
    this.crowdEl = crowdEl;
    this.winnerImageEl = winnerImageEl;
    this.confettiEl = confettiEl;
    this.copyEl = copyEl;
    this.raceAgainButton = raceAgainButton;
    this.handlers = {
      onRaceAgain: () => {}
    };

    this.raceAgainButton.addEventListener("click", () => {
      this.handlers.onRaceAgain();
    });
  }

  init(handlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  renderConfetti() {
    if (!this.confettiEl) {
      return;
    }

    const pieceCount = 42;
    const pieces = Array.from({ length: pieceCount }, (_, index) => {
      const left = (index / pieceCount) * 100;
      const duration = 2 + (index % 7) * 0.22;
      const delay = (index % 9) * 0.06;
      const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
      const rotate = (index * 29) % 360;

      return `
        <span
          class="confetti-piece"
          style="left:${left}%;--fall-duration:${duration}s;--fall-delay:${delay}s;--piece-color:${color};--piece-rotate:${rotate}deg;"
        ></span>
      `;
    });

    this.confettiEl.innerHTML = pieces.join("");
  }

  getPlayerPlacement(replay, playerSuitId) {
    const finalFrame = replay?.frames?.[replay.frames.length - 1];
    if (!finalFrame || !playerSuitId) {
      return null;
    }

    const orderedSuits = getOrderedSuitsByPosition(finalFrame.positions);
    const placementIndex = orderedSuits.findIndex((suit) => suit.id === playerSuitId);
    if (placementIndex < 0) {
      return null;
    }

    return placementIndex + 1;
  }

  show({ winnerSuitId, playerSuitId, settlement, replay }) {
    const winner = getSuitById(winnerSuitId);
    const player = playerSuitId ? getSuitById(playerSuitId) : null;
    const playerPlacement = this.getPlayerPlacement(replay, playerSuitId);
    const playerWon = Boolean(settlement?.won);

    this.bannerEl.classList.remove("win", "lose");
    this.bannerEl.classList.add(playerWon ? "win" : "lose");
    this.bannerEl.textContent = playerWon
      ? "YOU ARE THE WINNER!"
      : `${winner.symbol} ${winner.name} wins!`;

    if (this.showcaseEl) {
      this.showcaseEl.classList.toggle("win", playerWon);
      this.showcaseEl.classList.toggle("lose", !playerWon);
    }

    if (this.crowdEl) {
      this.crowdEl.textContent = `👏 Crowd is cheering for ${winner.name}! 👏`;
      this.crowdEl.classList.toggle("win", playerWon);
      this.crowdEl.classList.toggle("lose", !playerWon);
    }

    this.winnerImageEl.src = winner.racerImage;
    this.winnerImageEl.alt = `${winner.name} winner`;
    this.renderConfetti();

    if (playerWon) {
      this.copyEl.textContent = `You backed ${player?.name ?? "your racer"} and came #1. Race again??`;
    } else if (playerPlacement) {
      this.copyEl.textContent = `Oh no! You came #${playerPlacement}. Race again??`;
    } else {
      this.copyEl.textContent = "Oh no! You missed the win. Race again??";
    }

    this.screenEl.classList.add("active");
  }

  hide() {
    this.screenEl.classList.remove("active");
  }
}

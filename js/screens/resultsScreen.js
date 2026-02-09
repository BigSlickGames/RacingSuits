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

function getOrdinalLabel(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  const roundedValue = Math.floor(numericValue);
  const mod100 = roundedValue % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${roundedValue}th`;
  }

  const mod10 = roundedValue % 10;
  if (mod10 === 1) {
    return `${roundedValue}st`;
  }
  if (mod10 === 2) {
    return `${roundedValue}nd`;
  }
  if (mod10 === 3) {
    return `${roundedValue}rd`;
  }

  return `${roundedValue}th`;
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

  clearConfetti() {
    if (!this.confettiEl) {
      return;
    }

    this.confettiEl.innerHTML = "";
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
    const winner = getSuitById(winnerSuitId) ?? SUITS[0];
    const player = playerSuitId ? getSuitById(playerSuitId) : null;
    const playerPlacement = this.getPlayerPlacement(replay, playerSuitId);
    const playerPlacementLabel = getOrdinalLabel(playerPlacement);
    const playerWon = Boolean(settlement?.won);

    this.bannerEl.classList.remove("win", "lose");
    this.bannerEl.classList.add(playerWon ? "win" : "lose");
    this.bannerEl.textContent = playerWon
      ? "YAY! YOU WON!"
      : `Winner: ${winner.name}`;

    if (this.showcaseEl) {
      this.showcaseEl.classList.toggle("win", playerWon);
      this.showcaseEl.classList.toggle("lose", !playerWon);
      this.showcaseEl.classList.toggle("player-win", playerWon);
    }

    if (this.crowdEl) {
      this.crowdEl.textContent = playerWon
        ? `Crowd goes wild! ${winner.name} wins!`
        : `${winner.name} takes the win this round.`;
      this.crowdEl.classList.toggle("win", playerWon);
      this.crowdEl.classList.toggle("lose", !playerWon);
    }

    this.winnerImageEl.src = winner.racerImage;
    this.winnerImageEl.alt = `${winner.name} winner`;

    if (playerWon) {
      this.renderConfetti();
    } else {
      this.clearConfetti();
    }

    if (playerWon) {
      this.copyEl.textContent = `YAY! ${player?.name ?? "Your racer"} came 1st. Race again??`;
    } else if (playerPlacementLabel) {
      this.copyEl.textContent = `Oh so close! You came ${playerPlacementLabel}. Race again??`;
    } else {
      this.copyEl.textContent = "Oh so close! You missed the win. Race again??";
    }

    this.screenEl.classList.add("active");
  }

  hide() {
    this.screenEl.classList.remove("active");
  }
}

import { getSuitById } from "../data/suits.js";

const CONFETTI_COLORS = Object.freeze([
  "#ffb703",
  "#ff006e",
  "#00d4b3",
  "#9cd8ff",
  "#ffffff"
]);

export class ResultsScreen {
  constructor({
    screenEl,
    bannerEl,
    winnerImageEl,
    confettiEl,
    copyEl,
    raceAgainButton
  }) {
    this.screenEl = screenEl;
    this.bannerEl = bannerEl;
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

    const pieceCount = 22;
    const pieces = Array.from({ length: pieceCount }, (_, index) => {
      const left = (index / pieceCount) * 100;
      const duration = 2.1 + (index % 7) * 0.22;
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

  show({ winnerSuitId, settlement }) {
    const winner = getSuitById(winnerSuitId);

    this.bannerEl.classList.remove("win", "lose");
    this.bannerEl.classList.add(settlement.won ? "win" : "lose");
    this.bannerEl.textContent = `${winner.symbol} ${winner.name} wins!`;
    this.winnerImageEl.src = winner.racerImage;
    this.winnerImageEl.alt = `${winner.name} winner`;
    this.renderConfetti();
    this.copyEl.textContent = "";
    this.screenEl.classList.add("active");
  }

  hide() {
    this.screenEl.classList.remove("active");
  }
}

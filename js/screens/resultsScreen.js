import { getSuitById } from "../data/suits.js";

function formatChipDelta(value) {
  if (value > 0) {
    return `+${value}`;
  }
  return `${value}`;
}

export class ResultsScreen {
  constructor({ screenEl, bannerEl, copyEl, raceAgainButton }) {
    this.screenEl = screenEl;
    this.bannerEl = bannerEl;
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

  show({ winnerSuitId, playerSuitId, ante, turnCount, settlement, startingChips }) {
    const winner = getSuitById(winnerSuitId);
    const playerSuit = getSuitById(playerSuitId);

    this.bannerEl.classList.remove("win", "lose");
    this.bannerEl.classList.add(settlement.won ? "win" : "lose");
    this.bannerEl.textContent = `${winner.symbol} ${winner.name} wins the race!`;

    let summaryText = settlement.won
      ? `Your ${playerSuit.symbol} ${playerSuit.name} bet hit. You win ${ante} chips (${formatChipDelta(settlement.chipDelta)}).`
      : `Your ${playerSuit.symbol} ${playerSuit.name} bet missed this run. You lose ${ante} chips (${formatChipDelta(settlement.chipDelta)}).`;

    summaryText += ` The race ended after ${turnCount} flips.`;
    summaryText += ` Chips now: ${settlement.chipsRemaining}.`;

    if (settlement.refillApplied) {
      summaryText += ` You dropped below 10 chips, so the carnival host refilled you to ${startingChips}.`;
    }

    this.copyEl.textContent = summaryText;
    this.screenEl.classList.add("active");
  }

  hide() {
    this.screenEl.classList.remove("active");
  }
}

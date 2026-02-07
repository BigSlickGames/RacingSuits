const MIN_ANTE = 10;
const ANTE_STEP = 10;
const TRACK_LENGTH = 10;
const STARTING_CHIPS = 200;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function snapToAnteStep(value, min, max) {
  if (max <= min) {
    return max;
  }

  const snapped = Math.round(value / ANTE_STEP) * ANTE_STEP;
  return clamp(snapped, min, max);
}

export class GameState {
  constructor(startingChips = STARTING_CHIPS) {
    this.startingChips = startingChips;
    this.chips = startingChips;
    this.selectedSuitId = null;
    this.ante = MIN_ANTE;
  }

  selectSuit(suitId) {
    this.selectedSuitId = suitId;
  }

  getAnteBounds() {
    return {
      min: MIN_ANTE,
      max: this.chips
    };
  }

  setAnte(nextAnte) {
    const bounds = this.getAnteBounds();
    this.ante = snapToAnteStep(nextAnte, bounds.min, bounds.max);
    return this.ante;
  }

  settleRace(winnerSuitId) {
    const won = this.selectedSuitId === winnerSuitId;
    const chipDelta = won ? this.ante : -this.ante;

    this.chips = Math.max(0, this.chips + chipDelta);

    let refillApplied = false;
    if (this.chips < MIN_ANTE) {
      this.chips = this.startingChips;
      refillApplied = true;
    }

    this.ante = clamp(this.ante, MIN_ANTE, this.chips);

    return {
      won,
      chipDelta,
      chipsRemaining: this.chips,
      refillApplied
    };
  }
}

export const GAME_CONSTANTS = Object.freeze({
  MIN_ANTE,
  ANTE_STEP,
  TRACK_LENGTH,
  STARTING_CHIPS
});

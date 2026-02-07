const ANTE_OPTIONS = Object.freeze([5, 10, 20, 50, 100, 200]);
const MIN_ANTE = ANTE_OPTIONS[0];
const TRACK_LENGTH = 10;
const STARTING_CHIPS = 200;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getAvailableAnteOptions(chips) {
  return ANTE_OPTIONS.filter((option) => option <= chips);
}

function normalizeAnte(value, chips) {
  const available = getAvailableAnteOptions(chips);
  if (available.length === 0) {
    return MIN_ANTE;
  }

  if (available.includes(value)) {
    return value;
  }

  const candidates = available.filter((option) => option <= value);
  if (candidates.length > 0) {
    return candidates[candidates.length - 1];
  }

  return available[0];
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
    const available = getAvailableAnteOptions(this.chips);
    return {
      min: MIN_ANTE,
      max: available.length ? available[available.length - 1] : MIN_ANTE
    };
  }

  getAvailableAntes() {
    return getAvailableAnteOptions(this.chips);
  }

  setAnte(nextAnte) {
    this.ante = normalizeAnte(nextAnte, this.chips);
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
  ANTE_OPTIONS,
  TRACK_LENGTH,
  STARTING_CHIPS
});

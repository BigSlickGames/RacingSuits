import { SUITS } from "../data/suits.js";

const ANTE_OPTIONS = Object.freeze([5, 10, 20, 50, 100, 200]);
const MIN_ANTE = ANTE_OPTIONS[0];
const TRACK_LENGTH = 10;
const STARTING_CHIPS = 200;
const SUIT_ORDER = SUITS.reduce((accumulator, suit, index) => {
  accumulator[suit.id] = index;
  return accumulator;
}, {});

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundToTenth(value) {
  return Math.round(value * 10) / 10;
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

function createSuitStats() {
  return SUITS.reduce((accumulator, suit) => {
    accumulator[suit.id] = {
      suitId: suit.id,
      games: 0,
      wins: 0,
      currentStreak: 0,
      bestStreak: 0,
      chipsNet: 0,
      chipsRisked: 0
    };
    return accumulator;
  }, {});
}

export class GameState {
  constructor(startingChips = STARTING_CHIPS) {
    this.startingChips = startingChips;
    this.chips = startingChips;
    this.selectedSuitId = null;
    this.ante = MIN_ANTE;
    this.wins = 0;
    this.currentStreak = 0;
    this.bestStreak = 0;
    this.totalGames = 0;
    this.totalChipDelta = 0;
    this.totalChipsWon = 0;
    this.suitStats = createSuitStats();
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

  getSuitLeaderboards() {
    const entries = Object.values(this.suitStats).map((entry) => {
      const winRatePct = entry.games > 0 ? roundToTenth((entry.wins / entry.games) * 100) : 0;
      const roiPct = entry.chipsRisked > 0 ? roundToTenth((entry.chipsNet / entry.chipsRisked) * 100) : 0;
      return {
        ...entry,
        winRatePct,
        roiPct
      };
    });

    const winsLeaderboard = [...entries].sort((left, right) => {
      if (right.wins !== left.wins) {
        return right.wins - left.wins;
      }
      if (right.bestStreak !== left.bestStreak) {
        return right.bestStreak - left.bestStreak;
      }
      if (right.winRatePct !== left.winRatePct) {
        return right.winRatePct - left.winRatePct;
      }
      return SUIT_ORDER[left.suitId] - SUIT_ORDER[right.suitId];
    });

    const chipLeaderboard = [...entries].sort((left, right) => {
      if (right.roiPct !== left.roiPct) {
        return right.roiPct - left.roiPct;
      }
      if (right.chipsNet !== left.chipsNet) {
        return right.chipsNet - left.chipsNet;
      }
      if (right.games !== left.games) {
        return right.games - left.games;
      }
      return SUIT_ORDER[left.suitId] - SUIT_ORDER[right.suitId];
    });

    return {
      winsLeaderboard,
      chipLeaderboard
    };
  }

  settleRace(winnerSuitId) {
    const won = this.selectedSuitId === winnerSuitId;
    const chipDelta = won ? this.ante : -this.ante;
    const selectedSuitStats = this.suitStats[this.selectedSuitId];

    this.totalGames += 1;
    this.totalChipDelta += chipDelta;

    if (selectedSuitStats) {
      selectedSuitStats.games += 1;
      selectedSuitStats.chipsNet += chipDelta;
      selectedSuitStats.chipsRisked += this.ante;
    }

    if (won) {
      this.wins += 1;
      this.currentStreak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.currentStreak);
      this.totalChipsWon += chipDelta;
      if (selectedSuitStats) {
        selectedSuitStats.wins += 1;
        selectedSuitStats.currentStreak += 1;
        selectedSuitStats.bestStreak = Math.max(
          selectedSuitStats.bestStreak,
          selectedSuitStats.currentStreak
        );
      }
    } else {
      this.currentStreak = 0;
      if (selectedSuitStats) {
        selectedSuitStats.currentStreak = 0;
      }
    }

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
      refillApplied,
      wins: this.wins,
      currentStreak: this.currentStreak,
      bestStreak: this.bestStreak,
      totalGames: this.totalGames,
      totalChipDelta: this.totalChipDelta,
      totalChipsWon: this.totalChipsWon
    };
  }
}

export const GAME_CONSTANTS = Object.freeze({
  MIN_ANTE,
  ANTE_OPTIONS,
  TRACK_LENGTH,
  STARTING_CHIPS
});



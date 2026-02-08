export class StreakManager {
  constructor() {
    this.current = 0;
    this.best = 0;
  }

  recordResult(didWin) {
    if (didWin) {
      this.current += 1;
      this.best = Math.max(this.best, this.current);
    } else {
      this.current = 0;
    }

    return this.getSnapshot();
  }

  getSnapshot() {
    return {
      current: this.current,
      best: this.best
    };
  }

  reset() {
    this.current = 0;
    this.best = 0;
  }
}


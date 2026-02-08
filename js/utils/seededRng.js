function xmur3(seedText) {
  let hash = 1779033703 ^ seedText.length;
  for (let index = 0; index < seedText.length; index += 1) {
    hash = Math.imul(hash ^ seedText.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return function nextHash() {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    return hash >>> 0;
  };
}

export function normalizeSeed(seedValue) {
  if (seedValue === null || seedValue === undefined || seedValue === "") {
    return "racing-suits-default-seed";
  }
  return String(seedValue);
}

export class SeededRNG {
  constructor(seedValue) {
    this.seed = normalizeSeed(seedValue);
    const hashSource = xmur3(this.seed);
    this.state = hashSource() >>> 0;
  }

  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let output = this.state;
    output = Math.imul(output ^ (output >>> 15), 1 | output);
    output ^= output + Math.imul(output ^ (output >>> 7), 61 | output);
    return ((output ^ (output >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(maxExclusive) {
    if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
      return 0;
    }
    return Math.floor(this.next() * maxExclusive);
  }

  fork(namespace) {
    return new SeededRNG(`${this.seed}:${namespace}`);
  }

  shuffleInPlace(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = this.nextInt(index + 1);
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
  }
}


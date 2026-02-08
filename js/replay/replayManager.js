import { RaceEngine } from "../engine/raceEngine.js";

const REPLAY_SCHEMA_VERSION = 1;

function deepClone(data) {
  return JSON.parse(JSON.stringify(data));
}

function createReplayId(seed, turnCount) {
  return `replay:${seed}:${turnCount}`;
}

export class ReplayManager {
  static createReplay({ seed, config, frames, events, winnerSuitId, turnCount }) {
    return {
      id: createReplayId(seed, turnCount),
      schemaVersion: REPLAY_SCHEMA_VERSION,
      createdAt: Date.now(),
      seed,
      config: deepClone(config),
      winnerSuitId,
      turnCount,
      frames: deepClone(frames),
      events: deepClone(events)
    };
  }

  static buildReplayFromSeed({ seed, config }) {
    const result = RaceEngine.run({
      seed,
      config
    });

    return ReplayManager.createReplay({
      seed: result.seed,
      config: result.config,
      frames: result.frames,
      events: result.events,
      winnerSuitId: result.winnerSuitId,
      turnCount: result.turnCount
    });
  }

  static toGhostPayload(replay) {
    return {
      schemaVersion: REPLAY_SCHEMA_VERSION,
      replayId: replay.id,
      seed: replay.seed,
      config: deepClone(replay.config)
    };
  }

  static fromGhostPayload(payload) {
    if (!payload || payload.schemaVersion !== REPLAY_SCHEMA_VERSION) {
      throw new Error("Unsupported replay payload version.");
    }

    return ReplayManager.buildReplayFromSeed({
      seed: payload.seed,
      config: payload.config
    });
  }
}


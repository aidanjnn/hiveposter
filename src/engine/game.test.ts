import { describe, it } from "vitest";

/**
 * Plan §05, "Engine tests, before any UI".
 * These are the tests to make green before touching the agents or the routes.
 */

describe("createGame", () => {
  it.todo("deals exactly one imposter");
  it.todo("same seed + playerId → same roles");
  it.todo("different playerId → different roles (over many samples)");
  it.todo("same seed → same word set regardless of playerId");
});

describe("validateClue", () => {
  it.todo("rejects the secret word");
  it.todo("rejects a word sharing the first 4 letters with the secret word");
  it.todo("rejects a clue already given this game");
  it.todo("rejects multi-word input");
  it.todo("accepts hyphenated words");
});

describe("resolveVote", () => {
  it.todo("ejects the plurality target");
  it.todo("ejects no one on a tie");
  it.todo("never accepts a self-vote");
  it.todo("moves to lastGuess when the imposter is ejected, else reveal");
});

describe("seatView", () => {
  it.todo("imposter view has word === null");
  it.todo("JSON.stringify(seatView(imposter)) does not contain the secret word");
});

describe("publicView", () => {
  it.todo("omits traces and roles before reveal");
  it.todo("includes word, roles, and traces after reveal");
  it.todo("includes the word in watch mode before reveal");
});

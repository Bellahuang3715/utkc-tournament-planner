import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearScorekeeperToken,
  getScorekeeperAccess,
  getScorekeeperDisplayName,
  getScorekeeperToken,
  getTournamentIdFromPath,
  hasScorekeeperTokenForPath,
  storeScorekeeperAccess,
} from "./scorekeeper_access";

describe("scorekeeper_access", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      location: { pathname: "/tournaments/42/scores" },
    });
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores and reads access by tournament id", () => {
    storeScorekeeperAccess(7, {
      token: "tok-abc",
      firstName: " Ada ",
      lastName: " Lovelace ",
    });
    expect(getScorekeeperAccess(7)).toEqual({
      token: "tok-abc",
      firstName: "Ada",
      lastName: "Lovelace",
    });
    expect(getScorekeeperToken(7)).toBe("tok-abc");
    expect(getScorekeeperDisplayName(7)).toBe("Ada Lovelace");
  });

  it("clears access for one tournament", () => {
    storeScorekeeperAccess(7, {
      token: "tok-abc",
      firstName: "Ada",
      lastName: "Lovelace",
    });
    clearScorekeeperToken(7);
    expect(getScorekeeperAccess(7)).toBeNull();
  });

  it("parses tournament id from path", () => {
    expect(getTournamentIdFromPath("/tournaments/99/scores/1")).toBe(99);
    expect(getTournamentIdFromPath("/login")).toBeNull();
    expect(getTournamentIdFromPath()).toBe(42);
  });

  it("checks path-scoped token presence", () => {
    expect(hasScorekeeperTokenForPath("/tournaments/42/scores")).toBe(false);
    storeScorekeeperAccess(42, {
      token: "t",
      firstName: "A",
      lastName: "B",
    });
    expect(hasScorekeeperTokenForPath("/tournaments/42/scores")).toBe(true);
    expect(hasScorekeeperTokenForPath("/tournaments/99/scores")).toBe(false);
  });
});

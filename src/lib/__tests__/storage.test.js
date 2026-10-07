import { describe, it, expect } from "vitest";
import { KEYS, runMigrations, exportData, importData } from "../storage.js";

const focus = { domainId: 1, subIndex: 0, practiceIndex: 3, startedAt: "2026-10-07", skipped: [1, 2] };
const checkin = {
  id: "2026-10-07T18:22:01.000Z",
  date: "2026-10-07",
  week: "2026-W41",
  domainId: 1,
  subIndex: 0,
  practiceIndex: 3,
  practised: "yes",
  score: 6,
  note: "Went well.",
};
const good = () => ({
  app: "life-improver",
  schema: 2,
  exportedAt: "2026-10-07T18:30:00.000Z",
  data: { scores: { "1-0": 6 }, quick: { 1: 5 }, focus, checkins: [checkin] },
});

describe("KEYS", () => {
  it("namespaces every key under life-improver:", () => {
    Object.values(KEYS).forEach((k) => expect(k.startsWith("life-improver:")).toBe(true));
    expect(KEYS.scores).toBe("life-improver:scores:v1");
  });
});

describe("runMigrations", () => {
  it("writes meta when missing", () => {
    runMigrations();
    const meta = JSON.parse(localStorage.getItem(KEYS.meta));
    expect(meta.schema).toBe(2);
    expect(Number.isNaN(Date.parse(meta.createdAt))).toBe(false);
  });

  it("is idempotent: a second run keeps the original meta", () => {
    runMigrations();
    const first = localStorage.getItem(KEYS.meta);
    runMigrations();
    runMigrations();
    expect(localStorage.getItem(KEYS.meta)).toBe(first);
  });

  it("never deletes or alters existing scores", () => {
    const scores = JSON.stringify({ "1-0": 4, "2-3": 9 });
    localStorage.setItem(KEYS.scores, scores);
    runMigrations();
    runMigrations();
    expect(localStorage.getItem(KEYS.scores)).toBe(scores);
  });

  it("does not create other data keys", () => {
    runMigrations();
    expect(localStorage.length).toBe(1);
  });

  it("works against an injected storage and survives a failing one", () => {
    const store = new Map();
    const fake = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
    runMigrations(fake);
    expect(store.has(KEYS.meta)).toBe(true);
    const broken = { getItem: () => { throw new Error("denied"); }, setItem: () => {} };
    expect(() => runMigrations(broken)).not.toThrow();
  });
});

describe("exportData", () => {
  it("returns empty defaults on a fresh store", () => {
    const out = exportData();
    expect(out.app).toBe("life-improver");
    expect(out.schema).toBe(2);
    expect(Number.isNaN(Date.parse(out.exportedAt))).toBe(false);
    expect(out.data).toEqual({ scores: {}, quick: {}, focus: null, checkins: [] });
  });

  it("returns stored values", () => {
    localStorage.setItem(KEYS.scores, JSON.stringify({ "1-0": 7 }));
    localStorage.setItem(KEYS.focus, JSON.stringify(focus));
    localStorage.setItem(KEYS.checkins, JSON.stringify([checkin]));
    const { data } = exportData();
    expect(data.scores).toEqual({ "1-0": 7 });
    expect(data.focus).toEqual(focus);
    expect(data.checkins).toEqual([checkin]);
  });

  it("falls back to defaults for corrupt JSON", () => {
    localStorage.setItem(KEYS.scores, "{not json");
    expect(exportData().data.scores).toEqual({});
  });

  it("does not include meta", () => {
    runMigrations();
    expect(Object.keys(exportData().data)).toEqual(["scores", "quick", "focus", "checkins"]);
  });
});

describe("importData", () => {
  it("round-trips an export", () => {
    const text = JSON.stringify(good());
    importData(text);
    expect(exportData().data).toEqual(good().data);
  });

  it("accepts an already-parsed object", () => {
    importData(good());
    expect(JSON.parse(localStorage.getItem(KEYS.quick))).toEqual({ 1: 5 });
  });

  it("overwrites existing data, and missing keys become empty", () => {
    localStorage.setItem(KEYS.scores, JSON.stringify({ "3-3": 3 }));
    localStorage.setItem(KEYS.checkins, JSON.stringify([checkin]));
    importData({ app: "life-improver", schema: 2, data: { scores: { "1-0": 8 } } });
    expect(JSON.parse(localStorage.getItem(KEYS.scores))).toEqual({ "1-0": 8 });
    expect(JSON.parse(localStorage.getItem(KEYS.checkins))).toEqual([]);
    expect(JSON.parse(localStorage.getItem(KEYS.focus))).toBeNull();
  });

  it("ensures meta exists afterwards", () => {
    importData(good());
    expect(localStorage.getItem(KEYS.meta)).not.toBeNull();
  });

  it("rejects text that is not JSON", () => {
    expect(() => importData("hello")).toThrow("not valid JSON");
  });

  it("rejects non-objects and other apps", () => {
    expect(() => importData("[]")).toThrow("not a Life Improver export");
    expect(() => importData("null")).toThrow("not a Life Improver export");
    expect(() => importData({ ...good(), app: "other" })).toThrow("not a Life Improver export");
  });

  it("rejects an unsupported schema", () => {
    expect(() => importData({ ...good(), schema: 1 })).toThrow("schema");
    expect(() => importData({ ...good(), schema: 3 })).toThrow("schema");
  });

  it("rejects a missing data section", () => {
    expect(() => importData({ app: "life-improver", schema: 2 })).toThrow("no data");
  });

  it.each([
    ["scores out of range", { scores: { "1-0": 11 } }, "scores"],
    ["scores with a bad key", { scores: { nope: 5 } }, "scores"],
    ["scores not an object", { scores: [5] }, "scores"],
    ["quick with a sub-style key", { quick: { "1-0": 5 } }, "quick"],
    ["quick with a non-number", { quick: { 1: "5" } }, "quick"],
    ["focus of the wrong shape", { focus: { domainId: 1 } }, "focus"],
    ["focus that is a string", { focus: "x" }, "focus"],
    ["checkins not a list", { checkins: {} }, "checkins"],
    ["a check-in with a bad practised value", { checkins: [{ ...checkin, practised: "maybe" }] }, "checkins"],
    ["a check-in with no score", { checkins: [{ ...checkin, score: undefined }] }, "checkins"],
  ])("rejects %s", (_, patch, name) => {
    const input = good();
    Object.assign(input.data, patch);
    expect(() => importData(input)).toThrow(`"${name}"`);
  });

  it("writes nothing when validation fails", () => {
    localStorage.setItem(KEYS.scores, JSON.stringify({ "1-0": 2 }));
    const input = good();
    input.data.checkins = "broken"; // scores are valid, checkins are not
    expect(() => importData(input)).toThrow();
    expect(JSON.parse(localStorage.getItem(KEYS.scores))).toEqual({ "1-0": 2 });
    expect(localStorage.getItem(KEYS.checkins)).toBeNull();
  });
});

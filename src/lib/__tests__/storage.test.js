import { describe, it, expect } from "vitest";
import { KEYS, runMigrations, exportData, importData, isValidCheckin } from "../storage.js";

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

  it("caps notes at 500 characters", () => {
    const data = { ...good().data, checkins: [{ ...checkin, note: "x".repeat(900) }] };
    importData({ ...good(), data });
    expect(JSON.parse(localStorage.getItem(KEYS.checkins))[0].note).toHaveLength(500);
  });

  it("rejects a check-in date that is not YYYY-MM-DD", () => {
    ["yesterday", "2026-1-5", "2026-10-07T10:00"].forEach((date) => {
      const data = { ...good().data, checkins: [{ ...checkin, date }] };
      expect(() => importData({ ...good(), data })).toThrow("invalid check-in");
    });
  });

  it("rolls back every key and rethrows a human message when a write fails", () => {
    localStorage.setItem(KEYS.scores, JSON.stringify({ "3-3": 3 }));
    localStorage.setItem(KEYS.quick, JSON.stringify({ 2: 2 }));
    const real = Storage.prototype.setItem;
    let writes = 0;
    Storage.prototype.setItem = function (k, v) {
      // Let the first two keys land, then run out of room.
      if (k.startsWith("life-improver:") && ++writes === 3) throw new DOMException("full", "QuotaExceededError");
      return real.call(this, k, v);
    };
    try {
      expect(() => importData(good())).toThrow("This device has no room for the file.");
    } finally {
      Storage.prototype.setItem = real;
    }
    expect(JSON.parse(localStorage.getItem(KEYS.scores))).toEqual({ "3-3": 3 });
    expect(JSON.parse(localStorage.getItem(KEYS.quick))).toEqual({ 2: 2 });
    expect(localStorage.getItem(KEYS.focus)).toBeNull();
    expect(localStorage.getItem(KEYS.checkins)).toBeNull();
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
    ["scores with a fractional value", { scores: { "1-0": 5.5 } }, "scores"],
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

describe("isValidCheckin", () => {
  it("accepts a complete check-in", () => {
    expect(isValidCheckin(checkin)).toBe(true);
  });

  it.each([
    ["a non-object", null],
    ["an empty object", {}],
    ["a numeric id", { ...checkin, id: 1 }],
    ["a bad date", { ...checkin, date: "2026-1-5" }],
    ["a missing week", { ...checkin, week: undefined }],
    ["a negative index", { ...checkin, subIndex: -1 }],
    ["a fractional index", { ...checkin, practiceIndex: 1.5 }],
    ["a bad practised value", { ...checkin, practised: "maybe" }],
    ["a fractional score", { ...checkin, score: 5.5 }],
    ["a missing note", { ...checkin, note: undefined }],
  ])("rejects %s", (_, c) => {
    expect(isValidCheckin(c)).toBe(false);
  });
});

describe("damaged check-ins", () => {
  it.each([[[{ id: 1, date: 5 }]], [[{}]], [[checkin, null]]])("import rejects %j", (list) => {
    const input = good();
    input.data.checkins = list;
    expect(() => importData(input)).toThrow('"checkins"');
  });

  it("export keeps only valid entries, so the export re-imports", () => {
    localStorage.setItem(KEYS.checkins, JSON.stringify([checkin, null, { id: 1, date: 5 }, { ...checkin, note: "x".repeat(900) }]));
    localStorage.setItem(KEYS.scores, JSON.stringify({ "1-0": 6, "1-1": 99, nope: 5 }));
    localStorage.setItem(KEYS.focus, JSON.stringify({ domainId: 1, subIndex: 0, practiceIndex: 2 }));
    const out = exportData();
    expect(out.data.checkins).toHaveLength(2);
    expect(out.data.checkins[1].note).toHaveLength(500);
    expect(out.data.scores).toEqual({ "1-0": 6 });
    expect(out.data.focus).toEqual({ domainId: 1, subIndex: 0, practiceIndex: 2, skipped: [] });
    expect(() => importData(JSON.parse(JSON.stringify(out)))).not.toThrow();
  });
});

// Owns every localStorage key the app uses, plus migration and export/import.

export const KEYS = {
  scores: "life-improver:scores:v1",
  quick: "life-improver:quick:v1",
  focus: "life-improver:focus:v1",
  checkins: "life-improver:checkins:v1",
  meta: "life-improver:meta:v1",
};

const APP = "life-improver";
const SCHEMA = 2;

// What an empty value looks like for each exported key.
const DEFAULTS = { scores: {}, quick: {}, focus: null, checkins: [] };
const DATA_KEYS = Object.keys(DEFAULTS);

// Read and parse one key; fall back on missing or corrupt data.
function read(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// Runs at startup. Writes meta:v1 when missing and nothing else: safe to run
// any number of times, and it never touches (or deletes) scores:v1.
export function runMigrations(storage = localStorage) {
  try {
    if (storage.getItem(KEYS.meta) === null) {
      const meta = { schema: SCHEMA, createdAt: new Date().toISOString() };
      storage.setItem(KEYS.meta, JSON.stringify(meta));
    }
  } catch {
    // Storage unavailable (private mode): the app runs in memory only.
  }
}

// Snapshot of the user's data, ready to save as a JSON file.
export function exportData(storage = localStorage) {
  const data = {};
  for (const name of DATA_KEYS) data[name] = read(storage, KEYS[name], DEFAULTS[name]);
  return { app: APP, schema: SCHEMA, exportedAt: new Date().toISOString(), data };
}

export const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
export const isScore = (v) => typeof v === "number" && v >= 1 && v <= 10;
const isIndex = (v) => Number.isInteger(v) && v >= 0;
const isDate = (v) => typeof v === "string" && /^\d{4}-\d\d-\d\d$/.test(v);
const MAX_NOTE = 500;

// Light shape checks for values read back from localStorage by the hooks.
// Strict validation (below) is reserved for imports.
export const isScoreMap = (v) => isObject(v) && Object.values(v).every(isScore);
export const isFocusShape = (v) =>
  v === null ||
  (isObject(v) &&
    Number.isFinite(v.domainId) &&
    Number.isFinite(v.subIndex) &&
    Number.isFinite(v.practiceIndex));
export const isCheckinList = (v) => Array.isArray(v) && v.every(isObject);

// Each validator returns an error fragment, or null when the value is fine.
function checkScoreMap(map, keyPattern) {
  if (!isObject(map)) return "must be an object";
  for (const [k, v] of Object.entries(map)) {
    if (!keyPattern.test(k)) return `has an unexpected key "${k}"`;
    if (!isScore(v)) return `has a score outside 1 to 10 for "${k}"`;
  }
  return null;
}

function checkFocus(f) {
  if (f === null) return null;
  const ok =
    isObject(f) &&
    isIndex(f.domainId) &&
    isIndex(f.subIndex) &&
    isIndex(f.practiceIndex) &&
    typeof f.startedAt === "string" &&
    Array.isArray(f.skipped) &&
    f.skipped.every(isIndex);
  return ok ? null : "is not a valid focus";
}

function checkCheckins(list) {
  if (!Array.isArray(list)) return "must be a list";
  const ok = list.every(
    (c) =>
      isObject(c) &&
      typeof c.id === "string" &&
      isDate(c.date) &&
      typeof c.week === "string" &&
      isIndex(c.domainId) &&
      isIndex(c.subIndex) &&
      isIndex(c.practiceIndex) &&
      ["yes", "some", "no"].includes(c.practised) &&
      isScore(c.score) &&
      typeof c.note === "string"
  );
  return ok ? null : "contains an invalid check-in";
}

// Validate an export (JSON text or an already-parsed object) and overwrite the
// four data keys. Nothing is written unless everything is valid. Throws Error
// with a human message on bad input.
export function importData(json, storage = localStorage) {
  let parsed = json;
  if (typeof json === "string") {
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error("This file is not valid JSON.");
    }
  }
  if (!isObject(parsed) || parsed.app !== APP) {
    throw new Error("This file is not a Life Improver export.");
  }
  if (parsed.schema !== SCHEMA) {
    throw new Error(`This export uses schema ${parsed.schema}, but this app reads schema ${SCHEMA}.`);
  }
  if (!isObject(parsed.data)) {
    throw new Error("This export has no data section.");
  }

  // Missing keys fall back to empty; present keys must be well formed.
  const data = {};
  for (const name of DATA_KEYS) {
    data[name] = parsed.data[name] === undefined ? DEFAULTS[name] : parsed.data[name];
  }
  const problems = {
    scores: checkScoreMap(data.scores, /^\d+-\d+$/),
    quick: checkScoreMap(data.quick, /^\d+$/),
    focus: checkFocus(data.focus),
    checkins: checkCheckins(data.checkins),
  };
  for (const name of DATA_KEYS) {
    if (problems[name]) throw new Error(`The "${name}" data ${problems[name]}.`);
  }

  // Notes are capped, as they are when written through the app.
  data.checkins = data.checkins.map((c) => ({ ...c, note: c.note.slice(0, MAX_NOTE) }));

  // Snapshot what is there, so a failed write leaves the old data intact.
  const names = [...DATA_KEYS.map((n) => KEYS[n]), KEYS.meta];
  const snapshot = {};
  try {
    for (const key of names) snapshot[key] = storage.getItem(key);
  } catch {
    throw new Error("This device could not read its saved data.");
  }
  try {
    for (const name of DATA_KEYS) storage.setItem(KEYS[name], JSON.stringify(data[name]));
    runMigrations(storage);
  } catch {
    for (const key of names) {
      try {
        if (snapshot[key] === null) storage.removeItem(key);
        else storage.setItem(key, snapshot[key]);
      } catch {
        // Best effort: nothing more can be done here.
      }
    }
    throw new Error("This device has no room for the file.");
  }
  return data;
}

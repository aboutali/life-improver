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

// ---- Storage status registry ------------------------------------------
// Module-level, read through getStorageStatus(). `available` is false when a
// test write failed at startup or any later setItem threw. `damaged` lists the
// keys whose stored value failed to parse, or was dropped or trimmed by a
// sanitizer, this session. Raw copies are also held in memory, so a damaged
// copy can be downloaded even when storage refuses the `:bad` backup.
let detected = false;
let available = true;
const damagedKeys = new Set();
const memoryBad = new Map();
const listeners = new Set();
let snapshot = null;

function changed() {
  snapshot = null;
  listeners.forEach((fn) => fn());
}

// One test write and remove. Runs once; later calls do nothing.
export function detectStorage(storage = typeof localStorage === "undefined" ? null : localStorage) {
  if (detected) return available;
  detected = true;
  try {
    const probe = `${APP}:probe`;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    available = true;
  } catch {
    available = false;
  }
  changed();
  return available;
}

export function markWriteFailed() {
  detected = true;
  if (available) {
    available = false;
    changed();
  }
}

export function markDamaged(key, raw) {
  if (typeof raw === "string" && !memoryBad.has(key)) memoryBad.set(key, raw);
  if (!damagedKeys.has(key)) {
    damagedKeys.add(key);
    changed();
  }
}

// { available, damaged }. The same object is returned until something changes,
// so it is safe to use as a useSyncExternalStore snapshot.
export function getStorageStatus() {
  detectStorage();
  if (!snapshot) snapshot = { available, damaged: [...damagedKeys] };
  return snapshot;
}

export function subscribeStorageStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Test helper: forget everything the registry knows.
export function resetStorageStatus() {
  detected = false;
  available = true;
  damagedKeys.clear();
  memoryBad.clear();
  changed();
}

// The damaged copies kept this session or earlier: { "<key>": "<raw text>" }.
export function readBadCopies(storage = typeof localStorage === "undefined" ? null : localStorage) {
  const out = {};
  for (const key of Object.values(KEYS)) {
    const badKey = `${key}:bad`;
    try {
      const raw = storage && storage.getItem(badKey);
      if (raw !== null && raw !== undefined) out[badKey] = raw;
    } catch {
      // Unreadable storage: fall through to the in-memory copy.
    }
    if (!(badKey in out) && memoryBad.has(key)) out[badKey] = memoryBad.get(key);
  }
  return out;
}

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
    markWriteFailed();
  }
}

// Snapshot of the user's data, ready to save as a JSON file. Values are the
// sanitized ones the app itself uses, so an export always re-imports.
export function exportData(storage = localStorage) {
  const values = {};
  for (const name of DATA_KEYS) values[name] = read(storage, KEYS[name], DEFAULTS[name]);
  return buildExport(values);
}

// The same snapshot built from values already in memory ({ scores, quick,
// focus, checkins }), so a copy can be saved when storage is blocked.
export function buildExport(values = {}) {
  const data = {};
  for (const name of DATA_KEYS) {
    const given = values[name] === undefined ? DEFAULTS[name] : values[name];
    const cleaned = SANITIZERS[name](given);
    data[name] = cleaned === undefined ? DEFAULTS[name] : cleaned;
  }
  return { app: APP, schema: SCHEMA, exportedAt: new Date().toISOString(), data };
}

// ---- Welcome draft (sessionStorage) -------------------------------------
export const DRAFT_KEY = `${APP}:draft`;

// { quick: { domainId: 1..10 }, pick: { domainId, subIndex } | null }
export function sanitizeDraft(v) {
  const quick = {};
  if (isObject(v) && isObject(v.quick)) {
    for (const [k, val] of Object.entries(v.quick)) {
      if (DOMAIN_KEY.test(k) && isScore(val)) quick[k] = val;
    }
  }
  const p = isObject(v) ? v.pick : null;
  const pick = isObject(p) && isIndex(p.domainId) && isIndex(p.subIndex)
    ? { domainId: p.domainId, subIndex: p.subIndex }
    : null;
  return { quick, pick };
}

export function readDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return sanitizeDraft(raw ? JSON.parse(raw) : null);
  } catch {
    return sanitizeDraft(null);
  }
}

export function writeDraft(draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Session storage blocked: the draft lives in memory only.
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
}

// What an empty value looks like for each exported key (continued).

export const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
export const isScore = (v) => Number.isInteger(v) && v >= 1 && v <= 10;
const isIndex = (v) => Number.isInteger(v) && v >= 0;
const isDate = (v) => typeof v === "string" && /^\d{4}-\d\d-\d\d$/.test(v);
const MAX_NOTE = 500;
const SUB_KEY = /^\d+-\d+$/;
const DOMAIN_KEY = /^\d+$/;

// One check-in, strictly: every field present and of the right kind.
export function isValidCheckin(c) {
  return (
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
}

// Sanitizers clean a parsed value read back from localStorage: they drop what
// is invalid and keep the rest. They return undefined when nothing is usable.
// Score maps: keep entries with a matching key and an integer 1..10.
const sanitizeScoreMap = (keyPattern) => (v) => {
  if (!isObject(v)) return undefined;
  const out = {};
  for (const [k, val] of Object.entries(v)) {
    if (keyPattern.test(k) && isScore(val)) out[k] = val;
  }
  return out;
};
export const sanitizeScores = sanitizeScoreMap(SUB_KEY);
export const sanitizeQuick = sanitizeScoreMap(DOMAIN_KEY);

// Focus: keep when the three indices are valid, coercing skipped to a list of
// indices. Anything else is no focus (null).
export function sanitizeFocus(v) {
  if (!isObject(v) || !isIndex(v.domainId) || !isIndex(v.subIndex) || !isIndex(v.practiceIndex)) {
    return null;
  }
  const skipped = Array.isArray(v.skipped) ? v.skipped.filter(isIndex) : [];
  return { ...v, skipped };
}

// Check-ins: keep the valid entries, with notes capped.
export function sanitizeCheckins(v) {
  if (!Array.isArray(v)) return undefined;
  return v.filter(isValidCheckin).map((c) => ({ ...c, note: c.note.slice(0, MAX_NOTE) }));
}

const SANITIZERS = {
  scores: sanitizeScores,
  quick: sanitizeQuick,
  focus: sanitizeFocus,
  checkins: sanitizeCheckins,
};

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
  return f === null || sanitizeFocus(f) !== null ? null : "is not a valid focus";
}

function checkCheckins(list) {
  if (!Array.isArray(list)) return "must be a list";
  return list.every(isValidCheckin) ? null : "contains an invalid check-in";
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
    scores: checkScoreMap(data.scores, SUB_KEY),
    quick: checkScoreMap(data.quick, DOMAIN_KEY),
    focus: checkFocus(data.focus),
    checkins: checkCheckins(data.checkins),
  };
  for (const name of DATA_KEYS) {
    if (problems[name]) throw new Error(`The "${name}" data ${problems[name]}.`);
  }

  // Notes are capped and skips normalized, as they are when written through the app.
  data.checkins = sanitizeCheckins(data.checkins);
  data.focus = sanitizeFocus(data.focus);

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

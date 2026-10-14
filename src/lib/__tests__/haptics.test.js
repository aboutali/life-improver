import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { haptic, resetHaptics, setHapticsEnabled } from "../haptics.js";
import { KEYS, readPrefs, sanitizePrefs } from "../storage.js";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

function setNav(props) {
  for (const [k, v] of Object.entries(props)) {
    Object.defineProperty(navigator, k, { configurable: true, value: v });
  }
}

beforeEach(() => {
  localStorage.clear();
  resetHaptics();
});

afterEach(() => {
  delete navigator.vibrate;
  delete navigator.userAgent; // restores the prototype getter
  document.body.innerHTML = "";
});

describe("haptic on Android", () => {
  it("vibrates briefly by kind", () => {
    const vibrate = vi.fn();
    setNav({ vibrate });
    haptic();
    haptic("medium");
    haptic("success");
    haptic("warning");
    expect(vibrate.mock.calls.map((c) => c[0])).toEqual([8, 15, [10, 40, 10], [15, 50, 15]]);
  });

  it("does not add the hidden switch", () => {
    setNav({ vibrate: vi.fn() });
    haptic("light");
    expect(document.querySelector("input[switch]")).toBeNull();
  });
});

describe("haptic on iOS", () => {
  beforeEach(() => setNav({ userAgent: IPHONE }));

  it("creates one hidden switch and toggles it on each call", () => {
    haptic("light");
    const inputs = document.querySelectorAll("label[aria-hidden='true'] input[type=checkbox][switch]");
    expect(inputs).toHaveLength(1);
    expect(inputs[0].tabIndex).toBe(-1);
    expect(inputs[0].checked).toBe(true);
    haptic("success");
    expect(document.querySelectorAll("input[switch]")).toHaveLength(1);
    expect(inputs[0].checked).toBe(false);
    expect(document.querySelector("label[data-haptic]").style.pointerEvents).toBe("none");
  });

  it("gives focus back if the click moved it", () => {
    haptic("light");
    const input = document.querySelector("input[switch]");
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    btn.focus();
    vi.spyOn(HTMLLabelElement.prototype, "click").mockImplementation(() => input.focus());
    haptic("light");
    expect(document.activeElement).toBe(btn);
  });

  it("recreates the switch if the page removed it", () => {
    haptic("light");
    document.body.innerHTML = "";
    haptic("light");
    expect(document.querySelectorAll("input[switch]")).toHaveLength(1);
  });
});

describe("haptic elsewhere", () => {
  it("does nothing on a desktop browser", () => {
    expect(() => haptic("light")).not.toThrow();
    expect(document.querySelector("input[switch]")).toBeNull();
  });

  it("never throws when vibrate throws", () => {
    setNav({ vibrate: () => { throw new Error("blocked"); } });
    expect(() => haptic("light")).not.toThrow();
  });
});

describe("the Haptics setting", () => {
  it("stays quiet when stored as off", () => {
    localStorage.setItem(KEYS.prefs, JSON.stringify({ haptics: false }));
    const vibrate = vi.fn();
    setNav({ vibrate });
    haptic("light");
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("follows setHapticsEnabled", () => {
    const vibrate = vi.fn();
    setNav({ vibrate });
    setHapticsEnabled(false);
    haptic("light");
    expect(vibrate).not.toHaveBeenCalled();
    setHapticsEnabled(true);
    haptic("light");
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it("is silent on iOS when off", () => {
    setNav({ userAgent: IPHONE });
    setHapticsEnabled(false);
    haptic("light");
    expect(document.querySelector("input[switch]")).toBeNull();
  });
});

describe("prefs storage", () => {
  it("defaults to haptics on and cleans bad values", () => {
    expect(readPrefs()).toEqual({ haptics: true });
    expect(sanitizePrefs({ haptics: "no", extra: 1 })).toEqual({ haptics: true });
    expect(sanitizePrefs({ haptics: false })).toEqual({ haptics: false });
    expect(sanitizePrefs(null)).toBeUndefined();
    localStorage.setItem(KEYS.prefs, "{not json");
    expect(readPrefs()).toEqual({ haptics: true });
  });
});

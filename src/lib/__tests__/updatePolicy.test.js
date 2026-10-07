import { describe, it, expect, vi } from "vitest";
import { createUpdatePolicy } from "../updatePolicy.js";

describe("createUpdatePolicy", () => {
  it("does nothing when no update is waiting", () => {
    const apply = vi.fn();
    const p = createUpdatePolicy({ apply });
    p.onHashChange();
    p.onVisibilityChange("hidden");
    expect(apply).not.toHaveBeenCalled();
  });

  it("holds the update until a safe moment", () => {
    const apply = vi.fn();
    const p = createUpdatePolicy({ apply });
    p.onNeedRefresh();
    expect(p.isPending()).toBe(true);
    expect(apply).not.toHaveBeenCalled();
  });

  it("applies on the next hash change, once", () => {
    const apply = vi.fn();
    const p = createUpdatePolicy({ apply });
    p.onNeedRefresh();
    p.onHashChange();
    p.onHashChange();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(p.isPending()).toBe(false);
  });

  it("applies when the page becomes hidden, but not when visible", () => {
    const apply = vi.fn();
    const p = createUpdatePolicy({ apply });
    p.onNeedRefresh();
    p.onVisibilityChange("visible");
    expect(apply).not.toHaveBeenCalled();
    p.onVisibilityChange("hidden");
    expect(apply).toHaveBeenCalledTimes(1);
    p.onHashChange();
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("can apply again after a later update arrives", () => {
    const apply = vi.fn();
    const p = createUpdatePolicy({ apply });
    p.onNeedRefresh();
    p.onHashChange();
    p.onNeedRefresh();
    p.onVisibilityChange("hidden");
    expect(apply).toHaveBeenCalledTimes(2);
  });
});

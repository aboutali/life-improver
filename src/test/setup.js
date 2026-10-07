import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

// Every test starts with an empty localStorage.
beforeEach(() => {
  localStorage.clear();
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Garden from "../Garden.jsx";
import { FRAMEWORK } from "../../data/framework.js";

const garden = (scoreMap, quickScores = {}) => (
  <Garden scores={{ scores: scoreMap }} quickScores={quickScores} focusDomainId={null} />
);
const row = (domainIndex) => screen.getByText(FRAMEWORK[domainIndex].domain).closest("li");

describe("Garden", () => {
  it("marks a partly rated domain and shows its quick score when under half rated", () => {
    const total = FRAMEWORK[0].subs.length;
    render(garden({ [`${FRAMEWORK[0].id}-0`]: 8 }, { [FRAMEWORK[0].id]: 5 }));
    const r = row(0);
    expect(r).toHaveTextContent(`1 of ${total} rated`);
    expect(r).toHaveTextContent("5.0");
    expect(r).toHaveTextContent("quick");
  });

  it("uses the full average from half the subs up, and still says n of m", () => {
    const d = FRAMEWORK[1];
    const half = Math.ceil(d.subs.length / 2);
    const map = {};
    for (let i = 0; i < half; i++) map[`${d.id}-${i}`] = 8;
    render(garden(map, { [d.id]: 2 }));
    const r = row(1);
    expect(r).toHaveTextContent("8.0");
    expect(r).not.toHaveTextContent("quick");
    if (half < d.subs.length) expect(r).toHaveTextContent(`${half} of ${d.subs.length} rated`);
  });

  it("shows no count when every sub is rated or none is", () => {
    const d = FRAMEWORK[2];
    const map = Object.fromEntries(d.subs.map((_, i) => [`${d.id}-${i}`, 6]));
    render(garden(map));
    expect(row(2)).not.toHaveTextContent("rated");
    expect(row(3)).not.toHaveTextContent("of");
  });
});

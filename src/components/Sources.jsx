import { SOURCES } from "../data/sources.js";

export default function Sources() {
  const total = SOURCES.reduce((a, c) => a + c.items.length, 0);

  return (
    <div>
      <h2 className="t-large cat-title">The thinking behind it.</h2>
      <p className="t-sub cat-intro">
        None of this is invented. Every dimension, every category, every practice traces back to research, philosophy, or tradition that has stood the test of time.
      </p>
      <p className="t-foot cat-count">
        {total} sources · {SOURCES.length} disciplines
      </p>
      <p className="cat-links">
        <a className="btn-text" href="#/practices">Browse the practices</a>
      </p>

      {SOURCES.map((cat, ci) => (
        <section key={ci}>
          <h3 className="t-eyebrow list-title">{cat.category}</h3>
          <div className="list">
            {cat.items.map((src, si) => (
              <div key={si} className="row cat-src">
                <span className="cat-year">{typeof src.year === "number" ? src.year : src.year || "—"}</span>
                <div className="cat-src-body">
                  <p className="t-head">
                    {src.author}
                    {src.author && " — "}
                    <span className="sf cat-src-title">{src.title}</span>
                  </p>
                  <p className="t-foot">{src.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

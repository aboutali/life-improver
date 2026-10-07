import { useId, useRef, useState } from "react";
import { drawShareCard, shareOrDownload } from "../lib/shareCard.js";
import { toLocalDate } from "../lib/dates.js";

// Offers the assessment as an image. Numbers are hidden by default: the shape
// of the garden is enough to share.
export default function ShareButton({ domains, overall }) {
  const [hideScores, setHideScores] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const busyRef = useRef(false);
  const checkId = useId();

  const onShare = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const canvas = document.createElement("canvas");
      const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const drawn = await drawShareCard(canvas, { domains, overall, hideScores, date });
      if (!drawn) throw new Error("This browser cannot draw the image.");
      const result = await shareOrDownload(canvas, `life-improver-${toLocalDate()}.png`);
      if (result === "downloaded") setMessage("Image saved to your downloads.");
    } catch (err) {
      setFailed(true);
      setMessage(err && err.message ? err.message : "The image could not be shared.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="share">
      <div className="share-row">
        <label className="share-check" htmlFor={checkId}>
          <input
            id={checkId}
            type="checkbox"
            checked={hideScores}
            onChange={(e) => setHideScores(e.target.checked)}
          />
          <span>Hide numbers</span>
        </label>
        <button
          type="button"
          className="btn btn-primary share-btn"
          onClick={onShare}
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? "Preparing image…" : "Share image"}
        </button>
      </div>
      <p className="share-msg" role="status">{failed ? "" : message}</p>
      <p className="share-msg" role="alert" style={{ color: "#C53030" }}>{failed ? message : ""}</p>
    </div>
  );
}

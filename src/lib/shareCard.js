// Draws the shareable "My seven grounds" card and hands it to the share sheet
// (or downloads it). Canvas work only: no business logic lives here.

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

const BG = "#0F172A";
const ACCENT = "#3B82F6";
const TRACK = "#1E293B";
const MUTED = "#64748B";
const SOFT = "#CBD5E1";
const BRIGHT = "#F1F5F9";
const SANS = "'Source Sans 3', 'Segoe UI', Arial, sans-serif";
const SERIF = "'Source Serif 4', Georgia, serif";
const FOOTER = "Before you arrange the stones, first see the whole garden.";

// Same bright tiers as the assessment dashboard.
const brightTierColor = (sc) =>
  sc <= 2 ? "#EF4444" : sc <= 4 ? "#F97316" : sc <= 6 ? "#EAB308" : sc <= 8 ? "#22C55E" : "#3B82F6";

// Wait for web fonts so the card does not fall back to a system face.
async function fontsReady() {
  try {
    if (typeof document === "undefined" || !document.fonts) return;
    if (document.fonts.load) {
      await Promise.all([
        document.fonts.load(`300 80px ${SERIF}`),
        document.fonts.load(`400 28px ${SERIF}`),
        document.fonts.load(`600 30px ${SANS}`),
      ]);
    }
    await document.fonts.ready;
  } catch {
    // Fonts are a nicety; draw with fallbacks.
  }
}

// Shorten text with an ellipsis until it fits maxWidth.
function fit(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(out + "…").width > maxWidth) out = out.slice(0, -1);
  return out + "…";
}

// Draw onto `canvas`. Resolves true when drawn, false when no 2D context exists.
export async function drawShareCard(canvas, { domains = [], overall = null, hideScores = false, date = "" } = {}) {
  await fontsReady();
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext ? canvas.getContext("2d") : null;
  if (!ctx) return false;

  const left = 72;
  const right = CARD_WIDTH - 72;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, CARD_WIDTH, 8);

  // Header: wordmark left, date right.
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = ACCENT;
  ctx.font = `700 26px ${SANS}`;
  ctx.fillText("LIFE IMPROVER", left, 110);
  ctx.textAlign = "right";
  ctx.fillStyle = MUTED;
  ctx.font = `400 26px ${SANS}`;
  ctx.fillText(date, right, 110);

  // Title.
  ctx.textAlign = "center";
  ctx.fillStyle = BRIGHT;
  ctx.font = `300 88px ${SERIF}`;
  ctx.fillText("My seven grounds", CARD_WIDTH / 2, 270);

  // Overall number (omitted when numbers are hidden).
  const overallNum = overall === null || overall === undefined ? NaN : parseFloat(overall);
  const showOverall = !hideScores && Number.isFinite(overallNum);
  let barsTop = 450;
  let pitch = 96;
  if (showOverall) {
    ctx.fillStyle = brightTierColor(overallNum);
    ctx.font = `200 150px ${SERIF}`;
    ctx.fillText(overallNum.toFixed(1), CARD_WIDTH / 2, 450);
    ctx.fillStyle = MUTED;
    ctx.font = `600 22px ${SANS}`;
    ctx.fillText("OVERALL", CARD_WIDTH / 2, 500);
    barsTop = 580;
    pitch = 82;
  }

  // Seven bars.
  const nameWidth = 290;
  const barLeft = left + nameWidth + 30;
  const barRight = hideScores ? right : right - 90;
  const barWidth = barRight - barLeft;
  domains.slice(0, 7).forEach((d, i) => {
    const y = barsTop + i * pitch;
    ctx.textAlign = "left";
    ctx.fillStyle = SOFT;
    ctx.font = `400 30px ${SANS}`;
    ctx.fillText(fit(ctx, d.name, nameWidth), left, y + 10);

    ctx.fillStyle = TRACK;
    ctx.fillRect(barLeft, y - 8, barWidth, 16);
    const avg = typeof d.avg === "number" ? d.avg : null;
    if (avg) {
      ctx.fillStyle = brightTierColor(avg);
      ctx.fillRect(barLeft, y - 8, Math.max(0, Math.min(10, avg)) * 0.1 * barWidth, 16);
    }
    if (!hideScores) {
      ctx.textAlign = "right";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `600 30px ${SANS}`;
      ctx.fillText(avg ? avg.toFixed(1) : "—", right, y + 10);
    }
  });

  // Footer.
  ctx.fillStyle = TRACK;
  ctx.fillRect(left, 1210, right - left, 2);
  ctx.textAlign = "center";
  ctx.fillStyle = MUTED;
  ctx.font = `italic 400 28px ${SERIF}`;
  ctx.fillText(FOOTER, CARD_WIDTH / 2, 1272);
  return true;
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob || null), "image/png");
    } catch {
      resolve(null);
    }
  });
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Share the PNG through the system share sheet when it can take files; else
// download it. Resolves "shared", "cancelled" or "downloaded"; throws when the
// canvas cannot produce an image.
export async function shareOrDownload(canvas, filename) {
  const blob = await canvasToBlob(canvas);
  if (!blob) throw new Error("The image could not be made on this device.");
  const file = new File([blob], filename, { type: "image/png" });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Life Improver" });
      return "shared";
    } catch (err) {
      if (err && err.name === "AbortError") return "cancelled";
      // Any other share failure: fall through to a plain download.
    }
  }
  download(blob, filename);
  return "downloaded";
}

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Trash2, Maximize, Minimize } from "lucide-react";

const GOLD = "#B8AB38";
const NAVY_95 = "rgba(7,19,65,0.95)";
const NAVY_72 = "rgba(7,19,65,0.72)";
const NAVY_0 = "rgba(7,19,65,0)";
const PORTRAIT_RATIO = 3 / 4;

function cropToPortrait(videoW, videoH) {
  const videoRatio = videoW / videoH;
  let sx, sy, sw, sh;
  if (videoRatio > PORTRAIT_RATIO) {
    // Landscape camera — crop sides to get portrait center
    sh = videoH;
    sw = videoH * PORTRAIT_RATIO;
    sx = (videoW - sw) / 2;
    sy = 0;
  } else {
    // Already portrait or square — crop top/bottom
    sw = videoW;
    sh = videoW / PORTRAIT_RATIO;
    sx = 0;
    sy = (videoH - sh) / 2;
  }
  return { sx, sy, sw, sh, outW: Math.round(sw), outH: Math.round(sh) };
}

function drawTemplate(ctx, w, h, logoImg) {
  const s = w / 360; // base design width 360px for portrait

  // Top gradient
  const topGrad = ctx.createLinearGradient(0, 0, 0, h * 0.30);
  topGrad.addColorStop(0, NAVY_95);
  topGrad.addColorStop(0.55, NAVY_72);
  topGrad.addColorStop(1, NAVY_0);
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, w, h * 0.30);

  // Bottom gradient
  const botGrad = ctx.createLinearGradient(0, h, 0, h * 0.70);
  botGrad.addColorStop(0, NAVY_95);
  botGrad.addColorStop(0.55, NAVY_72);
  botGrad.addColorStop(1, NAVY_0);
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, h * 0.70, w, h * 0.30);

  // Top text
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = `${Math.round(9 * s)}px Arial, sans-serif`;
  ctx.fillText("IUT DE MEAUX", w / 2, Math.round(24 * s));

  ctx.fillStyle = "white";
  ctx.font = `italic ${Math.round(14 * s)}px Georgia, serif`;
  ctx.fillText("Cérémonie MMI", w / 2, Math.round(44 * s));

  const sepW = Math.round(32 * s);
  ctx.fillStyle = GOLD;
  ctx.fillRect(w / 2 - sepW / 2, Math.round(52 * s), sepW, Math.max(1, Math.round(1 * s)));

  // Bottom text
  const botBase = h - Math.round(44 * s);
  ctx.fillStyle = GOLD;
  ctx.fillRect(w / 2 - sepW / 2, botBase, sepW, Math.max(1, Math.round(1 * s)));

  ctx.fillStyle = GOLD;
  ctx.font = `italic ${Math.round(14 * s)}px Georgia, serif`;
  ctx.fillText("Promotion 2022 / 2025", w / 2, botBase + Math.round(20 * s));

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `${Math.round(8 * s)}px Arial, sans-serif`;
  ctx.fillText("MÉTIERS DU MULTIMÉDIA & DE L'INTERNET", w / 2, botBase + Math.round(34 * s));

  // Logo bottom-left
  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    const logoH = Math.round(16 * s);
    const logoW = Math.round(logoImg.width * (logoH / logoImg.height));
    try {
      ctx.globalAlpha = 0.85;
      ctx.filter = "brightness(0) invert(1)";
      ctx.drawImage(logoImg, Math.round(12 * s), h - logoH - Math.round(14 * s), logoW, logoH);
    } finally {
      ctx.globalAlpha = 1;
      ctx.filter = "none";
    }
  }

  // Corner ornaments
  const ornSize = Math.round(22 * s);
  const ornOff = Math.round(8 * s);
  const ornTopY = Math.round(58 * s);
  const ornBotY = h - Math.round(58 * s);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(1, 1.5 * s);

  ctx.beginPath();
  ctx.moveTo(ornOff, ornTopY + ornSize); ctx.lineTo(ornOff, ornTopY); ctx.lineTo(ornOff + ornSize, ornTopY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w - ornOff - ornSize, ornTopY); ctx.lineTo(w - ornOff, ornTopY); ctx.lineTo(w - ornOff, ornTopY + ornSize);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ornOff, ornBotY - ornSize); ctx.lineTo(ornOff, ornBotY); ctx.lineTo(ornOff + ornSize, ornBotY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w - ornOff - ornSize, ornBotY); ctx.lineTo(w - ornOff, ornBotY); ctx.lineTo(w - ornOff, ornBotY - ornSize);
  ctx.stroke();
}

const PhotoBoothCanvas = ({ onCapture, onCancel }) => {
  const videoRef = useRef(null);
  const logoRef = useRef(null);
  const streamRef = useRef(null);
  const [phase, setPhase] = useState("idle");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0); // 0 = no timer, 3, or 10
  const [countdown, setCountdown] = useState(null);     // null or remaining seconds
  const countdownRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { logoRef.current = img; };
    img.src = "/logouge.png";
  }, []);

  // Close the enlarged popup with the Escape key
  useEffect(() => {
    if (!isEnlarged) return;
    const onKey = (e) => { if (e.key === "Escape") setIsEnlarged(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isEnlarged]);

  // Clear any running countdown on unmount
  useEffect(() => () => clearInterval(countdownRef.current), []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => () => stopStream(), []);

  // Wire stream to video AFTER the <video> element mounts (phase "live").
  // Re-runs when toggling the enlarged popup, since the <video> remounts then.
  useEffect(() => {
    if (phase === "live" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [phase, isEnlarged]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
      });
      streamRef.current = stream;
      setPhase("live"); // mounts <video>, then useEffect above wires the stream
    } catch {
      alert("Impossible d'accéder à la caméra.");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const { sx, sy, sw, sh, outW, outH } = cropToPortrait(video.videoWidth, video.videoHeight);

    // Raw photo — mirrored + cropped to portrait
    const rawCanvas = document.createElement("canvas");
    rawCanvas.width = outW;
    rawCanvas.height = outH;
    const rawCtx = rawCanvas.getContext("2d");
    rawCtx.save();
    rawCtx.translate(outW, 0);
    rawCtx.scale(-1, 1);
    rawCtx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);
    rawCtx.restore();

    // Photo with template — same crop + overlay
    const tplCanvas = document.createElement("canvas");
    tplCanvas.width = outW;
    tplCanvas.height = outH;
    const tplCtx = tplCanvas.getContext("2d");
    tplCtx.save();
    tplCtx.translate(outW, 0);
    tplCtx.scale(-1, 1);
    tplCtx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);
    tplCtx.restore();
    drawTemplate(tplCtx, outW, outH, logoRef.current);

    stopStream();
    setIsEnlarged(false);
    setPreviewUrl(tplCanvas.toDataURL("image/jpeg", 0.92));
    setPhase("captured");

    rawCanvas.toBlob(
      (rawBlob) => {
        tplCanvas.toBlob(
          (tplBlob) => {
            onCapture(rawBlob, tplBlob);
            rawCanvas.width = 0;
            tplCanvas.width = 0;
          },
          "image/jpeg", 0.92
        );
      },
      "image/jpeg", 0.92
    );
  };

  // Capture button → start countdown if a timer is set, else capture now
  const handleShutter = () => {
    if (countdown !== null) return; // already counting
    if (timerSeconds <= 0) {
      capture();
      return;
    }
    let n = timerSeconds;
    setCountdown(n);
    countdownRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(countdownRef.current);
        setCountdown(null);
        capture();
      } else {
        setCountdown(n);
      }
    }, 1000);
  };

  const retake = () => {
    setPreviewUrl(null);
    setPhase("idle");
    onCapture(null, null);
  };

  const handleCancel = () => {
    clearInterval(countdownRef.current);
    setCountdown(null);
    stopStream();
    setIsEnlarged(false);
    setPhase("idle");
    setPreviewUrl(null);
    onCancel?.();
  };

  return (
    <div className="space-y-3">
      {phase === "idle" && (
        <button
          type="button"
          onClick={startCamera}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#071341] transition-colors"
        >
          <Camera className="h-4 w-4" />
          Ajouter une photo souvenir
        </button>
      )}

      {phase === "live" && (() => {
        const booth = (
        <div
          className="relative rounded-lg overflow-hidden bg-black mx-auto shadow-2xl"
          style={isEnlarged
            ? { aspectRatio: "3/4", height: "80vh", maxWidth: "95vw" }
            : { aspectRatio: "3/4", maxWidth: "400px" }}
        >
          {/* Enlarge / shrink toggle */}
          <button
            type="button"
            onClick={() => setIsEnlarged((v) => !v)}
            aria-label={isEnlarged ? "Réduire" : "Agrandir"}
            className="absolute top-3 right-3 z-30 bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-colors cursor-pointer"
            style={{ minWidth: 40, minHeight: 40 }}
          >
            {isEnlarged ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>

          {/* CSS template overlay — visual preview only */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div
              className="absolute inset-x-0 top-0"
              style={{ height: "30%", background: `linear-gradient(to bottom, ${NAVY_95}, ${NAVY_72} 55%, ${NAVY_0})` }}
            >
              <div className="pt-3 text-center">
                <p className="text-white/65 text-[9px] tracking-[3px] uppercase font-sans">IUT DE MEAUX</p>
                <p className="text-white italic text-sm font-serif mt-1">Cérémonie MMI</p>
                <div className="w-8 h-px bg-[#B8AB38] mx-auto mt-1.5" />
              </div>
            </div>
            <div
              className="absolute inset-x-0 bottom-0"
              style={{ height: "30%", background: `linear-gradient(to top, ${NAVY_95}, ${NAVY_72} 55%, ${NAVY_0})` }}
            >
              <div className="absolute bottom-3 inset-x-0 text-center">
                <div className="w-8 h-px bg-[#B8AB38] mx-auto mb-1.5" />
                <p className="text-[#B8AB38] italic text-sm font-serif">Promotion 2022 / 2025</p>
                <p className="text-white/50 text-[8px] tracking-[2px] uppercase font-sans mt-1">
                  Métiers du Multimédia & de l&apos;Internet
                </p>
              </div>
            </div>
            <img src="/logouge.png" alt="UGE" className="absolute bottom-3 left-3 h-4 brightness-0 invert opacity-85" />
            <div className="absolute top-14.5 left-2 w-5 h-5 border-t border-l border-[#B8AB38]" />
            <div className="absolute top-14.5 right-2 w-5 h-5 border-t border-r border-[#B8AB38]" />
            <div className="absolute bottom-14.5 left-2 w-5 h-5 border-b border-l border-[#B8AB38]" />
            <div className="absolute bottom-14.5 right-2 w-5 h-5 border-b border-r border-[#B8AB38]" />
          </div>

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />

          {/* Countdown overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 pointer-events-none">
              <span className="text-white font-serif drop-shadow-lg" style={{ fontSize: "min(40vh, 160px)", lineHeight: 1 }}>
                {countdown}
              </span>
            </div>
          )}

          {/* Timer selector */}
          <div className="absolute top-3 left-3 z-30 flex gap-1.5">
            {[{ v: 0, label: "0s" }, { v: 3, label: "3s" }, { v: 10, label: "10s" }].map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setTimerSeconds(opt.v)}
                disabled={countdown !== null}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  timerSeconds === opt.v
                    ? "bg-[#B8AB38] text-[#071341]"
                    : "bg-black/50 text-white hover:bg-black/80"
                }`}
              >
                {opt.v === 0 ? "Sans" : opt.label}
              </button>
            ))}
          </div>

          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 z-20">
            <button
              type="button"
              onClick={handleShutter}
              disabled={countdown !== null}
              aria-label="Prendre la photo"
              className="bg-white text-black p-3 rounded-full hover:scale-110 transition-transform shadow-lg disabled:opacity-50 cursor-pointer"
              style={{ minWidth: 48, minHeight: 48 }}
            >
              <Camera className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Annuler"
              className="bg-red-500 text-white p-3 rounded-full hover:scale-110 transition-transform shadow-lg cursor-pointer"
              style={{ minWidth: 48, minHeight: 48 }}
            >
              <Trash2 className="h-6 w-6" />
            </button>
          </div>
        </div>
        );
        return isEnlarged
          ? createPortal(
              <div className="fixed inset-0 z-200 bg-[#071341]/90 backdrop-blur-md flex items-center justify-center p-4">
                {booth}
              </div>,
              document.body
            )
          : booth;
      })()}

      {phase === "captured" && previewUrl && (
        <div className="relative w-full mx-auto mt-2 group" style={{ aspectRatio: "3/4", maxWidth: "400px" }}>
          <img
            src={previewUrl}
            alt="Photo avec template"
            className="w-full h-full object-cover rounded-lg border border-gray-200 shadow-md"
          />
          <button
            type="button"
            onClick={retake}
            aria-label="Reprendre la photo"
            className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PhotoBoothCanvas;

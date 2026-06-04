import { useEffect, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";

const GOLD = "#B8AB38";
const NAVY_95 = "rgba(7,19,65,0.95)";
const NAVY_72 = "rgba(7,19,65,0.72)";
const NAVY_0 = "rgba(7,19,65,0)";

function drawTemplate(ctx, w, h, logoImg) {
  // Top gradient
  const topGrad = ctx.createLinearGradient(0, 0, 0, h * 0.42);
  topGrad.addColorStop(0, NAVY_95);
  topGrad.addColorStop(0.55, NAVY_72);
  topGrad.addColorStop(1, NAVY_0);
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, w, h * 0.42);

  // Bottom gradient
  const botGrad = ctx.createLinearGradient(0, h, 0, h * 0.58);
  botGrad.addColorStop(0, NAVY_95);
  botGrad.addColorStop(0.55, NAVY_72);
  botGrad.addColorStop(1, NAVY_0);
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, h * 0.58, w, h * 0.42);

  const s = w / 480; // scale factor based on 480px design width

  // Top text
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = `${Math.round(9 * s)}px Arial, sans-serif`;
  ctx.fillText("IUT DE MEAUX", w / 2, Math.round(22 * s));

  ctx.fillStyle = "white";
  ctx.font = `italic ${Math.round(13 * s)}px Georgia, serif`;
  ctx.fillText("Cérémonie MMI", w / 2, Math.round(40 * s));

  // Top separator
  const sepW = Math.round(30 * s);
  ctx.fillStyle = GOLD;
  ctx.fillRect(w / 2 - sepW / 2, Math.round(47 * s), sepW, Math.max(1, Math.round(1 * s)));

  // Bottom text
  const botBase = h - Math.round(42 * s);

  // Bottom separator
  ctx.fillStyle = GOLD;
  ctx.fillRect(w / 2 - sepW / 2, botBase, sepW, Math.max(1, Math.round(1 * s)));

  ctx.fillStyle = GOLD;
  ctx.font = `italic ${Math.round(13 * s)}px Georgia, serif`;
  ctx.fillText("Promotion 2022 / 2025", w / 2, botBase + Math.round(18 * s));

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `${Math.round(8 * s)}px Arial, sans-serif`;
  ctx.fillText("MÉTIERS DU MULTIMÉDIA & DE L'INTERNET", w / 2, botBase + Math.round(32 * s));

  // Logo bottom-left
  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    const logoH = Math.round(16 * s);
    const logoW = Math.round(logoImg.width * (logoH / logoImg.height));
    ctx.globalAlpha = 0.85;
    ctx.filter = "brightness(0) invert(1)";
    ctx.drawImage(logoImg, Math.round(12 * s), h - logoH - Math.round(14 * s), logoW, logoH);
    ctx.globalAlpha = 1;
    ctx.filter = "none";
  }

  // Corner ornaments
  const ornSize = Math.round(22 * s);
  const ornOff = Math.round(8 * s);
  const ornTopY = Math.round(54 * s);
  const ornBotY = h - Math.round(54 * s);
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
  const [phase, setPhase] = useState("idle"); // idle | live | captured
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    const img = new Image();
    img.src = "/logouge.png";
    logoRef.current = img;
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => stopStream(), []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPhase("live");
    } catch {
      alert("Impossible d'accéder à la caméra.");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const W = video.videoWidth;
    const H = video.videoHeight;

    // Raw photo (mirrored — matches what user saw live)
    const rawCanvas = document.createElement("canvas");
    rawCanvas.width = W;
    rawCanvas.height = H;
    const rawCtx = rawCanvas.getContext("2d");
    rawCtx.translate(W, 0);
    rawCtx.scale(-1, 1);
    rawCtx.drawImage(video, 0, 0, W, H);

    // Photo with template
    const tplCanvas = document.createElement("canvas");
    tplCanvas.width = W;
    tplCanvas.height = H;
    const tplCtx = tplCanvas.getContext("2d");
    tplCtx.translate(W, 0);
    tplCtx.scale(-1, 1);
    tplCtx.drawImage(video, 0, 0, W, H);
    tplCtx.setTransform(1, 0, 0, 1, 0, 0); // reset before drawing overlay
    drawTemplate(tplCtx, W, H, logoRef.current);

    stopStream();
    setPreviewUrl(tplCanvas.toDataURL("image/jpeg", 0.92));
    setPhase("captured");

    rawCanvas.toBlob(
      (rawBlob) => {
        tplCanvas.toBlob(
          (tplBlob) => onCapture(rawBlob, tplBlob),
          "image/jpeg",
          0.92
        );
      },
      "image/jpeg",
      0.92
    );
  };

  const retake = () => {
    setPreviewUrl(null);
    setPhase("idle");
    onCapture(null, null);
  };

  const handleCancel = () => {
    stopStream();
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

      {phase === "live" && (
        <div
          className="relative rounded-lg overflow-hidden bg-black"
          style={{ aspectRatio: "4/3" }}
        >
          {/* CSS template overlay — visual preview only, not used for canvas composition */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Top gradient */}
            <div
              className="absolute inset-x-0 top-0"
              style={{
                height: "42%",
                background: `linear-gradient(to bottom, ${NAVY_95}, ${NAVY_72} 55%, ${NAVY_0})`,
              }}
            >
              <div className="pt-3 text-center">
                <p className="text-white/65 text-[9px] tracking-[3px] uppercase font-sans">
                  IUT DE MEAUX
                </p>
                <p className="text-white italic text-sm font-serif mt-1">
                  Cérémonie MMI
                </p>
                <div className="w-8 h-px bg-[#B8AB38] mx-auto mt-1.5" />
              </div>
            </div>

            {/* Bottom gradient */}
            <div
              className="absolute inset-x-0 bottom-0"
              style={{
                height: "42%",
                background: `linear-gradient(to top, ${NAVY_95}, ${NAVY_72} 55%, ${NAVY_0})`,
              }}
            >
              <div className="absolute bottom-3 inset-x-0 text-center">
                <div className="w-8 h-px bg-[#B8AB38] mx-auto mb-1.5" />
                <p className="text-[#B8AB38] italic text-sm font-serif">
                  Promotion 2022 / 2025
                </p>
                <p className="text-white/50 text-[8px] tracking-[2px] uppercase font-sans mt-1">
                  Métiers du Multimédia & de l&apos;Internet
                </p>
              </div>
            </div>

            {/* Logo bottom-left */}
            <img
              src="/logouge.png"
              alt="UGE"
              className="absolute bottom-3 left-3 h-4 brightness-0 invert opacity-85"
            />

            {/* Corner ornaments */}
            <div className="absolute top-[54px] left-2 w-5 h-5 border-t border-l border-[#B8AB38]" />
            <div className="absolute top-[54px] right-2 w-5 h-5 border-t border-r border-[#B8AB38]" />
            <div className="absolute bottom-[54px] left-2 w-5 h-5 border-b border-l border-[#B8AB38]" />
            <div className="absolute bottom-[54px] right-2 w-5 h-5 border-b border-r border-[#B8AB38]" />
          </div>

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />

          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 z-20">
            <button
              type="button"
              onClick={capture}
              className="bg-white text-black p-3 rounded-full hover:scale-110 transition-transform shadow-lg"
              style={{ minWidth: 48, minHeight: 48 }}
            >
              <Camera className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="bg-red-500 text-white p-3 rounded-full hover:scale-110 transition-transform shadow-lg"
              style={{ minWidth: 48, minHeight: 48 }}
            >
              <Trash2 className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {phase === "captured" && previewUrl && (
        <div className="relative w-32 h-32 mt-2 group">
          <img
            src={previewUrl}
            alt="Photo avec template"
            className="w-full h-full object-cover rounded-lg border border-gray-200"
          />
          <button
            type="button"
            onClick={retake}
            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PhotoBoothCanvas;

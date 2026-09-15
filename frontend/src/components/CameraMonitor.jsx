import { useCallback, useEffect, useRef, useState } from "react";

function CameraMonitor({ enabled = true, autoStart = true }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStatus("idle");
  }, []);

  const startCamera = useCallback(async () => {
    if (!enabled) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is not supported by this browser.");
      setStatus("error");
      return;
    }

    try {
      setError("");
      setStatus("requesting");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus("active");
    } catch (err) {
      console.error("Camera access error:", err);

      let message = "Unable to access your camera.";

      if (err?.name === "NotAllowedError") {
        message =
          "Camera permission was denied. Allow camera access in your browser settings.";
      } else if (err?.name === "NotFoundError") {
        message = "No camera was found on this device.";
      } else if (err?.name === "NotReadableError") {
        message = "Your camera is already being used by another application.";
      } else if (err?.name === "SecurityError") {
        message = "Camera access is blocked by the browser security policy.";
      }

      setError(message);
      setStatus("error");
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      stopCamera();
      return undefined;
    }

    if (autoStart) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [enabled, autoStart, startCamera, stopCamera]);

  const isActive = status === "active";
  const isRequesting = status === "requesting";

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a1019]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
              isActive
                ? "border-emerald-500/15 bg-emerald-500/[0.07] text-emerald-300"
                : "border-white/[0.07] bg-white/[0.025] text-slate-500"
            }`}
          >
            ◉
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              Camera
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-300">
              {isActive
                ? "Camera active"
                : isRequesting
                  ? "Requesting access..."
                  : status === "error"
                    ? "Camera unavailable"
                    : "Camera off"}
            </p>
          </div>
        </div>

        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-medium ${
            isActive
              ? "border-emerald-500/15 bg-emerald-500/[0.06] text-emerald-400"
              : status === "error"
                ? "border-rose-500/15 bg-rose-500/[0.06] text-rose-400"
                : "border-white/[0.07] bg-white/[0.025] text-slate-600"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isActive
                ? "bg-emerald-400"
                : status === "error"
                  ? "bg-rose-400"
                  : "bg-slate-600"
            }`}
          />
          {isActive ? "Live" : status === "error" ? "Error" : "Off"}
        </span>
      </div>

      <div className="relative aspect-video min-h-[170px] overflow-hidden bg-[#050811]">
        {isActive ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-5 text-center">
            <div className="max-w-[220px]">
              <div
                className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border text-lg ${
                  status === "error"
                    ? "border-rose-500/15 bg-rose-500/[0.06] text-rose-300"
                    : "border-white/[0.08] bg-white/[0.03] text-slate-500"
                }`}
              >
                {isRequesting ? "◌" : "◉"}
              </div>

              <p className="mt-3 text-xs font-medium text-slate-400">
                {isRequesting
                  ? "Waiting for camera permission"
                  : status === "error"
                    ? "Camera could not be started"
                    : "Camera preview is off"}
              </p>

              <p className="mt-1.5 text-[10px] leading-5 text-slate-600">
                {error ||
                  "Your camera preview will appear here during the live interview."}
              </p>
            </div>
          </div>
        )}

        {isActive && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent px-3 pb-3 pt-8">
            <span className="flex items-center gap-1.5 text-[9px] font-medium text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Camera active
            </span>

            <span className="rounded-md bg-black/35 px-2 py-1 text-[9px] text-white/60 backdrop-blur-sm">
              Preview only
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.05] px-4 py-3">
        {isActive ? (
          <button
            type="button"
            onClick={stopCamera}
            className="w-full rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-[11px] font-medium text-slate-500 transition hover:border-rose-400/15 hover:bg-rose-400/[0.04] hover:text-rose-300"
          >
            Turn off camera
          </button>
        ) : (
          <button
            type="button"
            onClick={startCamera}
            disabled={isRequesting}
            className="w-full rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] px-3 py-2.5 text-[11px] font-medium text-cyan-300 transition hover:border-cyan-400/25 hover:bg-cyan-400/[0.09] disabled:cursor-wait disabled:opacity-50"
          >
            {isRequesting ? "Requesting camera..." : "Enable camera"}
          </button>
        )}
      </div>
    </section>
  );
}

export default CameraMonitor;

import { useCallback, useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const VISION_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const EMPTY_METRICS = {
  observed_seconds: 0,
  face_present_seconds: 0,
  face_presence_ratio: 0,
  no_face_events: 0,
  no_face_duration_seconds: 0,
  multiple_face_events: 0,
  multiple_face_duration_seconds: 0,
  off_center_events: 0,
  off_center_duration_seconds: 0,
  looking_away_events: 0,
  looking_away_duration_seconds: 0,
  samples: 0,
};

function getFaceObservation(landmarks) {
  if (!landmarks?.length) {
    return {
      faceCount: 0,
      facePresent: false,
      multipleFaces: false,
      offCenter: false,
      lookingAway: false,
      boundingBox: null,
    };
  }

  const primary = landmarks[0];
  const xs = primary.map((point) => Number(point.x || 0));
  const ys = primary.map((point) => Number(point.y || 0));

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const faceWidth = maxX - minX;
  const faceHeight = maxY - minY;
  const offCenter =
    Math.abs(centerX - 0.5) > 0.28 ||
    Math.abs(centerY - 0.5) > 0.30 ||
    faceWidth < 0.14 ||
    faceHeight < 0.18;

  const leftEye = primary[33];
  const rightEye = primary[263];
  const nose = primary[1];
  const forehead = primary[10];
  const chin = primary[152];

  let lookingAway = false;
  if (leftEye && rightEye && nose && forehead && chin) {
    const eyeMidX = (leftEye.x + rightEye.x) / 2;
    const eyeDistance = Math.max(Math.abs(rightEye.x - leftEye.x), 0.001);
    const yawSignal = Math.abs(nose.x - eyeMidX) / eyeDistance;

    const faceHeightFromLandmarks = Math.max(chin.y - forehead.y, 0.001);
    const eyeMidY = (leftEye.y + rightEye.y) / 2;
    const pitchSignal = Math.abs(nose.y - eyeMidY) / faceHeightFromLandmarks;

    lookingAway = yawSignal > 0.34 || pitchSignal > 0.31;
  }

  return {
    faceCount: landmarks.length,
    facePresent: true,
    multipleFaces: landmarks.length > 1,
    offCenter,
    lookingAway,
    boundingBox: {
      x: minX,
      y: minY,
      width: faceWidth,
      height: faceHeight,
    },
  };
}

function CameraMonitor({
  enabled = true,
  autoStart = true,
  onMetricsChange,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastDetectionAtRef = useRef(0);
  const lastEmitAtRef = useRef(0);
  const metricsRef = useRef({
    ...EMPTY_METRICS,
    lastSampleAt: null,
    previous: {
      facePresent: false,
      multipleFaces: false,
      offCenter: false,
      lookingAway: false,
    },
  });
  const detectionStartedRef = useRef(false);
  const onMetricsChangeRef = useRef(onMetricsChange);

  useEffect(() => {
    onMetricsChangeRef.current = onMetricsChange;
  }, [onMetricsChange]);

  const [status, setStatus] = useState("idle");
  const [detectionStatus, setDetectionStatus] = useState("loading");
  const [error, setError] = useState("");
  const [observationText, setObservationText] = useState("Preparing face detection...");
  const [faceBox, setFaceBox] = useState(null);

  const emitMetrics = useCallback(() => {
    const current = metricsRef.current;
    const observed = Math.max(0, current.observed_seconds);
    const snapshot = {
      observed_seconds: Number(observed.toFixed(2)),
      face_present_seconds: Number(current.face_present_seconds.toFixed(2)),
      face_presence_ratio:
        observed > 0
          ? Number(((current.face_present_seconds / observed) * 100).toFixed(2))
          : 0,
      no_face_events: current.no_face_events,
      no_face_duration_seconds: Number(current.no_face_duration_seconds.toFixed(2)),
      multiple_face_events: current.multiple_face_events,
      multiple_face_duration_seconds: Number(
        current.multiple_face_duration_seconds.toFixed(2),
      ),
      off_center_events: current.off_center_events,
      off_center_duration_seconds: Number(current.off_center_duration_seconds.toFixed(2)),
      looking_away_events: current.looking_away_events,
      looking_away_duration_seconds: Number(
        current.looking_away_duration_seconds.toFixed(2),
      ),
      samples: current.samples,
    };

    onMetricsChangeRef.current?.(snapshot);
  }, []);

  const stopDetection = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (landmarkerRef.current) {
      try {
        landmarkerRef.current.close();
      } catch {
        // Best effort cleanup...
      }
      landmarkerRef.current = null;
    }

    detectionStartedRef.current = false;
  }, []);

  const runDetection = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !landmarker || video.readyState < 2 || video.paused || video.ended) {
      if (enabled && detectionStartedRef.current) {
        animationFrameRef.current = requestAnimationFrame(runDetection);
      }
      return;
    }

    const now = performance.now();
    if (now - lastDetectionAtRef.current >= 200) {
      lastDetectionAtRef.current = now;

      try {
        const result = landmarker.detectForVideo(video, Math.round(now));
        const faces = result?.faceLandmarks || [];
        const observation = getFaceObservation(faces);
        setFaceBox(observation.boundingBox);
        const current = metricsRef.current;
        const nowSeconds = Date.now() / 1000;

        if (current.lastSampleAt !== null) {
          const delta = Math.min(Math.max(nowSeconds - current.lastSampleAt, 0), 1);
          current.observed_seconds += delta;
          if (observation.facePresent) current.face_present_seconds += delta;
          if (!observation.facePresent) current.no_face_duration_seconds += delta;
          if (observation.multipleFaces) {
            current.multiple_face_duration_seconds += delta;
          }
          if (observation.offCenter) current.off_center_duration_seconds += delta;
          if (observation.lookingAway) current.looking_away_duration_seconds += delta;
        }

        const previous = current.previous;
        if (!observation.facePresent && previous.facePresent) current.no_face_events += 1;
        if (observation.multipleFaces && !previous.multipleFaces) {
          current.multiple_face_events += 1;
        }
        if (observation.offCenter && !previous.offCenter) current.off_center_events += 1;
        if (observation.lookingAway && !previous.lookingAway) {
          current.looking_away_events += 1;
        }

        current.previous = {
          facePresent: observation.facePresent,
          multipleFaces: observation.multipleFaces,
          offCenter: observation.offCenter,
          lookingAway: observation.lookingAway,
        };
        current.lastSampleAt = nowSeconds;
        current.samples += 1;

        if (!observation.facePresent) {
          setDetectionStatus("no_face");
          setObservationText("No face detected — please stay within the camera frame.");
        } else if (observation.multipleFaces) {
          setDetectionStatus("multiple_faces");
          setObservationText("More than one face is visible in the camera frame.");
        } else if (observation.offCenter) {
          setDetectionStatus("adjust");
          setObservationText("Face detected — adjust your position slightly.");
        } else if (observation.lookingAway) {
          setDetectionStatus("looking_away");
          setObservationText("Face detected — camera view is clear.");
        } else {
          setDetectionStatus("detected");
          setObservationText("Face detected — camera view is clear.");
        }

        if (nowSeconds - lastEmitAtRef.current >= 1) {
          lastEmitAtRef.current = nowSeconds;
          emitMetrics();
        }
      } catch (err) {
        console.error("Face detection error:", err);
        setDetectionStatus("error");
        setObservationText("Face detection is temporarily unavailable.");
      }
    }

    if (enabled && detectionStartedRef.current) {
      animationFrameRef.current = requestAnimationFrame(runDetection);
    }
  }, [enabled, emitMetrics]);

  const startDetection = useCallback(async () => {
    if (!enabled || detectionStartedRef.current || !videoRef.current) return;

    try {
      setDetectionStatus("loading");
      setObservationText("Loading computer vision model...");

      const vision = await FilesetResolver.forVisionTasks(VISION_WASM_URL);
      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_MODEL_URL,
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numFaces: 2,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      if (!videoRef.current || !enabled) {
        landmarker.close();
        return;
      }

      landmarkerRef.current = landmarker;
      detectionStartedRef.current = true;
      setDetectionStatus("detected");
      setObservationText("Face detection is active.");
      animationFrameRef.current = requestAnimationFrame(runDetection);
    } catch (err) {
      console.error("Face detection initialization error:", err);
      setDetectionStatus("error");
      setObservationText("Camera is active, but face detection could not be loaded.");
    }
  }, [enabled, runDetection]);

  const stopCamera = useCallback(() => {
    stopDetection();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStatus("idle");
    setDetectionStatus("loading");
    setObservationText("Camera preview is off.");
    setFaceBox(null);
  }, [stopDetection]);

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
      await startDetection();
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
  }, [enabled, startDetection]);

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
  const detectionActive =
    detectionStatus === "detected" ||
    detectionStatus === "adjust" ||
    detectionStatus === "looking_away" ||
    detectionStatus === "no_face" ||
    detectionStatus === "multiple_faces";

  const detectionLabel =
    detectionStatus === "detected"
      ? "Face detected"
      : detectionStatus === "no_face"
        ? "Face not detected"
        : detectionStatus === "multiple_faces"
          ? "Multiple faces"
          : detectionStatus === "adjust"
            ? "Adjust position"
            : detectionStatus === "looking_away"
              ? "Face detected"
              : detectionStatus === "error"
                ? "Detection unavailable"
                : "Starting detection...";

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
                ? detectionActive
                  ? "Camera + face detection active"
                  : "Camera active"
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
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />

            {faceBox && (
              <div
                className="pointer-events-none absolute rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]"
                style={{
                  left: `${Math.max(0, Math.min(100, (1 - (faceBox.x + faceBox.width)) * 100))}%`,
                  top: `${Math.max(0, Math.min(100, faceBox.y * 100))}%`,
                  width: `${Math.max(4, Math.min(100, faceBox.width * 100))}%`,
                  height: `${Math.max(8, Math.min(100, faceBox.height * 100))}%`,
                }}
              />
            )}
          </>
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
                {error || "Your camera preview will appear here during the live interview."}
              </p>
            </div>
          </div>
        )}

        {isActive && (
          <>
            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-2.5 py-1.5 backdrop-blur-sm">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  detectionStatus === "no_face" || detectionStatus === "error"
                    ? "bg-rose-400"
                    : detectionStatus === "multiple_faces" || detectionStatus === "adjust"
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                }`}
              />
              <span className="text-[9px] font-medium text-white/80">
                {detectionLabel}
              </span>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-10">
              <div className="flex items-end justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[9px] font-medium text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Camera active
                </span>
                <span className="max-w-[72%] text-right text-[9px] leading-4 text-white/65">
                  {observationText}
                </span>
              </div>
            </div>
          </>
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

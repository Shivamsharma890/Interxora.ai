// import { useCallback, useEffect, useRef, useState } from "react";

// const FILLER_PATTERNS = [
//   /\bum+\b/gi,
//   /\buh+\b/gi,
//   /\ber+\b/gi,
//   /\bah+\b/gi,
//   /\bhmm+\b/gi,
//   /\byou know\b/gi,
//   /\bi mean\b/gi,
//   /\bkind of\b/gi,
//   /\bsort of\b/gi,
//   /\bbasically\b/gi,
//   /\blike\b/gi,
// ];

// function countWords(text = "") {
//   const normalized = text.trim();

//   if (!normalized) {
//     return 0;
//   }

//   return normalized.split(/\s+/).filter(Boolean).length;
// }

// function countFillerWords(text = "") {
//   return FILLER_PATTERNS.reduce((total, pattern) => {
//     const matches = text.match(pattern);
//     return total + (matches ? matches.length : 0);
//   }, 0);
// }

// function calculateWpm(wordCount, durationSeconds) {
//   if (!wordCount || durationSeconds < 1) {
//     return 0;
//   }

//   return Math.round((wordCount / durationSeconds) * 60);
// }

// function formatDuration(totalSeconds) {
//   const seconds = Math.max(0, Math.floor(totalSeconds));
//   const minutes = Math.floor(seconds / 60);
//   const remainingSeconds = seconds % 60;

//   return `${String(minutes).padStart(2, "0")}:${String(
//     remainingSeconds,
//   ).padStart(2, "0")}`;
// }

// function SpeechInput({
//   value,
//   onChange,
//   onSpeechMetrics,
//   language = "en-US",
//   disabled = false,
// }) {
//   const recognitionRef = useRef(null);
//   const isListeningRef = useRef(false);
//   const valueRef = useRef(value || "");
//   const onChangeRef = useRef(onChange);
//   const onSpeechMetricsRef = useRef(onSpeechMetrics);
//   const elapsedSecondsRef = useRef(0);
//   const manuallyStoppedRef = useRef(false);

//   const finalTranscriptRef = useRef("");
//   const listeningStartedAtRef = useRef(null);
//   const lastSpeechAtRef = useRef(null);
//   const totalPauseSecondsRef = useRef(0);
//   const pauseStartedAtRef = useRef(null);

//   const [isListening, setIsListening] = useState(false);
//   const [supported, setSupported] = useState(true);
//   const [errorMessage, setErrorMessage] = useState("");
//   const [elapsedSeconds, setElapsedSeconds] = useState(0);

//   useEffect(() => {
//     valueRef.current = value || "";
//     onChangeRef.current = onChange;
//     onSpeechMetricsRef.current = onSpeechMetrics;
//   }, [value, onChange, onSpeechMetrics]);

//   const buildMetrics = useCallback(
//     (transcript = value || "") => {
//       const wordCount = countWords(transcript);
//       const durationSeconds = listeningStartedAtRef.current
//         ? Math.max(
//             0,
//             Math.floor(
//               (Date.now() - listeningStartedAtRef.current) / 1000,
//             ),
//           )
//         : elapsedSecondsRef.current;

//       const totalPauseSeconds =
//         totalPauseSecondsRef.current +
//         (pauseStartedAtRef.current
//           ? Math.max(0, (Date.now() - pauseStartedAtRef.current) / 1000)
//           : 0);

//       return {
//         speakingDurationSeconds: durationSeconds,
//         responseDurationSeconds: durationSeconds,
//         wordCount,
//         wpm: calculateWpm(wordCount, durationSeconds),
//         pauseDurationSeconds: Math.round(totalPauseSeconds),
//         fillerWordCount: countFillerWords(transcript),
//       };
//     },
//     [] ,
//   );

//   const publishMetrics = useCallback(
//     (transcript = valueRef.current) => {
//       if (typeof onSpeechMetricsRef.current === "function") {
//         onSpeechMetricsRef.current(buildMetrics(transcript));
//       }
//     },
//     [buildMetrics],
//   );

//   useEffect(() => {
//     const SpeechRecognition =
//       window.SpeechRecognition || window.webkitSpeechRecognition;

//     if (!SpeechRecognition) {
//       setSupported(false);
//       return undefined;
//     }

//     const recognition = new SpeechRecognition();

//     recognition.continuous = true;
//     recognition.interimResults = true;
//     recognition.lang = language;

//     recognition.onstart = () => {
//       isListeningRef.current = true;
//       setIsListening(true);
//       setErrorMessage("");

//       const now = Date.now();

//       if (!listeningStartedAtRef.current) {
//         listeningStartedAtRef.current = now;
//       }

//       lastSpeechAtRef.current = now;

//       if (pauseStartedAtRef.current) {
//         totalPauseSecondsRef.current +=
//           (now - pauseStartedAtRef.current) / 1000;
//         pauseStartedAtRef.current = null;
//       }
//     };

//     recognition.onresult = (event) => {
//       let finalTranscript = finalTranscriptRef.current;
//       let interimTranscript = "";

//       for (let i = event.resultIndex; i < event.results.length; i += 1) {
//         const transcript = event.results[i][0].transcript;

//         if (event.results[i].isFinal) {
//           finalTranscript += `${transcript} `;
//         } else {
//           interimTranscript += transcript;
//         }
//       }

//       finalTranscriptRef.current = finalTranscript;

//       const combinedTranscript =
//         `${finalTranscript}${interimTranscript}`.trim();

//       lastSpeechAtRef.current = Date.now();

//       if (pauseStartedAtRef.current) {
//         totalPauseSecondsRef.current +=
//           (Date.now() - pauseStartedAtRef.current) / 1000;
//         pauseStartedAtRef.current = null;
//       }

//       valueRef.current = combinedTranscript;
//       onChangeRef.current(combinedTranscript);
//       publishMetrics(combinedTranscript);
//     };

//     recognition.onspeechend = () => {
//       if (
//         isListeningRef.current &&
//         !pauseStartedAtRef.current &&
//         lastSpeechAtRef.current
//       ) {
//         pauseStartedAtRef.current = Date.now();
//       }
//     };

//     recognition.onerror = (event) => {
//       console.error("Speech recognition error:", event.error);

//       if (event.error === "not-allowed" || event.error === "service-not-allowed") {
//         setErrorMessage(
//           "Microphone permission was denied. Allow microphone access in your browser settings.",
//         );
//       } else if (event.error === "no-speech") {
//         setErrorMessage("No speech detected. Try speaking again.");
//       } else if (event.error === "audio-capture") {
//         setErrorMessage(
//           "No microphone was detected. Check that your microphone is connected.",
//         );
//       } else if (event.error === "network") {
//         setErrorMessage(
//           "Speech recognition could not connect to the browser speech service.",
//         );
//       } else {
//         setErrorMessage("Speech recognition stopped unexpectedly.");
//       }

//       isListeningRef.current = false;
//       setIsListening(false);
//     };

//     recognition.onend = () => {
//       isListeningRef.current = false;
//       setIsListening(false);

//       if (pauseStartedAtRef.current) {
//         totalPauseSecondsRef.current +=
//           (Date.now() - pauseStartedAtRef.current) / 1000;
//         pauseStartedAtRef.current = null;
//       }

//       const transcript = finalTranscriptRef.current.trim();

//       if (transcript) {
//         valueRef.current = transcript;
//         onChangeRef.current(transcript);
//       }

//       publishMetrics(transcript);

//       if (!manuallyStoppedRef.current && !disabled) {
//         try {
//           recognition.start();
//         } catch (error) {
//           console.debug("Speech recognition restart skipped:", error);
//         }
//       }
//     };

//     recognitionRef.current = recognition;

//     return () => {
//       isListeningRef.current = false;
//       manuallyStoppedRef.current = true;

//       try {
//         recognition.stop();
//       } catch {
//         // Recognition may already be stopped.
//       }

//       recognitionRef.current = null;
//     };
//   }, [disabled, language, onChange, publishMetrics]);

//   useEffect(() => {
//     if (!isListening) {
//       return undefined;
//     }

//     const interval = window.setInterval(() => {
//       if (!listeningStartedAtRef.current) {
//         return;
//       }

//       const duration = Math.floor(
//         (Date.now() - listeningStartedAtRef.current) / 1000,
//       );

//       elapsedSecondsRef.current = duration;
//       setElapsedSeconds(duration);
//       publishMetrics(finalTranscriptRef.current || value || "");
//     }, 1000);

//     return () => window.clearInterval(interval);
//   }, [isListening, publishMetrics, value]);

//   const startListening = () => {
//     if (disabled || !recognitionRef.current || isListeningRef.current) {
//       return;
//     }

//     manuallyStoppedRef.current = false;
//     setErrorMessage("");

//     if (!listeningStartedAtRef.current) {
//       listeningStartedAtRef.current = Date.now();
//     }

//     try {
//       recognitionRef.current.start();
//       setIsListening(true);
//     } catch (error) {
//       console.error("Speech recognition could not start:", error);

//       if (error?.name === "InvalidStateError") {
//         setIsListening(true);
//         isListeningRef.current = true;
//         return;
//       }

//       setErrorMessage("Could not start speech recognition. Please try again.");
//       setIsListening(false);
//       isListeningRef.current = false;
//     }
//   };

//   const stopListening = () => {
//     if (!recognitionRef.current) {
//       return;
//     }

//     manuallyStoppedRef.current = true;
//     isListeningRef.current = false;

//     if (pauseStartedAtRef.current) {
//       totalPauseSecondsRef.current +=
//         (Date.now() - pauseStartedAtRef.current) / 1000;
//       pauseStartedAtRef.current = null;
//     }

//     setIsListening(false);

//     try {
//       recognitionRef.current.stop();
//     } catch {
//       // Recognition may already be stopped.
//     }

//     publishMetrics(finalTranscriptRef.current || value || "");
//   };

//   const handleTextChange = (event) => {
//     const nextValue = event.target.value;

//     finalTranscriptRef.current = nextValue;
//     valueRef.current = nextValue;
//     onChangeRef.current(nextValue);
//     publishMetrics(nextValue);
//   };

//   const resetSpeechSession = () => {
//     if (isListeningRef.current) {
//       stopListening();
//     }

//     finalTranscriptRef.current = "";
//     listeningStartedAtRef.current = null;
//     lastSpeechAtRef.current = null;
//     totalPauseSecondsRef.current = 0;
//     pauseStartedAtRef.current = null;

//     elapsedSecondsRef.current = 0;
//     setElapsedSeconds(0);
//     setErrorMessage("");
//     valueRef.current = "";
//     onChangeRef.current("");

//     if (typeof onSpeechMetrics === "function") {
//       onSpeechMetrics({
//         speakingDurationSeconds: 0,
//         responseDurationSeconds: 0,
//         wordCount: 0,
//         wpm: 0,
//         pauseDurationSeconds: 0,
//         fillerWordCount: 0,
//       });
//     }
//   };

//   if (!supported) {
//     return (
//       <div className="space-y-3">
//         <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
//           <p className="text-sm text-amber-300">
//             Speech recognition is not supported in this browser. You can still
//             type your answer below.
//           </p>
//         </div>

//         <textarea
//           value={value}
//           onChange={handleTextChange}
//           placeholder="Type your answer..."
//           rows={7}
//           disabled={disabled}
//           className="w-full resize-y rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
//         />
//       </div>
//     );
//   }

//   const currentWordCount = countWords(value || "");
//   const currentFillerCount = countFillerWords(value || "");
//   const currentWpm = calculateWpm(value ? currentWordCount : 0, elapsedSeconds);

//   return (
//     <div className="space-y-4">
//       <div className="relative">
//         <textarea
//           value={value}
//           onChange={handleTextChange}
//           placeholder="Speak your answer or type it here..."
//           rows={8}
//           disabled={disabled}
//           className="w-full resize-y rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 pr-4 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
//         />

//         {isListening && (
//           <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1.5">
//             <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
//             <span className="text-xs font-medium text-red-300">
//               Listening
//             </span>
//           </div>
//         )}
//       </div>

//       <div className="flex flex-wrap items-center gap-2">
//         {!isListening ? (
//           <button
//             type="button"
//             onClick={startListening}
//             disabled={disabled}
//             className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
//           >
//             <span>🎤</span>
//             Start Speaking
//           </button>
//         ) : (
//           <button
//             type="button"
//             onClick={stopListening}
//             disabled={disabled}
//             className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50"
//           >
//             <span>⏹</span>
//             Stop Speaking
//           </button>
//         )}

//         <button
//           type="button"
//           onClick={resetSpeechSession}
//           disabled={disabled || (!value && !elapsedSeconds)}
//           className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
//         >
//           Clear
//         </button>
//       </div>

//       {errorMessage && (
//         <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
//           <p className="text-xs leading-5 text-red-300">{errorMessage}</p>
//         </div>
//       )}

//       <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
//         <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
//           <p className="text-[10px] uppercase tracking-wider text-slate-500">
//             Duration
//           </p>
//           <p className="mt-1 text-sm font-semibold text-white">
//             {formatDuration(elapsedSeconds)}
//           </p>
//         </div>

//         <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
//           <p className="text-[10px] uppercase tracking-wider text-slate-500">
//             Words
//           </p>
//           <p className="mt-1 text-sm font-semibold text-white">
//             {currentWordCount}
//           </p>
//         </div>

//         <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
//           <p className="text-[10px] uppercase tracking-wider text-slate-500">
//             Pace
//           </p>
//           <p className="mt-1 text-sm font-semibold text-white">
//             {currentWpm} WPM
//           </p>
//         </div>

//         <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
//           <p className="text-[10px] uppercase tracking-wider text-slate-500">
//             Fillers
//           </p>
//           <p className="mt-1 text-sm font-semibold text-white">
//             {currentFillerCount}
//           </p>
//         </div>
//       </div>

//       <p className="text-xs leading-5 text-slate-500">
//         Your transcript is editable. Speech metrics are calculated locally in
//         the browser and can be sent with the answer when the response is
//         submitted.
//       </p>
//     </div>
//   );
// }

// export default SpeechInput;


//............................new..................................
import { useCallback, useEffect, useRef, useState } from "react";

const FILLER_PATTERNS = [
  /\bum+\b/gi,
  /\buh+\b/gi,
  /\ber+\b/gi,
  /\bah+\b/gi,
  /\bhmm+\b/gi,
  /\byou know\b/gi,
  /\bi mean\b/gi,
  /\bkind of\b/gi,
  /\bsort of\b/gi,
  /\bbasically\b/gi,
  /\blike\b/gi,
];

const EMPTY_METRICS = {
  speakingDurationSeconds: 0,
  responseDurationSeconds: 0,
  wordCount: 0,
  wpm: 0,
  pauseDurationSeconds: 0,
  fillerWordCount: 0,
};

function countWords(text = "") {
  const normalized = text.trim();
  return normalized ? normalized.split(/\s+/).filter(Boolean).length : 0;
}

function countFillerWords(text = "") {
  return FILLER_PATTERNS.reduce((total, pattern) => {
    const matches = text.match(pattern);
    return total + (matches ? matches.length : 0);
  }, 0);
}

function calculateWpm(wordCount, durationSeconds) {
  if (!wordCount || durationSeconds < 1) return 0;
  return Math.round((wordCount / durationSeconds) * 60);
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function SpeechInput({
  value,
  onChange,
  onSpeechMetrics,
  language = "en-US",
  disabled = false,
}) {
  const recognitionRef = useRef(null);
  const recognitionSupportedRef = useRef(false);
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const isListeningRef = useRef(false);
  const manuallyStoppedRef = useRef(false);
  const restartTimerRef = useRef(null);
  const valueRef = useRef(value || "");
  const onChangeRef = useRef(onChange);
  const onSpeechMetricsRef = useRef(onSpeechMetrics);
  const disabledRef = useRef(disabled);

  const finalTranscriptRef = useRef("");
  const listeningStartedAtRef = useRef(null);
  const elapsedSecondsRef = useRef(0);
  const lastSpeechAtRef = useRef(null);
  const totalPauseSecondsRef = useRef(0);
  const pauseStartedAtRef = useRef(null);
  const hasDetectedSpeechRef = useRef(false);
  const lastResultAtRef = useRef(null);

  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [micLevel, setMicLevel] = useState(0);

  useEffect(() => {
    valueRef.current = value || "";
    onChangeRef.current = onChange;
    onSpeechMetricsRef.current = onSpeechMetrics;
    disabledRef.current = disabled;
  }, [value, onChange, onSpeechMetrics, disabled]);

  const buildMetrics = useCallback((transcript = valueRef.current) => {
    const wordCount = countWords(transcript);
    const durationSeconds = listeningStartedAtRef.current
      ? Math.max(0, Math.floor((Date.now() - listeningStartedAtRef.current) / 1000))
      : elapsedSecondsRef.current;

    const currentPause = pauseStartedAtRef.current
      ? Math.max(0, (Date.now() - pauseStartedAtRef.current) / 1000)
      : 0;

    return {
      speakingDurationSeconds: durationSeconds,
      responseDurationSeconds: durationSeconds,
      wordCount,
      wpm: calculateWpm(wordCount, durationSeconds),
      pauseDurationSeconds: Math.round(
        totalPauseSecondsRef.current + currentPause,
      ),
      fillerWordCount: countFillerWords(transcript),
    };
  }, []);

  const publishMetrics = useCallback((transcript = valueRef.current) => {
    if (typeof onSpeechMetricsRef.current === "function") {
      onSpeechMetricsRef.current(buildMetrics(transcript));
    }
  }, [buildMetrics]);

  const stopAudioMonitor = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // AudioContext may already be closed.
      }
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setMicLevel(0);
  }, []);

  const startAudioMonitor = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return true;

      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.fftSize);
      const monitor = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) {
          const normalized = (data[i] - 128) / 128;
          sum += normalized * normalized;
        }

        const rms = Math.sqrt(sum / data.length);
        setMicLevel(Math.min(100, Math.round(rms * 500)));
        animationFrameRef.current = requestAnimationFrame(monitor);
      };

      monitor();
      return true;
    } catch (error) {
      console.error("Microphone capture error:", error);
      setErrorMessage(
        "Microphone access could not be started. Check that your microphone is enabled and not muted.",
      );
      return false;
    }
  }, []);

  const scheduleRecognitionRestart = useCallback(() => {
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
    }

    if (manuallyStoppedRef.current || disabledRef.current) return;

    restartTimerRef.current = window.setTimeout(() => {
      if (
        manuallyStoppedRef.current ||
        disabledRef.current ||
        !recognitionRef.current ||
        isListeningRef.current
      ) {
        return;
      }

      try {
        recognitionRef.current.start();
      } catch (error) {
        console.debug("Speech recognition restart skipped:", error);
      }
    }, 250);
  }, []);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      recognitionSupportedRef.current = false;
      return undefined;
    }

    recognitionSupportedRef.current = true;
    const recognition = new SpeechRecognition();

    // Chrome can end a continuous recognition session after a short period.
    // We therefore restart it from onend while preserving the transcript.
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = language;

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      setErrorMessage("");
      setStatusMessage("Listening for speech...");

      const now = Date.now();
      if (!listeningStartedAtRef.current) {
        listeningStartedAtRef.current = now;
      }

      lastSpeechAtRef.current = now;
    };

    recognition.onaudiostart = () => {
      setStatusMessage("Microphone audio detected. Speak your answer...");
    };

    recognition.onsoundstart = () => {
      setStatusMessage("Sound detected. Keep speaking...");
    };

    recognition.onspeechstart = () => {
      hasDetectedSpeechRef.current = true;
      lastSpeechAtRef.current = Date.now();

      if (pauseStartedAtRef.current) {
        totalPauseSecondsRef.current +=
          (Date.now() - pauseStartedAtRef.current) / 1000;
        pauseStartedAtRef.current = null;
      }

      setStatusMessage("Speech detected. Transcribing...");
    };

    recognition.onresult = (event) => {
      let finalTranscript = finalTranscriptRef.current;
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript || "";

        if (event.results[i].isFinal) {
          finalTranscript += `${transcript} `;
        } else {
          interimTranscript += transcript;
        }
      }

      finalTranscriptRef.current = finalTranscript;
      lastResultAtRef.current = Date.now();
      lastSpeechAtRef.current = Date.now();
      hasDetectedSpeechRef.current = true;

      if (pauseStartedAtRef.current) {
        totalPauseSecondsRef.current +=
          (Date.now() - pauseStartedAtRef.current) / 1000;
        pauseStartedAtRef.current = null;
      }

      const combinedTranscript =
        `${finalTranscript}${interimTranscript}`.trim();

      valueRef.current = combinedTranscript;
      onChangeRef.current(combinedTranscript);
      publishMetrics(combinedTranscript);
      setStatusMessage("Speech detected. Transcribing...");
    };

    recognition.onnomatch = () => {
      setStatusMessage("I couldn't understand that speech. Keep speaking clearly.");
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);

      if (event.error === "no-speech") {
        setErrorMessage(
          "No speech was detected by the browser. If your microphone level moves, keep speaking and recognition will retry automatically.",
        );
        setStatusMessage("Waiting for speech...");
        return;
      }

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setErrorMessage(
          "Microphone permission was denied. Allow microphone access and try again.",
        );
      } else if (event.error === "audio-capture") {
        setErrorMessage(
          "The browser could not capture microphone audio. Check your selected microphone and make sure it is not muted.",
        );
      } else if (event.error === "network") {
        setErrorMessage(
          "The browser speech service could not be reached. Check your internet connection and try again.",
        );
      } else {
        setErrorMessage(`Speech recognition error: ${event.error}`);
      }

      isListeningRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setIsListening(false);

      if (pauseStartedAtRef.current) {
        totalPauseSecondsRef.current +=
          (Date.now() - pauseStartedAtRef.current) / 1000;
        pauseStartedAtRef.current = null;
      }

      const transcript = finalTranscriptRef.current.trim();
      if (transcript) {
        valueRef.current = transcript;
        onChangeRef.current(transcript);
      }

      publishMetrics(transcript || valueRef.current);

      if (!manuallyStoppedRef.current && !disabledRef.current) {
        scheduleRecognitionRestart();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (restartTimerRef.current) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }

      isListeningRef.current = false;
      manuallyStoppedRef.current = true;

      try {
        recognition.abort();
      } catch {
        // Recognition may already be stopped.
      }

      recognitionRef.current = null;
      stopAudioMonitor();
    };
  }, [language, publishMetrics, scheduleRecognitionRestart, stopAudioMonitor]);

  useEffect(() => {
    if (!isListening) return undefined;

    const interval = window.setInterval(() => {
      if (!listeningStartedAtRef.current) return;

      const duration = Math.floor(
        (Date.now() - listeningStartedAtRef.current) / 1000,
      );

      elapsedSecondsRef.current = duration;
      setElapsedSeconds(duration);
      publishMetrics(finalTranscriptRef.current || valueRef.current);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isListening, publishMetrics]);

  const startListening = async () => {
    if (
      disabled ||
      !recognitionSupportedRef.current ||
      !recognitionRef.current ||
      isListeningRef.current
    ) {
      return;
    }

    manuallyStoppedRef.current = false;
    setErrorMessage("");
    setStatusMessage("Starting microphone...");

    if (!listeningStartedAtRef.current) {
      listeningStartedAtRef.current = Date.now();
    }

    const microphoneReady = await startAudioMonitor();
    if (!microphoneReady) {
      isListeningRef.current = false;
      setIsListening(false);
      return;
    }

    try {
      recognitionRef.current.start();
      isListeningRef.current = true;
      setIsListening(true);
    } catch (error) {
      console.error("Speech recognition could not start:", error);

      if (error?.name === "InvalidStateError") {
        isListeningRef.current = true;
        setIsListening(true);
        return;
      }

      setErrorMessage("Could not start speech recognition. Please try again.");
      setStatusMessage("");
      isListeningRef.current = false;
      setIsListening(false);
      stopAudioMonitor();
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;

    manuallyStoppedRef.current = true;
    isListeningRef.current = false;
    setIsListening(false);
    setStatusMessage("Speech capture stopped.");

    if (pauseStartedAtRef.current) {
      totalPauseSecondsRef.current +=
        (Date.now() - pauseStartedAtRef.current) / 1000;
      pauseStartedAtRef.current = null;
    }

    try {
      recognitionRef.current.stop();
    } catch {
      // Recognition may already be stopped.
    }

    stopAudioMonitor();
    publishMetrics(finalTranscriptRef.current || valueRef.current);
  };

  const handleTextChange = (event) => {
    const nextValue = event.target.value;
    finalTranscriptRef.current = nextValue;
    valueRef.current = nextValue;
    onChangeRef.current(nextValue);
    publishMetrics(nextValue);
  };

  const resetSpeechSession = () => {
    manuallyStoppedRef.current = true;

    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    try {
      recognitionRef.current?.abort();
    } catch {
      // Recognition may already be stopped.
    }

    stopAudioMonitor();

    finalTranscriptRef.current = "";
    listeningStartedAtRef.current = null;
    elapsedSecondsRef.current = 0;
    lastSpeechAtRef.current = null;
    totalPauseSecondsRef.current = 0;
    pauseStartedAtRef.current = null;
    hasDetectedSpeechRef.current = false;
    lastResultAtRef.current = null;

    valueRef.current = "";
    onChangeRef.current("");
    setElapsedSeconds(0);
    setIsListening(false);
    setErrorMessage("");
    setStatusMessage("");

    if (typeof onSpeechMetricsRef.current === "function") {
      onSpeechMetricsRef.current({ ...EMPTY_METRICS });
    }
  };

  if (!supported) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-300">
            Speech recognition is not supported in this browser. You can still
            type your answer below.
          </p>
        </div>

        <textarea
          value={value}
          onChange={handleTextChange}
          placeholder="Type your answer..."
          rows={7}
          disabled={disabled}
          className="w-full resize-y rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
        />
      </div>
    );
  }

  const currentWordCount = countWords(value || "");
  const currentFillerCount = countFillerWords(value || "");
  const currentWpm = calculateWpm(currentWordCount, elapsedSeconds);

  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          value={value}
          onChange={handleTextChange}
          placeholder="Speak your answer or type it here..."
          rows={8}
          disabled={disabled}
          className="w-full resize-y rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 pr-4 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
        />

        {isListening && (
          <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            <span className="text-xs font-medium text-red-300">Listening</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!isListening ? (
          <button
            type="button"
            onClick={startListening}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>🎤</span>
            Start Speaking
          </button>
        ) : (
          <button
            type="button"
            onClick={stopListening}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>⏹</span>
            Stop Speaking
          </button>
        )}

        <button
          type="button"
          onClick={resetSpeechSession}
          disabled={disabled || (!value && !elapsedSeconds)}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      {(statusMessage || isListening) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-cyan-400/10 bg-cyan-400/5 px-4 py-3">
          <p className="text-xs text-cyan-200">
            {statusMessage || "Listening for speech..."}
          </p>
          {isListening && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Mic level</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all duration-100"
                  style={{ width: `${Math.max(2, micLevel)}%` }}
                />
              </div>
              <span>{micLevel}%</span>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-xs leading-5 text-red-300">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Duration</p>
          <p className="mt-1 text-sm font-semibold text-white">{formatDuration(elapsedSeconds)}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Words</p>
          <p className="mt-1 text-sm font-semibold text-white">{currentWordCount}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Pace</p>
          <p className="mt-1 text-sm font-semibold text-white">{currentWpm} WPM</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Fillers</p>
          <p className="mt-1 text-sm font-semibold text-white">{currentFillerCount}</p>
        </div>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        Your transcript is editable. Speech metrics are calculated locally in
        the browser and can be sent with the answer when the response is
        submitted.
      </p>
    </div>
  );
}

export default SpeechInput;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import CameraMonitor from "../components/CameraMonitor";
import SpeechInput from "../components/SpeechInput";

/* =========================================================
   HELPERS
========================================================= */

const parseFinalFeedback = (feedback) => {
  try {
    if (typeof feedback === "object" && feedback !== null) {
      return feedback;
    }

    if (typeof feedback !== "string") {
      return null;
    }

    let cleaned = feedback.trim();

    cleaned = cleaned.replace(/^```json\s*/i, "");
    cleaned = cleaned.replace(/^```\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/i, "");

    const firstBrace = cleaned.indexOf("{");

    if (firstBrace > 0) {
      cleaned = cleaned.substring(firstBrace);
    }

    const lastBrace = cleaned.lastIndexOf("}");

    if (lastBrace !== -1 && lastBrace < cleaned.length - 1) {
      cleaned = cleaned.substring(0, lastBrace + 1);
    }

    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Failed to parse final feedback:", error);
    console.error("Raw feedback:", feedback);
    return null;
  }
};

const getScoreStyle = (score) => {
  if (score >= 8) {
    return {
      badge:
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
      bar: "from-emerald-500 to-teal-400",
    };
  }

  if (score >= 5) {
    return {
      badge:
        "border-amber-500/20 bg-amber-500/10 text-amber-400",
      bar: "from-amber-500 to-orange-400",
    };
  }

  return {
    badge: "border-rose-500/20 bg-rose-500/10 text-rose-400",
    bar: "from-rose-500 to-red-400",
  };
};

/* =========================================================
   LOGO
========================================================= */

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
        <span className="font-bold text-white">I</span>
      </div>

      <div>
        <h1 className="font-bold text-lg tracking-tight">
          Interxora<span className="text-blue-400">.ai</span>
        </h1>

        <p className="text-[10px] text-slate-500 tracking-wide">
          AI INTERVIEW PLATFORM
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   INTERVIEW SESSION
========================================================= */

function InterviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [answer, setAnswer] = useState("");
  const [speechMetrics, setSpeechMetrics] = useState({
    speakingDurationSeconds: 0,
    responseDurationSeconds: 0,
    wordCount: 0,
    wpm: 0,
    pauseDurationSeconds: 0,
    fillerWordCount: 0,
  });
  const [speechInstanceKey, setSpeechInstanceKey] = useState(0);

  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [completed, setCompleted] = useState(false);
  const [finalFeedback, setFinalFeedback] = useState("");
  const [resultData, setResultData] = useState(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  // Premium interview workspace UI state
  const [draftSaved, setDraftSaved] = useState(false);
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const startingRef = useRef(false);

  const handleAnswerChange = useCallback((nextAnswer) => {
    setAnswer(nextAnswer);
    setDraftSaved(false);
  }, []);

  const handleSpeechMetrics = useCallback((metrics) => {
    setSpeechMetrics((previous) => ({ ...previous, ...metrics }));
  }, []);

  const resetSpeechState = useCallback(() => {
    setSpeechMetrics({
      speakingDurationSeconds: 0,
      responseDurationSeconds: 0,
      wordCount: 0,
      wpm: 0,
      pauseDurationSeconds: 0,
      fillerWordCount: 0,
    });
    setSpeechInstanceKey((previous) => previous + 1);
  }, []);

  const savedConfig = useMemo(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem("interview_config") || "{}"
      );
    } catch {
      return {};
    }
  }, []);

  // Interview mode belongs to the interview itself, not just the current
  // page/tab. Prefer the per-interview value so direct URLs and reloads keep
  // the exact experience that was selected when the interview was created.
  const persistedMode =
    localStorage.getItem(`interxora_interview_mode_${id}`) ||
    savedConfig?.session_mode;

  const sessionMode = persistedMode === "practice" ? "practice" : "live";

  const isLiveInterview = sessionMode === "live";

  const accessToken = localStorage.getItem("access_token");

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
  };

  // Calculate the remaining time from the server's original start time.
  // This prevents the countdown from resetting when the user leaves the
  // session and later opens the same interview URL again.
  const getRemainingSeconds = (interviewData) => {
    const limitMinutes = Number(interviewData?.time_limit || 0);

    // A zero time limit means no countdown.
    if (limitMinutes <= 0) return null;

    const limitSeconds = limitMinutes * 60;
    const startedAt = interviewData?.started_at;

    const fallbackStartedAt =
      localStorage.getItem(`interxora_interview_started_at_${id}`);
    const effectiveStartedAt = startedAt || fallbackStartedAt;

    if (!effectiveStartedAt) {
      return limitSeconds;
    }

    const startedTimestamp = new Date(effectiveStartedAt).getTime();

    if (Number.isNaN(startedTimestamp)) {
      return limitSeconds;
    }

    const elapsedSeconds = Math.floor(
      (Date.now() - startedTimestamp) / 1000,
    );

    return Math.max(limitSeconds - elapsedSeconds, 0);
  };

  const persistStartedAt = (interviewData) => {
    try {
      const startedAt = interviewData?.started_at;
      if (startedAt) {
        localStorage.setItem(
          `interxora_interview_started_at_${id}`,
          startedAt,
        );
      }
    } catch {
      // Best-effort client persistence.
    }
  };

  /* =========================================================
     LOAD INTERVIEW
  ========================================================= */

  useEffect(() => {
    loadInterview();
  }, [id]);

  const loadInterview = async () => {
    try {
      setLoading(true);
      setError("");

      if (!accessToken) {
        navigate("/login");
        return;
      }

      const data = await apiRequest(`/interviews/${id}`, {
        method: "GET",
        headers: authHeaders,
      });

      setInterview(data);

      // Migrate the mode from the old tab-scoped config if this interview was
      // created before per-interview persistence was added.
      const legacyMode = savedConfig?.session_mode;
      if (
        !localStorage.getItem(`interxora_interview_mode_${id}`) &&
        (legacyMode === "practice" || legacyMode === "live")
      ) {
        try {
          localStorage.setItem(
            `interxora_interview_mode_${id}`,
            legacyMode,
          );
        } catch {
          // Best-effort migration.
        }
      }

      if (data.status === "started") {
        persistStartedAt(data);
        setTimeLeft(getRemainingSeconds(data));
        await loadQuestions();
      }

      if (data.status === "completed") {
        setCompleted(true);
        setFinalFeedback(data.final_feedback || "");
        await loadInterviewResult();
      }
    } catch (err) {
      console.error("Failed to load interview:", err);
      setError(err.message || "Unable to load interview.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     LOAD QUESTIONS
  ========================================================= */

  const loadQuestions = async () => {
    try {
      const questionData = await apiRequest(
        `/interviews/${id}/questions`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );

      const generatedQuestions = Array.isArray(questionData)
        ? questionData
        : questionData?.questions || [];

      setQuestions(generatedQuestions);

      if (generatedQuestions.length > 0) {
        setCurrentQuestionIndex(generatedQuestions.length - 1);
      }
    } catch (err) {
      console.error("Failed to load questions:", err);
      setError(
        err.message || "Unable to load interview questions."
      );
    }
  };

  /* =========================================================
     LOAD RESULT
  ========================================================= */

  const loadInterviewResult = async () => {
    try {
      setResultLoading(true);
      setError("");

      const data = await apiRequest(
        `/interviews/${id}/result`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );

      setResultData(data);

      if (data.feedback) {
        setFinalFeedback(data.feedback);
      }
    } catch (err) {
      console.error("Failed to load interview result:", err);
      setError(
        err.message || "Unable to load interview result."
      );
    } finally {
      setResultLoading(false);
    }
  };

  /* =========================================================
     START INTERVIEW
  ========================================================= */

  const handleStartInterview = async () => {
    if (
      startingRef.current ||
      starting ||
      interview?.status === "started"
    ) {
      return;
    }

    try {
      startingRef.current = true;
      setStarting(true);
      setError("");

      if (!accessToken) {
        navigate("/login");
        return;
      }

      const startedInterview = await apiRequest(
        `/interviews/${id}/start`,
        {
          method: "PATCH",
          headers: authHeaders,
        }
      );

      setInterview(startedInterview);
      persistStartedAt(startedInterview);

      setTimeLeft(getRemainingSeconds(startedInterview));

      const questionData = await apiRequest(
        `/interviews/${id}/questions`,
        {
          method: "GET",
          headers: authHeaders,
        }
      );

      const generatedQuestions = Array.isArray(questionData)
        ? questionData
        : questionData?.questions || [];

      setQuestions(generatedQuestions);

      if (generatedQuestions.length > 0) {
        setCurrentQuestionIndex(
          generatedQuestions.length - 1
        );
      }
    } catch (err) {
      console.error("Failed to start interview:", err);
      setError(
        err.message || "Unable to start interview."
      );
    } finally {
      setStarting(false);
      startingRef.current = false;
    }
  };

  /* =========================================================
     SUBMIT ANSWER
  ========================================================= */

  const handleSubmitAnswer = async () => {
    if (submitting) return;

    if (!answer.trim()) {
      setError("Please write an answer before submitting.");
      return;
    }

    const currentQuestion =
      questions[currentQuestionIndex];

    if (!currentQuestion) {
      setError("No active question found.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const submissionMetrics = isLiveInterview
        ? {
            speaking_duration_seconds: Number(
              speechMetrics.speakingDurationSeconds || 0,
            ),
            response_duration_seconds: Number(
              speechMetrics.responseDurationSeconds || 0,
            ),
            word_count: Number(speechMetrics.wordCount || 0),
            wpm: Number(speechMetrics.wpm || 0),
            pause_duration_seconds: Number(
              speechMetrics.pauseDurationSeconds || 0,
            ),
            filler_word_count: Number(
              speechMetrics.fillerWordCount || 0,
            ),
          }
        : null;

      console.log("Submitting interview response:", {
        interview_id: id,
        question_id: currentQuestion.id,
        response_mode: isLiveInterview ? "live" : "practice",
        speech_metrics: submissionMetrics,
      });

      const data = await apiRequest(
        `/interviews/${id}/answers`,
        {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question_id: currentQuestion.id,
            answer_text: answer.trim(),
            response_mode: isLiveInterview ? "live" : "practice",
            speech_metrics: submissionMetrics,
          }),
        }
      );

      if (data.completed === true) {
        setCompleted(true);

        setInterview((prev) => ({
          ...prev,
          status: "completed",
        }));

        setAnswer("");
        resetSpeechState();

        await loadInterviewResult();

        return;
      }

      if (data.next_question) {
        setQuestions((prev) => [
          ...prev,
          data.next_question,
        ]);

        setCurrentQuestionIndex(
          (prev) => prev + 1
        );

        setAnswer("");
        resetSpeechState();
      } else {
        await loadQuestions();
        setAnswer("");
        resetSpeechState();
      }
    } catch (err) {
      console.error("Failed to submit answer:", err);

      setError(
        err.message || "Unable to submit answer."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     TIMER
  ========================================================= */

  const handleTimeUp = () => {
    alert("Time is up! Your interview has ended.");
    navigate("/dashboard");
  };

  useEffect(() => {
    if (timeLeft === null || completed) {
      return;
    }

    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return 0;
        return Math.max(prev - 1, 0);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, completed]);

  /* =========================================================
     PREMIUM WORKSPACE BEHAVIOUR
  ========================================================= */

  const getDraftKey = () =>
    `interxora_draft_${id}_${currentQuestionIndex}`;

  useEffect(() => {
    if (!id || completed) return;

    try {
      const saved = localStorage.getItem(getDraftKey());
      setAnswer(saved || "");
      setDraftSaved(Boolean(saved));
    } catch {
      setDraftSaved(false);
    }
  }, [id, currentQuestionIndex, completed]);

  useEffect(() => {
    if (!id || completed || !answer.trim()) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(getDraftKey(), answer);
        setDraftSaved(true);
      } catch {
        // Draft persistence is best-effort.
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [answer, id, currentQuestionIndex, completed]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (!submitting && answer.trim() && currentQuestion) {
          handleSubmitAnswer();
        }
      }

      if (event.key === "Escape" && isEditorFullscreen) {
        setIsEditorFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [answer, submitting, currentQuestionIndex, questions, isEditorFullscreen]);

  /* =========================================================
     LOADING SCREEN
  ========================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="relative h-16 w-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-xl" />

            <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center animate-pulse">
              <span className="text-2xl font-bold">
                I
              </span>
            </div>
          </div>

          <h2 className="text-xl font-semibold">
            Preparing your interview
          </h2>

          <p className="text-sm text-slate-500 mt-2">
            Setting up your personalized AI session...
          </p>

          <div className="mt-6 flex justify-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" />
            <span
              className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce"
              style={{ animationDelay: "120ms" }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce"
              style={{ animationDelay: "240ms" }}
            />
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     ERROR SCREEN
  ========================================================= */

  if (error && !interview) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-rose-500/20 bg-white/[0.03] p-8 text-center">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-2xl">
            !
          </div>

          <h1 className="text-2xl font-bold mt-5">
            Unable to load interview
          </h1>

          <p className="text-slate-400 mt-3 leading-6">
            {error}
          </p>

          <button
            onClick={() => navigate("/dashboard")}
            className="mt-7 w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 font-semibold transition hover:from-blue-500 hover:to-violet-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!interview) {
    return null;
  }

  /* =========================================================
     DERIVED VALUES
  ========================================================= */

  const currentQuestion =
    questions[currentQuestionIndex];

  const maxQuestions =
    interview?.max_questions ??
    savedConfig?.max_questions ??
    5;

  const currentNumber = currentQuestion
    ? currentQuestion.question_number ||
      currentQuestionIndex + 1
    : 0;

  const progress =
    maxQuestions > 0
      ? Math.min(
          (currentNumber / maxQuestions) * 100,
          100
        )
      : 0;

  const wordCount = answer.trim()
    ? answer.trim().split(/\s+/).length
    : 0;

  const formattedTime =
    timeLeft !== null
      ? `${Math.floor(timeLeft / 60)
          .toString()
          .padStart(2, "0")}:${(timeLeft % 60)
          .toString()
          .padStart(2, "0")}`
      : "--:--";

  const timeWarning =
    timeLeft !== null && timeLeft <= 60;

  const timeCritical =
    timeLeft !== null && timeLeft <= 30;

  /* =========================================================
     COMPLETED REPORT
  ========================================================= */

  if (completed) {
    const feedback = parseFinalFeedback(finalFeedback) || {};
    const answers = Array.isArray(resultData?.answers)
      ? resultData.answers
      : [];

    const technicalScore = Number(
      feedback?.technical?.score ?? 0
    );

    const communicationScore = Number(
      feedback?.communication?.score ?? 0
    );

    const overallScore = Number(
      resultData?.overall_score ??
      resultData?.percentage ??
      feedback?.overall_score ??
      0
    );

    const performanceLabel =
      resultData?.performance_label ||
      feedback?.headline ||
      (overallScore >= 90
        ? "Outstanding Performance"
        : overallScore >= 75
          ? "Strong Performance"
          : overallScore >= 60
            ? "Good Performance"
            : overallScore >= 40
              ? "Developing Performance"
              : "Needs Practice");

    const answeredCount =
      Number(resultData?.answered_questions ?? answers.length ?? 0);

    const totalQuestions = Number(
      resultData?.total_questions ??
      interview?.max_questions ??
      maxQuestions
    );

    const averageAnswerScore =
      answers.length > 0
        ? answers.reduce(
            (sum, item) => sum + Number(item?.score ?? 0),
            0
          ) / answers.length
        : 0;

    const liveAnswerMetrics = answers
      .filter((item) => item?.response_mode === "live" && item?.speech_metrics)
      .map((item) => item.speech_metrics);

    const isLiveReport =
      resultData?.response_mode === "live" ||
      answers.some((item) => item?.response_mode === "live");

    const totalSpeechWords = liveAnswerMetrics.reduce(
      (sum, metrics) => sum + Number(metrics?.word_count ?? 0),
      0
    );

    const totalSpeakingSeconds = liveAnswerMetrics.reduce(
      (sum, metrics) => sum + Number(metrics?.speaking_duration_seconds ?? 0),
      0
    );

    const totalResponseSeconds = liveAnswerMetrics.reduce(
      (sum, metrics) => sum + Number(metrics?.response_duration_seconds ?? 0),
      0
    );

    const totalPauseSeconds = liveAnswerMetrics.reduce(
      (sum, metrics) => sum + Number(metrics?.pause_duration_seconds ?? 0),
      0
    );

    const totalFillerWords = liveAnswerMetrics.reduce(
      (sum, metrics) => sum + Number(metrics?.filler_word_count ?? 0),
      0
    );

    const averageWpm =
      liveAnswerMetrics.length > 0
        ? liveAnswerMetrics.reduce(
            (sum, metrics) => sum + Number(metrics?.wpm ?? 0),
            0
          ) / liveAnswerMetrics.length
        : 0;

    const averageResponseSeconds =
      liveAnswerMetrics.length > 0
        ? totalResponseSeconds / liveAnswerMetrics.length
        : 0;

    const fillerRate =
      totalSpeechWords > 0
        ? (totalFillerWords / totalSpeechWords) * 100
        : 0;

    const formatDuration = (seconds) => {
      const safeSeconds = Math.max(0, Math.round(Number(seconds || 0)));
      const minutes = Math.floor(safeSeconds / 60);
      const remainingSeconds = safeSeconds % 60;

      if (minutes === 0) return `${remainingSeconds}s`;

      return `${minutes}m ${remainingSeconds}s`;
    };

    const getPaceLabel = (wpm) => {
      if (wpm <= 0) return "No speech data";
      if (wpm < 110) return "Measured pace is slow";
      if (wpm <= 160) return "Comfortable interview pace";
      if (wpm <= 190) return "Fast but generally manageable";
      return "Very fast pace";
    };

    const getFillerLabel = (rate) => {
      if (totalSpeechWords <= 0) return "No speech data";
      if (rate <= 2) return "Low filler usage";
      if (rate <= 5) return "Moderate filler usage";
      return "High filler usage";
    };

    const strongestAnswers = [...answers]
      .sort((a, b) => Number(b?.score ?? 0) - Number(a?.score ?? 0))
      .slice(0, 3);

    const improvementAnswers = [...answers]
      .sort((a, b) => Number(a?.score ?? 0) - Number(b?.score ?? 0))
      .slice(0, 3);

    const readiness = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          overallScore * 0.7 +
            technicalScore * 10 * 0.15 +
            communicationScore * 10 * 0.15
        )
      )
    );

    const getReadinessLabel = (score) => {
      if (score >= 90) return "Interview Ready";
      if (score >= 75) return "Nearly Ready";
      if (score >= 60) return "Building Readiness";
      return "Needs More Practice";
    };

    const scorePercent = (score) =>
      Math.max(0, Math.min(100, Number(score || 0) * 10));

    const getScoreLabel = (score) => {
      if (score >= 9) return "Excellent";
      if (score >= 8) return "Strong";
      if (score >= 6) return "Good";
      if (score >= 4) return "Developing";
      return "Needs Practice";
    };

    const statCards = [
      {
        label: "Questions",
        value: `${answeredCount}/${totalQuestions}`,
        sub: "Completed",
        icon: "#",
        tone: "blue",
      },
      {
        label: "Average Answer",
        value: `${averageAnswerScore.toFixed(1)}/10`,
        sub: "Across responses",
        icon: "↗",
        tone: "violet",
      },
      {
        label: "Technical",
        value: `${technicalScore.toFixed(1)}/10`,
        sub: "Technical capability",
        icon: "⌘",
        tone: "cyan",
      },
      {
        label: "Communication",
        value: `${communicationScore.toFixed(1)}/10`,
        sub: "Clarity & explanation",
        icon: "◌",
        tone: "emerald",
      },
    ];

    const toneClasses = {
      blue: "border-blue-500/15 bg-blue-500/[0.045] text-blue-300",
      violet: "border-violet-500/15 bg-violet-500/[0.045] text-violet-300",
      cyan: "border-cyan-500/15 bg-cyan-500/[0.045] text-cyan-300",
      emerald:
        "border-emerald-500/15 bg-emerald-500/[0.045] text-emerald-300",
    };

    return (
      <div className="min-h-screen bg-[#050811] text-white">
        <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#050811]/90 backdrop-blur-2xl">
          <div className="max-w-[1280px] mx-auto h-16 px-5 md:px-8 flex items-center justify-between">
            <Brand />

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[11px] font-medium text-emerald-300">
                  Assessment Complete
                </span>
              </div>

              <button
                onClick={() => navigate("/dashboard")}
                className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                Dashboard
              </button>
            </div>
          </div>
        </header>

        <main className="relative overflow-hidden">
          <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-blue-600/[0.07] blur-[130px]" />
          <div className="pointer-events-none absolute right-[-180px] top-[650px] h-[450px] w-[450px] rounded-full bg-violet-600/[0.05] blur-[120px]" />

          <div className="relative max-w-[1280px] mx-auto px-5 md:px-8 py-8 md:py-12">
            {/* REPORT HEADER */}
            <section className="mb-8 md:mb-10">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-7">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    AI Performance Report
                  </div>

                  <h1 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
                    Your interview is complete.
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm md:text-base leading-7 text-slate-400">
                    Here is your complete Interxora AI assessment. Review your
                    performance, understand your strongest responses, and see
                    exactly where your next preparation effort should go.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-300">
                    {interview.role || "Software Developer"}
                  </span>
                  <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-300">
                    {interview.interview_type || "Technical"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400">
                    {interview.difficulty || "Adaptive"}
                  </span>
                </div>
              </div>
            </section>

            {resultLoading ? (
              <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-12 text-center">
                <div className="mx-auto h-10 w-10 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                <h2 className="mt-5 text-lg font-semibold">
                  Preparing your assessment...
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Loading your question-level evaluation.
                </p>
              </section>
            ) : (
              <div className="space-y-6">
                {/* HERO SCORE */}
                <section className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-gradient-to-br from-blue-500/[0.11] via-violet-500/[0.07] to-white/[0.015] p-6 md:p-9">
                  <div className="absolute right-[-80px] top-[-100px] h-72 w-72 rounded-full bg-blue-500/[0.10] blur-3xl" />
                  <div className="absolute left-[38%] bottom-[-130px] h-64 w-64 rounded-full bg-violet-500/[0.07] blur-3xl" />

                  <div className="relative grid lg:grid-cols-[1fr_auto] gap-9 items-center">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                        <span>✓</span>
                        {performanceLabel}
                      </div>

                      <h2 className="mt-5 text-2xl md:text-3xl font-bold">
                        {feedback.headline || performanceLabel}
                      </h2>

                      <p className="mt-4 max-w-2xl text-sm md:text-base leading-7 text-slate-300">
                        {feedback.summary ||
                          "Your interview responses have been evaluated using the AI assessment generated during this session."}
                      </p>

                      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
                        <div className="rounded-2xl border border-white/[0.07] bg-[#050811]/50 p-4">
                          <p className="text-[10px] uppercase tracking-widest text-slate-600">
                            Role
                          </p>
                          <p className="mt-2 text-sm font-semibold truncate">
                            {interview.role || "Software Developer"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/[0.07] bg-[#050811]/50 p-4">
                          <p className="text-[10px] uppercase tracking-widest text-slate-600">
                            Questions
                          </p>
                          <p className="mt-2 text-sm font-semibold">
                            {answeredCount}/{totalQuestions}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/[0.07] bg-[#050811]/50 p-4 col-span-2 sm:col-span-1">
                          <p className="text-[10px] uppercase tracking-widest text-slate-600">
                            Time Limit
                          </p>
                          <p className="mt-2 text-sm font-semibold">
                            {interview.time_limit || savedConfig.time_limit || 15} min
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div className="relative h-44 w-44 rounded-full p-2 bg-[conic-gradient(#60a5fa_0deg,#8b5cf6_220deg,#10b981_324deg,#1e293b_324deg)] shadow-2xl shadow-blue-500/10">
                        <div className="h-full w-full rounded-full bg-[#080d18] flex flex-col items-center justify-center border border-white/[0.06]">
                          <span className="text-5xl font-bold tracking-tight">
                            {Math.round(overallScore)}%
                          </span>
                          <span className="mt-1 text-xs text-slate-500">
                            Overall Score
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* QUICK STATS */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {statCards.map((card) => (
                    <div
                      key={card.label}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:bg-white/[0.04]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={`h-10 w-10 rounded-xl border flex items-center justify-center text-sm font-bold ${toneClasses[card.tone]}`}
                        >
                          {card.icon}
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-slate-600">
                          Metric
                        </span>
                      </div>
                      <p className="mt-5 text-2xl font-bold">
                        {card.value}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-300">
                        {card.label}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-600">
                        {card.sub}
                      </p>
                    </div>
                  ))}
                </section>

                {/* PERFORMANCE ANALYTICS */}
                <section className="grid lg:grid-cols-[1.35fr_0.65fr] gap-6">
                  <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 md:p-7">
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-blue-400 font-semibold">
                          Competency Analysis
                        </p>
                        <h2 className="mt-2 text-xl font-bold">
                          Performance Breakdown
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Your two primary assessment dimensions from this interview.
                        </p>
                      </div>
                      <span className="hidden sm:block rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[10px] text-slate-500">
                        /10 scale
                      </span>
                    </div>

                    <div className="mt-8 space-y-7">
                      {[
                        {
                          name: "Technical Skills",
                          score: technicalScore,
                          description: "Technical understanding and quality of reasoning",
                          color: "from-blue-500 to-cyan-400",
                        },
                        {
                          name: "Communication",
                          score: communicationScore,
                          description: "Clarity, explanation and response quality",
                          color: "from-violet-500 to-fuchsia-400",
                        },
                      ].map((metric) => (
                        <div key={metric.name}>
                          <div className="flex items-end justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold">
                                {metric.name}
                              </p>
                              <p className="mt-1 text-xs text-slate-600">
                                {metric.description}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-2xl font-bold">
                                {metric.score.toFixed(1)}
                              </span>
                              <span className="ml-1 text-xs text-slate-600">/10</span>
                            </div>
                          </div>

                          <div className="mt-3 h-3 rounded-full bg-slate-900 overflow-hidden border border-white/[0.04]">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${metric.color} transition-all duration-700`}
                              style={{ width: `${scorePercent(metric.score)}%` }}
                            />
                          </div>

                          <div className="mt-2 flex justify-between text-[10px] text-slate-600">
                            <span>{getScoreLabel(metric.score)}</span>
                            <span>{Math.round(scorePercent(metric.score))}%</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 grid sm:grid-cols-3 gap-3">
                      <div className="rounded-2xl border border-white/[0.06] bg-[#050811]/60 p-4">
                        <p className="text-[10px] uppercase tracking-widest text-slate-600">
                          Strongest Dimension
                        </p>
                        <p className="mt-2 text-sm font-semibold">
                          {technicalScore >= communicationScore
                            ? "Technical Skills"
                            : "Communication"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.06] bg-[#050811]/60 p-4">
                        <p className="text-[10px] uppercase tracking-widest text-slate-600">
                          Answer Average
                        </p>
                        <p className="mt-2 text-sm font-semibold">
                          {averageAnswerScore.toFixed(1)}/10
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.06] bg-[#050811]/60 p-4">
                        <p className="text-[10px] uppercase tracking-widest text-slate-600">
                          Consistency
                        </p>
                        <p className="mt-2 text-sm font-semibold">
                          {answers.length > 0
                            ? `${Math.round(
                                Math.max(0, 100 - (Math.max(...answers.map((a) => Number(a?.score ?? 0))) - Math.min(...answers.map((a) => Number(a?.score ?? 0)))) * 12)
                              )}%`
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* READINESS */}
                  <div className="rounded-3xl border border-emerald-500/15 bg-gradient-to-b from-emerald-500/[0.07] to-transparent p-6 md:p-7">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-400 font-semibold">
                      Interview Readiness
                    </p>
                    <h2 className="mt-2 text-xl font-bold">
                      {getReadinessLabel(readiness)}
                    </h2>

                    <div className="mt-8 flex justify-center">
                      <div className="relative h-40 w-40 rounded-full border-[10px] border-emerald-500/10 flex items-center justify-center">
                        <div
                          className="absolute inset-[-10px] rounded-full"
                          style={{
                            background: `conic-gradient(#10b981 ${readiness * 3.6}deg, transparent ${readiness * 3.6}deg)`,
                            WebkitMask:
                              "radial-gradient(farthest-side, transparent calc(100% - 10px), #000 0)",
                            mask:
                              "radial-gradient(farthest-side, transparent calc(100% - 10px), #000 0)",
                          }}
                        />
                        <div className="text-center">
                          <p className="text-4xl font-bold">{readiness}%</p>
                          <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-600">
                            Readiness
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="mt-7 text-sm leading-6 text-slate-400">
                      This readiness indicator combines your overall result,
                      technical assessment and communication assessment from
                      this completed interview.
                    </p>

                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                        <span className="text-xs text-slate-500">Overall performance</span>
                        <span className="text-xs font-semibold text-emerald-300">
                          {Math.round(overallScore)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                        <span className="text-xs text-slate-500">Technical capability</span>
                        <span className="text-xs font-semibold text-blue-300">
                          {technicalScore.toFixed(1)}/10
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                        <span className="text-xs text-slate-500">Communication</span>
                        <span className="text-xs font-semibold text-violet-300">
                          {communicationScore.toFixed(1)}/10
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* AI SUMMARY */}
                <section className="rounded-3xl border border-blue-500/15 bg-blue-500/[0.035] p-6 md:p-8">
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 flex-shrink-0 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/15 flex items-center justify-center font-bold">
                      AI
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-blue-400 font-semibold">
                        AI Interviewer Assessment
                      </p>
                      <h2 className="mt-2 text-xl font-bold">
                        What Interxora noticed
                      </h2>
                      <p className="mt-4 text-sm md:text-base leading-7 text-slate-300">
                        {feedback.summary ||
                          feedback.overview ||
                          "Your interview has been assessed from the answers submitted during the session. Use the question-level feedback below to understand your performance in detail."}
                      </p>
                    </div>
                  </div>
                </section>

                {/* STRENGTHS / IMPROVEMENTS */}
                <section className="grid lg:grid-cols-2 gap-6">
                  <div className="rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.025] p-6 md:p-7">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        ✓
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-semibold">
                          Positive Signals
                        </p>
                        <h2 className="mt-1 text-xl font-bold">
                          Your Strongest Areas
                        </h2>
                      </div>
                    </div>

                    <div className="mt-7 space-y-3">
                      {Array.isArray(feedback.strengths) && feedback.strengths.length > 0 ? (
                        feedback.strengths.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.035] p-4"
                          >
                            <span className="mt-0.5 text-emerald-400">✓</span>
                            <p className="text-sm leading-6 text-slate-300">
                              {item}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">
                          No separate strength list was returned by the AI assessment.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-amber-500/15 bg-amber-500/[0.025] p-6 md:p-7">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        →
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-semibold">
                          Development Areas
                        </p>
                        <h2 className="mt-1 text-xl font-bold">
                          Improve Before Your Next Interview
                        </h2>
                      </div>
                    </div>

                    <div className="mt-7 space-y-3">
                      {Array.isArray(feedback.improvements) && feedback.improvements.length > 0 ? (
                        feedback.improvements.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 rounded-2xl border border-amber-500/10 bg-amber-500/[0.035] p-4"
                          >
                            <span className="mt-0.5 text-amber-400">→</span>
                            <p className="text-sm leading-6 text-slate-300">
                              {item}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">
                          No separate improvement list was returned by the AI assessment.
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/* LIVE SPEECH ANALYTICS */}
                {isLiveReport && (
                  <section className="rounded-3xl border border-cyan-500/15 bg-cyan-500/[0.025] overflow-hidden">
                    <div className="p-6 md:p-7 border-b border-white/[0.07]">
                      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-400 font-semibold">
                            Live Interview Signals
                          </p>
                          <h2 className="mt-2 text-xl font-bold">
                            Speech Analytics
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            Measured from your browser speech session. These signals describe delivery patterns and are not judgments about confidence, honesty, or personality.
                          </p>
                        </div>
                        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/10 bg-cyan-400/[0.05] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-cyan-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                          Live Mode
                        </div>
                      </div>
                    </div>

                    {liveAnswerMetrics.length > 0 ? (
                      <div className="p-6 md:p-7">
                        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600 font-semibold">
                              Speaking Pace
                            </p>
                            <p className="mt-2 text-2xl font-bold text-cyan-300">
                              {Math.round(averageWpm)} <span className="text-sm font-medium text-slate-500">WPM</span>
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {getPaceLabel(averageWpm)}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600 font-semibold">
                              Response Time
                            </p>
                            <p className="mt-2 text-2xl font-bold text-blue-300">
                              {formatDuration(averageResponseSeconds)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Average per response
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600 font-semibold">
                              Pause Time
                            </p>
                            <p className="mt-2 text-2xl font-bold text-violet-300">
                              {formatDuration(totalPauseSeconds)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Across live responses
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600 font-semibold">
                              Filler Words
                            </p>
                            <p className="mt-2 text-2xl font-bold text-amber-300">
                              {totalFillerWords}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {fillerRate.toFixed(1)}% of spoken words
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid md:grid-cols-3 gap-4">
                          <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Spoken Words
                            </p>
                            <p className="mt-1 text-lg font-bold text-slate-200">
                              {totalSpeechWords}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Speaking Duration
                            </p>
                            <p className="mt-1 text-lg font-bold text-slate-200">
                              {formatDuration(totalSpeakingSeconds)}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Responses Analyzed
                            </p>
                            <p className="mt-1 text-lg font-bold text-slate-200">
                              {liveAnswerMetrics.length}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.025] p-4">
                          <p className="text-xs leading-6 text-slate-400">
                            <span className="font-semibold text-cyan-300">How to use this:</span>{" "}
                            Aim for a steady pace, allow short natural pauses before important points, and reduce repeated filler words when they interrupt clarity. These are coaching signals, not a pass/fail measure.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-sm text-slate-400">
                          No speech analytics were recorded for this session.
                        </p>
                        <p className="mt-2 text-xs text-slate-600">
                          This can happen if speech recognition was unavailable or no live response metrics were captured.
                        </p>
                      </div>
                    )}
                  </section>
                )}

                {/* DELIVERY ANALYSIS */}
                {Boolean(isLiveReport) && Boolean(resultData?.delivery_summary?.available) && (
                  <section className="rounded-3xl border border-violet-500/15 bg-violet-500/[0.025] overflow-hidden">
                    <div className="p-6 md:p-7 border-b border-white/[0.07]">
                      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.22em] text-violet-400 font-semibold">
                            Delivery Analysis
                          </p>
                          <h2 className="mt-2 text-xl font-bold">Interview Delivery Insights</h2>
                          <p className="mt-1 max-w-3xl text-sm text-slate-500 leading-6">
                            A transparent, heuristic analysis of pace, pauses, filler usage, and response length across your live responses. It is separate from your official interview score.
                          </p>
                        </div>
                        <div className="rounded-xl border border-violet-400/10 bg-violet-400/[0.05] px-4 py-2 text-right">
                          <p className="text-[9px] uppercase tracking-[0.18em] text-slate-600">Delivery Index</p>
                          <p className="mt-1 text-2xl font-bold text-violet-300">
                            {Number(resultData.delivery_summary.delivery_score ?? 0).toFixed(1)}
                          </p>
                          <p className="text-[10px] text-slate-600">Heuristic / 100</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 md:p-7">
                      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600 font-semibold">Average Pace</p>
                          <p className="mt-2 text-2xl font-bold text-cyan-300">
                            {Math.round(Number(resultData.delivery_summary.average_wpm ?? 0))} <span className="text-sm font-medium text-slate-500">WPM</span>
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600 font-semibold">Filler Rate</p>
                          <p className="mt-2 text-2xl font-bold text-amber-300">
                            {Number(resultData.delivery_summary.filler_rate_percent ?? 0).toFixed(1)}%
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{Number(resultData.delivery_summary.total_filler_words ?? 0)} detected</p>
                        </div>
                        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600 font-semibold">Pause Ratio</p>
                          <p className="mt-2 text-2xl font-bold text-violet-300">
                            {Number(resultData.delivery_summary.pause_ratio_percent ?? 0).toFixed(1)}%
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{formatDuration(resultData.delivery_summary.total_pause_seconds)} total</p>
                        </div>
                        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600 font-semibold">Spoken Volume</p>
                          <p className="mt-2 text-2xl font-bold text-blue-300">
                            {Number(resultData.delivery_summary.total_words ?? 0)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">words across {Number(resultData.delivery_summary.response_count ?? 0)} responses</p>
                        </div>
                      </div>

                      <div className="mt-5 grid lg:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-5">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600 font-semibold">Focus Areas</p>
                          {Array.isArray(resultData.delivery_summary.focus_areas) && resultData.delivery_summary.focus_areas.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {resultData.delivery_summary.focus_areas.map((area) => (
                                <span key={area} className="rounded-lg border border-amber-400/10 bg-amber-400/[0.05] px-3 py-1.5 text-xs text-amber-300">
                                  {area}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-slate-400">No specific delivery focus area was flagged by the configured heuristics.</p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-5">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600 font-semibold">Method</p>
                          <p className="mt-3 text-sm leading-6 text-slate-400">
                            {resultData.delivery_summary.method || "Transparent browser speech-metric heuristics."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* PHASE 3 — AI INTERVIEW INTELLIGENCE */}
                {resultData?.interview_intelligence?.available && (
                  <section className="rounded-3xl border border-cyan-500/15 bg-cyan-500/[0.025] overflow-hidden">
                    <div className="p-6 md:p-7 border-b border-white/[0.07]">
                      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-400 font-semibold">
                            AI Interview Intelligence
                          </p>
                          <h2 className="mt-2 text-xl md:text-2xl font-bold">
                            Your Interview Intelligence Profile
                          </h2>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                            A complete coaching profile built from your interview answers, existing AI assessment, question performance, and live delivery signals when available.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.05] px-5 py-3 text-right">
                          <p className="text-[9px] uppercase tracking-[0.18em] text-slate-600">Readiness</p>
                          <p className="mt-1 text-3xl font-bold text-cyan-300">
                            {Number(resultData.interview_intelligence.overall_readiness ?? 0).toFixed(0)}%
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {resultData.interview_intelligence.readiness_label || "Building Readiness"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 md:p-7 space-y-6">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          ["Technical", resultData.interview_intelligence.technical_readiness, "text-blue-300", "bg-blue-500"],
                          ["Communication", resultData.interview_intelligence.communication_readiness, "text-violet-300", "bg-violet-500"],
                          ["Problem Solving", resultData.interview_intelligence.problem_solving_readiness, "text-emerald-300", "bg-emerald-500"],
                          ["Delivery", resultData.interview_intelligence.delivery_readiness, "text-amber-300", "bg-amber-500"],
                        ].map(([label, value, textClass, barClass]) => {
                          const numericValue = value === null || value === undefined ? null : Math.max(0, Math.min(100, Number(value) || 0));
                          return (
                            <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[10px] uppercase tracking-[0.17em] text-slate-600 font-semibold">{label}</p>
                                <p className={`text-lg font-bold ${textClass}`}>
                                  {numericValue === null ? "—" : `${Math.round(numericValue)}%`}
                                </p>
                              </div>
                              <div className="mt-4 h-1.5 rounded-full bg-slate-900 overflow-hidden">
                                {numericValue !== null && (
                                  <div className={`h-full rounded-full ${barClass}`} style={{ width: `${numericValue}%` }} />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid lg:grid-cols-2 gap-6">
                        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.025] p-5">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-400 font-semibold">Strengths</p>
                          <div className="mt-4 space-y-3">
                            {Array.isArray(resultData.interview_intelligence.strengths) && resultData.interview_intelligence.strengths.length > 0 ? (
                              resultData.interview_intelligence.strengths.map((item, index) => (
                                <div key={`${index}-${item}`} className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-black/10 p-3">
                                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-xs text-emerald-300">✓</span>
                                  <p className="text-sm leading-6 text-slate-300">{item}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-slate-500">No specific strength signal was generated yet.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.025] p-5">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-400 font-semibold">Focus Areas</p>
                          <div className="mt-4 space-y-3">
                            {Array.isArray(resultData.interview_intelligence.focus_areas) && resultData.interview_intelligence.focus_areas.length > 0 ? (
                              resultData.interview_intelligence.focus_areas.map((item, index) => (
                                <div key={`${index}-${item}`} className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-black/10 p-3">
                                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-xs text-amber-300">→</span>
                                  <p className="text-sm leading-6 text-slate-300">{item}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-slate-500">No specific focus area was flagged.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {Array.isArray(resultData.interview_intelligence.difficulty_analysis) && resultData.interview_intelligence.difficulty_analysis.length > 0 && (
                        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5">
                          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.18em] text-blue-400 font-semibold">Question Difficulty</p>
                              <h3 className="mt-2 text-base font-semibold">Performance by difficulty</h3>
                            </div>
                            <p className="text-xs text-slate-600">
                              {Number(resultData.interview_intelligence.responses_analyzed ?? answers.length ?? 0)} responses analyzed
                            </p>
                          </div>
                          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {resultData.interview_intelligence.difficulty_analysis.map((item, index) => (
                              <div key={`${item?.difficulty || "difficulty"}-${index}`} className="rounded-xl border border-white/[0.06] bg-black/10 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs font-semibold capitalize text-slate-300">{item?.difficulty || "Unknown"}</span>
                                  <span className="text-sm font-bold text-cyan-300">{Number(item?.average_score ?? 0).toFixed(1)}/10</span>
                                </div>
                                <p className="mt-2 text-xs text-slate-600">{Number(item?.responses ?? 0)} response{Number(item?.responses ?? 0) === 1 ? "" : "s"}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.025] p-5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-cyan-400/10 border border-cyan-400/15 flex items-center justify-center text-cyan-300">✦</div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-400 font-semibold">AI Coach Summary</p>
                            <p className="mt-1 text-sm font-semibold text-slate-200">Personalized interview guidance</p>
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-slate-400">
                          {resultData.interview_intelligence.coaching_summary || "Complete additional interviews to build a stronger personalized coaching baseline."}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[0.05] bg-black/10 px-4 py-3">
                        <p className="text-[11px] leading-5 text-slate-600">
                          Intelligence and readiness metrics are coaching analytics. They do not modify your official interview score.
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                {/* ANSWER PERFORMANCE */}
                <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">
                  <div className="p-6 md:p-7 border-b border-white/[0.07]">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-violet-400 font-semibold">
                          Response Analytics
                        </p>
                        <h2 className="mt-2 text-xl font-bold">
                          Answer Performance
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          See how your individual responses performed across the interview.
                        </p>
                      </div>
                      <div className="text-xs text-slate-600">
                        {answers.length} evaluated response{answers.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8">
                    {answers.length > 0 ? (
                      <div className="space-y-3">
                        {answers.map((item, index) => {
                          const score = Number(item?.score ?? 0);
                          const style = getScoreStyle(score);
                          const width = scorePercent(score);

                          return (
                            <div key={item?.id || index} className="group">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 flex-shrink-0 rounded-xl border border-white/[0.07] bg-white/[0.025] flex items-center justify-center text-xs font-bold text-slate-400">
                                  {index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-medium text-slate-400 truncate">
                                      {item?.question_text || `Question ${index + 1}`}
                                    </p>
                                    <span className={`text-xs font-bold ${style.badge.split(" ").pop()}`}>
                                      {score.toFixed(1)}/10
                                    </span>
                                  </div>
                                  <div className="mt-2 h-2 rounded-full bg-slate-900 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full bg-gradient-to-r ${style.bar} transition-all duration-500`}
                                      style={{ width: `${width}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-sm text-slate-600">
                        Individual answer scores are not available.
                      </div>
                    )}
                  </div>
                </section>

                {/* STRONGEST / LOWEST ANSWERS */}
                <section className="grid lg:grid-cols-2 gap-6">
                  <div className="rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.025] p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-semibold">
                          Top Responses
                        </p>
                        <h2 className="mt-2 text-lg font-bold">
                          Strongest Answers
                        </h2>
                      </div>
                      <span className="text-xl">🏆</span>
                    </div>

                    <div className="mt-6 space-y-3">
                      {strongestAnswers.length > 0 ? (
                        strongestAnswers.map((item, index) => (
                          <div
                            key={item?.id || index}
                            className="rounded-2xl border border-white/[0.06] bg-[#050811]/50 p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[10px] uppercase tracking-widest text-slate-600">
                                Q{item?.question_number || index + 1}
                              </span>
                              <span className="text-sm font-bold text-emerald-400">
                                {Number(item?.score ?? 0).toFixed(1)}/10
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-medium leading-6 text-slate-300">
                              {item?.question_text || "Question"}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-600">No answer data available.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-amber-500/15 bg-amber-500/[0.025] p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-semibold">
                          Focus Responses
                        </p>
                        <h2 className="mt-2 text-lg font-bold">
                          Answers To Revisit
                        </h2>
                      </div>
                      <span className="text-xl">↗</span>
                    </div>

                    <div className="mt-6 space-y-3">
                      {improvementAnswers.length > 0 ? (
                        improvementAnswers.map((item, index) => (
                          <div
                            key={item?.id || index}
                            className="rounded-2xl border border-white/[0.06] bg-[#050811]/50 p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[10px] uppercase tracking-widest text-slate-600">
                                Q{item?.question_number || index + 1}
                              </span>
                              <span className="text-sm font-bold text-amber-400">
                                {Number(item?.score ?? 0).toFixed(1)}/10
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-medium leading-6 text-slate-300">
                              {item?.question_text || "Question"}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-600">No answer data available.</p>
                      )}
                    </div>
                  </div>
                </section>

                {/* QUESTION REVIEW */}
                <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">
                  <div className="p-6 md:p-8 border-b border-white/[0.07]">
                    <div className="flex items-start gap-4">
                      <div className="h-11 w-11 rounded-2xl bg-blue-500/10 border border-blue-500/10 flex items-center justify-center text-blue-300">
                        #
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-blue-400 font-semibold">
                          Deep Review
                        </p>
                        <h2 className="mt-2 text-xl font-bold">
                          Question-by-Question Analysis
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Expand any question to inspect your answer, score and AI feedback.
                        </p>
                      </div>
                    </div>
                  </div>

                  {answers.length > 0 ? (
                    <div className="divide-y divide-white/[0.06]">
                      {answers.map((item, index) => {
                        const score = Number(item?.score ?? 0);
                        const open = expandedQuestion === (item?.id || index);
                        const style = getScoreStyle(score);

                        return (
                          <article key={item?.id || index}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedQuestion(open ? null : item?.id || index)
                              }
                              className="w-full px-6 md:px-8 py-5 text-left transition hover:bg-white/[0.025]"
                            >
                              <div className="flex items-center gap-4">
                                <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-slate-900 border border-white/[0.06] flex items-center justify-center text-xs font-bold text-slate-400">
                                  {index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                                    Question {item?.question_number || index + 1}
                                  </p>
                                  <p className="mt-1 text-sm md:text-base font-semibold leading-6 text-slate-200 truncate">
                                    {item?.question_text || `Question ${index + 1}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`hidden sm:inline-flex rounded-lg border px-2.5 py-1 text-xs ${style.badge}`}>
                                    {score.toFixed(1)}/10
                                  </span>
                                  <span className="text-slate-500 text-lg">
                                    {open ? "−" : "+"}
                                  </span>
                                </div>
                              </div>
                            </button>

                            {open && (
                              <div className="px-6 md:px-8 pb-7 pt-1 bg-black/10">
                                <div className="grid xl:grid-cols-2 gap-4">
                                  <div className="rounded-2xl border border-white/[0.07] bg-[#050811]/70 p-5">
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600 font-semibold">
                                        Your Answer
                                      </p>
                                      <span className={`sm:hidden rounded-lg border px-2 py-1 text-[10px] ${style.badge}`}>
                                        {score.toFixed(1)}/10
                                      </span>
                                    </div>
                                    <p className="mt-3 text-sm leading-7 text-slate-300 whitespace-pre-wrap">
                                      {item?.answer_text || "No answer provided."}
                                    </p>
                                  </div>

                                  <div className="rounded-2xl border border-blue-500/10 bg-blue-500/[0.035] p-5">
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-blue-400 font-semibold">
                                      AI Evaluation
                                    </p>
                                    <p className="mt-3 text-sm leading-7 text-slate-300">
                                      {item?.feedback || "No individual feedback was returned."}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 grid sm:grid-cols-3 gap-3">
                                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-600">
                                      Score
                                    </p>
                                    <p className="mt-1 text-sm font-bold">
                                      {score.toFixed(1)}/10
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-600">
                                      Evaluation Level
                                    </p>
                                    <p className="mt-1 text-sm font-bold">
                                      {getScoreLabel(score)}
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-600">
                                      Response
                                    </p>
                                    <p className="mt-1 text-sm font-bold">
                                      {item?.answer_text?.trim() ? "Submitted" : "Missing"}
                                    </p>
                                  </div>
                                </div>

                                {item?.response_mode === "live" && item?.speech_metrics && (
                                  <div className="mt-4 rounded-2xl border border-cyan-500/10 bg-cyan-500/[0.025] p-5">
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-400 font-semibold">
                                          Delivery Signals
                                        </p>
                                        <p className="mt-1 text-xs text-slate-600">
                                          Measured for this response
                                        </p>
                                      </div>
                                      <span className="rounded-lg border border-cyan-400/10 bg-cyan-400/[0.05] px-2.5 py-1 text-[10px] uppercase tracking-wider text-cyan-300">
                                        Live
                                      </span>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                                      <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                                        <p className="text-[10px] text-slate-600">WPM</p>
                                        <p className="mt-1 text-sm font-bold text-slate-200">
                                          {Math.round(Number(item.speech_metrics?.wpm ?? 0))}
                                        </p>
                                      </div>
                                      <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                                        <p className="text-[10px] text-slate-600">Words</p>
                                        <p className="mt-1 text-sm font-bold text-slate-200">
                                          {Number(item.speech_metrics?.word_count ?? 0)}
                                        </p>
                                      </div>
                                      <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                                        <p className="text-[10px] text-slate-600">Response</p>
                                        <p className="mt-1 text-sm font-bold text-slate-200">
                                          {formatDuration(item.speech_metrics?.response_duration_seconds)}
                                        </p>
                                      </div>
                                      <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                                        <p className="text-[10px] text-slate-600">Speaking</p>
                                        <p className="mt-1 text-sm font-bold text-slate-200">
                                          {formatDuration(item.speech_metrics?.speaking_duration_seconds)}
                                        </p>
                                      </div>
                                      <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                                        <p className="text-[10px] text-slate-600">Pauses</p>
                                        <p className="mt-1 text-sm font-bold text-slate-200">
                                          {formatDuration(item.speech_metrics?.pause_duration_seconds)}
                                        </p>
                                      </div>
                                      <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                                        <p className="text-[10px] text-slate-600">Fillers</p>
                                        <p className="mt-1 text-sm font-bold text-slate-200">
                                          {Number(item.speech_metrics?.filler_word_count ?? 0)}
                                        </p>
                                      </div>
                                    </div>

                                    {item?.delivery_analytics && (
                                      <div className="mt-4 grid lg:grid-cols-2 gap-3">
                                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
                                          <div className="flex items-center justify-between gap-3">
                                            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-600">Delivery Index</p>
                                            <span className="text-sm font-bold text-violet-300">
                                              {Number(item.delivery_analytics.delivery_score ?? 0).toFixed(1)}/100
                                            </span>
                                          </div>
                                          <div className="mt-3 h-2 rounded-full bg-slate-900 overflow-hidden">
                                            <div
                                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                                              style={{
                                                width: `${Math.max(0, Math.min(100, Number(item.delivery_analytics.delivery_score ?? 0)))}%`,
                                              }}
                                            />
                                          </div>
                                          <p className="mt-2 text-[10px] text-slate-600">Heuristic coaching indicator; not part of the official score.</p>
                                        </div>

                                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
                                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-600">Observed Signals</p>
                                          <div className="mt-3 space-y-2">
                                            {(item.delivery_analytics.observations || []).map((observation, observationIndex) => (
                                              <p key={observationIndex} className="text-xs leading-5 text-slate-400">
                                                • {observation}
                                              </p>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                  </div>
                                )}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-10 text-center">
                      <p className="text-sm text-slate-600">
                        Detailed question analysis is not available for this interview.
                      </p>
                    </div>
                  )}
                </section>

                {/* AI COACH + RECOMMENDATION */}
                <section className="grid lg:grid-cols-2 gap-6">
                  <div className="rounded-3xl border border-cyan-500/15 bg-gradient-to-br from-cyan-500/[0.07] to-transparent p-6 md:p-7">
                    <div className="flex items-start gap-4">
                      <div className="h-11 w-11 flex-shrink-0 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-300">
                        ✦
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-400 font-semibold">
                          AI Coach
                        </p>
                        <h2 className="mt-2 text-xl font-bold">
                          Your next coaching tip
                        </h2>
                        <p className="mt-4 text-sm leading-7 text-slate-300">
                          {feedback.coach_tip ||
                            "Practice structured answers, explain your reasoning clearly, and support technical claims with concrete examples."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.07] to-transparent p-6 md:p-7">
                    <div className="flex items-start gap-4">
                      <div className="h-11 w-11 flex-shrink-0 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-300">
                        →
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-violet-400 font-semibold">
                          Final Assessment
                        </p>
                        <h2 className="mt-2 text-xl font-bold">
                          What to do next
                        </h2>
                        <p className="mt-4 text-sm leading-7 text-slate-300">
                          {feedback.recommendation ||
                            "Use the lowest-scoring responses as your preparation priorities, then take another interview to measure your progress."}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* FINAL REPORT SUMMARY */}
                <section className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-gradient-to-r from-white/[0.045] to-white/[0.015] p-7 md:p-9">
                  <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-500/[0.06] blur-3xl" />
                  <div className="relative">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-semibold">
                          Final Report Summary
                        </p>
                        <h2 className="mt-2 text-2xl font-bold">
                          {performanceLabel}
                        </h2>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-3xl font-bold">{Math.round(overallScore)}%</p>
                        <p className="text-xs text-slate-600 mt-1">Final assessment score</p>
                      </div>
                    </div>

                    <p className="mt-6 max-w-4xl text-sm md:text-base leading-7 text-slate-300">
                      {feedback.summary ||
                        "Your interview result is now saved. Review your question-level feedback and use the improvement areas to guide your next practice session."}
                    </p>
                  </div>
                </section>

                {/* ACTIONS */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/[0.035] px-7 py-3.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    ← Back to Dashboard
                  </button>

                  <button
                    onClick={() => navigate("/interview")}
                    className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-7 py-3.5 text-sm font-semibold shadow-xl shadow-blue-500/10 transition hover:from-blue-500 hover:to-violet-500"
                  >
                    Start Another Interview →
                  </button>
                </div>

                <footer className="pt-5 text-center">
                  <p className="text-[10px] text-slate-700">
                    Interxora.ai • AI-powered interview assessment
                  </p>
                </footer>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  /* =========================================================
     MAIN INTERVIEW WORKSPACE
  ========================================================= */

  const interviewType = interview.interview_type || "Technical";
  const difficulty = interview.difficulty || "Adaptive";
  const role = interview.role || "Software Developer";
  const experience =
    interview.experience_level ||
    savedConfig.experience_level ||
    "Not specified";
  const duration = interview.time_limit || savedConfig.time_limit || 15;

  const questionText =
    currentQuestion?.question_text ||
    currentQuestion?.question ||
    currentQuestion?.text ||
    "Your next interview question is being prepared.";

  const recommendedWords =
    interviewType.toLowerCase().includes("behavior") ||
    interviewType.toLowerCase().includes("hr")
      ? 80
      : 50;

  const clearAnswer = () => {
    try {
      localStorage.removeItem(getDraftKey());
    } catch {
      // Ignore storage failures.
    }
    setAnswer("");
    resetSpeechState();
    setDraftSaved(false);
    setShowClearConfirm(false);
  };

  const saveDraftNow = () => {
    if (!answer.trim()) return;
    try {
      localStorage.setItem(getDraftKey(), answer);
      setDraftSaved(true);
    } catch {
      setDraftSaved(false);
    }
  };

  const progressWidth = Math.max(0, Math.min(100, progress));

  return (
    <div className="min-h-screen bg-[#060910] text-white selection:bg-blue-500/30">
      {/* =====================================================
          PREMIUM INTERVIEW HEADER
      ===================================================== */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#060910]/95 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-[1480px] items-center justify-between gap-4 px-4 md:px-7">
          <div className="flex min-w-0 items-center gap-4">
            <Brand />

            <div className="hidden h-8 w-px bg-white/[0.08] lg:block" />

            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-sm font-semibold text-slate-200">
                {role}
              </p>
              <p className="text-[11px] text-slate-500">
                {interviewType} assessment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.06] px-3.5 py-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/50" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11px] font-medium text-emerald-300">
                Interview Live
              </span>
            </div>

            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 md:px-4 ${
                timeCritical
                  ? "border-rose-500/30 bg-rose-500/[0.09] text-rose-300"
                  : timeWarning
                    ? "border-amber-500/25 bg-amber-500/[0.08] text-amber-300"
                    : "border-white/[0.08] bg-white/[0.025] text-slate-200"
              }`}
            >
              <span className="text-sm">◷</span>
              <div className="leading-none">
                <p className="hidden text-[9px] uppercase tracking-widest text-slate-600 sm:block">
                  Remaining
                </p>
                <p className="mt-0.5 font-mono text-sm font-semibold tracking-wide">
                  {formattedTime}
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/dashboard")}
              disabled={submitting || starting}
              className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-2.5 text-xs font-medium text-slate-400 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 md:px-4 md:text-sm"
            >
              Exit Interview
            </button>
          </div>
        </div>

        {/* GLOBAL QUESTION PROGRESS */}
        <div className="h-px bg-white/[0.035]">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-violet-500 transition-all duration-700"
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-4 py-5 md:px-7 md:py-7">
        {/* ===================================================
            PREMIUM START / INTERVIEW BRIEFING
        =================================================== */}
        {interview.status !== "started" && (
          <div className="mx-auto max-w-5xl py-5 md:py-10">
            <div className="text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.055] px-3.5 py-2 text-[11px] font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Interview Ready
              </div>

              <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-400">
                Your Interview
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-white md:text-6xl">
                {role}
              </h1>

              <p className="mt-3 text-lg text-slate-400 md:text-xl">
                {interviewType} Interview
              </p>

              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
                A focused assessment designed to simulate a real interview
                environment. Take your time, explain your thinking, and approach
                each question as you would in a professional interview.
              </p>
            </div>

            {/* OVERVIEW */}
            <section className="mt-10 overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#0a101a] shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5 md:px-8">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                    Interview Overview
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-100">
                    Know your session before you begin
                  </h2>
                </div>

                <div className="hidden items-center gap-2 rounded-full border border-blue-500/15 bg-blue-500/[0.06] px-3 py-1.5 sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  <span className="text-[10px] font-medium text-blue-300">
                    Structured assessment
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2">
                {[
                  ["Role", role],
                  ["Interview", interviewType],
                  ["Difficulty", difficulty],
                  ["Questions", maxQuestions],
                  ["Duration", `${duration} minutes`],
                  ["Experience", experience],
                ].map(([label, value], index) => (
                  <div
                    key={label}
                    className={`flex items-center justify-between gap-5 border-white/[0.055] px-6 py-4 md:px-8 ${
                      index % 2 === 0 ? "md:border-r" : ""
                    } ${index < 4 ? "border-b" : "md:border-b-0"}`}
                  >
                    <span className="text-xs text-slate-600">{label}</span>
                    <span className="max-w-[65%] truncate text-right text-sm font-medium text-slate-200">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* WHAT WE ARE LOOKING FOR */}
            <section className="mt-6">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-400">
                    What good looks like
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    How to approach the interview
                  </h2>
                </div>
                <span className="hidden text-[11px] text-slate-600 sm:block">
                  Keep it clear. Keep it practical.
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {[
                  {
                    number: "01",
                    title: "Clear thinking",
                    text: "Structure your approach before jumping to a solution.",
                  },
                  {
                    number: "02",
                    title: "Technical depth",
                    text: "Explain why you chose an approach and what you would trade off.",
                  },
                  {
                    number: "03",
                    title: "Communication",
                    text: "Make your reasoning easy for an interviewer to follow.",
                  },
                ].map((item) => (
                  <div
                    key={item.number}
                    className="group rounded-2xl border border-white/[0.08] bg-white/[0.022] p-5 transition hover:-translate-y-0.5 hover:border-blue-500/20 hover:bg-blue-500/[0.035]"
                  >
                    <span className="font-mono text-[10px] text-blue-400/70">
                      {item.number}
                    </span>
                    <h3 className="mt-5 text-sm font-semibold text-slate-100">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* BEFORE YOU BEGIN */}
            <section className="mt-6 rounded-[24px] border border-white/[0.08] bg-white/[0.022] p-6 md:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/15 bg-blue-500/[0.07] text-blue-300">
                  ✓
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-400">
                    Before you begin
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    A few things worth remembering
                  </h2>
                </div>
              </div>

              <div className="mt-6 grid gap-x-8 gap-y-4 md:grid-cols-2">
                {[
                  "Answer each question in your own words.",
                  "Take a moment to understand the question before responding.",
                  "Explain your reasoning, not just the final answer.",
                  "For technical questions, mention trade-offs when relevant.",
                  "Use concrete examples when they strengthen your answer.",
                  "There is no need to rush — clarity matters.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] text-emerald-400">
                      ✓
                    </span>
                    <p className="text-sm leading-6 text-slate-400">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* APPROACH */}
            <section className="mt-6 overflow-hidden rounded-[24px] border border-blue-500/15 bg-gradient-to-r from-blue-500/[0.06] via-blue-500/[0.025] to-violet-500/[0.035] p-6 md:p-7">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-400">
                    Interview approach
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-white">
                    Treat this like a real conversation.
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Questions may adapt to your responses throughout the session.
                    Follow-up questions can become deeper or easier depending on
                    how you approach the previous answer.
                  </p>
                </div>

                <div className="shrink-0 rounded-2xl border border-white/[0.07] bg-black/20 px-5 py-4 text-left md:min-w-[210px]">
                  <p className="text-[9px] uppercase tracking-widest text-slate-600">
                    Session mindset
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-200">
                    Clarity over speed
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Reasoning over memorization
                  </p>
                </div>
              </div>
            </section>

            {error && (
              <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/[0.07] px-5 py-4 text-sm text-rose-300">
                {error}
              </div>
            )}

            {/* CTA */}
            <section className="mt-9 text-center">
              <p className="text-sm font-medium text-slate-300">
                Ready when you are.
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Your first question will appear after you begin.
              </p>

              <button
                onClick={handleStartInterview}
                disabled={starting}
                className="group mt-5 inline-flex min-w-[260px] items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-blue-600/10 transition hover:-translate-y-0.5 hover:from-blue-500 hover:to-violet-500 hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {starting ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Preparing your interview...
                  </>
                ) : (
                  <>
                    Begin Interview
                    <span className="text-lg transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </>
                )}
              </button>

              <p className="mt-4 text-[11px] text-slate-600">
                {duration} min · {maxQuestions} questions · {interviewType}
              </p>
            </section>
          </div>
        )}

        {/* ===================================================
            LIVE INTERVIEW WORKSPACE
        =================================================== */}
        {interview.status === "started" && (
          <div className="space-y-5">
            {/* TOP SESSION STRIP */}
            <section className="rounded-2xl border border-white/[0.08] bg-[#0a1019] px-5 py-4 md:px-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-blue-500/15 bg-blue-500/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                      Question {currentNumber} / {maxQuestions}
                    </span>
                    <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[10px] text-slate-500">
                      {interviewType}
                    </span>
                    <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[10px] text-slate-500">
                      {difficulty}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] ${
                        isLiveInterview
                          ? "border-cyan-400/15 bg-cyan-400/[0.05] text-cyan-300"
                          : "border-white/[0.07] bg-white/[0.025] text-slate-500"
                      }`}
                    >
                      {isLiveInterview ? "Live Interview" : "Practice Mode"}
                    </span>
                  </div>
                </div>

                <div className="min-w-[230px] md:text-right">
                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <span className="text-[10px] uppercase tracking-widest text-slate-600">
                      Session progress
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      {Math.round(progressWidth)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06] md:ml-auto md:w-[230px]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-700"
                      style={{ width: `${progressWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_250px]">
              {/* =================================================
                  LEFT — INTERVIEW FLOW
              ================================================= */}
              <aside className="space-y-5">
                <section className="rounded-2xl border border-white/[0.08] bg-[#0a1019] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                    Interview Flow
                  </p>

                  <div className="mt-5 space-y-1.5">
                    {Array.from({ length: maxQuestions }, (_, index) => {
                      const number = index + 1;
                      const done = number < currentNumber;
                      const active = number === currentNumber;

                      return (
                        <div
                          key={number}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                            active
                              ? "border border-blue-500/15 bg-blue-500/[0.07]"
                              : "border border-transparent"
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                              done
                                ? "bg-emerald-500/10 text-emerald-400"
                                : active
                                  ? "bg-blue-500/15 text-blue-300"
                                  : "bg-white/[0.035] text-slate-600"
                            }`}
                          >
                            {done ? "✓" : number}
                          </span>
                          <span
                            className={`text-xs ${
                              active
                                ? "font-medium text-blue-200"
                                : done
                                  ? "text-slate-500"
                                  : "text-slate-600"
                            }`}
                          >
                            Question {number}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-2xl border border-white/[0.08] bg-[#0a1019] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                    Current Focus
                  </p>
                  <h3 className="mt-3 text-sm font-semibold text-slate-200">
                    {interviewType}
                  </h3>
                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Difficulty</span>
                      <span className="text-slate-300">{difficulty}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Experience</span>
                      <span className="max-w-[110px] truncate text-slate-300">
                        {experience}
                      </span>
                    </div>
                  </div>
                </section>
              </aside>

              {/* =================================================
                  CENTER — QUESTION + ANSWER
              ================================================= */}
              <section className="min-w-0">
                {/* QUESTION */}
                <section className="overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#0a1019]">
                  <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 md:px-7">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/15 bg-blue-500/[0.07] text-sm text-blue-300">
                        {String(currentNumber).padStart(2, "0")}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400">
                          Current Question
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-600">
                          Take a moment before you answer.
                        </p>
                      </div>
                    </div>

                    <div className="hidden items-center gap-2 sm:flex">
                      <span className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-[10px] text-slate-500">
                        {interviewType}
                      </span>
                      <span className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-[10px] text-slate-500">
                        {difficulty}
                      </span>
                    </div>
                  </div>

                  <div className="px-6 py-8 md:px-8 md:py-10">
                    {currentQuestion ? (
                      <h1 className="max-w-4xl text-2xl font-medium leading-[1.5] tracking-[-0.015em] text-slate-50 md:text-[30px]">
                        {questionText}
                      </h1>
                    ) : (
                      <div className="space-y-3 animate-pulse">
                        <div className="h-7 w-5/6 rounded-lg bg-white/[0.06]" />
                        <div className="h-7 w-4/6 rounded-lg bg-white/[0.06]" />
                      </div>
                    )}

                    <div className="mt-8 rounded-2xl border border-white/[0.065] bg-white/[0.018] p-5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-xs text-slate-400">
                          ✓
                        </span>
                        <p className="text-xs font-semibold text-slate-300">
                          Interviewer expectations
                        </p>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {[
                          "Explain your assumptions",
                          "Structure your reasoning",
                          "Mention trade-offs when relevant",
                          "Use concrete examples where useful",
                        ].map((item) => (
                          <div key={item} className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="h-1 w-1 rounded-full bg-blue-400/70" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* ANSWER COMPOSER */}
                <section
                  className={`mt-5 overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#0a1019] ${
                    isEditorFullscreen
                      ? "fixed inset-4 z-[100] mt-0 flex flex-col shadow-2xl shadow-black/70 md:inset-8"
                      : ""
                  }`}
                >
                  <div className="border-b border-white/[0.07] px-5 py-4 md:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-500/15 bg-blue-500/[0.07] text-sm text-blue-300">
                          ✎
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-slate-200">
                            {isLiveInterview ? "Live interview response" : "Your response"}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-600">
                            {isLiveInterview
                              ? "Camera monitoring and speech analysis are active for this session."
                              : "Write a clear, structured response."}
                          </p>
                        </div>
                      </div>

                      {isLiveInterview && (
                        <span className="flex items-center gap-1.5 rounded-full border border-cyan-400/10 bg-cyan-400/[0.05] px-2.5 py-1.5 text-[9px] font-medium text-cyan-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                          Live Mode
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 md:p-5">
                    <div className="relative">
                      {isLiveInterview ? (
                        <div className={isEditorFullscreen ? "min-h-0 flex-1 overflow-y-auto" : ""}>
                          <SpeechInput
                            key={`${id}-${currentQuestion?.id || currentQuestionIndex}-${speechInstanceKey}`}
                            value={answer}
                            onChange={handleAnswerChange}
                            onSpeechMetrics={handleSpeechMetrics}
                            language="en-US"
                            disabled={submitting || !currentQuestion}
                          />
                        </div>
                      ) : (
                        <textarea
                          value={answer}
                          onChange={(e) => {
                            setAnswer(e.target.value);
                            setDraftSaved(false);
                          }}
                          disabled={submitting || !currentQuestion}
                          autoFocus
                          placeholder="Write your response here..."
                          className={`w-full resize-none rounded-2xl border border-white/[0.075] bg-[#070c14] px-5 py-5 text-sm leading-7 text-slate-100 outline-none transition placeholder:text-slate-700 focus:border-blue-500/35 focus:ring-4 focus:ring-blue-500/[0.05] disabled:cursor-not-allowed disabled:opacity-60 md:text-[15px] ${
                            isEditorFullscreen ? "min-h-0 flex-1" : "min-h-[250px] md:min-h-[300px]"
                          }`}
                        />
                      )}

                      {submitting && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#070c14]/80 backdrop-blur-sm">
                          <div className="text-center">
                            <div className="mx-auto h-8 w-8 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
                            <p className="mt-4 text-sm font-medium text-slate-200">
                              Evaluating your response
                            </p>
                            <p className="mt-1 text-[11px] text-slate-600">
                              Preparing the next part of your interview...
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-col gap-3 border-t border-white/[0.05] pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-600">
                        <span>
                          Words:{" "}
                          <strong className="font-medium text-slate-400">
                            {wordCount}
                          </strong>
                        </span>
                        {isLiveInterview && (
                          <>
                            <span>
                              Pace:{" "}
                              <strong className="font-medium text-slate-400">
                                {speechMetrics.wpm || 0} WPM
                              </strong>
                            </span>
                            <span>
                              Fillers:{" "}
                              <strong className="font-medium text-slate-400">
                                {speechMetrics.fillerWordCount || 0}
                              </strong>
                            </span>
                          </>
                        )}
                        <span>
                          Recommended:{" "}
                          <strong className="font-medium text-slate-400">
                            {recommendedWords}+ words
                          </strong>
                        </span>
                        <span className="hidden md:inline">
                          Ctrl + Enter to submit
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-600">
                          {draftSaved ? "Draft saved" : "Unsaved changes"}
                        </span>
                        <button
                          onClick={() =>
                            setIsEditorFullscreen((prev) => !prev)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.02] text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
                          title={
                            isEditorFullscreen
                              ? "Exit fullscreen"
                              : "Fullscreen editor"
                          }
                        >
                          {isEditorFullscreen ? "×" : "⛶"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="mx-4 mb-4 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 md:mx-5">
                      <span className="text-rose-400">!</span>
                      <p className="text-xs leading-5 text-rose-300">{error}</p>
                    </div>
                  )}

                  <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (answer.trim()) setShowClearConfirm(true);
                        }}
                        disabled={!answer.trim() || submitting}
                        className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        Clear
                      </button>

                      <button
                        onClick={saveDraftNow}
                        disabled={!answer.trim() || submitting}
                        className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        Save Draft
                      </button>
                    </div>

                    <button
                      onClick={handleSubmitAnswer}
                      disabled={
                        submitting || !answer.trim() || !currentQuestion
                      }
                      className="group flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/10 transition hover:-translate-y-0.5 hover:from-blue-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
                    >
                      {submitting ? (
                        <>
                          <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                          Evaluating...
                        </>
                      ) : (
                        <>
                          {currentNumber >= maxQuestions
                            ? "Submit Final Answer"
                            : "Submit Answer"}
                          <span className="text-lg transition-transform group-hover:translate-x-1">
                            →
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </section>

                {/* EVALUATION TRANSITION */}
                {submitting && (
                  <section className="mt-4 rounded-2xl border border-blue-500/15 bg-blue-500/[0.045] px-5 py-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/15 bg-blue-500/[0.08]">
                        <span className="h-4 w-4 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-blue-200">
                          Response received
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-600">
                          Assessing technical reasoning, structure, communication,
                          and completeness before preparing the next question.
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                <div className="mt-4 flex items-center justify-between px-1">
                  <p className="text-[10px] text-slate-700">
                    Interxora.ai · Professional interview assessment
                  </p>
                  <p className="hidden text-[10px] text-slate-700 sm:block">
                    {currentNumber} of {maxQuestions}
                  </p>
                </div>
              </section>

              {/* =================================================
                  RIGHT — SESSION PANEL
              ================================================= */}
              <aside className="space-y-5">
                {/* LIVE MODE — CAMERA */}
                {isLiveInterview && (
                  <CameraMonitor enabled={isLiveInterview} autoStart />
                )}

                <section
                  className={`rounded-2xl border p-5 ${
                    timeCritical
                      ? "border-rose-500/25 bg-rose-500/[0.055]"
                      : timeWarning
                        ? "border-amber-500/20 bg-amber-500/[0.045]"
                        : "border-white/[0.08] bg-[#0a1019]"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                    Time Remaining
                  </p>
                  <div className="mt-3 flex items-end justify-between">
                    <p
                      className={`font-mono text-3xl font-semibold tracking-tight ${
                        timeCritical
                          ? "text-rose-300"
                          : timeWarning
                            ? "text-amber-300"
                            : "text-white"
                      }`}
                    >
                      {formattedTime}
                    </p>
                    <span
                      className={`mb-1 text-[10px] ${
                        timeCritical
                          ? "text-rose-400"
                          : timeWarning
                            ? "text-amber-400"
                            : "text-slate-600"
                      }`}
                    >
                      {timeCritical ? "Finish your response" : "Session clock"}
                    </span>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/[0.08] bg-[#0a1019] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] text-emerald-300">
                      •
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                        Interviewer
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-200">
                        Listening
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/[0.055] pt-4">
                    <p className="text-[10px] uppercase tracking-widest text-slate-600">
                      Current signal
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      Focus on a clear, structured response and explain the
                      decisions behind your answer.
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/[0.08] bg-[#0a1019] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                    Tips for this question
                  </p>

                  <div className="mt-4 space-y-3">
                    {[
                      "Start with your approach.",
                      "State important assumptions.",
                      "Explain trade-offs when relevant.",
                      "Be specific rather than overly broad.",
                    ].map((tip) => (
                      <div key={tip} className="flex items-start gap-2.5">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400/70" />
                        <p className="text-xs leading-5 text-slate-500">{tip}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {isLiveInterview && (
                  <section className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.02] p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.06] text-cyan-300">
                        ✦
                      </span>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/70">
                          Live Mode
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Camera monitoring is active for this session.
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.018] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                    Session Details
                  </p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-600">Role</span>
                      <span className="max-w-[130px] truncate text-right text-xs text-slate-300">
                        {role}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Mode</span>
                      <span className="max-w-[130px] truncate text-right text-xs text-slate-300">{isLiveInterview ? "Live Interview" : "Practice Mode"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Status</span>
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Live
                      </span>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        )}
      </main>

      {/* CLEAR CONFIRMATION */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.09] bg-[#0b111b] p-6 shadow-2xl shadow-black/50">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
              Clear response
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              Remove your current answer?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your current draft will be removed from this question. This action
              cannot be undone.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-2.5 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                Keep Answer
              </button>
              <button
                onClick={clearAnswer}
                className="flex-1 rounded-xl bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/15"
              >
                Clear Answer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterviewSession;



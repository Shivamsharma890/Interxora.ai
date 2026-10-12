import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import CameraMonitor from "../components/CameraMonitor";
import SpeechInput from "../components/SpeechInput";
import interxoraLogo from "../assets/interxora-logo.png";

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
      badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
      bar: "from-emerald-500 to-teal-400",
    };
  }

  if (score >= 5) {
    return {
      badge: "border-amber-500/20 bg-amber-500/10 text-amber-400",
      bar: "from-amber-500 to-orange-400",
    };
  }

  return {
    badge: "border-rose-500/20 bg-rose-500/10 text-rose-400",
    bar: "from-rose-500 to-red-400",
  };
};

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-slate-950 shadow-lg shadow-blue-500/20 transition duration-300 hover:scale-105 sm:h-14 sm:w-14">
        <img
          src={interxoraLogo}
          alt="Interxora.ai"
          className="h-full w-full object-contain p-1"
        />
      </div>

      <div>
        <h1 className="font-bold text-lg tracking-tight sm:text-xl">
          Interxora<span className="text-blue-400">.ai</span>
        </h1>

        <p className="text-[10px] text-slate-500 tracking-wide">
          AI INTERVIEW PLATFORM
        </p>
      </div>
    </div>
  );
}

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
  const faceObservationsRef = useRef(null);

  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [completed, setCompleted] = useState(false);
  const [finalFeedback, setFinalFeedback] = useState("");
  const [resultData, setResultData] = useState(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

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
      return JSON.parse(sessionStorage.getItem("interview_config") || "{}");
    } catch {
      return {};
    }
  }, []);

  const persistedMode =
    localStorage.getItem(`interxora_interview_mode_${id}`) ||
    savedConfig?.session_mode;

  const sessionMode = persistedMode === "practice" ? "practice" : "live";

  const isLiveInterview = sessionMode === "live";

  const handleFaceMetrics = useCallback((metrics) => {
    faceObservationsRef.current = metrics;
  }, []);

  const persistFaceObservations = useCallback(async () => {
    if (!isLiveInterview || !faceObservationsRef.current) return;

    try {
      await apiRequest(`/interviews/${id}/face-observations`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(faceObservationsRef.current),
      });
    } catch (err) {
      console.error("Failed to save face observations:", err);
    }
  }, [id, isLiveInterview]);

  const accessToken = localStorage.getItem("access_token");

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
  };

  const getRemainingSeconds = (interviewData) => {
    const limitMinutes = Number(interviewData?.time_limit || 0);

    if (limitMinutes <= 0) return null;

    const limitSeconds = limitMinutes * 60;
    const startedAt = interviewData?.started_at;

    const fallbackStartedAt = localStorage.getItem(
      `interxora_interview_started_at_${id}`,
    );
    const effectiveStartedAt = startedAt || fallbackStartedAt;

    if (!effectiveStartedAt) {
      return limitSeconds;
    }

    const startedTimestamp = new Date(effectiveStartedAt).getTime();

    if (Number.isNaN(startedTimestamp)) {
      return limitSeconds;
    }

    const elapsedSeconds = Math.floor((Date.now() - startedTimestamp) / 1000);

    return Math.max(limitSeconds - elapsedSeconds, 0);
  };

  const persistStartedAt = (interviewData) => {
    try {
      const startedAt = interviewData?.started_at;
      if (startedAt) {
        localStorage.setItem(`interxora_interview_started_at_${id}`, startedAt);
      }
    } catch {}
  };

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

      const legacyMode = savedConfig?.session_mode;
      if (
        !localStorage.getItem(`interxora_interview_mode_${id}`) &&
        (legacyMode === "practice" || legacyMode === "live")
      ) {
        try {
          localStorage.setItem(`interxora_interview_mode_${id}`, legacyMode);
        } catch {}
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

  const loadQuestions = async () => {
    try {
      const questionData = await apiRequest(`/interviews/${id}/questions`, {
        method: "GET",
        headers: authHeaders,
      });

      const generatedQuestions = Array.isArray(questionData)
        ? questionData
        : questionData?.questions || [];

      setQuestions(generatedQuestions);

      if (generatedQuestions.length > 0) {
        setCurrentQuestionIndex(generatedQuestions.length - 1);
      }
    } catch (err) {
      console.error("Failed to load questions:", err);
      setError(err.message || "Unable to load interview questions.");
    }
  };

  const loadInterviewResult = async () => {
    try {
      setResultLoading(true);
      setError("");

      const data = await apiRequest(`/interviews/${id}/result`, {
        method: "GET",
        headers: authHeaders,
      });

      setResultData(data);

      if (data.feedback) {
        setFinalFeedback(data.feedback);
      }
    } catch (err) {
      console.error("Failed to load interview result:", err);
      setError(err.message || "Unable to load interview result.");
    } finally {
      setResultLoading(false);
    }
  };

  const handleStartInterview = async () => {
    if (startingRef.current || starting || interview?.status === "started") {
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

      const startedInterview = await apiRequest(`/interviews/${id}/start`, {
        method: "PATCH",
        headers: authHeaders,
      });

      setInterview(startedInterview);
      persistStartedAt(startedInterview);

      setTimeLeft(getRemainingSeconds(startedInterview));

      const questionData = await apiRequest(`/interviews/${id}/questions`, {
        method: "GET",
        headers: authHeaders,
      });

      const generatedQuestions = Array.isArray(questionData)
        ? questionData
        : questionData?.questions || [];

      setQuestions(generatedQuestions);

      if (generatedQuestions.length > 0) {
        setCurrentQuestionIndex(generatedQuestions.length - 1);
      }
    } catch (err) {
      console.error("Failed to start interview:", err);
      setError(err.message || "Unable to start interview.");
    } finally {
      setStarting(false);
      startingRef.current = false;
    }
  };

  const handleSubmitAnswer = async () => {
    if (submitting) return;

    if (!answer.trim()) {
      setError("Please write an answer before submitting.");
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];

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
            filler_word_count: Number(speechMetrics.fillerWordCount || 0),
          }
        : null;

      console.log("Submitting interview response:", {
        interview_id: id,
        question_id: currentQuestion.id,
        response_mode: isLiveInterview ? "live" : "practice",
        speech_metrics: submissionMetrics,
      });

      if (isLiveInterview) {
        await persistFaceObservations();
      }

      const data = await apiRequest(`/interviews/${id}/answers`, {
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
      });

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
        setQuestions((prev) => [...prev, data.next_question]);

        setCurrentQuestionIndex((prev) => prev + 1);

        setAnswer("");
        resetSpeechState();
      } else {
        await loadQuestions();
        setAnswer("");
        resetSpeechState();
      }
    } catch (err) {
      console.error("Failed to submit answer:", err);

      setError(err.message || "Unable to submit answer.");
    } finally {
      setSubmitting(false);
    }
  };

  const timeUpRef = useRef(false);

  const handleTimeUp = useCallback(async () => {
    if (timeUpRef.current || completed) return;

    timeUpRef.current = true;
    setSubmitting(true);
    setError("");

    if (!accessToken) {
      timeUpRef.current = false;
      setSubmitting(false);
      navigate("/login");
      return;
    }

    try {
      const currentQuestion = questions[currentQuestionIndex];
      const trimmedAnswer = answer.trim();

      if (currentQuestion && trimmedAnswer) {
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
              filler_word_count: Number(speechMetrics.fillerWordCount || 0),
            }
          : null;

        if (isLiveInterview) {
          await persistFaceObservations();
        }

        const answerResponse = await apiRequest(`/interviews/${id}/answers`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question_id: currentQuestion.id,
            answer_text: trimmedAnswer,
            response_mode: isLiveInterview ? "live" : "practice",
            speech_metrics: submissionMetrics,
          }),
        });

        if (answerResponse?.completed === true) {
          setCompleted(true);
          setInterview((prev) => ({
            ...prev,
            status: "completed",
          }));
          setFinalFeedback(answerResponse?.final_feedback || "");
          setAnswer("");
          resetSpeechState();
          await loadInterviewResult();
          return;
        }
      } else if (isLiveInterview) {
        await persistFaceObservations();
      }

      const data = await apiRequest(`/interviews/${id}/complete`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      setCompleted(true);
      setInterview((prev) => ({
        ...prev,
        ...(data || {}),
        status: "completed",
      }));
      setFinalFeedback(data?.final_feedback || "");
      setAnswer("");
      resetSpeechState();

      await loadInterviewResult();
    } catch (err) {
      console.error("Failed to finalize interview after timeout:", err);
      timeUpRef.current = false;
      setError(
        err.message ||
          "Time expired, but the interview could not be finalized. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    id,
    completed,
    accessToken,
    answer,
    questions,
    currentQuestionIndex,
    speechMetrics,
    resetSpeechState,
    navigate,
    isLiveInterview,
    persistFaceObservations,
  ]);

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
  }, [timeLeft, completed, handleTimeUp]);

  const getDraftKey = () => `interxora_draft_${id}_${currentQuestionIndex}`;

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
      } catch {}
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="relative h-16 w-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-xl" />

            <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 flex items-center justify-center animate-pulse">
              <img
                src={interxoraLogo}
                alt="Interxora.ai"
                className="h-full w-full object-contain p-1"
              />
            </div>
          </div>

          <h2 className="text-xl font-semibold">Preparing your interview</h2>

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

  if (error && !interview) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-rose-500/20 bg-white/[0.03] p-8 text-center">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-2xl">
            !
          </div>

          <h1 className="text-2xl font-bold mt-5">Unable to load interview</h1>

          <p className="text-slate-400 mt-3 leading-6">{error}</p>

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

  const currentQuestion = questions[currentQuestionIndex];

  const maxQuestions =
    interview?.max_questions ?? savedConfig?.max_questions ?? 5;

  const currentNumber = currentQuestion
    ? currentQuestion.question_number || currentQuestionIndex + 1
    : 0;

  const progress =
    maxQuestions > 0 ? Math.min((currentNumber / maxQuestions) * 100, 100) : 0;

  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;

  const formattedTime =
    timeLeft !== null
      ? `${Math.floor(timeLeft / 60)
          .toString()
          .padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`
      : "--:--";

  const timeWarning = timeLeft !== null && timeLeft <= 60;

  const timeCritical = timeLeft !== null && timeLeft <= 30;

  if (completed) {
    const feedback = parseFinalFeedback(finalFeedback) || {};
    const answers = Array.isArray(resultData?.answers)
      ? resultData.answers
      : [];
    const technicalScore = Number(feedback?.technical?.score ?? 0);
    const communicationScore = Number(feedback?.communication?.score ?? 0);
    const overallScore = Number(
      resultData?.overall_score ??
        resultData?.percentage ??
        feedback?.overall_score ??
        0,
    );
    const performanceLabel =
      resultData?.performance_label ||
      feedback?.headline ||
      "Interview Assessment";
    const answeredCount = Number(
      resultData?.answered_questions ?? answers.length ?? 0,
    );
    const totalQuestions = Number(
      resultData?.total_questions ?? interview?.max_questions ?? maxQuestions,
    );
    const averageAnswerScore = answers.length
      ? answers.reduce((sum, item) => sum + Number(item?.score ?? 0), 0) /
        answers.length
      : 0;
    const isLiveReport =
      resultData?.report_mode === "live" ||
      answers.some((item) => item?.response_mode === "live");
    const face = resultData?.face_observations || {};
    const intelligence = resultData?.interview_intelligence || {};
    const scorePercent = (score) =>
      Math.max(0, Math.min(100, Number(score || 0) * 10));
    const getScoreLabel = (score) =>
      score >= 9
        ? "Excellent"
        : score >= 8
          ? "Strong"
          : score >= 6
            ? "Good"
            : score >= 4
              ? "Developing"
              : "Needs Practice";
    const formatDuration = (seconds) => {
      const value = Math.max(0, Math.round(Number(seconds || 0)));
      const minutes = Math.floor(value / 60);
      const remaining = value % 60;
      return minutes ? `${minutes}m ${remaining}s` : `${remaining}s`;
    };
    const faceSamples = Number(face?.samples || 0);
    const facePresence = Number(face?.face_presence_ratio || 0);
    const observedSeconds = Number(face?.observed_seconds || 0);
    const facePresentSeconds = Number(face?.face_present_seconds || 0);
    const noFaceEvents = Number(face?.no_face_events || 0);
    const noFaceDuration = Number(face?.no_face_duration_seconds || 0);
    const multipleFaceEvents = Number(face?.multiple_face_events || 0);
    const multipleFaceDuration = Number(
      face?.multiple_face_duration_seconds || 0,
    );
    const offCenterEvents = Number(face?.off_center_events || 0);
    const offCenterDuration = Number(face?.off_center_duration_seconds || 0);
    const lookingAwayEvents = Number(face?.looking_away_events || 0);
    const lookingAwayDuration = Number(
      face?.looking_away_duration_seconds || 0,
    );
    const facePresenceText =
      faceSamples <= 0
        ? "No camera observation data was stored for this interview."
        : `Face detection was available for ${facePresence.toFixed(1)}% of the observed session.`;
    const cameraFocus =
      faceSamples <= 0
        ? "Camera framing could not be assessed."
        : offCenterEvents || noFaceEvents
          ? "The next practice should focus on keeping the camera frame stable and the face consistently visible."
          : "The recorded framing remained within the monitor's detection conditions throughout the observed session.";
    const liveMetrics = answers.filter(
      (item) => item?.response_mode === "live" && item?.speech_metrics,
    );
    const delivery = resultData?.delivery_summary || {};
    const totalWords = liveMetrics.reduce(
      (sum, item) => sum + Number(item?.speech_metrics?.word_count || 0),
      0,
    );
    const totalSpeakingSeconds = liveMetrics.reduce(
      (sum, item) =>
        sum + Number(item?.speech_metrics?.speaking_duration_seconds || 0),
      0,
    );
    const totalResponseSeconds = liveMetrics.reduce(
      (sum, item) =>
        sum + Number(item?.speech_metrics?.response_duration_seconds || 0),
      0,
    );
    const totalPauseSeconds = liveMetrics.reduce(
      (sum, item) =>
        sum + Number(item?.speech_metrics?.pause_duration_seconds || 0),
      0,
    );
    const totalFillerWords = liveMetrics.reduce(
      (sum, item) => sum + Number(item?.speech_metrics?.filler_word_count || 0),
      0,
    );
    const aggregateWpm =
      totalSpeakingSeconds > 0 ? (totalWords / totalSpeakingSeconds) * 60 : 0;
    const fillerRate =
      totalWords > 0 ? (totalFillerWords / totalWords) * 100 : 0;
    const pauseRatio =
      totalResponseSeconds > 0
        ? (totalPauseSeconds / totalResponseSeconds) * 100
        : 0;
    const speakingRatio =
      totalResponseSeconds > 0
        ? (totalSpeakingSeconds / totalResponseSeconds) * 100
        : 0;
    const speechFocus = String(
      delivery?.observations?.[0] ||
        (aggregateWpm > 0
          ? `Your live responses averaged ${Math.round(aggregateWpm)} WPM, with ${totalFillerWords} filler words across ${liveMetrics.length} analyzed responses. Use these measurements as delivery evidence alongside the answer-quality assessment.`
          : "Speech measurements were captured for the live interview and are shown as supporting delivery evidence."),
    );
    const strengths = Array.from(
      new Set(
        (Array.isArray(feedback?.strengths) ? feedback.strengths : [])
          .map((item) => String(item).trim())
          .filter(Boolean),
      ),
    ).slice(0, 3);
    const improvements = Array.from(
      new Set(
        (Array.isArray(feedback?.improvements) ? feedback.improvements : [])
          .map((item) => String(item).trim())
          .filter(Boolean),
      ),
    ).slice(0, 3);
    const answerPattern = String(feedback?.answer_pattern || "").trim();
    const coachingFocus = String(feedback?.coaching_focus || "").trim();
    const coachTip = String(feedback?.coach_tip || "").trim();
    const framework =
      feedback?.framework && typeof feedback.framework === "object"
        ? feedback.framework
        : {};
    const nextPractice = String(feedback?.next_practice || "").trim();
    const recommendation = String(feedback?.recommendation || "").trim();
    const finalTakeaway = String(
      feedback?.final_takeaway || recommendation || "",
    ).trim();
    const readiness = Number(intelligence?.overall_readiness ?? 0);
    const statCards = [
      {
        label: "Questions",
        value: `${answeredCount}/${totalQuestions}`,
        sub: "Responses evaluated",
        icon: "#",
        tone: "blue",
      },
      {
        label: "Average Answer",
        value: `${averageAnswerScore.toFixed(1)}/10`,
        sub: "Across submitted answers",
        icon: "↗",
        tone: "violet",
      },
      {
        label: "Technical",
        value: `${technicalScore.toFixed(1)}/10`,
        sub: getScoreLabel(technicalScore),
        icon: "⌘",
        tone: "cyan",
      },
      {
        label: "Communication",
        value: `${communicationScore.toFixed(1)}/10`,
        sub: getScoreLabel(communicationScore),
        icon: "◌",
        tone: "emerald",
      },
    ];
    const toneClasses = {
      blue: "border-blue-500/15 bg-blue-500/[0.045] text-blue-300",
      violet: "border-violet-500/15 bg-violet-500/[0.045] text-violet-300",
      cyan: "border-cyan-500/15 bg-cyan-500/[0.045] text-cyan-300",
      emerald: "border-emerald-500/15 bg-emerald-500/[0.045] text-emerald-300",
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
          <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-blue-600/[0.07] blur-[130px]" />
          <div className="pointer-events-none absolute right-[-180px] top-[850px] h-[500px] w-[500px] rounded-full bg-violet-600/[0.05] blur-[130px]" />
          <div className="relative max-w-[1280px] mx-auto px-5 md:px-8 py-8 md:py-12">
            <section className="mb-8 md:mb-10">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    AI Performance Report
                  </div>
                  <h1 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
                    Your interview is complete.
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm md:text-base leading-7 text-slate-400">
                    A focused assessment of the answers you gave, the evidence
                    behind the evaluation, and the most useful next step for
                    your preparation.
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
                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs ${isLiveReport ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-300" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"}`}
                  >
                    {isLiveReport ? "Live Interview" : "Practice Mode"}
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
                          "Your completed responses have been evaluated for technical quality, communication and interview relevance."}
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
                            Responses
                          </p>
                          <p className="mt-2 text-sm font-semibold">
                            {answeredCount}/{totalQuestions}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/[0.07] bg-[#050811]/50 p-4 col-span-2 sm:col-span-1">
                          <p className="text-[10px] uppercase tracking-widest text-slate-600">
                            Mode
                          </p>
                          <p className="mt-2 text-sm font-semibold">
                            {isLiveReport ? "Live" : "Practice"}
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
                          Assessment
                        </span>
                      </div>
                      <p className="mt-5 text-2xl font-bold">{card.value}</p>
                      <p className="mt-1 text-xs font-medium text-slate-300">
                        {card.label}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-600">
                        {card.sub}
                      </p>
                    </div>
                  ))}
                </section>

                <section className="grid lg:grid-cols-[1.35fr_0.65fr] gap-6">
                  <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 md:p-7">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-blue-400 font-semibold">
                      Competency Analysis
                    </p>
                    <h2 className="mt-2 text-xl font-bold">
                      Technical & communication assessment
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      These scores describe answer quality and reasoning, not
                      live camera or speech measurements.
                    </p>
                    <div className="mt-8 space-y-7">
                      {[
                        {
                          name: "Technical Skills",
                          score: technicalScore,
                          description: "Correctness, depth and reasoning",
                          color: "from-blue-500 to-cyan-400",
                        },
                        {
                          name: "Communication",
                          score: communicationScore,
                          description: "Clarity, structure and explanation",
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
                            <div>
                              <span className="text-2xl font-bold">
                                {metric.score.toFixed(1)}
                              </span>
                              <span className="ml-1 text-xs text-slate-600">
                                /10
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 h-3 rounded-full bg-slate-900 overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${metric.color}`}
                              style={{
                                width: `${scorePercent(metric.score)}%`,
                              }}
                            />
                          </div>
                          <div className="mt-2 flex justify-between text-[10px] text-slate-600">
                            <span>{getScoreLabel(metric.score)}</span>
                            <span>
                              {Math.round(scorePercent(metric.score))}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-emerald-500/15 bg-gradient-to-b from-emerald-500/[0.07] to-transparent p-6 md:p-7">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-400 font-semibold">
                      Coaching Readiness
                    </p>
                    <h2 className="mt-2 text-xl font-bold">
                      {intelligence?.readiness_label || "Interview Readiness"}
                    </h2>
                    <div className="mt-8 flex justify-center">
                      <div className="relative h-40 w-40 rounded-full border-[10px] border-emerald-500/10 flex items-center justify-center">
                        <div
                          className="absolute inset-[-10px] rounded-full"
                          style={{
                            background: `conic-gradient(#10b981 ${Math.max(0, Math.min(100, readiness)) * 3.6}deg,transparent ${Math.max(0, Math.min(100, readiness)) * 3.6}deg)`,
                            WebkitMask:
                              "radial-gradient(farthest-side, transparent calc(100% - 10px), #000 0)",
                            mask: "radial-gradient(farthest-side, transparent calc(100% - 10px), #000 0)",
                          }}
                        />
                        <div className="text-center">
                          <p className="text-4xl font-bold">
                            {Math.round(readiness)}%
                          </p>
                          <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-600">
                            Readiness
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-7 space-y-3">
                      {[
                        [
                          "Technical readiness",
                          intelligence?.technical_readiness,
                          "text-blue-300",
                        ],
                        [
                          "Communication readiness",
                          intelligence?.communication_readiness,
                          "text-violet-300",
                        ],
                        [
                          "Problem-solving readiness",
                          intelligence?.problem_solving_readiness,
                          "text-emerald-300",
                        ],
                      ].map(([label, value, text]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                        >
                          <span className="text-xs text-slate-500">
                            {label}
                          </span>
                          <span className={`text-xs font-semibold ${text}`}>
                            {value === null || value === undefined
                              ? "—"
                              : `${Math.round(Number(value))}%`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-blue-500/15 bg-blue-500/[0.035] p-6 md:p-8">
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 flex-shrink-0 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/15 flex items-center justify-center font-bold">
                      AI
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-blue-400 font-semibold">
                        Executive Assessment
                      </p>
                      <h2 className="mt-2 text-xl font-bold">
                        What the interview evidence shows
                      </h2>
                      <p className="mt-4 max-w-4xl text-sm md:text-base leading-7 text-slate-300">
                        {feedback.summary ||
                          "The report is based on the answers recorded during this completed interview."}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="grid lg:grid-cols-2 gap-6">
                  <div className="rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.025] p-6 md:p-7">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-semibold">
                      What worked
                    </p>
                    <h2 className="mt-2 text-xl font-bold">
                      Your strongest signals
                    </h2>
                    <div className="mt-6 space-y-3">
                      {strengths.length ? (
                        strengths.map((item, index) => (
                          <div
                            key={`${item}-${index}`}
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
                          No separate strength list was returned.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-amber-500/15 bg-amber-500/[0.025] p-6 md:p-7">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-semibold">
                      Growth Areas
                    </p>
                    <h2 className="mt-2 text-xl font-bold">
                      What to improve next
                    </h2>
                    <div className="mt-6 space-y-3">
                      {improvements.length ? (
                        improvements.map((item, index) => (
                          <div
                            key={`${item}-${index}`}
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
                          No separate improvement list was returned.
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {answerPattern && (
                  <section className="rounded-3xl border border-violet-500/15 bg-violet-500/[0.025] p-6 md:p-7">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-violet-400 font-semibold">
                      Answer Pattern
                    </p>
                    <h2 className="mt-2 text-xl font-bold">
                      How your responses came across
                    </h2>
                    <p className="mt-4 max-w-4xl text-sm md:text-base leading-7 text-slate-300">
                      {answerPattern}
                    </p>
                  </section>
                )}

                {isLiveReport && (
                  <section className="rounded-3xl border border-cyan-500/15 bg-cyan-500/[0.025] overflow-hidden">
                    <div className="p-6 md:p-7 border-b border-white/[0.07]">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-400 font-semibold">
                        Live Interview Only
                      </p>
                      <h2 className="mt-2 text-xl font-bold">
                        Speech & delivery report
                      </h2>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                        Recorded browser speech signals are shown as supporting
                        delivery evidence and do not change the official
                        interview score.
                      </p>
                    </div>
                    {liveMetrics.length ? (
                      <div className="p-6 md:p-7">
                        <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">
                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Delivery Score
                            </p>
                            <p className="mt-2 text-2xl font-bold text-violet-300">
                              {Number(delivery?.delivery_score || 0).toFixed(1)}{" "}
                              <span className="text-sm font-medium text-slate-500">
                                /100
                              </span>
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Heuristic coaching signal
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Speaking Pace
                            </p>
                            <p className="mt-2 text-2xl font-bold text-cyan-300">
                              {Math.round(aggregateWpm)}{" "}
                              <span className="text-sm font-medium text-slate-500">
                                WPM
                              </span>
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Aggregate words ÷ speaking time
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Response Time
                            </p>
                            <p className="mt-2 text-2xl font-bold text-blue-300">
                              {formatDuration(
                                liveMetrics.length
                                  ? totalResponseSeconds / liveMetrics.length
                                  : 0,
                              )}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Average recorded response
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Pause Ratio
                            </p>
                            <p className="mt-2 text-2xl font-bold text-violet-300">
                              {pauseRatio.toFixed(1)}%
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Pause time ÷ response time
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Filler Usage
                            </p>
                            <p className="mt-2 text-2xl font-bold text-amber-300">
                              {totalFillerWords}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {fillerRate.toFixed(1)}% of captured words
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Spoken Words
                            </p>
                            <p className="mt-1 text-lg font-bold">
                              {totalWords}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Speaking Time
                            </p>
                            <p className="mt-1 text-lg font-bold">
                              {formatDuration(totalSpeakingSeconds)}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Speaking Ratio
                            </p>
                            <p className="mt-1 text-lg font-bold">
                              {speakingRatio.toFixed(1)}%
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Responses Analyzed
                            </p>
                            <p className="mt-1 text-lg font-bold">
                              {liveMetrics.length}
                            </p>
                          </div>
                        </div>
                        <div className="mt-5 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.025] p-5">
                          <p className="text-sm leading-7 text-slate-300">
                            {speechFocus}
                          </p>
                          {Array.isArray(delivery?.observations) &&
                            delivery.observations.length > 1 && (
                              <div className="mt-4 space-y-2">
                                {delivery.observations
                                  .slice(1, 4)
                                  .map((item, index) => (
                                    <p
                                      key={`${item}-${index}`}
                                      className="text-xs leading-5 text-slate-500"
                                    >
                                      • {item}
                                    </p>
                                  ))}
                              </div>
                            )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-sm text-slate-400">
                          No speech analytics were captured for this live
                          session.
                        </p>
                      </div>
                    )}
                  </section>
                )}

                {isLiveReport && (
                  <section className="rounded-3xl border border-violet-500/15 bg-violet-500/[0.025] overflow-hidden">
                    <div className="p-6 md:p-7 border-b border-white/[0.07]">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-violet-400 font-semibold">
                        Live Interview Only
                      </p>
                      <h2 className="mt-2 text-xl font-bold">
                        Camera & presence report
                      </h2>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                        This section reports observable camera framing and
                        face-detection events only. It does not infer emotion,
                        confidence, honesty or personality.
                      </p>
                    </div>
                    {faceSamples > 0 ? (
                      <div className="p-6 md:p-7">
                        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Face Visible
                            </p>
                            <p className="mt-2 text-2xl font-bold text-violet-300">
                              {facePresence.toFixed(1)}%
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDuration(facePresentSeconds)} detected
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Out of Frame
                            </p>
                            <p className="mt-2 text-2xl font-bold text-amber-300">
                              {noFaceEvents}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDuration(noFaceDuration)} total
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Off-Center
                            </p>
                            <p className="mt-2 text-2xl font-bold text-blue-300">
                              {offCenterEvents}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDuration(offCenterDuration)} total
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Multiple Faces
                            </p>
                            <p className="mt-2 text-2xl font-bold text-rose-300">
                              {multipleFaceEvents}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDuration(multipleFaceDuration)} total
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 grid sm:grid-cols-2 gap-4">
                          <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-5">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Looking Away Events
                            </p>
                            <p className="mt-2 text-lg font-bold">
                              {lookingAwayEvents}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDuration(lookingAwayDuration)} total
                              detected
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-5">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                              Observation Coverage
                            </p>
                            <p className="mt-2 text-lg font-bold">
                              {formatDuration(observedSeconds)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {faceSamples} camera samples recorded
                            </p>
                          </div>
                        </div>
                        <div className="mt-5 rounded-2xl border border-violet-400/10 bg-violet-400/[0.025] p-5">
                          <p className="text-sm leading-7 text-slate-300">
                            {facePresenceText} {cameraFocus}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-sm text-slate-400">
                          Camera monitoring was enabled, but no observation
                          samples were stored.
                        </p>
                      </div>
                    )}
                  </section>
                )}

                <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">
                  <div className="p-6 md:p-8 border-b border-white/[0.07]">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-blue-400 font-semibold">
                      Deep Review
                    </p>
                    <h2 className="mt-2 text-xl font-bold">
                      Question-by-question analysis
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                      Review every question, your exact submitted answer, the AI
                      evaluation, score, evaluation level and submission status.
                    </p>
                  </div>
                  {answers.length ? (
                    <div className="divide-y divide-white/[0.06]">
                      {answers.map((item, index) => {
                        const score = Number(item?.score || 0);
                        const open = expandedQuestion === (item?.id || index);
                        const style = getScoreStyle(score);
                        const questionNumber =
                          item?.question_number || index + 1;
                        return (
                          <article key={item?.id || index}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedQuestion(
                                  open ? null : item?.id || index,
                                )
                              }
                              className="w-full px-6 md:px-8 py-5 text-left transition hover:bg-white/[0.025]"
                            >
                              <div className="flex items-center gap-4">
                                <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-slate-900 border border-white/[0.06] flex items-center justify-center text-xs font-bold text-slate-400">
                                  {questionNumber}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">
                                    Question {questionNumber}
                                  </p>
                                  <p className="mt-1 text-sm md:text-base font-semibold leading-6 text-slate-200 truncate">
                                    {item?.question_text ||
                                      `Question ${questionNumber}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`hidden sm:inline-flex rounded-lg border px-2.5 py-1 text-xs ${style.badge}`}
                                  >
                                    {score.toFixed(1)}/10
                                  </span>
                                  <span className="text-slate-500 text-lg">
                                    {open ? "−" : "+"}
                                  </span>
                                </div>
                              </div>
                            </button>
                            {open && (
                              <div className="px-6 md:px-8 pb-8 pt-1 bg-black/10">
                                <div className="rounded-2xl border border-blue-500/10 bg-blue-500/[0.025] p-5 md:p-6">
                                  <p className="text-[10px] uppercase tracking-[0.18em] text-blue-400 font-semibold">
                                    Question {questionNumber}
                                  </p>
                                  <p className="mt-3 text-sm md:text-base leading-7 text-slate-200 whitespace-pre-wrap">
                                    {item?.question_text ||
                                      `Question ${questionNumber}`}
                                  </p>
                                </div>

                                <div className="mt-4 grid xl:grid-cols-2 gap-4">
                                  <div className="rounded-2xl border border-white/[0.07] bg-[#050811]/70 p-5">
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600 font-semibold">
                                      Your Answer
                                    </p>
                                    <p className="mt-3 text-sm leading-7 text-slate-300 whitespace-pre-wrap">
                                      {item?.answer_text ||
                                        "No answer provided."}
                                    </p>
                                  </div>
                                  <div className="rounded-2xl border border-blue-500/10 bg-blue-500/[0.035] p-5">
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-blue-400 font-semibold">
                                      AI Evaluation
                                    </p>
                                    <p className="mt-3 text-sm leading-7 text-slate-300">
                                      {item?.feedback ||
                                        "No individual feedback was returned."}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 grid sm:grid-cols-3 gap-3">
                                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-600">
                                      Score
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-slate-200">
                                      {score.toFixed(1)}/10
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-600">
                                      Evaluation Level
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-slate-200">
                                      {getScoreLabel(score)}
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-600">
                                      Response
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-slate-200">
                                      {item?.answer_text?.trim()
                                        ? "Submitted"
                                        : "Missing"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-10 text-center text-sm text-slate-600">
                      No evaluated responses are available.
                    </div>
                  )}
                </section>

                {(coachTip ||
                  framework?.name ||
                  nextPractice ||
                  coachingFocus) && (
                  <section className="rounded-[28px] border border-blue-500/15 bg-gradient-to-br from-blue-500/[0.08] via-violet-500/[0.055] to-white/[0.015] p-6 md:p-8">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/15 flex items-center justify-center text-xl">
                        ✦
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-blue-400 font-semibold">
                          AI Coach
                        </p>
                        <h2 className="mt-2 text-2xl font-bold">
                          Your next coaching move
                        </h2>
                        <p className="mt-2 max-w-4xl text-sm text-slate-500">
                          Personalized guidance generated from this interview's
                          evaluated responses.
                        </p>

                        {coachingFocus && (
                          <div className="mt-6">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300 font-semibold">
                              Priority Skill
                            </p>
                            <p className="mt-3 max-w-4xl text-sm md:text-base leading-7 text-slate-300">
                              {coachingFocus}
                            </p>
                          </div>
                        )}

                        {coachTip && (
                          <div className="mt-6">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-blue-300 font-semibold">
                              Coach Tip
                            </p>
                            <p className="mt-3 max-w-4xl text-sm md:text-base leading-7 text-slate-300">
                              {coachTip}
                            </p>
                          </div>
                        )}

                        {framework?.name && (
                          <div className="mt-6">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-violet-300 font-semibold">
                              Best-fit Framework
                            </p>
                            <p className="mt-3 text-sm md:text-base font-semibold text-slate-200">
                              {framework.name}
                            </p>
                            {framework.when_to_use && (
                              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
                                {framework.when_to_use}
                              </p>
                            )}
                          </div>
                        )}

                        {nextPractice && (
                          <div className="mt-6">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300 font-semibold">
                              Next Practice
                            </p>
                            <p className="mt-3 max-w-4xl text-sm md:text-base leading-7 text-slate-300">
                              {nextPractice}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {recommendation && (
                  <section className="rounded-3xl border border-violet-500/15 bg-violet-500/[0.025] p-6 md:p-7">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-violet-400 font-semibold">
                      Next Interview Strategy
                    </p>
                    <h2 className="mt-2 text-xl font-bold">Your next move</h2>
                    <p className="mt-4 max-w-4xl text-sm md:text-base leading-7 text-slate-300">
                      {recommendation}
                    </p>
                  </section>
                )}

                {finalTakeaway && (
                  <section className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-gradient-to-r from-white/[0.045] to-white/[0.015] p-7 md:p-9">
                    <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-500/[0.06] blur-3xl" />
                    <div className="relative">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-semibold">
                        Final Takeaway
                      </p>
                      <h2 className="mt-2 text-2xl font-bold">
                        One lesson to carry forward
                      </h2>
                      <p className="mt-5 max-w-4xl text-sm md:text-base leading-7 text-slate-300">
                        {finalTakeaway}
                      </p>
                    </div>
                  </section>
                )}

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
    } catch {}
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
      {}
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

        {}
        <div className="h-px bg-white/[0.035]">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-violet-500 transition-all duration-700"
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-4 py-5 md:px-7 md:py-7">
        {}
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

            {}
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

            {}
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

            {}
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

            {}
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
                    Questions may adapt to your responses throughout the
                    session. Follow-up questions can become deeper or easier
                    depending on how you approach the previous answer.
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

            {}
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

        {}
        {interview.status === "started" && (
          <div className="space-y-5">
            {}
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
              {}
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

              {}
              <section className="min-w-0">
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
                          <div
                            key={item}
                            className="flex items-center gap-2 text-xs text-slate-500"
                          >
                            <span className="h-1 w-1 rounded-full bg-blue-400/70" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

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
                            {isLiveInterview
                              ? "Live interview response"
                              : "Your response"}
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
                        <div
                          className={
                            isEditorFullscreen
                              ? "min-h-0 flex-1 overflow-y-auto"
                              : ""
                          }
                        >
                          <SpeechInput
                            key={`${id}-${currentQuestion?.id || currentQuestionIndex}-${speechInstanceKey}`}
                            value={answer}
                            onChange={handleAnswerChange}
                            onSpeechMetrics={handleSpeechMetrics}
                            language={
                              savedConfig?.language === "Hindi"
                                ? "hi-IN"
                                : savedConfig?.language === "Hinglish"
                                  ? "en-IN"
                                  : "en-US"
                            }
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
                            isEditorFullscreen
                              ? "min-h-0 flex-1"
                              : "min-h-[250px] md:min-h-[300px]"
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
                          onClick={() => setIsEditorFullscreen((prev) => !prev)}
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
                          Assessing technical reasoning, structure,
                          communication, and completeness before preparing the
                          next question.
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

              {}
              <aside className="space-y-5">
                {isLiveInterview && (
                  <CameraMonitor
                    enabled={isLiveInterview}
                    autoStart
                    onMetricsChange={handleFaceMetrics}
                  />
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
                        <p className="text-xs leading-5 text-slate-500">
                          {tip}
                        </p>
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
                      <span className="max-w-[130px] truncate text-right text-xs text-slate-300">
                        {isLiveInterview ? "Live Interview" : "Practice Mode"}
                      </span>
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

      {}
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

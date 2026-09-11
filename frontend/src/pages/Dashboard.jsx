// import React, { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { apiRequest } from "../services/api";

// function Dashboard() {
//   const navigate = useNavigate();

//   const [interviews, setInterviews] = useState([]);
//   const [results, setResults] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   // =========================================================
//   // AUTH
//   // =========================================================

//   const accessToken = localStorage.getItem("access_token");

//   const authHeaders = {
//     Authorization: `Bearer ${accessToken}`,
//   };

//   // =========================================================
//   // USER
//   // =========================================================

//   const storedUser = useMemo(() => {
//     try {
//       return JSON.parse(localStorage.getItem("user") || "{}");
//     } catch {
//       return {};
//     }
//   }, []);

//   const userName =
//     storedUser?.name ||
//     storedUser?.full_name ||
//     storedUser?.username ||
//     storedUser?.email?.split("@")[0] ||
//     "there";

//   // =========================================================
//   // LOAD DASHBOARD DATA
//   // =========================================================

//   useEffect(() => {
//     loadDashboard();
//   }, []);

//   const loadDashboard = async () => {
//     try {
//       setLoading(true);
//       setError("");

//       if (!accessToken) {
//         navigate("/login");
//         return;
//       }

//       // Get all interviews belonging to current user
//       const interviewData = await apiRequest("/interviews/", {
//         method: "GET",
//         headers: authHeaders,
//       });

//       console.log("Dashboard interviews:", interviewData);

//       const interviewList = Array.isArray(interviewData)
//         ? interviewData
//         : interviewData?.interviews || [];

//       setInterviews(interviewList);

//       // -------------------------------------------------------
//       // Get result information for completed interviews
//       // -------------------------------------------------------

//       const completedInterviews = interviewList.filter(
//         (interview) => interview.status === "completed",
//       );

//       const resultEntries = await Promise.all(
//         completedInterviews.map(async (interview) => {
//           try {
//             const result = await apiRequest(
//               `/interviews/${interview.id}/result`,
//               {
//                 method: "GET",
//                 headers: authHeaders,
//               },
//             );

//             return [interview.id, result];
//           } catch (err) {
//             console.error(
//               `Failed to load result for interview ${interview.id}:`,
//               err,
//             );

//             return [interview.id, null];
//           }
//         }),
//       );

//       const resultMap = Object.fromEntries(
//         resultEntries.filter(([, result]) => result !== null),
//       );

//       console.log("Dashboard results:", resultMap);

//       setResults(resultMap);
//     } catch (err) {
//       console.error("Dashboard loading failed:", err);

//       if (
//         err?.message?.toLowerCase?.().includes("token") ||
//         err?.message?.toLowerCase?.().includes("unauthorized")
//       ) {
//         localStorage.removeItem("access_token");
//         navigate("/login");
//         return;
//       }

//       setError(err.message || "Unable to load dashboard.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // =========================================================
//   // LOGOUT
//   // =========================================================

//   const handleLogout = () => {
//     localStorage.removeItem("access_token");
//     localStorage.removeItem("user");
//     navigate("/login");
//   };

//   // =========================================================
//   // START INTERVIEW
//   // =========================================================

//   const startInterview = () => {
//     navigate("/interview");
//   };

//   // =========================================================
//   // COMPLETED INTERVIEWS
//   // =========================================================

//   const completedInterviews = useMemo(() => {
//     return interviews.filter((interview) => interview.status === "completed");
//   }, [interviews]);

//   // =========================================================
//   // TOTAL QUESTIONS ANSWERED
//   // =========================================================

//   const totalQuestionsAnswered = useMemo(() => {
//     return completedInterviews.reduce((total, interview) => {
//       const result = results[interview.id];

//       return total + Number(result?.answered_questions || 0);
//     }, 0);
//   }, [completedInterviews, results]);

//   // =========================================================
//   // AVERAGE SCORE
//   // =========================================================

//   const averageScore = useMemo(() => {
//     const percentages = completedInterviews
//       .map((interview) => results[interview.id]?.percentage)
//       .filter((score) => typeof score === "number");

//     if (percentages.length === 0) {
//       return null;
//     }

//     const average =
//       percentages.reduce((sum, score) => sum + score, 0) / percentages.length;

//     return Math.round(average);
//   }, [completedInterviews, results]);

//   // =========================================================
//   // PRACTICE STREAK
//   // =========================================================

//   const practiceStreak = useMemo(() => {
//     const completedDates = completedInterviews
//       .map((interview) => {
//         const dateValue = interview.completed_at || interview.created_at;

//         if (!dateValue) return null;

//         const date = new Date(dateValue);

//         if (Number.isNaN(date.getTime())) return null;

//         return new Date(date.getFullYear(), date.getMonth(), date.getDate());
//       })
//       .filter(Boolean)
//       .sort((a, b) => b - a);

//     if (completedDates.length === 0) {
//       return 0;
//     }

//     // Remove duplicate days
//     const uniqueDates = [];

//     completedDates.forEach((date) => {
//       const alreadyExists = uniqueDates.some(
//         (existing) => existing.getTime() === date.getTime(),
//       );

//       if (!alreadyExists) {
//         uniqueDates.push(date);
//       }
//     });

//     const today = new Date();

//     const todayDate = new Date(
//       today.getFullYear(),
//       today.getMonth(),
//       today.getDate(),
//     );

//     const yesterdayDate = new Date(todayDate);
//     yesterdayDate.setDate(yesterdayDate.getDate() - 1);

//     // Streak starts only if user practiced today or yesterday
//     const firstDate = uniqueDates[0];

//     if (
//       firstDate.getTime() !== todayDate.getTime() &&
//       firstDate.getTime() !== yesterdayDate.getTime()
//     ) {
//       return 0;
//     }

//     let streak = 1;

//     for (let i = 1; i < uniqueDates.length; i++) {
//       const previous = uniqueDates[i - 1];
//       const current = uniqueDates[i];

//       const difference =
//         (previous.getTime() - current.getTime()) / (1000 * 60 * 60 * 24);

//       if (difference === 1) {
//         streak++;
//       } else {
//         break;
//       }
//     }

//     return streak;
//   }, [completedInterviews]);

//   // =========================================================
//   // FORMAT DATE
//   // =========================================================

//   const formatDate = (dateValue) => {
//     if (!dateValue) return "Date unavailable";

//     const date = new Date(dateValue);

//     if (Number.isNaN(date.getTime())) {
//       return "Date unavailable";
//     }

//     return date.toLocaleDateString("en-IN", {
//       day: "numeric",
//       month: "short",
//       year: "numeric",
//     });
//   };

//   // =========================================================
//   // SCORE LABEL
//   // =========================================================

//   const getScoreLabel = (percentage) => {
//     if (percentage === null || percentage === undefined) {
//       return "Not scored";
//     }

//     if (percentage >= 85) return "Excellent";
//     if (percentage >= 70) return "Strong";
//     if (percentage >= 50) return "Developing";

//     return "Needs Practice";
//   };

//   // =========================================================
//   // SCORE COLOR
//   // =========================================================

//   const getScoreColor = (percentage) => {
//     if (percentage >= 85) return "text-emerald-400";
//     if (percentage >= 70) return "text-cyan-400";
//     if (percentage >= 50) return "text-amber-400";

//     return "text-rose-400";
//   };

//   // =========================================================
//   // LOADING SCREEN
//   // =========================================================

// if (loading) {
//     return (
//       <div className="min-h-screen bg-slate-950 text-white">
//         <header className="border-b border-white/10 bg-slate-950/90">
//           <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
//             <div>
//               <h1 className="text-2xl font-bold tracking-tight">
//                 Interxora<span className="text-cyan-400">.ai</span>
//               </h1>

//               <p className="text-xs text-slate-500">AI Interview Platform</p>
//             </div>

//             <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-800" />
//           </div>
//         </header>

//         <main className="mx-auto max-w-7xl px-6 py-10">
//           <div className="animate-pulse">
//             <div className="h-4 w-28 rounded bg-slate-800" />

//             <div className="mt-4 h-10 w-80 rounded bg-slate-800" />

//             <div className="mt-3 h-4 w-[500px] max-w-full rounded bg-slate-800" />

//             <div className="mt-10 h-48 rounded-3xl bg-slate-900" />

//             <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
//               {[1, 2, 3, 4].map((item) => (
//                 <div key={item} className="h-36 rounded-2xl bg-slate-900" />
//               ))}
//             </div>
//           </div>
//         </main>
//       </div>
//     );
//   }

//   // =========================================================
//   // MAIN DASHBOARD
//   // =========================================================

//   return (
//     <div className="min-h-screen bg-slate-950 text-white">
//       {/* =====================================================
//           NAVBAR
//       ===================================================== */}

//       <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
//         <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
//           {/* LOGO */}

//           <button onClick={() => navigate("/dashboard")} className="text-left">
//             <h1 className="text-xl font-bold tracking-tight">
//               Interxora<span className="text-cyan-400">.ai</span>
//             </h1>

//             <p className="hidden text-[10px] text-slate-500 sm:block">
//               AI Interview Platform
//             </p>
//           </button>

//           {/* NAV RIGHT */}

//           <div className="flex items-center gap-3">
//             <div className="hidden text-right sm:block">
//               <p className="text-sm font-medium">Welcome, {userName}</p>

//               <p className="text-xs text-slate-500">
//                 Keep improving every interview.
//               </p>
//             </div>

//             <button
//               onClick={handleLogout}
//               className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
//             >
//               Logout
//             </button>
//           </div>
//         </div>
//       </header>

//       {/* =====================================================
//           MAIN
//       ===================================================== */}

//       <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
//         {/* ===================================================
//             HERO
//         =================================================== */}

//         <section className="mb-10">
//           <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
//             <div>
//               <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1.5">
//                 <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />

//                 <span className="text-xs font-medium text-cyan-300">
//                   AI Interview Coach
//                 </span>
//               </div>

//               <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
//                 Your Interview Dashboard
//               </h2>

//               <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
//                 Practice realistic interviews, track your performance, and use
//                 AI-powered feedback to become interview ready.
//               </p>
//             </div>

//             {/* QUICK ACTION */}

//             <button
//               onClick={startInterview}
//               className="shrink-0 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 px-6 py-3.5 text-sm font-semibold shadow-lg shadow-cyan-500/10 transition hover:-translate-y-0.5 hover:shadow-cyan-500/20"
//             >
//               + New Interview
//             </button>
//           </div>
//         </section>

//         {/* ===================================================
//             ERROR
//         =================================================== */}

//         {error && (
//           <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
//             <div>
//               <p className="text-sm font-medium text-rose-300">
//                 Unable to load some dashboard data
//               </p>

//               <p className="mt-1 text-xs text-rose-400/70">{error}</p>
//             </div>

//             <button
//               onClick={loadDashboard}
//               className="shrink-0 rounded-lg border border-rose-500/20 px-4 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/10"
//             >
//               Retry
//             </button>
//           </div>
//         )}

//         {/* ===================================================
//             HERO ACTION CARD
//         =================================================== */}

//         <section className="mb-10">
//           <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.10] via-blue-500/[0.08] to-violet-500/[0.10] p-6 md:p-8">
//             <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

//             <div className="absolute -bottom-24 right-1/4 h-60 w-60 rounded-full bg-violet-500/10 blur-3xl" />

//             <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
//               <div>
//                 <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
//                   ✦
//                 </div>

//                 <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
//                   Practice makes progress
//                 </p>

//                 <h3 className="mt-2 text-2xl font-bold md:text-3xl">
//                   Ready for your next interview?
//                 </h3>

//                 <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
//                   Create a personalized session and practice with an adaptive AI
//                   interviewer based on your target role.
//                 </p>

//                 <button
//                   onClick={startInterview}
//                   className="mt-6 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
//                 >
//                   Start Interview →
//                 </button>
//               </div>

//               {/* MINI SUMMARY */}

//               <div className="grid grid-cols-2 gap-3 md:w-64">
//                 <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
//                   <p className="text-xs text-slate-500">Completed</p>

//                   <p className="mt-1 text-2xl font-bold">
//                     {completedInterviews.length}
//                   </p>

//                   <p className="mt-1 text-[11px] text-slate-600">interviews</p>
//                 </div>

//                 <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
//                   <p className="text-xs text-slate-500">Average</p>

//                   <p className="mt-1 text-2xl font-bold">
//                     {averageScore !== null ? `${averageScore}%` : "—"}
//                   </p>

//                   <p className="mt-1 text-[11px] text-slate-600">performance</p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </section>

//         {/* ===================================================
//             STATISTICS
//         =================================================== */}

//         <section className="mb-10">
//           <div className="mb-5">
//             <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
//               Performance
//             </p>

//             <h3 className="mt-1 text-xl font-semibold">Your Progress</h3>
//           </div>

//           <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//             {/* INTERVIEWS */}

//             <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-500/20 hover:bg-white/[0.045]">
//               <div className="flex items-center justify-between">
//                 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-lg">
//                   🎤
//                 </div>

//                 <span className="text-xs text-slate-600">SESSIONS</span>
//               </div>

//               <p className="mt-5 text-3xl font-bold">
//                 {completedInterviews.length}
//               </p>

//               <p className="mt-1 text-sm text-slate-500">
//                 Completed interviews
//               </p>
//             </div>

//             {/* QUESTIONS */}

//             <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-blue-500/20 hover:bg-white/[0.045]">
//               <div className="flex items-center justify-between">
//                 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-lg">
//                   ❓
//                 </div>

//                 <span className="text-xs text-slate-600">ANSWERED</span>
//               </div>

//               <p className="mt-5 text-3xl font-bold">
//                 {totalQuestionsAnswered}
//               </p>

//               <p className="mt-1 text-sm text-slate-500">Questions answered</p>
//             </div>

//             {/* AVERAGE */}

//             <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-violet-500/20 hover:bg-white/[0.045]">
//               <div className="flex items-center justify-between">
//                 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-lg">
//                   📈
//                 </div>

//                 <span className="text-xs text-slate-600">AVERAGE</span>
//               </div>

//               <p className="mt-5 text-3xl font-bold">
//                 {averageScore !== null ? `${averageScore}%` : "—"}
//               </p>

//               <p className="mt-1 text-sm text-slate-500">Overall performance</p>
//             </div>

//             {/* STREAK */}

//             <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-orange-500/20 hover:bg-white/[0.045]">
//               <div className="flex items-center justify-between">
//                 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-lg">
//                   🔥
//                 </div>

//                 <span className="text-xs text-slate-600">STREAK</span>
//               </div>

//               <p className="mt-5 text-3xl font-bold">{practiceStreak}</p>

//               <p className="mt-1 text-sm text-slate-500">Practice days</p>
//             </div>
//           </div>
//         </section>

//         {/* ===================================================
//                      INTERVIEW TYPES
//         =================================================== */}

//         <section className="mb-10">
//           <div className="mb-5">
//             <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
//               Practice
//             </p>

//             <h3 className="mt-1 text-xl font-semibold">
//               Choose Your Interview
//             </h3>

//             <p className="mt-1 text-sm text-slate-500">
//               Start with a focused practice mode or create a fully customized
//               interview.
//             </p>
//           </div>

//           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
//             {/* TECHNICAL */}

//             <button
//               onClick={startInterview}
//               className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:-translate-y-1 hover:border-cyan-500/30 hover:bg-white/[0.045]"
//             >
//               <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-xl">
//                 💻
//               </div>

//               <h4 className="font-semibold">Technical</h4>

//               <p className="mt-2 text-sm leading-6 text-slate-500">
//                 Programming, CS fundamentals, technical concepts and
//                 role-specific questions.
//               </p>

//               <div className="mt-5 flex items-center justify-between">
//                 <span className="text-sm font-medium text-cyan-400">
//                   Start practice
//                 </span>

//                 <span className="transition group-hover:translate-x-1">→</span>
//               </div>
//             </button>

//             {/* HR */}

//             <button
//               onClick={startInterview}
//               className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:-translate-y-1 hover:border-blue-500/30 hover:bg-white/[0.045]"
//             >
//               <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-xl">
//                 🤝
//               </div>

//               <h4 className="font-semibold">HR Interview</h4>

//               <p className="mt-2 text-sm leading-6 text-slate-500">
//                 Practice common HR questions, confidence, communication and
//                 career discussions.
//               </p>

//               <div className="mt-5 flex items-center justify-between">
//                 <span className="text-sm font-medium text-blue-400">
//                   Start practice
//                 </span>

//                 <span className="transition group-hover:translate-x-1">→</span>
//               </div>
//             </button>

//             {/* BEHAVIORAL */}

//             <button
//               onClick={startInterview}
//               className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:-translate-y-1 hover:border-violet-500/30 hover:bg-white/[0.045]"
//             >
//               <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-xl">
//                 🧠
//               </div>

//               <h4 className="font-semibold">Behavioral</h4>

//               <p className="mt-2 text-sm leading-6 text-slate-500">
//                 Situational questions, teamwork, leadership and problem-solving
//                 scenarios.
//               </p>

//               <div className="mt-5 flex items-center justify-between">
//                 <span className="text-sm font-medium text-violet-400">
//                   Start practice
//                 </span>

//                 <span className="transition group-hover:translate-x-1">→</span>
//               </div>
//             </button>

//             {/* SYSTEM DESIGN */}

//             <button
//               onClick={startInterview}
//               className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:-translate-y-1 hover:border-purple-500/30 hover:bg-white/[0.045]"
//             >
//               <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-xl">
//                 🏗️
//               </div>

//               <h4 className="font-semibold">System Design</h4>

//               <p className="mt-2 text-sm leading-6 text-slate-500">
//                 Architecture, scalability, APIs, databases and
//                 distributed-system scenarios.
//               </p>

//               <div className="mt-5 flex items-center justify-between">
//                 <span className="text-sm font-medium text-purple-400">
//                   Start practice
//                 </span>

//                 <span className="transition group-hover:translate-x-1">→</span>
//               </div>
//             </button>
//           </div>
//         </section>

//         {/* ===================================================
//     RECENT INTERVIEWS
// =================================================== */}

//         <section>
//           <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
//             <div>
//               <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
//                 History
//               </p>

//               <h3 className="mt-1 text-xl font-semibold">Recent Interviews</h3>

//               <p className="mt-1 text-sm text-slate-500">
//                 Review your latest interview sessions and performance.
//               </p>
//             </div>

//             {completedInterviews.length > 0 && (
//               <span className="text-xs text-slate-600">
//                 {completedInterviews.length} completed
//               </span>
//             )}
//           </div>

//           {/* NO INTERVIEWS */}

//           {completedInterviews.length === 0 ? (
//             <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
//               <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-2xl">
//                 📋
//               </div>

//               <h4 className="text-lg font-semibold">
//                 No completed interviews yet
//               </h4>

//               <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
//                 Complete your first AI interview and your performance history
//                 will appear here.
//               </p>

//               <button
//                 onClick={startInterview}
//                 className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
//               >
//                 Start Your First Interview →
//               </button>
//             </div>
//           ) : (
//             <div className="space-y-3">
//               {completedInterviews.slice(0, 8).map((interview) => {
//                 const result = results[interview.id];

//                 const percentage =
//                   typeof result?.percentage === "number"
//                     ? result.percentage
//                     : null;

//                 const answered = Number(result?.answered_questions || 0);

//                 const total = Number(
//                   result?.total_questions || interview.max_questions || 0,
//                 );

//                 return (
//                   <div
//                     key={interview.id}
//                     className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-500/20 hover:bg-white/[0.045]"
//                   >
//                     <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
//                       {/* LEFT */}

//                       <div className="min-w-0">
//                         <div className="flex flex-wrap items-center gap-2">
//                           <h4 className="truncate text-base font-semibold md:text-lg">
//                             {interview.role || "AI Interview"}
//                           </h4>

//                           <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
//                             Completed
//                           </span>
//                         </div>

//                         <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
//                           <span>{interview.interview_type || "Interview"}</span>

//                           <span className="text-slate-700">•</span>

//                           <span>{interview.difficulty || "Adaptive"}</span>

//                           <span className="text-slate-700">•</span>

//                           <span>
//                             {answered}/{total} questions
//                           </span>

//                           <span className="text-slate-700">•</span>

//                           <span>
//                             {formatDate(
//                               interview.completed_at || interview.created_at,
//                             )}
//                           </span>
//                         </div>
//                       </div>

//                       {/* RIGHT */}

//                       <div className="flex items-center justify-between gap-6 md:justify-end">
//                         <div className="text-left md:text-right">
//                           <p
//                             className={`text-2xl font-bold ${getScoreColor(
//                               percentage,
//                             )}`}
//                           >
//                             {percentage !== null
//                               ? `${Math.round(percentage)}%`
//                               : "—"}
//                           </p>

//                           <p className="text-[11px] text-slate-600">
//                             {getScoreLabel(percentage)}
//                           </p>
//                         </div>

//                         <button
//                           onClick={() =>
//                             navigate(`/interview/session/${interview.id}`)
//                           }
//                           className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-cyan-500/30 hover:bg-cyan-500/5 hover:text-cyan-300"
//                         >
//                           View Results →
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </section>
//       </main>

//       {/* =====================================================
//     FOOTER
// ===================================================== */}

//       <footer className="mt-12 border-t border-white/10 py-8">
//         <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-center sm:flex-row sm:text-left">
//           <p className="text-sm text-slate-600">
//             © {new Date().getFullYear()}{" "}
//             <span className="font-medium text-slate-400">Interxora.ai</span>
//           </p>

//           <p className="text-xs text-slate-700">
//             AI-powered adaptive interview platform
//           </p>
//         </div>
//       </footer>
//     </div>
//   );
// }


// export default Dashboard;



// //......................................................new.........................

// import React, { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { apiRequest } from "../services/api";

// function Dashboard() {
//   const navigate = useNavigate();

//   const [interviews, setInterviews] = useState([]);
//   const [results, setResults] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   // =========================================================
//   // AUTH
//   // =========================================================

//   const accessToken = localStorage.getItem("access_token");

//   const authHeaders = {
//     Authorization: `Bearer ${accessToken}`,
//   };

//   // =========================================================
//   // USER
//   // =========================================================

//   const storedUser = useMemo(() => {
//     try {
//       return JSON.parse(localStorage.getItem("user") || "{}");
//     } catch {
//       return {};
//     }
//   }, []);

//   const userName =
//     storedUser?.name ||
//     storedUser?.full_name ||
//     storedUser?.username ||
//     storedUser?.email?.split("@")[0] ||
//     "there";

//   // =========================================================
//   // LOAD DASHBOARD DATA
//   // =========================================================

//   useEffect(() => {
//     loadDashboard();
//   }, []);

//   const loadDashboard = async () => {
//     try {
//       setLoading(true);
//       setError("");

//       if (!accessToken) {
//         navigate("/login");
//         return;
//       }

//       // Get all interviews belonging to current user
//       const interviewData = await apiRequest("/interviews/", {
//         method: "GET",
//         headers: authHeaders,
//       });

//       console.log("Dashboard interviews:", interviewData);

//       const interviewList = Array.isArray(interviewData)
//         ? interviewData
//         : interviewData?.interviews || [];

//       setInterviews(interviewList);

//       // -------------------------------------------------------
//       // Get result information for completed interviews
//       // -------------------------------------------------------

//       const completedInterviews = interviewList.filter(
//         (interview) => interview.status === "completed"
//       );

//       const resultEntries = await Promise.all(
//         completedInterviews.map(async (interview) => {
//           try {
//             const result = await apiRequest(
//               `/interviews/${interview.id}/result`,
//               {
//                 method: "GET",
//                 headers: authHeaders,
//               }
//             );

//             return [interview.id, result];
//           } catch (err) {
//             console.error(
//               `Failed to load result for interview ${interview.id}:`,
//               err
//             );

//             return [interview.id, null];
//           }
//         })
//       );

//       const resultMap = Object.fromEntries(
//         resultEntries.filter(([, result]) => result !== null)
//       );

//       console.log("Dashboard results:", resultMap);

//       setResults(resultMap);
//     } catch (err) {
//       console.error("Dashboard loading failed:", err);

//       if (
//         err?.message?.toLowerCase?.().includes("token") ||
//         err?.message?.toLowerCase?.().includes("unauthorized")
//       ) {
//         localStorage.removeItem("access_token");
//         navigate("/login");
//         return;
//       }

//       setError(err.message || "Unable to load dashboard.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // =========================================================
//   // LOGOUT
//   // =========================================================

//   const handleLogout = () => {
//     localStorage.removeItem("access_token");
//     localStorage.removeItem("user");
//     navigate("/login");
//   };

//   // =========================================================
//   // START INTERVIEW
//   // =========================================================

//   const startInterview = () => {
//     navigate("/interview");
//   };

//   // =========================================================
//   // COMPLETED INTERVIEWS
//   // =========================================================

//   const completedInterviews = useMemo(() => {
//     return interviews.filter(
//       (interview) => interview.status === "completed"
//     );
//   }, [interviews]);

//   // =========================================================
//   // TOTAL QUESTIONS ANSWERED
//   // =========================================================

//   const totalQuestionsAnswered = useMemo(() => {
//     return completedInterviews.reduce((total, interview) => {
//       const result = results[interview.id];

//       return total + Number(result?.answered_questions || 0);
//     }, 0);
//   }, [completedInterviews, results]);

//   // =========================================================
//   // AVERAGE SCORE
//   // =========================================================

//   const averageScore = useMemo(() => {
//     const percentages = completedInterviews
//       .map((interview) => results[interview.id]?.percentage)
//       .filter((score) => typeof score === "number");

//     if (percentages.length === 0) {
//       return null;
//     }

//     const average =
//       percentages.reduce((sum, score) => sum + score, 0) /
//       percentages.length;

//     return Math.round(average);
//   }, [completedInterviews, results]);

//   // =========================================================
//   // PRACTICE STREAK
//   // =========================================================

//   const practiceStreak = useMemo(() => {
//     const completedDates = completedInterviews
//       .map((interview) => {
//         const dateValue =
//           interview.completed_at || interview.created_at;

//         if (!dateValue) return null;

//         const date = new Date(dateValue);

//         if (Number.isNaN(date.getTime())) return null;

//         return new Date(
//           date.getFullYear(),
//           date.getMonth(),
//           date.getDate()
//         );
//       })
//       .filter(Boolean)
//       .sort((a, b) => b - a);

//     if (completedDates.length === 0) {
//       return 0;
//     }

//     // Remove duplicate days
//     const uniqueDates = [];

//     completedDates.forEach((date) => {
//       const alreadyExists = uniqueDates.some(
//         (existing) => existing.getTime() === date.getTime()
//       );

//       if (!alreadyExists) {
//         uniqueDates.push(date);
//       }
//     });

//     const today = new Date();

//     const todayDate = new Date(
//       today.getFullYear(),
//       today.getMonth(),
//       today.getDate()
//     );

//     const yesterdayDate = new Date(todayDate);
//     yesterdayDate.setDate(yesterdayDate.getDate() - 1);

//     // Streak starts only if user practiced today or yesterday
//     const firstDate = uniqueDates[0];

//     if (
//       firstDate.getTime() !== todayDate.getTime() &&
//       firstDate.getTime() !== yesterdayDate.getTime()
//     ) {
//       return 0;
//     }

//     let streak = 1;

//     for (let i = 1; i < uniqueDates.length; i++) {
//       const previous = uniqueDates[i - 1];
//       const current = uniqueDates[i];

//       const difference =
//         (previous.getTime() - current.getTime()) /
//         (1000 * 60 * 60 * 24);

//       if (difference === 1) {
//         streak++;
//       } else {
//         break;
//       }
//     }

//     return streak;
//   }, [completedInterviews]);

//   // =========================================================
//   // FORMAT DATE
//   // =========================================================

//   const formatDate = (dateValue) => {
//     if (!dateValue) return "Date unavailable";

//     const date = new Date(dateValue);

//     if (Number.isNaN(date.getTime())) {
//       return "Date unavailable";
//     }

//     return date.toLocaleDateString("en-IN", {
//       day: "numeric",
//       month: "short",
//       year: "numeric",
//     });
//   };

//   // =========================================================
//   // SCORE LABEL
//   // =========================================================

//   const getScoreLabel = (percentage) => {
//     if (percentage === null || percentage === undefined) {
//       return "Not scored";
//     }

//     if (percentage >= 85) return "Excellent";
//     if (percentage >= 70) return "Strong";
//     if (percentage >= 50) return "Developing";

//     return "Needs Practice";
//   };

//   // =========================================================
//   // SCORE COLOR
//   // =========================================================

//   const getScoreColor = (percentage) => {
//     if (percentage >= 85) return "text-emerald-400";
//     if (percentage >= 70) return "text-cyan-400";
//     if (percentage >= 50) return "text-amber-400";

//     return "text-rose-400";
//   };

//   // =========================================================
//   // LOADING SCREEN
//   // =========================================================

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-[#070b14] text-white">
//         <header className="border-b border-white/[0.06] bg-[#070b14]/90">
//           <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
//             <div className="flex items-center gap-3">
//               <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600">
//                 <span className="text-sm font-black">I</span>
//               </div>

//               <div>
//                 <h1 className="text-lg font-bold">
//                   Interxora<span className="text-cyan-400">.ai</span>
//                 </h1>

//                 <p className="hidden text-[10px] uppercase tracking-[0.18em] text-slate-600 sm:block">
//                   AI Interview Coach
//                 </p>
//               </div>
//             </div>

//             <div className="h-9 w-20 animate-pulse rounded-xl bg-slate-800" />
//           </div>
//         </header>

//         <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
//           <div className="animate-pulse">

//             <div className="h-5 w-32 rounded bg-slate-800" />

//             <div className="mt-5 h-12 w-96 max-w-full rounded bg-slate-800" />

//             <div className="mt-4 h-5 w-[550px] max-w-full rounded bg-slate-800" />

//             <div className="mt-10 h-64 rounded-[28px] bg-slate-900" />

//             <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//               {[1, 2, 3, 4].map((item) => (
//                 <div
//                   key={item}
//                   className="h-36 rounded-2xl bg-slate-900"
//                 />
//               ))}
//             </div>

//             <div className="mt-12 h-7 w-52 rounded bg-slate-800" />

//             <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//               {[1, 2, 3, 4].map((item) => (
//                 <div
//                   key={item}
//                   className="h-64 rounded-2xl bg-slate-900"
//                 />
//               ))}
//             </div>
//           </div>
//         </main>
//       </div>
//     );
//   }

//   // =========================================================
//   // MAIN DASHBOARD
//   // =========================================================

//   return (
//     <div className="min-h-screen bg-[#070b14] text-white">

//       {/* =====================================================
//           NAVBAR
//       ===================================================== */}

//       <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#070b14]/85 backdrop-blur-xl">
//         <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

//           {/* Logo */}
//           <button
//             onClick={() => navigate("/dashboard")}
//             className="group flex items-center gap-3 text-left"
//           >
//             <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20 transition group-hover:scale-105">
//               <span className="text-sm font-black text-white">
//                 I
//               </span>
//             </div>

//             <div>
//               <h1 className="text-lg font-bold tracking-tight">
//                 Interxora<span className="text-cyan-400">.ai</span>
//               </h1>

//               <p className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600 sm:block">
//                 AI Interview Coach
//               </p>
//             </div>
//           </button>

//           {/* User */}
//           <div className="flex items-center gap-3">
//             <div className="hidden text-right sm:block">
//               <p className="text-sm font-medium text-slate-200">
//                 Welcome, {userName}
//               </p>

//               <p className="text-xs text-slate-600">
//                 Keep improving every interview.
//               </p>
//             </div>

//             <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-sm font-semibold text-cyan-300">
//               {userName?.charAt(0)?.toUpperCase() || "U"}
//             </div>

//             <button
//               onClick={handleLogout}
//               className="rounded-xl border border-white/10 px-3.5 py-2 text-xs font-medium text-slate-400 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
//             >
//               Logout
//             </button>
//           </div>
//         </div>
//       </header>

//       {/* =====================================================
//           MAIN
//       ===================================================== */}

//       <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10 lg:px-8">

//         {/* ===================================================
//             HERO
//         =================================================== */}

//         <section className="relative mb-10 overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-cyan-500/[0.08] via-blue-500/[0.04] to-violet-500/[0.08]">

//           {/* Decorative glow */}
//           <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-cyan-400/[0.08] blur-3xl" />

//           <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-violet-500/[0.06] blur-3xl" />

//           <div className="relative grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:p-10">

//             <div className="max-w-2xl">

//               <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-3 py-1.5">
//                 <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />

//                 <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
//                   AI Interview Coach
//                 </span>
//               </div>

//               <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
//                 Become interview
//                 <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
//                   ready with practice.
//                 </span>
//               </h2>

//               <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
//                 Practice realistic interviews, receive AI-powered
//                 feedback, track your performance, and continuously
//                 improve your interview skills.
//               </p>

//               <div className="mt-7 flex flex-col gap-3 sm:flex-row">

//                 <button
//                   onClick={startInterview}
//                   className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-white/5 transition hover:-translate-y-0.5 hover:bg-slate-100"
//                 >
//                   Start Interview
//                   <span className="ml-2">→</span>
//                 </button>

//                 {completedInterviews.length > 0 && (
//                   <button
//                     onClick={() => {
//                       document
//                         .getElementById("recent-interviews")
//                         ?.scrollIntoView({
//                           behavior: "smooth",
//                         });
//                     }}
//                     className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06]"
//                   >
//                     View History
//                   </button>
//                 )}
//               </div>
//             </div>

//             {/* Hero Summary */}
//             <div className="grid grid-cols-2 gap-3 self-end md:w-64">

//               <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 backdrop-blur">
//                 <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
//                   Completed
//                 </p>

//                 <p className="mt-2 text-2xl font-bold">
//                   {completedInterviews.length}
//                 </p>

//                 <p className="mt-1 text-[11px] text-slate-600">
//                   interviews
//                 </p>
//               </div>

//               <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 backdrop-blur">
//                 <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
//                   Average
//                 </p>

//                 <p className="mt-2 text-2xl font-bold">
//                   {averageScore !== null
//                     ? `${averageScore}%`
//                     : "—"}
//                 </p>

//                 <p className="mt-1 text-[11px] text-slate-600">
//                   performance
//                 </p>
//               </div>

//             </div>
//           </div>
//         </section>

//         {/* ===================================================
//             ERROR
//         =================================================== */}

//         {error && (
//           <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">

//             <div>
//               <p className="text-sm font-medium text-rose-300">
//                 Unable to load dashboard data
//               </p>

//               <p className="mt-1 text-xs text-rose-400/70">
//                 {error}
//               </p>
//             </div>

//             <button
//               onClick={loadDashboard}
//               className="rounded-lg border border-rose-500/20 px-4 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/10"
//             >
//               Retry
//             </button>
//           </div>
//         )}

//         {/* ===================================================
//             STATS
//         =================================================== */}

//         <section className="mb-12">

//           <div className="mb-5">
//             <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/70">
//               Overview
//             </p>

//             <h3 className="mt-1 text-xl font-semibold">
//               Your Progress
//             </h3>
//           </div>

//           <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

//             {/* Interviews */}
//             <div className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/20 hover:bg-white/[0.04]">
//               <div className="flex items-center justify-between">

//                 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-lg">
//                   🎤
//                 </div>

//                 <span className="text-[9px] font-semibold tracking-widest text-slate-700">
//                   SESSIONS
//                 </span>
//               </div>

//               <p className="mt-5 text-3xl font-bold">
//                 {completedInterviews.length}
//               </p>

//               <p className="mt-1 text-sm text-slate-500">
//                 Completed interviews
//               </p>
//             </div>

//             {/* Questions */}
//             <div className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-blue-400/20 hover:bg-white/[0.04]">
//               <div className="flex items-center justify-between">

//                 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/10 text-lg">
//                   ❓
//                 </div>

//                 <span className="text-[9px] font-semibold tracking-widest text-slate-700">
//                   ANSWERED
//                 </span>
//               </div>

//               <p className="mt-5 text-3xl font-bold">
//                 {totalQuestionsAnswered}
//               </p>

//               <p className="mt-1 text-sm text-slate-500">
//                 Questions answered
//               </p>
//             </div>

//             {/* Average */}
//             <div className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-violet-400/20 hover:bg-white/[0.04]">
//               <div className="flex items-center justify-between">

//                 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-lg">
//                   📈
//                 </div>

//                 <span className="text-[9px] font-semibold tracking-widest text-slate-700">
//                   AVERAGE
//                 </span>
//               </div>

//               <p className="mt-5 text-3xl font-bold">
//                 {averageScore !== null
//                   ? `${averageScore}%`
//                   : "—"}
//               </p>

//               <p className="mt-1 text-sm text-slate-500">
//                 Overall performance
//               </p>
//             </div>

//             {/* Streak */}
//             <div className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-orange-400/20 hover:bg-white/[0.04]">
//               <div className="flex items-center justify-between">

//                 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400/10 text-lg">
//                   🔥
//                 </div>

//                 <span className="text-[9px] font-semibold tracking-widest text-slate-700">
//                   STREAK
//                 </span>
//               </div>

//               <p className="mt-5 text-3xl font-bold">
//                 {practiceStreak}
//               </p>

//               <p className="mt-1 text-sm text-slate-500">
//                 Practice days
//               </p>
//             </div>

//           </div>
//         </section>

//         {/* ===================================================
//             INTERVIEW TYPES
//         =================================================== */}

//         <section className="mb-12">

//           <div className="mb-5">
//             <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400/70">
//               Practice
//             </p>

//             <h3 className="mt-1 text-xl font-semibold">
//               Choose Your Interview
//             </h3>

//             <p className="mt-1 text-sm text-slate-500">
//               Select a practice mode and prepare for your next
//               opportunity.
//             </p>
//           </div>

//           <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

//             {/* Technical */}
//             <button
//               onClick={startInterview}
//               className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 text-left transition duration-200 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-white/[0.045]"
//             >
//               <div className="flex items-center justify-between">

//                 <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-xl transition group-hover:scale-105">
//                   💻
//                 </div>

//                 <span className="text-slate-700 transition group-hover:translate-x-1 group-hover:text-slate-400">
//                   →
//                 </span>
//               </div>

//               <h4 className="mt-6 font-semibold">
//                 Technical
//               </h4>

//               <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-500">
//                 Programming, CS fundamentals, technical concepts
//                 and role-specific questions.
//               </p>

//               <div className="mt-5 border-t border-white/[0.05] pt-4">
//                 <span className="text-xs font-semibold text-slate-400 transition group-hover:text-cyan-300">
//                   Start practice
//                 </span>
//               </div>
//             </button>

//             {/* HR */}
//             <button
//               onClick={startInterview}
//               className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 text-left transition duration-200 hover:-translate-y-1 hover:border-blue-400/20 hover:bg-white/[0.045]"
//             >
//               <div className="flex items-center justify-between">

//                 <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-400/10 text-xl transition group-hover:scale-105">
//                   🤝
//                 </div>

//                 <span className="text-slate-700 transition group-hover:translate-x-1 group-hover:text-slate-400">
//                   →
//                 </span>
//               </div>

//               <h4 className="mt-6 font-semibold">
//                 HR Interview
//               </h4>

//               <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-500">
//                 Common HR questions, communication, confidence and
//                 career discussions.
//               </p>

//               <div className="mt-5 border-t border-white/[0.05] pt-4">
//                 <span className="text-xs font-semibold text-slate-400 transition group-hover:text-blue-300">
//                   Start practice
//                 </span>
//               </div>
//             </button>

//             {/* Behavioral */}
//             <button
//               onClick={startInterview}
//               className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 text-left transition duration-200 hover:-translate-y-1 hover:border-violet-400/20 hover:bg-white/[0.045]"
//             >
//               <div className="flex items-center justify-between">

//                 <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/10 text-xl transition group-hover:scale-105">
//                   🧠
//                 </div>

//                 <span className="text-slate-700 transition group-hover:translate-x-1 group-hover:text-slate-400">
//                   →
//                 </span>
//               </div>

//               <h4 className="mt-6 font-semibold">
//                 Behavioral
//               </h4>

//               <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-500">
//                 Situational questions, teamwork, leadership and
//                 problem-solving scenarios.
//               </p>

//               <div className="mt-5 border-t border-white/[0.05] pt-4">
//                 <span className="text-xs font-semibold text-slate-400 transition group-hover:text-violet-300">
//                   Start practice
//                 </span>
//               </div>
//             </button>

//             {/* System Design */}
//             <button
//               onClick={startInterview}
//               className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 text-left transition duration-200 hover:-translate-y-1 hover:border-purple-400/20 hover:bg-white/[0.045]"
//             >
//               <div className="flex items-center justify-between">

//                 <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-400/10 text-xl transition group-hover:scale-105">
//                   🏗️
//                 </div>

//                 <span className="text-slate-700 transition group-hover:translate-x-1 group-hover:text-slate-400">
//                   →
//                 </span>
//               </div>

//               <h4 className="mt-6 font-semibold">
//                 System Design
//               </h4>

//               <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-500">
//                 Architecture, scalability, APIs, databases and
//                 distributed-system scenarios.
//               </p>

//               <div className="mt-5 border-t border-white/[0.05] pt-4">
//                 <span className="text-xs font-semibold text-slate-400 transition group-hover:text-purple-300">
//                   Start practice
//                 </span>
//               </div>
//             </button>

//           </div>
//         </section>

//         {/* ===================================================
//             RECENT INTERVIEWS
//         =================================================== */}

//         <section id="recent-interviews">

//           <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

//             <div>
//               <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/70">
//                 History
//               </p>

//               <h3 className="mt-1 text-xl font-semibold">
//                 Recent Interviews
//               </h3>

//               <p className="mt-1 text-sm text-slate-500">
//                 Review your latest sessions and performance.
//               </p>
//             </div>

//             {completedInterviews.length > 0 && (
//               <span className="text-xs text-slate-600">
//                 {completedInterviews.length} completed
//               </span>
//             )}

//           </div>

//           {/* NO INTERVIEWS */}
//           {completedInterviews.length === 0 ? (

//             <div className="rounded-3xl border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-14 text-center">

//               <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] text-2xl">
//                 📋
//               </div>

//               <h4 className="mt-5 text-lg font-semibold">
//                 No completed interviews yet
//               </h4>

//               <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
//                 Complete your first AI interview and your performance
//                 history will appear here.
//               </p>

//               <button
//                 onClick={startInterview}
//                 className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
//               >
//                 Start Your First Interview →
//               </button>

//             </div>

//           ) : (

//             <div className="space-y-3">

//               {completedInterviews.slice(0, 8).map((interview) => {

//                 const result = results[interview.id];

//                 const percentage =
//                   typeof result?.percentage === "number"
//                     ? result.percentage
//                     : null;

//                 const answered = Number(
//                   result?.answered_questions || 0
//                 );

//                 const total = Number(
//                   result?.total_questions ||
//                     interview.max_questions ||
//                     0
//                 );

//                 return (
//                   <div
//                     key={interview.id}
//                     className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-cyan-400/20 hover:bg-white/[0.04]"
//                   >

//                     <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

//                       {/* LEFT */}
//                       <div className="min-w-0">

//                         <div className="flex flex-wrap items-center gap-2">

//                           <h4 className="truncate text-base font-semibold md:text-lg">
//                             {interview.role || "AI Interview"}
//                           </h4>

//                           <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
//                             Completed
//                           </span>

//                         </div>

//                         <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">

//                           <span>
//                             {interview.interview_type || "Interview"}
//                           </span>

//                           <span>•</span>

//                           <span>
//                             {interview.difficulty || "Adaptive"}
//                           </span>

//                           <span>•</span>

//                           <span>
//                             {answered}/{total} questions
//                           </span>

//                           <span>•</span>

//                           <span>
//                             {formatDate(
//                               interview.completed_at ||
//                                 interview.created_at
//                             )}
//                           </span>

//                         </div>
//                       </div>

//                       {/* RIGHT */}
//                       <div className="flex items-center justify-between gap-6 md:justify-end">

//                         <div className="text-left md:text-right">

//                           <p
//                             className={`text-2xl font-bold ${getScoreColor(
//                               percentage
//                             )}`}
//                           >
//                             {percentage !== null
//                               ? `${Math.round(percentage)}%`
//                               : "—"}
//                           </p>

//                           <p className="text-[10px] font-medium text-slate-600">
//                             {getScoreLabel(percentage)}
//                           </p>

//                         </div>

//                         <button
//                           onClick={() =>
//                             navigate(
//                               `/interview/session/${interview.id}`
//                             )
//                           }
//                           className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] hover:text-cyan-300"
//                         >
//                           View Results →
//                         </button>

//                       </div>

//                     </div>
//                   </div>
//                 );
//               })}

//             </div>
//           )}

//         </section>
//       </main>

//       {/* =====================================================
//           FOOTER
//       ===================================================== */}

//       <footer className="mt-16 border-t border-white/[0.06]">

//         <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-7 text-center sm:flex-row sm:text-left">

//           <p className="text-xs text-slate-600">
//             © {new Date().getFullYear()}{" "}
//             <span className="font-medium text-slate-400">
//               Interxora.ai
//             </span>
//           </p>

//           <p className="text-[11px] text-slate-700">
//             AI-powered adaptive interview platform
//           </p>

//         </div>
//       </footer>
//     </div>
//   );
// }

// export default Dashboard;








// // Dashboard.jsx

// import React, { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { apiRequest } from "../services/api";

// function Dashboard() {
//   const navigate = useNavigate();

//   const [interviews, setInterviews] = useState([]);
//   const [results, setResults] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   const accessToken = localStorage.getItem("access_token");

//   const storedUser = useMemo(() => {
//     try {
//       return JSON.parse(localStorage.getItem("user") || "{}");
//     } catch {
//       return {};
//     }
//   }, []);

//   const userName =
//     storedUser?.name ||
//     storedUser?.full_name ||
//     storedUser?.username ||
//     storedUser?.email?.split("@")[0] ||
//     "there";

//   const authHeaders = {
//     Authorization: `Bearer ${accessToken}`,
//   };

//   const loadDashboard = async () => {
//     try {
//       setLoading(true);
//       setError("");

//       if (!accessToken) {
//         navigate("/login");
//         return;
//       }

//       const interviewData = await apiRequest("/interviews/", {
//         method: "GET",
//         headers: authHeaders,
//       });

//       const interviewList = Array.isArray(interviewData)
//         ? interviewData
//         : interviewData?.interviews || [];

//       setInterviews(interviewList);

//       const completed = interviewList.filter(
//         (interview) => interview.status === "completed",
//       );

//       const resultEntries = await Promise.all(
//         completed.map(async (interview) => {
//           try {
//             const result = await apiRequest(
//               `/interviews/${interview.id}/result`,
//               {
//                 method: "GET",
//                 headers: authHeaders,
//               },
//             );

//             return [interview.id, result];
//           } catch {
//             return [interview.id, null];
//           }
//         }),
//       );

//       setResults(
//         Object.fromEntries(
//           resultEntries.filter(([, result]) => result !== null),
//         ),
//       );
//     } catch (err) {
//       const message = err?.message || "Unable to load dashboard.";

//       if (
//         message.toLowerCase().includes("token") ||
//         message.toLowerCase().includes("unauthorized")
//       ) {
//         localStorage.removeItem("access_token");
//         navigate("/login");
//         return;
//       }

//       setError(message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadDashboard();
//   }, []);

//   const completedInterviews = useMemo(
//     () => interviews.filter((item) => item.status === "completed"),
//     [interviews],
//   );

//   const scoredInterviews = useMemo(
//     () =>
//       completedInterviews
//         .map((interview) => ({
//           ...interview,
//           result: results[interview.id],
//           score:
//             typeof results[interview.id]?.percentage === "number"
//               ? results[interview.id].percentage
//               : null,
//         }))
//         .filter((item) => item.score !== null),
//     [completedInterviews, results],
//   );

//   const averageScore = useMemo(() => {
//     if (!scoredInterviews.length) return null;

//     return Math.round(
//       scoredInterviews.reduce((sum, item) => sum + item.score, 0) /
//         scoredInterviews.length,
//     );
//   }, [scoredInterviews]);

//   const bestScore = useMemo(() => {
//     if (!scoredInterviews.length) return null;
//     return Math.round(Math.max(...scoredInterviews.map((item) => item.score)));
//   }, [scoredInterviews]);

//   const totalQuestionsAnswered = useMemo(
//     () =>
//       completedInterviews.reduce(
//         (sum, interview) =>
//           sum + Number(results[interview.id]?.answered_questions || 0),
//         0,
//       ),
//     [completedInterviews, results],
//   );

//   const practiceStreak = useMemo(() => {
//     const dates = completedInterviews
//       .map((interview) => interview.completed_at || interview.created_at)
//       .filter(Boolean)
//       .map((value) => {
//         const date = new Date(value);

//         if (Number.isNaN(date.getTime())) return null;

//         return new Date(
//           date.getFullYear(),
//           date.getMonth(),
//           date.getDate(),
//         ).getTime();
//       })
//       .filter(Boolean)
//       .sort((a, b) => b - a);

//     const uniqueDates = [...new Set(dates)];

//     if (!uniqueDates.length) return 0;

//     const today = new Date();
//     const todayTime = new Date(
//       today.getFullYear(),
//       today.getMonth(),
//       today.getDate(),
//     ).getTime();

//     const yesterday = new Date(today);
//     yesterday.setDate(yesterday.getDate() - 1);

//     const yesterdayTime = new Date(
//       yesterday.getFullYear(),
//       yesterday.getMonth(),
//       yesterday.getDate(),
//     ).getTime();

//     if (uniqueDates[0] !== todayTime && uniqueDates[0] !== yesterdayTime) {
//       return 0;
//     }

//     let streak = 1;

//     for (let i = 1; i < uniqueDates.length; i++) {
//       const difference =
//         (uniqueDates[i - 1] - uniqueDates[i]) / (1000 * 60 * 60 * 24);

//       if (difference === 1) {
//         streak++;
//       } else {
//         break;
//       }
//     }

//     return streak;
//   }, [completedInterviews]);

//   const typeStats = useMemo(() => {
//     const stats = {};

//     scoredInterviews.forEach((item) => {
//       const type = item.interview_type || "Technical";

//       if (!stats[type]) {
//         stats[type] = {
//           count: 0,
//           total: 0,
//         };
//       }

//       stats[type].count++;
//       stats[type].total += item.score;
//     });

//     return Object.entries(stats)
//       .map(([type, data]) => ({
//         type,
//         count: data.count,
//         average: Math.round(data.total / data.count),
//       }))
//       .sort((a, b) => b.average - a.average);
//   }, [scoredInterviews]);

//   const recentInterviews = useMemo(
//     () =>
//       [...completedInterviews]
//         .sort(
//           (a, b) =>
//             new Date(b.completed_at || b.created_at || 0) -
//             new Date(a.completed_at || a.created_at || 0),
//         )
//         .slice(0, 6),
//     [completedInterviews],
//   );

//   const formatDate = (value) => {
//     if (!value) return "Date unavailable";

//     const date = new Date(value);

//     if (Number.isNaN(date.getTime())) return "Date unavailable";

//     return date.toLocaleDateString("en-IN", {
//       day: "numeric",
//       month: "short",
//       year: "numeric",
//     });
//   };

//   const getScoreLabel = (score) => {
//     if (score === null || score === undefined) return "Not scored";
//     if (score >= 85) return "Excellent";
//     if (score >= 70) return "Strong";
//     if (score >= 50) return "Developing";
//     return "Needs Practice";
//   };

//   const getScoreColor = (score) => {
//     if (score >= 85) return "text-emerald-400";
//     if (score >= 70) return "text-cyan-400";
//     if (score >= 50) return "text-amber-400";
//     return "text-rose-400";
//   };

//   const getScoreBar = (score) => {
//     if (score >= 85) return "from-emerald-400 to-teal-400";
//     if (score >= 70) return "from-cyan-400 to-blue-500";
//     if (score >= 50) return "from-amber-400 to-orange-500";
//     return "from-rose-400 to-red-500";
//   };

//   const startInterview = () => {
//     navigate("/interview");
//   };

//   const handleLogout = () => {
//     localStorage.removeItem("access_token");
//     localStorage.removeItem("refresh_token");
//     localStorage.removeItem("user");
//     navigate("/login");
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-[#060912] text-white">
//         <div className="mx-auto max-w-7xl px-5 py-8">
//           <div className="animate-pulse">
//             <div className="h-8 w-36 rounded-xl bg-white/5" />
//             <div className="mt-12 h-12 w-96 max-w-full rounded-xl bg-white/5" />
//             <div className="mt-4 h-5 w-[500px] max-w-full rounded-lg bg-white/5" />

//             <div className="mt-10 h-52 rounded-3xl bg-white/[0.03]" />

//             <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//               {[1, 2, 3, 4].map((item) => (
//                 <div key={item} className="h-32 rounded-2xl bg-white/[0.03]" />
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-[#060912] text-white">
//       <div className="pointer-events-none fixed inset-0 overflow-hidden">
//         <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/[0.07] blur-3xl" />
//         <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-violet-500/[0.06] blur-3xl" />
//       </div>

//       <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#060912]/85 backdrop-blur-2xl">
//         <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-6">
//           <button
//             onClick={() => navigate("/dashboard")}
//             className="flex items-center gap-3"
//           >
//             <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 font-bold shadow-lg shadow-blue-500/10">
//               I
//             </div>

//             <div className="text-left">
//               <p className="text-lg font-bold tracking-tight">
//                 Interxora<span className="text-cyan-400">.ai</span>
//               </p>
//               <p className="hidden text-[9px] tracking-[0.2em] text-slate-600 sm:block">
//                 AI INTERVIEW PLATFORM
//               </p>
//             </div>
//           </button>

//           <div className="flex items-center gap-3">
//             <div className="hidden text-right md:block">
//               <p className="text-sm font-medium text-slate-200">{userName}</p>
//               <p className="text-[11px] text-slate-600">Interview candidate</p>
//             </div>

//             <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold">
//               {userName.charAt(0).toUpperCase()}
//             </div>

//             <button
//               onClick={handleLogout}
//               className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
//             >
//               Logout
//             </button>
//           </div>
//         </div>
//       </header>

//       <main className="relative mx-auto max-w-7xl px-5 py-8 md:px-6 md:py-10">
//         {error && (
//           <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] p-4">
//             <p className="text-sm text-rose-300">{error}</p>

//             <button
//               onClick={loadDashboard}
//               className="rounded-lg border border-rose-500/20 px-4 py-2 text-xs text-rose-300 hover:bg-rose-500/10"
//             >
//               Retry
//             </button>
//           </div>
//         )}

//         <section className="mb-8">
//           <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
//             <div>
//               <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/[0.05] px-3 py-1.5">
//                 <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
//                 <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
//                   AI Interview Coach
//                 </span>
//               </div>

//               <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
//                 Welcome back, {userName}.
//               </h1>

//               <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
//                 Track your interview performance, identify weak areas, and turn
//                 every practice session into measurable progress.
//               </p>
//             </div>

//             <button
//               onClick={startInterview}
//               className="rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-600 px-6 py-3.5 text-sm font-semibold shadow-xl shadow-blue-500/10 transition hover:-translate-y-0.5"
//             >
//               + New Interview
//             </button>
//           </div>
//         </section>

//         <section className="mb-8 overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-cyan-500/[0.09] via-blue-500/[0.06] to-violet-500/[0.08]">
//           <div className="relative grid gap-8 p-6 md:grid-cols-[1fr_auto] md:p-8">
//             <div>
//               <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-400">
//                 Practice intelligence
//               </span>

//               <h2 className="mt-3 max-w-2xl text-2xl font-bold md:text-3xl">
//                 Build interview confidence with every session.
//               </h2>

//               <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
//                 Practice technical, behavioral, HR, and system-design interviews
//                 with personalized AI evaluation.
//               </p>

//               <button
//                 onClick={startInterview}
//                 className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
//               >
//                 Start Practice →
//               </button>
//             </div>

//             <div className="grid grid-cols-2 gap-3 md:w-64">
//               <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
//                 <p className="text-[10px] uppercase tracking-widest text-slate-600">
//                   Completed
//                 </p>
//                 <p className="mt-2 text-2xl font-bold">
//                   {completedInterviews.length}
//                 </p>
//               </div>

//               <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
//                 <p className="text-[10px] uppercase tracking-widest text-slate-600">
//                   Questions
//                 </p>
//                 <p className="mt-2 text-2xl font-bold">
//                   {totalQuestionsAnswered}
//                 </p>
//               </div>
//             </div>
//           </div>
//         </section>

//         <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//           {[
//             {
//               label: "Average Score",
//               value: averageScore !== null ? `${averageScore}%` : "—",
//               sub: "Across scored interviews",
//               icon: "◉",
//               color: "text-cyan-400",
//             },
//             {
//               label: "Best Performance",
//               value: bestScore !== null ? `${bestScore}%` : "—",
//               sub: "Your highest score",
//               icon: "↗",
//               color: "text-emerald-400",
//             },
//             {
//               label: "Questions Answered",
//               value: totalQuestionsAnswered,
//               sub: "AI-evaluated responses",
//               icon: "⌘",
//               color: "text-violet-400",
//             },
//             {
//               label: "Practice Streak",
//               value: practiceStreak,
//               sub: practiceStreak === 1 ? "day" : "consecutive days",
//               icon: "✦",
//               color: "text-amber-400",
//             },
//           ].map((stat) => (
//             <article
//               key={stat.label}
//               className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.04]"
//             >
//               <div className="flex items-start justify-between">
//                 <span className={`text-lg ${stat.color}`}>{stat.icon}</span>
//                 <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
//               </div>

//               <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
//                 {stat.label}
//               </p>

//               <p className="mt-2 text-3xl font-bold tracking-tight">
//                 {stat.value}
//               </p>

//               <p className="mt-1 text-[11px] text-slate-600">{stat.sub}</p>
//             </article>
//           ))}
//         </section>

//         <section className="mb-10 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
//           <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 md:p-7">
//             <div className="flex items-end justify-between gap-4">
//               <div>
//                 <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
//                   Performance trend
//                 </p>
//                 <h2 className="mt-1 text-xl font-bold">
//                   Recent score trajectory
//                 </h2>
//               </div>

//               {averageScore !== null && (
//                 <span
//                   className={`text-sm font-semibold ${getScoreColor(averageScore)}`}
//                 >
//                   {getScoreLabel(averageScore)}
//                 </span>
//               )}
//             </div>

//             {scoredInterviews.length > 0 ? (
//               <div className="mt-8 flex h-52 items-end gap-3 overflow-hidden">
//                 {scoredInterviews.slice(-8).map((item, index) => (
//                   <div
//                     key={item.id}
//                     className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
//                   >
//                     <span className="text-[10px] font-semibold text-slate-500 opacity-0 transition group-hover:opacity-100">
//                       {Math.round(item.score)}%
//                     </span>

//                     <div className="relative flex h-40 w-full items-end justify-center rounded-xl bg-white/[0.02]">
//                       <div
//                         className={`w-full max-w-10 rounded-t-xl bg-gradient-to-t ${getScoreBar(
//                           item.score,
//                         )} transition-all duration-700`}
//                         style={{
//                           height: `${Math.max(item.score, 5)}%`,
//                         }}
//                       />
//                     </div>

//                     <span className="text-[9px] text-slate-700">
//                       #{index + 1}
//                     </span>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <div className="flex h-52 items-center justify-center">
//                 <div className="text-center">
//                   <div className="text-3xl">⌁</div>
//                   <p className="mt-3 text-sm text-slate-500">
//                     Complete an interview to see your performance trend.
//                   </p>
//                 </div>
//               </div>
//             )}
//           </div>

//           <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 md:p-7">
//             <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
//               Interview analytics
//             </p>

//             <h2 className="mt-1 text-xl font-bold">Performance by type</h2>

//             {typeStats.length > 0 ? (
//               <div className="mt-7 space-y-5">
//                 {typeStats.slice(0, 5).map((item) => (
//                   <div key={item.type}>
//                     <div className="mb-2 flex items-center justify-between gap-3">
//                       <span className="truncate text-xs font-medium text-slate-300">
//                         {item.type}
//                       </span>
//                       <span
//                         className={`text-xs font-bold ${getScoreColor(item.average)}`}
//                       >
//                         {item.average}%
//                       </span>
//                     </div>

//                     <div className="h-2 overflow-hidden rounded-full bg-slate-800">
//                       <div
//                         className={`h-full rounded-full bg-gradient-to-r ${getScoreBar(
//                           item.average,
//                         )}`}
//                         style={{ width: `${item.average}%` }}
//                       />
//                     </div>

//                     <p className="mt-1 text-[10px] text-slate-700">
//                       {item.count} interview{item.count !== 1 ? "s" : ""}
//                     </p>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <div className="mt-10 text-center">
//                 <p className="text-sm text-slate-500">
//                   No analytics available yet.
//                 </p>
//               </div>
//             )}
//           </div>
//         </section>

//         <section className="mb-10">
//           <div className="mb-5 flex items-end justify-between">
//             <div>
//               <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
//                 Practice
//               </p>

//               <h2 className="mt-1 text-xl font-bold">Choose your interview</h2>
//             </div>
//           </div>

//           <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//             {[
//               ["Technical", "⌘", "Algorithms, coding, CS fundamentals"],
//               ["HR", "◌", "Career, culture, motivation and goals"],
//               ["Behavioral", "◇", "Leadership, teamwork and situations"],
//               ["System Design", "⌂", "Architecture, APIs and scalability"],
//             ].map(([title, icon, description]) => (
//               <button
//                 key={title}
//                 onClick={startInterview}
//                 className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 text-left transition hover:-translate-y-1 hover:border-blue-400/20 hover:bg-white/[0.04]"
//               >
//                 <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg text-blue-300">
//                   {icon}
//                 </div>

//                 <h3 className="mt-5 font-semibold">{title}</h3>

//                 <p className="mt-2 min-h-10 text-xs leading-5 text-slate-600">
//                   {description}
//                 </p>

//                 <div className="mt-5 flex items-center justify-between">
//                   <span className="text-xs font-semibold text-blue-400">
//                     Start practice
//                   </span>

//                   <span className="transition group-hover:translate-x-1">
//                     →
//                   </span>
//                 </div>
//               </button>
//             ))}
//           </div>
//         </section>

//         <section>
//           <div className="mb-5 flex items-end justify-between">
//             <div>
//               <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
//                 History
//               </p>

//               <h2 className="mt-1 text-xl font-bold">Recent interviews</h2>

//               <p className="mt-1 text-sm text-slate-600">
//                 Review your latest AI-evaluated sessions.
//               </p>
//             </div>

//             {completedInterviews.length > 0 && (
//               <span className="text-[11px] text-slate-700">
//                 {completedInterviews.length} completed
//               </span>
//             )}
//           </div>

//           {recentInterviews.length === 0 ? (
//             <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
//               <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-2xl">
//                 +
//               </div>

//               <h3 className="mt-5 font-semibold">
//                 Your interview history is empty
//               </h3>

//               <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
//                 Complete your first interview and your AI performance history
//                 will appear here.
//               </p>

//               <button
//                 onClick={startInterview}
//                 className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100"
//               >
//                 Start Your First Interview →
//               </button>
//             </div>
//           ) : (
//             <div className="space-y-3">
//               {recentInterviews.map((interview) => {
//                 const result = results[interview.id];

//                 const score =
//                   typeof result?.percentage === "number"
//                     ? result.percentage
//                     : null;

//                 const answered = Number(result?.answered_questions || 0);

//                 const total = Number(
//                   result?.total_questions || interview.max_questions || 0,
//                 );

//                 return (
//                   <article
//                     key={interview.id}
//                     className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-blue-400/15 hover:bg-white/[0.04]"
//                   >
//                     <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
//                       <div className="flex min-w-0 items-center gap-4">
//                         <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/10 bg-blue-500/[0.06] text-blue-300">
//                           {interview.interview_type === "HR"
//                             ? "◌"
//                             : interview.interview_type === "Behavioral"
//                               ? "◇"
//                               : interview.interview_type === "System Design"
//                                 ? "⌂"
//                                 : "⌘"}
//                         </div>

//                         <div className="min-w-0">
//                           <div className="flex flex-wrap items-center gap-2">
//                             <h3 className="truncate text-sm font-semibold text-slate-200">
//                               {interview.role || "AI Interview"}
//                             </h3>

//                             <span className="rounded-full border border-emerald-500/15 bg-emerald-500/[0.05] px-2 py-1 text-[9px] font-medium text-emerald-400">
//                               Completed
//                             </span>
//                           </div>

//                           <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-slate-600">
//                             <span>
//                               {interview.interview_type || "Technical"}
//                             </span>
//                             <span>•</span>
//                             <span>{interview.difficulty || "Adaptive"}</span>
//                             <span>•</span>
//                             <span>
//                               {answered}/{total} questions
//                             </span>
//                             <span>•</span>
//                             <span>
//                               {formatDate(
//                                 interview.completed_at || interview.created_at,
//                               )}
//                             </span>
//                           </div>
//                         </div>
//                       </div>

//                       <div className="flex items-center justify-between gap-5 md:justify-end">
//                         <div>
//                           <p
//                             className={`text-2xl font-bold ${getScoreColor(
//                               score,
//                             )}`}
//                           >
//                             {score !== null ? `${Math.round(score)}%` : "—"}
//                           </p>

//                           <p className="text-[10px] text-slate-700">
//                             {getScoreLabel(score)}
//                           </p>
//                         </div>

//                         {/* <button
//                           onClick={() =>
//                             navigate(
//                               `/interview/session/${interview.id}`
//                             )
//                           }
//                           className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-400 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.04] hover:text-cyan-300"
//                         >
//                           View Report →
//                         </button> */}
//                         <button
//                           type="button"
//                           onClick={(e) => {
//                             e.preventDefault();
//                             e.stopPropagation();

//                             navigate(`/interview/session/${interview.id}`);
//                           }}
//                           className="relative z-20 cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 active:scale-95"
//                         >
//                           View Report →
//                         </button>
//                       </div>
//                     </div>
//                   </article>
//                 );
//               })}
//             </div>
//           )}
//         </section>
//       </main>

//       <footer className="relative mt-12 border-t border-white/[0.07]">
//         <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-5 py-7 text-center sm:flex-row sm:text-left">
//           <p className="text-xs text-slate-700">
//             © {new Date().getFullYear()}{" "}
//             <span className="font-medium text-slate-500">Interxora.ai</span>
//           </p>

//           <p className="text-[10px] tracking-wide text-slate-700">
//             AI-powered adaptive interview platform
//           </p>
//         </div>
//       </footer>
//     </div>
//   );
// }

// export default Dashboard;



//.......................................new...............................
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";

function Dashboard() {
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("recent");
  const [showAllHistory, setShowAllHistory] = useState(false);

  // =========================================================
  // AUTH
  // =========================================================

  const accessToken = localStorage.getItem("access_token");

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
  };

  // =========================================================
  // USER
  // =========================================================

  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const userName =
    storedUser?.name ||
    storedUser?.full_name ||
    storedUser?.username ||
    storedUser?.email?.split("@")[0] ||
    "there";

  // =========================================================
  // LOAD DASHBOARD DATA
  // =========================================================

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      if (!accessToken) {
        navigate("/login");
        return;
      }

      // Get all interviews belonging to current user
      const interviewData = await apiRequest("/interviews/", {
        method: "GET",
        headers: authHeaders,
      });

      console.log("Dashboard interviews:", interviewData);

      const interviewList = Array.isArray(interviewData)
        ? interviewData
        : interviewData?.interviews || [];

      setInterviews(interviewList);

      // -------------------------------------------------------
      // Get result information for completed interviews
      // -------------------------------------------------------

      const completedInterviews = interviewList.filter(
        (interview) => interview.status === "completed",
      );

      const resultEntries = await Promise.all(
        completedInterviews.map(async (interview) => {
          try {
            const result = await apiRequest(
              `/interviews/${interview.id}/result`,
              {
                method: "GET",
                headers: authHeaders,
              },
            );

            return [interview.id, result];
          } catch (err) {
            console.error(
              `Failed to load result for interview ${interview.id}:`,
              err,
            );

            return [interview.id, null];
          }
        }),
      );

      const resultMap = Object.fromEntries(
        resultEntries.filter(([, result]) => result !== null),
      );

      console.log("Dashboard results:", resultMap);

      setResults(resultMap);
    } catch (err) {
      console.error("Dashboard loading failed:", err);

      if (
        err?.message?.toLowerCase?.().includes("token") ||
        err?.message?.toLowerCase?.().includes("unauthorized")
      ) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }

      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // =========================================================
  // START INTERVIEW
  // =========================================================

  const startInterview = () => {
    navigate("/interview");
  };

  // =========================================================
  // COMPLETED INTERVIEWS
  // =========================================================

  const completedInterviews = useMemo(() => {
    return interviews.filter((interview) => interview.status === "completed");
  }, [interviews]);

  // =========================================================
  // TOTAL QUESTIONS ANSWERED
  // =========================================================

  const totalQuestionsAnswered = useMemo(() => {
    return completedInterviews.reduce((total, interview) => {
      const result = results[interview.id];

      return total + Number(result?.answered_questions || 0);
    }, 0);
  }, [completedInterviews, results]);

  // =========================================================
  // AVERAGE SCORE
  // =========================================================

  const averageScore = useMemo(() => {
    const percentages = completedInterviews
      .map((interview) => results[interview.id]?.percentage)
      .filter((score) => typeof score === "number");

    if (percentages.length === 0) {
      return null;
    }

    const average =
      percentages.reduce((sum, score) => sum + score, 0) / percentages.length;

    return Math.round(average);
  }, [completedInterviews, results]);

  // =========================================================
  // PRACTICE STREAK
  // =========================================================

  const practiceStreak = useMemo(() => {
    const completedDates = completedInterviews
      .map((interview) => {
        const dateValue = interview.completed_at || interview.created_at;

        if (!dateValue) return null;

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return null;

        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      })
      .filter(Boolean)
      .sort((a, b) => b - a);

    if (completedDates.length === 0) {
      return 0;
    }

    // Remove duplicate days
    const uniqueDates = [];

    completedDates.forEach((date) => {
      const alreadyExists = uniqueDates.some(
        (existing) => existing.getTime() === date.getTime(),
      );

      if (!alreadyExists) {
        uniqueDates.push(date);
      }
    });

    const today = new Date();

    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    // Streak starts only if user practiced today or yesterday
    const firstDate = uniqueDates[0];

    if (
      firstDate.getTime() !== todayDate.getTime() &&
      firstDate.getTime() !== yesterdayDate.getTime()
    ) {
      return 0;
    }

    let streak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const previous = uniqueDates[i - 1];
      const current = uniqueDates[i];

      const difference =
        (previous.getTime() - current.getTime()) / (1000 * 60 * 60 * 24);

      if (difference === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }, [completedInterviews]);

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (dateValue) => {
    if (!dateValue) return "Date unavailable";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // =========================================================
  // SCORE LABEL
  // =========================================================

  const getScoreLabel = (percentage) => {
    if (percentage === null || percentage === undefined) {
      return "Not scored";
    }

    if (percentage >= 85) return "Excellent";
    if (percentage >= 70) return "Strong";
    if (percentage >= 50) return "Developing";

    return "Needs Practice";
  };

  // =========================================================
  // SCORE COLOR
  // =========================================================

  const getScoreColor = (percentage) => {
    if (percentage >= 85) return "text-emerald-400";
    if (percentage >= 70) return "text-cyan-400";
    if (percentage >= 50) return "text-amber-400";

    return "text-rose-400";
  };

  // =========================================================
  // ADVANCED DASHBOARD ANALYTICS
  // =========================================================

  const activeInterviews = useMemo(() => {
    return interviews.filter((interview) => interview.status === "started");
  }, [interviews]);

  const scoredInterviews = useMemo(() => {
    return completedInterviews
      .map((interview) => ({
        interview,
        result: results[interview.id],
        score:
          typeof results[interview.id]?.percentage === "number"
            ? results[interview.id].percentage
            : null,
      }))
      .filter((item) => item.score !== null);
  }, [completedInterviews, results]);

  const bestScore = useMemo(() => {
    if (!scoredInterviews.length) return null;
    return Math.round(Math.max(...scoredInterviews.map((item) => item.score)));
  }, [scoredInterviews]);

  const recentScored = useMemo(() => {
    return [...scoredInterviews]
      .sort(
        (a, b) =>
          new Date(b.interview.completed_at || b.interview.created_at || 0) -
          new Date(a.interview.completed_at || a.interview.created_at || 0),
      )
      .slice(0, 7);
  }, [scoredInterviews]);

  const scoreTrend = useMemo(() => {
    if (recentScored.length < 2) return null;
    return Math.round(recentScored[0].score - recentScored[1].score);
  }, [recentScored]);

  const readinessScore = useMemo(() => {
    if (averageScore === null) return null;
    if (scoredInterviews.length < 2) return averageScore;

    const variance =
      scoredInterviews.reduce(
        (sum, item) => sum + Math.pow(item.score - averageScore, 2),
        0,
      ) / scoredInterviews.length;

    const consistency = Math.max(0, Math.min(100, 100 - Math.sqrt(variance) * 2));
    return Math.round(averageScore * 0.8 + consistency * 0.2);
  }, [averageScore, scoredInterviews]);

  const typeStats = useMemo(() => {
    const map = {};
    completedInterviews.forEach((interview) => {
      const type = interview.interview_type || "Other";
      if (!map[type]) map[type] = { count: 0, scores: [] };
      map[type].count += 1;
      const score = results[interview.id]?.percentage;
      if (typeof score === "number") map[type].scores.push(score);
    });

    return Object.entries(map)
      .map(([type, data]) => ({
        type,
        count: data.count,
        average: data.scores.length
          ? Math.round(data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length)
          : null,
      }))
      .sort((a, b) => b.count - a.count);
  }, [completedInterviews, results]);

  const strongestInterview = useMemo(() => {
    if (!scoredInterviews.length) return null;
    return [...scoredInterviews].sort((a, b) => b.score - a.score)[0];
  }, [scoredInterviews]);

  const weakestInterview = useMemo(() => {
    if (!scoredInterviews.length) return null;
    return [...scoredInterviews].sort((a, b) => a.score - b.score)[0];
  }, [scoredInterviews]);

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();

    let list = completedInterviews.filter((interview) => {
      const role = String(interview.role || "").toLowerCase();
      const type = String(interview.interview_type || "").toLowerCase();
      const matchesSearch = !query || role.includes(query) || type.includes(query);
      const matchesType =
        typeFilter === "All" || String(interview.interview_type || "Other") === typeFilter;
      return matchesSearch && matchesType;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "score") {
        return Number(results[b.id]?.percentage ?? -1) - Number(results[a.id]?.percentage ?? -1);
      }
      if (sortBy === "oldest") {
        return new Date(a.completed_at || a.created_at || 0) - new Date(b.completed_at || b.created_at || 0);
      }
      return new Date(b.completed_at || b.created_at || 0) - new Date(a.completed_at || a.created_at || 0);
    });

    return showAllHistory ? list : list.slice(0, 6);
  }, [completedInterviews, results, search, typeFilter, sortBy, showAllHistory]);

  const formatShortDate = (dateValue) => {
    if (!dateValue) return "—";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const getScoreBar = (percentage) => {
    if (percentage >= 85) return "from-emerald-500 to-teal-400";
    if (percentage >= 70) return "from-cyan-500 to-blue-500";
    if (percentage >= 50) return "from-amber-500 to-orange-400";
    return "from-rose-500 to-red-400";
  };

  // =========================================================
  // LOADING SCREEN
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <header className="border-b border-white/10 bg-slate-950/90">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Interxora<span className="text-cyan-400">.ai</span>
              </h1>

              <p className="text-xs text-slate-500">AI Interview Platform</p>
            </div>

            <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-800" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-10">
          <div className="animate-pulse">
            <div className="h-4 w-28 rounded bg-slate-800" />

            <div className="mt-4 h-10 w-80 rounded bg-slate-800" />

            <div className="mt-3 h-4 w-[500px] max-w-full rounded bg-slate-800" />

            <div className="mt-10 h-48 rounded-3xl bg-slate-900" />

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-36 rounded-2xl bg-slate-900" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================
  // MAIN DASHBOARD
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          {/* LOGO */}

          <button onClick={() => navigate("/dashboard")} className="text-left">
            <h1 className="text-xl font-bold tracking-tight">
              Interxora<span className="text-cyan-400">.ai</span>
            </h1>

            <p className="hidden text-[10px] text-slate-500 sm:block">
              AI Interview Platform
            </p>
          </button>

          {/* NAV RIGHT */}

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">Welcome, {userName}</p>

              <p className="text-xs text-slate-500">
                Keep improving every interview.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        {/* ===================================================
            HERO
        =================================================== */}

        <section className="mb-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />

                <span className="text-xs font-medium text-cyan-300">
                  AI Interview Coach
                </span>
              </div>

              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Your Interview Dashboard
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
                Practice realistic interviews, track your performance, and use
                AI-powered feedback to become interview ready.
              </p>
            </div>

            {/* QUICK ACTION */}

            <button
              onClick={startInterview}
              className="shrink-0 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 px-6 py-3.5 text-sm font-semibold shadow-lg shadow-cyan-500/10 transition hover:-translate-y-0.5 hover:shadow-cyan-500/20"
            >
              + New Interview
            </button>
          </div>
        </section>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
            <div>
              <p className="text-sm font-medium text-rose-300">
                Unable to load some dashboard data
              </p>

              <p className="mt-1 text-xs text-rose-400/70">{error}</p>
            </div>

            <button
              onClick={loadDashboard}
              className="shrink-0 rounded-lg border border-rose-500/20 px-4 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/10"
            >
              Retry
            </button>
          </div>
        )}

        {/* ===================================================
            HERO ACTION CARD
        =================================================== */}

        <section className="mb-10">
          <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.10] via-blue-500/[0.08] to-violet-500/[0.10] p-6 md:p-8">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="absolute -bottom-24 right-1/4 h-60 w-60 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
                  ✦
                </div>

                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                  Practice makes progress
                </p>

                <h3 className="mt-2 text-2xl font-bold md:text-3xl">
                  Ready for your next interview?
                </h3>

                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                  Create a personalized session and practice with an adaptive AI
                  interviewer based on your target role.
                </p>

                <button
                  onClick={startInterview}
                  className="mt-6 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Start Interview →
                </button>
              </div>

              {/* MINI SUMMARY */}

              <div className="grid grid-cols-2 gap-3 md:w-64">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs text-slate-500">Completed</p>

                  <p className="mt-1 text-2xl font-bold">
                    {completedInterviews.length}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-600">interviews</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs text-slate-500">Average</p>

                  <p className="mt-1 text-2xl font-bold">
                    {averageScore !== null ? `${averageScore}%` : "—"}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-600">performance</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================
            STATISTICS
        =================================================== */}

        <section className="mb-10">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Performance
            </p>

            <h3 className="mt-1 text-xl font-semibold">Your Progress</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* INTERVIEWS */}

            <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-500/20 hover:bg-white/[0.045]">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-lg">
                  🎤
                </div>

                <span className="text-xs text-slate-600">SESSIONS</span>
              </div>

              <p className="mt-5 text-3xl font-bold">
                {completedInterviews.length}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Completed interviews
              </p>
            </div>

            {/* QUESTIONS */}

            <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-blue-500/20 hover:bg-white/[0.045]">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-lg">
                  ❓
                </div>

                <span className="text-xs text-slate-600">ANSWERED</span>
              </div>

              <p className="mt-5 text-3xl font-bold">
                {totalQuestionsAnswered}
              </p>

              <p className="mt-1 text-sm text-slate-500">Questions answered</p>
            </div>

            {/* AVERAGE */}

            <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-violet-500/20 hover:bg-white/[0.045]">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-lg">
                  📈
                </div>

                <span className="text-xs text-slate-600">AVERAGE</span>
              </div>

              <p className="mt-5 text-3xl font-bold">
                {averageScore !== null ? `${averageScore}%` : "—"}
              </p>

              <p className="mt-1 text-sm text-slate-500">Overall performance</p>
            </div>

            {/* STREAK */}

            <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-orange-500/20 hover:bg-white/[0.045]">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-lg">
                  🔥
                </div>

                <span className="text-xs text-slate-600">STREAK</span>
              </div>

              <p className="mt-5 text-3xl font-bold">{practiceStreak}</p>

              <p className="mt-1 text-sm text-slate-500">Practice days</p>
            </div>
          </div>
        </section>

        {/* ===================================================
            PERFORMANCE ANALYTICS
        =================================================== */}
        <section className="mb-10 grid gap-5 lg:grid-cols-[1.4fr_0.85fr]">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 md:p-7">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Analytics</p>
                <h3 className="mt-1 text-xl font-semibold">Performance trend</h3>
                <p className="mt-1 text-xs text-slate-600">Your latest scored interviews.</p>
              </div>
              {scoreTrend !== null && (
                <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${scoreTrend >= 0 ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-rose-500/20 bg-rose-500/10 text-rose-400"}`}>
                  {scoreTrend >= 0 ? "↑" : "↓"} {Math.abs(scoreTrend)} pts vs previous
                </span>
              )}
            </div>

            {recentScored.length ? (
              <div className="mt-7 flex h-48 items-end gap-2 sm:gap-4">
                {recentScored.map((item) => {
                  const height = Math.max(8, Math.min(100, item.score));
                  return (
                    <button key={item.interview.id} onClick={() => navigate(`/interview/session/${item.interview.id}`)} className="group flex h-full flex-1 flex-col justify-end" title="Open report">
                      <span className="mb-2 text-[10px] font-semibold text-slate-500 opacity-0 transition group-hover:opacity-100">{Math.round(item.score)}%</span>
                      <div className="relative flex-1">
                        <div className="absolute bottom-0 left-1/2 h-full w-full max-w-12 -translate-x-1/2 overflow-hidden rounded-t-xl bg-slate-900">
                          <div className={`absolute bottom-0 w-full bg-gradient-to-t ${getScoreBar(item.score)} transition-all`} style={{ height: `${height}%` }} />
                        </div>
                      </div>
                      <span className="mt-3 text-[9px] text-slate-700">{formatShortDate(item.interview.completed_at || item.interview.created_at)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-7 rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-600">Complete interviews to unlock your performance trend.</div>
            )}
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">AI readiness</p>
            <h3 className="mt-1 text-xl font-semibold">Interview readiness</h3>
            <div className="mt-7 flex items-center gap-5">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#22d3ee ${readinessScore ?? 0}%, rgba(255,255,255,0.06) 0)` }}>
                <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-[#090d17]">
                  <span className="text-2xl font-bold">{readinessScore !== null ? readinessScore : "—"}</span>
                  <span className="text-[9px] uppercase tracking-widest text-slate-600">/ 100</span>
                </div>
              </div>
              <div>
                <p className={`text-sm font-semibold ${getScoreColor(readinessScore)}`}>{readinessScore !== null ? getScoreLabel(readinessScore) : "Not enough data"}</p>
                <p className="mt-2 text-xs leading-6 text-slate-600">Based on your average score and consistency across completed sessions.</p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <div><div className="mb-1 flex justify-between text-[10px] text-slate-600"><span>Average</span><span>{averageScore !== null ? `${averageScore}%` : "—"}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-900"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${averageScore || 0}%` }} /></div></div>
              <div><div className="mb-1 flex justify-between text-[10px] text-slate-600"><span>Best</span><span>{bestScore !== null ? `${bestScore}%` : "—"}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-900"><div className="h-full rounded-full bg-violet-400" style={{ width: `${bestScore || 0}%` }} /></div></div>
            </div>
          </div>
        </section>

        {/* ===================================================
            PERSONALIZED INSIGHTS
        =================================================== */}
        <section className="mb-10 grid gap-4 md:grid-cols-3">
          <button onClick={() => strongestInterview && navigate(`/interview/session/${strongestInterview.interview.id}`)} disabled={!strongestInterview} className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.025] p-5 text-left transition hover:bg-emerald-500/[0.05] disabled:cursor-default">
            <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Personal best</span><span>🏆</span></div>
            <p className="mt-4 truncate text-sm font-semibold">{strongestInterview?.interview?.role || "No scored interview yet"}</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">{strongestInterview ? `${Math.round(strongestInterview.score)}%` : "—"}</p>
            <p className="mt-1 text-[11px] text-slate-600">Highest interview score</p>
          </button>
          <button onClick={() => weakestInterview && navigate(`/interview/session/${weakestInterview.interview.id}`)} disabled={!weakestInterview} className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.025] p-5 text-left transition hover:bg-amber-500/[0.05] disabled:cursor-default">
            <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">Focus area</span><span>🎯</span></div>
            <p className="mt-4 truncate text-sm font-semibold">{weakestInterview?.interview?.role || "No scored interview yet"}</p>
            <p className="mt-2 text-3xl font-bold text-amber-400">{weakestInterview ? `${Math.round(weakestInterview.score)}%` : "—"}</p>
            <p className="mt-1 text-[11px] text-slate-600">Review this report to improve</p>
          </button>
          <div className="rounded-2xl border border-blue-500/10 bg-blue-500/[0.025] p-5">
            <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400">Activity</span><span>⚡</span></div>
            <div className="mt-4 space-y-2.5">
              <div className="flex justify-between rounded-xl bg-white/[0.025] px-3 py-2.5 text-xs"><span className="text-slate-600">Completed</span><b>{completedInterviews.length}</b></div>
              <div className="flex justify-between rounded-xl bg-white/[0.025] px-3 py-2.5 text-xs"><span className="text-slate-600">Active</span><b>{activeInterviews.length}</b></div>
              <div className="flex justify-between rounded-xl bg-white/[0.025] px-3 py-2.5 text-xs"><span className="text-slate-600">Questions</span><b>{totalQuestionsAnswered}</b></div>
            </div>
          </div>
        </section>

        {/* ===================================================
            TYPE PERFORMANCE
        =================================================== */}
        <section className="mb-10 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 md:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Coverage</p><h3 className="mt-1 text-xl font-semibold">Interview type performance</h3><p className="mt-1 text-xs text-slate-600">Understand which practice modes you use most.</p></div>
            <button onClick={startInterview} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/[0.05]">Customize interview →</button>
          </div>
          {typeStats.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{typeStats.slice(0,4).map((item)=><div key={item.type} className="rounded-2xl border border-white/[0.06] bg-[#080c15] p-4"><div className="flex justify-between gap-3"><p className="truncate text-sm font-semibold">{item.type}</p><span className="text-[10px] text-slate-700">{item.count} session{item.count===1?"":"s"}</span></div><p className="mt-4 text-2xl font-bold">{item.average !== null ? `${item.average}%` : "—"}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-900"><div className={`h-full rounded-full bg-gradient-to-r ${getScoreBar(item.average || 0)}`} style={{width:`${item.average || 0}%`}} /></div></div>)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-600">Type analytics will appear after your first completed interview.</div>}
        </section>

        {/* ===================================================
                     INTERVIEW TYPES
        =================================================== */}

        <section className="mb-10">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Practice
            </p>

            <h3 className="mt-1 text-xl font-semibold">
              Choose Your Interview
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Start with a focused practice mode or create a fully customized
              interview.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* TECHNICAL */}

            <button
              onClick={startInterview}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:-translate-y-1 hover:border-cyan-500/30 hover:bg-white/[0.045]"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-xl">
                💻
              </div>

              <h4 className="font-semibold">Technical</h4>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Programming, CS fundamentals, technical concepts and
                role-specific questions.
              </p>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-medium text-cyan-400">
                  Start practice
                </span>

                <span className="transition group-hover:translate-x-1">→</span>
              </div>
            </button>

            {/* HR */}

            <button
              onClick={startInterview}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:-translate-y-1 hover:border-blue-500/30 hover:bg-white/[0.045]"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-xl">
                🤝
              </div>

              <h4 className="font-semibold">HR Interview</h4>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Practice common HR questions, confidence, communication and
                career discussions.
              </p>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-medium text-blue-400">
                  Start practice
                </span>

                <span className="transition group-hover:translate-x-1">→</span>
              </div>
            </button>

            {/* BEHAVIORAL */}

            <button
              onClick={startInterview}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:-translate-y-1 hover:border-violet-500/30 hover:bg-white/[0.045]"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-xl">
                🧠
              </div>

              <h4 className="font-semibold">Behavioral</h4>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Situational questions, teamwork, leadership and problem-solving
                scenarios.
              </p>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-medium text-violet-400">
                  Start practice
                </span>

                <span className="transition group-hover:translate-x-1">→</span>
              </div>
            </button>

            {/* SYSTEM DESIGN */}

            <button
              onClick={startInterview}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:-translate-y-1 hover:border-purple-500/30 hover:bg-white/[0.045]"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-xl">
                🏗️
              </div>

              <h4 className="font-semibold">System Design</h4>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Architecture, scalability, APIs, databases and
                distributed-system scenarios.
              </p>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-medium text-purple-400">
                  Start practice
                </span>

                <span className="transition group-hover:translate-x-1">→</span>
              </div>
            </button>
          </div>
        </section>

        {/* ===================================================
    RECENT INTERVIEWS
=================================================== */}

        <section>
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                History
              </p>

              <h3 className="mt-1 text-xl font-semibold">Recent Interviews</h3>

              <p className="mt-1 text-sm text-slate-500">
                Review your latest interview sessions and performance.
              </p>
            </div>

            {completedInterviews.length > 0 && (
              <span className="text-xs text-slate-600">
                {completedInterviews.length} completed
              </span>
            )}
          </div>

          {completedInterviews.length > 0 && (
            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_160px]">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700">⌕</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search role or interview type..."
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.025] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-700 focus:border-cyan-500/30"
                />
              </div>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-white/[0.08] bg-[#0a0f1a] px-4 py-3 text-sm text-slate-300 outline-none">
                <option>All</option>
                {typeStats.map((item) => <option key={item.type}>{item.type}</option>)}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-xl border border-white/[0.08] bg-[#0a0f1a] px-4 py-3 text-sm text-slate-300 outline-none">
                <option value="recent">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="score">Highest score</option>
              </select>
            </div>
          )}

          {/* NO INTERVIEWS */}

          {completedInterviews.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-2xl">
                📋
              </div>

              <h4 className="text-lg font-semibold">
                No completed interviews yet
              </h4>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Complete your first AI interview and your performance history
                will appear here.
              </p>

              <button
                onClick={startInterview}
                className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Start Your First Interview →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((interview) => {
                const result = results[interview.id];

                const percentage =
                  typeof result?.percentage === "number"
                    ? result.percentage
                    : null;

                const answered = Number(result?.answered_questions || 0);

                const total = Number(
                  result?.total_questions || interview.max_questions || 0,
                );

                return (
                  <div
                    key={interview.id}
                    className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-500/20 hover:bg-white/[0.045]"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      {/* LEFT */}

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-base font-semibold md:text-lg">
                            {interview.role || "AI Interview"}
                          </h4>

                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                            Completed
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>{interview.interview_type || "Interview"}</span>

                          <span className="text-slate-700">•</span>

                          <span>{interview.difficulty || "Adaptive"}</span>

                          <span className="text-slate-700">•</span>

                          <span>
                            {answered}/{total} questions
                          </span>

                          <span className="text-slate-700">•</span>

                          <span>
                            {formatDate(
                              interview.completed_at || interview.created_at,
                            )}
                          </span>
                        </div>
                      </div>

                      {/* RIGHT */}

                      <div className="flex items-center justify-between gap-6 md:justify-end">
                        <div className="text-left md:text-right">
                          <p
                            className={`text-2xl font-bold ${getScoreColor(
                              percentage,
                            )}`}
                          >
                            {percentage !== null
                              ? `${Math.round(percentage)}%`
                              : "—"}
                          </p>

                          <p className="text-[11px] text-slate-600">
                            {getScoreLabel(percentage)}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            navigate(`/interview/session/${interview.id}`)
                          }
                          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-cyan-500/30 hover:bg-cyan-500/5 hover:text-cyan-300"
                        >
                          View Results →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {completedInterviews.length > 6 && (
            <button
              onClick={() => setShowAllHistory((value) => !value)}
              className="mt-4 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] py-3 text-xs font-medium text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-300"
            >
              {showAllHistory ? "Show less ↑" : `Show all ${completedInterviews.length} interviews ↓`}
            </button>
          )}
        </section>
      </main>

      {/* =====================================================
    FOOTER
===================================================== */}

      <footer className="mt-12 border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-center sm:flex-row sm:text-left">
          <p className="text-sm text-slate-600">
            © {new Date().getFullYear()}{" "}
            <span className="font-medium text-slate-400">Interxora.ai</span>
          </p>

          <p className="text-xs text-slate-700">
            AI-powered adaptive interview platform
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Dashboard;
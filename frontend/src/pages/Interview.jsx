// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { createInterview } from "../services/api";

// function Interview() {
//   const navigate = useNavigate();

//   const [role, setRole] = useState("");

//   const [interviewMode, setInterviewMode] = useState("Technical");

//   const [customFocus, setCustomFocus] = useState([]);
//   const [customInstructions, setCustomInstructions] = useState("");

//   const [difficulty, setDifficulty] = useState("Adaptive");

//   const [questionCount, setQuestionCount] = useState("10");

//   const [customQuestionCount, setCustomQuestionCount] = useState("20");

//   const [experience, setExperience] = useState("Fresher");

//   const [timeLimit, setTimeLimit] = useState("30");

//   const [language, setLanguage] = useState("English");

//   const [sessionMode, setSessionMode] = useState("Interview");

//   const [skills, setSkills] = useState([]);

//   const [skillInput, setSkillInput] = useState("");

//   const [jobDescription, setJobDescription] = useState("");

//   const [resume, setResume] = useState(null);

//   // =========================
//   // ADD SKILL
//   // =========================

//   const addSkill = () => {
//     const skill = skillInput.trim();

//     if (!skill) return;

//     if (skills.includes(skill)) {
//       setSkillInput("");
//       return;
//     }

//     setSkills([...skills, skill]);
//     setSkillInput("");
//   };

//   // =========================
//   // REMOVE SKILL
//   // =========================

//   const removeSkill = (skillToRemove) => {
//     setSkills(skills.filter((skill) => skill !== skillToRemove));
//   };

//   const toggleCustomFocus = (focus) => {
//     setCustomFocus((current) =>
//       current.includes(focus)
//         ? current.filter((item) => item !== focus)
//         : [...current, focus],
//     );
//   };

//   // =========================
//   // START INTERVIEW
//   // =========================

//   const handleStartInterview = async () => {
//   if (!role.trim()) {
//     alert("Please enter your target role.");
//     return;
//   }

//   const finalQuestionCount =
//     questionCount === "custom"
//       ? Number(customQuestionCount)
//       : Number(questionCount);

//   if (
//     !finalQuestionCount ||
//     finalQuestionCount < 1 ||
//     finalQuestionCount > 50
//   ) {
//     alert("Questions must be between 1 and 50.");
//     return;
//   }

//   if (
//     interviewMode === "Custom" &&
//     customFocus.length === 0
//   ) {
//     alert("Please select at least one interview focus.");
//     return;
//   }

//   const accessToken = localStorage.getItem("access_token");

//   if (!accessToken) {
//     alert("Your session has expired. Please login again.");
//     navigate("/login");
//     return;
//   }

//   const interviewData = {
//     role: role.trim(),
//     interview_type: interviewMode,
//     difficulty,
//     max_questions: finalQuestionCount,
//     time_limit: Number(timeLimit),
//   };

//   try {
//     const createdInterview = await createInterview(interviewData);

//     console.log(
//       "Interview created:",
//       createdInterview
//     );

//     // Save the complete frontend configuration temporarily.
//     sessionStorage.setItem(
//       "interview_config",
//       JSON.stringify({
//         ...interviewData,
//         experience_level: experience,
//         language,
//         session_mode: sessionMode,
//         skills,
//         custom_focus: customFocus,
//         custom_instructions: customInstructions.trim(),
//         job_description: jobDescription.trim(),
//         resume_name: resume ? resume.name : null,
//       })
//     );

//     // Go to the actual interview session.
//     navigate(
//       `/interview/session/${createdInterview.id}`
//     );

//   } catch (error) {
//     console.error(
//       "Interview creation error:",
//       error
//     );

//     alert(
//       error.message ||
//         "Unable to create interview. Please try again."
//     );
//    }
//   };

//   return (
//     <div className="min-h-screen bg-slate-950 text-white">
//       {/* =====================================================
//           NAVBAR
//       ===================================================== */}

//       <header className="border-b border-slate-800 bg-slate-950/90">
//         <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
//           <button
//             onClick={() => navigate("/dashboard")}
//             className="text-xl font-bold tracking-tight"
//           >
//             Interxora
//             <span className="text-cyan-400">.ai</span>
//           </button>

//           <button
//             onClick={() => navigate("/dashboard")}
//             className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
//           >
//             ← Dashboard
//           </button>
//         </div>
//       </header>

//       {/* =====================================================
//           MAIN
//       ===================================================== */}

//       <main className="mx-auto max-w-5xl px-5 py-10 sm:px-6 lg:py-14">
//         {/* PAGE HEADER */}

//         <div className="mb-10">
//           <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-400">
//             Interview Configuration
//           </p>

//           <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
//             Build your interview
//           </h1>

//           <p className="mt-3 max-w-2xl text-slate-400">
//             Customize your AI-powered interview based on your role, experience,
//             skills, and preparation goals.
//           </p>
//         </div>

//         {/* =====================================================
//             TARGET ROLE
//         ===================================================== */}

//         <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-7">
//           <div className="mb-5">
//             <h2 className="text-lg font-semibold">Target role</h2>

//             <p className="mt-1 text-sm text-slate-500">
//               Tell Interxora.ai what role you're preparing for.
//             </p>
//           </div>

//           <input
//             type="text"
//             value={role}
//             onChange={(e) => setRole(e.target.value)}
//             placeholder="e.g. Python Full Stack Developer"
//             className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
//           />
//         </section>

//         {/* =====================================================
//             INTERVIEW MODE
//         ===================================================== */}

//         <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-7">
//           <div className="mb-5">
//             <h2 className="text-lg font-semibold">Interview mode</h2>

//             <p className="mt-1 text-sm text-slate-500">
//               Choose what you want to practice.
//             </p>
//           </div>

//           <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
//             {[
//               {
//                 name: "Technical",
//                 description: "Technical concepts and CS fundamentals",
//               },
//               {
//                 name: "Coding",
//                 description: "Programming and problem solving",
//               },
//               {
//                 name: "Behavioral",
//                 description: "Situational and behavioral questions",
//               },
//               {
//                 name: "System Design",
//                 description: "Architecture and scalable systems",
//               },
//               {
//                 name: "HR",
//                 description: "Recruiter and HR preparation",
//               },
//               {
//                 name: "Custom",
//                 description: "Build your own interview",
//               },
//             ].map((mode) => (
//               <button
//                 key={mode.name}
//                 type="button"
//                 onClick={() => setInterviewMode(mode.name)}
//                 className={`rounded-xl border p-4 text-left transition ${
//                   interviewMode === mode.name
//                     ? "border-cyan-500 bg-cyan-500/10"
//                     : "border-slate-700 bg-slate-950 hover:border-slate-600"
//                 }`}
//               >
//                 <div className="flex items-center justify-between">
//                   <span
//                     className={`font-medium ${
//                       interviewMode === mode.name
//                         ? "text-cyan-300"
//                         : "text-slate-200"
//                     }`}
//                   >
//                     {mode.name}
//                   </span>

//                   {interviewMode === mode.name && (
//                     <span className="text-cyan-400">✓</span>
//                   )}
//                 </div>

//                 <p className="mt-2 text-xs leading-5 text-slate-500">
//                   {mode.description}
//                 </p>
//               </button>
//             ))}
//           </div>
//         </section>

//         {/* =====================================================
//                    CUSTOM INTERVIEW CONFIGURATION
//         ===================================================== */}

//         {interviewMode === "Custom" && (
//           <section className="mb-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6 sm:p-7">
//             <div className="mb-6">
//               <h2 className="text-lg font-semibold">
//                 Custom interview configuration
//               </h2>

//               <p className="mt-1 text-sm text-slate-500">
//                 Choose exactly what you want Interxora.ai to focus on.
//               </p>
//             </div>

//             {/* Interview Focus */}

//             <div className="mb-7">
//               <label className="mb-3 block text-sm font-medium text-slate-200">
//                 Interview focus
//               </label>

//               <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
//                 {[
//                   "Technical",
//                   "Coding",
//                   "Behavioral",
//                   "HR",
//                   "System Design",
//                   "Problem Solving",
//                 ].map((focus) => {
//                   const selected = customFocus.includes(focus);

//                   return (
//                     <button
//                       key={focus}
//                       type="button"
//                       onClick={() => toggleCustomFocus(focus)}
//                       className={`rounded-xl border p-4 text-left transition ${
//                         selected
//                           ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
//                           : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600"
//                       }`}
//                     >
//                       <div className="flex items-center justify-between">
//                         <span className="font-medium">{focus}</span>

//                         {selected && <span className="text-cyan-400">✓</span>}
//                       </div>
//                     </button>
//                   );
//                 })}
//               </div>

//               {customFocus.length === 0 && (
//                 <p className="mt-3 text-xs text-slate-600">
//                   Select at least one focus area.
//                 </p>
//               )}
//             </div>

//             {/* Custom Instructions */}

//             <div>
//               <label className="mb-2 block text-sm font-medium text-slate-200">
//                 Custom instructions
//                 <span className="ml-2 text-xs font-normal text-slate-600">
//                   Optional
//                 </span>
//               </label>

//               <textarea
//                 value={customInstructions}
//                 onChange={(e) => setCustomInstructions(e.target.value)}
//                 rows="5"
//                 maxLength="1000"
//                 placeholder="Example: Focus heavily on backend API design, authentication, PostgreSQL and real-world problem solving."
//                 className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500"
//               />

//               <div className="mt-2 flex justify-between text-xs text-slate-600">
//                 <span>
//                   Tell the AI how you want your custom interview to behave.
//                 </span>

//                 <span>{customInstructions.length}/1000</span>
//               </div>
//             </div>
//           </section>
//         )}

//         {/* =====================================================
//             DIFFICULTY + EXPERIENCE
//         ===================================================== */}

//         <div className="mb-6 grid gap-6 lg:grid-cols-2">
//           {/* Difficulty */}

//           <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
//             <h2 className="text-lg font-semibold">Difficulty</h2>

//             <p className="mt-1 text-sm text-slate-500">
//               Select how challenging the questions should be.
//             </p>

//             <div className="mt-5 grid grid-cols-2 gap-3">
//               {["Beginner", "Intermediate", "Advanced", "Adaptive"].map(
//                 (level) => (
//                   <button
//                     key={level}
//                     type="button"
//                     onClick={() => setDifficulty(level)}
//                     className={`rounded-xl border px-3 py-3 text-sm transition ${
//                       difficulty === level
//                         ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
//                         : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600"
//                     }`}
//                   >
//                     {level}
//                   </button>
//                 ),
//               )}
//             </div>
//           </section>

//           {/* Experience */}

//           <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
//             <h2 className="text-lg font-semibold">Experience level</h2>

//             <p className="mt-1 text-sm text-slate-500">
//               Helps AI adjust the interview expectations.
//             </p>

//             <select
//               value={experience}
//               onChange={(e) => setExperience(e.target.value)}
//               className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
//             >
//               <option>Fresher</option>
//               <option>Entry Level</option>
//               <option>1–2 Years</option>
//               <option>3–5 Years</option>
//               <option>5+ Years</option>
//             </select>
//           </section>
//         </div>

//         {/* =====================================================
//             SKILLS
//         ===================================================== */}

//         <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-7">
//           <div className="mb-5">
//             <h2 className="text-lg font-semibold">Focus areas</h2>

//             <p className="mt-1 text-sm text-slate-500">
//               Add technologies or topics you want the AI to focus on.
//             </p>
//           </div>

//           <div className="flex gap-3">
//             <input
//               type="text"
//               value={skillInput}
//               onChange={(e) => setSkillInput(e.target.value)}
//               onKeyDown={(e) => {
//                 if (e.key === "Enter") {
//                   e.preventDefault();
//                   addSkill();
//                 }
//               }}
//               placeholder="e.g. Python, FastAPI, React..."
//               className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-500"
//             />

//             <button
//               type="button"
//               onClick={addSkill}
//               className="rounded-xl bg-slate-800 px-5 py-3 font-medium text-slate-200 transition hover:bg-slate-700"
//             >
//               Add
//             </button>
//           </div>

//           {skills.length > 0 && (
//             <div className="mt-4 flex flex-wrap gap-2">
//               {skills.map((skill) => (
//                 <button
//                   key={skill}
//                   type="button"
//                   onClick={() => removeSkill(skill)}
//                   className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-300 transition hover:bg-red-500/10 hover:text-red-300"
//                 >
//                   {skill} ×
//                 </button>
//               ))}
//             </div>
//           )}
//         </section>

//         {/* =====================================================
//             QUESTIONS
//         ===================================================== */}

//         <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-7">
//           <div className="mb-5">
//             <h2 className="text-lg font-semibold">Number of questions</h2>

//             <p className="mt-1 text-sm text-slate-500">
//               Choose a preset or create your own interview length.
//             </p>
//           </div>

//           <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
//             {["5", "10", "15", "custom"].map((count) => (
//               <button
//                 key={count}
//                 type="button"
//                 onClick={() => setQuestionCount(count)}
//                 className={`rounded-xl border px-4 py-3 text-sm transition ${
//                   questionCount === count
//                     ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
//                     : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600"
//                 }`}
//               >
//                 {count === "custom" ? "Custom" : `${count} Questions`}
//               </button>
//             ))}
//           </div>

//           {questionCount === "custom" && (
//             <div className="mt-4">
//               <label className="mb-2 block text-sm text-slate-400">
//                 Custom number of questions
//               </label>

//               <input
//                 type="number"
//                 min="1"
//                 max="50"
//                 value={customQuestionCount}
//                 onChange={(e) => setCustomQuestionCount(e.target.value)}
//                 className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
//               />

//               <p className="mt-2 text-xs text-slate-600">
//                 Choose between 1 and 50 questions.
//               </p>
//             </div>
//           )}
//         </section>

//         {/* =====================================================
//             SESSION SETTINGS
//         ===================================================== */}

//         <div className="mb-6 grid gap-6 lg:grid-cols-3">
//           {/* Session Mode */}

//           <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
//             <h2 className="font-semibold">Session mode</h2>

//             <div className="mt-4 space-y-2">
//               {["Interview", "Practice"].map((mode) => (
//                 <button
//                   key={mode}
//                   type="button"
//                   onClick={() => setSessionMode(mode)}
//                   className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
//                     sessionMode === mode
//                       ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
//                       : "border-slate-700 bg-slate-950 text-slate-400"
//                   }`}
//                 >
//                   {mode}
//                 </button>
//               ))}
//             </div>
//           </section>

//           {/* Time Limit */}

//           <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
//             <h2 className="font-semibold">Time limit</h2>

//             <select
//               value={timeLimit}
//               onChange={(e) => setTimeLimit(e.target.value)}
//               className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
//             >
//               <option value="0">No limit</option>

//               <option value="15">15 minutes</option>

//               <option value="30">30 minutes</option>

//               <option value="45">45 minutes</option>

//               <option value="60">60 minutes</option>
//             </select>
//           </section>

//           {/* Language */}

//           <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
//             <h2 className="font-semibold">Language</h2>

//             <select
//               value={language}
//               onChange={(e) => setLanguage(e.target.value)}
//               className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
//             >
//               <option>English</option>
//               <option>Hindi</option>
//               <option>Hinglish</option>
//             </select>
//           </section>
//         </div>

//         {/* =====================================================
//             JOB DESCRIPTION
//         ===================================================== */}

//         <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-7">
//           <div className="mb-5">
//             <h2 className="text-lg font-semibold">
//               Job description
//               <span className="ml-2 text-xs font-normal text-slate-600">
//                 Optional
//               </span>
//             </h2>

//             <p className="mt-1 text-sm text-slate-500">
//               Paste a job description to make the interview more relevant to a
//               specific position.
//             </p>
//           </div>

//           <textarea
//             value={jobDescription}
//             onChange={(e) => setJobDescription(e.target.value)}
//             rows="6"
//             placeholder="Paste the job description here..."
//             className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500"
//           />
//         </section>

//         {/* =====================================================
//             RESUME
//         ===================================================== */}

//         <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-7">
//           <div className="mb-5">
//             <h2 className="text-lg font-semibold">
//               Resume
//               <span className="ml-2 text-xs font-normal text-slate-600">
//                 Optional
//               </span>
//             </h2>

//             <p className="mt-1 text-sm text-slate-500">
//               Upload your resume for personalized interview questions.
//             </p>
//           </div>

//           <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950 px-6 py-8 text-center transition hover:border-cyan-500/50">
//             <span className="mb-3 text-3xl">📄</span>

//             <span className="font-medium text-slate-300">
//               {resume ? resume.name : "Choose your resume"}
//             </span>

//             <span className="mt-1 text-xs text-slate-600">PDF recommended</span>

//             <input
//               type="file"
//               accept=".pdf,.doc,.docx"
//               className="hidden"
//               onChange={(e) => setResume(e.target.files?.[0] || null)}
//             />
//           </label>
//         </section>
//         {/* =====================================================
//             SUMMARY
//         ===================================================== */}

//         <section className="mb-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
//           <div className="mb-5">
//             <h2 className="text-lg font-semibold">Interview summary</h2>

//             <p className="mt-1 text-sm text-slate-500">
//               Review your configuration before starting.
//             </p>
//           </div>

//           <div className="grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
//             <div>
//               <p className="text-slate-500">Target role</p>

//               <p className="mt-1 font-medium text-white">
//                 {role || "Not specified"}
//               </p>
//             </div>

//             <div>
//               <p className="text-slate-500">Interview mode</p>

//               <p className="mt-1 font-medium text-white">{interviewMode}</p>
//             </div>

//             <div>
//               <p className="text-slate-500">Difficulty</p>

//               <p className="mt-1 font-medium text-white">{difficulty}</p>
//             </div>

//             <div>
//               <p className="text-slate-500">Questions</p>

//               <p className="mt-1 font-medium text-white">
//                 {questionCount === "custom"
//                   ? customQuestionCount
//                   : questionCount}
//               </p>
//             </div>

//             <div>
//               <p className="text-slate-500">Session</p>

//               <p className="mt-1 font-medium text-white">{sessionMode}</p>
//             </div>

//             <div>
//               <p className="text-slate-500">Language</p>

//               <p className="mt-1 font-medium text-white">{language}</p>
//             </div>
//           </div>
//         </section>

//         {/* =====================================================
//             START INTERVIEW
//         ===================================================== */}

//         <button
//           type="button"
//           onClick={handleStartInterview}
//           className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-600 px-6 py-4 text-base font-semibold text-white shadow-xl shadow-blue-500/10 transition hover:scale-[1.01] hover:shadow-blue-500/20"
//         >
//           Start AI Interview →
//         </button>

//         <p className="mt-4 text-center text-xs text-slate-600">
//           Your interview will be generated based on your selected configuration.
//         </p>
//       </main>
//     </div>
//   );
// }

// export default Interview;




//...................................................

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createInterview } from "../services/api";

function Interview() {
  const navigate = useNavigate();

  const [role, setRole] = useState("");
  const [interviewMode, setInterviewMode] = useState("Technical");
  const [customFocus, setCustomFocus] = useState([]);
  const [customInstructions, setCustomInstructions] = useState("");

  const [difficulty, setDifficulty] = useState("Adaptive");
  const [questionCount, setQuestionCount] = useState("10");
  const [customQuestionCount, setCustomQuestionCount] = useState("20");
  const [experience, setExperience] = useState("Fresher");

  const [timeLimit, setTimeLimit] = useState("30");
  const [language, setLanguage] = useState("English");
  const [sessionMode, setSessionMode] = useState("Interview");

  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState(null);

  const [isCreating, setIsCreating] = useState(false);

  // =========================
  // ADD SKILL
  // =========================

  const addSkill = () => {
    const skill = skillInput.trim();

    if (!skill) return;

    if (skills.includes(skill)) {
      setSkillInput("");
      return;
    }

    setSkills([...skills, skill]);
    setSkillInput("");
  };

  // =========================
  // REMOVE SKILL
  // =========================

  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  // =========================
  // CUSTOM FOCUS
  // =========================

  const toggleCustomFocus = (focus) => {
    setCustomFocus((current) =>
      current.includes(focus)
        ? current.filter((item) => item !== focus)
        : [...current, focus]
    );
  };

  // =========================
  // START INTERVIEW
  // =========================

  const handleStartInterview = async () => {
    if (!role.trim()) {
      alert("Please enter your target role.");
      return;
    }

    const finalQuestionCount =
      questionCount === "custom"
        ? Number(customQuestionCount)
        : Number(questionCount);

    if (
      !finalQuestionCount ||
      finalQuestionCount < 1 ||
      finalQuestionCount > 50
    ) {
      alert("Questions must be between 1 and 50.");
      return;
    }

    if (interviewMode === "Custom" && customFocus.length === 0) {
      alert("Please select at least one interview focus.");
      return;
    }

    const accessToken = localStorage.getItem("access_token");

    if (!accessToken) {
      alert("Your session has expired. Please login again.");
      navigate("/login");
      return;
    }

    const interviewData = {
      role: role.trim(),
      interview_type: interviewMode,
      difficulty,
      max_questions: finalQuestionCount,
      time_limit: Number(timeLimit),
    };

    try {
      setIsCreating(true);

      const createdInterview = await createInterview(interviewData);

      console.log("Interview created:", createdInterview);

      // Save the complete frontend configuration temporarily.
      sessionStorage.setItem(
        "interview_config",
        JSON.stringify({
          ...interviewData,
          experience_level: experience,
          language,
          session_mode: sessionMode,
          skills,
          custom_focus: customFocus,
          custom_instructions: customInstructions.trim(),
          job_description: jobDescription.trim(),
          resume_name: resume ? resume.name : null,
        })
      );

      // Go to the actual interview session.
      navigate(`/interview/session/${createdInterview.id}`);
    } catch (error) {
      console.error("Interview creation error:", error);

      alert(
        error.message || "Unable to create interview. Please try again."
      );

      setIsCreating(false);
    }
  };

  const interviewModes = [
    {
      name: "Technical",
      icon: "⌘",
      description: "Technical concepts and CS fundamentals",
    },
    {
      name: "Coding",
      icon: "</>",
      description: "Programming and problem solving",
    },
    {
      name: "Behavioral",
      icon: "◉",
      description: "Situational and behavioral questions",
    },
    {
      name: "System Design",
      icon: "◇",
      description: "Architecture and scalable systems",
    },
    {
      name: "HR",
      icon: "◎",
      description: "Recruiter and HR preparation",
    },
    {
      name: "Custom",
      icon: "✦",
      description: "Build your own interview",
    },
  ];

  const focusOptions = [
    "Technical",
    "Coding",
    "Behavioral",
    "HR",
    "System Design",
    "Problem Solving",
  ];

  const difficultyOptions = [
    {
      name: "Beginner",
      description: "Fundamental questions",
    },
    {
      name: "Intermediate",
      description: "Real interview level",
    },
    {
      name: "Advanced",
      description: "Challenging scenarios",
    },
    {
      name: "Adaptive",
      description: "AI adjusts difficulty",
    },
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      {/* =====================================================
          BACKGROUND EFFECTS
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-80 w-80 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute -right-40 top-96 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#070b14]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="group flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 shadow-lg shadow-cyan-500/5">
              <span className="text-sm font-bold text-cyan-300">I</span>
            </div>

            <div className="text-left">
              <div className="text-lg font-bold tracking-tight">
                Interxora<span className="text-cyan-400">.ai</span>
              </div>
              <div className="hidden text-[10px] uppercase tracking-[0.18em] text-slate-600 sm:block">
                AI Interview Coach
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="group flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">
              ←
            </span>
            Dashboard
          </button>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="relative mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <section className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/10 bg-cyan-400/[0.06] px-3 py-1.5 text-xs font-medium text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
            AI Interview Configuration
          </div>

          <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Build your
            <span className="text-cyan-400"> perfect interview.</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Configure your AI-powered interview around your target role,
            experience, skills, and preparation goals.
          </p>
        </section>

        {/* =====================================================
            TARGET ROLE
        ===================================================== */}

        <section className="mb-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 shadow-2xl shadow-black/10 backdrop-blur-sm sm:p-7">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.07] text-lg">
              🎯
            </div>

            <div>
              <h2 className="text-lg font-semibold">Target role</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Tell Interxora.ai what role you're preparing for.
              </p>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Python Full Stack Developer"
              className="w-full rounded-xl border border-white/[0.08] bg-[#050811] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/[0.12] focus:border-cyan-400/50 focus:bg-[#070b14] focus:ring-4 focus:ring-cyan-400/[0.06]"
            />

            {role.trim() && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-emerald-400">
                ✓ Ready
              </div>
            )}
          </div>
        </section>

        {/* =====================================================
            INTERVIEW MODE
        ===================================================== */}

        <section className="mb-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 shadow-2xl shadow-black/10 sm:p-7">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/10 bg-blue-400/[0.07] text-lg">
              ✦
            </div>

            <div>
              <h2 className="text-lg font-semibold">Interview mode</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Choose what you want to practice.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {interviewModes.map((mode) => {
              const selected = interviewMode === mode.name;

              return (
                <button
                  key={mode.name}
                  type="button"
                  onClick={() => setInterviewMode(mode.name)}
                  className={`group relative rounded-2xl border p-5 text-left transition-all duration-200 ${
                    selected
                      ? "border-cyan-400/40 bg-cyan-400/[0.07] shadow-lg shadow-cyan-500/5"
                      : "border-white/[0.07] bg-[#050811] hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.035]"
                  }`}
                >
                  {selected && (
                    <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400 text-xs font-bold text-slate-950">
                      ✓
                    </div>
                  )}

                  <div
                    className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold ${
                      selected
                        ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                        : "border-white/[0.08] bg-white/[0.03] text-slate-400"
                    }`}
                  >
                    {mode.icon}
                  </div>

                  <h3
                    className={`font-semibold ${
                      selected ? "text-cyan-300" : "text-slate-200"
                    }`}
                  >
                    {mode.name}
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {mode.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* =====================================================
            CUSTOM INTERVIEW
        ===================================================== */}

        {interviewMode === "Custom" && (
          <section className="mb-6 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.025] p-6 shadow-xl shadow-cyan-500/[0.02] sm:p-7">
            <div className="mb-7 flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/10 text-lg text-cyan-300">
                ✦
              </div>

              <div>
                <h2 className="text-lg font-semibold">
                  Custom interview configuration
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Choose exactly what you want Interxora.ai to focus on.
                </p>
              </div>
            </div>

            {/* Focus */}

            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-200">
                  Interview focus
                </label>

                <span className="text-xs text-slate-600">
                  {customFocus.length} selected
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {focusOptions.map((focus) => {
                  const selected = customFocus.includes(focus);

                  return (
                    <button
                      key={focus}
                      type="button"
                      onClick={() => toggleCustomFocus(focus)}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm transition ${
                        selected
                          ? "border-cyan-400/30 bg-cyan-400/[0.07] text-cyan-300"
                          : "border-white/[0.07] bg-[#050811] text-slate-400 hover:border-white/[0.14] hover:text-slate-200"
                      }`}
                    >
                      <span>{focus}</span>

                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-md border text-[11px] ${
                          selected
                            ? "border-cyan-400 bg-cyan-400 text-slate-950"
                            : "border-white/[0.1] text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>

              {customFocus.length === 0 && (
                <p className="mt-3 text-xs text-amber-400/70">
                  Select at least one focus area.
                </p>
              )}
            </div>

            {/* Instructions */}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-200">
                  Custom instructions
                  <span className="ml-2 text-xs font-normal text-slate-600">
                    Optional
                  </span>
                </label>

                <span className="text-xs text-slate-600">
                  {customInstructions.length}/1000
                </span>
              </div>

              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows="5"
                maxLength="1000"
                placeholder="Example: Focus heavily on backend API design, authentication, PostgreSQL and real-world problem solving."
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#050811] px-4 py-3.5 text-sm leading-6 text-white outline-none placeholder:text-slate-600 transition focus:border-cyan-400/40 focus:ring-4 focus:ring-cyan-400/[0.05]"
              />

              <p className="mt-2 text-xs text-slate-600">
                Tell the AI how you want your custom interview to behave.
              </p>
            </div>
          </section>
        )}

        {/* =====================================================
            DIFFICULTY + EXPERIENCE
        ===================================================== */}

        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {/* Difficulty */}

          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-7">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/10 bg-violet-400/[0.07] text-lg">
                ◈
              </div>

              <div>
                <h2 className="text-lg font-semibold">Difficulty</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Select how challenging the questions should be.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {difficultyOptions.map((level) => {
                const selected = difficulty === level.name;

                return (
                  <button
                    key={level.name}
                    type="button"
                    onClick={() => setDifficulty(level.name)}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-cyan-400/30 bg-cyan-400/[0.07]"
                        : "border-white/[0.07] bg-[#050811] hover:border-white/[0.14]"
                    }`}
                  >
                    <div
                      className={`text-sm font-medium ${
                        selected ? "text-cyan-300" : "text-slate-300"
                      }`}
                    >
                      {level.name}
                    </div>

                    <div className="mt-1 text-[11px] leading-4 text-slate-600">
                      {level.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Experience */}

          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-7">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/10 bg-emerald-400/[0.07] text-lg">
                ◉
              </div>

              <div>
                <h2 className="text-lg font-semibold">Experience level</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Helps AI adjust the interview expectations.
                </p>
              </div>
            </div>

            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#050811] px-4 py-3.5 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-4 focus:ring-cyan-400/[0.05]"
            >
              <option>Fresher</option>
              <option>Entry Level</option>
              <option>1–2 Years</option>
              <option>3–5 Years</option>
              <option>5+ Years</option>
            </select>
          </section>
        </div>

        {/* =====================================================
            SKILLS
        ===================================================== */}

        <section className="mb-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-7">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/10 bg-amber-400/[0.07] text-lg">
              ⚡
            </div>

            <div>
              <h2 className="text-lg font-semibold">Focus areas</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Add technologies or topics you want the AI to focus on.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="e.g. Python, FastAPI, React..."
              className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#050811] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40 focus:ring-4 focus:ring-cyan-400/[0.05]"
            />

            <button
              type="button"
              onClick={addSkill}
              className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.06] hover:text-cyan-300"
            >
              + Add skill
            </button>
          </div>

          {skills.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="group rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-3.5 py-2 text-xs font-medium text-cyan-300 transition hover:border-rose-400/20 hover:bg-rose-400/[0.06] hover:text-rose-300"
                >
                  {skill}
                  <span className="ml-2 text-cyan-500/60 group-hover:text-rose-400">
                    ×
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-600">
              Add skills such as React, Python, SQL, FastAPI, Java, C++, or
              system design.
            </p>
          )}
        </section>

        {/* =====================================================
            QUESTIONS
        ===================================================== */}

        <section className="mb-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-7">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/10 bg-blue-400/[0.07] text-lg">
              #
            </div>

            <div>
              <h2 className="text-lg font-semibold">Number of questions</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Choose a preset or create your own interview length.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {["5", "10", "15", "custom"].map((count) => {
              const selected = questionCount === count;

              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => setQuestionCount(count)}
                  className={`rounded-xl border px-4 py-4 text-sm font-medium transition ${
                    selected
                      ? "border-cyan-400/30 bg-cyan-400/[0.07] text-cyan-300"
                      : "border-white/[0.07] bg-[#050811] text-slate-400 hover:border-white/[0.14] hover:text-slate-200"
                  }`}
                >
                  {count === "custom" ? "Custom" : `${count} Questions`}
                </button>
              );
            })}
          </div>

          {questionCount === "custom" && (
            <div className="mt-5 rounded-xl border border-white/[0.06] bg-[#050811] p-4">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Custom number of questions
              </label>

              <input
                type="number"
                min="1"
                max="50"
                value={customQuestionCount}
                onChange={(e) => setCustomQuestionCount(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#070b14] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40"
              />

              <p className="mt-2 text-xs text-slate-600">
                Choose between 1 and 50 questions.
              </p>
            </div>
          )}
        </section>

        {/* =====================================================
            SESSION SETTINGS
        ===================================================== */}

        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          {/* Session Mode */}

          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <div className="mb-4">
              <h2 className="font-semibold">Session mode</h2>
              <p className="mt-1 text-xs text-slate-600">
                Choose your preparation style.
              </p>
            </div>

            <div className="space-y-2">
              {["Interview", "Practice"].map((mode) => {
                const selected = sessionMode === mode;

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSessionMode(mode)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selected
                        ? "border-cyan-400/30 bg-cyan-400/[0.07] text-cyan-300"
                        : "border-white/[0.07] bg-[#050811] text-slate-400 hover:border-white/[0.14]"
                    }`}
                  >
                    <span>{mode}</span>
                    {selected && <span>✓</span>}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Time */}

          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <div className="mb-4">
              <h2 className="font-semibold">Time limit</h2>
              <p className="mt-1 text-xs text-slate-600">
                Set a limit for your session.
              </p>
            </div>

            <select
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#050811] px-4 py-3.5 text-sm text-white outline-none focus:border-cyan-400/40"
            >
              <option value="0">No limit</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </section>

          {/* Language */}

          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <div className="mb-4">
              <h2 className="font-semibold">Language</h2>
              <p className="mt-1 text-xs text-slate-600">
                Choose your interview language.
              </p>
            </div>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#050811] px-4 py-3.5 text-sm text-white outline-none focus:border-cyan-400/40"
            >
              <option>English</option>
              <option>Hindi</option>
              <option>Hinglish</option>
            </select>
          </section>
        </div>

        {/* =====================================================
            JOB DESCRIPTION
        ===================================================== */}

        <section className="mb-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-7">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/10 bg-indigo-400/[0.07] text-lg">
              JD
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                Job description
                <span className="ml-2 rounded-full border border-white/[0.07] px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-slate-600">
                  Optional
                </span>
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Paste a job description to make the interview more relevant to
                a specific position.
              </p>
            </div>
          </div>

          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows="6"
            placeholder="Paste the job description here..."
            className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#050811] px-4 py-3.5 text-sm leading-6 text-white outline-none placeholder:text-slate-600 transition focus:border-cyan-400/40 focus:ring-4 focus:ring-cyan-400/[0.05]"
          />

          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>
              AI can use this information to make questions more role-specific.
            </span>

            <span>{jobDescription.length} characters</span>
          </div>
        </section>

        {/* =====================================================
            RESUME
        ===================================================== */}

        <section className="mb-8 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-7">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-400/10 bg-rose-400/[0.07] text-lg">
              📄
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                Resume
                <span className="ml-2 rounded-full border border-white/[0.07] px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-slate-600">
                  Optional
                </span>
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Upload your resume for personalized interview questions.
              </p>
            </div>
          </div>

          <label
            className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition ${
              resume
                ? "border-cyan-400/30 bg-cyan-400/[0.04]"
                : "border-white/[0.1] bg-[#050811] hover:border-cyan-400/30 hover:bg-cyan-400/[0.02]"
            }`}
          >
            <div
              className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl transition ${
                resume
                  ? "border-cyan-400/20 bg-cyan-400/10"
                  : "border-white/[0.08] bg-white/[0.03] group-hover:border-cyan-400/20 group-hover:bg-cyan-400/[0.05]"
              }`}
            >
              {resume ? "✓" : "↑"}
            </div>

            <span
              className={`font-medium ${
                resume ? "text-cyan-300" : "text-slate-300"
              }`}
            >
              {resume ? resume.name : "Choose your resume"}
            </span>

            <span className="mt-2 text-xs text-slate-600">
              PDF, DOC or DOCX • PDF recommended
            </span>

            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => setResume(e.target.files?.[0] || null)}
            />
          </label>

          {resume && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-cyan-400/10 bg-cyan-400/[0.04] px-4 py-3 text-xs">
              <span className="truncate text-slate-400">
                Selected:{" "}
                <span className="text-slate-200">{resume.name}</span>
              </span>

              <button
                type="button"
                onClick={() => setResume(null)}
                className="ml-4 shrink-0 text-rose-400 transition hover:text-rose-300"
              >
                Remove
              </button>
            </div>
          )}
        </section>

        {/* =====================================================
            SUMMARY
        ===================================================== */}

        <section className="mb-8 overflow-hidden rounded-2xl border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.05] via-blue-400/[0.025] to-transparent shadow-xl shadow-cyan-500/[0.02]">
          <div className="border-b border-white/[0.06] px-6 py-5 sm:px-7">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/10 text-lg text-cyan-300">
                ✓
              </div>

              <div>
                <h2 className="text-lg font-semibold">
                  Interview summary
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Review your configuration before starting.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-white/[0.04] sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Target role", role || "Not specified"],
              ["Interview mode", interviewMode],
              ["Difficulty", difficulty],
              [
                "Questions",
                questionCount === "custom"
                  ? customQuestionCount
                  : questionCount,
              ],
              ["Session", sessionMode],
              ["Language", language],
            ].map(([label, value]) => (
              <div
                key={label}
                className="bg-[#070b14]/80 px-6 py-5 sm:px-7"
              >
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-600">
                  {label}
                </p>

                <p className="mt-2 truncate text-sm font-semibold text-slate-200">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-white/[0.06] px-6 py-4 sm:px-7">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
              <span>
                <span className="text-slate-600">Skills:</span>{" "}
                {skills.length > 0 ? skills.join(", ") : "None added"}
              </span>

              {interviewMode === "Custom" && (
                <span>
                  <span className="text-slate-600">Focus:</span>{" "}
                  {customFocus.length > 0
                    ? customFocus.join(", ")
                    : "Not selected"}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================
            START INTERVIEW
        ===================================================== */}

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
          <button
            type="button"
            onClick={handleStartInterview}
            disabled={isCreating}
            className={`group relative w-full overflow-hidden rounded-xl px-6 py-4 text-sm font-semibold text-white shadow-xl transition-all duration-200 ${
              isCreating
                ? "cursor-not-allowed bg-slate-700"
                : "bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-600 shadow-blue-500/10 hover:-translate-y-0.5 hover:shadow-blue-500/20"
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isCreating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating your interview...
                </>
              ) : (
                <>
                  Start AI Interview
                  <span className="text-base transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </>
              )}
            </span>
          </button>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center text-[11px] text-slate-600">
            <span>✦ AI-generated questions</span>
            <span>•</span>
            <span>Real-time evaluation</span>
            <span>•</span>
            <span>Personalized feedback</span>
          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-slate-700">
          Your interview will be generated based on your selected
          configuration.
        </p>
      </main>
    </div>
  );
}

export default Interview;
// import { useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import AuthLayout from "../components/AuthLayout";
// import { apiRequest } from "../services/api";

// function Register() {
//   const navigate = useNavigate();

//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");

//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");
//   const [loading, setLoading] = useState(false);

//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);

//   const handleRegister = async (e) => {
//     e.preventDefault();

//     setError("");
//     setSuccess("");

//     // Check password confirmation
//     if (password !== confirmPassword) {
//       setError("Passwords do not match.");
//       return;
//     }

//     if (password.length < 6) {
//       setError("Password must be at least 6 characters.");
//       return;
//     }

//     setLoading(true);

//     try {
//       setLoading(true);
//       const data = await apiRequest("/auth/register", {
//         method: "POST",
//         body: JSON.stringify({
//           name,
//           email,
//           password,
//         }),
//       });

//       console.log("Registration response:", data);

//       setSuccess("Account created successfully!");

//       // Give user a moment to see success message
//       setTimeout(() => {
//         navigate("/login");
//       }, 1000);

//     } catch (err) {
//       console.error("Registration error:", err);

//       setError(
//         err?.message ||
//           "Registration failed. Please check your details and try again."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <AuthLayout>
//       <div className="w-full">

//         {/* Heading */}
//         <div className="mb-7">
//           <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
//             Create your account
//           </h2>

//           <p className="mt-2 text-sm text-slate-400">
//             Start your interview journey with Interxora.ai.
//           </p>
//         </div>

//         {/* Error */}
//         {error && (
//           <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
//             {error}
//           </div>
//         )}

//         {/* Success */}
//         {success && (
//           <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
//             {success}
//           </div>
//         )}

//         {/* Register Form */}
//         <form onSubmit={handleRegister} className="space-y-5">

//           {/* Name */}
//           <div>
//             <label className="mb-2 block text-sm font-medium text-slate-200">
//               Full name
//             </label>

//             <input
//               type="text"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               placeholder="Enter your full name"
//               required
//               className="w-full rounded-xl border border-blue-500/30 bg-blue-950/40 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
//             />
//           </div>

//           {/* Email */}
//           <div>
//             <label className="mb-2 block text-sm font-medium text-slate-200">
//               Email address
//             </label>

//             <input
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               placeholder="you@example.com"
//               required
//               className="w-full rounded-xl border border-blue-500/30 bg-blue-950/40 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
//             />
//           </div>

//           {/* Password */}
//           <div>
//             <label className="mb-2 block text-sm font-medium text-slate-200">
//               Password
//             </label>

//             <div className="relative">
//               <input
//                 type={showPassword ? "text" : "password"}
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 placeholder="Create a password"
//                 required
//                 className="w-full rounded-xl border border-blue-500/30 bg-blue-950/40 px-4 py-3 pr-16 text-white placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
//               />

//               <button
//                 type="button"
//                 onClick={() => setShowPassword(!showPassword)}
//                 className="absolute cursor-pointer right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-cyan-400 hover:text-cyan-300"
//               >
//                 {showPassword ? "Hide" : "Show"}
//               </button>
//             </div>

//             <p className="mt-2 text-xs text-slate-500">
//               Use at least 6 characters.
//             </p>
//           </div>

//           {/* Confirm Password */}
//           <div>
//             <label className="mb-2 block text-sm font-medium text-slate-200">
//               Confirm password
//             </label>

//             <div className="relative">
//               <input
//                 type={showConfirmPassword ? "text" : "password"}
//                 value={confirmPassword}
//                 onChange={(e) => setConfirmPassword(e.target.value)}
//                 placeholder="Confirm your password"
//                 required
//                 className="w-full rounded-xl border border-blue-500/30 bg-blue-950/40 px-4 py-3 pr-16 text-white placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
//               />

//               <button
//                 type="button"
//                 onClick={() =>
//                   setShowConfirmPassword(!showConfirmPassword)
//                 }
//                 className="absolute cursor-pointer right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-cyan-400 hover:text-cyan-300"
//               >
//                 {showConfirmPassword ? "Hide" : "Show"}
//               </button>
//             </div>
//           </div>

//           {/* Create Account */}
//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:scale-[1.01] hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
//           >
//             {loading ? "Creating account..." : "Create account"}
//           </button>
//         </form>

//         {/* Divider */}
//         <div className="my-6 flex items-center gap-4">
//           <div className="h-px flex-1 bg-slate-700" />

//           <span className="text-xs font-medium text-slate-500">
//             OR
//           </span>

//           <div className="h-px flex-1 bg-slate-700" />
//         </div>

//         {/* Google OAuth */}
//         <button
//           type="button"
//           onClick={() => {
//             window.location.href = "http://localhost:8000/auth/google";
//           }}
//           className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
//         >
//           <span className="text-lg font-bold">G</span>
//           Continue with Google
//         </button>

//         {/* Login Link */}
//         <p className="mt-7 text-center text-sm text-slate-400">
//           Already have an account?{" "}
//           <Link
//             to="/login"
//             className="font-semibold text-cyan-400 transition hover:text-cyan-300"
//           >
//             Sign in
//           </Link>
//         </p>

//       </div>
//     </AuthLayout>
//   );
// }

// export default Register;


//................................new..............................

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { apiRequest } from "../services/api";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      console.log("Registration response:", data);

      setSuccess("Account created successfully!");

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (err) {
      console.error("Registration error:", err);

      setError(
        err?.message ||
          "Registration failed. Please check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    window.location.href = "http://localhost:8000/auth/google";
  };

  return (
    <AuthLayout>
      <div className="relative flex w-full max-w-lg items-center justify-center">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-56 w-56 rounded-full bg-violet-600/[0.07] blur-3xl" />

        {/* Main authentication card */}
        <div className="relative w-full overflow-hidden rounded-[28px] border border-white/[0.10] bg-slate-950/75 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          {/* Top gradient accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

          {/* Inner glow */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-blue-500/[0.07] blur-3xl" />

          <div className="relative px-7 py-7 sm:px-9 sm:py-8">
            {/* ─────────────────────────────────────────
                BRAND
            ───────────────────────────────────────── */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 shadow-lg shadow-blue-600/20">
                  <div className="absolute inset-[1px] rounded-[11px] bg-gradient-to-br from-cyan-400/20 to-transparent" />

                  <span className="relative text-lg font-black tracking-tight text-white">
                    I
                  </span>
                </div>

                <div>
                  <div className="text-[15px] font-bold tracking-tight text-white">
                    Interxora<span className="text-cyan-400">.ai</span>
                  </div>

                  <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                    AI Interview Coach
                  </div>
                </div>
              </div>

              {/* Secure status */}
              <div className="hidden items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.05] px-3 py-1.5 sm:flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>

                <span className="text-[10px] font-semibold text-emerald-300/80">
                  Secure
                </span>
              </div>
            </div>

            {/* ─────────────────────────────────────────
                HEADER
            ───────────────────────────────────────── */}
            <div className="mb-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-400">
                Get started
              </p>

              <h1 className="text-[30px] font-bold tracking-[-0.025em] text-white sm:text-[32px]">
                Create your account
              </h1>

              <p className="mt-2.5 max-w-md text-sm leading-6 text-slate-400">
                Build your interview confidence with AI-powered practice,
                personalized feedback, and performance insights.
              </p>
            </div>

            {/* ─────────────────────────────────────────
                ERROR MESSAGE
            ───────────────────────────────────────── */}
            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.07] px-4 py-3"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rose-400/20 bg-rose-400/10 text-[11px] font-bold text-rose-300">
                  !
                </div>

                <div>
                  <p className="text-xs font-semibold text-rose-200">
                    Registration unsuccessful
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-rose-300/80">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────
                SUCCESS MESSAGE
            ───────────────────────────────────────── */}
            {success && (
              <div
                role="status"
                className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-4 py-3"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-xs font-bold text-emerald-300">
                  ✓
                </div>

                <div>
                  <p className="text-xs font-semibold text-emerald-200">
                    Account created
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-emerald-300/80">
                    Redirecting you to the sign-in page...
                  </p>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────
                REGISTER FORM
            ───────────────────────────────────────── */}
            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-xs font-semibold text-slate-300"
                >
                  Full name
                </label>

                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center">
                    <svg
                      className="h-[17px] w-[17px] text-slate-600 transition-colors duration-200 group-focus-within:text-cyan-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="8" r="3.5" />
                      <path d="M5 20c.7-3.2 3.2-5 7-5s6.3 1.8 7 5" />
                    </svg>
                  </div>

                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                    className="h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] pl-11 pr-4 text-sm text-white outline-none transition-all duration-200 placeholder:text-slate-600 hover:border-white/[0.15] hover:bg-white/[0.045] focus:border-cyan-400/40 focus:bg-white/[0.055] focus:ring-4 focus:ring-cyan-500/[0.07]"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-semibold text-slate-300"
                >
                  Email address
                </label>

                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center">
                    <svg
                      className="h-[17px] w-[17px] text-slate-600 transition-colors duration-200 group-focus-within:text-cyan-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2.5"
                      />
                      <path d="m3.5 7 8.5 6 8.5-6" />
                    </svg>
                  </div>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] pl-11 pr-4 text-sm text-white outline-none transition-all duration-200 placeholder:text-slate-600 hover:border-white/[0.15] hover:bg-white/[0.045] focus:border-cyan-400/40 focus:bg-white/[0.055] focus:ring-4 focus:ring-cyan-500/[0.07]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-semibold text-slate-300"
                >
                  Password
                </label>

                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center">
                    <svg
                      className="h-[17px] w-[17px] text-slate-600 transition-colors duration-200 group-focus-within:text-cyan-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="4"
                        y="10"
                        width="16"
                        height="11"
                        rx="2.5"
                      />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                  </div>

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    required
                    className="h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] pl-11 pr-16 text-sm text-white outline-none transition-all duration-200 placeholder:text-slate-600 hover:border-white/[0.15] hover:bg-white/[0.045] focus:border-cyan-400/40 focus:bg-white/[0.055] focus:ring-4 focus:ring-cyan-500/[0.07]"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-500 transition-all hover:bg-white/[0.05] hover:text-cyan-400"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <div className="mt-1.5 flex items-center gap-1.5">
                  <span
                    className={`h-1 w-1 rounded-full ${
                      password.length >= 6
                        ? "bg-emerald-400"
                        : "bg-slate-700"
                    }`}
                  />

                  <p
                    className={`text-[10px] ${
                      password.length >= 6
                        ? "text-emerald-400/80"
                        : "text-slate-600"
                    }`}
                  >
                    At least 6 characters
                  </p>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-xs font-semibold text-slate-300"
                >
                  Confirm password
                </label>

                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center">
                    <svg
                      className={`h-[17px] w-[17px] transition-colors duration-200 ${
                        confirmPassword &&
                        password === confirmPassword
                          ? "text-emerald-400"
                          : "text-slate-600 group-focus-within:text-cyan-400"
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12.5 9.2 17 19 7" />
                    </svg>
                  </div>

                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    required
                    className={`h-11 w-full rounded-xl border bg-white/[0.035] pl-11 pr-16 text-sm text-white outline-none transition-all duration-200 placeholder:text-slate-600 hover:bg-white/[0.045] focus:bg-white/[0.055] focus:ring-4 ${
                      confirmPassword &&
                      password === confirmPassword
                        ? "border-emerald-400/30 focus:border-emerald-400/40 focus:ring-emerald-500/[0.07]"
                        : "border-white/[0.09] hover:border-white/[0.15] focus:border-cyan-400/40 focus:ring-cyan-500/[0.07]"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((prev) => !prev)
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-500 transition-all hover:bg-white/[0.05] hover:text-cyan-400"
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {/* Password match indicator */}
                {confirmPassword && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold ${
                        password === confirmPassword
                          ? "bg-emerald-400/15 text-emerald-400"
                          : "bg-rose-400/15 text-rose-400"
                      }`}
                    >
                      {password === confirmPassword ? "✓" : "!"}
                    </span>

                    <p
                      className={`text-[10px] ${
                        password === confirmPassword
                          ? "text-emerald-400/80"
                          : "text-rose-400/80"
                      }`}
                    >
                      {password === confirmPassword
                        ? "Passwords match"
                        : "Passwords do not match"}
                    </p>
                  </div>
                )}
              </div>

              {/* Create Account */}
              <button
                type="submit"
                disabled={loading}
                className="group relative mt-1 flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-xl hover:shadow-blue-600/25 active:translate-y-0 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
              >
                {/* Button shine */}
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.12] to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create account</span>

                      <svg
                        className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14" />
                        <path d="m13 6 6 6-6 6" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* ─────────────────────────────────────────
                DIVIDER
            ───────────────────────────────────────── */}
            <div className="my-5 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/[0.07]" />

              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
                Or
              </span>

              <div className="h-px flex-1 bg-white/[0.07]" />
            </div>

            {/* ─────────────────────────────────────────
                GOOGLE REGISTER
            ───────────────────────────────────────── */}
            <button
              type="button"
              onClick={handleGoogleRegister}
              className="group flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 text-sm font-semibold text-slate-200 transition-all duration-200 hover:border-white/[0.17] hover:bg-white/[0.055] active:scale-[0.99]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#4285F4] shadow-sm">
                G
              </span>

              <span>Continue with Google</span>

              <svg
                className="ml-auto h-4 w-4 text-slate-700 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </button>

            {/* ─────────────────────────────────────────
                LOGIN LINK
            ───────────────────────────────────────── */}
            <p className="mt-5 text-center text-xs text-slate-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
              >
                Sign in
              </Link>
            </p>

            {/* ─────────────────────────────────────────
                SECURITY FOOTER
            ───────────────────────────────────────── */}
            <div className="mt-5 flex items-center justify-center gap-2 border-t border-white/[0.06] pt-4">
              <svg
                className="h-3.5 w-3.5 text-slate-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3 5 6v5c0 4.5 2.9 8.5 7 10 4.1-1.5 7-5.5 7-10V6l-7-3Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>

              <span className="text-[10px] font-medium text-slate-600">
                Your account information is securely protected
              </span>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

export default Register;
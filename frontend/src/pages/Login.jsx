// import { useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import AuthLayout from "../components/AuthLayout";
// import { apiRequest } from "../services/api";

// function Login() {
//   const navigate = useNavigate();

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);

//   const handleLogin = async (e) => {
//     e.preventDefault();

//     setError("");
//     setLoading(true);

//     try {
//       const data = await apiRequest("/auth/login", {
//         method: "POST",
//         body: JSON.stringify({
//           email,
//           password,
//         }),
//       });

//       if (data?.access_token) {
//         localStorage.setItem("access_token", data.access_token);
//       }

//       if (data?.user) {
//         localStorage.setItem("user", JSON.stringify(data.user));
//       }

//       navigate("/dashboard");
//     } catch (err) {
//       setError(
//         err?.message || "Invalid email or password. Please try again."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleGoogleLogin = () => {
//     window.location.href = "http://localhost:8000/auth/google";
//   };

//   return (
//     <AuthLayout>
//       <div className="relative flex w-full max-w-lg items-center justify-center">
//         {/* Ambient background glow */}
//         <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/[0.08] blur-3xl" />
//         <div className="pointer-events-none absolute -bottom-24 right-0 h-56 w-56 rounded-full bg-violet-600/[0.07] blur-3xl" />

//         {/* Main authentication card */}
//         <div className="relative w-full overflow-hidden rounded-[28px] border border-white/[0.10] bg-slate-950/75 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
//           {/* Top gradient accent */}
//           <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

//           {/* Inner subtle glow */}
//           <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-blue-500/[0.07] blur-3xl" />

//           <div className="relative px-7 py-7 sm:px-9 sm:py-8">
//             {/* ─────────────────────────────────────────
//                 BRAND
//             ───────────────────────────────────────── */}
//             <div className="mb-7 flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 shadow-lg shadow-blue-600/20">
//                   <div className="absolute inset-[1px] rounded-[11px] bg-gradient-to-br from-cyan-400/20 to-transparent" />

//                   <span className="relative text-lg font-black tracking-tight text-white">
//                     I
//                   </span>
//                 </div>

//                 <div>
//                   <div className="text-[15px] font-bold tracking-tight text-white">
//                     Interxora<span className="text-cyan-400">.ai</span>
//                   </div>

//                   <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
//                     AI Interview Coach
//                   </div>
//                 </div>
//               </div>

//               {/* Status indicator */}
//               <div className="hidden items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.05] px-3 py-1.5 sm:flex">
//                 <span className="relative flex h-2 w-2">
//                   <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
//                   <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
//                 </span>

//                 <span className="text-[10px] font-semibold text-emerald-300/80">
//                   Secure
//                 </span>
//               </div>
//             </div>

//             {/* ─────────────────────────────────────────
//                 HEADER
//             ───────────────────────────────────────── */}
//             <div className="mb-6">
//               <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-400">
//                 Welcome back
//               </p>

//               <h1 className="text-[30px] font-bold tracking-[-0.025em] text-white sm:text-[32px]">
//                 Sign in to your account
//               </h1>

//               <p className="mt-2.5 max-w-md text-sm leading-6 text-slate-400">
//                 Continue your interview practice, review your performance,
//                 and get closer to your next opportunity.
//               </p>
//             </div>

//             {/* ─────────────────────────────────────────
//                 ERROR MESSAGE
//             ───────────────────────────────────────── */}
//             {error && (
//               <div
//                 role="alert"
//                 className="mb-5 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.07] px-4 py-3"
//               >
//                 <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rose-400/20 bg-rose-400/10 text-[11px] font-bold text-rose-300">
//                   !
//                 </div>

//                 <div>
//                   <p className="text-xs font-semibold text-rose-200">
//                     Sign in unsuccessful
//                   </p>

//                   <p className="mt-0.5 text-xs leading-5 text-rose-300/80">
//                     {error}
//                   </p>
//                 </div>
//               </div>
//             )}

//             {/* ─────────────────────────────────────────
//                 LOGIN FORM
//             ───────────────────────────────────────── */}
//             <form onSubmit={handleLogin} className="space-y-4">
//               {/* Email */}
//               <div>
//                 <label
//                   htmlFor="email"
//                   className="mb-2 block text-xs font-semibold text-slate-300"
//                 >
//                   Email address
//                 </label>

//                 <div className="group relative">
//                   {/* Email icon */}
//                   <div className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center">
//                     <svg
//                       className="h-[17px] w-[17px] text-slate-600 transition-colors duration-200 group-focus-within:text-cyan-400"
//                       viewBox="0 0 24 24"
//                       fill="none"
//                       stroke="currentColor"
//                       strokeWidth="1.7"
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                     >
//                       <rect
//                         x="3"
//                         y="5"
//                         width="18"
//                         height="14"
//                         rx="2.5"
//                       />
//                       <path d="m3.5 7 8.5 6 8.5-6" />
//                     </svg>
//                   </div>

//                   <input
//                     id="email"
//                     type="email"
//                     value={email}
//                     onChange={(e) => setEmail(e.target.value)}
//                     placeholder="you@example.com"
//                     autoComplete="email"
//                     required
//                     className="h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] pl-11 pr-4 text-sm text-white outline-none transition-all duration-200 placeholder:text-slate-600 hover:border-white/[0.15] hover:bg-white/[0.045] focus:border-cyan-400/40 focus:bg-white/[0.055] focus:ring-4 focus:ring-cyan-500/[0.07]"
//                   />
//                 </div>
//               </div>

//               {/* Password */}
//               <div>
//                 <div className="mb-2 flex items-center justify-between">
//                   <label
//                     htmlFor="password"
//                     className="text-xs font-semibold text-slate-300"
//                   >
//                     Password
//                   </label>

//                   <Link
//                     to="/forgot-password"
//                     className="text-xs font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
//                   >
//                     Forgot password?
//                   </Link>
//                 </div>

//                 <div className="group relative">
//                   {/* Lock icon */}
//                   <div className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center">
//                     <svg
//                       className="h-[17px] w-[17px] text-slate-600 transition-colors duration-200 group-focus-within:text-cyan-400"
//                       viewBox="0 0 24 24"
//                       fill="none"
//                       stroke="currentColor"
//                       strokeWidth="1.7"
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                     >
//                       <rect
//                         x="4"
//                         y="10"
//                         width="16"
//                         height="11"
//                         rx="2.5"
//                       />
//                       <path d="M8 10V7a4 4 0 0 1 8 0v3" />
//                     </svg>
//                   </div>

//                   <input
//                     id="password"
//                     type={showPassword ? "text" : "password"}
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     placeholder="Enter your password"
//                     autoComplete="current-password"
//                     required
//                     className="h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] pl-11 pr-16 text-sm text-white outline-none transition-all duration-200 placeholder:text-slate-600 hover:border-white/[0.15] hover:bg-white/[0.045] focus:border-cyan-400/40 focus:bg-white/[0.055] focus:ring-4 focus:ring-cyan-500/[0.07]"
//                   />

//                   <button
//                     type="button"
//                     onClick={() => setShowPassword((prev) => !prev)}
//                     className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-500 transition-all hover:bg-white/[0.05] hover:text-cyan-400"
//                     aria-label={
//                       showPassword ? "Hide password" : "Show password"
//                     }
//                   >
//                     {showPassword ? "Hide" : "Show"}
//                   </button>
//                 </div>
//               </div>

//               {/* Sign in button */}
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="group relative mt-1 flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-xl hover:shadow-blue-600/25 active:translate-y-0 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
//               >
//                 {/* Button shine */}
//                 <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.12] to-transparent transition-transform duration-700 group-hover:translate-x-full" />

//                 <span className="relative flex items-center justify-center gap-2">
//                   {loading ? (
//                     <>
//                       <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
//                       <span>Signing in...</span>
//                     </>
//                   ) : (
//                     <>
//                       <span>Sign in</span>

//                       <svg
//                         className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
//                         viewBox="0 0 24 24"
//                         fill="none"
//                         stroke="currentColor"
//                         strokeWidth="2"
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                       >
//                         <path d="M5 12h14" />
//                         <path d="m13 6 6 6-6 6" />
//                       </svg>
//                     </>
//                   )}
//                 </span>
//               </button>
//             </form>

//             {/* ─────────────────────────────────────────
//                 DIVIDER
//             ───────────────────────────────────────── */}
//             <div className="my-5 flex items-center gap-4">
//               <div className="h-px flex-1 bg-white/[0.07]" />

//               <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
//                 Or
//               </span>

//               <div className="h-px flex-1 bg-white/[0.07]" />
//             </div>

//             {/* ─────────────────────────────────────────
//                 GOOGLE LOGIN
//             ───────────────────────────────────────── */}
//             <button
//               type="button"
//               onClick={handleGoogleLogin}
//               className="group flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 text-sm font-semibold text-slate-200 transition-all duration-200 hover:border-white/[0.17] hover:bg-white/[0.055] active:scale-[0.99]"
//             >
//               {/* Google logo */}
//               <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#4285F4] shadow-sm">
//                 G
//               </span>

//               <span>Continue with Google</span>

//               <svg
//                 className="ml-auto h-4 w-4 text-slate-700 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-slate-400"
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke="currentColor"
//                 strokeWidth="1.8"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               >
//                 <path d="M5 12h14" />
//                 <path d="m13 6 6 6-6 6" />
//               </svg>
//             </button>

//             {/* ─────────────────────────────────────────
//                 REGISTER
//             ───────────────────────────────────────── */}
//             <p className="mt-5 text-center text-xs text-slate-500">
//               Don't have an account?{" "}
//               <Link
//                 to="/register"
//                 className="font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
//               >
//                 Create an account
//               </Link>
//             </p>

//             {/* ─────────────────────────────────────────
//                 SECURITY FOOTER
//             ───────────────────────────────────────── */}
//             <div className="mt-5 flex items-center justify-center gap-2 border-t border-white/[0.06] pt-4">
//               <svg
//                 className="h-3.5 w-3.5 text-slate-600"
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke="currentColor"
//                 strokeWidth="1.7"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               >
//                 <path d="M12 3 5 6v5c0 4.5 2.9 8.5 7 10 4.1-1.5 7-5.5 7-10V6l-7-3Z" />
//                 <path d="m9 12 2 2 4-4" />
//               </svg>

//               <span className="text-[10px] font-medium text-slate-600">
//                 Your authentication is securely protected
//               </span>
//             </div>
//           </div>
//         </div>
//       </div>
//     </AuthLayout>
//   );
// }

// export default Login;


//..........................new..............................
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { apiRequest } from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await apiRequest(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
          }),
        },
        false
      );

      // ======================================================
      // SAVE ACCESS TOKEN
      // ======================================================

      if (data?.access_token) {
        localStorage.setItem(
          "access_token",
          data.access_token
        );
      }

      // ======================================================
      // SAVE REFRESH TOKEN
      // ======================================================

      if (data?.refresh_token) {
        localStorage.setItem(
          "refresh_token",
          data.refresh_token
        );
      }

      // ======================================================
      // SAVE USER DATA
      // ======================================================

      if (data?.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );
      }

      // ======================================================
      // LOGIN SUCCESS
      // ======================================================

      navigate("/dashboard");

    } catch (err) {
      setError(
        err?.message ||
        "Invalid email or password. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };


  // ========================================================
  // GOOGLE LOGIN
  // ========================================================

  const handleGoogleLogin = () => {
    const API_URL =
      import.meta.env.VITE_API_URL ||
      "http://localhost:8000";

    window.location.href =
      `${API_URL}/auth/google`;
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

          {/* Inner subtle glow */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-blue-500/[0.07] blur-3xl" />

          <div className="relative px-7 py-7 sm:px-9 sm:py-8">

            {/* =================================================
                BRAND
            ================================================== */}
            <div className="mb-7 flex items-center justify-between">

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


              {/* Status indicator */}
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


            {/* =================================================
                HEADER
            ================================================== */}
            <div className="mb-6">

              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-400">
                Welcome back
              </p>

              <h1 className="text-[30px] font-bold tracking-[-0.025em] text-white sm:text-[32px]">
                Sign in to your account
              </h1>

              <p className="mt-2.5 max-w-md text-sm leading-6 text-slate-400">
                Continue your interview practice, review your performance,
                and get closer to your next opportunity.
              </p>

            </div>


            {/* =================================================
                ERROR MESSAGE
            ================================================== */}
            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.07] px-4 py-3"
              >

                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rose-400/20 bg-rose-400/10 text-[11px] font-bold text-rose-300">
                  !
                </div>

                <div>

                  <p className="text-xs font-semibold text-rose-200">
                    Sign in unsuccessful
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-rose-300/80">
                    {error}
                  </p>

                </div>

              </div>
            )}


            {/* =================================================
                LOGIN FORM
            ================================================== */}
            <form
              onSubmit={handleLogin}
              className="space-y-4"
            >

              {/* Email */}
              <div>

                <label
                  htmlFor="email"
                  className="mb-2 block text-xs font-semibold text-slate-300"
                >
                  Email address
                </label>

                <div className="group relative">

                  {/* Email icon */}
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
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] pl-11 pr-4 text-sm text-white outline-none transition-all duration-200 placeholder:text-slate-600 hover:border-white/[0.15] hover:bg-white/[0.045] focus:border-cyan-400/40 focus:bg-white/[0.055] focus:ring-4 focus:ring-cyan-500/[0.07]"
                  />

                </div>

              </div>


              {/* Password */}
              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label
                    htmlFor="password"
                    className="text-xs font-semibold text-slate-300"
                  >
                    Password
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
                  >
                    Forgot password?
                  </Link>

                </div>


                <div className="group relative">

                  {/* Lock icon */}
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
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] pl-11 pr-16 text-sm text-white outline-none transition-all duration-200 placeholder:text-slate-600 hover:border-white/[0.15] hover:bg-white/[0.045] focus:border-cyan-400/40 focus:bg-white/[0.055] focus:ring-4 focus:ring-cyan-500/[0.07]"
                  />


                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (prev) => !prev
                      )
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-500 transition-all hover:bg-white/[0.05] hover:text-cyan-400"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword
                      ? "Hide"
                      : "Show"}
                  </button>

                </div>

              </div>


              {/* Sign in button */}
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

                      <span>
                        Signing in...
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        Sign in
                      </span>

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


            {/* =================================================
                DIVIDER
            ================================================== */}
            <div className="my-5 flex items-center gap-4">

              <div className="h-px flex-1 bg-white/[0.07]" />

              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
                Or
              </span>

              <div className="h-px flex-1 bg-white/[0.07]" />

            </div>


            {/* =================================================
                GOOGLE LOGIN
            ================================================== */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="group flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 text-sm font-semibold text-slate-200 transition-all duration-200 hover:border-white/[0.17] hover:bg-white/[0.055] active:scale-[0.99]"
            >

              {/* Google logo */}
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#4285F4] shadow-sm">
                G
              </span>

              <span>
                Continue with Google
              </span>

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


            {/* =================================================
                REGISTER
            ================================================== */}
            <p className="mt-5 text-center text-xs text-slate-500">

              Don't have an account?{" "}

              <Link
                to="/register"
                className="font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
              >
                Create an account
              </Link>

            </p>


            {/* =================================================
                SECURITY FOOTER
            ================================================== */}
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
                Your authentication is securely protected
              </span>

            </div>

          </div>

        </div>

      </div>
    </AuthLayout>
  );
}

export default Login;
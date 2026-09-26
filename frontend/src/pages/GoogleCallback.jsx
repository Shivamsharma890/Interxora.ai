// // // import { useEffect } from "react";
// // // import { useNavigate } from "react-router-dom";

// // // function GoogleCallback() {
// // //   const navigate = useNavigate();

// // //   useEffect(() => {
// // //     const completeGoogleLogin = async () => {
// // //       try {
// // //         const response = await fetch(
// // //           "http://localhost:8000/auth/google/session",
// // //           {
// // //             method: "GET",
// // //             credentials: "include",
// // //           }
// // //         );

// // //         const data = await response.json();

// // //         if (!response.ok) {
// // //           throw new Error(
// // //             data?.detail || "Google authentication failed"
// // //           );
// // //         }

// // //         if (!data?.access_token) {
// // //           throw new Error("Access token was not received");
// // //         }

// // //         localStorage.setItem(
// // //           "access_token",
// // //           data.access_token
// // //         );

// // //         if (data.refresh_token) {
// // //           localStorage.setItem(
// // //             "refresh_token",
// // //             data.refresh_token
// // //           );
// // //         }

// // //         navigate("/dashboard", {
// // //           replace: true,
// // //         });
// // //       } catch (error) {
// // //         console.error(
// // //           "Google callback error:",
// // //           error
// // //         );

// // //         navigate(
// // //           "/login?error=google_auth_failed",
// // //           {
// // //             replace: true,
// // //           }
// // //         );
// // //       }
// // //     };

// // //     completeGoogleLogin();
// // //   }, [navigate]);

// // //   return (
// // //     <div className="flex min-h-screen items-center justify-center bg-slate-950">
// // //       <div className="text-center">
// // //         <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

// // //         <h2 className="text-xl font-semibold text-white">
// // //           Signing you in...
// // //         </h2>

// // //         <p className="mt-2 text-sm text-slate-400">
// // //           Completing Google authentication
// // //         </p>
// // //       </div>
// // //     </div>
// // //   );
// // // }

// // // export default GoogleCallback;



// // //....................................new...............................

// // import { useEffect, useState } from "react";
// // import { useNavigate } from "react-router-dom";

// // function GoogleCallback() {
// //   const navigate = useNavigate();

// //   const [status, setStatus] = useState("connecting");

// //   useEffect(() => {
// //     const completeGoogleLogin = async () => {
// //       try {
// //         setStatus("connecting");

// //         const response = await fetch(
// //           "http://localhost:8000/auth/google/session",
// //           {
// //             method: "GET",
// //             credentials: "include",
// //           }
// //         );

// //         const data = await response.json();

// //         if (!response.ok) {
// //           throw new Error(
// //             data?.detail || "Google authentication failed"
// //           );
// //         }

// //         if (!data?.access_token) {
// //           throw new Error("Access token was not received");
// //         }

// //         setStatus("authenticated");

// //         localStorage.setItem("access_token", data.access_token);

// //         if (data.refresh_token) {
// //           localStorage.setItem("refresh_token", data.refresh_token);
// //         }

// //         // Small delay so the successful state is visible
// //         setTimeout(() => {
// //           navigate("/dashboard", {
// //             replace: true,
// //           });
// //         }, 450);
// //       } catch (error) {
// //         console.error("Google callback error:", error);

// //         setStatus("error");

// //         setTimeout(() => {
// //           navigate("/login?error=google_auth_failed", {
// //             replace: true,
// //           });
// //         }, 1200);
// //       }
// //     };

// //     completeGoogleLogin();
// //   }, [navigate]);

// //   const isAuthenticated = status === "authenticated";
// //   const isError = status === "error";

// //   return (
// //     <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060a12] px-5">
// //       {/* ─────────────────────────────────────────
// //           BACKGROUND EFFECTS
// //       ───────────────────────────────────────── */}
// //       <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.05] blur-[120px]" />

// //       <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-blue-600/[0.05] blur-[100px]" />

// //       <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-violet-600/[0.05] blur-[110px]" />

// //       {/* ─────────────────────────────────────────
// //           AUTH CARD
// //       ───────────────────────────────────────── */}
// //       <div className="relative w-full max-w-md">
// //         <div className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-slate-950/70 px-7 py-9 text-center shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:px-9 sm:py-10">
// //           {/* Top accent */}
// //           <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

// //           {/* Subtle card glow */}
// //           <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-cyan-400/[0.06] blur-3xl" />

// //           {/* ─────────────────────────────────────
// //               BRAND
// //           ───────────────────────────────────── */}
// //           <div className="relative mb-8 flex items-center justify-center gap-3">
// //             <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 shadow-lg shadow-blue-600/20">
// //               <div className="absolute inset-[1px] rounded-[11px] bg-gradient-to-br from-cyan-400/20 to-transparent" />

// //               <span className="relative text-lg font-black text-white">
// //                 I
// //               </span>
// //             </div>

// //             <div className="text-left">
// //               <div className="text-[15px] font-bold tracking-tight text-white">
// //                 Interxora<span className="text-cyan-400">.ai</span>
// //               </div>

// //               <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
// //                 AI Interview Coach
// //               </div>
// //             </div>
// //           </div>

// //           {/* ─────────────────────────────────────
// //               GOOGLE AUTH ICON
// //           ───────────────────────────────────── */}
// //           <div className="relative mx-auto mb-7 flex h-20 w-20 items-center justify-center">
// //             {/* Outer animated ring */}
// //             {!isError && (
// //               <div className="absolute inset-0 animate-pulse rounded-full border border-cyan-400/20" />
// //             )}

// //             <div
// //               className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border shadow-xl transition-all duration-500 ${
// //                 isAuthenticated
// //                   ? "border-emerald-400/20 bg-emerald-400/[0.08] shadow-emerald-500/10"
// //                   : isError
// //                     ? "border-rose-400/20 bg-rose-400/[0.08] shadow-rose-500/10"
// //                     : "border-white/[0.10] bg-white/[0.045] shadow-cyan-500/10"
// //               }`}
// //             >
// //               {isAuthenticated ? (
// //                 <svg
// //                   className="h-7 w-7 text-emerald-400"
// //                   viewBox="0 0 24 24"
// //                   fill="none"
// //                   stroke="currentColor"
// //                   strokeWidth="2"
// //                   strokeLinecap="round"
// //                   strokeLinejoin="round"
// //                 >
// //                   <path d="m5 12 4 4L19 6" />
// //                 </svg>
// //               ) : isError ? (
// //                 <svg
// //                   className="h-7 w-7 text-rose-400"
// //                   viewBox="0 0 24 24"
// //                   fill="none"
// //                   stroke="currentColor"
// //                   strokeWidth="2"
// //                   strokeLinecap="round"
// //                   strokeLinejoin="round"
// //                 >
// //                   <path d="M6 6l12 12M18 6 6 18" />
// //                 </svg>
// //               ) : (
// //                 <span className="text-xl font-bold text-[#4285F4]">G</span>
// //               )}
// //             </div>
// //           </div>

// //           {/* ─────────────────────────────────────
// //               STATUS
// //           ───────────────────────────────────── */}
// //           <div className="relative">
// //             <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400">
// //               {isAuthenticated
// //                 ? "Authentication complete"
// //                 : isError
// //                   ? "Authentication failed"
// //                   : "Secure authentication"}
// //             </p>

// //             <h1 className="text-2xl font-bold tracking-tight text-white">
// //               {isAuthenticated
// //                 ? "You're signed in"
// //                 : isError
// //                   ? "Something went wrong"
// //                   : "Signing you in..."}
// //             </h1>

// //             <p className="mx-auto mt-2.5 max-w-xs text-sm leading-6 text-slate-500">
// //               {isAuthenticated
// //                 ? "Taking you to your Interxora.ai dashboard."
// //                 : isError
// //                   ? "We couldn't complete your Google sign-in. Returning you to the login page."
// //                   : "Completing your Google authentication securely. This will only take a moment."}
// //             </p>
// //           </div>

// //           {/* ─────────────────────────────────────
// //               PROGRESS
// //           ───────────────────────────────────── */}
// //           {!isError && (
// //             <div className="mx-auto mt-7 max-w-xs">
// //               <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
// //                 <div
// //                   className={`h-full rounded-full transition-all duration-700 ${
// //                     isAuthenticated
// //                       ? "w-full bg-emerald-400"
// //                       : "w-2/3 animate-pulse bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500"
// //                   }`}
// //                 />
// //               </div>

// //               <div className="mt-2.5 flex items-center justify-between text-[9px] font-medium uppercase tracking-[0.12em] text-slate-600">
// //                 <span>Google</span>
// //                 <span>
// //                   {isAuthenticated ? "Verified" : "Verifying"}
// //                 </span>
// //                 <span>Interxora</span>
// //               </div>
// //             </div>
// //           )}

// //           {/* ─────────────────────────────────────
// //               SECURITY NOTE
// //           ───────────────────────────────────── */}
// //           <div className="mt-8 flex items-center justify-center gap-2 border-t border-white/[0.06] pt-5">
// //             <svg
// //               className="h-3.5 w-3.5 text-slate-600"
// //               viewBox="0 0 24 24"
// //               fill="none"
// //               stroke="currentColor"
// //               strokeWidth="1.7"
// //               strokeLinecap="round"
// //               strokeLinejoin="round"
// //             >
// //               <path d="M12 3 5 6v5c0 4.5 2.9 8.5 7 10 4.1-1.5 7-5.5 7-10V6l-7-3Z" />
// //               <path d="m9 12 2 2 4-4" />
// //             </svg>

// //             <span className="text-[10px] font-medium text-slate-600">
// //               Secure session authentication
// //             </span>
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

// // export default GoogleCallback;


// //....................................new...............................

// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";

// function GoogleCallback() {
//   const navigate = useNavigate();

//   const [status, setStatus] = useState("connecting");

//   useEffect(() => {
//     const completeGoogleLogin = async () => {
//       try {
//         setStatus("connecting");

//         const response = await fetch(
//           `${API_URL}/auth/google/session`,
//           {
//             method: "GET",
//             credentials: "include",
//           }
//         );

//         const data = await response.json();

//         if (!response.ok) {
//           throw new Error(
//             data?.detail || "Google authentication failed"
//           );
//         }

//         if (!data?.access_token) {
//           throw new Error("Access token was not received");
//         }

//         setStatus("authenticated");

//         localStorage.setItem("access_token", data.access_token);

//         if (data.refresh_token) {
//           localStorage.setItem("refresh_token", data.refresh_token);
//         }

//         // Small delay so the successful state is visible
//         setTimeout(() => {
//           navigate("/dashboard", {
//             replace: true,
//           });
//         }, 450);
//       } catch (error) {
//         console.error("Google callback error:", error);

//         setStatus("error");

//         setTimeout(() => {
//           navigate("/login?error=google_auth_failed", {
//             replace: true,
//           });
//         }, 1200);
//       }
//     };

//     completeGoogleLogin();
//   }, [navigate]);

//   const isAuthenticated = status === "authenticated";
//   const isError = status === "error";

//   return (
//     <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060a12] px-5">
//       {/* ─────────────────────────────────────────
//           BACKGROUND EFFECTS
//       ───────────────────────────────────────── */}
//       <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.05] blur-[120px]" />

//       <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-blue-600/[0.05] blur-[100px]" />

//       <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-violet-600/[0.05] blur-[110px]" />

//       {/* ─────────────────────────────────────────
//           AUTH CARD
//       ───────────────────────────────────────── */}
//       <div className="relative w-full max-w-md">
//         <div className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-slate-950/70 px-7 py-9 text-center shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:px-9 sm:py-10">
//           {/* Top accent */}
//           <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

//           {/* Subtle card glow */}
//           <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-cyan-400/[0.06] blur-3xl" />

//           {/* ─────────────────────────────────────
//               BRAND
//           ───────────────────────────────────── */}
//           <div className="relative mb-8 flex items-center justify-center gap-3">
//             <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 shadow-lg shadow-blue-600/20">
//               <div className="absolute inset-[1px] rounded-[11px] bg-gradient-to-br from-cyan-400/20 to-transparent" />

//               <span className="relative text-lg font-black text-white">
//                 I
//               </span>
//             </div>

//             <div className="text-left">
//               <div className="text-[15px] font-bold tracking-tight text-white">
//                 Interxora<span className="text-cyan-400">.ai</span>
//               </div>

//               <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
//                 AI Interview Coach
//               </div>
//             </div>
//           </div>

//           {/* ─────────────────────────────────────
//               GOOGLE AUTH ICON
//           ───────────────────────────────────── */}
//           <div className="relative mx-auto mb-7 flex h-20 w-20 items-center justify-center">
//             {/* Outer animated ring */}
//             {!isError && (
//               <div className="absolute inset-0 animate-pulse rounded-full border border-cyan-400/20" />
//             )}

//             <div
//               className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border shadow-xl transition-all duration-500 ${
//                 isAuthenticated
//                   ? "border-emerald-400/20 bg-emerald-400/[0.08] shadow-emerald-500/10"
//                   : isError
//                     ? "border-rose-400/20 bg-rose-400/[0.08] shadow-rose-500/10"
//                     : "border-white/[0.10] bg-white/[0.045] shadow-cyan-500/10"
//               }`}
//             >
//               {isAuthenticated ? (
//                 <svg
//                   className="h-7 w-7 text-emerald-400"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   stroke="currentColor"
//                   strokeWidth="2"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 >
//                   <path d="m5 12 4 4L19 6" />
//                 </svg>
//               ) : isError ? (
//                 <svg
//                   className="h-7 w-7 text-rose-400"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   stroke="currentColor"
//                   strokeWidth="2"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 >
//                   <path d="M6 6l12 12M18 6 6 18" />
//                 </svg>
//               ) : (
//                 <span className="text-xl font-bold text-[#4285F4]">G</span>
//               )}
//             </div>
//           </div>

//           {/* ─────────────────────────────────────
//               STATUS
//           ───────────────────────────────────── */}
//           <div className="relative">
//             <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400">
//               {isAuthenticated
//                 ? "Authentication complete"
//                 : isError
//                   ? "Authentication failed"
//                   : "Secure authentication"}
//             </p>

//             <h1 className="text-2xl font-bold tracking-tight text-white">
//               {isAuthenticated
//                 ? "You're signed in"
//                 : isError
//                   ? "Something went wrong"
//                   : "Signing you in..."}
//             </h1>

//             <p className="mx-auto mt-2.5 max-w-xs text-sm leading-6 text-slate-500">
//               {isAuthenticated
//                 ? "Taking you to your Interxora.ai dashboard."
//                 : isError
//                   ? "We couldn't complete your Google sign-in. Returning you to the login page."
//                   : "Completing your Google authentication securely. This will only take a moment."}
//             </p>
//           </div>

//           {/* ─────────────────────────────────────
//               PROGRESS
//           ───────────────────────────────────── */}
//           {!isError && (
//             <div className="mx-auto mt-7 max-w-xs">
//               <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
//                 <div
//                   className={`h-full rounded-full transition-all duration-700 ${
//                     isAuthenticated
//                       ? "w-full bg-emerald-400"
//                       : "w-2/3 animate-pulse bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500"
//                   }`}
//                 />
//               </div>

//               <div className="mt-2.5 flex items-center justify-between text-[9px] font-medium uppercase tracking-[0.12em] text-slate-600">
//                 <span>Google</span>
//                 <span>
//                   {isAuthenticated ? "Verified" : "Verifying"}
//                 </span>
//                 <span>Interxora</span>
//               </div>
//             </div>
//           )}

//           {/* ─────────────────────────────────────
//               SECURITY NOTE
//           ───────────────────────────────────── */}
//           <div className="mt-8 flex items-center justify-center gap-2 border-t border-white/[0.06] pt-5">
//             <svg
//               className="h-3.5 w-3.5 text-slate-600"
//               viewBox="0 0 24 24"
//               fill="none"
//               stroke="currentColor"
//               strokeWidth="1.7"
//               strokeLinecap="round"
//               strokeLinejoin="round"
//             >
//               <path d="M12 3 5 6v5c0 4.5 2.9 8.5 7 10 4.1-1.5 7-5.5 7-10V6l-7-3Z" />
//               <path d="m9 12 2 2 4-4" />
//             </svg>

//             <span className="text-[10px] font-medium text-slate-600">
//               Secure session authentication
//             </span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default GoogleCallback;



//....................new5...............................

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Backend API base URL.
// Uses VITE_API_URL in production and localhost during local development.
const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000";

function GoogleCallback() {
  const navigate = useNavigate();

  const [status, setStatus] = useState("connecting");

  useEffect(() => {
    const completeGoogleLogin = async () => {
      try {
        setStatus("connecting");

        const response = await fetch(
          `${API_URL}/auth/google/session`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail || "Google authentication failed"
          );
        }

        if (!data?.access_token) {
          throw new Error("Access token was not received");
        }

        setStatus("authenticated");

        localStorage.setItem(
          "access_token",
          data.access_token
        );

        if (data.refresh_token) {
          localStorage.setItem(
            "refresh_token",
            data.refresh_token
          );
        }

        // Small delay so the successful state is visible
        setTimeout(() => {
          navigate("/dashboard", {
            replace: true,
          });
        }, 450);
      } catch (error) {
        console.error("Google callback error:", error);

        setStatus("error");

        setTimeout(() => {
          navigate(
            "/login?error=google_auth_failed",
            {
              replace: true,
            }
          );
        }, 1200);
      }
    };

    completeGoogleLogin();
  }, [navigate]);

  const isAuthenticated =
    status === "authenticated";

  const isError =
    status === "error";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060a12] px-5">
      {/* ─────────────────────────────────────────
          BACKGROUND EFFECTS
      ───────────────────────────────────────── */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.05] blur-[120px]" />

      <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-blue-600/[0.05] blur-[100px]" />

      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-violet-600/[0.05] blur-[110px]" />

      {/* ─────────────────────────────────────────
          AUTH CARD
      ───────────────────────────────────────── */}
      <div className="relative w-full max-w-md">
        <div className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-slate-950/70 px-7 py-9 text-center shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:px-9 sm:py-10">
          {/* Top accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

          {/* Subtle card glow */}
          <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-cyan-400/[0.06] blur-3xl" />

          {/* ─────────────────────────────────────
              BRAND
          ───────────────────────────────────── */}
          <div className="relative mb-8 flex items-center justify-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 shadow-lg shadow-blue-600/20">
              <div className="absolute inset-[1px] rounded-[11px] bg-gradient-to-br from-cyan-400/20 to-transparent" />

              <span className="relative text-lg font-black text-white">
                I
              </span>
            </div>

            <div className="text-left">
              <div className="text-[15px] font-bold tracking-tight text-white">
                Interxora<span className="text-cyan-400">.ai</span>
              </div>

              <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                AI Interview Coach
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────
              GOOGLE AUTH ICON
          ───────────────────────────────────── */}
          <div className="relative mx-auto mb-7 flex h-20 w-20 items-center justify-center">
            {/* Outer animated ring */}
            {!isError && (
              <div className="absolute inset-0 animate-pulse rounded-full border border-cyan-400/20" />
            )}

            <div
              className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border shadow-xl transition-all duration-500 ${
                isAuthenticated
                  ? "border-emerald-400/20 bg-emerald-400/[0.08] shadow-emerald-500/10"
                  : isError
                    ? "border-rose-400/20 bg-rose-400/[0.08] shadow-rose-500/10"
                    : "border-white/[0.10] bg-white/[0.045] shadow-cyan-500/10"
              }`}
            >
              {isAuthenticated ? (
                <svg
                  className="h-7 w-7 text-emerald-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              ) : isError ? (
                <svg
                  className="h-7 w-7 text-rose-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              ) : (
                <span className="text-xl font-bold text-[#4285F4]">
                  G
                </span>
              )}
            </div>
          </div>

          {/* ─────────────────────────────────────
              STATUS
          ───────────────────────────────────── */}
          <div className="relative">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400">
              {isAuthenticated
                ? "Authentication complete"
                : isError
                  ? "Authentication failed"
                  : "Secure authentication"}
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-white">
              {isAuthenticated
                ? "You're signed in"
                : isError
                  ? "Something went wrong"
                  : "Signing you in..."}
            </h1>

            <p className="mx-auto mt-2.5 max-w-xs text-sm leading-6 text-slate-500">
              {isAuthenticated
                ? "Taking you to your Interxora.ai dashboard."
                : isError
                  ? "We couldn't complete your Google sign-in. Returning you to the login page."
                  : "Completing your Google authentication securely. This will only take a moment."}
            </p>
          </div>

          {/* ─────────────────────────────────────
              PROGRESS
          ───────────────────────────────────── */}
          {!isError && (
            <div className="mx-auto mt-7 max-w-xs">
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isAuthenticated
                      ? "w-full bg-emerald-400"
                      : "w-2/3 animate-pulse bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500"
                  }`}
                />
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[9px] font-medium uppercase tracking-[0.12em] text-slate-600">
                <span>Google</span>

                <span>
                  {isAuthenticated
                    ? "Verified"
                    : "Verifying"}
                </span>

                <span>Interxora</span>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────
              SECURITY NOTE
          ───────────────────────────────────── */}
          <div className="mt-8 flex items-center justify-center gap-2 border-t border-white/[0.06] pt-5">
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
              Secure session authentication
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GoogleCallback;

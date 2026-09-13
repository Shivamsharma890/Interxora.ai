import { Link, useLocation } from "react-router-dom";

function AuthLayout({ children }) {
  const location = useLocation();
  const isRegister = location.pathname === "/register";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      {/* =========================================================
          AMBIENT BACKGROUND
      ========================================================= */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-180px] top-[-180px] h-[500px] w-[500px] rounded-full bg-cyan-500/[0.07] blur-[130px]" />
        <div className="absolute right-[-180px] top-[8%] h-[540px] w-[540px] rounded-full bg-violet-600/[0.08] blur-[140px]" />
        <div className="absolute bottom-[-260px] left-[35%] h-[500px] w-[500px] rounded-full bg-blue-600/[0.06] blur-[140px]" />

        <div
          className="absolute inset-0 opacity-[0.022]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* =========================================================
          PAGE SHELL
      ========================================================= */}
      <div className="relative flex min-h-screen flex-col">
        {/* =======================================================
            NAVBAR
        ======================================================= */}
        <header className="relative z-20 border-b border-white/[0.06] bg-[#030712]/80 backdrop-blur-xl">
          <div className="mx-auto flex min-h-[68px] w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:min-h-[76px] lg:px-10 xl:px-12">
            {/* BRAND */}
            <Link
              to="/"
              className="group flex min-w-0 items-center gap-2.5 sm:gap-3"
              aria-label="Interxora.ai home"
            >
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 shadow-lg shadow-blue-500/20 transition duration-300 group-hover:scale-105 sm:h-10 sm:w-10">
                <div className="absolute inset-0 bg-white/10" />
                <span className="relative text-base font-black sm:text-lg">I</span>
              </div>

              <div className="min-w-0">
                <div className="truncate text-[17px] font-bold tracking-[-0.02em] sm:text-[19px]">
                  Interxora<span className="text-cyan-400">.ai</span>
                </div>

                <div className="hidden text-[8px] font-semibold uppercase tracking-[0.17em] text-slate-600 sm:block md:text-[9px] md:tracking-[0.2em]">
                  Intelligent Interview Platform
                </div>
              </div>
            </Link>

            {/* NAV ACTION */}
            <div className="flex shrink-0 items-center gap-2 text-xs sm:text-sm">
              <span className="hidden text-slate-500 md:inline">
                {isRegister
                  ? "Already have an account?"
                  : "Don't have an account?"}
              </span>

              <Link
                to={isRegister ? "/login" : "/register"}
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-semibold text-slate-200 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.06] hover:text-cyan-300 sm:px-3.5"
              >
                {isRegister ? "Sign in" : "Create account"}
              </Link>
            </div>
          </div>
        </header>

        {/* =======================================================
            MAIN
        ======================================================= */}
        <main className="relative z-10 flex flex-1 items-center px-4 py-7 sm:px-6 sm:py-9 md:px-8 lg:px-10 lg:py-10 xl:px-12 xl:py-12">
          <div className="mx-auto grid w-full max-w-[1180px] items-center gap-8 lg:gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(400px,500px)] xl:gap-16 2xl:gap-20">
            {/* ===================================================
                DESKTOP PRODUCT PANEL
                Visible only when there is enough horizontal space.
            =================================================== */}
            <section className="hidden xl:block">
              <div className="max-w-[600px]">
                {/* STATUS */}
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/[0.045] px-3.5 py-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                  </span>

                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
                    AI interview intelligence
                  </span>
                </div>

                {/* HEADLINE */}
                <h1 className="text-[48px] font-bold leading-[1.06] tracking-[-0.045em] text-white 2xl:text-[58px]">
                  Turn interview
                  <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                    practice into
                  </span>
                  confidence.
                </h1>

                <p className="mt-5 max-w-[570px] text-[15px] leading-7 text-slate-400 2xl:text-[16px]">
                  Practice realistic interviews, receive intelligent feedback,
                  and understand exactly where you can improve before the real
                  interview.
                </p>

                {/* FEATURE LIST */}
                <div className="mt-7 max-w-[600px] space-y-2.5">
                  {[
                    {
                      title: "Adaptive AI interviews",
                      description:
                        "Questions adjust to your role, difficulty, and performance.",
                    },
                    {
                      title: "Deep answer evaluation",
                      description:
                        "Get structured feedback on technical accuracy and communication.",
                    },
                    {
                      title: "Actionable performance reports",
                      description:
                        "Track strengths, weaknesses, scores, and interview readiness.",
                    },
                  ].map((feature) => (
                    <div
                      key={feature.title}
                      className="group flex items-start gap-3.5 rounded-2xl border border-white/[0.05] bg-white/[0.018] p-3.5 transition hover:border-cyan-400/10 hover:bg-white/[0.035] 2xl:p-4"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-400/15 bg-emerald-400/[0.06]">
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          className="h-4 w-4 text-emerald-400"
                        >
                          <path
                            d="M5 10.5 8.2 14 15 6.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-200">
                          {feature.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* MINI METRICS */}
                <div className="mt-7 flex items-center gap-5 border-t border-white/[0.06] pt-5 2xl:gap-8">
                  <div>
                    <p className="text-base font-bold text-white 2xl:text-lg">
                      AI-powered
                    </p>
                    <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-slate-600">
                      Evaluation
                    </p>
                  </div>

                  <div className="h-7 w-px bg-white/[0.08]" />

                  <div>
                    <p className="text-base font-bold text-white 2xl:text-lg">
                      Real-time
                    </p>
                    <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-slate-600">
                      Feedback
                    </p>
                  </div>

                  <div className="h-7 w-px bg-white/[0.08]" />

                  <div>
                    <p className="text-base font-bold text-white 2xl:text-lg">
                      Personalized
                    </p>
                    <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-slate-600">
                      Preparation
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ===================================================
                AUTH COLUMN
            =================================================== */}
            <section className="mx-auto w-full max-w-[500px]">
              {/* MOBILE / TABLET BRAND */}
              <div className="mb-6 text-center xl:hidden">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/[0.045] px-3 py-1.5 sm:mb-4 sm:px-3.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
                  <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-300 sm:text-[10px]">
                    AI Interview Platform
                  </span>
                </div>

                <h1 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
                  Interxora<span className="text-cyan-400">.ai</span>
                </h1>

                <p className="mt-1.5 text-sm text-slate-500 sm:mt-2">
                  Practice smarter. Perform better.
                </p>
              </div>

              {/* AUTH CARD */}
              <div className="relative">
                <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-br from-cyan-500/[0.10] via-blue-500/[0.04] to-violet-500/[0.10] blur-2xl" />

                <div className="relative overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#0a1020]/95 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:rounded-[26px]">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

                  <div className="p-5 sm:p-7 md:p-8">
                    {children}
                  </div>

                  {/* SECURITY STRIP */}
                  <div className="border-t border-white/[0.06] bg-white/[0.018] px-4 py-3 sm:px-7 sm:py-3.5">
                    <div className="flex items-center justify-center gap-2 text-center text-[9px] leading-4 text-slate-600 sm:text-[10px]">
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-3.5 w-3.5 shrink-0 text-emerald-500/70"
                      >
                        <path
                          d="M10 2.5 16 5v4.7c0 3.5-2.3 6.5-6 7.8-3.7-1.3-6-4.3-6-7.8V5l6-2.5Z"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinejoin="round"
                        />
                        <path
                          d="m7.2 10 1.8 1.8 3.8-4"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>

                      <span>
                        Secure authentication · Your data stays protected
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="mt-5 flex flex-col items-center justify-center gap-1.5 text-center sm:mt-6 sm:flex-row sm:gap-4">
                <p className="text-[9px] text-slate-700 sm:text-[10px]">
                  © {new Date().getFullYear()} Interxora.ai
                </p>

                <span className="hidden h-1 w-1 rounded-full bg-slate-800 sm:block" />

                <p className="text-[9px] text-slate-700 sm:text-[10px]">
                  AI-powered interview preparation
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AuthLayout;

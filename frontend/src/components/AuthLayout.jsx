import { Link } from "react-router-dom";

function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#020617] text-white">

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-250px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />

        <div className="absolute bottom-[-250px] left-[-150px] h-[450px] w-[450px] rounded-full bg-violet-600/10 blur-[120px]" />

        <div className="absolute right-[-150px] top-[30%] h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      {/* Main */}
      <div className="relative flex min-h-screen flex-col">

        {/* Navbar */}
        <header className="flex items-center justify-between px-6 py-6 sm:px-10 lg:px-16">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3"
          >
            {/* Logo Icon */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
              <span className="text-lg font-black text-white">
                I
              </span>
            </div>

            {/* Brand */}
            <div>
              <div className="text-xl font-bold tracking-tight">
                Interxora<span className="text-cyan-400">.ai</span>
              </div>

              <div className="text-[10px] font-medium tracking-widest text-slate-500">
                INTELLIGENT INTERVIEW PLATFORM
              </div>
            </div>
          </Link>

          {/* Register / Sign In navigation */}
          <div className="text-sm text-slate-400">
            <span className="hidden sm:inline">
              {window.location.pathname === "/register"
                ? "Already have an account?"
                : "Don't have an account?"}
            </span>

            <Link
              to={
                window.location.pathname === "/register"
                  ? "/login"
                  : "/register"
              }
              className="ml-2 font-semibold text-cyan-400 transition hover:text-cyan-300"
            >
              {window.location.pathname === "/register"
                ? "Sign in"
                : "Create account"}
            </Link>
          </div>

        </header>

        {/* Content */}
        <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-6">

          <div className="w-full max-w-md">

            {/* Brand heading */}
            <div className="mb-8 text-center">

              <div className="mb-4 inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-1.5">
                <span className="mr-2 h-2 w-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />

                <span className="text-xs font-medium text-cyan-300">
                  Intelligent Interview Platform
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Interxora<span className="text-cyan-400">.ai</span>
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Practice smarter. Perform better.
              </p>

            </div>

            {/* Auth Card */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">

              {children}

            </div>

            {/* Footer */}
            <p className="mt-6 text-center text-xs text-slate-600">
              © {new Date().getFullYear()} Interxora.ai. All rights reserved.
            </p>

          </div>

        </main>

      </div>
    </div>
  );
}

export default AuthLayout;
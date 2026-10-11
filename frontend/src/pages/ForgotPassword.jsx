import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../services/api";
import AuthLayout from "../components/AuthLayout";

function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            setError("Please enter your email address.");
            return;
        }

        setError("");
        setLoading(true);

        try {
            await requestPasswordReset(normalizedEmail);
            setSubmitted(true);
        } catch (err) {
            setError(
                err?.message ||
                "Unable to process your request. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="w-full max-w-md">
                {!submitted ? (
                    <>
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-white">
                                Forgot Password?
                            </h1>
                            <p className="mt-2 text-sm text-gray-400">
                                Enter your email and we'll send instructions
                                to reset your password.
                            </p>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5"
                        >
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-300">
                                    Email address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    disabled={loading}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-indigo-500 disabled:opacity-60"
                                />
                            </div>

                            {error && (
                                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading
                                    ? "Sending..."
                                    : "Send Reset Link"}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-gray-400">
                            Remember your password?{" "}
                            <Link
                                to="/login"
                                className="font-medium text-indigo-400 hover:text-indigo-300"
                            >
                                Back to Login
                            </Link>
                        </p>
                    </>
                ) : (
                    <div className="text-center">
                        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-2xl">
                            ✓
                        </div>

                        <h1 className="text-3xl font-bold text-white">
                            Check your email
                        </h1>

                        <p className="mt-4 text-sm leading-6 text-gray-400">
                            If an account exists for this email, we've sent a
                            password reset link. Check your inbox and follow
                            the instructions.
                        </p>

                        <p className="mt-3 text-xs leading-5 text-gray-500">
                            The reset link expires after a short period and can
                            only be used once.
                        </p>

                        <Link
                            to="/login"
                            className="mt-7 inline-block rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500"
                        >
                            Back to Login
                        </Link>
                    </div>
                )}
            </div>
        </AuthLayout>
    );
}

export default ForgotPassword;

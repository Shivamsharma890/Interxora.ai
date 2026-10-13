import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../services/api";
import AuthLayout from "../components/AuthLayout";

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get("token") || "";

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!token) {
            setError("This reset link is invalid or incomplete.");
        }
    }, [token]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");

        if (!token) {
            setError("This reset link is invalid or incomplete.");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            await resetPassword(token, newPassword);
            setSuccess(true);

            setTimeout(() => {
                navigate("/login", { replace: true });
            }, 1800);
        } catch (err) {
            setError(
                err?.message ||
                "This reset link is invalid or expired. Please request a new one."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="w-full max-w-md">
                {success ? (
                    <div className="text-center">
                        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-2xl text-green-400">
                            ✓
                        </div>

                        <h1 className="text-3xl font-bold text-white">
                            Password Reset Successful
                        </h1>

                        <p className="mt-4 text-sm leading-6 text-gray-400">
                            Your password has been changed. Please log in with
                            your new password.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-white">
                                Reset Password
                            </h1>
                            <p className="mt-2 text-sm text-gray-400">
                                Choose a new password for your Interxora
                                account.
                            </p>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5"
                        >
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-300">
                                    New password
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(event) =>
                                        setNewPassword(event.target.value)
                                    }
                                    autoComplete="new-password"
                                    placeholder="At least 8 characters"
                                    disabled={loading || !token}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-indigo-500 disabled:opacity-60"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-300">
                                    Confirm password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(event) =>
                                        setConfirmPassword(event.target.value)
                                    }
                                    autoComplete="new-password"
                                    placeholder="Re-enter your password"
                                    disabled={loading || !token}
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
                                disabled={loading || !token}
                                className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading
                                    ? "Resetting..."
                                    : "Reset Password"}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-gray-400">
                            <Link
                                to="/login"
                                className="font-medium text-indigo-400 hover:text-indigo-300"
                            >
                                Back to Login
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </AuthLayout>
    );
}

export default ResetPassword;

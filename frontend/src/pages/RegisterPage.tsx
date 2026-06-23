import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../services/api";

export function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await authApi.register(email, password);
      navigate("/login");
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-violet-400">MPC Token Board</h1>
          <p className="text-gray-500 text-sm mt-1">Create your account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Creating account..." : "Register"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-violet-400 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

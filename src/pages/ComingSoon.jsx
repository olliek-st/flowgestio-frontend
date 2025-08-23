import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ add
import HeadMeta from "../components/HeadMeta.jsx";

const API = import.meta.env.VITE_API_BASE || "";

export default function ComingSoon() {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState({ type: "", msg: "" });
  const navigate = useNavigate(); // ✅ add

  async function onSubmit(e) {
    e.preventDefault();
    setStatus({ type: "", msg: "" });

    const em = email.trim();
    const nm = name.trim();

    // Optional: require name as well
    if (!nm) {
      setStatus({ type: "error", msg: "Please enter your name." });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(em)) {
      setStatus({ type: "error", msg: "Please enter a valid email." });
      return;
    }

    setLoading(true);
    try {
      const r = await fetch(`${API}/beta/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: nm, email: em }),
      });

      if (!r.ok) throw new Error((await r.text()) || "Could not submit.");

      setStatus({
        type: "success",
        msg: "Thanks! You’re on the list and will be notified at launch 🚀",
      });

      // optional: clear inputs
      setName("");
      setEmail("");

      // ✅ redirect after a short, friendly pause
      setTimeout(() => {
        // Make sure /wizard is a valid route
        navigate("/wizard");
      }, 1000);
    } catch (err) {
      setStatus({
        type: "error",
        msg: err?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center px-6">
      <HeadMeta
        title="FlowGestio — Coming Soon"
        description="A smarter way to generate PMBOK‑compliant project documentation. Sign up for early access."
        canonical="https://app.flowgestio.com/coming-soon"
        robots="index,follow"
        // ✅ optional social image (set this file in /public)
        image="/og-image.png"
      />

      <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <img src="/logo.svg" alt="FlowGestio logo" className="h-14 w-auto object-contain" />
        <h2 className="mt-6 text-2xl font-semibold tracking-tight">Coming Soon</h2>
        <p className="mt-2 text-slate-600">
          We’re building a productivity tool for project professionals. Join the pre‑launch list to get early access.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3" noValidate>
          <label className="block text-sm">
            <span className="text-slate-700">Name *</span>
            <input
              required
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              autoComplete="name"
              aria-label="Your name"
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-700">Email *</span>
            <input
              required
              type="email"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
              autoComplete="email"
              aria-label="Your email address"
            />
          </label>

          {status.msg && (
            <div
              className={status.type === "error" ? "text-sm text-red-600" : "text-sm text-green-700"}
              role={status.type === "error" ? "alert" : "status"}
            >
              {status.msg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Submitting…" : "Notify Me"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500">
          By joining, you agree to be contacted once we launch. Unsubscribe anytime.
        </p>

        <footer className="mt-8 flex items-center justify-between text-xs text-slate-400">
          <span>© {new Date().getFullYear()} FlowGestio</span>
          <a href="mailto:hello@flowgestio.com" className="hover:text-slate-600">Contact</a>
        </footer>
      </section>
    </main>
  );
}

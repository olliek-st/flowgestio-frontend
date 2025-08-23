import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import HeadMeta from "../components/HeadMeta.jsx";

// Build a robust endpoint:
// - Use VITE_API_BASE if provided (trim trailing slash)
// - Otherwise fall back to a same-origin function (/api/waitlist)
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");
const WAITLIST_ENDPOINT = API_BASE ? `${API_BASE}/beta/request` : "/api/waitlist";

export default function ComingSoon() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });
  const navigate = useNavigate();

  const isValidEmail = (v) => /\S+@\S+\.\S+/.test(v);

  async function onSubmit(e) {
    e.preventDefault();
    setStatus({ type: "", msg: "" });

    const nm = name.trim();
    const em = email.trim();

    if (!nm) {
      setStatus({ type: "error", msg: "Please enter your name." });
      return;
    }
    if (!isValidEmail(em)) {
      setStatus({ type: "error", msg: "Please enter a valid email." });
      return;
    }

    setLoading(true);
    try {
      // Helpful log during preview/testing
      console.log("Waitlist endpoint →", WAITLIST_ENDPOINT);

      const res = await fetch(WAITLIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Avoid cookie/CORS headaches for this public POST
        credentials: "omit",
        body: JSON.stringify({ name: nm, email: em }),
      });

      // Treat 409 (already subscribed) as success
      if (!res.ok && res.status !== 409) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Request failed (${res.status})`);
      }

      setStatus({
        type: "success",
        msg:
          res.status === 409
            ? "You’re already on the list — redirecting…"
            : "Thanks! You’re on the list and will be notified at launch 🚀",
      });

      setName("");
      setEmail("");

      // Friendly pause then redirect
      setTimeout(() => navigate("/wizard"), 1000);
    } catch (err) {
      // Network/CORS or server thrown error
      setStatus({
        type: "error",
        msg: err?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  const disableSubmit =
    loading || !name.trim() || !email.trim() || !isValidEmail(email);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center px-6">
      <HeadMeta
        title="FlowGestio — Coming Soon"
        description="A smarter way to generate PMBOK-compliant project documentation. Sign up for early access."
        canonical="https://app.flowgestio.com/coming-soon"
        robots="index,follow"
        image="/og-image.png"
      />

      <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <img
          src="/logo.svg"
          alt="FlowGestio logo"
          className="h-14 w-auto object-contain"
        />
        <h2 className="mt-6 text-2xl font-semibold tracking-tight">Coming Soon</h2>
        <p className="mt-2 text-slate-600">
          We’re building a productivity tool for project professionals. Join the
          pre-launch list to get early access.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-3"
          noValidate
          aria-busy={loading ? "true" : "false"}
        >
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
              className={`text-sm ${
                status.type === "error" ? "text-red-600" : "text-green-700"
              }`}
              role={status.type === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              {status.msg}
            </div>
          )}

          <button
            type="submit"
            disabled={disableSubmit}
            className="w-full rounded-xl bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Submitting…" : "Notify Me"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500">
          By joining, you agree to be contacted once we launch. Unsubscribe
          anytime.
        </p>

        <footer className="mt-8 flex items-center justify-between text-xs text-slate-400">
          <span>© {new Date().getFullYear()} FlowGestio</span>
          <a href="mailto:hello@flowgestio.com" className="hover:text-slate-600">
            Contact
          </a>
        </footer>
      </section>
    </main>
  );
}

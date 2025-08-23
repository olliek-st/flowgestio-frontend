import React, { useState } from "react";
import HeadMeta from "../components/HeadMeta.jsx";

// Force same-origin on previews; allow external API only in non-preview builds
const isPreview =
  typeof window !== "undefined" && /-git-/.test(window.location.hostname);
const API_BASE = isPreview
  ? ""
  : (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");
const WAITLIST_ENDPOINT = API_BASE ? `${API_BASE}/beta/request` : "/api/waitlist";

export default function ComingSoon() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });

  const success = status.type === "success";
  const isValidEmail = (v) => /\S+@\S+\.\S+/.test(v);
  const looksLikeHTML = (s) => /<\s*[a-z][\s\S]*>/i.test(s || "");

  async function onSubmit(e) {
    e.preventDefault();
    setStatus({ type: "", msg: "" });

    const nm = name.trim();
    const em = email.trim();

    if (!nm) return setStatus({ type: "error", msg: "Please enter your name." });
    if (!isValidEmail(em))
      return setStatus({ type: "error", msg: "Please enter a valid email." });

    setLoading(true);
    try {
      // Send cookies on same-origin (needed for Vercel Deployment Protection)
      const sameOrigin =
        WAITLIST_ENDPOINT.startsWith("/") ||
        (typeof window !== "undefined" &&
          WAITLIST_ENDPOINT.startsWith(window.location.origin));

      const res = await fetch(WAITLIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: sameOrigin ? "same-origin" : "omit",
        body: JSON.stringify({ name: nm, email: em }),
      });

      // Treat 409 as success (“already subscribed”)
      if (!res.ok && res.status !== 409) {
        const t = await res.text().catch(() => "");
        const safe = looksLikeHTML(t) ? "" : t;
        throw new Error(safe || `Request failed (${res.status})`);
      }

      setStatus({
        type: "success",
        msg:
          res.status === 409
            ? "You’re already on the list — we’ll keep you posted ✅"
            : "Thanks! You’re on the list and will be notified at launch 🚀",
      });

      // Optionally clear inputs; the form is disabled after success anyway.
      setName("");
      setEmail("");
    } catch (err) {
      setStatus({
        type: "error",
        msg: err?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  // Clear any shown message once the user edits again
  const onEdit = (setter) => (e) => {
    setter(e.target.value);
    if (status.type) setStatus({ type: "", msg: "" });
  };

  const disableSubmit =
    loading || success || !name.trim() || !email.trim() || !isValidEmail(email);

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
        <img src="/logo.svg" alt="FlowGestio logo" className="h-14 w-auto object-contain" />
        <h2 className="mt-6 text-2xl font-semibold tracking-tight">Coming Soon</h2>
        <p className="mt-2 text-slate-600">
          We’re building a productivity tool for project professionals. Join the pre-launch list to get early access.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3" noValidate>
          <label className="block text-sm">
            <span className="text-slate-700">Name *</span>
            <input
              required
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={name}
              onChange={onEdit(setName)}
              placeholder="Jane Doe"
              autoComplete="name"
              aria-label="Your name"
              disabled={success}
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-700">Email *</span>
            <input
              required
              type="email"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={email}
              onChange={onEdit(setEmail)}
              placeholder="jane@company.com"
              autoComplete="email"
              aria-label="Your email address"
              disabled={success}
            />
          </label>

          {status.msg && (
            <div
              className={status.type === "error" ? "text-sm text-red-600" : "text-sm text-green-700"}
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
            {success ? "You're on the list ✓" : loading ? "Submitting…" : "Notify Me"}
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

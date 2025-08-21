import React, { useState } from "react";         // <-- make sure this line exists
import { track } from "../lib/analytics";

export default function EmailCapture() {
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      track("newsletter_submit", { email });
      // TODO: send to your backend/email tool
      setOk(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="py-16" id="newsletter">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-2xl font-semibold">Get product updates</h2>
        <p className="text-slate-600 mt-1">
          Be first to know about new templates and features.
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col sm:flex-row gap-3">
          <input
  required
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="your.email@example.com"
  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
/>

<button
  className="inline-flex items-center justify-center rounded-2xl px-5 py-3 font-medium bg-blue-600 text-white shadow hover:bg-blue-700 disabled:opacity-60"
  disabled={loading}
  aria-busy={loading}
>
  {loading ? "Submitting…" : "Subscribe"}
</button>
</form>

        {ok && <p className="text-emerald-600 mt-3">Thanks! You’re on the list.</p>}
      </div>
    </section>
  );
}

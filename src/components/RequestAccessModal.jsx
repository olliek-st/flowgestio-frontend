import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { api } from "../lib/api";
import { track } from "../lib/analytics";


export default function RequestAccessModal({ open, onClose }) {
  if (!open) return null;

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  const mountedAt = useRef(Date.now());
  const [serverError, setServerError] = useState("");
  const HONEYPOT_FIELD = "company"; // hidden field name

  async function onSubmit(values) {
    setServerError("");

    // Honeypot: if bots filled hidden field, drop silently
    if (values[HONEYPOT_FIELD]) {
      track("beta_request_spam", { reason: "honeypot" });
      return;
    }
    // Too-fast submission: likely a bot
    const elapsed = Date.now() - mountedAt.current;
    if (elapsed < 2000) {
      setServerError("Please wait a moment and try again.");
      track("beta_request_spam", { reason: "too_fast", ms: elapsed });
      return;
    }

    try {
      await api.betaRequest({
        name: values.name,
        email: values.email,
        role: values.role,
      });
      track("beta_request_submitted", { role: values.role });
      reset();
      if (typeof onClose === "function") onClose();
    } catch (err) {
      setServerError(err?.message || "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
          aria-label="Close"
        >
          ✕
        </button>

        <h3 className="text-lg font-semibold">Request Beta Access</h3>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3" noValidate>
          {/* Honeypot (hidden for users) */}
          <div aria-hidden="true" className="sr-only">
            <label htmlFor="company">Company</label>
            <input
              id="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...register(HONEYPOT_FIELD)}
            />
          </div>

          <input
            className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-blue-500"
            placeholder="Full name"
            {...register("name", { required: true })}
          />
          <input
            className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-blue-500"
            type="email"
            placeholder="your.email@example.com"
            {...register("email", { required: true })}
          />
          <input
            className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-blue-500"
            placeholder="Role (e.g., PM, PMO Analyst)"
            {...register("role")}
          />

          <button
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? "Sending…" : "Request Access"}
          </button>

          {serverError && (
            <p className="text-sm text-red-600">{serverError}</p>
          )}

          <p className="text-center text-xs text-slate-500">
            We’ll use your email to share beta access and updates. You can opt out anytime.
          </p>
        </form>
      </div>
    </div>
  );
}
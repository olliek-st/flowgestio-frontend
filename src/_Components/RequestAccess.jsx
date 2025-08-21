import React, { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "../lib/api";
import { track } from "../lib/analytics";

export default function RequestAccess() {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  const mountedAt = useRef(Date.now());
  const [serverError, setServerError] = useState("");
  const [ok, setOk] = useState(false);
  const HONEYPOT_FIELD = "company";

  async function onSubmit(values) {
    setServerError("");
    setOk(false);

    if (values[HONEYPOT_FIELD]) {
      track("beta_request_spam", { reason: "honeypot" });
      return;
    }
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
      setOk(true);
    } catch (err) {
      setServerError(err?.message || "Something went wrong. Please try again.");
    }
  }

  return (
    <section className="py-12" id="request-access">
      <div className="mx-auto max-w-xl px-6">
        <h3 className="text-xl font-semibold text-center">Request Beta Access</h3>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-3" noValidate>
          {/* Honeypot (hidden) */}
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
          {ok && (
            <p className="text-sm text-emerald-600">Thanks! You’re on the list.</p>
          )}

          <p className="text-center text-xs text-slate-500">
            We’ll use your email to share beta access and updates. You can opt out anytime.
          </p>
        </form>
      </div>
    </section>
  );
}

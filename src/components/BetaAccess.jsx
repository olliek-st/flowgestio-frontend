import React from "react";
import { useForm } from "react-hook-form";
import { api } from "../lib/api";
import { track } from "../lib/analytics";

export default function RequestAccess(){
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm();

  async function onSubmit(values){
    await api.betaRequest(values);
    track("beta_request_submitted", { role: values.role });
    reset();
    alert("Thanks! We'll be in touch soon.");
  }

  return (
    <section className="py-12">
      <div className="max-w-xl mx-auto px-6">
        <h3 className="text-xl font-semibold text-center">Request Beta Access</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-3">
          <input className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-blue-500" placeholder="Full name" {...register("name", { required: true })} />
          <input className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-blue-500" placeholder="Work email" type="email" {...register("email", { required: true })} />
          <input className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-blue-500" placeholder="Role (e.g., PM, PMO Analyst)" {...register("role")}/>
          <button disabled={isSubmitting} className="w-full rounded-2xl bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {isSubmitting ? "Sending…" : "Request Access"}
          </button>
        </form>
        {Object.keys(errors).length > 0 && <p className="mt-2 text-sm text-red-600">Please fill required fields.</p>}
      </div>
    </section>
  );
}

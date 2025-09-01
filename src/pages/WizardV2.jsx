import React, { useState } from "react";
import Step1Context from "../components/wizard/steps/Step1Context.jsx";
import Step2Documents from "../components/wizard/steps/Step2Documents.jsx";
import Step3Generate from "../components/wizard/steps/Step3Generate.jsx";
import Step4Export from "../components/wizard/steps/Step4Export.jsx";

export default function WizardV2() {
  const [step, setStep] = useState(1);
  const [context, setContext] = useState({ industry: "", region: "" });
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [builtDoc, setBuiltDoc] = useState(null);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">FlowGestio — Research Wizard</h1>
        <div className="flex items-center gap-2">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="px-3 py-2 rounded-lg border">
              Back
            </button>
          )}
        </div>
      </header>

      <div className="rounded-2xl border bg-white p-5 space-y-6">
        {/* Step indicator */}
        <div className="text-sm text-slate-600">
          Step {step} of 4
        </div>

        {step === 1 && (
          <Step1Context
            initial={context}
            onNext={(ctx) => { setContext(ctx); setStep(2); }}
          />
        )}

        {step === 2 && (
          <Step2Documents
            data={context}
            onPick={(docId) => { setSelectedDocId(docId); setStep(3); }}
          />
        )}

        {step === 3 && (
          <Step3Generate
            data={context}
            selectedDocId={selectedDocId}
            onBack={() => setStep(2)}
            onNext={(doc) => { setBuiltDoc(doc); setStep(4); }}
          />
        )}

        {step === 4 && (
          <Step4Export
            doc={builtDoc}
            onBack={() => setStep(3)}
            onFinish={() => {}}
          />
        )}
      </div>
    </main>
  );
}

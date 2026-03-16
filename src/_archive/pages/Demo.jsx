// src/pages/Demo.jsx
import React from "react";
import { buildNumbered } from "../lib/docs/viewModel";
import { demoRaw, demoTree } from "../data/demoPackage";
import CharterPreviewPolished from "../components/CharterPreviewPolished.jsx";

export default function Demo() {
  const { vm } = buildNumbered(demoRaw, demoTree);

  const onPrint = () => {
    const prev = document.title;
    document.title = `${vm.header.name} — Project Charter`;
    window.print();
    setTimeout(() => (document.title = prev), 100);
  };

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-semibold">FlowGestio — Sample Output</h1>
        <p className="text-sm text-slate-500">
          Looking to try it? <a href="/demo" className="text-blue-600 underline">Open the Wizard demo</a>
        </p>
		<div className="flex gap-3">
         <a href="/" className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50">Back</a>
          <button onClick={onPrint} className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            Print / Save as PDF
          </button>
        </div>
      </header>

      <CharterPreviewPolished vm={vm} />

      <p className="text-sm text-slate-500 no-print">
        Want to generate your own? <a href="#" className="text-blue-600 underline">Join the Beta</a>
      </p>
    </main>
  );
}

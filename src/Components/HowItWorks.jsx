const steps = [
  { n: 1, title: "Answer", desc: "Tell us about your project goals, constraints, and context." },
  { n: 2, title: "AI Recommends", desc: "We generate PMI‑aligned plans, risks, and procurement suggestions." },
  { n: 3, title: "Review", desc: "Tweak scope, milestones, and budgets with live guidance." },
  { n: 4, title: "Export", desc: "Export polished PDFs and editable artifacts for your stakeholders." },
];

export default function HowItWorks() {
  return (
    <section className="pt-10 pb-16 bg-divider" id="how-it-works">
  <div className="max-w-6xl mx-auto px-6">
    <h2 className="text-3xl font-semibold mb-8 text-center">How it works</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {steps.map(s => (
        <div key={s.n} className="rounded-2xl border border-subtle bg-white p-6 shadow-card hover:shadow-md transition">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold mb-4">{s.n}</div>
          <h3 className="text-lg font-semibold">{s.title}</h3>
          <p className="text-secondary mt-1">{s.desc}</p>
        </div>
      ))}
    </div>
  </div>
</section>
  );
}
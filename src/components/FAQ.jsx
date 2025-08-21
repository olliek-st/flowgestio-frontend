// src/components/FAQ.jsx
const faqs = [
  { q: "Is there a free plan?", a: "Yes—FlowGestio is free during beta. After beta, a freemium plan will allow up to 2 projects." },
  { q: "Are templates PMI-aligned?", a: "Yes. Templates are designed to align with PMBOK® concepts." },
  { q: "Do you support enterprise SSO?", a: "Planned. Contact us if you need early access." },
  { q: "What happens after beta?", a: "We’ll announce pricing before GA; beta users get early access to paid features." },
];

export default function FAQ() {
  return (
    <section className="py-16 bg-divider" id="faq">
  <div className="max-w-4xl mx-auto px-6">
    <h2 className="text-3xl font-semibold mb-6 text-center">FAQ</h2>
        <ul className="divide-y divide-slate-200">
          {faqs.map((f, i) => (
            <li key={i} className="py-5 first:pt-0 last:pb-0">
              <p className="font-medium text-slate-900">{f.q}</p>
              <p className="text-secondary mt-1">{f.a}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// src/components/Testimonials.jsx

const quotes = [
  {
    quote: "I built a full Charter in under 25 minutes. The QA flags were clutch.",
    name: "Lena K.",
    title: "PMO Analyst",
  },
  {
    quote: "Way better than a blank doc. The exports look board-ready.",
    name: "Hassane O.",
    title: "Startup Founder",
  },
  {
    quote: "Love the WBS builder—simple and fast. No more tedious breakdowns.",
    name: "Erik S.",
    title: "Project Manager",
  },
];

export default function Testimonials() {
  return (
    <section className="py-16" id="testimonials">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl font-semibold text-center">What early users say</h2>
        <p className="text-center text-slate-600 mt-2">Real feedback from early access PMs.</p>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {quotes.map((q, i) => (
            <figure
              key={i}
              className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="relative">
                {/* opening quote SVG */}
                <svg 
                  className="absolute -top-2 -left-2 w-8 h-8 text-blue-600 opacity-100" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M6.5 10c0-2 1.5-4 4-4V4c-3.5 0-6 2.5-6 6v4c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-4h-4z"/>
                  <path d="M16.5 10c0-2 1.5-4 4-4V4c-3.5 0-6 2.5-6 6v4c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-4h-4z"/>
                </svg>
                
                <blockquote className="text-slate-700 text-lg font-medium italic leading-relaxed pl-8 pr-6 py-3">
                  {q.quote}
                  <svg 
                    className="inline-block ml-1 w-8 h-8 text-blue-600 opacity-100 rotate-180" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                    style={{verticalAlign: 'top', marginTop: '0.1em'}}
                  >
                    <path d="M6.5 10c0-2 1.5-4 4-4V4c-3.5 0-6 2.5-6 6v4c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-4h-4z"/>
                    <path d="M16.5 10c0-2 1.5-4 4-4V4c-3.5 0-6 2.5-6 6v4c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-4h-4z"/>
                  </svg>
                </blockquote>
                
                {/* removed the absolutely positioned closing quote */}
              </div>
              
              <figcaption className="mt-6 pt-4 border-t border-slate-100">
                <div>
                  <div className="font-semibold text-slate-900">{q.name}</div>
                  <div className="text-slate-500 text-sm">{q.title}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

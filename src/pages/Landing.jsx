import { useState } from "react";
import { Link } from "react-router-dom";
import { track } from "../lib/analytics";
import BetaBanner from "../components/BetaBanner";
import { FileText, Sparkles, ShieldCheck } from "lucide-react";
import HowItWorks from "../components/HowItWorks";
import Testimonials from "../components/Testimonials";
import EmailCapture from "../components/EmailCapture";
import FAQ from "../components/FAQ";
import RequestAccessModal from "../components/RequestAccessModal";

const IS_BETA =
  import.meta.env.VITE_BETA === "1" || import.meta.env.VITE_MAINTENANCE === "1";

// helper container
function Container({ children, className = "" }) {
  return (
    <div className={`mx-auto max-w-6xl px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}

export default function Landing() {
  const [showRequest, setShowRequest] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
  <Container className="flex h-14 items-center justify-between">
    <Link to="/" className="font-semibold tracking-tight flex items-center gap-2">
      {/* Logo image from /public/logo.svg */}
      <img src="/logo.svg" alt="FlowGestio logo" className="h-14 w-auto object-contain" />
    </Link>

    <nav className="flex items-center gap-3">
      <Link to="/login" className="px-3 py-1.5 rounded-md hover:bg-gray-100">
        Sign In
      </Link>
      <button
        className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 font-medium text-white shadow hover:bg-blue-700"
        onClick={() => {
          track("beta_join_click", { placement: "nav" });
          setShowRequest(true);
        }}
      >
        Join Beta
      </button>
    </nav>
  </Container>

  {/* High-contrast banner under nav */}
  <BetaBanner onJoin={() => setShowRequest(true)} />
</header>



      {/* Hero */}
      <section className="relative">
        <Container className="py-12 lg:py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
              From Idea to{" "}
              <span className="bg-gradient-to-r from-[#3B82F6] to-[#6366F1] bg-clip-text text-transparent">
                PMI-Compliant
              </span>{" "}
              Project Plan in{" "}
              <span className="bg-gradient-to-r from-[#F97316] to-[#EF4444] bg-clip-text text-transparent">
                30 Minutes
              </span>
            </h1>

            <p className="mt-4 text-secondary">
              Transform your project ideas into professional,</p>
              <p>PMI-standard documentation with our intelligent wizard.</p>
        

            {/* CTAs */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-medium text-white shadow hover:bg-blue-700"
                onClick={() => {
                  track("beta_join_click", { placement: "hero" });
                  setShowRequest(true);
                }}
              >
                Join Beta
              </button>

              <a href="/sample" className="rounded-2xl border px-5 py-3 hover:bg-slate-50">
               View Sample Output
              </a>
			  <a href="/wizard" className="rounded-2xl border px-5 py-3 hover:bg-slate-50">
               Try the Wizard (demo)
              </a>
            </div>

            {/* badges */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                Limited beta spots
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Free during beta
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                Help shape the product
              </span>
            </div>

            {/* rating + quote */}
            <div className="mt-6 text-sm text-secondary">
              <span className="font-semibold text-slate-900">★ ★ ★ ★ ★ 4.9/5</span> from
              200+ users
              <p className="italic mt-1">
                “Finally, a tool that actually follows PMI standards.” — Sarah M., Senior PM
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Sections */}
      <HowItWorks />      {/* grey via bg-divider inside component */}
      <Testimonials />    {/* white */}
      <EmailCapture />    {/* white */}
      <FAQ />             {/* grey */}

      {/* Benefits (title-less visually, accessible H2) */}
      <section id="benefits" aria-labelledby="benefits-title" className="py-16">
  <Container>
    <h2 id="benefits-title" className="sr-only">Benefits</h2>
    <div className="grid gap-8 sm:grid-cols-3">
      <Feature
        icon={<FileText />}
        title="Complete Documentation"
        text="Generate Charter, Scope Baseline, Schedule Baseline, Cost Baseline—and all PMI subsidiary plans when needed."
      />
      <Feature
        icon={<Sparkles />}
        title="Intelligent Guidance"
        text="Tailored recommendations from best practices and your project context. Skip irrelevant sections with smart defaults."
      />
      <Feature
        icon={<ShieldCheck />}
        title="Professional Export"
        text={
          IS_BETA
            ? "Export polished PDFs or Word files ready for stakeholders. Watermarks are disabled during beta."
            : "Export polished PDFs or Word files ready for stakeholders."
        }
      />
    </div>
  </Container>
</section>
	  
	 {/* Footer */}
      <footer className="border-t">
        <Container className="py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-secondary">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary text-white text-xs">
              FG
            </span>
            © {new Date().getFullYear()} FlowGestio
          </div>
          <nav className="flex gap-5">
            <a href="/privacy.html">Privacy</a>
            <a href="/terms.html">Terms</a>
            <a href="mailto:hello@flowgestio.com">Contact</a>
          </nav>
        </Container>
      </footer>

      {/* Modal */}
      <RequestAccessModal open={showRequest} onClose={() => setShowRequest(false)} />
    </div>
  );
}

/* ---- small helpers ---- */

function Feature({ icon, title, text }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-card border border-subtle">
      <div className="flex items-center gap-3 mb-3">
        <div className="inline-flex rounded-md bg-primary/10 p-2 text-primary">
          {icon}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-secondary">{text}</p>
    </div>
  );
}

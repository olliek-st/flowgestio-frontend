import { useState } from "react";
import { Link } from "react-router-dom";
import { track } from "../lib/analytics";
import { FileText, Sparkles, ShieldCheck, Brain, CheckCircle } from "lucide-react";

// Helper container
function Container({ children, className = "" }) {
  return (
    <div className={`mx-auto max-w-6xl px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}

export default function Landing() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Track email signup
      track("email_signup", { email, source: "coming_soon" });
      
      // Store email locally for now (replace with your backend later)
      let emails = JSON.parse(localStorage.getItem('flowgestio_launch_emails') || '[]');
      if (!emails.includes(email)) {
        emails.push(email);
        localStorage.setItem('flowgestio_launch_emails', JSON.stringify(emails));
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsSubmitted(true);
      setEmail("");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
        <Container className="flex h-14 items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight flex items-center gap-2">
            <img src="/logo.svg" alt="FlowGestio logo" className="h-14 w-auto object-contain" />
          </Link>

          <nav className="flex items-center gap-3">
            <Link to="/login" className="px-3 py-1.5 rounded-md hover:bg-gray-100">
              Sign In
            </Link>
            <a 
              href="#notify" 
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 font-medium text-white shadow hover:bg-blue-700"
            >
              Get Notified
            </a>
          </nav>
        </Container>
      </header>

      {/* Coming Soon Hero */}
      <section className="relative py-16 lg:py-24">
        <Container>
          <div className="max-w-4xl mx-auto text-center">
            {/* Coming Soon Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              Coming Soon
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight mb-6">
              From Idea to{" "}
              <span className="bg-gradient-to-r from-[#3B82F6] to-[#6366F1] bg-clip-text text-transparent">
                Ready-to-Submit
              </span>{" "}
              Project Documents
            </h1>

            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              The fastest way to generate PMI-compliant project management documents. Starting with Business Cases and Project Charters, and soon create the entire planning phase — from the Schedule Management Plan to the Stakeholder Engagement Plan — all ready for approval boards.
            </p>

            {/* Email Signup */}
            <div id="notify" className="max-w-md mx-auto mb-8">
              {!isSubmitted ? (
                <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Adding..." : "Notify Me"}
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  Thanks! We'll notify you when FlowGestio launches.
                </div>
              )}
              
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
              
              <p className="mt-3 text-sm text-slate-500">
                No spam, just launch updates. Unsubscribe anytime.
              </p>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm mb-12">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                Free during beta
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                Limited beta spots
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Help shape the product
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* What to Expect */}
      <section className="py-16 bg-slate-50">
  <Container>
    <div className="text-center mb-12">
      <h2 className="text-3xl font-bold mb-4">What to expect:</h2>
      <p className="text-lg text-slate-600">
        Complete PMI-compliant project management documents — not empty templates
      </p>
    </div>

    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
      <Feature
        icon={<FileText />}
        title="Complete Documents"
        text="Start with Business Cases and Project Charters today — with the full planning phase (risk, scope, schedule, stakeholder, and more) coming soon."
      />
      <Feature
        icon={<ShieldCheck />}
        title="PMI-Compliant"
        text="Documents structured to PMI standards with proper formatting, required sections, and alignment to the PMBOK® Guide."
      />
      <Feature
        icon={<Brain />}
        title="AI-Powered Content"
        text="Context-aware AI generates polished content for every section — far beyond fill-in-the-blank templates."
      />
      <Feature
        icon={<Sparkles />}
        title="Board-Ready Export"
        text="Instantly export polished PDFs and Word files — ready to share with sponsors, stakeholders, and approval boards."
      />
    </div>
  </Container>
</section>
      {/* Footer */}
      <footer className="border-t">
        <Container className="py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-white text-xs">
              FG
            </span>
            © {new Date().getFullYear()} FlowGestio
          </div>
          <nav className="flex gap-5">
            <a href="/privacy.html" className="hover:text-slate-700">Privacy</a>
            <a href="/terms.html" className="hover:text-slate-700">Terms</a>
            <a href="mailto:hello@flowgestio.com" className="hover:text-slate-700">Contact</a>
          </nav>
        </Container>
      </footer>
    </div>
  );
}

/* Helper Components */

function Feature({ icon, title, text }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
      <div className="flex flex-col items-center text-center">
        <div className="inline-flex rounded-xl bg-blue-100 p-3 text-blue-600 mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function Testimonial({ quote, author, role }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <blockquote className="text-lg text-slate-700 mb-4">
        "{quote}"
      </blockquote>
      <div className="flex items-center">
        <div>
          <div className="font-semibold text-slate-900">{author}</div>
          <div className="text-sm text-slate-500">{role}</div>
        </div>
      </div>
    </div>
  );
}

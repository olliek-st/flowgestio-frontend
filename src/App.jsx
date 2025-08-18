import React, { useState } from 'react';
import { Play, CheckCircle, ArrowRight, Users, Clock, FileText, Zap, Shield, Award, Star, Mail, Check } from 'lucide-react';
import './App.css';

{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}


function App() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    
    // Simulate API call - replace with actual email service
    setTimeout(() => {
      setSubscribed(true);
      setIsSubmitting(false);
      setEmail('');
    }, 1000);
  };

  return (
    <div className="app-modern">
      {/* Header */}
      <header className="header-modern">
        <div className="container">
          <div className="nav-modern">
            <div className="logo-modern">
              <div className="logo-icon-modern">FG</div>
              <div className="logo-text-modern">
                <span className="logo-name">FlowGestio</span>
                <div className="logo-subtitle">PMI-Compliant PM</div>
              </div>
            </div>
            <div className="nav-buttons-modern">
              <button className="btn-secondary-modern">Sign In</button>
              <button className="btn-primary-modern">Start Free Trial</button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="main-modern">
        <div className="container">
          <div className="hero-modern">
            <div className="beta-badge">
              <Zap size={16} />
              Now in Beta - Join 500+ Early Users
            </div>
            
            <h1 className="hero-title-modern">
              From Idea to <span className="gradient-text-modern">PMI-Compliant</span><br />
              Project Plan in <span className="highlight-text">30 Minutes</span>
            </h1>
            
            <p className="hero-subtitle-modern">
              Transform your project ideas into professional, PMI-standard documentation with our intelligent wizard. 
              No more blank templates or guesswork – just guided questions that generate complete project plans.
            </p>
            
            <div className="hero-buttons-modern">
              <button className="btn-hero-primary">
                <Play size={20} />
                Start Your First Project
                <ArrowRight size={18} />
              </button>
              <button className="btn-hero-secondary">
                <FileText size={18} />
                View Sample Output
              </button>
            </div>

            {/* Social Proof */}
            <div className="social-proof">
              <div className="stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} fill="#fbbf24" color="#fbbf24" />
                ))}
                <span>4.9/5 from 200+ users</span>
              </div>
              <p className="testimonial">"Finally, a tool that actually follows PMI standards" - Sarah M., Senior PM</p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="features-grid-modern">
            <div className="feature-card-modern blue">
              <div className="feature-icon-wrapper blue">
                <FileText size={32} />
              </div>
              <h3>Complete Documentation</h3>
              <p>Generate Charter, Scope Baseline, Schedule Baseline, Cost Baseline, and all 15+ PMI subsidiary management plans automatically.</p>
              <div className="feature-list">
                {['Project Charter', 'Risk Management Plan', 'Stakeholder Registry', 'WBS Structure'].map((item, i) => (
                  <div key={i} className="feature-item">
                    <Check size={16} />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="feature-card-modern purple">
              <div className="feature-icon-wrapper purple">
                <Clock size={32} />
              </div>
              <h3>Intelligent Guidance</h3>
              <p>Smart recommendations based on your project type, methodology, and industry best practices. AI-powered suggestions keep you on track.</p>
              <div className="feature-list">
                {['Methodology Recommendations', 'Risk Identification', 'Resource Planning', 'Timeline Optimization'].map((item, i) => (
                  <div key={i} className="feature-item">
                    <Check size={16} />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="feature-card-modern green">
              <div className="feature-icon-wrapper green">
                <Users size={32} />
              </div>
              <h3>Professional Export</h3>
              <p>Export to PDF or Word format ready for stakeholder presentation. Custom branding and executive-ready formatting included.</p>
              <div className="feature-list">
                {['PDF & Word Export', 'Custom Branding', 'Executive Summary', 'Presentation Ready'].map((item, i) => (
                  <div key={i} className="feature-item">
                    <Check size={16} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="how-it-works-modern">
            <div className="section-header">
              <h2>How It Works</h2>
              <p>Our proven 4-step process transforms your project vision into professional PMI documentation</p>
            </div>
            
            <div className="steps-grid">
              {[
                { num: 1, title: "Answer Questions", desc: "Tell us about your project vision, constraints, and goals through our guided interview", color: "blue" },
                { num: 2, title: "AI Recommends", desc: "Get methodology suggestions, risk assessments, and smart defaults based on your project type", color: "purple" },
                { num: 3, title: "Review & Refine", desc: "Preview your documents with built-in quality checks and make adjustments in real-time", color: "green" },
                { num: 4, title: "Export & Execute", desc: "Download professional documents ready for your team and stakeholders", color: "orange" }
              ].map((step, i) => (
                <div key={i} className="step-card">
                  <div className={`step-number ${step.color}`}>
                    {step.num}
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Newsletter Subscription */}
          <div className="newsletter-section">
            <Mail size={64} className="newsletter-icon" />
            <h2>Stay Updated on FlowGestio</h2>
            <p>Get early access to new features, PMI best practices, and exclusive project management insights delivered to your inbox.</p>
            
            {subscribed ? (
              <div className="success-message">
                <CheckCircle size={24} />
                <span>Thanks for subscribing! Check your email.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="subscription-form">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <div className="spinner"></div>
                  ) : (
                    'Subscribe'
                  )}
                </button>
              </form>
            )}
            
            <p className="newsletter-disclaimer">No spam. Unsubscribe anytime. Join 1,200+ project managers.</p>
          </div>

          {/* Trust Signals */}
          <div className="trust-signals">
            <div className="trust-item">
              <Shield size={48} />
              <h3>PMI Certified</h3>
              <p>Built by PMPs, validated by the PMI community</p>
            </div>
            <div className="trust-item">
              <Award size={48} />
              <h3>Enterprise Ready</h3>
              <p>SOC 2 compliant with enterprise-grade security</p>
            </div>
            <div className="trust-item">
              <Users size={48} />
              <h3>Proven Results</h3>
              <p>95% of users complete projects faster</p>
            </div>
          </div>

          {/* Final CTA */}
          <div className="final-cta">
            <h2>Ready to Transform Your Project Planning?</h2>
            <p>Join hundreds of project managers who've streamlined their workflow with FlowGestio. Start your free trial today.</p>
            <div className="cta-buttons">
              <button className="btn-cta-primary">
                Start Free Trial
                <ArrowRight size={20} />
              </button>
              <button className="btn-cta-secondary">Schedule Demo</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
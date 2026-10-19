'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Send, 
  ShieldCheck, 
  Zap, 
  Calendar, 
  CheckCircle2, 
  ArrowRight, 
  Flame, 
  Layers, 
  HelpCircle,
  Cpu,
  Lock,
  Check
} from 'lucide-react';
import { CREDIT_PACKAGES } from '@/lib/credits/pricing';
import PostPilotLogo from '@/components/PostPilotLogo';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      
      {/* Navigation Bar */}
      <header style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '24px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <PostPilotLogo size={42} subtitle="AI SOCIAL AUTOMATION SAAS" href="/landing" />

        <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a href="#features" style={{ fontSize: '0.88rem', color: '#475569', textDecoration: 'none', fontWeight: 500 }}>Features</a>
          <a href="#pricing" style={{ fontSize: '0.88rem', color: '#475569', textDecoration: 'none', fontWeight: 500 }}>Credit Pricing</a>
          <a href="#security" style={{ fontSize: '0.88rem', color: '#475569', textDecoration: 'none', fontWeight: 500 }}>Security</a>
          <Link href="/login" className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '0.86rem' }}>
            Sign In
          </Link>
          <Link href="/login" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} color="#fbbf24" /> Claim 50 Free Credits
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section style={{ maxWidth: '1080px', margin: '0 auto', padding: '80px 20px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', background: '#ede9fe', border: '1px solid #c7d2fe', marginBottom: '24px' }}>
          <Sparkles size={16} color="#4f46e5" />
          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#4338ca' }}>
            Multi-Tenant SaaS • Credit-Based Engine • Bluesky & X Ready
          </span>
        </div>

        <h1 style={{ fontSize: '3.4rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '24px', color: '#0f172a' }}>
          Automate Your Social Growth with{' '}
          <span style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Platform-Tailored AI
          </span>
        </h1>

        <p style={{ fontSize: '1.2rem', color: '#475569', maxWidth: '760px', margin: '0 auto 36px', lineHeight: 1.6 }}>
          Generate platform-constrained content for <strong>Bluesky</strong>, <strong>X (Twitter)</strong>, and <strong>Quora</strong>. Schedule with background BullMQ queues, spend atomically tracked credits, and publish with complete peace of mind.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/login" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '1rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={18} color="#fbbf24" /> Start with 50 Free Credits <ArrowRight size={18} />
          </Link>
          <Link href="/login" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '1rem' }}>
            Explore AI Studio
          </Link>
        </div>

        {/* Value Pills */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px', marginTop: '40px', fontSize: '0.86rem', color: '#475569' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} color="#059669" /> No Credit Card Required
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} color="#059669" /> Official AT Protocol & X API
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} color="#059669" /> AES-256-GCM Vault
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section id="features" style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
            Engineered for Resilient Social Media Automation
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.96rem', marginTop: '6px' }}>
            Built from first principles: atomic financial ledger, distributed job queues, and native protocol adapters.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
              <Send size={20} color="#0284c7" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              Official Bluesky AT Protocol
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.6' }}>
              Integrated using the verified <code style={{ color: '#0369a1', background: '#f0f9ff', padding: '2px 6px', borderRadius: '4px' }}>@atproto/api</code> SDK. Automatic session authentication, 300-char guardrail enforcement, and real CID confirmation.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
              <Sparkles size={20} color="#0f172a" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              Compliant X (Twitter) API v2
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.6' }}>
              OAuth 2.0 PKCE and API v2 posting with strict 280-character limiters, token refresh workflows, and unit-economic quota protection.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
              <HelpCircle size={20} color="#b91c1c" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              Quora Answer Studio
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.6' }}>
              Generates in-depth 300-word authoritative answers with question URLs, 1-click clipboard copying, and manual publication confirmation.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
              <Zap size={20} color="#4f46e5" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              Atomic Credit Wallet Engine
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.6' }}>
              Two-phase commit reservation and consumption. Never trust client balances. Append-only ledger tracks every signup grant, purchase, and consumption.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
              <Cpu size={20} color="#059669" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              BullMQ & Redis Background Workers
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.6' }}>
              Decoupled worker daemons poll and process scheduled publishing jobs independently from Vercel serverless timeouts with exponential backoff & jitter.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
              <Lock size={20} color="#db2777" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              AES-256-GCM Vault & Isolation
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.6' }}>
              Social tokens encrypted at rest with authenticated ciphers. All queries strictly scoped by workspaceId. HMAC-SHA256 Razorpay webhook verification.
            </p>
          </div>

        </div>
      </section>

      {/* Credit Pricing Packages */}
      <section id="pricing" style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
            Transparent, Usage-Based Credit Pricing
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.94rem', marginTop: '6px' }}>
            Pay only for what you generate. 1 credit = 1 platform-tuned content variant. Scheduling is 100% free.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className="glass-panel"
              style={{
                padding: '36px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: pkg.popular ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                boxShadow: pkg.popular ? '0 12px 30px -5px rgba(79, 70, 229, 0.15)' : 'none'
              }}
            >
              {pkg.badge && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '24px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #ec4899 100%)',
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '12px'
                }}>
                  {pkg.badge}
                </div>
              )}

              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a' }}>{pkg.name}</h3>
              <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '6px' }}>{pkg.description}</p>

              <div style={{ margin: '24px 0' }}>
                <span style={{ fontSize: '2.6rem', fontWeight: 800, color: '#0f172a' }}>₹{pkg.priceInr}</span>
                <span style={{ fontSize: '0.9rem', color: '#4f46e5', marginLeft: '8px', fontWeight: 600 }}>
                  +{pkg.credits} Credits
                </span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.86rem', color: '#334155' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="#059669" /> {pkg.credits} AI Content Variants
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="#059669" /> Unlimited Free Post Scheduling
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="#059669" /> Bluesky, X & Quora Workflows
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} color="#059669" /> Never Expiring Credit Balance
                </li>
              </ul>

              <Link
                href="/login"
                className={`btn ${pkg.popular ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  width: '100%',
                  padding: '12px',
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                Get Started with {pkg.name}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        fontSize: '0.82rem',
        color: '#64748b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <PostPilotLogo size={28} subtitle="" href="/landing" />
          <span style={{ color: '#cbd5e1' }}>•</span>
          <div>© 2026 PostPilot SaaS Inc. All rights reserved.</div>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <a href="#" style={{ color: '#64748b', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="#" style={{ color: '#64748b', textDecoration: 'none' }}>Terms of Service</a>
          <a href="#" style={{ color: '#64748b', textDecoration: 'none' }}>API Documentation</a>
        </div>
      </footer>

    </div>
  );
}

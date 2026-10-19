'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Zap, UserCheck, Eye, Edit3, Shield } from 'lucide-react';
import PostPilotLogo from '@/components/PostPilotLogo';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/';
  const errorParam = searchParams.get('error');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (errorParam) {
      if (errorParam === 'google_not_configured') {
        setError('Google OAuth is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables.');
      } else if (errorParam === 'invalid_state') {
        setError('Login session expired or security verification failed. Please try signing in again.');
      } else if (errorParam === 'email_not_verified') {
        setError('Your Google account does not have a verified email. Please verify with Google and try again.');
      } else if (errorParam === 'token_exchange_failed') {
        setError('Google authentication failed. Check that your redirect URI in Google Cloud Console matches /api/auth/google/callback.');
      } else {
        setError(`Google sign-in error: ${errorParam}`);
      }
    }
  }, [errorParam]);

  const handleGoogleLogin = () => {
    setLoading(true);
    setError(null);
    window.location.href = '/api/auth/google';
  };

  const handleDevLogin = async (targetEmail: string) => {
    setLoading(true);
    setError(null);

    const userName = targetEmail.split('@')[0].replace(/[._]/g, ' ');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          name: userName.charAt(0).toUpperCase() + userName.slice(1),
          authProvider: 'local',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to authenticate');
      }

      // If user was newly created and no redirect specified, trigger onboarding wizard
      if (data.isNewUser && redirectTarget === '/') {
        router.push('/?onboarding=true');
      } else {
        router.push(redirectTarget);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const demoRoles = [
    {
      role: 'owner',
      title: 'Owner',
      email: 'alex@postpilot.io',
      badge: 'Full Access',
      badgeColor: '#b45309',
      badgeBg: '#fef3c7',
      desc: 'Billing, settings, generation, publishing, social',
      icon: ShieldCheck,
    },
    {
      role: 'admin',
      title: 'Admin',
      email: 'admin@postpilot.io',
      badge: 'Operations',
      badgeColor: '#6d28d9',
      badgeBg: '#ede9fe',
      desc: 'All operations, social accounts & billing',
      icon: Shield,
    },
    {
      role: 'editor',
      title: 'Editor',
      email: 'editor@postpilot.io',
      badge: 'Content & Auto',
      badgeColor: '#0369a1',
      badgeBg: '#e0f2fe',
      desc: 'AI generation, drafts, queue (No billing/social)',
      icon: Edit3,
    },
    {
      role: 'viewer',
      title: 'Viewer',
      email: 'viewer@postpilot.io',
      badge: 'Read-Only',
      badgeColor: '#475569',
      badgeBg: '#f1f5f9',
      desc: 'Read-only access (403 on all mutations)',
      icon: Eye,
    },
  ];

  return (
    <div className="glass-panel" style={{
      maxWidth: '480px',
      width: '100%',
      padding: 'clamp(24px, 5vw, 36px) clamp(16px, 4vw, 30px)',
      textAlign: 'center',
      position: 'relative',
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1), 0 0 1px 1px rgba(0, 0, 0, 0.04)'
    }}>
      {/* Brand Logo */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
        <PostPilotLogo size={56} showText={false} variant="vector" />
      </div>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', marginBottom: '6px' }}>
        Welcome to PostPilot
      </h1>
      <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '24px' }}>
        Autonomous AI social media automation engine. Authenticate to access your workspace.
      </p>

      {error && (
        <div style={{
          padding: '12px',
          borderRadius: 'var(--radius-md)',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          fontSize: '0.84rem',
          fontWeight: 600,
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Google One-Click CTA */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="btn"
        style={{
          width: '100%',
          padding: '12px 20px',
          background: '#ffffff',
          color: '#0f172a',
          border: '1px solid #cbd5e1',
          borderRadius: 'var(--radius-md)',
          fontWeight: 700,
          fontSize: '0.94rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"/>
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"/>
        </svg>
        {loading ? 'Authenticating with Google...' : 'Continue with Google'}
      </button>

      {/* Free credits bonus notice */}
      <div style={{
        marginTop: '22px',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        background: '#f5f3ff',
        border: '1px solid #ddd6fe',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        textAlign: 'left'
      }}>
        <Zap size={20} color="#d97706" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.78rem', color: '#4338ca', lineHeight: 1.4 }}>
          <strong style={{ color: '#1e1b4b' }}>50 Free Credits on First Registration</strong> — Automatically provisioned to your workspace for autonomous publishing.
        </div>
      </div>

      {/* Enterprise Security Pill */}
      <div style={{
        marginTop: '12px',
        padding: '8px 12px',
        borderRadius: '6px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '0.74rem',
        color: '#64748b'
      }}>
        <ShieldCheck size={14} color="#059669" />
        <span>Enterprise Workspace Isolation • AES-256 Encryption</span>
      </div>

      {/* Developer Testing Sandbox Drawer (Discrete & Collapsed by Default) */}
      <details style={{
        marginTop: '20px',
        borderTop: '1px solid #f1f5f9',
        paddingTop: '12px',
        textAlign: 'left'
      }}>
        <summary style={{
          fontSize: '0.72rem',
          color: '#94a3b8',
          cursor: 'pointer',
          userSelect: 'none',
          fontWeight: 600,
          outline: 'none'
        }}>
          Developer Testing Sandbox (Quick Switch) ▾
        </summary>
        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '8px' }}>
          {demoRoles.map((r) => {
            const IconComponent = r.icon;
            return (
              <button
                key={r.role}
                type="button"
                onClick={() => handleDevLogin(r.email)}
                disabled={loading}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 11px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IconComponent size={14} color={r.badgeColor} />
                    <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>{r.title}</span>
                  </div>
                  <span style={{
                    fontSize: '0.62rem',
                    color: r.badgeColor,
                    background: r.badgeBg,
                    padding: '2px 5px',
                    borderRadius: '4px',
                    fontWeight: 800,
                  }}>
                    {r.badge}
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.25 }}>
                  {r.desc}
                </div>
              </button>
            );
          })}
        </div>
      </details>

      <div style={{ marginTop: '20px', fontSize: '0.72rem', color: '#94a3b8' }}>
        By signing in, you agree to our{' '}
        <a href="#" style={{ color: '#4f46e5', textDecoration: 'underline' }}>Terms of Service</a>{' '}
        and{' '}
        <a href="#" style={{ color: '#4f46e5', textDecoration: 'underline' }}>Privacy Policy</a>.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative'
    }}>
      <Suspense fallback={<div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading PostPilot...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

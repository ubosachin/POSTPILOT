'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import PostPilotLogo from '@/components/PostPilotLogo';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[PostPilot Runtime Error Boundary]:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--bg-page)',
    }}>
      <div className="glass-panel" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '36px 30px',
        textAlign: 'center',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <PostPilotLogo size={52} showText={false} variant="vector" />
        </div>

        <div style={{
          display: 'inline-flex',
          padding: '10px',
          borderRadius: '50%',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          marginBottom: '16px',
        }}>
          <AlertTriangle size={32} color="#dc2626" />
        </div>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Something went wrong
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '24px', lineHeight: 1.5 }}>
          An unexpected error occurred while processing this request. Our telemetry has logged the event.
        </p>

        {error.digest && (
          <div style={{
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: '#94a3b8',
            background: '#f8fafc',
            padding: '6px 12px',
            borderRadius: '6px',
            marginBottom: '20px',
            display: 'inline-block',
          }}>
            Incident ID: {error.digest}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            className="btn btn-primary"
            style={{
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 700,
              fontSize: '0.88rem',
            }}
          >
            <RefreshCw size={16} />
            Try Again
          </button>

          <Link
            href="/"
            className="btn btn-secondary"
            style={{
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              fontSize: '0.88rem',
            }}
          >
            <Home size={16} />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

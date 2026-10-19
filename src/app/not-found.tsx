import React from 'react';
import Link from 'next/link';
import { Home, Compass } from 'lucide-react';
import PostPilotLogo from '@/components/PostPilotLogo';

export default function NotFound() {
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
        maxWidth: '460px',
        width: '100%',
        padding: '36px 30px',
        textAlign: 'center',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <PostPilotLogo size={52} showText={false} variant="vector" />
        </div>

        <div style={{
          display: 'inline-flex',
          padding: '10px',
          borderRadius: '50%',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          marginBottom: '16px',
        }}>
          <Compass size={32} color="#0284c7" />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Page Not Found (404)
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '24px', lineHeight: 1.5 }}>
          The page or resource you are looking for doesn’t exist or has been relocated within your workspace.
        </p>

        <Link
          href="/"
          className="btn btn-primary"
          style={{
            padding: '10px 20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 700,
            fontSize: '0.88rem',
            margin: '0 auto',
          }}
        >
          <Home size={16} />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

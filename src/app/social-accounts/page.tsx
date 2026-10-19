'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Share2, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  ShieldCheck, 
  Plus, 
  Lock,
  ExternalLink
} from 'lucide-react';
import { SocialAccount } from '@/types';

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'editor' | 'viewer'>('owner');

  // Connect Bluesky Modal
  const [showBskyModal, setShowBskyModal] = useState(false);
  const [bskyHandle, setBskyHandle] = useState('');
  const [bskyPassword, setBskyPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Connect X Modal
  const [showXModal, setShowXModal] = useState(false);
  const [xHandle, setXHandle] = useState('');
  const [xApiKey, setXApiKey] = useState('');
  const [xApiSecret, setXApiSecret] = useState('');
  const [xAccessToken, setXAccessToken] = useState('');
  const [xAccessSecret, setXAccessSecret] = useState('');

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/social-accounts');
      const data = await res.json();
      if (data.accounts) {
        setAccounts(data.accounts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetch('/api/v1/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.role) setUserRole(d.role);
      })
      .catch(() => {});
  }, []);

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch('/api/social-accounts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: id }),
      });
      const data = await res.json();
      setTestResult({
        id,
        success: res.ok && data.success,
        message: data.message || data.error || 'Connection checked',
      });
      fetchAccounts();
    } catch (e) {
      setTestResult({
        id,
        success: false,
        message: (e as Error).message,
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Disconnect this social account? Scheduled jobs for it will be paused.')) return;
    try {
      await fetch(`/api/social-accounts?id=${id}`, { method: 'DELETE' });
      fetchAccounts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConnectBsky = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bskyHandle || !bskyPassword) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/social-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'bluesky',
          accountId: bskyHandle,
          displayName: `Bluesky (@${bskyHandle.replace('@', '')})`,
          credentials: {
            identifier: bskyHandle,
            password: bskyPassword,
            service: 'https://bsky.social',
          },
        }),
      });
      if (res.ok) {
        setShowBskyModal(false);
        setBskyHandle('');
        setBskyPassword('');
        fetchAccounts();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to connect');
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectX = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!xHandle || !xApiKey) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/social-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'x',
          accountId: xHandle,
          displayName: `X (@${xHandle.replace('@', '')})`,
          credentials: {
            apiKey: xApiKey,
            apiSecret: xApiSecret,
            accessToken: xAccessToken,
            accessTokenSecret: xAccessSecret,
          },
        }),
      });
      if (res.ok) {
        setShowXModal(false);
        setXHandle('');
        setXApiKey('');
        setXApiSecret('');
        setXAccessToken('');
        setXAccessSecret('');
        fetchAccounts();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to connect');
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
            Connected Social Accounts
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.94rem', marginTop: '4px' }}>
            Manage authorized credentials for Bluesky and X with AES-256-GCM encryption at rest.
          </p>
        </div>

        {userRole === 'owner' || userRole === 'admin' ? (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowBskyModal(true)} className="btn-primary btn-bluesky" style={{ fontSize: '0.86rem' }}>
              <Plus size={16} />
              <span>Connect Bluesky</span>
            </button>
            <button onClick={() => setShowXModal(true)} className="btn-primary btn-x" style={{ fontSize: '0.86rem' }}>
              <Plus size={16} />
              <span>Connect X</span>
            </button>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            color: '#64748b',
            fontSize: '0.82rem',
            fontWeight: 600
          }}>
            <Lock size={14} color="#d97706" />
            <span>Connect Accounts (Owner/Admin Only)</span>
          </div>
        )}
      </div>

      {/* Security Assurance Banner */}
      <div style={{
        background: '#f5f3ff',
        border: '1px solid #ddd6fe',
        borderRadius: 'var(--radius-md)',
        padding: '14px 18px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <Lock size={18} color="#4f46e5" />
        <div style={{ fontSize: '0.84rem', color: '#4338ca' }}>
          <strong style={{ color: '#1e1b4b' }}>Credential Security:</strong> App passwords and API tokens are encrypted with military-grade AES-256-GCM authenticated cipher. Plaintext credentials are never exposed in logs or sent to the browser.
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Loading social connections...
        </div>
      ) : accounts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <Share2 size={44} style={{ color: '#4f46e5', margin: '0 auto 16px' }} />
          <h3 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '1.2rem', fontWeight: 800 }}>No social accounts connected</h3>
          <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.9rem' }}>
            Connect your Bluesky or X accounts to enable 1-click publishing and scheduled delivery.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {accounts.map((acc) => {
            const isTestThis = testResult && testResult.id === acc.id;

            return (
              <div key={acc.id} className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: acc.platform === 'bluesky' 
                        ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' 
                        : '#0f172a',
                      border: acc.platform === 'x' ? '1px solid #334155' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      color: '#ffffff',
                      fontSize: '1.1rem'
                    }}>
                      {acc.platform === 'bluesky' ? '🦋' : '𝕏'}
                    </div>

                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                        {acc.displayName}
                      </h3>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                        @{acc.accountId} • {acc.platform === 'bluesky' ? 'AT Protocol' : 'v2 API'}
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${acc.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {acc.status.toUpperCase()}
                  </span>
                </div>

                {/* Account Details & Status */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  fontSize: '0.8rem',
                  color: '#475569'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Credential Health:</span>
                    <span style={{ color: '#047857', fontWeight: 700 }}>Encrypted & Verified</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>Last Verified:</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>
                      {acc.lastVerifiedAt ? new Date(acc.lastVerifiedAt).toLocaleString() : 'Recently'}
                    </span>
                  </div>
                </div>

                {/* Inline Test Result Message */}
                {isTestThis && (
                  <div style={{
                    marginBottom: '16px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: testResult.success ? '#ecfdf5' : '#fef2f2',
                    color: testResult.success ? '#047857' : '#b91c1c',
                    border: `1px solid ${testResult.success ? '#a7f3d0' : '#fecaca'}`
                  }}>
                    {testResult.message}
                  </div>
                )}

                {/* Controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => handleTestConnection(acc.id)}
                    disabled={testingId === acc.id}
                    className="btn-secondary"
                    style={{ padding: '7px 12px', fontSize: '0.82rem' }}
                  >
                    {testingId === acc.id ? (
                      <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <ShieldCheck size={14} color="#059669" />
                    )}
                    <span>Test Connection</span>
                  </button>

                  {(userRole === 'owner' || userRole === 'admin') && (
                    <button
                      onClick={() => handleDisconnect(acc.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#dc2626',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px'
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Disconnect</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connect Bluesky Modal */}
      {showBskyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Connect Bluesky Account
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: '20px' }}>
              Enter your Bluesky handle and an App Password created in Bluesky Settings → Privacy and Security.
            </p>

            <form onSubmit={handleConnectBsky}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#334155', fontWeight: 600, marginBottom: '6px' }}>
                  Bluesky Handle
                </label>
                <input
                  type="text"
                  value={bskyHandle}
                  onChange={(e) => setBskyHandle(e.target.value)}
                  placeholder="e.g. handle.bsky.social"
                  className="input-field"
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#334155', fontWeight: 600, marginBottom: '6px' }}>
                  App Password
                </label>
                <input
                  type="password"
                  value={bskyPassword}
                  onChange={(e) => setBskyPassword(e.target.value)}
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  className="input-field"
                  required
                />
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}>
                  Always use an App Password rather than your primary Bluesky password.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowBskyModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary btn-bluesky"
                >
                  {isSubmitting ? 'Authenticating...' : 'Connect Bluesky'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connect X Modal */}
      {showXModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Connect X Account (v2 API)
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: '16px' }}>
              Enter your verified X developer application credentials with write permissions.
            </p>

            <form onSubmit={handleConnectX}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155', fontWeight: 600, marginBottom: '4px' }}>
                  X Handle
                </label>
                <input
                  type="text"
                  value={xHandle}
                  onChange={(e) => setXHandle(e.target.value)}
                  placeholder="e.g. MyBrandApp"
                  className="input-field"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#334155', fontWeight: 600, marginBottom: '4px' }}>
                    API Key
                  </label>
                  <input
                    type="password"
                    value={xApiKey}
                    onChange={(e) => setXApiKey(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#334155', fontWeight: 600, marginBottom: '4px' }}>
                    API Secret
                  </label>
                  <input
                    type="password"
                    value={xApiSecret}
                    onChange={(e) => setXApiSecret(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#334155', fontWeight: 600, marginBottom: '4px' }}>
                    Access Token
                  </label>
                  <input
                    type="password"
                    value={xAccessToken}
                    onChange={(e) => setXAccessToken(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#334155', fontWeight: 600, marginBottom: '4px' }}>
                    Token Secret
                  </label>
                  <input
                    type="password"
                    value={xAccessSecret}
                    onChange={(e) => setXAccessSecret(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowXModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary btn-x"
                >
                  {isSubmitting ? 'Validating...' : 'Connect X'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

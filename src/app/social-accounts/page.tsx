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
  Edit3,
  X,
  AlertCircle,
  Key,
  CheckCircle,
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
  const [showXAdvanced, setShowXAdvanced] = useState(false);

  // Edit Account Modal State
  const [editingAccount, setEditingAccount] = useState<SocialAccount | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editBskyPassword, setEditBskyPassword] = useState('');
  const [editBskyService, setEditBskyService] = useState('https://bsky.social');
  const [editXApiKey, setEditXApiKey] = useState('');
  const [editXApiSecret, setEditXApiSecret] = useState('');
  const [editXAccessToken, setEditXAccessToken] = useState('');
  const [editXAccessSecret, setEditXAccessSecret] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deletingAccount, setDeletingAccount] = useState<SocialAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

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

    // Check for OAuth callback status in URL query parameters
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const handle = urlParams.get('handle');
      const error = urlParams.get('error');

      if (success === 'x_connected') {
        showToast(`Connected X account (@${handle || ''}) successfully via official OAuth 2.0!`, 'success');
        window.history.replaceState({}, '', '/social-accounts');
        fetchAccounts();
      } else if (error) {
        let msg = `OAuth connection notice: ${error}`;
        if (error === 'x_oauth_not_configured' || error === 'x_not_configured') {
          msg = 'Twitter OAuth 2.0 Client ID is not configured in server environment yet. Set X_CLIENT_ID & X_CLIENT_SECRET or use manual developer keys.';
        } else if (error === 'invalid_state') {
          msg = 'Security token expired. Please try connecting X again.';
        }
        showToast(msg, 'error');
        window.history.replaceState({}, '', '/social-accounts');
      }
    }
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

  const openEditModal = (acc: SocialAccount) => {
    setEditingAccount(acc);
    setEditDisplayName(acc.displayName || '');
    setEditAccountId(acc.accountId || '');
    setEditBskyPassword('');
    setEditBskyService('https://bsky.social');
    setEditXApiKey('');
    setEditXApiSecret('');
    setEditXAccessToken('');
    setEditXAccessSecret('');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setIsEditing(true);
    setEditError(null);

    try {
      const credentials: Record<string, string> = {};
      if (editingAccount.platform === 'bluesky') {
        if (editBskyPassword) {
          credentials.password = editBskyPassword;
          credentials.service = editBskyService || 'https://bsky.social';
          credentials.identifier = editAccountId.replace(/^@/, '');
        }
      } else if (editingAccount.platform === 'x') {
        if (editXApiKey) credentials.apiKey = editXApiKey;
        if (editXApiSecret) credentials.apiSecret = editXApiSecret;
        if (editXAccessToken) credentials.accessToken = editXAccessToken;
        if (editXAccessSecret) credentials.accessTokenSecret = editXAccessSecret;
      }

      const res = await fetch('/api/social-accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAccount.id,
          displayName: editDisplayName,
          accountId: editAccountId,
          credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEditingAccount(null);
        showToast('Social account updated successfully!');
        fetchAccounts();
      } else {
        setEditError(data.error || 'Failed to update account');
      }
    } catch (err) {
      setEditError((err as Error).message);
    } finally {
      setIsEditing(false);
    }
  };

  const confirmDeleteAccount = async () => {
    if (!deletingAccount) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/social-accounts?id=${deletingAccount.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Disconnected @${deletingAccount.accountId}`);
        setAccounts((prev) => prev.filter((a) => a.id !== deletingAccount.id));
        setDeletingAccount(null);
        if (editingAccount?.id === deletingAccount.id) {
          setEditingAccount(null);
        }
      } else {
        showToast(data.error || 'Failed to disconnect account', 'error');
      }
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setIsDeleting(false);
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
        showToast('Connected Bluesky account successfully!');
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
    if (!xHandle.trim()) return;
    setIsSubmitting(true);
    try {
      const credentials: Record<string, string> = {};
      if (xApiKey.trim()) credentials.apiKey = xApiKey.trim();
      if (xApiSecret.trim()) credentials.apiSecret = xApiSecret.trim();
      if (xAccessToken.trim()) credentials.accessToken = xAccessToken.trim();
      if (xAccessSecret.trim()) credentials.accessTokenSecret = xAccessSecret.trim();

      const cleanHandle = xHandle.trim().replace(/^@/, '');

      const res = await fetch('/api/social-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'x',
          accountId: cleanHandle,
          displayName: `X (@${cleanHandle})`,
          credentials,
        }),
      });
      if (res.ok) {
        setShowXModal(false);
        setXHandle('');
        setXApiKey('');
        setXApiSecret('');
        setXAccessToken('');
        setXAccessSecret('');
        setShowXAdvanced(false);
        showToast('Connected X account successfully!');
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
      <div className="page-header-row" style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
            Connected Social Accounts
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.94rem', marginTop: '4px' }}>
            Manage authorized credentials for Bluesky and X with AES-256-GCM encryption at rest. Edit details or disconnect anytime.
          </p>
        </div>

        {userRole === 'owner' || userRole === 'admin' ? (
          <div className="page-header-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
            <span>Manage Accounts (Owner/Admin Only)</span>
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
          <strong style={{ color: '#1e1b4b' }}>Credential Security:</strong> App passwords and API tokens are encrypted with AES-256-GCM authenticated cipher. You can edit handle labels or update credentials without deleting the account.
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '20px' }}>
          {accounts.map((acc) => {
            const isTestThis = testResult && testResult.id === acc.id;

            return (
              <div key={acc.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
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
                </div>

                {/* Controls Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => handleTestConnection(acc.id)}
                    disabled={testingId === acc.id}
                    className="btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  >
                    {testingId === acc.id ? (
                      <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <ShieldCheck size={13} color="#059669" />
                    )}
                    <span>Test</span>
                  </button>

                  {(userRole === 'owner' || userRole === 'admin') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => openEditModal(acc)}
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit3 size={13} color="#4f46e5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => setDeletingAccount(acc)}
                        style={{
                          background: '#fff1f2',
                          border: '1px solid #fecdd3',
                          color: '#e11d48',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)'
                        }}
                        title="Disconnect / Delete this account"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
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
          zIndex: 210,
          padding: '20px'
        }}>
          <div className="glass-panel modal-dialog-content" style={{
            width: '100%',
            maxWidth: '520px',
            padding: 'clamp(18px, 4vw, 28px)',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: editingAccount.platform === 'bluesky' 
                    ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' 
                    : '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1rem'
                }}>
                  {editingAccount.platform === 'bluesky' ? '🦋' : '𝕏'}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Edit {editingAccount.platform === 'bluesky' ? 'Bluesky' : 'X'} Account
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    ID: {editingAccount.id}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>

            {editError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} color="#dc2626" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#334155', fontWeight: 700, marginBottom: '5px' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="e.g. Official Tech Handle"
                  className="input-field"
                  required
                />
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                  Friendly label displayed across AI Studio, Scheduler, and Post cards.
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#334155', fontWeight: 700, marginBottom: '5px' }}>
                  Account Handle / Username
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 700 }}>@</span>
                  <input
                    type="text"
                    value={editAccountId}
                    onChange={(e) => setEditAccountId(e.target.value)}
                    placeholder="username"
                    className="input-field"
                    style={{ paddingLeft: '28px' }}
                    required
                  />
                </div>
              </div>

              {/* Credentials Update Section */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <Lock size={14} color="#4f46e5" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                    Update Sensitive Credentials
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: 'auto' }}>
                    Optional
                  </span>
                </div>

                {editingAccount.platform === 'bluesky' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginBottom: '4px' }}>
                        New App Password
                      </label>
                      <input
                        type="password"
                        value={editBskyPassword}
                        onChange={(e) => setEditBskyPassword(e.target.value)}
                        placeholder="Leave blank to keep existing password"
                        className="input-field"
                        style={{ fontSize: '0.82rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginBottom: '4px' }}>
                        AT Protocol Service URL
                      </label>
                      <input
                        type="text"
                        value={editBskyService}
                        onChange={(e) => setEditBskyService(e.target.value)}
                        placeholder="https://bsky.social"
                        className="input-field"
                        style={{ fontSize: '0.82rem' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', fontWeight: 600, marginBottom: '4px' }}>
                          API Key
                        </label>
                        <input
                          type="password"
                          value={editXApiKey}
                          onChange={(e) => setEditXApiKey(e.target.value)}
                          placeholder="Leave blank to keep"
                          className="input-field"
                          style={{ fontSize: '0.8rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', fontWeight: 600, marginBottom: '4px' }}>
                          API Secret
                        </label>
                        <input
                          type="password"
                          value={editXApiSecret}
                          onChange={(e) => setEditXApiSecret(e.target.value)}
                          placeholder="Leave blank to keep"
                          className="input-field"
                          style={{ fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', fontWeight: 600, marginBottom: '4px' }}>
                          Access Token
                        </label>
                        <input
                          type="password"
                          value={editXAccessToken}
                          onChange={(e) => setEditXAccessToken(e.target.value)}
                          placeholder="Leave blank to keep"
                          className="input-field"
                          style={{ fontSize: '0.8rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', fontWeight: 600, marginBottom: '4px' }}>
                          Token Secret
                        </label>
                        <input
                          type="password"
                          value={editXAccessSecret}
                          onChange={(e) => setEditXAccessSecret(e.target.value)}
                          placeholder="Leave blank to keep"
                          className="input-field"
                          style={{ fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setDeletingAccount(editingAccount);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#dc2626',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 8px'
                  }}
                >
                  <Trash2 size={14} />
                  <span>Delete Account</span>
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingAccount(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEditing}
                    className="btn-primary"
                    style={{ minWidth: '120px' }}
                  >
                    {isEditing ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAccount && (
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
          zIndex: 220,
          padding: '20px'
        }}>
          <div className="glass-panel modal-dialog-content" style={{
            width: '100%',
            maxWidth: '430px',
            padding: 'clamp(18px, 4vw, 26px)',
            background: '#ffffff',
            border: '1px solid #fee2e2',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 40px -15px rgba(220, 38, 38, 0.15)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626'
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Disconnect Account?
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  @{deletingAccount.accountId} ({deletingAccount.platform.toUpperCase()})
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: '20px', lineHeight: '1.5' }}>
              Are you sure you want to disconnect this account? Any scheduled posts targeted to <strong>@{deletingAccount.accountId}</strong> will be paused until an account is reconnected.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeletingAccount(null)}
                disabled={isDeleting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAccount}
                disabled={isDeleting}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Disconnecting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Disconnect Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
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
          <div className="glass-panel modal-dialog-content" style={{ width: '100%', maxWidth: '440px', padding: 'clamp(18px, 4vw, 24px)', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
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
          <div className="glass-panel modal-dialog-content" style={{ width: '100%', maxWidth: '480px', padding: 'clamp(18px, 4vw, 24px)', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 800, fontSize: '1rem' }}>
                  𝕏
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Connect X (Twitter)
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Publish & schedule posts to your feed
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowXModal(false); setShowXAdvanced(false); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* 1-Click Official OAuth 2.0 Authorization */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '18px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                Recommended: 1-Click Official Authorization
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '14px', lineHeight: 1.45 }}>
                Authorizes PostPilot securely on Twitter / X to publish tweets directly to your personal account. Zero technical keys required.
              </p>

              <a
                href="/api/auth/x"
                className="btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#000000',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <span style={{ fontSize: '1rem', fontWeight: 900 }}>𝕏</span>
                <span>Authorize with X (Twitter)</span>
                <ExternalLink size={14} style={{ opacity: 0.7 }} />
              </a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 16px' }}>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                Or connect manually with handle
              </span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>

            <form onSubmit={handleConnectX}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#334155', fontWeight: 600, marginBottom: '6px' }}>
                  X Handle <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 600, fontSize: '0.9rem' }}>
                    @
                  </span>
                  <input
                    type="text"
                    value={xHandle.replace(/^@/, '')}
                    onChange={(e) => setXHandle(e.target.value.replace(/^@/, ''))}
                    placeholder="e.g. MyBrandApp or your_handle"
                    className="input-field"
                    style={{ paddingLeft: '28px' }}
                    required
                    autoFocus
                  />
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                  Posts generated by PostPilot AI will be scheduled for this account.
                </div>
              </div>

              {/* Collapsible Advanced Developer Keys Toggle */}
              <div style={{ marginBottom: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowXAdvanced(!showXAdvanced)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6366f1',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 0',
                    marginBottom: showXAdvanced ? '12px' : '0'
                  }}
                >
                  <Key size={13} />
                  <span>{showXAdvanced ? 'Hide Custom Developer Keys' : 'Advanced: Custom Developer Keys (Optional)'}</span>
                </button>

                {showXAdvanced && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px'
                  }}>
                    <p style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: '10px' }}>
                      Only fill these in if you want to use your own Twitter Developer Portal application credentials instead of PostPilot&apos;s verified gateway.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', color: '#475569', fontWeight: 600, marginBottom: '2px' }}>
                          API Key
                        </label>
                        <input
                          type="password"
                          value={xApiKey}
                          onChange={(e) => setXApiKey(e.target.value)}
                          placeholder="Optional"
                          className="input-field"
                          style={{ fontSize: '0.78rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', color: '#475569', fontWeight: 600, marginBottom: '2px' }}>
                          API Secret
                        </label>
                        <input
                          type="password"
                          value={xApiSecret}
                          onChange={(e) => setXApiSecret(e.target.value)}
                          placeholder="Optional"
                          className="input-field"
                          style={{ fontSize: '0.78rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', color: '#475569', fontWeight: 600, marginBottom: '2px' }}>
                          Access Token
                        </label>
                        <input
                          type="password"
                          value={xAccessToken}
                          onChange={(e) => setXAccessToken(e.target.value)}
                          placeholder="Optional"
                          className="input-field"
                          style={{ fontSize: '0.78rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', color: '#475569', fontWeight: 600, marginBottom: '2px' }}>
                          Token Secret
                        </label>
                        <input
                          type="password"
                          value={xAccessSecret}
                          onChange={(e) => setXAccessSecret(e.target.value)}
                          placeholder="Optional"
                          className="input-field"
                          style={{ fontSize: '0.78rem' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setShowXModal(false); setShowXAdvanced(false); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !xHandle.trim()}
                  className="btn-primary btn-x"
                >
                  {isSubmitting ? 'Connecting...' : 'Connect X Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Message */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: toastMessage.type === 'success' ? '#065f46' : '#991b1b',
          color: '#ffffff',
          padding: '12px 18px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
          fontSize: '0.88rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </DashboardLayout>
  );
}

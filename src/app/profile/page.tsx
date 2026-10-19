'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  User as UserIcon, 
  Mail, 
  ShieldCheck, 
  Briefcase, 
  CreditCard, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  Camera, 
  Lock, 
  Shield, 
  Check, 
  RefreshCw,
  Zap,
  Layers,
  Clock,
  Calendar,
  LogOut
} from 'lucide-react';
import { User, Workspace, UserRole } from '@/types';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [role, setRole] = useState<UserRole>('owner');
  const [wallet, setWallet] = useState<{ balance: number; planId: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit fields
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Copy states
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [copiedWsId, setCopiedWsId] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/v1/me');
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setName(data.user.name || '');
        setAvatar(data.user.avatar || '');
        setWorkspace(data.workspace);
        setRole(data.role || 'owner');
        setWallet(data.wallet || null);
      } else {
        setErrorMessage(data.error || 'Failed to load profile');
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Name cannot be empty.');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          avatar: avatar.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setErrorMessage(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, type: 'user' | 'ws') => {
    navigator.clipboard.writeText(text);
    if (type === 'user') {
      setCopiedUserId(true);
      setTimeout(() => setCopiedUserId(false), 2000);
    } else {
      setCopiedWsId(true);
      setTimeout(() => setCopiedWsId(false), 2000);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  const getRoleBadgeStyle = (r: UserRole) => {
    switch (r) {
      case 'owner':
        return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
      case 'admin':
        return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
      case 'editor':
        return { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' };
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  const roleStyle = getRoleBadgeStyle(role);

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
        
        {/* Header Breadcrumbs & Actions */}
        <div className="page-header-row" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
              Account & Profile
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              Manage your personal identity, active workspace role, and security preferences.
            </p>
          </div>

          <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={fetchProfile}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              title="Refresh profile data"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <Link
              href="/billing"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
              }}
            >
              <CreditCard size={15} />
              <span>Manage Billing</span>
            </Link>
          </div>
        </div>

        {/* Status Alerts */}
        {saveSuccess && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#065f46',
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>Profile updated successfully! All workspace sessions synchronized.</span>
          </div>
        )}

        {errorMessage && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#991b1b',
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} color="#dc2626" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Profile Hero Card */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '16px',
          padding: 'clamp(18px, 4vw, 28px)',
          color: '#ffffff',
          marginBottom: '28px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)'
        }}>
          {/* Subtle decorative glow */}
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0) 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Avatar Preview */}
              <div style={{
                position: 'relative',
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.8rem',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
                border: '3px solid rgba(255, 255, 255, 0.2)',
                overflow: 'hidden'
              }}>
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={avatar} 
                    alt={name || 'Avatar'} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  (name || 'User').substring(0, 2).toUpperCase()
                )}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                    {name || 'Loading user...'}
                  </h2>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: roleStyle.bg,
                    color: roleStyle.text,
                    border: `1px solid ${roleStyle.border}`,
                  }}>
                    {role}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#4ade80',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <CheckCircle2 size={12} /> Google Verified
                  </span>
                </div>

                <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.88rem' }}>
                  {user?.email || 'authenticated-user@postpilot.io'}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Briefcase size={13} color="#94a3b8" /> Workspace: <strong style={{ color: '#f8fafc' }}>{workspace?.name || 'Growth Lab'}</strong>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={13} color="#f59e0b" /> Plan: <strong style={{ color: '#f8fafc', textTransform: 'uppercase' }}>{workspace?.planId || 'Starter'}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Credit Stat in Hero */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(8px)',
              padding: '16px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              minWidth: '180px'
            }}>
              <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                Credit Balance
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8' }}>
                {wallet?.balance ?? 100} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>Credits</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>
                Ready for AI Generation
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: Left Column Form, Right Column Context */}
        <div className="grid-2-col-responsive">
          
          {/* SECTION 1: Personal Information Edit Form */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#e0e7ff',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <UserIcon size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Personal Information
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                  Update your public display identity
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontSize: '0.88rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Avatar Image URL
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      fontSize: '0.88rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Camera size={15} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Leave blank to automatically use initials avatar badge.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      fontSize: '0.88rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      color: '#64748b',
                      cursor: 'not-allowed',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Mail size={15} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
                <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={11} /> Managed securely by Google Single Sign-On.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  PostPilot Account ID
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={user?.id || ''}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      color: '#475569',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(user?.id || '', 'user')}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#475569'
                    }}
                    title="Copy Account ID"
                  >
                    {copiedUserId ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                    <span>{copiedUserId ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)',
                    width: '100%'
                  }}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={15} className="spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 2: Organization & Role Permissions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Workspace & Role Card */}
            <div style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#fef3c7',
                    color: '#b45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      Workspace & Role
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                      Your organization membership privileges
                    </p>
                  </div>
                </div>

                <Link
                  href="/settings"
                  style={{
                    fontSize: '0.8rem',
                    color: '#4f46e5',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  Workspace Settings <ExternalLink size={12} />
                </Link>
              </div>

              <div style={{
                background: '#f8fafc',
                borderRadius: '10px',
                padding: '14px 16px',
                border: '1px solid #e2e8f0',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Active Workspace:</span>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{workspace?.name || 'Growth Lab'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Membership Role:</span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: roleStyle.bg,
                    color: roleStyle.text,
                    border: `1px solid ${roleStyle.border}`,
                  }}>
                    {role}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Workspace ID:</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(workspace?.id || '', 'ws')}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      color: '#4f46e5',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0
                    }}
                  >
                    <span>{workspace?.id ? `${workspace.id.substring(0, 14)}...` : 'N/A'}</span>
                    {copiedWsId ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {/* Granted Permissions List */}
              <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  Included Capabilities
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#10b981" />
                    <span>AI Studio Content Generation (Gemini 2.5)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#10b981" />
                    <span>Multi-Channel Auto Publishing (X, Bluesky, Quora)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#10b981" />
                    <span>Automations & Background Cron Dispatch</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {role === 'owner' || role === 'admin' ? (
                      <CheckCircle2 size={15} color="#10b981" />
                    ) : (
                      <Lock size={15} color="#94a3b8" />
                    )}
                    <span>AES-256 Vault Management & Billing Administration</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: Security & Session Status */}
            <div style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#dcfce7',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Security & Session
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                    Cryptographic protection and authentication status
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} color="#059669" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>AES-256 Vault</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#059669', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                    Protected
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={16} color="#4f46e5" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Auth Provider</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#4f46e5', background: '#e0e7ff', padding: '2px 8px', borderRadius: '4px' }}>
                    Google OAuth 2.0
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} color="#64748b" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Session Status</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#059669' }}>
                    Active (HttpOnly JWT)
                  </span>
                </div>

                <div style={{ marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      padding: '9px 16px',
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      borderRadius: '8px',
                      color: '#e11d48',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <LogOut size={16} />
                    <span>Log Out of All Devices</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}

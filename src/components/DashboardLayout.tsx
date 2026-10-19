'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Send, 
  Calendar, 
  HelpCircle, 
  Share2, 
  CreditCard, 
  ShieldCheck, 
  Activity, 
  Layers,
  ChevronDown,
  CheckCircle2,
  Cpu,
  Settings,
  LogOut,
  Zap,
  ArrowRight,
  X,
  Compass,
  Lock,
  ShieldAlert,
  User,
  ExternalLink,
  Plus,
  AlertCircle,
  Check,
  Menu
} from 'lucide-react';
import PostPilotLogo from '@/components/PostPilotLogo';
import { UserRole } from '@/types';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number>(100);
  const [userName, setUserName] = useState('Alex Rivera');
  const [userEmail, setUserEmail] = useState('alex@postpilot.io');
  const [workspaceName, setWorkspaceName] = useState('Growth Lab');
  const [userRole, setUserRole] = useState<UserRole>('owner');
  const [authChecking, setAuthChecking] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);
  
  // Onboarding wizard modal state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [showBskyForm, setShowBskyForm] = useState(false);
  const [showXForm, setShowXForm] = useState(false);
  const [onboardingBskyHandle, setOnboardingBskyHandle] = useState('');
  const [onboardingBskyPassword, setOnboardingBskyPassword] = useState('');
  const [onboardingXHandle, setOnboardingXHandle] = useState('');
  const [onboardingXApiKey, setOnboardingXApiKey] = useState('');
  const [onboardingXApiSecret, setOnboardingXApiSecret] = useState('');
  const [onboardingXAccessToken, setOnboardingXAccessToken] = useState('');
  const [onboardingXAccessSecret, setOnboardingXAccessSecret] = useState('');
  const [connectingSocial, setConnectingSocial] = useState(false);
  const [socialConnectError, setSocialConnectError] = useState<string | null>(null);
  const [socialConnectSuccess, setSocialConnectSuccess] = useState<string | null>(null);

  const fetchSocialAccounts = async () => {
    try {
      const res = await fetch('/api/social-accounts');
      const data = await res.json();
      if (data.accounts) {
        setSocialAccounts(data.accounts);
      }
    } catch {
      // ignore
    }
  };

  const handleConnectBsky = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingBskyHandle || !onboardingBskyPassword) return;
    setConnectingSocial(true);
    setSocialConnectError(null);
    setSocialConnectSuccess(null);
    try {
      const res = await fetch('/api/social-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'bluesky',
          accountId: onboardingBskyHandle,
          displayName: `Bluesky (@${onboardingBskyHandle.replace('@', '')})`,
          credentials: {
            identifier: onboardingBskyHandle,
            password: onboardingBskyPassword,
            service: 'https://bsky.social',
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSocialConnectSuccess('Bluesky connected successfully!');
        setShowBskyForm(false);
        setOnboardingBskyHandle('');
        setOnboardingBskyPassword('');
        fetchSocialAccounts();
        setTimeout(() => setSocialConnectSuccess(null), 3000);
      } else {
        setSocialConnectError(data.error || 'Failed to connect Bluesky');
      }
    } catch (err) {
      setSocialConnectError((err as Error).message);
    } finally {
      setConnectingSocial(false);
    }
  };

  const handleConnectX = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingXHandle) return;
    setConnectingSocial(true);
    setSocialConnectError(null);
    setSocialConnectSuccess(null);
    try {
      const creds: any = {};
      if (onboardingXApiKey) creds.apiKey = onboardingXApiKey;
      if (onboardingXApiSecret) creds.apiSecret = onboardingXApiSecret;
      if (onboardingXAccessToken) creds.accessToken = onboardingXAccessToken;
      if (onboardingXAccessSecret) creds.accessTokenSecret = onboardingXAccessSecret;

      const res = await fetch('/api/social-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'x',
          accountId: onboardingXHandle,
          displayName: `X (@${onboardingXHandle.replace('@', '')})`,
          credentials: creds,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSocialConnectSuccess('X (Twitter) connected successfully!');
        setShowXForm(false);
        setOnboardingXHandle('');
        setOnboardingXApiKey('');
        setOnboardingXApiSecret('');
        setOnboardingXAccessToken('');
        setOnboardingXAccessSecret('');
        fetchSocialAccounts();
        setTimeout(() => setSocialConnectSuccess(null), 3000);
      } else {
        setSocialConnectError(data.error || 'Failed to connect X');
      }
    } catch (err) {
      setSocialConnectError((err as Error).message);
    } finally {
      setConnectingSocial(false);
    }
  };

  // Check query params for onboarding trigger and role errors
  useEffect(() => {
    setMobileMenuOpen(false);
    fetchSocialAccounts();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('onboarding') === 'true') {
        setShowOnboarding(true);
      }
      if (params.get('error') === 'unauthorized_role') {
        setRoleError('Access Denied: The Admin & Audit diagnostics require Owner or Admin permissions.');
        setTimeout(() => setRoleError(null), 6000);
      }
    }
  }, [pathname]);

  // Load user session & credit wallet
  useEffect(() => {
    let isMounted = true;
    async function loadSession() {
      try {
        const [meRes, credRes] = await Promise.all([
          fetch('/api/v1/me'),
          fetch('/api/v1/credits'),
        ]);

        if (meRes.status === 401) {
          router.replace('/login');
          return;
        }

        const meData = await meRes.json();
        const credData = await credRes.json();

        if (meData.success && meData.user) {
          if (!isMounted) return;
          if (meData.user?.name) setUserName(meData.user.name);
          if (meData.user?.email) setUserEmail(meData.user.email);
          if (meData.workspace?.name) setWorkspaceName(meData.workspace.name);
          if (meData.role) setUserRole(meData.role);
          setAuthChecking(false);
        } else {
          router.replace('/login');
          return;
        }

        if (credData.success && credData.wallet && isMounted) {
          setCreditBalance(credData.wallet.balance);
        }
      } catch (err) {
        console.warn('Failed to load live session details:', err);
        router.replace('/login');
      }
    }

    loadSession();
    return () => { isMounted = false; };
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const navItems = [
    { label: 'AI Studio', href: '/', icon: Sparkles, badge: 'Flagship' },
    { label: 'Automations', href: '/automations', icon: Cpu, badge: 'Scheduler' },
    { label: 'Content Posts', href: '/posts', icon: Send },
    { label: 'Queue & Calendar', href: '/calendar', icon: Calendar },
    { label: 'Quora Workspace', href: '/quora', icon: HelpCircle, badge: 'Manual' },
    { label: 'Social Accounts', href: '/social-accounts', icon: Share2 },
    { label: 'Credits & Billing', href: '/billing', icon: CreditCard, badge: userRole === 'viewer' ? 'View Only' : undefined },
    { label: 'My Profile', href: '/profile', icon: User },
    { label: 'Settings', href: '/settings', icon: Settings },
    { 
      label: 'Admin & Audit', 
      href: '/admin', 
      icon: ShieldCheck, 
      badge: userRole === 'owner' || userRole === 'admin' ? undefined : 'Locked',
      restricted: userRole !== 'owner' && userRole !== 'admin'
    },
  ];

  if (authChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: '#0f172a',
      }}>
        <PostPilotLogo size={52} showText={false} variant="vector" />
        <div style={{ fontSize: '0.92rem', color: '#64748b', fontWeight: 600 }}>
          Authenticating workspace session & permissions...
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Mobile Topbar Navigation */}
      <header className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
              cursor: 'pointer'
            }}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <PostPilotLogo size={28} showText={true} href="/" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/billing" style={{ textDecoration: 'none' }}>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#ede9fe',
              color: '#6d28d9',
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #c4b5fd'
            }}>
              <Zap size={12} color="#7c3aed" /> {creditBalance} cr
            </span>
          </Link>

          <Link href="/profile" style={{ textDecoration: 'none' }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.74rem',
              color: '#ffffff'
            }}>
              {userName.substring(0, 2).toUpperCase()}
            </div>
          </Link>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      <div
        className={`sidebar-backdrop ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', padding: '0 4px' }}>
          <PostPilotLogo size={36} href="/" />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
            className="hide-on-desktop"
            aria-label="Close navigation drawer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Live Credit Wallet Pill */}
        <Link href="/billing" style={{ textDecoration: 'none', marginBottom: '16px', display: 'block' }}>
          <div style={{
            background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            border: '1px solid #ddd6fe',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(79, 70, 229, 0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Zap size={16} color="#d97706" />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#6d28d9', fontWeight: 700, letterSpacing: '0.04em' }}>AVAILABLE CREDITS</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e1b4b', lineHeight: 1.2 }}>
                  {creditBalance} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>credits</span>
                </div>
              </div>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#4f46e5', fontWeight: 700, padding: '3px 9px', background: '#ffffff', borderRadius: '6px', border: '1px solid #c7d2fe', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              + Buy
            </span>
          </div>
        </Link>

        {/* Workspace Card / Tenant Selector */}
        <div style={{ position: 'relative', marginBottom: '18px' }}>
          <button
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            style={{
              width: '100%',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#0f172a',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Layers size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>{workspaceName}</div>
                <div style={{ fontSize: '0.72rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                  Tenant Isolated
                </div>
              </div>
            </div>
            <ChevronDown size={14} style={{ color: '#64748b' }} />
          </button>

          {workspaceMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '105%',
              left: 0,
              right: 0,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: '8px',
              zIndex: 100,
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)'
            }}>
              <div style={{ padding: '6px 8px', fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.04em' }}>
                ACTIVE WORKSPACE
              </div>
              <div style={{
                padding: '8px 10px',
                borderRadius: '6px',
                background: '#eff6ff',
                color: '#1e40af',
                fontSize: '0.84rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>{workspaceName}</span>
                <CheckCircle2 size={15} color="#2563eb" />
              </div>
              <Link href="/settings" onClick={() => setWorkspaceMenuOpen(false)} style={{ display: 'block', padding: '8px 10px', fontSize: '0.82rem', color: '#475569', textDecoration: 'none', fontWeight: 500, borderRadius: '6px', marginTop: '4px' }}>
                ⚙️ Workspace Settings
              </Link>
            </div>
          )}
        </div>

        {/* Navigation links */}
        <nav style={{ flex: 1 }}>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.08em', padding: '0 8px 8px' }}>
            PLATFORM
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            if (item.restricted) {
              return (
                <div
                  key={item.href}
                  className="nav-link"
                  style={{ opacity: 0.5, cursor: 'not-allowed', color: '#94a3b8' }}
                  title="Restricted: Requires Owner or Admin permissions"
                >
                  <Icon size={18} style={{ color: '#94a3b8' }} />
                  <span style={{ flex: 1, color: '#94a3b8' }}>{item.label}</span>
                  <span style={{
                    fontSize: '0.62rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    border: '1px solid #fecaca'
                  }}>
                    <Lock size={10} /> Locked
                  </span>
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} style={{ color: isActive ? '#4f46e5' : '#64748b' }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: isActive ? '#e0e7ff' : '#f1f5f9',
                    color: isActive ? '#3730a3' : '#64748b',
                    fontWeight: 700
                  }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Start Guide button */}
        <button
          onClick={() => {
            setOnboardingStep(1);
            setShowOnboarding(true);
          }}
          className="btn"
          style={{
            width: '100%',
            marginBottom: '12px',
            padding: '8px 12px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#4f46e5',
            fontSize: '0.78rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
          }}
        >
          <Compass size={14} /> Quick Onboarding Guide
        </button>

        {/* Worker Status & Engine Pill */}
        <div style={{
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={13} color="#10b981" /> Publishing Engine
            </span>
            <span className="badge badge-success" style={{ fontSize: '0.62rem', padding: '2px 6px' }}>LIVE</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: '1.4' }}>
            BullMQ Queue • In-Process • Multi-Platform
          </div>
        </div>

        {/* User Footer with Logout */}
        <div style={{
          marginTop: '14px',
          paddingTop: '14px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <Link 
            href="/profile"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              minWidth: 0,
              textDecoration: 'none',
              padding: '4px',
              borderRadius: '8px',
              transition: 'background 0.15s ease',
              flex: 1
            }}
            title="View Profile"
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.8rem',
              color: '#ffffff',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
            }}>
              {userName.substring(0, 2).toUpperCase()}
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userName}
                </span>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background: userRole === 'owner' ? '#fef3c7' : userRole === 'admin' ? '#e0f2fe' : userRole === 'editor' ? '#f3e8ff' : '#f1f5f9',
                  color: userRole === 'owner' ? '#b45309' : userRole === 'admin' ? '#0369a1' : userRole === 'editor' ? '#7e22ce' : '#475569',
                  border: `1px solid ${userRole === 'owner' ? '#fde68a' : userRole === 'admin' ? '#bae6fd' : userRole === 'editor' ? '#e9d5ff' : '#cbd5e1'}`,
                }}>
                  {userRole}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userEmail}
              </div>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {roleError && (
          <div style={{
            margin: '16px 24px 0',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '0.86rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <ShieldAlert size={16} color="#dc2626" />
            <span>{roleError}</span>
          </div>
        )}
        {children}
      </main>

      {/* Onboarding Wizard Modal */}
      {showOnboarding && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel modal-dialog-content" style={{
            maxWidth: '540px',
            width: '100%',
            padding: 'clamp(20px, 5vw, 36px)',
            position: 'relative',
            background: '#ffffff',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 0 1px 1px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-lg)',
            maxHeight: '92vh',
            overflowY: 'auto'
          }}>
            <button
              onClick={() => setShowOnboarding(false)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            {/* Stepper Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span className="badge badge-primary">STEP {onboardingStep} OF 3</span>
              <span style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', background: '#fef3c7', padding: '3px 8px', borderRadius: '6px' }}>
                <Zap size={14} color="#d97706" /> 50 Free Credits Active
              </span>
            </div>

            {/* Step 1: Connect Social Accounts */}
            {onboardingStep === 1 && (() => {
              const bskyAccount = socialAccounts.find((a) => a.platform === 'bluesky');
              const xAccount = socialAccounts.find((a) => a.platform === 'x');

              return (
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                    1. Connect Your Social Accounts
                  </h2>
                  <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: '18px', lineHeight: '1.5' }}>
                    Connect your <strong>Bluesky</strong> and <strong>X (Twitter)</strong> accounts to enable instant AI publishing and automated queue dispatch.
                  </p>

                  {socialConnectSuccess && (
                    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '10px 14px', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} color="#059669" />
                      <span>{socialConnectSuccess}</span>
                    </div>
                  )}

                  {socialConnectError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={16} color="#dc2626" />
                      <span>{socialConnectError}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                    
                    {/* Bluesky Card */}
                    <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: bskyAccount ? '#f0fdf4' : '#eff6ff', border: `1px solid ${bskyAccount ? '#bbf7d0' : '#bfdbfe'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.3rem' }}>🦋</span>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: bskyAccount ? '#166534' : '#1e40af' }}>
                              Bluesky AT Protocol
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {bskyAccount ? `Connected as @${bskyAccount.accountId}` : 'Connect using your handle and app-password'}
                            </div>
                          </div>
                        </div>

                        {bskyAccount ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 800, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '3px 8px', borderRadius: '6px' }}>
                              <Check size={12} /> CONNECTED
                            </span>
                            <Link
                              href="/social-accounts"
                              onClick={() => setShowOnboarding(false)}
                              style={{ fontSize: '0.74rem', fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}
                            >
                              Edit / Disconnect →
                            </Link>
                          </div>
                        ) : !showBskyForm ? (
                          <button
                            type="button"
                            onClick={() => { setShowBskyForm(true); setShowXForm(false); }}
                            style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Plus size={13} /> Connect
                          </button>
                        ) : null}
                      </div>

                      {/* Expandable Bluesky Form */}
                      {!bskyAccount && showBskyForm && (
                        <form onSubmit={handleConnectBsky} style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #dbeafe', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '3px' }}>
                              Bluesky Handle
                            </label>
                            <input
                              type="text"
                              value={onboardingBskyHandle}
                              onChange={(e) => setOnboardingBskyHandle(e.target.value)}
                              placeholder="e.g. handle.bsky.social"
                              required
                              style={{ width: '100%', padding: '7px 10px', fontSize: '0.82rem', border: '1px solid #bfdbfe', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '3px' }}>
                              App Password
                            </label>
                            <input
                              type="password"
                              value={onboardingBskyPassword}
                              onChange={(e) => setOnboardingBskyPassword(e.target.value)}
                              placeholder="xxxx-xxxx-xxxx-xxxx"
                              required
                              style={{ width: '100%', padding: '7px 10px', fontSize: '0.82rem', border: '1px solid #bfdbfe', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                            />
                            <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                              Generate in Bluesky Settings → Privacy and Security → App Passwords
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={() => setShowBskyForm(false)}
                              style={{ background: 'none', border: '1px solid #cbd5e1', color: '#64748b', padding: '5px 10px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={connectingSocial}
                              style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '5px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              {connectingSocial ? 'Connecting...' : 'Save & Link'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    {/* X (Twitter) Card */}
                    <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: xAccount ? '#f0fdf4' : '#f8fafc', border: `1px solid ${xAccount ? '#bbf7d0' : '#e2e8f0'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>𝕏</span>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                              X (Twitter) API v2
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {xAccount ? `Connected as @${xAccount.accountId}` : 'Connect with your X handle & API credentials'}
                            </div>
                          </div>
                        </div>

                        {xAccount ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 800, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '3px 8px', borderRadius: '6px' }}>
                              <Check size={12} /> CONNECTED
                            </span>
                            <Link
                              href="/social-accounts"
                              onClick={() => setShowOnboarding(false)}
                              style={{ fontSize: '0.74rem', fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}
                            >
                              Edit / Disconnect →
                            </Link>
                          </div>
                        ) : !showXForm ? (
                          <button
                            type="button"
                            onClick={() => { setShowXForm(true); setShowBskyForm(false); }}
                            style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Plus size={13} /> Connect
                          </button>
                        ) : null}
                      </div>

                      {/* Expandable X Form */}
                      {!xAccount && showXForm && (
                        <form onSubmit={handleConnectX} style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                              X Handle
                            </label>
                            <input
                              type="text"
                              value={onboardingXHandle}
                              onChange={(e) => setOnboardingXHandle(e.target.value)}
                              placeholder="e.g. MyBrandApp"
                              required
                              style={{ width: '100%', padding: '7px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                            />
                            <span style={{ fontSize: '0.7rem', color: '#059669', marginTop: '2px', display: 'block' }}>
                              ✓ App environment keys will automatically authenticate if left empty.
                            </span>
                          </div>

                          <div className="grid-2-col-mobile-stack" style={{ gap: '8px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '2px' }}>
                                API Key (Optional)
                              </label>
                              <input
                                type="password"
                                value={onboardingXApiKey}
                                onChange={(e) => setOnboardingXApiKey(e.target.value)}
                                placeholder="From .env / custom"
                                style={{ width: '100%', padding: '6px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '2px' }}>
                                API Secret (Optional)
                              </label>
                              <input
                                type="password"
                                value={onboardingXApiSecret}
                                onChange={(e) => setOnboardingXApiSecret(e.target.value)}
                                placeholder="From .env / custom"
                                style={{ width: '100%', padding: '6px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={() => setShowXForm(false)}
                              style={{ background: 'none', border: '1px solid #cbd5e1', color: '#64748b', padding: '5px 10px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={connectingSocial}
                              style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '5px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              {connectingSocial ? 'Connecting...' : 'Save & Link'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                  </div>

                  {/* Direct link to Social Accounts Manager */}
                  <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                    <Link
                      href="/social-accounts"
                      onClick={() => setShowOnboarding(false)}
                      style={{ fontSize: '0.82rem', color: '#4f46e5', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                    >
                      <Share2 size={13} /> Open Full Social Accounts Page <ExternalLink size={12} />
                    </Link>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setOnboardingStep(2)}
                      style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b', padding: '10px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Skip For Now
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnboardingStep(2)}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.88rem' }}
                    >
                      Next: Topics & Brand Voice <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Step 2: Topics & Brand Voice */}
            {onboardingStep === 2 && (
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  2. Define Topics & Brand Persona
                </h2>
                <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '20px', lineHeight: '1.5' }}>
                  Feed the AI Content Studio with your core pillars. The model automatically formats posts to fit platform character constraints (<strong style={{ color: '#0284c7' }}>&lt; 300 chars for Bluesky</strong>, <strong style={{ color: '#0f172a' }}>&lt; 280 chars for X</strong>).
                </p>

                <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: '#f5f3ff', border: '1px solid #ddd6fe', marginBottom: '24px', fontSize: '0.84rem', color: '#4338ca', lineHeight: '1.5' }}>
                  ⚡ <strong>AI Studio Flagship Feature:</strong> Enter any topic on the home screen to instantly produce 3 tailored variations with instant 1-click publishing.
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setOnboardingStep(1)}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '12px' }}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setOnboardingStep(3)}
                    className="btn btn-primary"
                    style={{ flex: 2, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    Next: Scheduling & Modes <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Scheduling & Approval Safeguards */}
            {onboardingStep === 3 && (
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  3. Configure Schedule & Safeguards
                </h2>
                <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '20px', lineHeight: '1.5' }}>
                  Choose how automated content should be released:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#4338ca' }}>
                      🛡️ Mode A: Review Before Publishing (Default)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px' }}>
                      AI generates drafts into your Approval Queue. You retain 100% control before anything is queued to platforms.
                    </div>
                  </div>

                  <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#047857' }}>
                      ⚡ Mode B: Authorized Auto-Publish
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px' }}>
                      Enables the BullMQ worker daemon to publish directly without waiting for manual human approval.
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowOnboarding(false);
                    router.push('/');
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <CheckCircle2 size={16} /> Enter PostPilot Studio
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

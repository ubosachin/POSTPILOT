'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Sparkles, 
  Send, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  Sliders, 
  AlertTriangle,
  Flame,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  Zap,
  Bookmark,
  Lock,
  ShieldAlert
} from 'lucide-react';
import { ContentVariant, ContentItem, Platform } from '@/types';

export default function StudioPage() {
  const [topic, setTopic] = useState('');
  const [goal, setGoal] = useState('Thought Leadership');
  const [audience, setAudience] = useState('Tech Founders & Indie Hackers');
  const [brandVoice, setBrandVoice] = useState('Insightful & Pragmatic Builder');
  const [sourceMaterial, setSourceMaterial] = useState('');
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'editor' | 'viewer'>('owner');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingPlatform, setRegeneratingPlatform] = useState<Platform | null>(null);
  const [activeItem, setActiveItem] = useState<ContentItem | null>(null);
  const [variants, setVariants] = useState<ContentVariant[]>([]);

  // Publishing / Scheduling state
  const [publishingPlatform, setPublishingPlatform] = useState<Platform | null>(null);
  const [publishedResult, setPublishedResult] = useState<{ platform: Platform; url: string; id: string } | null>(null);
  const [copiedQuora, setCopiedQuora] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'cards' | 'feed'>('cards');
  const [showBrandDrawer, setShowBrandDrawer] = useState(false);
  const [creditsConsumedToast, setCreditsConsumedToast] = useState<number | null>(null);

  // Overview metrics state
  const [metrics, setMetrics] = useState({
    credits: 100,
    activeAutomations: 1,
    scheduledPosts: 0,
    publishedPosts: 0,
    failedPosts: 0,
    connectedAccounts: 2,
    nextScheduledTime: null as string | null,
  });

  const fetchOverviewMetrics = async () => {
    try {
      const [credRes, autoRes, jobsRes, socRes] = await Promise.all([
        fetch('/api/v1/credits').then((r) => r.json()).catch(() => null),
        fetch('/api/v1/automations').then((r) => r.json()).catch(() => null),
        fetch('/api/jobs').then((r) => r.json()).catch(() => null),
        fetch('/api/v1/social/accounts').then((r) => r.json()).catch(() => null),
      ]);

      const jobs = jobsRes?.jobs || [];
      const scheduled = jobs.filter((j: any) => j.status === 'scheduled' || j.status === 'retry_wait');
      const published = jobs.filter((j: any) => j.status === 'published');
      const failed = jobs.filter((j: any) => j.status === 'failed' || j.status === 'needs_reauthorization');

      // Find earliest scheduled slot
      const upcoming = scheduled
        .map((j: any) => new Date(j.scheduledAt))
        .filter((d: Date) => d.getTime() > Date.now())
        .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];

      setMetrics({
        credits: credRes?.wallet?.balance ?? 100,
        activeAutomations: (autoRes?.automations || []).filter((a: any) => a.status === 'active').length,
        scheduledPosts: scheduled.length,
        publishedPosts: published.length,
        failedPosts: failed.length,
        connectedAccounts: socRes?.accounts?.length ?? 2,
        nextScheduledTime: upcoming ? upcoming.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      });
    } catch (err) {
      console.warn('Overview metrics load failed:', err);
    }
  };

  // Quick Inspiration Topics
  const inspirationTopics = [
    'Why decoupling background workers from Next.js is essential for SaaS',
    '3 common pitfalls when scaling AI generation pipelines',
    'How AT Protocol and Bluesky are changing decentralized social publishing',
    'Why Postgres and Redis queues beat complex microservices for early SaaS',
  ];

  // Auto-fill a topic on load if empty
  useEffect(() => {
    if (!topic) {
      setTopic('Why multi-tenant SaaS architecture requires atomic job locking');
    }
    fetchOverviewMetrics();
    fetch('/api/v1/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.role) setUserRole(d.role);
      })
      .catch(() => {});
  }, []);

  // Generate Drafts
  const handleGenerate = async () => {
    if (!topic.trim()) return;
    if (userRole === 'viewer') {
      setErrorMessage('Access Denied: Viewers have read-only access and cannot generate AI drafts.');
      return;
    }
    setIsGenerating(true);
    setErrorMessage(null);
    setPublishedResult(null);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          goal,
          audience,
          brandVoice,
          sourceMaterial,
          platforms: ['bluesky', 'x', 'quora'],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate variants');
      }

      setActiveItem(data.contentItem);
      setVariants(data.variants);

      if (data.balanceRemaining !== undefined) {
        setMetrics((prev) => ({ ...prev, credits: data.balanceRemaining }));
        setCreditsConsumedToast(data.creditsConsumed || 3);
        setTimeout(() => setCreditsConsumedToast(null), 4000);
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate single platform variant
  const handleRegenerateSingle = async (v: ContentVariant) => {
    if (userRole === 'viewer') {
      setErrorMessage('Access Denied: Viewers do not have permission to regenerate AI drafts.');
      return;
    }
    setRegeneratingPlatform(v.platform);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/ai/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: v.id,
          topic,
          platform: v.platform,
          audience,
          goal,
          brandVoice,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to regenerate variant');
      }

      setVariants((prev) =>
        prev.map((item) => (item.id === v.id ? data.variant : item))
      );

      if (data.balanceRemaining !== undefined) {
        setMetrics((prev) => ({ ...prev, credits: data.balanceRemaining }));
        setCreditsConsumedToast(1);
        setTimeout(() => setCreditsConsumedToast(null), 3000);
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setRegeneratingPlatform(null);
    }
  };

  // Update variant text
  const handleUpdateText = async (variantId: string, newText: string) => {
    if (userRole === 'viewer') {
      setErrorMessage('Access Denied: Viewers do not have permission to edit content text.');
      return;
    }
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, text: newText } : v))
    );

    try {
      await fetch(`/api/posts/${variantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText }),
      });
    } catch (e) {
      console.error('Failed to sync text update', e);
    }
  };

  // Publish Now (The Core Vertical Slice)
  const handlePublishNow = async (variant: ContentVariant) => {
    if (userRole === 'viewer') {
      setErrorMessage('Access Denied: Viewers do not have permission to publish content.');
      return;
    }
    setPublishingPlatform(variant.platform);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: variant.id,
          publishNow: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Publishing to ${variant.platform.toUpperCase()} failed`);
      }

      setVariants((prev) =>
        prev.map((v) =>
          v.id === variant.id
            ? { ...v, approvalStatus: 'approved' }
            : v
        )
      );

      setPublishedResult({
        platform: variant.platform,
        url: data.postUrl || '#',
        id: data.job?.id || 'live',
      });
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setPublishingPlatform(null);
    }
  };

  // Auto-schedule to Next Optimal Queue Slot
  const handleAutoSchedule = async (variantId: string) => {
    // Pick optimal slot tomorrow at 09:00 AM UTC
    const nextSlot = new Date(Date.now() + 24 * 60 * 60 * 1000);
    nextSlot.setUTCHours(9, 0, 0, 0);

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId,
          publishNow: false,
          scheduledAt: nextSlot.toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule post');
      }

      alert(`⚡ Added to optimal queue slot: ${nextSlot.toLocaleString()}`);
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  };

  // Schedule Job with Custom Date
  const handleScheduleJob = async (variantId: string) => {
    if (!scheduleTime) {
      setErrorMessage('Please select a date and time to schedule');
      return;
    }

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId,
          publishNow: false,
          scheduledAt: scheduleTime,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule post');
      }

      setShowScheduleModal(null);
      alert(`Post scheduled for ${new Date(scheduleTime).toLocaleString()}`);
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  };

  // Copy Quora Answer
  const handleCopyQuora = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQuora(true);
    setTimeout(() => setCopiedQuora(false), 2500);
  };

  return (
    <DashboardLayout>
      {/* Header Banner */}
      <div className="page-header-row" style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span className="badge badge-bluesky">
              <Sparkles size={12} /> Autonomous Publishing Engine
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
              Multi-Platform Syndication • Bluesky • X • Quora
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>
            AI Publishing Studio
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.96rem', marginTop: '4px' }}>
            Enter a topic, condition your brand voice, generate platform-tuned drafts, and publish directly to Bluesky and X.
          </p>
        </div>

        {/* Studio Controls */}
        <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowBrandDrawer(!showBrandDrawer)}
            className="btn-secondary"
            style={{ fontSize: '0.84rem' }}
          >
            <SlidersHorizontal size={14} color="#4f46e5" />
            <span>Brand Profile</span>
          </button>

          {variants.length > 0 && (
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', border: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setPreviewMode('cards')}
                style={{
                  background: previewMode === 'cards' ? '#ffffff' : 'transparent',
                  color: previewMode === 'cards' ? '#4f46e5' : '#64748b',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: previewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                Cards View
              </button>
              <button
                onClick={() => setPreviewMode('feed')}
                style={{
                  background: previewMode === 'feed' ? '#ffffff' : 'transparent',
                  color: previewMode === 'feed' ? '#4f46e5' : '#64748b',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: previewMode === 'feed' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                Live Feed Preview
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Credit Toast */}
      {creditsConsumedToast && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          fontSize: '0.84rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '18px'
        }}>
          <Zap size={16} color="#d97706" />
          <span>-{creditsConsumedToast} credit{creditsConsumedToast > 1 ? 's' : ''} consumed. Current balance: <strong>{metrics.credits} credits</strong></span>
        </div>
      )}

      {/* 8-Point Production Overview Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {/* Credit Balance */}
        <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '4px solid #6366f1' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>CREDIT WALLET</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {metrics.credits} <span style={{ fontSize: '0.72rem', color: '#4f46e5', fontWeight: 600 }}>cr</span>
          </div>
        </div>

        {/* Active Automations */}
        <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>AUTOMATIONS</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {metrics.activeAutomations} <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600 }}>active</span>
          </div>
        </div>

        {/* Scheduled Posts */}
        <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>SCHEDULED</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {metrics.scheduledPosts} <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>posts</span>
          </div>
        </div>

        {/* Successful Posts */}
        <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>PUBLISHED</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {metrics.publishedPosts} <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>delivered</span>
          </div>
        </div>

        {/* Failed Posts */}
        <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>FAILED JOBS</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: metrics.failedPosts > 0 ? '#dc2626' : '#0f172a', marginTop: '2px' }}>
            {metrics.failedPosts} <span style={{ fontSize: '0.72rem', color: metrics.failedPosts > 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>errors</span>
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>CONNECTED</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {metrics.connectedAccounts} <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>accounts</span>
          </div>
        </div>

        {/* Next Scheduled Time */}
        <div className="glass-panel" style={{ padding: '12px 14px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>NEXT QUEUE SLOT</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            {metrics.nextScheduledTime || 'In Queue'}
          </div>
        </div>
      </div>

      {/* Brand Profile Quick Customizer Drawer */}
      {showBrandDrawer && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bookmark size={16} color="#4f46e5" />
              Brand Profile & Voice Conditioning
            </h3>
            <button onClick={() => setShowBrandDrawer(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>Preset Tone</label>
              <select
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.84rem' }}
              >
                <option value="Insightful & Pragmatic Builder">Insightful & Pragmatic Builder</option>
                <option value="Technical Architect & Systems Engineer">Technical Architect & Systems Engineer</option>
                <option value="Viral Growth Hacker & High Contrast">Viral Growth Hacker & High Contrast</option>
                <option value="Thought Leader & Founder Journey">Thought Leader & Founder Journey</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>Target Demographic</label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.84rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>Objective Focus</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.84rem' }}
              >
                <option value="Thought Leadership">Thought Leadership & Authority</option>
                <option value="Product Launch">Product Launch & Feature Highlight</option>
                <option value="Technical Breakdown">Deep Technical Breakdown</option>
                <option value="Community Discussion">Community Discussion & Engagement</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Vertical Slice Pipeline Indicator */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>1. Workspace Context</span>
          </div>
          <ArrowRight size={14} color="#94a3b8" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: topic ? '#10b981' : '#4f46e5', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
              2
            </div>
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>2. Enter Topic</span>
          </div>
          <ArrowRight size={14} color="#94a3b8" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: variants.length > 0 ? '#10b981' : '#cbd5e1', color: variants.length > 0 ? '#ffffff' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
              3
            </div>
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>3. Generate Drafts</span>
          </div>
          <ArrowRight size={14} color="#94a3b8" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: publishedResult ? '#10b981' : '#cbd5e1', color: publishedResult ? '#ffffff' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
              4
            </div>
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>4. Publish to Bluesky / X</span>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {publishedResult && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={24} color="#059669" />
            <div>
              <div style={{ fontWeight: 800, color: '#065f46', fontSize: '0.98rem' }}>
                🎉 Confirmed Live on {publishedResult.platform.toUpperCase()}!
              </div>
              <div style={{ color: '#047857', fontSize: '0.82rem', marginTop: '2px' }}>
                Durable delivery receipt and platform post ID persisted to MongoDB.
              </div>
            </div>
          </div>
          <a
            href={publishedResult.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ fontSize: '0.84rem', padding: '8px 14px' }}
          >
            <span>View Live Post</span>
            <ExternalLink size={14} />
          </a>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertTriangle size={20} color="#dc2626" />
          <div style={{ color: '#b91c1c', fontSize: '0.88rem', fontWeight: 600 }}>{errorMessage}</div>
        </div>
      )}

      {/* Studio Input Section */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            What topic or insight do you want to publish today?
          </label>
          <div className="prompt-input-row" style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Why micro-SaaS architecture needs atomic queue locking..."
              className="input-field"
              style={{ fontSize: '1rem', fontWeight: 500 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGenerate();
              }}
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim() || userRole === 'viewer'}
              className="btn-primary"
              style={{
                minWidth: '180px',
                opacity: isGenerating || !topic.trim() || userRole === 'viewer' ? 0.6 : 1,
                cursor: userRole === 'viewer' ? 'not-allowed' : 'pointer',
              }}
              title={userRole === 'viewer' ? 'Viewer mode: Generation disabled' : undefined}
            >
              {userRole === 'viewer' ? (
                <>
                  <Lock size={16} />
                  <span>Viewer (Read-Only)</span>
                </>
              ) : isGenerating ? (
                <>
                  <RefreshCw size={18} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Drafting AI...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Generate Drafts</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Inspiration Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Quick Topics:</span>
          {inspirationTopics.map((t, idx) => (
            <button
              key={idx}
              onClick={() => setTopic(t)}
              style={{
                fontSize: '0.76rem',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                color: '#475569',
                padding: '5px 12px',
                borderRadius: '999px',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#4f46e5';
                e.currentTarget.style.borderColor = '#c7d2fe';
                e.currentTarget.style.background = '#eef2ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#475569';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.background = '#f1f5f9';
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Generated Platform Drafts Preview & Direct Actions */}
      {variants.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Platform-Tuned Variations</span>
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                {variants.length} Drafts Ready
              </span>
            </h2>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Each variant conforms to platform character limits and community format expectations.
            </div>
          </div>

          {previewMode === 'cards' ? (
            <div className="cards-grid-mobile" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
              gap: '20px'
            }}>
              {variants.map((v) => {
                const charCount = v.text.length;
                const maxChars = v.platform === 'x' ? 280 : v.platform === 'bluesky' ? 300 : 2000;
                const isOverLimit = charCount > maxChars;
                const isRegenerating = regeneratingPlatform === v.platform;

                return (
                  <div
                    key={v.id}
                    className="glass-panel"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '20px',
                      position: 'relative',
                      borderColor: v.platform === 'bluesky' ? '#bfdbfe' : v.platform === 'x' ? '#cbd5e1' : '#fecdd3'
                    }}
                  >
                    {/* Platform Card Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {v.platform === 'bluesky' && (
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            color: '#ffffff',
                            fontSize: '0.9rem'
                          }}>
                            🦋
                          </div>
                        )}
                        {v.platform === 'x' && (
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: '#0f172a',
                            border: '1px solid #334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            color: '#ffffff',
                            fontSize: '0.9rem'
                          }}>
                            𝕏
                          </div>
                        )}
                        {v.platform === 'quora' && (
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: '#b91c1c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            color: '#ffffff',
                            fontSize: '0.9rem'
                          }}>
                            Q
                          </div>
                        )}

                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#0f172a' }}>
                            {v.platform === 'bluesky' ? 'Bluesky (AT Protocol)' : v.platform === 'x' ? 'X / Twitter (v2 API)' : 'Quora Answer Draft'}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {v.platform === 'bluesky' ? '@postpilot.bsky.social' : v.platform === 'x' ? '@PostPilotApp' : 'Manual Copy & Verify Workflow'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleRegenerateSingle(v)}
                          disabled={isRegenerating}
                          title="Regenerate this variant"
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '5px 8px',
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 600
                          }}
                        >
                          <RefreshCw size={11} style={{ animation: isRegenerating ? 'spin 1s linear infinite' : 'none' }} />
                          <span>Redo</span>
                        </button>
                        <span className={`badge ${v.platform === 'bluesky' ? 'badge-bluesky' : v.platform === 'x' ? 'badge-x' : 'badge-quora'}`}>
                          {v.approvalStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Editable Preview Box */}
                    <div style={{ position: 'relative', flex: 1, marginBottom: '14px' }}>
                      <textarea
                        value={v.text}
                        onChange={(e) => handleUpdateText(v.id, e.target.value)}
                        rows={v.platform === 'quora' ? 10 : 6}
                        className="input-field"
                        style={{
                          resize: 'vertical',
                          lineHeight: '1.6',
                          fontSize: '0.9rem',
                          background: '#ffffff',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1'
                        }}
                      />

                      {/* Character Guardrail Bar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '6px',
                        fontSize: '0.74rem',
                        color: isOverLimit ? '#dc2626' : '#64748b',
                        fontWeight: 600
                      }}
                      >
                        <span>
                          {v.platform === 'quora' ? 'Comprehensive Depth' : `${charCount} / ${maxChars} chars`}
                        </span>
                        {isOverLimit && (
                          <span style={{ fontWeight: 700, color: '#dc2626' }}>Exceeds platform limit!</span>
                        )}
                      </div>
                    </div>

                    {/* Platform Warnings */}
                    {v.warnings.length > 0 && (
                      <div style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 10px',
                        marginBottom: '14px',
                        fontSize: '0.75rem',
                        color: '#b45309',
                        fontWeight: 600
                      }}>
                        {v.warnings[0]}
                      </div>
                    )}

                    {/* Actions Bar */}
                    {v.platform === 'bluesky' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handlePublishNow(v)}
                          disabled={publishingPlatform === 'bluesky' || isOverLimit}
                          className="btn-primary btn-bluesky"
                          style={{ flex: 1, padding: '9px 12px', fontSize: '0.84rem' }}
                        >
                          {publishingPlatform === 'bluesky' ? (
                            <>
                              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                              <span>Publishing...</span>
                            </>
                          ) : (
                            <>
                              <Send size={14} />
                              <span>Publish to Bluesky</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleAutoSchedule(v.id)}
                          title="Schedule in next optimal slot (9 AM UTC)"
                          className="btn-secondary"
                          style={{ padding: '9px 10px' }}
                        >
                          <Zap size={14} color="#d97706" />
                        </button>

                        <button
                          onClick={() => setShowScheduleModal(v.id)}
                          className="btn-secondary"
                          style={{ padding: '9px 12px', fontSize: '0.84rem' }}
                        >
                          <Clock size={14} />
                          <span>Schedule</span>
                        </button>
                      </div>
                    )}

                    {v.platform === 'x' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handlePublishNow(v)}
                          disabled={publishingPlatform === 'x' || isOverLimit}
                          className="btn-primary btn-x"
                          style={{ flex: 1, padding: '9px 12px', fontSize: '0.84rem' }}
                        >
                          {publishingPlatform === 'x' ? (
                            <>
                              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                              <span>Publishing...</span>
                            </>
                          ) : (
                            <>
                              <Send size={14} />
                              <span>Publish to X</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleAutoSchedule(v.id)}
                          title="Schedule in next optimal slot (9 AM UTC)"
                          className="btn-secondary"
                          style={{ padding: '9px 10px' }}
                        >
                          <Zap size={14} color="#d97706" />
                        </button>

                        <button
                          onClick={() => setShowScheduleModal(v.id)}
                          className="btn-secondary"
                          style={{ padding: '9px 12px', fontSize: '0.84rem' }}
                        >
                          <Clock size={14} />
                          <span>Schedule</span>
                        </button>
                      </div>
                    )}

                    {v.platform === 'quora' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleCopyQuora(v.text)}
                            className="btn-secondary"
                            style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem' }}
                          >
                            {copiedQuora ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                            <span>{copiedQuora ? 'Copied to Clipboard!' : 'One-Click Copy'}</span>
                          </button>

                          <a
                            href={v.quoraQuestionUrl || `https://www.quora.com/search?q=${encodeURIComponent(topic)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary"
                            style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                          >
                            <span>Open Question</span>
                            <ExternalLink size={14} />
                          </a>
                        </div>

                        <button
                          onClick={() => handlePublishNow(v)}
                          className="btn-secondary"
                          style={{
                            background: '#fef2f2',
                            borderColor: '#fca5a5',
                            color: '#b91c1c',
                            padding: '8px 12px',
                            fontSize: '0.82rem',
                            fontWeight: 600
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>Confirm Manual Publication</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Live Feed Preview Mode */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '24px'
            }}>
              {variants.filter((v) => v.platform !== 'quora').map((v) => (
                <div
                  key={v.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: v.platform === 'bluesky' ? '#0284c7' : '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      color: '#ffffff'
                    }}>
                      {v.platform === 'bluesky' ? '🦋' : '𝕏'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#0f172a' }}>
                        PostPilot
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {v.platform === 'bluesky' ? '@postpilot.bsky.social' : '@PostPilotApp'} • Just now
                      </div>
                    </div>
                  </div>

                  <p style={{
                    fontSize: '0.96rem',
                    color: '#334155',
                    lineHeight: '1.55',
                    whiteSpace: 'pre-wrap',
                    marginBottom: '16px'
                  }}>
                    {v.text}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <span>💬 12</span>
                    <span>🔁 8</span>
                    <span>❤️ 48</span>
                    <span>📊 1.2k</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
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
          <div className="glass-panel modal-dialog-content" style={{
            width: '100%',
            maxWidth: '440px',
            padding: 'clamp(20px, 4vw, 24px)',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Schedule Publication
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: '20px' }}>
              Select the date and time for the background BullMQ worker to claim and publish this post.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155', fontWeight: 600, marginBottom: '6px' }}>
                Publish Date & Time (UTC)
              </label>
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="input-field"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowScheduleModal(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleScheduleJob(showScheduleModal)}
                className="btn-primary"
              >
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </DashboardLayout>
  );
}

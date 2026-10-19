'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Cpu, 
  Plus, 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  XCircle, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  ArrowRight,
  ShieldAlert,
  Edit2,
  Trash2,
  ListPlus,
  RefreshCw
} from 'lucide-react';
import { ContentAutomation, DailyTopic, Platform, AutomationApprovalMode, DistributionMode } from '@/types';

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<ContentAutomation[]>([]);
  const [dailyTopics, setDailyTopics] = useState<DailyTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'topics'>('list');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state for creating/editing automation
  const [name, setName] = useState('Daily Tech & AI Thought Leadership');
  const [topicsInput, setTopicsInput] = useState('AI Autonomous Agents\nDecoupling Background Queues in Next.js\nBuilding Resilient SaaS Systems');
  const [dailyInstructions, setDailyInstructions] = useState('Provide 1 actionable architectural insight and end with an engaging open question.');
  const [targetAudience, setTargetAudience] = useState('Founders, CTOs, Engineers & Indie Builders');
  const [brandVoice, setBrandVoice] = useState('Insightful & Pragmatic Builder');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['bluesky', 'x']);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [timezone, setTimezone] = useState('UTC');
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [postsPerDay, setPostsPerDay] = useState(2);
  const [publishingTimesInput, setPublishingTimesInput] = useState('09:00, 16:00');
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('total_slots');
  const [approvalMode, setApprovalMode] = useState<AutomationApprovalMode>('review_first');
  const [fallbackPolicy, setFallbackPolicy] = useState<'cycle_topics' | 'ai_variation' | 'pause'>('cycle_topics');
  
  // Schedule Preview state
  const [previewSlots, setPreviewSlots] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Daily Topic Input state
  const [newTopicDate, setNewTopicDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTopicText, setNewTopicText] = useState('');
  const [newTopicInstructions, setNewTopicInstructions] = useState('');
  const [connectedAccountIds, setConnectedAccountIds] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [autoRes, topicsRes, socRes] = await Promise.all([
        fetch('/api/v1/automations'),
        fetch('/api/v1/automations/topics'),
        fetch('/api/social-accounts').catch(() => null),
      ]);
      const autoData = await autoRes.json();
      const topicsData = await topicsRes.json();
      const socData = socRes ? await socRes.json().catch(() => null) : null;

      if (autoData.success) setAutomations(autoData.automations || []);
      if (topicsData.success) setDailyTopics(topicsData.topics || []);
      if (socData?.accounts) {
        setConnectedAccountIds(socData.accounts.map((a: any) => a.id));
      }
    } catch (err) {
      console.error('Failed to load automations data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Generate forward schedule preview
  const handleGeneratePreview = async () => {
    setPreviewLoading(true);
    try {
      const times = publishingTimesInput.split(',').map((t) => t.trim()).filter(Boolean);
      const topics = topicsInput.split('\n').map((t) => t.trim()).filter(Boolean);

      const res = await fetch('/api/v1/automations/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          topics,
          dailyInstructions,
          targetAudience,
          brandVoice,
          platforms: selectedPlatforms,
          socialAccountIds: connectedAccountIds.length > 0 ? connectedAccountIds : ['soc_bsky_01', 'soc_x_01'],
          startDate,
          timezone,
          activeDays,
          postsPerDay,
          publishingTimes: times,
          distributionMode,
          approvalMode,
          fallbackPolicy,
          status: 'active',
          daysAhead: 7,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPreviewSlots(data.slots || []);
      }
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Save new automation
  const handleSaveAutomation = async () => {
    const times = publishingTimesInput.split(',').map((t) => t.trim()).filter(Boolean);
    const topics = topicsInput.split('\n').map((t) => t.trim()).filter(Boolean);

    if (topics.length === 0) {
      setNotification({ type: 'error', message: 'Please provide at least one topic.' });
      return;
    }

    try {
      const res = await fetch('/api/v1/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          topics,
          dailyInstructions,
          targetAudience,
          brandVoice,
          platforms: selectedPlatforms,
          socialAccountIds: connectedAccountIds.length > 0 ? connectedAccountIds : ['soc_bsky_01', 'soc_x_01'],
          startDate,
          timezone,
          activeDays,
          postsPerDay,
          publishingTimes: times,
          distributionMode,
          approvalMode,
          fallbackPolicy,
          status: 'active',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: `Automation "${name}" activated successfully!` });
        setActiveTab('list');
        loadData();
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to save automation.' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: (err as Error).message });
    }
  };

  // Pause / Resume / Cancel automation
  const handleAutomationAction = async (id: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      const res = await fetch(`/api/v1/automations/${id}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: `Automation ${action}d successfully.` });
        loadData();
      }
    } catch (err) {
      setNotification({ type: 'error', message: (err as Error).message });
    }
  };

  // Add date-specific daily topic
  const handleAddDailyTopic = async () => {
    if (!newTopicText.trim()) return;
    try {
      const defaultAuto = automations[0]?.id || 'auto_01';
      const res = await fetch('/api/v1/automations/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automationId: defaultAuto,
          date: newTopicDate,
          topic: newTopicText,
          instructions: newTopicInstructions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: `Topic saved for ${newTopicDate}!` });
        setNewTopicText('');
        setNewTopicInstructions('');
        loadData();
      }
    } catch (err) {
      setNotification({ type: 'error', message: (err as Error).message });
    }
  };

  const toggleDay = (day: number) => {
    if (activeDays.includes(day)) {
      if (activeDays.length > 1) {
        setActiveDays(activeDays.filter((d) => d !== day));
      }
    } else {
      setActiveDays([...activeDays, day].sort());
    }
  };

  const togglePlatform = (p: Platform) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((item) => item !== p));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cpu size={28} color="#4f46e5" /> Content Automations & Schedules
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
              Configure recurring publishing schedules, daily topic rotation, and review vs. auto-publish rules.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setActiveTab('list')}
              className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              Active Automations ({automations.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('create');
                handleGeneratePreview();
              }}
              className={`btn ${activeTab === 'create' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> New Automation
            </button>
            <button
              onClick={() => setActiveTab('topics')}
              className={`btn ${activeTab === 'topics' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ListPlus size={16} /> Daily Topics ({dailyTopics.length})
            </button>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            background: notification.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: notification.type === 'success' ? '#065f46' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.88rem'
          }}>
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} style={{ background: 'none', color: 'inherit', fontWeight: 'bold' }}>×</button>
          </div>
        )}

        {/* TAB 1: LIST ACTIVE AUTOMATIONS */}
        {activeTab === 'list' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                <RefreshCw size={28} className="spin-icon" style={{ margin: '0 auto 12px' }} />
                Loading automations...
              </div>
            ) : automations.length === 0 ? (
              <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
                <Cpu size={48} color="#4f46e5" style={{ margin: '0 auto 16px', opacity: 0.9 }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  No Active Automations
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', maxWidth: '460px', margin: '0 auto 24px' }}>
                  Set up your first automated social schedule to generate daily topic variants and publish seamlessly on X and Bluesky.
                </p>
                <button
                  onClick={() => {
                    setActiveTab('create');
                    handleGeneratePreview();
                  }}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Plus size={16} /> Create Automation
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                {automations.map((auto) => {
                  const isActive = auto.status === 'active';
                  const isPaused = auto.status === 'paused';
                  return (
                    <div key={auto.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className={`badge ${isActive ? 'badge-success' : isPaused ? 'badge-warning' : 'badge-danger'}`}>
                          {auto.status.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {auto.timezone}
                        </span>
                      </div>

                      <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                          {auto.name}
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                          Target: <strong style={{ color: '#0f172a' }}>{auto.targetAudience}</strong>
                        </p>
                      </div>

                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#64748b' }}>Platforms:</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{auto.platforms.join(', ').toUpperCase()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#64748b' }}>Publishing Times:</span>
                          <span style={{ color: '#4f46e5', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{auto.publishingTimes.join(', ')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#64748b' }}>Approval Mode:</span>
                          <span style={{ color: auto.approvalMode === 'auto_publish' ? '#059669' : '#d97706', fontWeight: 600 }}>
                            {auto.approvalMode === 'auto_publish' ? '⚡ Auto-Publish' : '🛡️ Review First (Mode A)'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Fallback Policy:</span>
                          <span style={{ color: '#334155' }}>{auto.fallbackPolicy}</span>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        <strong style={{ color: '#0f172a' }}>{auto.topics.length} Recurring Topics:</strong>
                        <ul style={{ paddingLeft: '16px', marginTop: '4px', lineHeight: '1.4' }}>
                          {auto.topics.slice(0, 3).map((t, idx) => (
                            <li key={idx} style={{ color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {t}
                            </li>
                          ))}
                          {auto.topics.length > 3 && (
                            <li style={{ color: '#4f46e5', fontWeight: 600 }}>+{auto.topics.length - 3} more</li>
                          )}
                        </ul>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                        {isActive ? (
                          <button
                            onClick={() => handleAutomationAction(auto.id, 'pause')}
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <Pause size={14} color="#d97706" /> Pause
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAutomationAction(auto.id, 'resume')}
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <Play size={14} color="#059669" /> Resume
                          </button>
                        )}

                        <button
                          onClick={() => handleAutomationAction(auto.id, 'cancel')}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}
                          title="Cancel and stop pending scheduled jobs"
                        >
                          <XCircle size={14} /> Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CREATE / EDIT AUTOMATION */}
        {activeTab === 'create' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            
            {/* Left Column: Form Controls */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#4f46e5" /> Automation Configuration
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Automation Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                    placeholder="e.g. Daily Tech Insights"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Recurring Topic Themes (one per line)
                  </label>
                  <textarea
                    rows={4}
                    value={topicsInput}
                    onChange={(e) => setTopicsInput(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', resize: 'vertical' }}
                    placeholder="Enter recurring topics..."
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Daily Writing Instructions & Guidelines
                  </label>
                  <input
                    type="text"
                    value={dailyInstructions}
                    onChange={(e) => setDailyInstructions(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                    placeholder="e.g. Lead with a punchy hook, share 2 practical tips."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Target Audience
                    </label>
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Brand Voice
                    </label>
                    <input
                      type="text"
                      value={brandVoice}
                      onChange={(e) => setBrandVoice(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Target Platforms Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                    Target Platforms
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => togglePlatform('bluesky')}
                      className="btn"
                      style={{
                        padding: '8px 16px',
                        background: selectedPlatforms.includes('bluesky') ? '#0284c7' : '#f8fafc',
                        color: selectedPlatforms.includes('bluesky') ? '#ffffff' : '#475569',
                        border: selectedPlatforms.includes('bluesky') ? '1px solid #0284c7' : '1px solid #cbd5e1',
                        fontSize: '0.84rem',
                        fontWeight: 600
                      }}
                    >
                      Bluesky (AT Protocol)
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePlatform('x')}
                      className="btn"
                      style={{
                        padding: '8px 16px',
                        background: selectedPlatforms.includes('x') ? '#0f172a' : '#f8fafc',
                        color: selectedPlatforms.includes('x') ? '#ffffff' : '#475569',
                        border: selectedPlatforms.includes('x') ? '1px solid #0f172a' : '1px solid #cbd5e1',
                        fontSize: '0.84rem',
                        fontWeight: 600
                      }}
                    >
                      X (Twitter API v2)
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePlatform('quora')}
                      className="btn"
                      style={{
                        padding: '8px 16px',
                        background: selectedPlatforms.includes('quora') ? '#b91c1c' : '#f8fafc',
                        color: selectedPlatforms.includes('quora') ? '#ffffff' : '#475569',
                        border: selectedPlatforms.includes('quora') ? '1px solid #b91c1c' : '1px solid #cbd5e1',
                        fontSize: '0.84rem',
                        fontWeight: 600
                      }}
                    >
                      Quora (Answer Drafts)
                    </button>
                  </div>
                </div>

                {/* Active Days */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                    Active Days of Week
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {dayLabels.map((lbl, idx) => {
                      const selected = activeDays.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleDay(idx)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: selected ? '#ede9fe' : '#f8fafc',
                            border: `1px solid ${selected ? '#818cf8' : '#e2e8f0'}`,
                            color: selected ? '#4f46e5' : '#64748b',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {lbl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Publishing Times & Distribution Mode */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Publishing Times (comma-separated 24h)
                    </label>
                    <input
                      type="text"
                      value={publishingTimesInput}
                      onChange={(e) => setPublishingTimesInput(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                      placeholder="09:00, 16:00"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Distribution Logic
                    </label>
                    <select
                      value={distributionMode}
                      onChange={(e) => setDistributionMode(e.target.value as DistributionMode)}
                      className="input-field"
                      style={{ width: '100%' }}
                    >
                      <option value="total_slots">Rotate platforms across total slots</option>
                      <option value="per_platform">Publish on all platforms per time slot</option>
                    </select>
                  </div>
                </div>

                {/* Content Approval Mode (Mode A vs Mode B) */}
                <div style={{ background: '#f5f3ff', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid #ddd6fe' }}>
                  <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: '#1e1b4b', marginBottom: '8px' }}>
                    Content Approval & Publishing Safeguard
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="approvalMode"
                        checked={approvalMode === 'review_first'}
                        onChange={() => setApprovalMode('review_first')}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                          🛡️ Mode A: Review Before Publishing (Default & Recommended)
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          AI generates drafts into your Approval Queue. Posts are only scheduled once approved by a human.
                        </div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="approvalMode"
                        checked={approvalMode === 'auto_publish'}
                        onChange={() => setApprovalMode('auto_publish')}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#059669' }}>
                          ⚡ Mode B: Authorized Autonomous Publishing
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          System automatically generates and queues posts directly to BullMQ background workers for publication.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Submit button */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={handleGeneratePreview}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '10px', fontSize: '0.88rem' }}
                  >
                    Refresh Preview
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAutomation}
                    className="btn btn-primary"
                    style={{ flex: 2, padding: '10px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <CheckCircle2 size={16} /> Activate Automation
                  </button>
                </div>

              </div>
            </div>

            {/* Right Column: Interactive Schedule Preview */}
            <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} color="#4f46e5" /> Forward Schedule Preview (7 Days)
                </h3>
                <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                  {previewSlots.length} Scheduled Slots
                </span>
              </div>

              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>
                Verify upcoming publishing slots, platform distribution, and resolved topics before launching:
              </p>

              {previewLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <RefreshCw size={24} className="spin-icon" style={{ margin: '0 auto 8px' }} />
                  Calculating slot schedule...
                </div>
              ) : previewSlots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  Click &quot;Refresh Preview&quot; to inspect forward schedule slots.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
                  {previewSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#4f46e5', fontWeight: 700 }}>
                            {slot.date} • {slot.time}
                          </span>
                          <span className={`badge ${slot.platform === 'bluesky' ? 'badge-info' : slot.platform === 'x' ? 'badge-neutral' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                            {slot.platform.toUpperCase()}
                          </span>
                          {slot.topicSource === 'date_override' && (
                            <span className="badge badge-warning" style={{ fontSize: '0.62rem' }}>Date Override</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {slot.topic}
                        </div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <span style={{ fontSize: '0.72rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> Ready
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: DAILY TOPIC MANAGER */}
        {activeTab === 'topics' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '24px' }}>
            {/* Add Date Override */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="#4f46e5" /> Set Topic for Specific Date
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '18px' }}>
                Override recurring cycled topics with a specific topic for any calendar date (e.g. product launch, breaking news).
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={newTopicDate}
                    onChange={(e) => setNewTopicDate(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Topic Subject
                  </label>
                  <input
                    type="text"
                    value={newTopicText}
                    onChange={(e) => setNewTopicText(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                    placeholder="e.g. Launching PostPilot v2 on Product Hunt"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Specific Daily Instructions (optional)
                  </label>
                  <input
                    type="text"
                    value={newTopicInstructions}
                    onChange={(e) => setNewTopicInstructions(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                    placeholder="e.g. Highlight our free 50 credit allowance and real AT Protocol SDK."
                  />
                </div>

                <button
                  onClick={handleAddDailyTopic}
                  className="btn btn-primary"
                  style={{ marginTop: '8px', padding: '10px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <CheckCircle2 size={16} /> Save Daily Topic Override
                </button>
              </div>
            </div>

            {/* List of Scheduled Overrides */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
                Configured Daily Overrides ({dailyTopics.length})
              </h3>

              {dailyTopics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  No date-specific overrides defined yet. All dates will follow recurring topic cycling.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {dailyTopics.map((dt) => (
                    <div
                      key={dt.id}
                      style={{
                        padding: '14px',
                        borderRadius: 'var(--radius-md)',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem', color: '#4f46e5', fontWeight: 700 }}>
                          📅 {dt.date}
                        </span>
                        <span className={`badge ${dt.isUsed ? 'badge-neutral' : 'badge-success'}`}>
                          {dt.isUsed ? 'PUBLISHED' : 'QUEUED'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>
                        {dt.topic}
                      </div>
                      {dt.instructions && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                          Instructions: {dt.instructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

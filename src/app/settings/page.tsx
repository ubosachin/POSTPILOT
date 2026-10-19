'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Settings, 
  Layers, 
  Sliders, 
  Users, 
  ShieldAlert, 
  CheckCircle2, 
  Trash2, 
  Globe, 
  Sparkles,
  CreditCard
} from 'lucide-react';
import { BrandProfile, Workspace } from '@/types';

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'editor' | 'viewer'>('owner');

  // Form states
  const [wsName, setWsName] = useState('Growth Lab');
  const [timezone, setTimezone] = useState('UTC');
  const [voice, setVoice] = useState('Insightful & Pragmatic Builder');
  const [audience, setAudience] = useState('Founders, CTOs, Engineers & Indie Builders');
  const [topicsInput, setTopicsInput] = useState('AI Autonomous Agents, Next.js Architectures, Micro-SaaS Growth');
  const [rulesInput, setRulesInput] = useState('Lead with a strong hook\nInclude 1 actionable insight\nNever use spammy engagement bait');

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/v1/me');
        const data = await res.json();
        if (data.success) {
          if (data.role) setUserRole(data.role);
          setWorkspace(data.workspace);
          if (data.workspace?.name) setWsName(data.workspace.name);
          if (data.workspace?.timezone) setTimezone(data.workspace.timezone);

          if (data.brandProfile) {
            setBrandProfile(data.brandProfile);
            setVoice(data.brandProfile.voice || '');
            setAudience(data.brandProfile.audience || '');
            if (data.brandProfile.topics) setTopicsInput(data.brandProfile.topics.join(', '));
            if (data.brandProfile.rules) setRulesInput(data.brandProfile.rules.join('\n'));
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/workspaces', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wsName,
          timezone,
          brandProfile: {
            voice,
            audience,
            topics: topicsInput.split(',').map((t) => t.trim()).filter(Boolean),
            rules: rulesInput.split('\n').map((r) => r.trim()).filter(Boolean),
          },
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '60px' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={28} color="#4f46e5" /> Workspace & Brand Settings
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
            Configure your tenant details, AI brand voice persona, and content generation constraints.
          </p>
        </div>

        {savedSuccess && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.88rem'
          }}>
            <CheckCircle2 size={16} /> Workspace and brand profile preferences successfully saved.
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Section 1: Workspace Basics */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#4f46e5" /> Tenant Identity & Timezone
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Scheduling Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="UTC">UTC (Universal Time)</option>
                  <option value="America/New_York">Eastern Time (US / New York)</option>
                  <option value="America/Los_Angeles">Pacific Time (US / San Francisco)</option>
                  <option value="Europe/London">London (GMT / BST)</option>
                  <option value="Asia/Kolkata">India (IST / Kolkata)</option>
                  <option value="Asia/Tokyo">Japan (JST / Tokyo)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: AI Brand Profile Persona */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#4f46e5" /> AI Brand Profile & Writing Persona
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Brand Voice & Tone
                  </label>
                  <input
                    type="text"
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                    placeholder="e.g. Visionary, Technical, Concise"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                    placeholder="e.g. B2B Founders, Developers"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Default Pillars & Topics (comma-separated)
                </label>
                <input
                  type="text"
                  value={topicsInput}
                  onChange={(e) => setTopicsInput(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Brand Rules & Guardrails (one per line)
                </label>
                <textarea
                  rows={4}
                  value={rulesInput}
                  onChange={(e) => setRulesInput(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Team & RBAC */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#4f46e5" /> Workspace Members & RBAC
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>
              Manage collaborators with role-based access control (Owner, Admin, Editor, Viewer).
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: '#fff'
                }}>
                  AR
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>Alex Rivera</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>alex@postpilot.io</div>
                </div>
              </div>

              <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>Workspace Owner</span>
            </div>
          </div>

          {/* Save Button */}
          <div>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ padding: '12px 28px', fontSize: '0.92rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {saving ? 'Saving Changes...' : 'Save Settings'}
            </button>
          </div>

          {/* Section 4: Danger Zone */}
          <div className="glass-panel" style={{ padding: '28px', border: '1px solid #fecaca' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#dc2626', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} /> Danger Zone
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>
              Permanently delete this workspace, social credentials, scheduled jobs, and publishing history. This action cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => {
                if (userRole !== 'owner') {
                  alert('Access Denied: Only the Workspace Owner has permission to delete this workspace.');
                  return;
                }
                const confirmInput = prompt(`To permanently delete this workspace, please type the workspace name "${wsName}":`);
                if (confirmInput === wsName) {
                  alert(`Workspace "${wsName}" scheduled for permanent deletion. An owner verification confirmation has been dispatched.`);
                }
              }}
              className="btn"
              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '8px 16px', fontSize: '0.84rem', fontWeight: 600 }}
            >
              Delete Workspace
            </button>
          </div>

        </form>

      </div>
    </DashboardLayout>
  );
}

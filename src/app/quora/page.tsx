'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  HelpCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles, 
  Search,
  RefreshCw,
  Plus,
  Link as LinkIcon
} from 'lucide-react';
import { ContentVariant } from '@/types';

export default function QuoraWorkspacePage() {
  const [quoraVariants, setQuoraVariants] = useState<ContentVariant[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newQuestionTopic, setNewQuestionTopic] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [publishedUrlInput, setPublishedUrlInput] = useState<{ [id: string]: string }>({});

  const fetchQuoraItems = async () => {
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (data.posts) {
        const qList: ContentVariant[] = [];
        data.posts.forEach((post: { variants?: ContentVariant[] }) => {
          post.variants?.forEach((v) => {
            if (v.platform === 'quora') {
              qList.push(v);
            }
          });
        });
        setQuoraVariants(qList);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchQuoraItems();
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleConfirmPublish = async (variantId: string) => {
    const liveUrl = publishedUrlInput[variantId];
    try {
      const res = await fetch(`/api/posts/${variantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalStatus: 'approved',
          quoraAnswerStatus: 'manually_published',
          quoraQuestionUrl: liveUrl || undefined,
        }),
      });
      if (res.ok) {
        fetchQuoraItems();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDraftFromTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionTopic.trim()) return;
    setIsDrafting(true);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: newQuestionTopic,
          platforms: ['quora'],
          goal: 'Thought Leadership',
          audience: 'Tech Professionals & Knowledge Seekers',
        }),
      });

      if (res.ok) {
        setNewQuestionTopic('');
        fetchQuoraItems();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="badge badge-quora">
            Official Compliant Architecture
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Separate manual answering & verification workflow
          </span>
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Quora Answer Workspace
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.94rem', marginTop: '4px' }}>
          Produce high-authority Quora answers with one-click copying, direct question navigation, and verified manual publication tracking.
        </p>
      </div>

      {/* Compliance / Architecture Banner */}
      <div style={{
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px'
      }}>
        <ShieldAlert size={22} style={{ color: '#dc2626', marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '0.86rem', color: '#991b1b', lineHeight: '1.5' }}>
          <strong style={{ color: '#7f1d1d' }}>PostPilot Architectural Guardrail:</strong> In compliance with Quora Terms of Service, automated bot/cookie answering is strictly avoided to protect subscriber accounts. Automated publishing will unlock if and when Quora releases an authorized public partner API.
        </div>
      </div>

      {/* Quick Answer Generator */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="#b92b27" />
          Quick Quora Question Answer Generator
        </h3>
        <form onSubmit={handleDraftFromTopic} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={newQuestionTopic}
            onChange={(e) => setNewQuestionTopic(e.target.value)}
            placeholder="Paste a Quora question or enter a topic (e.g. What are the best patterns for distributed job queues?)..."
            className="input-field"
            style={{ fontSize: '0.9rem' }}
          />
          <button
            type="submit"
            disabled={isDrafting || !newQuestionTopic.trim()}
            className="btn-primary"
            style={{ background: '#b92b27', minWidth: '160px' }}
          >
            {isDrafting ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
            <span>Draft Answer</span>
          </button>
        </form>
      </div>

      {quoraVariants.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <HelpCircle size={44} style={{ color: '#b92b27', margin: '0 auto 16px' }} />
          <h3 style={{ color: '#0f172a', marginBottom: '8px' }}>No Quora answer drafts yet</h3>
          <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.9rem' }}>
            Draft your first answer using the box above or from the main AI Studio.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {quoraVariants.map((item) => {
            const isPublished = item.quoraAnswerStatus === 'manually_published';

            return (
              <div key={item.id} className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#b92b27',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.95rem'
                    }}>
                      Q
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#0f172a' }}>
                        Quora Thought-Leadership Answer
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        Version {item.version} • {item.text.length} characters • {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${isPublished ? 'badge-success' : 'badge-quora'}`}>
                    {isPublished ? 'MANUALLY PUBLISHED' : 'DRAFT READY'}
                  </span>
                </div>

                {/* Pre-formatted answer */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px',
                  marginBottom: '16px',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.9rem',
                  lineHeight: '1.6',
                  color: '#0f172a'
                }}>
                  {item.text}
                </div>

                {/* Live Question Link / URL Input */}
                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="text"
                    value={publishedUrlInput[item.id] !== undefined ? publishedUrlInput[item.id] : item.quoraQuestionUrl || ''}
                    onChange={(e) => setPublishedUrlInput({ ...publishedUrlInput, [item.id]: e.target.value })}
                    placeholder="Enter Quora question URL (e.g. https://www.quora.com/topic-name)..."
                    className="input-field"
                    style={{ fontSize: '0.82rem', padding: '8px 12px' }}
                  />
                  <a
                    href={item.quoraQuestionUrl || 'https://www.quora.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                  >
                    <span>Open on Quora</span>
                    <ExternalLink size={13} />
                  </a>
                </div>

                {/* Action controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleCopy(item.id, item.text)}
                      className="btn-primary"
                      style={{ padding: '8px 14px', fontSize: '0.84rem' }}
                    >
                      {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedId === item.id ? 'Copied to Clipboard!' : 'Copy Formatted Answer'}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleConfirmPublish(item.id)}
                    className="btn-secondary"
                    style={{
                      background: isPublished ? '#ecfdf5' : '#f8fafc',
                      borderColor: isPublished ? '#a7f3d0' : '#cbd5e1',
                      color: isPublished ? '#065f46' : '#334155',
                      fontSize: '0.84rem',
                      padding: '8px 14px'
                    }}
                  >
                    <CheckCircle2 size={14} color={isPublished ? '#059669' : '#64748b'} />
                    <span>{isPublished ? 'Publication Confirmed' : 'Mark as Manually Published'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

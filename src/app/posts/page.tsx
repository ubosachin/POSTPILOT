'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { ContentItem, ContentVariant, Platform, ApprovalStatus } from '@/types';
import { 
  Send, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Sparkles, 
  Filter,
  Check,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

interface PostWithVariants extends ContentItem {
  variants: ContentVariant[];
}

export default function PostsPage() {
  const [posts, setPosts] = useState<PostWithVariants[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'approved' | 'published'>('all');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'editor' | 'viewer'>('owner');

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/content');
      const data = await res.json();
      if (data.items) {
        setPosts(data.items);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetch('/api/v1/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.role) setUserRole(d.role);
      })
      .catch(() => {});
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content item?')) return;
    try {
      await fetch(`/api/v1/content/${id}`, { method: 'DELETE' });
      fetchPosts();
    } catch (e) {
      console.error(e);
    }
  };

  // 1-Click Approval
  const handleApproveVariant = async (variantId: string) => {
    setApprovingId(variantId);
    try {
      const res = await fetch(`/api/v1/content/${variantId}/approve`, { method: 'POST' });
      if (res.ok) {
        fetchPosts();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setApprovingId(null);
    }
  };

  // Filter posts and variants based on selected status
  const filteredPosts = posts.map((post) => {
    if (statusFilter === 'all') return post;
    const matchingVariants = post.variants.filter((v) => {
      if (statusFilter === 'draft') return v.approvalStatus === 'draft';
      if (statusFilter === 'approved') return v.approvalStatus === 'approved';
      if (statusFilter === 'published') return v.approvalStatus === 'approved'; // Or has published result
      return true;
    });
    return { ...post, variants: matchingVariants };
  }).filter((post) => statusFilter === 'all' || post.variants.length > 0);

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
        
        {/* Header & Controls */}
        <div className="page-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Send size={26} color="#4f46e5" /> Content Library & Approval Queue
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '4px' }}>
              Review generated drafts, approve platform variations, and inspect published history.
            </p>
          </div>

          <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
              {(['all', 'draft', 'approved', 'published'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  style={{
                    background: statusFilter === filter ? '#ffffff' : 'transparent',
                    color: statusFilter === filter ? '#4f46e5' : '#64748b',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    boxShadow: statusFilter === filter ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  {filter === 'draft' ? 'Needs Approval' : filter}
                </button>
              ))}
            </div>

            <Link href="/" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} /> New AI Studio Draft
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            Loading content items and variants...
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
            <h3 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '1.2rem', fontWeight: 800 }}>
              No content matching &quot;{statusFilter}&quot;
            </h3>
            <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.9rem' }}>
              Head to the AI Studio to enter a topic and generate new multi-platform variations.
            </p>
            <Link href="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} /> Open AI Studio
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredPosts.map((item) => (
              <div key={item.id} className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                      {item.topic}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
                      Goal: <strong style={{ color: '#334155' }}>{item.goal}</strong> • Created {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {userRole !== 'viewer' ? (
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  ) : (
                    <span style={{
                      fontSize: '0.72rem',
                      color: '#64748b',
                      background: '#f1f5f9',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      border: '1px solid #e2e8f0'
                    }}>
                      Viewer (Read-Only)
                    </span>
                  )}
                </div>

                {/* Platform Variants Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '14px' }}>
                  {item.variants.map((v) => {
                    const isDraft = v.approvalStatus === 'draft';
                    const isApproved = v.approvalStatus === 'approved';
                    const isBluesky = v.platform === 'bluesky';
                    const isX = v.platform === 'x';
                    const isQuora = v.platform === 'quora';

                    return (
                      <div
                        key={v.id}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 'var(--radius-md)',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span className={`badge ${isBluesky ? 'badge-bluesky' : isX ? 'badge-x' : 'badge-quora'}`} style={{ fontSize: '0.7rem' }}>
                            {v.platform.toUpperCase()}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className={`badge ${isApproved ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                              {v.approvalStatus.toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                              v{v.version}
                            </span>
                          </div>
                        </div>

                        <div style={{
                          fontSize: '0.88rem',
                          color: '#1e293b',
                          lineHeight: '1.55',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '180px',
                          overflowY: 'auto'
                        }}>
                          {v.text}
                        </div>

                        {/* Card Footer Actions */}
                        <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                            {v.text.length} chars
                          </span>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            {isDraft && userRole !== 'viewer' && (
                              <button
                                onClick={() => handleApproveVariant(v.id)}
                                disabled={approvingId === v.id}
                                className="btn"
                                style={{
                                  background: '#ecfdf5',
                                  color: '#047857',
                                  border: '1px solid #a7f3d0',
                                  padding: '4px 10px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Check size={12} /> {approvingId === v.id ? 'Approving...' : 'Approve'}
                              </button>
                            )}

                            {isQuora && v.quoraQuestionUrl && (
                              <a
                                href={v.quoraQuestionUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: '0.78rem',
                                  color: '#4f46e5',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  textDecoration: 'none'
                                }}
                              >
                                View Question <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

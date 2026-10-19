'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  Layers,
  Filter,
  Zap,
  CalendarDays,
  List
} from 'lucide-react';

interface PublishingJobView {
  id: string;
  variantId: string;
  variantText: string;
  platform: 'bluesky' | 'x' | 'quora';
  accountName: string;
  scheduledAt: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  postUrl?: string;
  errorCode?: string;
  errorDetails?: string;
}

export default function CalendarPage() {
  const [jobs, setJobs] = useState<PublishingJobView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'published' | 'failed'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'week'>('week');

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.jobs) {
        setJobs(data.jobs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 8000); // Live poll
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/retry`, { method: 'POST' });
      await res.json();
      fetchJobs();
    } catch (e) {
      console.error(e);
    } finally {
      setRetryingJobId(null);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (filter === 'scheduled') return j.status === 'scheduled';
    if (filter === 'published') return j.status === 'published';
    if (filter === 'failed') return j.status === 'failed' || j.status === 'retry_wait' || j.status === 'needs_reauthorization';
    return true;
  });

  // Days of the week for week calendar
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <DashboardLayout>
      <div className="page-header-row" style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
            Publishing Queue & Calendar
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.94rem', marginTop: '4px' }}>
            BullMQ job execution timeline, retry states, and confirmed delivery receipts.
          </p>
        </div>

        <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', border: '1px solid #e2e8f0' }}>
            <button
              onClick={() => setViewMode('week')}
              style={{
                background: viewMode === 'week' ? '#ffffff' : 'transparent',
                color: viewMode === 'week' ? '#4f46e5' : '#64748b',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: viewMode === 'week' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              <CalendarDays size={13} />
              <span>Week Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                background: viewMode === 'list' ? '#ffffff' : 'transparent',
                color: viewMode === 'list' ? '#4f46e5' : '#64748b',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              <List size={13} />
              <span>Queue List</span>
            </button>
          </div>

          <button onClick={fetchJobs} className="btn-secondary" style={{ padding: '8px 14px' }}>
            <RefreshCw size={14} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {(['all', 'scheduled', 'published', 'failed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              background: filter === tab ? '#e0e7ff' : '#f1f5f9',
              border: `1px solid ${filter === tab ? '#c7d2fe' : '#e2e8f0'}`,
              color: filter === tab ? '#4338ca' : '#64748b',
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {tab === 'failed' ? 'Failed / Retries' : tab}
          </button>
        ))}
      </div>

      {isLoading && jobs.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Loading publishing queue...
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <Calendar size={42} style={{ color: '#4f46e5', margin: '0 auto 16px' }} />
          <h3 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '1.2rem', fontWeight: 800 }}>No publishing jobs in this view</h3>
          <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.9rem' }}>
            Schedule or publish your AI-generated drafts from the Studio.
          </p>
          <a href="/" className="btn-primary">
            Go to Studio
          </a>
        </div>
      ) : viewMode === 'week' ? (
        /* Week Grid View */
        <div className="glass-panel table-responsive" style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))', gap: '14px', minWidth: '800px' }}>
            {weekDays.map((day, idx) => (
              <div
                key={day}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 10px',
                  minHeight: '340px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '8px',
                  marginBottom: '10px',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>{day}</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Slot 9:00</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  {filteredJobs.filter((_, i) => i % 7 === idx).map((job) => {
                    const isSuccess = job.status === 'published';
                    const isFailed = job.status === 'failed' || job.status === 'needs_reauthorization';

                    return (
                      <div
                        key={job.id}
                        style={{
                          background: isSuccess 
                            ? '#ecfdf5' 
                            : isFailed 
                            ? '#fef2f2' 
                            : '#f5f3ff',
                          border: `1px solid ${
                            isSuccess 
                              ? '#a7f3d0' 
                              : isFailed 
                              ? '#fecaca' 
                              : '#ddd6fe'
                          }`,
                          borderRadius: '8px',
                          padding: '10px',
                          fontSize: '0.76rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span className={`badge ${job.platform === 'bluesky' ? 'badge-bluesky' : 'badge-x'}`} style={{ fontSize: '0.65rem', padding: '2px 5px' }}>
                            {job.platform.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: isSuccess ? '#047857' : isFailed ? '#b91c1c' : '#4338ca', fontWeight: 700 }}>
                            {job.status}
                          </span>
                        </div>

                        <div style={{
                          color: '#1e293b',
                          lineHeight: '1.4',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          marginBottom: '6px'
                        }}>
                          {job.variantText}
                        </div>

                        {job.postUrl && (
                          <a
                            href={job.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'underline', fontWeight: 600 }}
                          >
                            <span>Live Post</span>
                            <ExternalLink size={10} />
                          </a>
                        )}

                        {isFailed && (
                          <button
                            onClick={() => handleRetry(job.id)}
                            style={{
                              marginTop: '6px',
                              background: '#fee2e2',
                              border: '1px solid #fca5a5',
                              color: '#b91c1c',
                              padding: '3px 6px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 600
                            }}
                          >
                            <RefreshCw size={10} />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Queue List View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredJobs.map((job) => {
            const isSuccess = job.status === 'published';
            const isFailed = job.status === 'failed' || job.status === 'needs_reauthorization';
            const isRetrying = job.status === 'retry_wait';

            return (
              <div key={job.id} className="glass-panel" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 'min(100%, 280px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <span className={`badge ${job.platform === 'bluesky' ? 'badge-bluesky' : 'badge-x'}`}>
                        {job.platform.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700 }}>
                        {job.accountName}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>•</span>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                        <Clock size={12} />
                        {new Date(job.scheduledAt).toLocaleString()}
                      </span>
                    </div>

                    <p style={{
                      fontSize: '0.92rem',
                      color: '#1e293b',
                      lineHeight: '1.55',
                      whiteSpace: 'pre-wrap',
                      marginBottom: '12px'
                    }}>
                      {job.variantText}
                    </p>

                    {job.postUrl && (
                      <a
                        href={job.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.8rem',
                          color: '#0284c7',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          textDecoration: 'underline',
                          fontWeight: 600,
                          wordBreak: 'break-all',
                          maxWidth: '100%'
                        }}
                      >
                        <span>Confirmed post URL: {job.postUrl}</span>
                        <ExternalLink size={12} />
                      </a>
                    )}

                    {job.errorDetails && (
                      <div style={{
                        marginTop: '8px',
                        fontSize: '0.78rem',
                        color: '#b91c1c',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontWeight: 500
                      }}>
                        Error [{job.errorCode}]: {job.errorDetails}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    <span className={`badge ${
                      isSuccess ? 'badge-success' : isFailed ? 'badge-danger' : isRetrying ? 'badge-warning' : 'badge-bluesky'
                    }`}>
                      {job.status.toUpperCase()}
                    </span>

                    <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                      Attempts: {job.attempts} / {job.maxAttempts}
                    </span>

                    {(isFailed || isRetrying) && (
                      <button
                        onClick={() => handleRetry(job.id)}
                        disabled={retryingJobId === job.id}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      >
                        {retryingJobId === job.id ? (
                          <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <RefreshCw size={12} />
                        )}
                        <span>Retry Now</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

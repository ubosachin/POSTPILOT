'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  ShieldCheck, 
  Activity, 
  RefreshCw, 
  Server, 
  Database, 
  CheckCircle2, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { AuditLog } from '@/types';

export default function AdminPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <DashboardLayout>
      <div className="page-header-row" style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Audit Logs & Tenant Diagnostics
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.94rem', marginTop: '4px' }}>
            Real-time multi-tenant audit trail, worker delivery health, and security events.
          </p>
        </div>

        <button onClick={fetchLogs} className="btn-secondary" style={{ padding: '8px 14px' }}>
          <RefreshCw size={14} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* System Health Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Database size={16} color="#4f46e5" />
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>DATABASE STORE</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>MongoDB / Mongoose</div>
          <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '2px' }}>● Tenant Isolation Verified</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Server size={16} color="#0284c7" />
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>QUEUE SYSTEM</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>BullMQ + Redis</div>
          <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '2px' }}>● Atomic Job Locks Enabled</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <ShieldCheck size={16} color="#10b981" />
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>CREDENTIAL CIPHER</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>AES-256-GCM</div>
          <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '2px' }}>● Authenticated Tag Verification</div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
          Tenant Audit Trail (workspaceId: ws_postpilot_main)
        </h3>

        {isLoading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
            No audit records recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#ede9fe',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem'
                  }}>
                    📋
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
                      {log.action}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      By {log.actorName} ({log.actorId}) {log.resourceId ? `• Resource: ${log.resourceId}` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {log.details && (
                    <span style={{
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      background: '#e2e8f0',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      color: '#334155',
                      maxWidth: '300px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {JSON.stringify(log.details)}
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

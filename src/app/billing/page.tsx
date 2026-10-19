'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  CreditCard, 
  Check, 
  Zap, 
  ShieldCheck, 
  AlertCircle, 
  TrendingUp,
  Flame,
  ArrowRight,
  History,
  CheckCircle2,
  Clock,
  Sparkles,
  ShoppingBag,
  RefreshCw
} from 'lucide-react';
import { SubscriptionPlanId, CreditWallet, CreditLedgerEntry, CreditPackage } from '@/types';

interface PlanInfo {
  id: SubscriptionPlanId;
  name: string;
  priceInINR: number;
  postQuota: number;
  aiDraftQuota: number;
  features: string[];
}

interface BillingData {
  currentPlan: SubscriptionPlanId;
  plans: PlanInfo[];
  usage: {
    period: string;
    aiDrafts: { current: number; limit: number };
    blueskyPosts: { current: number; limit: number };
    xPosts: { current: number; limit: number };
  };
}

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<'credits' | 'subscriptions'>('credits');
  
  // Credit engine state
  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [purchasingPkgId, setPurchasingPkgId] = useState<string | null>(null);

  // Subscriptions state
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [billingRes, creditsRes, ledgerRes] = await Promise.all([
        fetch('/api/billing'),
        fetch('/api/v1/credits'),
        fetch('/api/v1/credits/ledger'),
      ]);

      const billingData = await billingRes.json();
      const creditsData = await creditsRes.json();
      const ledgerData = await ledgerRes.json();

      setData(billingData);
      if (creditsData.success) {
        setWallet(creditsData.wallet);
        setPackages(creditsData.packages || []);
      }
      if (ledgerData.success) {
        setLedger(ledgerData.ledger || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // One-click Razorpay credit purchase simulation / checkout
  const handleBuyCredits = async (pkg: CreditPackage) => {
    setPurchasingPkgId(pkg.id);
    setSuccessMessage(null);

    try {
      // 1. Create order on server
      const orderRes = await fetch('/api/v1/payments/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error || 'Failed to create payment order');

      // 2. Complete payment verification (simulated in sandbox environment)
      const verifyRes = await fetch('/api/v1/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: orderData.order.id,
          razorpay_payment_id: `pay_${Date.now()}`,
          razorpay_signature: 'simulated_success',
          internalOrderId: orderData.order.internalOrderId,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) throw new Error(verifyData.error || 'Payment verification failed');

      setSuccessMessage(verifyData.message || `Added ${pkg.credits} credits to your wallet!`);
      fetchAllData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setPurchasingPkgId(null);
    }
  };

  const handleUpgrade = async (planId: SubscriptionPlanId) => {
    setUpgradingPlanId(planId);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const resData = await res.json();
      if (res.ok) {
        setSuccessMessage(resData.message);
        fetchAllData();
      } else {
        alert(resData.error || 'Upgrade failed');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUpgradingPlanId(null);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
        
        {/* Header */}
        <div className="page-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CreditCard size={28} color="#4f46e5" /> Credit Wallet & Billing
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '4px' }}>
              Manage your balance, purchase additional generation credits via Razorpay, and view transaction ledgers.
            </p>
          </div>

          <div className="page-header-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('credits')}
              className={`btn ${activeTab === 'credits' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 18px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Zap size={16} /> Credit Wallet ({wallet?.balance ?? 0})
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`btn ${activeTab === 'subscriptions' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 18px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <TrendingUp size={16} /> Monthly Plans & Quotas
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: '24px',
            color: '#065f46',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem'
          }}>
            <CheckCircle2 size={18} /> {successMessage}
          </div>
        )}

        {/* TAB 1: CREDIT WALLET & LEDGER */}
        {activeTab === 'credits' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Wallet Stat Cards */}
            <div className="grid-4-col-responsive">
              <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #4f46e5' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
                  AVAILABLE BALANCE
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                  {wallet?.balance ?? 0}
                  <span style={{ fontSize: '0.9rem', color: '#4f46e5', marginLeft: '6px', fontWeight: 600 }}>credits</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> Ready for generation & publishing
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
                  RESERVED CREDITS
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                  {wallet?.reservedCredits ?? 0}
                  <span style={{ fontSize: '0.9rem', color: '#d97706', marginLeft: '6px', fontWeight: 600 }}>credits</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '8px' }}>
                  Locked in active queue pipelines
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #10b981' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
                  LIFETIME PURCHASED
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                  {wallet?.lifetimePurchased ?? 0}
                  <span style={{ fontSize: '0.9rem', color: '#059669', marginLeft: '6px', fontWeight: 600 }}>credits</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '8px' }}>
                  Bonus granted: {wallet?.lifetimeGranted ?? 0}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #ec4899' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
                  LIFETIME CONSUMED
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                  {wallet?.lifetimeSpent ?? 0}
                  <span style={{ fontSize: '0.9rem', color: '#db2777', marginLeft: '6px', fontWeight: 600 }}>credits</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '8px' }}>
                  1 credit / platform variant
                </div>
              </div>
            </div>

            {/* Credit Packages Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShoppingBag size={22} color="#4f46e5" /> Buy Additional Credits
                  </h2>
                  <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '2px' }}>
                    Instant top-up verified via Razorpay checkout. Never expires.
                  </p>
                </div>
                <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                  ⚡ Razorpay Gateway Enabled
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="glass-panel"
                    style={{
                      padding: '28px',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      border: pkg.popular ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                      boxShadow: pkg.popular ? '0 10px 25px -5px rgba(79, 70, 229, 0.15)' : 'none'
                    }}
                  >
                    {pkg.badge && (
                      <div style={{
                        position: 'absolute',
                        top: '-12px',
                        right: '24px',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #ec4899 100%)',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '4px 12px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                      }}>
                        {pkg.badge}
                      </div>
                    )}

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                      {pkg.name}
                    </h3>
                    <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '6px', minHeight: '40px' }}>
                      {pkg.description}
                    </p>

                    <div style={{ margin: '20px 0' }}>
                      <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a' }}>
                        ₹{pkg.priceInr}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#4f46e5', fontWeight: 600 }}>
                        +{pkg.credits} Credits (~₹{(pkg.priceInr / pkg.credits).toFixed(2)}/credit)
                      </div>
                    </div>

                    <button
                      onClick={() => handleBuyCredits(pkg)}
                      disabled={purchasingPkgId === pkg.id}
                      className={`btn ${pkg.popular ? 'btn-primary' : 'btn-secondary'}`}
                      style={{
                        width: '100%',
                        padding: '12px',
                        marginTop: 'auto',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {purchasingPkgId === pkg.id ? 'Processing...' : (
                        <>
                          <Zap size={16} /> Purchase {pkg.credits} Credits
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Append-Only Credit Transaction Ledger */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={20} color="#4f46e5" /> Financial Transaction Ledger
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Immutable Append-Only Audit Trail ({ledger.length} entries)
                </span>
              </div>

              {ledger.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
                  No ledger transactions recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {ledger.map((entry) => {
                    const isCredit = entry.amount > 0;
                    return (
                      <div
                        key={entry.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <span className={`badge ${
                              entry.type === 'signup_grant' || entry.type === 'purchase' ? 'badge-success' :
                              entry.type === 'consumption' ? 'badge-neutral' :
                              entry.type === 'refund' ? 'badge-info' : 'badge-warning'
                            }`} style={{ fontSize: '0.65rem' }}>
                              {entry.type.toUpperCase().replace('_', ' ')}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#64748b', wordBreak: 'break-all' }}>
                              {entry.idempotencyKey}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: 600 }}>
                            {entry.description}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                            {new Date(entry.createdAt).toLocaleString()}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{
                            fontSize: '1.1rem',
                            fontWeight: 800,
                            color: isCredit ? '#059669' : '#dc2626'
                          }}>
                            {isCredit ? `+${entry.amount}` : entry.amount}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            Bal: <strong style={{ color: '#0f172a' }}>{entry.balanceAfter}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: SUBSCRIPTION PLANS & QUOTAS */}
        {activeTab === 'subscriptions' && (
          <div>
            {/* Monthly Quota Gauges */}
            <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Monthly Unit-Economic Guardrails</h2>
                  <p style={{ color: '#64748b', fontSize: '0.84rem' }}>
                    Billing Period: <strong style={{ color: '#0f172a' }}>{data?.usage.period}</strong> • Safeguards against runaway platform API costs
                  </p>
                </div>
                <span className="badge badge-success">ACTIVE SUBSCRIPTION</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '20px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.86rem', color: '#64748b' }}>AI Drafts Generated</span>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                      {data?.usage.aiDrafts.current} / {data?.usage.aiDrafts.limit}
                    </span>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, ((data?.usage.aiDrafts.current || 0) / (data?.usage.aiDrafts.limit || 1)) * 100)}%`,
                      background: 'linear-gradient(90deg, #4f46e5, #ec4899)'
                    }}></div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.86rem', color: '#64748b' }}>Bluesky Posts Published</span>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                      {data?.usage.blueskyPosts.current} / {data?.usage.blueskyPosts.limit}
                    </span>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, ((data?.usage.blueskyPosts.current || 0) / (data?.usage.blueskyPosts.limit || 1)) * 100)}%`,
                      background: '#0284c7'
                    }}></div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.86rem', color: '#64748b' }}>X (Twitter) Posts Published</span>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                      {data?.usage.xPosts.current} / {data?.usage.xPosts.limit}
                    </span>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, ((data?.usage.xPosts.current || 0) / (data?.usage.xPosts.limit || 1)) * 100)}%`,
                      background: '#0f172a'
                    }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Plans List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '24px' }}>
              {data?.plans.map((p) => {
                const isCurrent = data.currentPlan === p.id;
                return (
                  <div
                    key={p.id}
                    className="glass-panel"
                    style={{
                      padding: '32px',
                      display: 'flex',
                      flexDirection: 'column',
                      border: isCurrent ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                      position: 'relative'
                    }}
                  >
                    {isCurrent && (
                      <div style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '24px',
                        background: '#4f46e5',
                        color: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '4px 12px',
                        borderRadius: '12px'
                      }}>
                        ACTIVE PLAN
                      </div>
                    )}

                    <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a' }}>{p.name}</h3>
                    <div style={{ margin: '16px 0' }}>
                      <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0f172a' }}>₹{p.priceInINR}</span>
                      <span style={{ color: '#64748b', fontSize: '0.88rem' }}> / month</span>
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {p.features.map((f, idx) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', color: '#334155' }}>
                          <Check size={16} color="#10b981" /> {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleUpgrade(p.id)}
                      disabled={isCurrent || upgradingPlanId === p.id}
                      className={`btn ${isCurrent ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ marginTop: 'auto', width: '100%', padding: '12px' }}
                    >
                      {isCurrent ? 'Current Plan' : upgradingPlanId === p.id ? 'Upgrading...' : `Upgrade to ${p.name}`}
                    </button>
                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

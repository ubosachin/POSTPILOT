import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, hasPermission, forbiddenResponse } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';
import { SubscriptionPlanId } from '@/types';

const PLANS: Record<SubscriptionPlanId, {
  id: SubscriptionPlanId;
  name: string;
  priceInINR: number;
  postQuota: number;
  aiDraftQuota: number;
  features: string[];
}> = {
  starter: {
    id: 'starter',
    name: 'Starter Plan',
    priceInINR: 499,
    postQuota: 300,
    aiDraftQuota: 50,
    features: [
      '1 Workspace',
      'Bluesky & X Auto-Publishing',
      'Quora Manual Answer Studio',
      '300 Posts / Month',
      '50 AI Content Drafts',
      'Standard Queue',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro Publisher',
    priceInINR: 1499,
    postQuota: 900,
    aiDraftQuota: 200,
    features: [
      '1 Workspace + 3 Team Members',
      'Unlimited Social Connections',
      '900 Posts / Month',
      '200 AI Content Drafts',
      'Smart Visual Calendar & Queue',
      'Auto-Retry with Exponential Backoff',
      'Priority Publishing Worker',
    ],
  },
  agency: {
    id: 'agency',
    name: 'Agency Scale',
    priceInINR: 3999,
    postQuota: 3000,
    aiDraftQuota: 1000,
    features: [
      'Multiple Workspaces & Brands',
      'Unlimited Team Members & RBAC',
      '3,000 Posts / Month',
      '1,000 AI Content Drafts',
      'Bulk Topic CSV Upload',
      'Dedicated BullMQ Worker Isolation',
      '24/7 Priority SLA',
    ],
  },
};

export async function GET(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  const workspaceId = session.workspaceId;

  const subscription = memoryStore.subscriptions.get(workspaceId);
  const currentPeriod = new Date().toISOString().substring(0, 7);

  const aiUsage = memoryStore.usageRecords.get(`${workspaceId}_${currentPeriod}_ai_drafts`) || { quantity: 0, limit: 50 };
  const bskyUsage = memoryStore.usageRecords.get(`${workspaceId}_${currentPeriod}_bluesky_posts`) || { quantity: 0, limit: 300 };
  const xUsage = memoryStore.usageRecords.get(`${workspaceId}_${currentPeriod}_x_posts`) || { quantity: 0, limit: 300 };

  return NextResponse.json({
    success: true,
    currentPlan: subscription?.planId || 'starter',
    subscription,
    plans: Object.values(PLANS),
    usage: {
      period: currentPeriod,
      aiDrafts: { current: aiUsage.quantity, limit: subscription?.monthlyAiDraftQuota || aiUsage.limit },
      blueskyPosts: { current: bskyUsage.quantity, limit: subscription?.monthlyPostQuota || bskyUsage.limit },
      xPosts: { current: xUsage.quantity, limit: subscription?.monthlyPostQuota || xUsage.limit },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = getAuthSession(req);
    if (!session) return unauthorizedResponse();

    if (!hasPermission(session.role, 'canManageBilling')) {
      return forbiddenResponse('Forbidden: Only Workspace Owners and Admins have permission to manage billing and plans.');
    }

    const workspaceId = session.workspaceId;
    const body = await req.json();

    const planId = body.planId as SubscriptionPlanId;
    if (!planId || !PLANS[planId]) {
      return NextResponse.json({ success: false, error: 'Invalid plan selected' }, { status: 400 });
    }

    const selectedPlan = PLANS[planId];
    let subscription = memoryStore.subscriptions.get(workspaceId);

    if (subscription) {
      subscription.planId = planId;
      subscription.monthlyPostQuota = selectedPlan.postQuota;
      subscription.monthlyAiDraftQuota = selectedPlan.aiDraftQuota;
      subscription.status = 'active';
    } else {
      subscription = {
        id: `sub_${Date.now()}`,
        workspaceId,
        planId,
        provider: 'razorpay',
        providerCustomerId: `cust_rzp_${Date.now()}`,
        providerSubscriptionId: `sub_rzp_${Date.now()}`,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        monthlyPostQuota: selectedPlan.postQuota,
        monthlyAiDraftQuota: selectedPlan.aiDraftQuota,
      };
      memoryStore.subscriptions.set(workspaceId, subscription);
    }

    const ws = memoryStore.workspaces.get(workspaceId);
    if (ws) ws.planId = planId;

    memoryStore.addAuditLog({
      workspaceId,
      actorId: session?.userId || 'usr_pilot_01',
      actorName: session?.name || 'Alex Rivera',
      action: 'SUBSCRIPTION_UPGRADED',
      resourceId: subscription.id,
      details: { planId, price: selectedPlan.priceInINR },
    });

    return NextResponse.json({
      success: true,
      message: `Workspace successfully upgraded to ${selectedPlan.name}!`,
      subscription,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

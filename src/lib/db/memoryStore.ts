import { 
  User, 
  Workspace, 
  Membership, 
  SocialAccount, 
  BrandProfile, 
  ContentItem, 
  ContentVariant, 
  PublishingJob, 
  PublishResult, 
  UsageRecord, 
  Subscription, 
  AuditLog,
  CreditWallet,
  CreditLedgerEntry,
  CreditReservation,
  ContentAutomation,
  DailyTopic,
  PaymentOrder
} from '@/types';
import { encryptCredentials } from '../crypto';

export class MemoryStore {
  users: Map<string, User> = new Map();
  workspaces: Map<string, Workspace> = new Map();
  memberships: Map<string, Membership> = new Map();
  socialAccounts: Map<string, SocialAccount> = new Map();
  brandProfiles: Map<string, BrandProfile> = new Map();
  contentItems: Map<string, ContentItem> = new Map();
  contentVariants: Map<string, ContentVariant> = new Map();
  publishingJobs: Map<string, PublishingJob> = new Map();
  publishResults: Map<string, PublishResult> = new Map();
  usageRecords: Map<string, UsageRecord> = new Map();
  subscriptions: Map<string, Subscription> = new Map();
  creditWallets: Map<string, CreditWallet> = new Map();
  creditLedger: Map<string, CreditLedgerEntry> = new Map();
  creditReservations: Map<string, CreditReservation> = new Map();
  contentAutomations: Map<string, ContentAutomation> = new Map();
  dailyTopics: Map<string, DailyTopic> = new Map();
  paymentOrders: Map<string, PaymentOrder> = new Map();
  auditLogs: AuditLog[] = [];

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const defaultUserId = 'usr_pilot_01';
    const defaultWorkspaceId = 'ws_postpilot_main';

    // 1. Seed User
    this.users.set(defaultUserId, {
      id: defaultUserId,
      email: 'alex@postpilot.io',
      name: 'Alex Rivera',
      authProvider: 'local',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    // 2. Seed Workspace
    this.workspaces.set(defaultWorkspaceId, {
      id: defaultWorkspaceId,
      name: 'PostPilot Growth Lab',
      ownerId: defaultUserId,
      planId: 'pro',
      timezone: 'UTC',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    // 3. Seed Memberships & Team Accounts for RBAC testing
    this.memberships.set('mem_01', {
      id: 'mem_01',
      workspaceId: defaultWorkspaceId,
      userId: defaultUserId,
      role: 'owner',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    // Admin user (Full operations, cannot delete workspace)
    const adminUserId = 'usr_admin_01';
    this.users.set(adminUserId, {
      id: adminUserId,
      email: 'admin@postpilot.io',
      name: 'Sarah Admin',
      authProvider: 'local',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    this.memberships.set('mem_admin_01', {
      id: 'mem_admin_01',
      workspaceId: defaultWorkspaceId,
      userId: adminUserId,
      role: 'admin',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    // Editor user (Content generation & approval, no billing/social connect/admin diagnostics)
    const editorUserId = 'usr_editor_01';
    this.users.set(editorUserId, {
      id: editorUserId,
      email: 'editor@postpilot.io',
      name: 'Evan Editor',
      authProvider: 'local',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    this.memberships.set('mem_editor_01', {
      id: 'mem_editor_01',
      workspaceId: defaultWorkspaceId,
      userId: editorUserId,
      role: 'editor',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    // Viewer user (Strictly read-only, 403 on all mutations)
    const viewerUserId = 'usr_viewer_01';
    this.users.set(viewerUserId, {
      id: viewerUserId,
      email: 'viewer@postpilot.io',
      name: 'Valerie Viewer',
      authProvider: 'local',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    this.memberships.set('mem_viewer_01', {
      id: 'mem_viewer_01',
      workspaceId: defaultWorkspaceId,
      userId: viewerUserId,
      role: 'viewer',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    // 4. Seed Brand Profile
    this.brandProfiles.set(defaultWorkspaceId, {
      id: 'bp_01',
      workspaceId: defaultWorkspaceId,
      voice: 'Insightful, Visionary & Pragmatic Builder',
      audience: 'Tech Founders, Solo Developers, AI Engineers, Indie Hackers',
      topics: ['AI Autonomous Agents', 'Micro-SaaS Engineering', 'Automated Social Growth', 'TypeScript Architecture'],
      rules: ['Always lead with a hook', 'Keep X posts punchy under 260 chars', 'Provide real takeaway value', 'Bluesky post should spark discussion'],
      updatedAt: new Date(),
    });

    // 5. Seed Social Accounts (Sandbox / Live ready)
    const blueskyCreds = encryptCredentials({
      identifier: 'postpilot.bsky.social',
      password: 'demo-app-password-xyz',
      service: 'https://bsky.social',
      isSandbox: true,
    });

    this.socialAccounts.set('soc_bsky_01', {
      id: 'soc_bsky_01',
      workspaceId: defaultWorkspaceId,
      platform: 'bluesky',
      accountId: 'postpilot.bsky.social',
      displayName: 'PostPilot HQ (@bsky)',
      encryptedCredentials: blueskyCreds,
      status: 'active',
      lastVerifiedAt: new Date(),
      createdAt: new Date(),
    });

    const xCreds = encryptCredentials({
      apiKey: 'test-x-key',
      apiSecret: 'test-x-secret',
      accessToken: 'test-x-access-token',
      accessTokenSecret: 'test-x-access-secret',
      isSandbox: true,
    });

    this.socialAccounts.set('soc_x_01', {
      id: 'soc_x_01',
      workspaceId: defaultWorkspaceId,
      platform: 'x',
      accountId: 'PostPilotApp',
      displayName: 'PostPilot on X (@PostPilotApp)',
      encryptedCredentials: xCreds,
      status: 'active',
      lastVerifiedAt: new Date(),
      createdAt: new Date(),
    });

    // 6. Seed Subscription
    this.subscriptions.set(defaultWorkspaceId, {
      id: 'sub_01',
      workspaceId: defaultWorkspaceId,
      planId: 'pro',
      provider: 'razorpay',
      providerCustomerId: 'cust_rzp_123',
      providerSubscriptionId: 'sub_rzp_456',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      monthlyPostQuota: 900,
      monthlyAiDraftQuota: 200,
    });

    // 7. Seed Usage Record
    const period = new Date().toISOString().substring(0, 7);
    this.usageRecords.set(`${defaultWorkspaceId}_${period}_ai_drafts`, {
      id: `ur_1`,
      workspaceId: defaultWorkspaceId,
      period,
      metric: 'ai_drafts',
      quantity: 14,
      limit: 200,
    });

    this.usageRecords.set(`${defaultWorkspaceId}_${period}_bluesky_posts`, {
      id: `ur_2`,
      workspaceId: defaultWorkspaceId,
      period,
      metric: 'bluesky_posts',
      quantity: 8,
      limit: 450,
    });

    this.usageRecords.set(`${defaultWorkspaceId}_${period}_x_posts`, {
      id: `ur_3`,
      workspaceId: defaultWorkspaceId,
      period,
      metric: 'x_posts',
      quantity: 12,
      limit: 450,
    });

    // 8. Seed Credit Wallet
    this.creditWallets.set(defaultWorkspaceId, {
      id: `cw_${defaultWorkspaceId}`,
      workspaceId: defaultWorkspaceId,
      balance: 100, // 100 starting credits
      reservedCredits: 0,
      lifetimeGranted: 100,
      lifetimePurchased: 0,
      lifetimeSpent: 0,
      updatedAt: new Date(),
    });

    this.creditLedger.set(`cle_seed_01`, {
      id: `cle_seed_01`,
      workspaceId: defaultWorkspaceId,
      walletId: `cw_${defaultWorkspaceId}`,
      type: 'signup_grant',
      amount: 100,
      balanceAfter: 100,
      description: 'Welcome bonus on workspace creation',
      idempotencyKey: `grant_${defaultWorkspaceId}_welcome`,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    // 9. Seed Sample Automation
    this.contentAutomations.set('auto_01', {
      id: 'auto_01',
      workspaceId: defaultWorkspaceId,
      name: 'Daily Tech & AI Thought Leadership',
      topics: [
        'AI agents and distributed job queues in modern SaaS',
        'AT Protocol vs standard ActivityPub architectures',
        'TypeScript serverless scaling patterns'
      ],
      dailyInstructions: 'Keep tone technical yet accessible, include a question to spark discussion.',
      targetAudience: 'Tech Founders, Engineers & Solo Builders',
      brandVoice: 'Insightful & Pragmatic Builder',
      platforms: ['bluesky', 'x', 'quora'],
      socialAccountIds: ['soc_bsky_01', 'soc_x_01'],
      startDate: new Date().toISOString().split('T')[0],
      timezone: 'UTC',
      activeDays: [1, 2, 3, 4, 5],
      postsPerDay: 2,
      publishingTimes: ['09:00', '16:00'],
      distributionMode: 'total_slots',
      approvalMode: 'review_first',
      fallbackPolicy: 'cycle_topics',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 10. Seed Audit Log
    this.auditLogs.push({
      id: 'log_01',
      workspaceId: defaultWorkspaceId,
      actorId: defaultUserId,
      actorName: 'Alex Rivera',
      action: 'WORKSPACE_INITIALIZED',
      resourceType: 'workspace',
      resourceId: defaultWorkspaceId,
      timestamp: new Date(),
      details: { plan: 'pro', region: 'global' },
    });
  }

  // Helper query methods with tenant filtering
  getContentItems(workspaceId: string): ContentItem[] {
    return Array.from(this.contentItems.values())
      .filter((item) => item.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getContentVariants(workspaceId: string, contentItemId?: string): ContentVariant[] {
    return Array.from(this.contentVariants.values())
      .filter((v) => v.workspaceId === workspaceId && (!contentItemId || v.contentItemId === contentItemId));
  }

  getPublishingJobs(workspaceId: string): PublishingJob[] {
    return Array.from(this.publishingJobs.values())
      .filter((j) => j.workspaceId === workspaceId)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }

  getSocialAccounts(workspaceId: string): SocialAccount[] {
    return Array.from(this.socialAccounts.values())
      .filter((acc) => acc.workspaceId === workspaceId);
  }

  getCreditWallet(workspaceId: string): CreditWallet {
    let wallet = this.creditWallets.get(workspaceId);
    if (!wallet) {
      wallet = {
        id: `cw_${workspaceId}`,
        workspaceId,
        balance: 0,
        reservedCredits: 0,
        lifetimeGranted: 0,
        lifetimePurchased: 0,
        lifetimeSpent: 0,
        updatedAt: new Date(),
      };
      this.creditWallets.set(workspaceId, wallet);
    }
    return wallet;
  }

  getCreditLedger(workspaceId: string): CreditLedgerEntry[] {
    return Array.from(this.creditLedger.values())
      .filter((entry) => entry.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getContentAutomations(workspaceId: string): ContentAutomation[] {
    return Array.from(this.contentAutomations.values())
      .filter((auto) => auto.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getDailyTopics(workspaceId: string, automationId?: string): DailyTopic[] {
    return Array.from(this.dailyTopics.values())
      .filter((dt) => dt.workspaceId === workspaceId && (!automationId || dt.automationId === automationId))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  getPaymentOrders(workspaceId: string): PaymentOrder[] {
    return Array.from(this.paymentOrders.values())
      .filter((order) => order.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getAuditLogs(workspaceId: string): AuditLog[] {
    return this.auditLogs
      .filter((log) => log.workspaceId === workspaceId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>) {
    const log: AuditLog = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date(),
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    return log;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var globalMemoryStore: MemoryStore | undefined;
}

export const memoryStore: MemoryStore = globalThis.globalMemoryStore || new MemoryStore();

if (process.env.NODE_ENV !== 'production') {
  globalThis.globalMemoryStore = memoryStore;
}


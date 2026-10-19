export type Platform = 'x' | 'bluesky' | 'quora';

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

export type ContentStatus = 'draft' | 'approved' | 'scheduled' | 'publishing' | 'published' | 'failed';

export type ApprovalStatus = 'draft' | 'approved' | 'rejected';

export type PublishingJobStatus = 
  | 'scheduled' 
  | 'publishing' 
  | 'published' 
  | 'retry_wait' 
  | 'failed' 
  | 'cancelled'
  | 'needs_reauthorization';

export type SocialAccountStatus = 'active' | 'needs_reauthorization' | 'disconnected';

export type SubscriptionPlanId = 'starter' | 'pro' | 'agency';

export interface User {
  id: string;
  email: string;
  name: string;
  authProvider: 'local' | 'google' | 'github';
  createdAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  planId: SubscriptionPlanId;
  timezone: string;
  createdAt: Date;
}

export interface Membership {
  id: string;
  workspaceId: string;
  userId: string;
  role: UserRole;
  createdAt: Date;
}

export interface SocialAccount {
  id: string;
  workspaceId: string;
  platform: Platform;
  accountId: string; // handle or username
  displayName: string;
  encryptedCredentials: string; // JSON with token / app password / keys
  status: SocialAccountStatus;
  lastVerifiedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
}

export interface BrandProfile {
  id: string;
  workspaceId: string;
  voice: string; // e.g., 'Authoritative & Inspiring', 'Playful & Tech-Savvy'
  audience: string; // e.g., 'SaaS Founders, Tech Engineers, Product Managers'
  topics: string[];
  rules: string[]; // e.g., 'Never use emojis excessively', 'Include 1 clear CTA'
  updatedAt: Date;
}

export interface ContentItem {
  id: string;
  workspaceId: string;
  topic: string;
  goal: string;
  sourceText?: string;
  status: ContentStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentVariant {
  id: string;
  contentItemId: string;
  workspaceId: string;
  platform: Platform;
  text: string;
  approvalStatus: ApprovalStatus;
  version: number;
  warnings: string[];
  quoraQuestionUrl?: string;
  quoraAnswerStatus?: 'draft' | 'copied' | 'manually_published';
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishingJob {
  id: string;
  workspaceId: string;
  variantId: string;
  socialAccountId: string;
  scheduledAt: Date;
  status: PublishingJobStatus;
  attempts: number;
  maxAttempts: number;
  idempotencyKey: string;
  lockedAt?: Date;
  lockedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishResult {
  id: string;
  jobId: string;
  workspaceId: string;
  platform: Platform;
  platformPostId?: string;
  postUrl?: string;
  publishedAt?: Date;
  errorCode?: string;
  errorDetails?: string;
}

export interface UsageRecord {
  id: string;
  workspaceId: string;
  period: string; // YYYY-MM
  metric: 'ai_drafts' | 'x_posts' | 'bluesky_posts' | 'scheduled_jobs';
  quantity: number;
  limit: number;
}

export interface Subscription {
  id: string;
  workspaceId: string;
  planId: SubscriptionPlanId;
  provider: 'razorpay' | 'stripe';
  providerCustomerId: string;
  providerSubscriptionId: string;
  status: 'active' | 'past_due' | 'cancelled' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  monthlyPostQuota: number;
  monthlyAiDraftQuota: number;
}

// Credit Wallet Engine Types
export type CreditTransactionType = 
  | 'signup_grant'
  | 'purchase'
  | 'reservation'
  | 'consumption'
  | 'refund'
  | 'admin_adjustment';

export interface CreditWallet {
  id: string;
  workspaceId: string;
  balance: number;
  reservedCredits: number;
  lifetimeGranted: number;
  lifetimePurchased: number;
  lifetimeSpent: number;
  updatedAt: Date;
}

export interface CreditLedgerEntry {
  id: string;
  workspaceId: string;
  walletId: string;
  type: CreditTransactionType;
  amount: number; // positive for credit, negative for debit
  balanceAfter: number;
  description: string;
  idempotencyKey: string;
  referenceId?: string;
  createdAt: Date;
}

export interface CreditReservation {
  id: string;
  workspaceId: string;
  amount: number;
  purpose: string;
  status: 'active' | 'committed' | 'released';
  expiresAt: Date;
  createdAt: Date;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceInr: number;
  badge?: string;
  description: string;
  popular?: boolean;
}

// Automation and Daily Topics
export type AutomationApprovalMode = 'review_first' | 'auto_publish';
export type AutomationStatus = 'draft' | 'active' | 'paused' | 'completed' | 'error';
export type DistributionMode = 'total_slots' | 'per_platform';
export type FallbackPolicy = 'cycle_topics' | 'ai_variation' | 'pause';

export interface ContentAutomation {
  id: string;
  workspaceId: string;
  name: string;
  topics: string[];
  dailyInstructions?: string;
  targetAudience: string;
  brandVoice: string;
  platforms: Platform[];
  socialAccountIds: string[];
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  timezone: string;
  activeDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  postsPerDay: number;
  publishingTimes: string[]; // ["09:00", "14:00", "19:00"]
  distributionMode: DistributionMode;
  approvalMode: AutomationApprovalMode;
  fallbackPolicy: FallbackPolicy;
  status: AutomationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyTopic {
  id: string;
  workspaceId: string;
  automationId: string;
  date: string; // YYYY-MM-DD
  topic: string;
  instructions?: string;
  isUsed: boolean;
  usedAt?: Date;
  createdAt: Date;
}

export interface PaymentOrder {
  id: string;
  workspaceId: string;
  packageId: string;
  credits: number;
  amount: number; // in INR
  currency: string;
  provider: 'razorpay';
  providerOrderId: string;
  providerPaymentId?: string;
  providerSignature?: string;
  status: 'created' | 'paid' | 'failed' | 'cancelled';
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  workspaceId: string;
  actorId: string;
  actorName: string;
  action: string;
  resourceId?: string;
  resourceType?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// AI Studio Input Contract
export interface GenerateContentInput {
  workspaceId: string;
  topic: string;
  audience?: string;
  goal?: string;
  brandVoice?: string;
  sourceMaterial?: string;
  platforms: Platform[];
}

export interface GeneratedVariantResult {
  platform: Platform;
  text: string;
  status: ApprovalStatus;
  warnings: string[];
  suggestedHashtags?: string[];
  quoraQuestionUrl?: string;
}


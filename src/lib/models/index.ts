import mongoose, { Schema, Document, Model } from 'mongoose';

// 1. User Schema
export interface IUser extends Document<string> {
  _id: string;
  email: string;
  name: string;
  authProvider: string;
  avatar?: string;
  createdAt: Date;
}
const UserSchema = new Schema<IUser>({
  _id: { type: String },
  email: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  authProvider: { type: String, default: 'local' },
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// 2. Workspace Schema
export interface IWorkspace extends Document<string> {
  _id: string;
  name: string;
  ownerId: string;
  planId: string;
  timezone: string;
  createdAt: Date;
}
const WorkspaceSchema = new Schema<IWorkspace>({
  _id: { type: String },
  name: { type: String, required: true },
  ownerId: { type: String, required: true, index: true },
  planId: { type: String, default: 'starter' },
  timezone: { type: String, default: 'UTC' },
  createdAt: { type: Date, default: Date.now },
});

// 3. Membership Schema
export interface IMembership extends Document<string> {
  _id: string;
  workspaceId: string;
  userId: string;
  role: string;
  createdAt: Date;
}
const MembershipSchema = new Schema<IMembership>({
  _id: { type: String },
  workspaceId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'], default: 'editor' },
  createdAt: { type: Date, default: Date.now },
});
MembershipSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

// 4. SocialAccount Schema
export interface ISocialAccount extends Document<string> {
  _id: string;
  workspaceId: string;
  platform: 'x' | 'bluesky';
  accountId: string;
  displayName: string;
  encryptedCredentials: string;
  status: 'active' | 'needs_reauthorization' | 'disconnected';
  lastVerifiedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
}
const SocialAccountSchema = new Schema<ISocialAccount>({
  _id: { type: String },
  workspaceId: { type: String, required: true, index: true },
  platform: { type: String, required: true, enum: ['x', 'bluesky'] },
  accountId: { type: String, required: true },
  displayName: { type: String, required: true },
  encryptedCredentials: { type: String, required: true },
  status: { type: String, default: 'active', enum: ['active', 'needs_reauthorization', 'disconnected'] },
  lastVerifiedAt: { type: Date },
  errorMessage: { type: String },
  createdAt: { type: Date, default: Date.now },
});
SocialAccountSchema.index({ workspaceId: 1, platform: 1, accountId: 1 }, { unique: true });

// 5. BrandProfile Schema
export interface IBrandProfile extends Document<string> {
  _id: string;
  workspaceId: string;
  voice: string;
  audience: string;
  topics: string[];
  rules: string[];
  updatedAt: Date;
}
const BrandProfileSchema = new Schema<IBrandProfile>({
  _id: { type: String },
  workspaceId: { type: String, required: true, unique: true, index: true },
  voice: { type: String, default: 'Authoritative, Engaging & Thought-Provoking' },
  audience: { type: String, default: 'Builders, SaaS founders, Creators, Engineers' },
  topics: { type: [String], default: ['AI Innovation', 'SaaS Growth', 'Tech Trends'] },
  rules: { type: [String], default: ['No spammy hashtags', 'Engage directly with questions'] },
  updatedAt: { type: Date, default: Date.now },
});

// 6. ContentItem Schema
export interface IContentItem extends Document<string> {
  _id: string;
  workspaceId: string;
  topic: string;
  goal: string;
  sourceText?: string;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
const ContentItemSchema = new Schema<IContentItem>({
  _id: { type: String },
  workspaceId: { type: String, required: true, index: true },
  topic: { type: String, required: true },
  goal: { type: String, default: 'Audience Engagement & Thought Leadership' },
  sourceText: { type: String },
  status: { type: String, default: 'draft', enum: ['draft', 'approved', 'scheduled', 'publishing', 'published', 'failed'] },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
ContentItemSchema.index({ workspaceId: 1, createdAt: -1 });

// 7. ContentVariant Schema
export interface IContentVariant extends Document<string> {
  _id: string;
  contentItemId: string;
  workspaceId: string;
  platform: 'x' | 'bluesky' | 'quora';
  text: string;
  approvalStatus: 'draft' | 'approved' | 'rejected';
  version: number;
  warnings: string[];
  quoraQuestionUrl?: string;
  quoraAnswerStatus?: 'draft' | 'copied' | 'manually_published';
  createdAt: Date;
  updatedAt: Date;
}
const ContentVariantSchema = new Schema<IContentVariant>({
  _id: { type: String },
  contentItemId: { type: String, required: true, index: true },
  workspaceId: { type: String, required: true, index: true },
  platform: { type: String, required: true, enum: ['x', 'bluesky', 'quora'] },
  text: { type: String, required: true },
  approvalStatus: { type: String, default: 'draft', enum: ['draft', 'approved', 'rejected'] },
  version: { type: Number, default: 1 },
  warnings: { type: [String], default: [] },
  quoraQuestionUrl: { type: String },
  quoraAnswerStatus: { type: String, enum: ['draft', 'copied', 'manually_published'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
ContentVariantSchema.index({ workspaceId: 1, platform: 1 });

// 8. PublishingJob Schema
export interface IPublishingJob extends Document<string> {
  _id: string;
  workspaceId: string;
  variantId: string;
  socialAccountId: string;
  scheduledAt: Date;
  status: string;
  attempts: number;
  maxAttempts: number;
  idempotencyKey: string;
  lockedAt?: Date;
  lockedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
const PublishingJobSchema = new Schema<IPublishingJob>({
  _id: { type: String },
  workspaceId: { type: String, required: true, index: true },
  variantId: { type: String, required: true },
  socialAccountId: { type: String, required: true },
  scheduledAt: { type: Date, required: true },
  status: { 
    type: String, 
    default: 'scheduled', 
    enum: ['scheduled', 'publishing', 'published', 'retry_wait', 'failed', 'cancelled', 'needs_reauthorization'] 
  },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  idempotencyKey: { type: String, required: true, unique: true },
  lockedAt: { type: Date },
  lockedBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
PublishingJobSchema.index({ status: 1, scheduledAt: 1 });
PublishingJobSchema.index({ variantId: 1, socialAccountId: 1 }, { unique: true });

// 9. PublishResult Schema
export interface IPublishResult extends Document<string> {
  _id: string;
  jobId: string;
  workspaceId: string;
  platform: string;
  platformPostId?: string;
  postUrl?: string;
  publishedAt?: Date;
  errorCode?: string;
  errorDetails?: string;
}
const PublishResultSchema = new Schema<IPublishResult>({
  _id: { type: String },
  jobId: { type: String, required: true, index: true },
  workspaceId: { type: String, required: true, index: true },
  platform: { type: String, required: true },
  platformPostId: { type: String },
  postUrl: { type: String },
  publishedAt: { type: Date },
  errorCode: { type: String },
  errorDetails: { type: String },
});

// 10. UsageRecord Schema
export interface IUsageRecord extends Document<string> {
  _id: string;
  workspaceId: string;
  period: string; // YYYY-MM
  metric: string;
  quantity: number;
  limit: number;
}
const UsageRecordSchema = new Schema<IUsageRecord>({
  _id: { type: String },
  workspaceId: { type: String, required: true, index: true },
  period: { type: String, required: true },
  metric: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  limit: { type: Number, default: 100 },
});
UsageRecordSchema.index({ workspaceId: 1, period: 1, metric: 1 }, { unique: true });

// 11. Subscription Schema
export interface ISubscription extends Document<string> {
  _id: string;
  workspaceId: string;
  planId: string;
  provider: string;
  providerCustomerId: string;
  providerSubscriptionId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  monthlyPostQuota: number;
  monthlyAiDraftQuota: number;
}
const SubscriptionSchema = new Schema<ISubscription>({
  _id: { type: String },
  workspaceId: { type: String, required: true, unique: true, index: true },
  planId: { type: String, required: true, default: 'starter' },
  provider: { type: String, default: 'razorpay' },
  providerCustomerId: { type: String, default: '' },
  providerSubscriptionId: { type: String, default: '' },
  status: { type: String, default: 'active', enum: ['active', 'past_due', 'cancelled', 'trialing'] },
  currentPeriodStart: { type: Date, default: Date.now },
  currentPeriodEnd: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  monthlyPostQuota: { type: Number, default: 300 },
  monthlyAiDraftQuota: { type: Number, default: 50 },
});

// 12. AuditLog Schema
export interface IAuditLog extends Document<string> {
  _id: string;
  workspaceId: string;
  actorId: string;
  actorName: string;
  action: string;
  resourceId?: string;
  resourceType?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}
const AuditLogSchema = new Schema<IAuditLog>({
  _id: { type: String },
  workspaceId: { type: String, required: true, index: true },
  actorId: { type: String, required: true },
  actorName: { type: String, default: 'System' },
  action: { type: String, required: true },
  resourceId: { type: String },
  resourceType: { type: String },
  details: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now },
});
AuditLogSchema.index({ workspaceId: 1, timestamp: -1 });

// 13. CreditWallet Schema
export interface ICreditWallet extends Document<string> {
  _id: string;
  workspaceId: string;
  balance: number;
  reservedCredits: number;
  lifetimeGranted: number;
  lifetimePurchased: number;
  lifetimeSpent: number;
  updatedAt: Date;
}
const CreditWalletSchema = new Schema<ICreditWallet>({
  _id: { type: String },
  workspaceId: { type: String, required: true, unique: true, index: true },
  balance: { type: Number, required: true, default: 0 },
  reservedCredits: { type: Number, required: true, default: 0 },
  lifetimeGranted: { type: Number, required: true, default: 0 },
  lifetimePurchased: { type: Number, required: true, default: 0 },
  lifetimeSpent: { type: Number, required: true, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

// 14. CreditLedgerEntry Schema
export interface ICreditLedgerEntry extends Document<string> {
  _id: string;
  workspaceId: string;
  walletId: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  idempotencyKey: string;
  referenceId?: string;
  createdAt: Date;
}
const CreditLedgerEntrySchema = new Schema<ICreditLedgerEntry>({
  _id: { type: String },
  workspaceId: { type: String, required: true, index: true },
  walletId: { type: String, required: true, index: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['signup_grant', 'purchase', 'reservation', 'consumption', 'refund', 'admin_adjustment'] 
  },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  description: { type: String, required: true },
  idempotencyKey: { type: String, required: true, unique: true, index: true },
  referenceId: { type: String },
  createdAt: { type: Date, default: Date.now, index: true },
});
CreditLedgerEntrySchema.index({ workspaceId: 1, createdAt: -1 });

// 15. CreditReservation Schema
export interface ICreditReservation extends Document<string> {
  _id: string;
  workspaceId: string;
  amount: number;
  purpose: string;
  status: 'active' | 'committed' | 'released';
  expiresAt: Date;
  createdAt: Date;
}
const CreditReservationSchema = new Schema<ICreditReservation>({
  _id: { type: String },
  workspaceId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  purpose: { type: String, required: true },
  status: { type: String, default: 'active', enum: ['active', 'committed', 'released'], index: true },
  expiresAt: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

// 16. ContentAutomation Schema
export interface IContentAutomation extends Document<string> {
  _id: string;
  workspaceId: string;
  name: string;
  topics: string[];
  dailyInstructions?: string;
  targetAudience: string;
  brandVoice: string;
  platforms: string[];
  socialAccountIds: string[];
  startDate: string;
  endDate?: string;
  timezone: string;
  activeDays: number[];
  postsPerDay: number;
  publishingTimes: string[];
  distributionMode: string;
  approvalMode: string;
  fallbackPolicy: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
const ContentAutomationSchema = new Schema<IContentAutomation>({
  _id: { type: String },
  workspaceId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  topics: { type: [String], default: [] },
  dailyInstructions: { type: String },
  targetAudience: { type: String, required: true },
  brandVoice: { type: String, required: true },
  platforms: { type: [String], required: true },
  socialAccountIds: { type: [String], default: [] },
  startDate: { type: String, required: true },
  endDate: { type: String },
  timezone: { type: String, default: 'UTC' },
  activeDays: { type: [Number], default: [1, 2, 3, 4, 5] },
  postsPerDay: { type: Number, default: 1 },
  publishingTimes: { type: [String], default: ['09:00'] },
  distributionMode: { type: String, default: 'total_slots', enum: ['total_slots', 'per_platform'] },
  approvalMode: { type: String, default: 'review_first', enum: ['review_first', 'auto_publish'] },
  fallbackPolicy: { type: String, default: 'cycle_topics', enum: ['cycle_topics', 'ai_variation', 'pause'] },
  status: { type: String, default: 'active', enum: ['draft', 'active', 'paused', 'completed', 'error'], index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
ContentAutomationSchema.index({ workspaceId: 1, status: 1 });

// 17. DailyTopic Schema
export interface IDailyTopic extends Document<string> {
  _id: string;
  workspaceId: string;
  automationId: string;
  date: string;
  topic: string;
  instructions?: string;
  isUsed: boolean;
  usedAt?: Date;
  createdAt: Date;
}
const DailyTopicSchema = new Schema<IDailyTopic>({
  _id: { type: String },
  workspaceId: { type: String, required: true, index: true },
  automationId: { type: String, required: true, index: true },
  date: { type: String, required: true },
  topic: { type: String, required: true },
  instructions: { type: String },
  isUsed: { type: Boolean, default: false },
  usedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});
DailyTopicSchema.index({ workspaceId: 1, automationId: 1, date: 1 });

// 18. PaymentOrder Schema
export interface IPaymentOrder extends Document<string> {
  _id: string;
  workspaceId: string;
  packageId: string;
  credits: number;
  amount: number;
  currency: string;
  provider: string;
  providerOrderId: string;
  providerPaymentId?: string;
  providerSignature?: string;
  status: string;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}
const PaymentOrderSchema = new Schema<IPaymentOrder>({
  _id: { type: String },
  workspaceId: { type: String, required: true, index: true },
  packageId: { type: String, required: true },
  credits: { type: Number, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  provider: { type: String, default: 'razorpay' },
  providerOrderId: { type: String, required: true, unique: true, index: true },
  providerPaymentId: { type: String },
  providerSignature: { type: String },
  status: { type: String, default: 'created', enum: ['created', 'paid', 'failed', 'cancelled'], index: true },
  idempotencyKey: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
PaymentOrderSchema.index({ workspaceId: 1, createdAt: -1 });

// Model caching for Next.js hot reload
export const UserModel: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const WorkspaceModel: Model<IWorkspace> = mongoose.models.Workspace || mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);
export const MembershipModel: Model<IMembership> = mongoose.models.Membership || mongoose.model<IMembership>('Membership', MembershipSchema);
export const SocialAccountModel: Model<ISocialAccount> = mongoose.models.SocialAccount || mongoose.model<ISocialAccount>('SocialAccount', SocialAccountSchema);
export const BrandProfileModel: Model<IBrandProfile> = mongoose.models.BrandProfile || mongoose.model<IBrandProfile>('BrandProfile', BrandProfileSchema);
export const ContentItemModel: Model<IContentItem> = mongoose.models.ContentItem || mongoose.model<IContentItem>('ContentItem', ContentItemSchema);
export const ContentVariantModel: Model<IContentVariant> = mongoose.models.ContentVariant || mongoose.model<IContentVariant>('ContentVariant', ContentVariantSchema);
export const PublishingJobModel: Model<IPublishingJob> = mongoose.models.PublishingJob || mongoose.model<IPublishingJob>('PublishingJob', PublishingJobSchema);
export const PublishResultModel: Model<IPublishResult> = mongoose.models.PublishResult || mongoose.model<IPublishResult>('PublishResult', PublishResultSchema);
export const UsageRecordModel: Model<IUsageRecord> = mongoose.models.UsageRecord || mongoose.model<IUsageRecord>('UsageRecord', UsageRecordSchema);
export const SubscriptionModel: Model<ISubscription> = mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
export const AuditLogModel: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export const CreditWalletModel: Model<ICreditWallet> = mongoose.models.CreditWallet || mongoose.model<ICreditWallet>('CreditWallet', CreditWalletSchema);
export const CreditLedgerEntryModel: Model<ICreditLedgerEntry> = mongoose.models.CreditLedgerEntry || mongoose.model<ICreditLedgerEntry>('CreditLedgerEntry', CreditLedgerEntrySchema);
export const CreditReservationModel: Model<ICreditReservation> = mongoose.models.CreditReservation || mongoose.model<ICreditReservation>('CreditReservation', CreditReservationSchema);
export const ContentAutomationModel: Model<IContentAutomation> = mongoose.models.ContentAutomation || mongoose.model<IContentAutomation>('ContentAutomation', ContentAutomationSchema);
export const DailyTopicModel: Model<IDailyTopic> = mongoose.models.DailyTopic || mongoose.model<IDailyTopic>('DailyTopic', DailyTopicSchema);
export const PaymentOrderModel: Model<IPaymentOrder> = mongoose.models.PaymentOrder || mongoose.model<IPaymentOrder>('PaymentOrder', PaymentOrderSchema);

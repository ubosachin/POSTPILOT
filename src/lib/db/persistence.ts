import mongoose from 'mongoose';
import {
  UserModel,
  WorkspaceModel,
  MembershipModel,
  SocialAccountModel,
  BrandProfileModel,
  ContentItemModel,
  ContentVariantModel,
  PublishingJobModel,
  PublishResultModel,
  CreditWalletModel,
  CreditLedgerEntryModel,
  ContentAutomationModel,
  DailyTopicModel,
  PaymentOrderModel,
  AuditLogModel,
} from '../models';
import { memoryStore } from './memoryStore';
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
  CreditWallet,
  CreditLedgerEntry,
  ContentAutomation,
  DailyTopic,
  PaymentOrder,
  AuditLog,
} from '@/types';

class PersistenceBridge {
  private isConnected = false;
  private isHydrated = false;
  private hydrationPromise: Promise<void> | null = null;

  setConnected(connected: boolean) {
    this.isConnected = connected;
    if (connected && !this.isHydrated) {
      this.syncFromMongoDB().catch((err) => {
        console.warn('[PersistenceBridge] Initial sync error:', err.message);
      });
    }
  }

  isMongoActive(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  getIsHydrated(): boolean {
    return this.isHydrated;
  }

  private async ensureMongoActive(): Promise<boolean> {
    if (this.isMongoActive()) return true;
    try {
      const { connectToDatabase } = await import('./index');
      const res = await connectToDatabase();
      return !res.isMemoryFallback && this.isMongoActive();
    } catch {
      return false;
    }
  }

  /**
   * Synchronizes data between MongoDB and in-memory store:
   * If MongoDB is empty, seed it with default in-memory data.
   * If MongoDB has data, load all collections into in-memory store for instant zero-latency caching.
   */
  async syncFromMongoDB(): Promise<void> {
    if (!this.isMongoActive()) return;
    if (this.isHydrated) return;
    if (this.hydrationPromise) return this.hydrationPromise;

    this.hydrationPromise = (async () => {
      try {
        const userCount = await UserModel.countDocuments();

        if (userCount === 0) {
          console.log('[PersistenceBridge] MongoDB is empty. Seeding initial records from memoryStore...');
          // Seed users
          for (const user of memoryStore.users.values()) {
            await UserModel.findOneAndUpdate({ email: user.email }, { _id: user.id, ...user }, { upsert: true });
          }
          // Seed workspaces
          for (const ws of memoryStore.workspaces.values()) {
            await WorkspaceModel.findOneAndUpdate({ _id: ws.id }, { _id: ws.id, ...ws }, { upsert: true });
          }
          // Seed memberships
          for (const mem of memoryStore.memberships.values()) {
            await MembershipModel.findOneAndUpdate({ workspaceId: mem.workspaceId, userId: mem.userId }, { _id: mem.id, ...mem }, { upsert: true });
          }
          // Seed brand profiles
          for (const bp of memoryStore.brandProfiles.values()) {
            await BrandProfileModel.findOneAndUpdate({ workspaceId: bp.workspaceId }, { _id: bp.id || `bp_${bp.workspaceId}`, ...bp }, { upsert: true });
          }
          // Seed credit wallets
          for (const wallet of memoryStore.creditWallets.values()) {
            await CreditWalletModel.findOneAndUpdate({ workspaceId: wallet.workspaceId }, { _id: wallet.id || `cw_${wallet.workspaceId}`, ...wallet }, { upsert: true });
          }
          // Seed social accounts
          for (const sa of memoryStore.socialAccounts.values()) {
            await SocialAccountModel.findOneAndUpdate({ workspaceId: sa.workspaceId, platform: sa.platform, accountId: sa.accountId }, { _id: sa.id, ...sa }, { upsert: true });
          }
          console.log('[PersistenceBridge] Initial seed into MongoDB completed.');
        } else {
          console.log('[PersistenceBridge] Hydrating in-memory store from persistent MongoDB...');
          
          // 1. Hydrate users
          const users = await UserModel.find().lean();
          for (const u of users) {
            const uid = (u as any)._id?.toString() || (u as any).id;
            memoryStore.users.set(uid, {
              id: uid,
              email: u.email,
              name: u.name,
              authProvider: (u.authProvider as 'google' | 'local') || 'local',
              avatar: (u as any).avatar,
              createdAt: u.createdAt || new Date(),
            });
          }

          // 2. Hydrate workspaces
          const workspaces = await WorkspaceModel.find().lean();
          for (const ws of workspaces) {
            const wsId = (ws as any)._id?.toString() || (ws as any).id;
            memoryStore.workspaces.set(wsId, {
              id: wsId,
              name: ws.name,
              ownerId: ws.ownerId,
              planId: (ws.planId as any) || 'starter',
              timezone: ws.timezone || 'UTC',
              createdAt: ws.createdAt || new Date(),
            });
          }

          // 3. Hydrate memberships
          const memberships = await MembershipModel.find().lean();
          for (const mem of memberships) {
            const memId = (mem as any)._id?.toString() || (mem as any).id;
            memoryStore.memberships.set(memId, {
              id: memId,
              workspaceId: mem.workspaceId,
              userId: mem.userId,
              role: (mem.role as any) || 'editor',
              createdAt: mem.createdAt || new Date(),
            });
          }

          // 4. Hydrate brand profiles
          const brandProfiles = await BrandProfileModel.find().lean();
          for (const bp of brandProfiles) {
            const bpId = (bp as any)._id?.toString() || (bp as any).id;
            memoryStore.brandProfiles.set(bp.workspaceId, {
              id: bpId,
              workspaceId: bp.workspaceId,
              voice: bp.voice,
              audience: bp.audience,
              topics: bp.topics || [],
              rules: bp.rules || [],
              updatedAt: bp.updatedAt || new Date(),
            });
          }

          // 5. Hydrate social accounts
          const socialAccounts = await SocialAccountModel.find().lean();
          for (const sa of socialAccounts) {
            const saId = (sa as any)._id?.toString() || (sa as any).id;
            memoryStore.socialAccounts.set(saId, {
              id: saId,
              workspaceId: sa.workspaceId,
              platform: sa.platform as any,
              accountId: sa.accountId,
              displayName: sa.displayName,
              encryptedCredentials: sa.encryptedCredentials,
              status: sa.status as any,
              lastVerifiedAt: sa.lastVerifiedAt,
              errorMessage: sa.errorMessage,
              createdAt: sa.createdAt || new Date(),
            });
          }

          // 6. Hydrate content items
          const contentItems = await ContentItemModel.find().lean();
          for (const ci of contentItems) {
            const ciId = (ci as any)._id?.toString() || (ci as any).id;
            memoryStore.contentItems.set(ciId, {
              id: ciId,
              workspaceId: ci.workspaceId,
              topic: ci.topic,
              goal: ci.goal,
              sourceText: ci.sourceText,
              status: ci.status as any,
              createdBy: ci.createdBy,
              createdAt: ci.createdAt || new Date(),
              updatedAt: ci.updatedAt || new Date(),
            });
          }

          // 7. Hydrate content variants
          const contentVariants = await ContentVariantModel.find().lean();
          for (const cv of contentVariants) {
            const cvId = (cv as any)._id?.toString() || (cv as any).id;
            memoryStore.contentVariants.set(cvId, {
              id: cvId,
              contentItemId: cv.contentItemId,
              workspaceId: cv.workspaceId,
              platform: cv.platform as any,
              text: cv.text,
              approvalStatus: cv.approvalStatus as any,
              version: cv.version || 1,
              warnings: cv.warnings || [],
              quoraQuestionUrl: cv.quoraQuestionUrl,
              quoraAnswerStatus: cv.quoraAnswerStatus as any,
              createdAt: cv.createdAt || new Date(),
              updatedAt: cv.updatedAt || new Date(),
            });
          }

          // 8. Hydrate publishing jobs
          const publishingJobs = await PublishingJobModel.find().lean();
          for (const pj of publishingJobs) {
            const pjId = (pj as any)._id?.toString() || (pj as any).id;
            memoryStore.publishingJobs.set(pjId, {
              id: pjId,
              workspaceId: pj.workspaceId,
              variantId: pj.variantId,
              socialAccountId: pj.socialAccountId,
              scheduledAt: pj.scheduledAt,
              status: pj.status as any,
              attempts: pj.attempts || 0,
              maxAttempts: pj.maxAttempts || 5,
              idempotencyKey: pj.idempotencyKey,
              lockedAt: pj.lockedAt,
              lockedBy: pj.lockedBy,
              createdAt: pj.createdAt || new Date(),
              updatedAt: pj.updatedAt || new Date(),
            });
          }

          // 9. Hydrate credit wallets
          const wallets = await CreditWalletModel.find().lean();
          for (const w of wallets) {
            const wId = (w as any)._id?.toString() || (w as any).id;
            memoryStore.creditWallets.set(w.workspaceId, {
              id: wId,
              workspaceId: w.workspaceId,
              balance: w.balance,
              reservedCredits: w.reservedCredits || 0,
              lifetimeGranted: w.lifetimeGranted || 0,
              lifetimePurchased: w.lifetimePurchased || 0,
              lifetimeSpent: w.lifetimeSpent || 0,
              updatedAt: w.updatedAt || new Date(),
            });
          }

          // 10. Hydrate content automations
          const automations = await ContentAutomationModel.find().lean();
          for (const a of automations) {
            const aId = (a as any)._id?.toString() || (a as any).id;
            memoryStore.contentAutomations.set(aId, {
              id: aId,
              workspaceId: a.workspaceId,
              name: a.name,
              topics: a.topics || [],
              dailyInstructions: a.dailyInstructions,
              targetAudience: a.targetAudience,
              brandVoice: a.brandVoice,
              platforms: a.platforms as any,
              socialAccountIds: a.socialAccountIds || [],
              startDate: a.startDate,
              endDate: a.endDate,
              timezone: a.timezone,
              activeDays: a.activeDays || [1, 2, 3, 4, 5],
              postsPerDay: a.postsPerDay || 1,
              publishingTimes: a.publishingTimes || ['09:00'],
              distributionMode: a.distributionMode as any,
              approvalMode: a.approvalMode as any,
              fallbackPolicy: a.fallbackPolicy as any,
              status: a.status as any,
              createdAt: a.createdAt || new Date(),
              updatedAt: a.updatedAt || new Date(),
            });
          }

          // 11. Hydrate daily topics
          const dailyTopics = await DailyTopicModel.find().lean();
          for (const dt of dailyTopics) {
            const dtId = (dt as any)._id?.toString() || (dt as any).id;
            memoryStore.dailyTopics.set(dtId, {
              id: dtId,
              workspaceId: dt.workspaceId,
              automationId: dt.automationId,
              date: dt.date,
              topic: dt.topic,
              instructions: dt.instructions,
              isUsed: dt.isUsed,
              usedAt: dt.usedAt,
              createdAt: dt.createdAt || new Date(),
            });
          }

          console.log(`[PersistenceBridge] Full hydration complete: ${users.length} users, ${workspaces.length} workspaces, ${socialAccounts.length} social accounts, ${contentItems.length} content items loaded.`);
        }

        this.isHydrated = true;
      } catch (err) {
        console.warn('[PersistenceBridge] syncFromMongoDB failed:', (err as Error).message);
      } finally {
        this.hydrationPromise = null;
      }
    })();

    return this.hydrationPromise;
  }

  // --- Write-Through Persistence Helpers (Ensures MongoDB is Connected) ---

  async persistUser(user: User): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      const doc = { _id: user.id, ...user };
      await UserModel.findOneAndUpdate({ email: user.email }, doc, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting user:', (e as Error).message);
    }
  }

  async persistWorkspace(ws: Workspace): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      const doc = { _id: ws.id, ...ws };
      await WorkspaceModel.findOneAndUpdate({ _id: ws.id }, doc, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting workspace:', (e as Error).message);
    }
  }

  async persistMembership(mem: Membership): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      const doc = { _id: mem.id, ...mem };
      await MembershipModel.findOneAndUpdate({ workspaceId: mem.workspaceId, userId: mem.userId }, doc, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting membership:', (e as Error).message);
    }
  }

  async persistBrandProfile(bp: BrandProfile): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      const doc = { _id: bp.id || `bp_${bp.workspaceId}`, ...bp };
      await BrandProfileModel.findOneAndUpdate({ workspaceId: bp.workspaceId }, doc, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting brand profile:', (e as Error).message);
    }
  }

  async persistSocialAccount(acc: SocialAccount): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      const doc = { _id: acc.id, ...acc };
      await SocialAccountModel.findOneAndUpdate(
        { workspaceId: acc.workspaceId, platform: acc.platform, accountId: acc.accountId },
        doc,
        { upsert: true }
      );
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting social account:', (e as Error).message);
    }
  }

  async deleteSocialAccount(accountId: string, workspaceId: string): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      await SocialAccountModel.deleteOne({ 
        $or: [{ _id: accountId }, { accountId: accountId.replace(/^@/, '') }], 
        workspaceId 
      });
    } catch (e) {
      console.warn('[PersistenceBridge] Error deleting social account:', (e as Error).message);
    }
  }

  async persistContentItem(item: ContentItem): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      const doc = { _id: item.id, ...item };
      await ContentItemModel.findOneAndUpdate({ _id: item.id }, doc, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting content item:', (e as Error).message);
    }
  }

  async deleteContentItem(contentItemId: string, workspaceId: string): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      await ContentItemModel.deleteOne({ _id: contentItemId, workspaceId });
      await ContentVariantModel.deleteMany({ contentItemId, workspaceId });
    } catch (e) {
      console.warn('[PersistenceBridge] Error deleting content item:', (e as Error).message);
    }
  }

  async persistContentVariant(variant: ContentVariant): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      const doc = { _id: variant.id, ...variant };
      await ContentVariantModel.findOneAndUpdate({ _id: variant.id }, doc, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting content variant:', (e as Error).message);
    }
  }

  async deleteContentVariant(variantId: string, workspaceId: string): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      await ContentVariantModel.deleteOne({ _id: variantId, workspaceId });
    } catch (e) {
      console.warn('[PersistenceBridge] Error deleting content variant:', (e as Error).message);
    }
  }

  async persistPublishingJob(job: PublishingJob): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      const doc = { _id: job.id, ...job };
      await PublishingJobModel.findOneAndUpdate({ idempotencyKey: job.idempotencyKey }, doc, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting publishing job:', (e as Error).message);
    }
  }

  async persistPublishResult(res: PublishResult): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      const doc = { _id: res.id || `res_${res.jobId}`, ...res };
      await PublishResultModel.create(doc);
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting publish result:', (e as Error).message);
    }
  }

  async persistCreditWallet(wallet: CreditWallet): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      const doc = { _id: wallet.id || `cw_${wallet.workspaceId}`, ...wallet };
      await CreditWalletModel.findOneAndUpdate({ workspaceId: wallet.workspaceId }, doc, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting credit wallet:', (e as Error).message);
    }
  }

  async persistCreditLedgerEntry(entry: CreditLedgerEntry): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      const doc = { _id: entry.id, ...entry };
      await CreditLedgerEntryModel.findOneAndUpdate({ idempotencyKey: entry.idempotencyKey }, doc, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting ledger entry:', (e as Error).message);
    }
  }

  async persistContentAutomation(auto: ContentAutomation): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      const doc = { _id: auto.id, ...auto };
      await ContentAutomationModel.findOneAndUpdate({ _id: auto.id }, doc, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting automation:', (e as Error).message);
    }
  }

  async deleteContentAutomation(automationId: string, workspaceId: string): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      await ContentAutomationModel.deleteOne({ _id: automationId, workspaceId });
    } catch (e) {
      console.warn('[PersistenceBridge] Error deleting automation:', (e as Error).message);
    }
  }

  async persistDailyTopic(topic: DailyTopic): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      const doc = { _id: topic.id, ...topic };
      await DailyTopicModel.findOneAndUpdate(
        { workspaceId: topic.workspaceId, automationId: topic.automationId, date: topic.date },
        doc,
        { upsert: true }
      );
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting daily topic:', (e as Error).message);
    }
  }

  async persistPaymentOrder(order: PaymentOrder): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      const doc = { _id: order.id, ...order };
      await PaymentOrderModel.findOneAndUpdate({ idempotencyKey: order.idempotencyKey }, doc, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting payment order:', (e as Error).message);
    }
  }

  async persistAuditLog(log: AuditLog): Promise<void> {
    if (!(await this.ensureMongoActive())) return;
    try {
      const doc = { _id: log.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, ...log };
      await AuditLogModel.create(doc);
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting audit log:', (e as Error).message);
    }
  }

  // --- Query Helpers (MongoDB Atlas with memoryStore fallback & instant caching) ---

  async getSocialAccounts(workspaceId: string): Promise<SocialAccount[]> {
    if (await this.ensureMongoActive()) {
      try {
        const docs = await SocialAccountModel.find({ workspaceId }).lean();
        if (docs && docs.length > 0) {
          const accounts: SocialAccount[] = docs.map((doc: any) => ({
            id: doc._id?.toString() || doc.id,
            workspaceId: doc.workspaceId,
            platform: doc.platform as any,
            accountId: doc.accountId,
            displayName: doc.displayName,
            encryptedCredentials: doc.encryptedCredentials,
            status: doc.status as any,
            lastVerifiedAt: doc.lastVerifiedAt,
            errorMessage: doc.errorMessage,
            createdAt: doc.createdAt || new Date(),
          }));
          for (const acc of accounts) {
            memoryStore.socialAccounts.set(acc.id, acc);
          }
          return accounts;
        }
      } catch (e) {
        console.warn('[PersistenceBridge] Error querying social accounts from MongoDB:', (e as Error).message);
      }
    }
    return memoryStore.getSocialAccounts(workspaceId);
  }

  async getSocialAccount(id: string, workspaceId: string): Promise<SocialAccount | null> {
    if (await this.ensureMongoActive()) {
      try {
        const cleanId = id.replace(/^@/, '');
        const doc: any = await SocialAccountModel.findOne({
          $or: [{ _id: id }, { _id: cleanId }, { accountId: cleanId }, { accountId: id }],
          workspaceId,
        }).lean();
        if (doc) {
          const acc: SocialAccount = {
            id: doc._id?.toString() || doc.id,
            workspaceId: doc.workspaceId,
            platform: doc.platform as any,
            accountId: doc.accountId,
            displayName: doc.displayName,
            encryptedCredentials: doc.encryptedCredentials,
            status: doc.status as any,
            lastVerifiedAt: doc.lastVerifiedAt,
            errorMessage: doc.errorMessage,
            createdAt: doc.createdAt || new Date(),
          };
          memoryStore.socialAccounts.set(acc.id, acc);
          return acc;
        }
      } catch (e) {
        console.warn('[PersistenceBridge] Error querying social account from MongoDB:', (e as Error).message);
      }
    }
    const memAcc = memoryStore.socialAccounts.get(id);
    if (memAcc && memAcc.workspaceId === workspaceId) return memAcc;
    return null;
  }

  async getContentItems(workspaceId: string): Promise<ContentItem[]> {
    if (await this.ensureMongoActive()) {
      try {
        const docs = await ContentItemModel.find({ workspaceId }).sort({ createdAt: -1 }).lean();
        if (docs && docs.length > 0) {
          const items: ContentItem[] = docs.map((doc: any) => ({
            id: doc._id?.toString() || doc.id,
            workspaceId: doc.workspaceId,
            topic: doc.topic,
            goal: doc.goal,
            sourceText: doc.sourceText,
            status: doc.status as any,
            createdBy: doc.createdBy,
            createdAt: doc.createdAt || new Date(),
            updatedAt: doc.updatedAt || new Date(),
          }));
          for (const item of items) {
            memoryStore.contentItems.set(item.id, item);
          }
          return items;
        }
      } catch (e) {
        console.warn('[PersistenceBridge] Error querying content items:', (e as Error).message);
      }
    }
    return memoryStore.getContentItems(workspaceId);
  }

  async getContentVariants(workspaceId: string, contentItemId?: string): Promise<ContentVariant[]> {
    if (await this.ensureMongoActive()) {
      try {
        const filter: any = { workspaceId };
        if (contentItemId) filter.contentItemId = contentItemId;
        const docs = await ContentVariantModel.find(filter).lean();
        if (docs && docs.length > 0) {
          const variants: ContentVariant[] = docs.map((doc: any) => ({
            id: doc._id?.toString() || doc.id,
            contentItemId: doc.contentItemId,
            workspaceId: doc.workspaceId,
            platform: doc.platform as any,
            text: doc.text,
            approvalStatus: doc.approvalStatus as any,
            version: doc.version || 1,
            warnings: doc.warnings || [],
            quoraQuestionUrl: doc.quoraQuestionUrl,
            quoraAnswerStatus: doc.quoraAnswerStatus as any,
            createdAt: doc.createdAt || new Date(),
            updatedAt: doc.updatedAt || new Date(),
          }));
          for (const v of variants) {
            memoryStore.contentVariants.set(v.id, v);
          }
          return variants;
        }
      } catch (e) {
        console.warn('[PersistenceBridge] Error querying variants:', (e as Error).message);
      }
    }
    return memoryStore.getContentVariants(workspaceId, contentItemId);
  }

  async getContentAutomations(workspaceId: string): Promise<ContentAutomation[]> {
    if (await this.ensureMongoActive()) {
      try {
        const docs = await ContentAutomationModel.find({ workspaceId }).sort({ createdAt: -1 }).lean();
        if (docs && docs.length > 0) {
          const autos: ContentAutomation[] = docs.map((doc: any) => ({
            id: doc._id?.toString() || doc.id,
            workspaceId: doc.workspaceId,
            name: doc.name,
            topics: doc.topics || [],
            dailyInstructions: doc.dailyInstructions,
            targetAudience: doc.targetAudience,
            brandVoice: doc.brandVoice,
            platforms: doc.platforms as any,
            socialAccountIds: doc.socialAccountIds || [],
            startDate: doc.startDate,
            endDate: doc.endDate,
            timezone: doc.timezone,
            activeDays: doc.activeDays || [1, 2, 3, 4, 5],
            postsPerDay: doc.postsPerDay || 1,
            publishingTimes: doc.publishingTimes || ['09:00'],
            distributionMode: doc.distributionMode as any,
            approvalMode: doc.approvalMode as any,
            fallbackPolicy: doc.fallbackPolicy as any,
            status: doc.status as any,
            createdAt: doc.createdAt || new Date(),
            updatedAt: doc.updatedAt || new Date(),
          }));
          for (const a of autos) {
            memoryStore.contentAutomations.set(a.id, a);
          }
          return autos;
        }
      } catch (e) {
        console.warn('[PersistenceBridge] Error querying automations:', (e as Error).message);
      }
    }
    return memoryStore.getContentAutomations(workspaceId);
  }

  async getPublishingJobs(workspaceId: string): Promise<PublishingJob[]> {
    if (await this.ensureMongoActive()) {
      try {
        const docs = await PublishingJobModel.find({ workspaceId }).sort({ scheduledAt: 1 }).lean();
        if (docs && docs.length > 0) {
          const jobs: PublishingJob[] = docs.map((doc: any) => ({
            id: doc._id?.toString() || doc.id,
            workspaceId: doc.workspaceId,
            variantId: doc.variantId,
            socialAccountId: doc.socialAccountId,
            scheduledAt: doc.scheduledAt,
            status: doc.status as any,
            attempts: doc.attempts || 0,
            maxAttempts: doc.maxAttempts || 5,
            idempotencyKey: doc.idempotencyKey,
            lockedAt: doc.lockedAt,
            lockedBy: doc.lockedBy,
            createdAt: doc.createdAt || new Date(),
            updatedAt: doc.updatedAt || new Date(),
          }));
          for (const j of jobs) {
            memoryStore.publishingJobs.set(j.id, j);
          }
          return jobs;
        }
      } catch (e) {
        console.warn('[PersistenceBridge] Error querying publishing jobs:', (e as Error).message);
      }
    }
    return memoryStore.getPublishingJobs(workspaceId);
  }

  async getAuditLogs(workspaceId: string): Promise<AuditLog[]> {
    if (await this.ensureMongoActive()) {
      try {
        const docs = await AuditLogModel.find({ workspaceId }).sort({ timestamp: -1 }).limit(100).lean();
        if (docs && docs.length > 0) {
          return docs.map((doc: any) => ({
            id: doc._id?.toString() || doc.id,
            workspaceId: doc.workspaceId,
            actorId: doc.actorId,
            actorName: doc.actorName,
            action: doc.action,
            resourceType: doc.resourceType,
            resourceId: doc.resourceId,
            timestamp: doc.timestamp || new Date(),
            details: doc.details,
          }));
        }
      } catch (e) {
        console.warn('[PersistenceBridge] Error querying audit logs:', (e as Error).message);
      }
    }
    return memoryStore.getAuditLogs(workspaceId);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const cleanEmail = email.trim().toLowerCase();
    const memUser = Array.from(memoryStore.users.values()).find((u) => u.email.toLowerCase() === cleanEmail);
    if (memUser) return memUser;

    if (await this.ensureMongoActive()) {
      try {
        const doc: any = await UserModel.findOne({ email: cleanEmail }).lean();
        if (doc) {
          const user: User = {
            id: doc._id?.toString() || doc.id,
            email: doc.email,
            name: doc.name,
            authProvider: (doc.authProvider as any) || 'local',
            avatar: doc.avatar,
            createdAt: doc.createdAt || new Date(),
          };
          memoryStore.users.set(user.id, user);
          return user;
        }
      } catch (e) {
        console.warn('[PersistenceBridge] Error querying user by email:', (e as Error).message);
      }
    }
    return null;
  }

  async getUserById(userId: string): Promise<User | null> {
    const memUser = memoryStore.users.get(userId);
    if (memUser) return memUser;

    if (await this.ensureMongoActive()) {
      try {
        const doc: any = await UserModel.findOne({ _id: userId }).lean();
        if (doc) {
          const user: User = {
            id: doc._id?.toString() || doc.id,
            email: doc.email,
            name: doc.name,
            authProvider: (doc.authProvider as any) || 'local',
            avatar: doc.avatar,
            createdAt: doc.createdAt || new Date(),
          };
          memoryStore.users.set(user.id, user);
          return user;
        }
      } catch (e) {
        console.warn('[PersistenceBridge] Error querying user by id:', (e as Error).message);
      }
    }
    return null;
  }

  async getWorkspaceById(workspaceId: string): Promise<Workspace | null> {
    const memWs = memoryStore.workspaces.get(workspaceId);
    if (memWs) return memWs;

    if (await this.ensureMongoActive()) {
      try {
        const doc: any = await WorkspaceModel.findOne({ _id: workspaceId }).lean();
        if (doc) {
          const ws: Workspace = {
            id: doc._id?.toString() || doc.id,
            name: doc.name,
            ownerId: doc.ownerId,
            planId: (doc.planId as any) || 'starter',
            timezone: doc.timezone || 'UTC',
            createdAt: doc.createdAt || new Date(),
          };
          memoryStore.workspaces.set(ws.id, ws);
          return ws;
        }
      } catch (e) {
        console.warn('[PersistenceBridge] Error querying workspace by id:', (e as Error).message);
      }
    }
    return null;
  }

  async getMembershipByUser(userId: string): Promise<Membership | null> {
    const memMem = Array.from(memoryStore.memberships.values()).find((m) => m.userId === userId);
    if (memMem) return memMem;

    if (await this.ensureMongoActive()) {
      try {
        const doc: any = await MembershipModel.findOne({ userId }).lean();
        if (doc) {
          const m: Membership = {
            id: doc._id?.toString() || doc.id,
            workspaceId: doc.workspaceId,
            userId: doc.userId,
            role: (doc.role as any) || 'owner',
            createdAt: doc.createdAt || new Date(),
          };
          memoryStore.memberships.set(m.id, m);
          return m;
        }
      } catch (e) {
        console.warn('[PersistenceBridge] Error querying membership by user:', (e as Error).message);
      }
    }
    return null;
  }

  async getBrandProfile(workspaceId: string): Promise<BrandProfile | null> {
    const memBp = memoryStore.brandProfiles.get(workspaceId);
    if (memBp) return memBp;

    if (await this.ensureMongoActive()) {
      try {
        const doc: any = await BrandProfileModel.findOne({ workspaceId }).lean();
        if (doc) {
          const bp: BrandProfile = {
            id: doc._id?.toString() || doc.id,
            workspaceId: doc.workspaceId,
            voice: doc.voice,
            audience: doc.audience,
            topics: doc.topics || [],
            rules: doc.rules || [],
            updatedAt: doc.updatedAt || new Date(),
          };
          memoryStore.brandProfiles.set(workspaceId, bp);
          return bp;
        }
      } catch (e) {
        console.warn('[PersistenceBridge] Error querying brand profile:', (e as Error).message);
      }
    }
    return null;
  }
}

export const persistenceBridge = new PersistenceBridge();

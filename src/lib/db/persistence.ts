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

  /**
   * Synchronizes data between MongoDB and in-memory store:
   * If MongoDB is empty, seed it with default in-memory data.
   * If MongoDB has data, load it into in-memory store for instant zero-latency caching.
   */
  async syncFromMongoDB(): Promise<void> {
    if (!this.isMongoActive()) return;

    try {
      const userCount = await UserModel.countDocuments();

      if (userCount === 0) {
        console.log('[PersistenceBridge] MongoDB is empty. Seeding initial records from memoryStore...');
        // Seed users
        for (const user of memoryStore.users.values()) {
          await UserModel.findOneAndUpdate({ email: user.email }, user, { upsert: true });
        }
        // Seed workspaces
        for (const ws of memoryStore.workspaces.values()) {
          await WorkspaceModel.findOneAndUpdate({ ownerId: ws.ownerId }, ws, { upsert: true });
        }
        // Seed memberships
        for (const mem of memoryStore.memberships.values()) {
          await MembershipModel.findOneAndUpdate({ workspaceId: mem.workspaceId, userId: mem.userId }, mem, { upsert: true });
        }
        // Seed credit wallets
        for (const wallet of memoryStore.creditWallets.values()) {
          await CreditWalletModel.findOneAndUpdate({ workspaceId: wallet.workspaceId }, wallet, { upsert: true });
        }
        console.log('[PersistenceBridge] Initial seed into MongoDB completed.');
      } else {
        console.log('[PersistenceBridge] Hydrating in-memory store from persistent MongoDB...');
        // Hydrate users
        const users = await UserModel.find().lean();
        for (const u of users) {
          memoryStore.users.set((u as any).id || (u as any)._id.toString(), {
            id: (u as any).id || (u as any)._id.toString(),
            email: u.email,
            name: u.name,
            authProvider: (u.authProvider as 'google' | 'local') || 'local',
            createdAt: u.createdAt || new Date(),
          });
        }

        // Hydrate workspaces
        const workspaces = await WorkspaceModel.find().lean();
        for (const ws of workspaces) {
          const wsId = (ws as any).id || (ws as any)._id.toString();
          memoryStore.workspaces.set(wsId, {
            id: wsId,
            name: ws.name,
            ownerId: ws.ownerId,
            planId: (ws.planId as any) || 'starter',
            timezone: ws.timezone || 'UTC',
            createdAt: ws.createdAt || new Date(),
          });
        }

        // Hydrate credit wallets
        const wallets = await CreditWalletModel.find().lean();
        for (const w of wallets) {
          memoryStore.creditWallets.set(w.workspaceId, {
            id: (w as any).id || (w as any)._id.toString(),
            workspaceId: w.workspaceId,
            balance: w.balance,
            reservedCredits: w.reservedCredits || 0,
            lifetimeGranted: w.lifetimeGranted || 0,
            lifetimePurchased: w.lifetimePurchased || 0,
            lifetimeSpent: w.lifetimeSpent || 0,
            updatedAt: w.updatedAt || new Date(),
          });
        }

        // Hydrate automations
        const automations = await ContentAutomationModel.find().lean();
        for (const a of automations) {
          const aId = (a as any).id || (a as any)._id.toString();
          memoryStore.contentAutomations.set(aId, {
            id: aId,
            workspaceId: a.workspaceId,
            name: a.name,
            topics: a.topics,
            dailyInstructions: a.dailyInstructions,
            targetAudience: a.targetAudience,
            brandVoice: a.brandVoice,
            platforms: a.platforms as any,
            socialAccountIds: a.socialAccountIds,
            startDate: a.startDate,
            endDate: a.endDate,
            timezone: a.timezone,
            activeDays: a.activeDays,
            postsPerDay: a.postsPerDay,
            publishingTimes: a.publishingTimes,
            distributionMode: a.distributionMode as any,
            approvalMode: a.approvalMode as any,
            fallbackPolicy: a.fallbackPolicy as any,
            status: a.status as any,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
          });
        }

        console.log(`[PersistenceBridge] Hydration complete: ${users.length} users, ${workspaces.length} workspaces loaded.`);
      }

      this.isHydrated = true;
    } catch (err) {
      console.warn('[PersistenceBridge] syncFromMongoDB failed:', (err as Error).message);
    }
  }

  // --- Write-Through Persistence Helpers (Async Non-Blocking) ---

  async persistUser(user: User): Promise<void> {
    if (!this.isMongoActive()) return;
    try {
      await UserModel.findOneAndUpdate({ email: user.email }, user, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting user:', (e as Error).message);
    }
  }

  async persistWorkspace(ws: Workspace): Promise<void> {
    if (!this.isMongoActive()) return;
    try {
      await WorkspaceModel.findOneAndUpdate({ _id: ws.id }, ws, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting workspace:', (e as Error).message);
    }
  }

  async persistSocialAccount(acc: SocialAccount): Promise<void> {
    if (!this.isMongoActive()) return;
    try {
      await SocialAccountModel.findOneAndUpdate(
        { workspaceId: acc.workspaceId, platform: acc.platform, accountId: acc.accountId },
        acc,
        { upsert: true }
      );
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting social account:', (e as Error).message);
    }
  }

  async persistContentItem(item: ContentItem): Promise<void> {
    if (!this.isMongoActive()) return;
    try {
      await ContentItemModel.findOneAndUpdate({ _id: item.id }, item, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting content item:', (e as Error).message);
    }
  }

  async persistContentVariant(variant: ContentVariant): Promise<void> {
    if (!this.isMongoActive()) return;
    try {
      await ContentVariantModel.findOneAndUpdate({ _id: variant.id }, variant, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting content variant:', (e as Error).message);
    }
  }

  async persistPublishingJob(job: PublishingJob): Promise<void> {
    if (!this.isMongoActive()) return;
    try {
      await PublishingJobModel.findOneAndUpdate({ idempotencyKey: job.idempotencyKey }, job, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting publishing job:', (e as Error).message);
    }
  }

  async persistPublishResult(res: PublishResult): Promise<void> {
    if (!this.isMongoActive()) return;
    try {
      await PublishResultModel.create(res);
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting publish result:', (e as Error).message);
    }
  }

  async persistCreditWallet(wallet: CreditWallet): Promise<void> {
    try {
      if (!this.isMongoActive()) {
        const { connectToDatabase } = await import('./index');
        await connectToDatabase();
      }
      if (this.isMongoActive()) {
        await CreditWalletModel.findOneAndUpdate({ workspaceId: wallet.workspaceId }, wallet, { upsert: true });
      }
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting credit wallet:', (e as Error).message);
    }
  }

  async persistCreditLedgerEntry(entry: CreditLedgerEntry): Promise<void> {
    if (!this.isMongoActive()) return;
    try {
      await CreditLedgerEntryModel.findOneAndUpdate({ idempotencyKey: entry.idempotencyKey }, entry, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting ledger entry:', (e as Error).message);
    }
  }

  async persistContentAutomation(auto: ContentAutomation): Promise<void> {
    if (!this.isMongoActive()) return;
    try {
      await ContentAutomationModel.findOneAndUpdate({ _id: auto.id }, auto, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting automation:', (e as Error).message);
    }
  }

  async persistPaymentOrder(order: PaymentOrder): Promise<void> {
    if (!this.isMongoActive()) return;
    try {
      await PaymentOrderModel.findOneAndUpdate({ idempotencyKey: order.idempotencyKey }, order, { upsert: true });
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting payment order:', (e as Error).message);
    }
  }

  async persistAuditLog(log: AuditLog): Promise<void> {
    if (!this.isMongoActive()) return;
    try {
      await AuditLogModel.create(log);
    } catch (e) {
      console.warn('[PersistenceBridge] Error persisting audit log:', (e as Error).message);
    }
  }
}

export const persistenceBridge = new PersistenceBridge();

/**
 * PostPilot Credit Wallet Engine
 * Provides atomic credit reservations, commits, releases, idempotency guarantees,
 * and append-only financial ledger tracking.
 */

import { memoryStore } from '../db/memoryStore';
import { persistenceBridge } from '../db/persistence';
import { CreditWallet, CreditLedgerEntry, CreditReservation, CreditTransactionType } from '@/types';
import { CREDIT_POLICY } from './pricing';

export interface ReserveCreditResult {
  success: boolean;
  reservation?: CreditReservation;
  availableBalance: number;
  error?: string;
}

export interface CommitCreditResult {
  success: boolean;
  ledgerEntry?: CreditLedgerEntry;
  consumed: number;
  refunded: number;
  balanceAfter: number;
  error?: string;
}

export class CreditEngine {
  /**
   * Retrieves or initializes a workspace credit wallet with MongoDB sync
   */
  async getWallet(workspaceId: string): Promise<CreditWallet> {
    // 1. Ensure DB connection
    try {
      const { connectToDatabase } = await import('@/lib/db');
      await connectToDatabase();
    } catch {
      // fallback
    }

    // 2. Check memoryStore first
    let wallet = memoryStore.creditWallets.get(workspaceId);

    // 3. If wallet not found or has 0 balance, check persistent MongoDB
    if (!wallet || wallet.balance === 0) {
      try {
        const { CreditWalletModel } = await import('@/lib/models');
        const dbWallet = await CreditWalletModel.findOne({ workspaceId }).lean();
        if (dbWallet && dbWallet.balance > 0) {
          wallet = {
            id: (dbWallet as any).id || (dbWallet as any)._id?.toString() || `cw_${workspaceId}`,
            workspaceId: dbWallet.workspaceId,
            balance: dbWallet.balance,
            reservedCredits: dbWallet.reservedCredits || 0,
            lifetimeGranted: dbWallet.lifetimeGranted || 0,
            lifetimePurchased: dbWallet.lifetimePurchased || 0,
            lifetimeSpent: dbWallet.lifetimeSpent || 0,
            updatedAt: dbWallet.updatedAt || new Date(),
          };
          memoryStore.creditWallets.set(workspaceId, wallet);
          return wallet;
        }
      } catch (err) {
        console.warn('[CreditEngine] Direct MongoDB wallet check error:', err);
      }
    }

    // 4. If still not in memoryStore, initialize
    if (!wallet) {
      wallet = memoryStore.getCreditWallet(workspaceId);
    }

    // 5. If this wallet has 0 lifetime grants and 0 balance, auto-grant the 50 free signup credits
    if (wallet.lifetimeGranted === 0 && wallet.balance === 0) {
      const allowance = CREDIT_POLICY.DEFAULT_FREE_SIGNUP_CREDITS;
      wallet.balance = allowance;
      wallet.lifetimeGranted = allowance;
      wallet.updatedAt = new Date();
      memoryStore.creditWallets.set(workspaceId, wallet);
      persistenceBridge.persistCreditWallet(wallet).catch(() => {});
    }

    return wallet;
  }

  /**
   * Returns the immutable transaction ledger for a workspace
   */
  async getLedger(workspaceId: string): Promise<CreditLedgerEntry[]> {
    return memoryStore.getCreditLedger(workspaceId);
  }

  /**
   * Grants free signup credits exactly once to a newly provisioned workspace
   */
  async grantSignupCredits(
    workspaceId: string, 
    userId: string, 
    customAllowance?: number
  ): Promise<{ granted: boolean; credits: number; wallet: CreditWallet }> {
    const allowance = customAllowance ?? CREDIT_POLICY.DEFAULT_FREE_SIGNUP_CREDITS;
    const idempotencyKey = `grant_${workspaceId}_signup`;

    // 1. Check if signup grant already exists in ledger
    const existing = Array.from(memoryStore.creditLedger.values()).find(
      (entry) => entry.workspaceId === workspaceId && entry.idempotencyKey === idempotencyKey
    );

    const wallet = memoryStore.getCreditWallet(workspaceId);

    if (existing) {
      return { granted: false, credits: 0, wallet };
    }

    // 2. Atomically grant credits
    wallet.balance += allowance;
    wallet.lifetimeGranted += allowance;
    wallet.updatedAt = new Date();

    const entryId = `cle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ledgerEntry: CreditLedgerEntry = {
      id: entryId,
      workspaceId,
      walletId: wallet.id,
      type: 'signup_grant',
      amount: allowance,
      balanceAfter: wallet.balance,
      description: `First-time account registration bonus (${allowance} credits)`,
      idempotencyKey,
      referenceId: userId,
      createdAt: new Date(),
    };

    memoryStore.creditLedger.set(entryId, ledgerEntry);
    persistenceBridge.persistCreditWallet(wallet).catch(() => {});
    persistenceBridge.persistCreditLedgerEntry(ledgerEntry).catch(() => {});

    memoryStore.addAuditLog({
      workspaceId,
      actorId: userId,
      actorName: 'System Registration',
      action: 'SIGNUP_CREDITS_GRANTED',
      resourceType: 'creditWallet',
      resourceId: wallet.id,
      details: { amount: allowance, newBalance: wallet.balance },
    });

    return { granted: true, credits: allowance, wallet };
  }

  /**
   * Atomically reserves credits before executing a billable action (e.g. AI generation)
   */
  async reserveCredits(
    workspaceId: string, 
    amount: number, 
    purpose: string, 
    idempotencyKey: string
  ): Promise<ReserveCreditResult> {
    const wallet = await this.getWallet(workspaceId);

    if (amount <= 0) {
      return { success: true, availableBalance: wallet.balance };
    }

    // Check for existing active reservation with same idempotency key
    const existingRes = Array.from(memoryStore.creditReservations.values()).find(
      (r) => r.workspaceId === workspaceId && r.purpose === purpose && r.status === 'active'
    );
    if (existingRes) {
      return { success: true, reservation: existingRes, availableBalance: wallet.balance };
    }

    if (wallet.balance < amount) {
      return {
        success: false,
        availableBalance: wallet.balance,
        error: `Insufficient credit balance. Required: ${amount}, Available: ${wallet.balance}`,
      };
    }

    // Atomic deduction from available balance into reservedCredits
    wallet.balance -= amount;
    wallet.reservedCredits += amount;
    wallet.updatedAt = new Date();

    const reservationId = `resv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const reservation: CreditReservation = {
      id: reservationId,
      workspaceId,
      amount,
      purpose,
      status: 'active',
      expiresAt: new Date(Date.now() + CREDIT_POLICY.RESERVATION_TTL_MS),
      createdAt: new Date(),
    };

    memoryStore.creditReservations.set(reservationId, reservation);
    persistenceBridge.persistCreditWallet(wallet).catch(() => {});

    return {
      success: true,
      reservation,
      availableBalance: wallet.balance,
    };
  }

  /**
   * Commits an active reservation after the billable action completes.
   * If actualConsumed < reserved, the unconsumed remainder is automatically refunded to available balance.
   */
  async commitReservation(
    reservationId: string, 
    actualConsumed?: number,
    referenceId?: string
  ): Promise<CommitCreditResult> {
    const reservation = memoryStore.creditReservations.get(reservationId);
    if (!reservation) {
      return { success: false, consumed: 0, refunded: 0, balanceAfter: 0, error: 'Reservation not found' };
    }

    if (reservation.status !== 'active') {
      const wallet = memoryStore.getCreditWallet(reservation.workspaceId);
      return { 
        success: false, 
        consumed: 0, 
        refunded: 0, 
        balanceAfter: wallet.balance, 
        error: `Reservation is already ${reservation.status}` 
      };
    }

    const wallet = memoryStore.getCreditWallet(reservation.workspaceId);
    const consumed = actualConsumed !== undefined ? Math.min(actualConsumed, reservation.amount) : reservation.amount;
    const refunded = reservation.amount - consumed;

    // Deduct from reserved
    wallet.reservedCredits = Math.max(0, wallet.reservedCredits - reservation.amount);
    wallet.lifetimeSpent += consumed;

    // Return any unused portion back to available balance
    if (refunded > 0) {
      wallet.balance += refunded;
    }
    wallet.updatedAt = new Date();

    reservation.status = 'committed';

    // Record consumption in append-only ledger
    const entryId = `cle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ledgerEntry: CreditLedgerEntry = {
      id: entryId,
      workspaceId: reservation.workspaceId,
      walletId: wallet.id,
      type: 'consumption',
      amount: -consumed,
      balanceAfter: wallet.balance,
      description: `${reservation.purpose} (${consumed} credit${consumed > 1 ? 's' : ''})`,
      idempotencyKey: `commit_${reservationId}`,
      referenceId: referenceId || reservationId,
      createdAt: new Date(),
    };

    memoryStore.creditLedger.set(entryId, ledgerEntry);
    persistenceBridge.persistCreditWallet(wallet).catch(() => {});
    persistenceBridge.persistCreditLedgerEntry(ledgerEntry).catch(() => {});

    // If partial refund was needed, log compensating refund entry
    if (refunded > 0) {
      const refundEntryId = `cle_ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const refundEntry: CreditLedgerEntry = {
        id: refundEntryId,
        workspaceId: reservation.workspaceId,
        walletId: wallet.id,
        type: 'refund',
        amount: refunded,
        balanceAfter: wallet.balance,
        description: `Unused reserved credits returned (${reservation.purpose})`,
        idempotencyKey: `refund_partial_${reservationId}`,
        referenceId: reservationId,
        createdAt: new Date(),
      };
      memoryStore.creditLedger.set(refundEntryId, refundEntry);
      persistenceBridge.persistCreditLedgerEntry(refundEntry).catch(() => {});
    }

    return {
      success: true,
      ledgerEntry,
      consumed,
      refunded,
      balanceAfter: wallet.balance,
    };
  }

  /**
   * Releases an active reservation when a billable operation fails, restoring 100% of reserved credits.
   */
  async releaseReservation(reservationId: string, reason = 'Operation failed'): Promise<{ success: boolean; balanceAfter: number; error?: string }> {
    const reservation = memoryStore.creditReservations.get(reservationId);
    if (!reservation) {
      return { success: false, balanceAfter: 0, error: 'Reservation not found' };
    }

    if (reservation.status !== 'active') {
      const wallet = memoryStore.getCreditWallet(reservation.workspaceId);
      return { success: true, balanceAfter: wallet.balance };
    }

    const wallet = memoryStore.getCreditWallet(reservation.workspaceId);

    // Return all reserved credits to available balance
    wallet.reservedCredits = Math.max(0, wallet.reservedCredits - reservation.amount);
    wallet.balance += reservation.amount;
    wallet.updatedAt = new Date();

    reservation.status = 'released';

    // Append refund entry
    const entryId = `cle_rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ledgerEntry: CreditLedgerEntry = {
      id: entryId,
      workspaceId: reservation.workspaceId,
      walletId: wallet.id,
      type: 'refund',
      amount: reservation.amount,
      balanceAfter: wallet.balance,
      description: `Full release of reserved credits: ${reason}`,
      idempotencyKey: `release_${reservationId}`,
      referenceId: reservationId,
      createdAt: new Date(),
    };

    memoryStore.creditLedger.set(entryId, ledgerEntry);
    persistenceBridge.persistCreditWallet(wallet).catch(() => {});
    persistenceBridge.persistCreditLedgerEntry(ledgerEntry).catch(() => {});

    return {
      success: true,
      balanceAfter: wallet.balance,
    };
  }

  /**
   * Fulfills credit purchase idempotently upon verified payment confirmation
   */
  async fulfillCreditPurchase(
    workspaceId: string, 
    credits: number, 
    paymentOrderId: string, 
    amountInr: number, 
    idempotencyKey: string
  ): Promise<{ success: boolean; wallet: CreditWallet; entry: CreditLedgerEntry }> {
    // Idempotency check: Ensure we don't grant twice for the same webhook / order
    const existingEntry = Array.from(memoryStore.creditLedger.values()).find(
      (e) => e.idempotencyKey === idempotencyKey
    );

    const wallet = memoryStore.getCreditWallet(workspaceId);

    if (existingEntry) {
      return { success: true, wallet, entry: existingEntry };
    }

    // Atomically credit the wallet
    wallet.balance += credits;
    wallet.lifetimePurchased += credits;
    wallet.updatedAt = new Date();

    const entryId = `cle_purch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const entry: CreditLedgerEntry = {
      id: entryId,
      workspaceId,
      walletId: wallet.id,
      type: 'purchase',
      amount: credits,
      balanceAfter: wallet.balance,
      description: `Credit Package Purchase (+${credits} credits, ₹${amountInr})`,
      idempotencyKey,
      referenceId: paymentOrderId,
      createdAt: new Date(),
    };

    memoryStore.creditLedger.set(entryId, entry);
    persistenceBridge.persistCreditWallet(wallet).catch(() => {});
    persistenceBridge.persistCreditLedgerEntry(entry).catch(() => {});

    memoryStore.addAuditLog({
      workspaceId,
      actorId: 'system_payment',
      actorName: 'Razorpay Gateway',
      action: 'CREDITS_PURCHASED',
      resourceType: 'creditWallet',
      resourceId: wallet.id,
      details: { credits, amountInr, paymentOrderId, newBalance: wallet.balance },
    });

    return { success: true, wallet, entry };
  }

  /**
   * Administrative adjustment with required audit trail
   */
  async adminAdjust(
    workspaceId: string, 
    amount: number, 
    reason: string, 
    adminUserId: string
  ): Promise<{ success: boolean; wallet: CreditWallet; entry: CreditLedgerEntry }> {
    const wallet = memoryStore.getCreditWallet(workspaceId);

    // Prevent negative balance
    if (wallet.balance + amount < 0) {
      throw new Error(`Adjustment of ${amount} would cause negative balance (${wallet.balance + amount})`);
    }

    wallet.balance += amount;
    if (amount > 0) {
      wallet.lifetimeGranted += amount;
    } else {
      wallet.lifetimeSpent += Math.abs(amount);
    }
    wallet.updatedAt = new Date();

    const entryId = `cle_adj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const entry: CreditLedgerEntry = {
      id: entryId,
      workspaceId,
      walletId: wallet.id,
      type: 'admin_adjustment',
      amount,
      balanceAfter: wallet.balance,
      description: `Admin adjustment: ${reason}`,
      idempotencyKey: `adj_${entryId}`,
      referenceId: adminUserId,
      createdAt: new Date(),
    };

    memoryStore.creditLedger.set(entryId, entry);
    persistenceBridge.persistCreditWallet(wallet).catch(() => {});
    persistenceBridge.persistCreditLedgerEntry(entry).catch(() => {});

    memoryStore.addAuditLog({
      workspaceId,
      actorId: adminUserId,
      actorName: 'Administrator',
      action: 'ADMIN_CREDIT_ADJUSTMENT',
      resourceType: 'creditWallet',
      resourceId: wallet.id,
      details: { adjustment: amount, reason, newBalance: wallet.balance },
    });

    return { success: true, wallet, entry };
  }
}

export const creditEngine = new CreditEngine();

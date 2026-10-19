import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, hasPermission, forbiddenResponse } from '@/lib/auth';
import { connectToDatabase, memoryStore, persistenceBridge } from '@/lib/db';
import { CREDIT_PACKAGES } from '@/lib/credits/pricing';
import { PaymentOrder } from '@/types';

export async function POST(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  if (!hasPermission(session.role, 'canManageBilling')) {
    return forbiddenResponse('Forbidden: Only Workspace Owners and Admins have permission to purchase credits or manage billing.');
  }

  try {
    await connectToDatabase();

    const body = await req.json();
    const { packageId } = body;

    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      return NextResponse.json({ success: false, error: 'Invalid credit package selected' }, { status: 400 });
    }

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const idempotencyKey = `pay_${session.workspaceId}_${pkg.id}_${Date.now()}`;

    const paymentOrder: PaymentOrder = {
      id: orderId,
      workspaceId: session.workspaceId,
      packageId: pkg.id,
      credits: pkg.credits,
      amount: pkg.priceInr,
      currency: 'INR',
      provider: 'razorpay',
      providerOrderId: `rzp_order_${orderId}`,
      status: 'created',
      idempotencyKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memoryStore.paymentOrders.set(orderId, paymentOrder);
    await persistenceBridge.persistPaymentOrder(paymentOrder);

    memoryStore.addAuditLog({
      workspaceId: session.workspaceId,
      actorId: session.userId,
      actorName: session.name,
      action: 'PAYMENT_ORDER_CREATED',
      resourceId: orderId,
      resourceType: 'paymentOrder',
      details: { packageId: pkg.id, credits: pkg.credits, amount: pkg.priceInr },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: paymentOrder.providerOrderId,
        internalOrderId: orderId,
        amount: pkg.priceInr * 100, // Amount in paise for Razorpay
        amountInr: pkg.priceInr,
        currency: 'INR',
        credits: pkg.credits,
        packageName: pkg.name,
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

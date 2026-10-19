import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthSession, unauthorizedResponse, hasPermission, forbiddenResponse } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';
import { creditEngine } from '@/lib/credits/creditEngine';

export async function POST(req: NextRequest) {
  const session = getAuthSession(req);
  if (!session) return unauthorizedResponse();

  if (!hasPermission(session.role, 'canManageBilling')) {
    return forbiddenResponse('Forbidden: Only Workspace Owners and Admins have permission to verify payments.');
  }

  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, internalOrderId } = body;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'sampleSecret456';

    // Verify HMAC-SHA256 signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    // In sandbox test mode, allow verification with matching or simulated signature
    const isValid = 
      generatedSignature === razorpay_signature || 
      (process.env.NODE_ENV !== 'production' && razorpay_signature === 'simulated_success');

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid payment signature' }, { status: 400 });
    }

    // Find the order
    let order = Array.from(memoryStore.paymentOrders.values()).find(
      (o) => o.providerOrderId === razorpay_order_id || o.id === internalOrderId
    );

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'paid') {
      const wallet = await creditEngine.getWallet(session.workspaceId);
      return NextResponse.json({
        success: true,
        message: 'Order already fulfilled',
        credits: wallet.balance,
      });
    }

    order.status = 'paid';
    order.providerPaymentId = razorpay_payment_id;
    order.providerSignature = razorpay_signature;
    order.updatedAt = new Date();

    // Idempotently fulfill credits to wallet
    const fulfillResult = await creditEngine.fulfillCreditPurchase(
      session.workspaceId,
      order.credits,
      order.id,
      order.amount,
      order.idempotencyKey
    );

    return NextResponse.json({
      success: true,
      message: `Successfully added ${order.credits} credits to your wallet!`,
      wallet: fulfillResult.wallet,
      balance: fulfillResult.wallet.balance,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

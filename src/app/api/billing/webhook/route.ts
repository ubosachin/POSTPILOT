import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { memoryStore } from '@/lib/db/memoryStore';
import { creditEngine } from '@/lib/credits/creditEngine';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'sampleWebhookSecret789';

    if (!signature) {
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 });
    }

    // Verify HMAC-SHA256 signature using constant-time comparison
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    let isMatch = false;
    try {
      isMatch = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(signature, 'utf8')
      );
    } catch {
      isMatch = false;
    }

    if (!isMatch) {
      console.warn('[Razorpay Webhook] Invalid signature match rejected');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity || {};
    const notes = paymentEntity.notes || payload.payload?.subscription?.entity?.notes || {};
    const workspaceId = notes.workspaceId || 'ws_postpilot_main';
    const credits = notes.credits ? parseInt(notes.credits, 10) : 100;
    const amountInr = (paymentEntity.amount || 19900) / 100;
    const paymentId = paymentEntity.id || `pay_${Date.now()}`;
    const orderId = paymentEntity.order_id || `order_${Date.now()}`;

    if (event === 'payment.captured' || event === 'order.paid') {
      const idempotencyKey = `wh_rzp_${paymentId}`;

      // Idempotently fulfill purchased credits into credit wallet
      await creditEngine.fulfillCreditPurchase(
        workspaceId,
        credits,
        orderId,
        amountInr,
        idempotencyKey
      );

      memoryStore.addAuditLog({
        workspaceId,
        actorId: 'razorpay_webhook',
        actorName: 'Razorpay Billing',
        action: 'WEBHOOK_CREDIT_PURCHASE_FULFILLED',
        details: { event, paymentId, orderId, credits, amountInr },
      });
    } else if (event === 'subscription.activated') {
      const subscription = memoryStore.subscriptions.get(workspaceId);
      if (subscription) {
        subscription.status = 'active';
        subscription.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
    } else if (event === 'subscription.cancelled') {
      const subscription = memoryStore.subscriptions.get(workspaceId);
      if (subscription) {
        subscription.status = 'cancelled';
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, hasPermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';
import { regenerateSinglePlatform } from '@/lib/ai/generator';
import { creditEngine } from '@/lib/credits/creditEngine';
import { CREDIT_POLICY } from '@/lib/credits/pricing';
import { Platform } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const session = getAuthSession(req);
    if (!session) return unauthorizedResponse();

    if (!hasPermission(session.role, 'canGenerateContent')) {
      return forbiddenResponse('Forbidden: Your role does not have permission to regenerate AI content.');
    }

    const workspaceId = session.workspaceId;
    const body = await req.json();

    const { variantId, topic, platform, audience, goal, brandVoice } = body;

    if (!variantId || !platform) {
      return NextResponse.json({ success: false, error: 'variantId and platform are required' }, { status: 400 });
    }

    const variant = memoryStore.contentVariants.get(variantId);
    if (!variant || variant.workspaceId !== workspaceId) {
      return NextResponse.json({ success: false, error: 'Variant not found' }, { status: 404 });
    }

    // 1. Reserve 1 credit for regeneration
    const requiredCredits = CREDIT_POLICY.COSTS.AI_VARIANT_REGENERATE;
    const idempotencyKey = `regen_${variantId}_${Date.now()}`;
    const reserveResult = await creditEngine.reserveCredits(
      workspaceId,
      requiredCredits,
      `AI Variant Regeneration (${platform})`,
      idempotencyKey
    );

    if (!reserveResult.success) {
      return NextResponse.json({
        success: false,
        error: reserveResult.error || 'Insufficient credits to regenerate variant.',
        requiredCredits,
        availableBalance: reserveResult.availableBalance,
        needsPurchase: true,
      }, { status: 402 });
    }

    const reservationId = reserveResult.reservation!.id;

    // 2. Perform regeneration
    let generated;
    try {
      const brandProfile = memoryStore.brandProfiles.get(workspaceId);
      generated = await regenerateSinglePlatform(
        {
          workspaceId,
          topic: topic || 'Tech Innovation',
          audience: audience || brandProfile?.audience,
          goal: goal || 'Thought Leadership',
          brandVoice: brandVoice || brandProfile?.voice,
          platforms: [platform as Platform],
        },
        platform as Platform
      );
    } catch (genErr) {
      await creditEngine.releaseReservation(reservationId, (genErr as Error).message);
      throw genErr;
    }

    // 3. Commit credit consumption
    const commitResult = await creditEngine.commitReservation(reservationId, requiredCredits, variantId);

    // 4. Update variant
    variant.text = generated.text;
    variant.warnings = generated.warnings;
    variant.version += 1;
    variant.approvalStatus = 'draft';
    variant.updatedAt = new Date();

    memoryStore.addAuditLog({
      workspaceId,
      actorId: session?.userId || 'usr_pilot_01',
      actorName: session?.name || 'Alex Rivera',
      action: 'VARIANT_REGENERATED',
      resourceId: variantId,
      resourceType: 'contentVariant',
      details: { platform, newVersion: variant.version, balanceRemaining: commitResult.balanceAfter },
    });

    return NextResponse.json({
      success: true,
      variant,
      creditsConsumed: requiredCredits,
      balanceRemaining: commitResult.balanceAfter,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

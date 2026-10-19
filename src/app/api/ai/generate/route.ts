import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, unauthorizedResponse, forbiddenResponse, hasPermission } from '@/lib/auth';
import { memoryStore } from '@/lib/db/memoryStore';
import { persistenceBridge } from '@/lib/db/persistence';
import { generateVariants } from '@/lib/ai/generator';
import { creditEngine } from '@/lib/credits/creditEngine';
import { CREDIT_POLICY } from '@/lib/credits/pricing';
import { ContentItem, ContentVariant, Platform } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const session = getAuthSession(req);
    if (!session) {
      return unauthorizedResponse('Authentication required. Please log in.');
    }
    if (!hasPermission(session.role, 'canGenerateContent')) {
      return forbiddenResponse('Viewers do not have permission to generate content. Please contact an admin.');
    }
    const workspaceId = session.workspaceId;
    const body = await req.json();

    const topic = body.topic?.trim();
    if (!topic) {
      return NextResponse.json({ success: false, error: 'Topic is required' }, { status: 400 });
    }

    const platforms: Platform[] = Array.isArray(body.platforms) && body.platforms.length > 0 
      ? body.platforms 
      : ['bluesky', 'x', 'quora'];

    // 1. Calculate required credits
    const requiredCredits = platforms.length * CREDIT_POLICY.COSTS.AI_VARIANT_GENERATION;
    const idempotencyKey = `gen_${workspaceId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 2. Atomically reserve credits
    const reserveResult = await creditEngine.reserveCredits(
      workspaceId,
      requiredCredits,
      `AI Content Generation (${platforms.join(', ')})`,
      idempotencyKey
    );

    if (!reserveResult.success) {
      return NextResponse.json({
        success: false,
        error: reserveResult.error || 'Insufficient credit balance to generate content.',
        requiredCredits,
        availableBalance: reserveResult.availableBalance,
        needsPurchase: true,
      }, { status: 402 });
    }

    const reservationId = reserveResult.reservation!.id;

    // 3. Load workspace brand profile defaults
    const brandProfile = memoryStore.brandProfiles.get(workspaceId);
    const audience = body.audience || brandProfile?.audience || 'Tech Builders & SaaS Founders';
    const brandVoice = body.brandVoice || brandProfile?.voice || 'Direct, Pragmatic & Insightful';
    const goal = body.goal || 'Thought Leadership & Audience Engagement';
    const sourceMaterial = body.sourceMaterial || '';

    // 4. Generate platform-tailored variants
    let generated;
    try {
      generated = await generateVariants({
        workspaceId,
        topic,
        audience,
        goal,
        brandVoice,
        sourceMaterial,
        platforms,
      });
    } catch (genErr) {
      // In case of error during AI generation, release 100% of reserved credits
      await creditEngine.releaseReservation(reservationId, (genErr as Error).message);
      throw genErr;
    }

    // 5. Commit credit consumption
    const actualConsumed = generated.length * CREDIT_POLICY.COSTS.AI_VARIANT_GENERATION;
    const commitResult = await creditEngine.commitReservation(reservationId, actualConsumed);

    // 6. Save ContentItem
    const contentItemId = `ci_${Date.now()}`;
    const contentItem: ContentItem = {
      id: contentItemId,
      workspaceId,
      topic,
      goal,
      sourceText: sourceMaterial,
      status: 'draft',
      createdBy: session?.userId || 'usr_pilot_01',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.contentItems.set(contentItemId, contentItem);
    persistenceBridge.persistContentItem(contentItem).catch(() => {});

    // 7. Save ContentVariants
    const savedVariants: ContentVariant[] = [];
    for (const g of generated) {
      const variantId = `cv_${Date.now()}_${g.platform}`;
      const variant: ContentVariant = {
        id: variantId,
        contentItemId,
        workspaceId,
        platform: g.platform,
        text: g.text,
        approvalStatus: 'draft',
        version: 1,
        warnings: g.warnings,
        quoraQuestionUrl: g.quoraQuestionUrl,
        quoraAnswerStatus: g.platform === 'quora' ? 'draft' : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryStore.contentVariants.set(variantId, variant);
      persistenceBridge.persistContentVariant(variant).catch(() => {});
      savedVariants.push(variant);
    }

    // 8. Audit log
    memoryStore.addAuditLog({
      workspaceId,
      actorId: session?.userId || 'usr_pilot_01',
      actorName: session?.name || 'Alex Rivera',
      action: 'AI_VARIANTS_GENERATED',
      resourceId: contentItemId,
      resourceType: 'contentItem',
      details: { 
        topic, 
        platforms, 
        variantsCount: savedVariants.length,
        creditsConsumed: actualConsumed,
        balanceRemaining: commitResult.balanceAfter
      },
    });

    return NextResponse.json({
      success: true,
      contentItem,
      variants: savedVariants,
      creditsConsumed: actualConsumed,
      balanceRemaining: commitResult.balanceAfter,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

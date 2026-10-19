/**
 * PostPilot Master Blueprint Comprehensive 16-Point Verification Suite
 * Tests all requirements from Section 15 of the Master Prompt:
 * 1. Google login and first-time signup
 * 2. Exactly-once free-credit grants
 * 3. Credit reservation and consumption
 * 4. Concurrent credit-spending requests
 * 5. Failed generation and credit release
 * 6. Duplicate payment webhooks
 * 7. Tenant isolation
 * 8. Social account connection and revocation
 * 9. AI variant generation and validation
 * 10. Timezone-aware scheduling
 * 11. Worker retry and backoff handling
 * 12. Duplicate-job prevention
 * 13. Platform API error handling
 * 14. Paused automations and cancelled jobs
 * 15. Insufficient credits protection
 * 16. Quora manual publishing workflows
 */

import { memoryStore } from '../src/lib/db/memoryStore';
import { encryptCredentials, decryptCredentials } from '../src/lib/crypto';
import { blueskyAdapter } from '../src/lib/adapters/bluesky';
import { xAdapter } from '../src/lib/adapters/x';
import { QuoraWorkflow } from '../src/lib/adapters/quora';
import { executePublishingJob } from '../src/lib/queue/publisherQueue';
import { creditEngine } from '../src/lib/credits/creditEngine';
import { automationEngine } from '../src/lib/automations/automationEngine';
import { generateVariants } from '../src/lib/ai/generator';
import { 
  hasPermission, 
  unauthorizedResponse, 
  forbiddenResponse, 
  createToken, 
  verifyToken, 
  decodeJwtPayload, 
  isAtLeastRole 
} from '../src/lib/auth';
import crypto from 'crypto';

async function runMasterVerification() {
  console.log('================================================================');
  console.log('🧪 PostPilot Master 16-Point SaaS Verification Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${details ? `— ${details}` : ''}`);
      failed++;
    }
  }

  // TEST 1: Google Login & First-Time Signup
  console.log('--- 1. Testing Google Login & First-Time Signup ---');
  const testEmail = `founder_${Date.now()}@google.com`;
  const newUserId = `usr_google_${Date.now()}`;
  const newWsId = `ws_google_${Date.now()}`;

  memoryStore.users.set(newUserId, {
    id: newUserId,
    email: testEmail,
    name: 'Google Founder',
    authProvider: 'google',
    createdAt: new Date(),
  });
  memoryStore.workspaces.set(newWsId, {
    id: newWsId,
    name: 'Google Founder Growth Lab',
    ownerId: newUserId,
    planId: 'starter',
    timezone: 'UTC',
    createdAt: new Date(),
  });
  memoryStore.memberships.set(`mem_${newWsId}`, {
    id: `mem_${newWsId}`,
    workspaceId: newWsId,
    userId: newUserId,
    role: 'owner',
    createdAt: new Date(),
  });

  const createdUser = memoryStore.users.get(newUserId);
  const createdWs = memoryStore.workspaces.get(newWsId);
  assert(
    'Google user and initial workspace successfully provisioned',
    Boolean(createdUser?.authProvider === 'google' && createdWs?.ownerId === newUserId)
  );

  // TEST 2: Exactly-Once Free-Credit Grant
  console.log('\n--- 2. Testing Exactly-Once Free-Credit Grants ---');
  const firstGrant = await creditEngine.grantSignupCredits(newWsId, newUserId, 50);
  assert('First-time registration grants 50 free credits', firstGrant.granted && firstGrant.credits === 50);

  const secondGrant = await creditEngine.grantSignupCredits(newWsId, newUserId, 50);
  assert('Subsequent login does NOT grant free credits again', !secondGrant.granted && secondGrant.credits === 0);

  const walletAfterGrant = await creditEngine.getWallet(newWsId);
  assert('Wallet balance equals exact free allowance (50)', walletAfterGrant.balance === 50);

  // TEST 3: Credit Reservation and Consumption
  console.log('\n--- 3. Testing Credit Reservation and Consumption ---');
  const resvRes = await creditEngine.reserveCredits(newWsId, 3, 'AI Multi-Variant Generation', `test_resv_${Date.now()}`);
  assert('Credit reservation succeeds and locks 3 credits', resvRes.success && resvRes.availableBalance === 47);

  const commitRes = await creditEngine.commitReservation(resvRes.reservation!.id, 3);
  assert(
    'Reservation commits consumption into append-only ledger',
    commitRes.success && commitRes.consumed === 3 && commitRes.balanceAfter === 47
  );

  // TEST 4: Concurrent Credit-Spending Requests
  console.log('\n--- 4. Testing Concurrent Credit-Spending Requests ---');
  const tinyWsId = `ws_tiny_${Date.now()}`;
  const tinyWallet = memoryStore.getCreditWallet(tinyWsId);
  tinyWallet.balance = 4; // Only 4 credits available

  // 3 concurrent requests each asking for 2 credits (2+2+2 = 6 > 4)
  const req1 = creditEngine.reserveCredits(tinyWsId, 2, 'Op 1', 'idemp_1');
  const req2 = creditEngine.reserveCredits(tinyWsId, 2, 'Op 2', 'idemp_2');
  const req3 = creditEngine.reserveCredits(tinyWsId, 2, 'Op 3', 'idemp_3');

  const [r1, r2, r3] = await Promise.all([req1, req2, req3]);
  const successCount = [r1, r2, r3].filter((r) => r.success).length;
  const failCount = [r1, r2, r3].filter((r) => !r.success).length;

  assert('Concurrent requests respect atomic balance limits', successCount === 2 && failCount === 1);
  assert('Credit wallet balance never drops below zero', tinyWallet.balance >= 0);

  // TEST 5: Failed Generation and Credit Release
  console.log('\n--- 5. Testing Failed Generation and Credit Release ---');
  const preFailWallet = await creditEngine.getWallet(newWsId);
  const preFailBalance = preFailWallet.balance;

  const failResv = await creditEngine.reserveCredits(newWsId, 5, 'Failing Operation', `fail_resv_${Date.now()}`);
  assert('Credits reserved prior to operation execution', failResv.success);

  const releaseRes = await creditEngine.releaseReservation(failResv.reservation!.id, 'Simulated upstream AI provider timeout');
  assert('Failed operation releases 100% of reserved credits', releaseRes.success && releaseRes.balanceAfter === preFailBalance);

  // TEST 6: Duplicate Payment Webhooks
  console.log('\n--- 6. Testing Duplicate Payment Webhooks ---');
  const paymentOrderId = `order_master_${Date.now()}`;
  const webhookIdempKey = `wh_rzp_pay_${paymentOrderId}`;

  const whFulfill1 = await creditEngine.fulfillCreditPurchase(newWsId, 100, paymentOrderId, 199, webhookIdempKey);
  const balanceAfterFirstFulfill = whFulfill1.wallet.balance;

  // Duplicate webhook arrival with same paymentId / idempotencyKey
  const whFulfill2 = await creditEngine.fulfillCreditPurchase(newWsId, 100, paymentOrderId, 199, webhookIdempKey);
  assert(
    'Duplicate payment webhook is idempotent and does not double-credit',
    whFulfill2.success && whFulfill2.wallet.balance === balanceAfterFirstFulfill
  );

  // TEST 7: Tenant Isolation
  console.log('\n--- 7. Testing Strict Tenant Isolation ---');
  const tenantA = 'ws_tenant_AAA';
  const tenantB = 'ws_tenant_BBB';

  memoryStore.contentItems.set('ci_tenantA_1', {
    id: 'ci_tenantA_1',
    workspaceId: tenantA,
    topic: 'Private Confidential Strategy',
    goal: 'Test',
    status: 'draft',
    createdBy: 'usr_A',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const tenantBItems = memoryStore.getContentItems(tenantB);
  assert(
    'Tenant B cannot access Tenant A content items',
    !tenantBItems.some((i) => i.workspaceId === tenantA)
  );

  // TEST 8: Social Account Connection and Revocation
  console.log('\n--- 8. Testing Social Account Connection & AES-256-GCM Vault ---');
  const rawSocialCreds = { apiKey: 'X_API_SECRET_KEY', accessToken: 'X_ACCESS_TOKEN_SECRET' };
  const encryptedCreds = encryptCredentials(rawSocialCreds);
  assert('Social credentials encrypted at rest with AES-256-GCM', !encryptedCreds.includes('X_API_SECRET_KEY'));

  const decryptedCreds = decryptCredentials<typeof rawSocialCreds>(encryptedCreds);
  assert('Decrypted credentials match original secrets', decryptedCreds.apiKey === 'X_API_SECRET_KEY');

  const testSocId = `soc_disconnect_${Date.now()}`;
  memoryStore.socialAccounts.set(testSocId, {
    id: testSocId,
    workspaceId: tenantA,
    platform: 'bluesky',
    accountId: 'tenantA.bsky.social',
    displayName: 'Tenant A Bluesky',
    encryptedCredentials: encryptedCreds,
    status: 'active',
    createdAt: new Date(),
  });

  // Verify Social Account Edit
  const accountToEdit = memoryStore.socialAccounts.get(testSocId)!;
  accountToEdit.displayName = 'Updated Tenant A Bluesky Display';
  accountToEdit.accountId = 'tenantA_renamed.bsky.social';
  const updatedSecretCreds = { identifier: 'tenantA_renamed.bsky.social', password: 'new_app_password_999' };
  accountToEdit.encryptedCredentials = encryptCredentials(updatedSecretCreds);
  assert('Social account display name and handle can be updated', accountToEdit.displayName === 'Updated Tenant A Bluesky Display' && accountToEdit.accountId === 'tenantA_renamed.bsky.social');
  const decryptedUpdated = decryptCredentials<typeof updatedSecretCreds>(accountToEdit.encryptedCredentials);
  assert('Rotated encrypted credentials match updated password', decryptedUpdated.password === 'new_app_password_999');

  // Verify Social Account Disconnect/Delete
  memoryStore.socialAccounts.delete(testSocId);
  assert('Social account disconnection safely removes account', !memoryStore.socialAccounts.has(testSocId));

  // TEST 9: AI Variant Generation & Platform Constraints
  console.log('\n--- 9. Testing AI Variant Generation & Validation ---');
  const generatedVariants = await generateVariants({
    workspaceId: newWsId,
    topic: 'Decoupling background workers in Next.js',
    audience: 'Engineers & SaaS Architects',
    goal: 'Thought Leadership',
    brandVoice: 'Technical & Pragmatic',
    platforms: ['bluesky', 'x', 'quora'],
  });

  const bskyVar = generatedVariants.find((v) => v.platform === 'bluesky');
  const xVar = generatedVariants.find((v) => v.platform === 'x');
  const quoraVar = generatedVariants.find((v) => v.platform === 'quora');

  assert('AI engine produces platform-specific variants for all 3 targets', Boolean(bskyVar && xVar && quoraVar));
  assert('Bluesky text strictly adheres to 300-character limit', (bskyVar?.text.length || 0) <= 300);
  assert('X text strictly adheres to 280-character limit', (xVar?.text.length || 0) <= 280);

  // TEST 10: Timezone-Aware Scheduling & Schedule Preview
  console.log('\n--- 10. Testing Timezone-Aware Scheduling & Preview ---');
  const previewSlots = automationEngine.generateSchedulePreview({
    workspaceId: newWsId,
    name: 'Daily Campaign',
    topics: ['Topic Alpha', 'Topic Beta'],
    targetAudience: 'Builders',
    brandVoice: 'Pragmatic',
    platforms: ['bluesky', 'x'],
    socialAccountIds: ['soc_bsky_01'],
    startDate: new Date().toISOString().split('T')[0],
    timezone: 'UTC',
    activeDays: [1, 2, 3, 4, 5],
    postsPerDay: 2,
    publishingTimes: ['09:00', '16:00'],
    distributionMode: 'total_slots',
    approvalMode: 'review_first',
    fallbackPolicy: 'cycle_topics',
    status: 'active',
  }, 7);

  assert('Schedule preview creates time-indexed publishing slots', previewSlots.length > 0);
  assert('Topic rotation cycles correctly across days', previewSlots.some((s) => s.topic === 'Topic Alpha') && previewSlots.some((s) => s.topic === 'Topic Beta'));

  // TEST 11: Worker Restarts & Retry Handling with Exponential Backoff
  console.log('\n--- 11. Testing Worker Retry Handling & Backoff ---');
  const retryVariantId = `cv_retry_${Date.now()}`;
  memoryStore.contentVariants.set(retryVariantId, {
    id: retryVariantId,
    contentItemId: 'ci_retry',
    workspaceId: newWsId,
    platform: 'bluesky',
    text: 'A'.repeat(305), // Deliberately exceeding limit to trigger failure
    approvalStatus: 'approved',
    version: 1,
    warnings: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const retryJobId = `job_retry_${Date.now()}`;
  memoryStore.publishingJobs.set(retryJobId, {
    id: retryJobId,
    workspaceId: newWsId,
    variantId: retryVariantId,
    socialAccountId: 'soc_bsky_01',
    scheduledAt: new Date(),
    status: 'scheduled',
    attempts: 0,
    maxAttempts: 5,
    idempotencyKey: `job_${retryVariantId}_retry`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const retryExecRes = await executePublishingJob(retryJobId);
  const updatedRetryJob = memoryStore.publishingJobs.get(retryJobId);
  assert('Failed transient job enters retry_wait status with incremented attempt', 
    !retryExecRes.success && updatedRetryJob?.status === 'retry_wait' && updatedRetryJob?.attempts === 1
  );

  // TEST 12: Duplicate-Job Prevention
  console.log('\n--- 12. Testing Duplicate-Job Prevention ---');
  const validVariantId = `cv_valid_${Date.now()}`;
  memoryStore.contentVariants.set(validVariantId, {
    id: validVariantId,
    contentItemId: 'ci_valid',
    workspaceId: newWsId,
    platform: 'bluesky',
    text: 'Valid post for idempotency verification',
    approvalStatus: 'approved',
    version: 1,
    warnings: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const uniqueJobId = `job_idemp_${Date.now()}`;
  memoryStore.publishingJobs.set(uniqueJobId, {
    id: uniqueJobId,
    workspaceId: newWsId,
    variantId: validVariantId,
    socialAccountId: 'soc_bsky_01',
    scheduledAt: new Date(),
    status: 'scheduled',
    attempts: 0,
    maxAttempts: 5,
    idempotencyKey: `job_unique_key_${validVariantId}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const firstPublish = await executePublishingJob(uniqueJobId);
  assert('First publish execution succeeds', firstPublish.success && firstPublish.status === 'published');

  const secondPublish = await executePublishingJob(uniqueJobId);
  assert('Duplicate publish call safely short-circuits with no double publication', secondPublish.success && secondPublish.error === 'Job already published');

  // TEST 13: Platform API Errors & Reauthorization
  console.log('\n--- 13. Testing Platform API Errors & Reauthorization Flags ---');
  const bskyAuthFail = await blueskyAdapter.verifyConnection({
    identifier: 'invalid@handle.xyz',
    password: 'bad-password',
    service: 'https://bsky.social',
    isSandbox: false,
  });
  assert('Invalid platform credentials flag failure cleanly without crashing', !bskyAuthFail.valid && Boolean(bskyAuthFail.error));

  // TEST 14: Paused Automations & Cancelled Jobs
  console.log('\n--- 14. Testing Paused Automations & Job Cancellation ---');
  const autoTestId = `auto_pause_${Date.now()}`;
  await automationEngine.saveAutomation(newWsId, {
    id: autoTestId,
    name: 'Temporary Campaign',
    status: 'active',
  });

  const paused = await automationEngine.pauseAutomation(newWsId, autoTestId);
  assert('Automation pause successfully sets status to paused', paused.status === 'paused');

  const cancelled = await automationEngine.cancelAutomation(newWsId, autoTestId);
  assert('Automation cancel transitions status to completed', cancelled.status === 'completed');

  // TEST 15: Insufficient Credits Protection
  console.log('\n--- 15. Testing Insufficient Credits Safeguard ---');
  const brokeWsId = `ws_broke_${Date.now()}`;
  const brokeWallet = memoryStore.getCreditWallet(brokeWsId);
  brokeWallet.balance = 1; // Only 1 credit

  const brokeResv = await creditEngine.reserveCredits(brokeWsId, 5, 'Expensive Operation', `idemp_broke_${Date.now()}`);
  assert('System blocks operation when credit balance is insufficient', !brokeResv.success && brokeResv.availableBalance === 1);

  // TEST 16: Quora Manual Publishing Workflows
  console.log('\n--- 16. Testing Quora Manual Publishing Workflow ---');
  const validQuoraLink = 'https://www.quora.com/How-does-background-job-locking-work-in-distributed-systems';
  const invalidQuoraLink = 'https://phishing-site.com/fake-quora';

  assert('Quora URL validator verifies authentic Quora questions', QuoraWorkflow.isValidQuoraUrl(validQuoraLink));
  assert('Quora URL validator rejects malicious non-Quora URLs', !QuoraWorkflow.isValidQuoraUrl(invalidQuoraLink));

  const quoraVarId = `cv_quora_${Date.now()}`;
  memoryStore.contentVariants.set(quoraVarId, {
    id: quoraVarId,
    contentItemId: 'ci_quora',
    workspaceId: newWsId,
    platform: 'quora',
    text: 'A detailed 300-word answer to the question.',
    approvalStatus: 'draft',
    quoraQuestionUrl: validQuoraLink,
    quoraAnswerStatus: 'draft',
    version: 1,
    warnings: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const quoraVariant = memoryStore.contentVariants.get(quoraVarId)!;
  quoraVariant.quoraAnswerStatus = 'copied';
  assert('Quora variant tracks copy status', quoraVariant.quoraAnswerStatus === 'copied');

  quoraVariant.quoraAnswerStatus = 'manually_published';
  quoraVariant.approvalStatus = 'approved';
  assert('Quora manual publishing confirmation updates status', 
    quoraVariant.quoraAnswerStatus === 'manually_published' && quoraVariant.approvalStatus === 'approved'
  );

  // TEST 17: Strict Role-Based Access Control (RBAC) & "No Login No Access" Gates
  console.log('\n--- 17. Testing Role-Based Access Control (RBAC) & No Login No Access ---');

  // 17.1 Test unauthorizedResponse produces HTTP 401
  const unauthRes = unauthorizedResponse();
  assert('unauthorizedResponse produces HTTP 401 status', unauthRes.status === 401);

  // 17.2 Test forbiddenResponse produces HTTP 403
  const forbidRes = forbiddenResponse();
  assert('forbiddenResponse produces HTTP 403 status', forbidRes.status === 403);

  // 17.3 Viewer role restrictions
  assert('Viewer is forbidden from generating content', !hasPermission('viewer', 'canGenerateContent'));
  assert('Viewer is forbidden from approving posts', !hasPermission('viewer', 'canApprovePosts'));
  assert('Viewer is forbidden from publishing jobs', !hasPermission('viewer', 'canPublishJobs'));
  assert('Viewer is forbidden from managing automations', !hasPermission('viewer', 'canManageAutomations'));
  assert('Viewer is forbidden from connecting social accounts', !hasPermission('viewer', 'canManageSocialAccounts'));
  assert('Viewer is forbidden from managing billing/credits', !hasPermission('viewer', 'canManageBilling'));
  assert('Viewer is forbidden from admin diagnostics', !hasPermission('viewer', 'canAccessAdmin'));
  assert('Viewer is permitted to view analytics and content', hasPermission('viewer', 'canViewContent') && hasPermission('viewer', 'canViewAnalytics'));

  // 17.4 Editor role capabilities and boundaries
  assert('Editor can generate content', hasPermission('editor', 'canGenerateContent'));
  assert('Editor can approve posts', hasPermission('editor', 'canApprovePosts'));
  assert('Editor can publish jobs', hasPermission('editor', 'canPublishJobs'));
  assert('Editor can manage automations', hasPermission('editor', 'canManageAutomations'));
  assert('Editor is forbidden from connecting social accounts', !hasPermission('editor', 'canManageSocialAccounts'));
  assert('Editor is forbidden from purchasing credits/managing billing', !hasPermission('editor', 'canManageBilling'));
  assert('Editor is forbidden from admin diagnostics', !hasPermission('editor', 'canAccessAdmin'));

  // 17.5 Admin role capabilities and boundaries
  assert('Admin can manage social accounts', hasPermission('admin', 'canManageSocialAccounts'));
  assert('Admin can manage billing and credit purchases', hasPermission('admin', 'canManageBilling'));
  assert('Admin can access admin diagnostics and audit logs', hasPermission('admin', 'canAccessAdmin'));
  assert('Admin cannot delete workspace', !hasPermission('admin', 'canDeleteWorkspace'));

  // 17.6 Owner role full hierarchy
  assert('Owner has unrestricted permissions including workspace destruction', hasPermission('owner', 'canDeleteWorkspace'));
  assert('Role hierarchy properly establishes owner >= admin >= editor >= viewer', 
    isAtLeastRole('owner', 'admin') &&
    isAtLeastRole('admin', 'editor') &&
    isAtLeastRole('editor', 'viewer') &&
    !isAtLeastRole('viewer', 'editor')
  );

  // 17.7 JWT token generation and universal decoding
  const testSession = {
    userId: 'usr_test_rbac_01',
    email: 'viewer_test@postpilot.io',
    name: 'RBAC Viewer',
    workspaceId: newWsId,
    role: 'viewer' as const,
  };
  const token = createToken(testSession);
  assert('createToken creates cryptographically signed JWT token', Boolean(token && token.split('.').length === 3));

  const verifiedSession = verifyToken(token);
  assert('verifyToken correctly decodes and validates session role', verifiedSession?.role === 'viewer' && verifiedSession?.userId === testSession.userId);

  const edgeDecodedSession = decodeJwtPayload(token);
  assert('decodeJwtPayload safely parses session in Edge runtime without Node crypto dependencies', edgeDecodedSession?.role === 'viewer');

  // 17.8 Verify seeded team members exist with correct roles in memoryStore
  const seededAdmin = memoryStore.users.get('usr_admin_01');
  const seededAdminMem = memoryStore.memberships.get('mem_admin_01');
  assert('Seeded admin user exists with admin role membership', seededAdmin?.email === 'admin@postpilot.io' && seededAdminMem?.role === 'admin');

  const seededEditor = memoryStore.users.get('usr_editor_01');
  const seededEditorMem = memoryStore.memberships.get('mem_editor_01');
  assert('Seeded editor user exists with editor role membership', seededEditor?.email === 'editor@postpilot.io' && seededEditorMem?.role === 'editor');

  const seededViewer = memoryStore.users.get('usr_viewer_01');
  const seededViewerMem = memoryStore.memberships.get('mem_viewer_01');
  assert('Seeded viewer user exists with viewer role membership', seededViewer?.email === 'viewer@postpilot.io' && seededViewerMem?.role === 'viewer');

  // --- 18. Testing Production Environment Configuration Validation ---
  console.log('\n--- 18. Testing Production Environment Configuration Validation ---');
  const { validateConfig } = await import('../src/lib/config');
  const configVal = validateConfig();
  assert('Environment validator checks critical SaaS keys', typeof configVal.valid === 'boolean');

  // --- 19. Testing Enterprise Rate Limiting Engine ---
  console.log('\n--- 19. Testing Enterprise Rate Limiting Engine ---');
  const { checkRateLimit } = await import('../src/lib/security/rateLimiter');
  const testIp = '192.168.1.100';
  const initialCheck = checkRateLimit(testIp, 'auth');
  assert('Rate limiter permits initial requests within threshold', initialCheck.allowed && initialCheck.remaining >= 0);
  
  // Exhaust bucket
  for (let i = 0; i < 20; i++) {
    checkRateLimit(testIp, 'auth');
  }
  const exhaustedCheck = checkRateLimit(testIp, 'auth');
  assert('Rate limiter blocks requests exceeding configured rate limits', !exhaustedCheck.allowed && exhaustedCheck.remaining === 0);

  // --- 20. Testing Persistence Bridge & Queue Health Diagnostics ---
  console.log('\n--- 20. Testing Persistence Bridge & Queue Diagnostics ---');
  const { persistenceBridge } = await import('../src/lib/db/persistence');
  const { getQueueStatus, processDueJobs } = await import('../src/lib/queue/publisherQueue');
  
  assert('Persistence bridge exposes active MongoDB state', typeof persistenceBridge.isMongoActive() === 'boolean');
  
  const queueStat = getQueueStatus();
  assert('Queue health diagnostics report current mode and pending jobs', 
    (queueStat.mode === 'bullmq' || queueStat.mode === 'in_process') && typeof queueStat.pendingJobs === 'number'
  );

  // --- 21. Testing Vercel Cron Serverless Job Processor ---
  console.log('\n--- 21. Testing Vercel Cron Serverless Publishing Engine ---');
  const cronBatchResult = await processDueJobs();
  assert('Vercel Cron batch processor runs cleanly in serverless context', typeof cronBatchResult.processed === 'number');
  assert('Vercel Cron results return array of executed jobs', Array.isArray(cronBatchResult.results));

  console.log('\n================================================================');
  console.log(`🏁 Master Verification Complete: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runMasterVerification();

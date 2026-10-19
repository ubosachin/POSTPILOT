/**
 * PostPilot Production Database Initialization & Index Migration Script
 * Connects to MongoDB, builds all collection indexes, and seeds initial system records.
 */

import mongoose from 'mongoose';
import {
  UserModel,
  WorkspaceModel,
  MembershipModel,
  BrandProfileModel,
  CreditWalletModel,
  SubscriptionModel,
  ContentAutomationModel,
  PublishingJobModel,
  SocialAccountModel,
} from '../src/lib/models';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/postpilot';

async function seedProduction() {
  console.log('🚀 [PostPilot] Starting Production DB Initialization...');
  console.log(`Connecting to: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    // 1. Build all indexes across collections
    console.log('📦 Ensuring collection indexes...');
    await Promise.all([
      UserModel.createIndexes(),
      WorkspaceModel.createIndexes(),
      MembershipModel.createIndexes(),
      BrandProfileModel.createIndexes(),
      CreditWalletModel.createIndexes(),
      SubscriptionModel.createIndexes(),
      ContentAutomationModel.createIndexes(),
      PublishingJobModel.createIndexes(),
      SocialAccountModel.createIndexes(),
    ]);
    console.log('✅ Indexes verified successfully.');

    // 2. Provision or verify default production workspace
    const defaultEmail = 'alex@postpilot.io';
    let user = await UserModel.findOne({ email: defaultEmail });

    if (!user) {
      user = await UserModel.create({
        email: defaultEmail,
        name: 'Alex Rivera',
        authProvider: 'google',
        createdAt: new Date(),
      });
      console.log(`✅ Created production owner user: ${user.email} (${user._id})`);
    } else {
      console.log(`ℹ️ Existing production owner found: ${user.email}`);
    }

    const defaultWorkspaceId = 'ws_postpilot_main';
    let workspace = await WorkspaceModel.findById(defaultWorkspaceId);

    if (!workspace) {
      workspace = await WorkspaceModel.create({
        _id: defaultWorkspaceId,
        name: 'PostPilot Growth Lab',
        ownerId: user._id.toString(),
        planId: 'pro',
        timezone: 'UTC',
        createdAt: new Date(),
      });
      console.log(`✅ Created production primary workspace: ${workspace.name}`);
    }

    // 3. Ensure Owner Membership
    await MembershipModel.findOneAndUpdate(
      { workspaceId: defaultWorkspaceId, userId: user._id.toString() },
      { role: 'owner' },
      { upsert: true }
    );

    // 4. Ensure Credit Wallet
    await CreditWalletModel.findOneAndUpdate(
      { workspaceId: defaultWorkspaceId },
      {
        $setOnInsert: {
          balance: 150,
          reservedCredits: 0,
          lifetimeGranted: 150,
          lifetimePurchased: 0,
          lifetimeSpent: 0,
        },
      },
      { upsert: true }
    );

    // 5. Ensure Brand Profile
    await BrandProfileModel.findOneAndUpdate(
      { workspaceId: defaultWorkspaceId },
      {
        voice: 'Insightful, Pragmatic & Direct Builder',
        audience: 'Founders, Creators, Solo Engineers',
        topics: ['AI Automation', 'Micro-SaaS Growth', 'Decentralized Social'],
        rules: ['Lead with strong hook', 'No spammy hashtags', 'Give actionable takeaways'],
        updatedAt: new Date(),
      },
      { upsert: true }
    );

    console.log('🎉 Production database initialization complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Production DB initialization failed:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

seedProduction();

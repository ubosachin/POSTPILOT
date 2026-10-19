/**
 * PostPilot Central Credit & Pricing Configuration
 * Authoritative server-side policy for all credit costs, grants, and packages.
 */

import { CreditPackage } from '@/types';

export const CREDIT_POLICY = {
  // Free allowance granted exactly once on initial workspace/user creation
  DEFAULT_FREE_SIGNUP_CREDITS: parseInt(process.env.DEFAULT_FREE_CREDITS || '50', 10),

  // Cost per operation
  COSTS: {
    AI_VARIANT_GENERATION: 1, // 1 credit per platform variant (e.g. 3 variants = 3 credits)
    AI_VARIANT_REGENERATE: 1, // 1 credit per single platform re-generation
    AI_TOPIC_DISCOVERY: 2,    // Optional creative topic brainstorming
    IMAGE_GENERATION: 5,      // Optional premium image generation
    SCHEDULE_PUBLISH: 0,      // Scheduling already-generated variant is free
    RETRY_PUBLISH: 0,         // Retrying failed publishing attempts is free
  },

  // Reservation expiration timeout (in milliseconds)
  RESERVATION_TTL_MS: 5 * 60 * 1000, // 5 minutes
};

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pkg_starter',
    name: 'Starter Creator',
    credits: 100,
    priceInr: 199,
    description: 'Perfect for solo creators testing multi-platform daily publishing.',
    popular: false,
  },
  {
    id: 'pkg_pro',
    name: 'Pro Growth',
    credits: 500,
    priceInr: 799,
    badge: 'Most Popular',
    description: 'Ideal for tech founders & startups building consistent daily reach.',
    popular: true,
  },
  {
    id: 'pkg_scale',
    name: 'Agency & Scale',
    credits: 2000,
    priceInr: 2499,
    badge: 'Best Value',
    description: 'High-volume publishing across unlimited brands and social accounts.',
    popular: false,
  },
];

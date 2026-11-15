// Complete Monetization Configuration for ShadowTalk AI
// All revenue streams funnel through Founder Access page

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  badge?: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonus: number;
  popular?: boolean;
}

export interface PayPerSolution {
  id: string;
  name: string;
  description: string;
  priceRange: string;
  icon: string;
}

export interface ApiPlan {
  id: string;
  name: string;
  price: number;
  requestsPerMonth: number;
  features: string[];
}

export interface WhiteLabelPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
}

// Subscription Tiers - All redirect to Founder Access
export const SUBSCRIPTION_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    description: 'Try our AI capabilities',
    features: [
      '100 shared AI messages per day',
      'Basic chat assistance',
      'Community support',
      '3 file uploads/day',
      'Basic code generation',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 5,
    period: '/month',
    description: 'For freelancers & small teams',
    features: [
      'Unlimited messages',
      'Priority AI responses',
      'Code Canvas access',
      'Chat export & history',
      'No advertisements',
      'Email support (< 4h)',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 15,
    period: '/month',
    description: 'For agencies & businesses',
    features: [
      'Everything in Pro',
      'Deep Research mode',
      'Document generation',
      'Image generation',
      'Collaborative rooms',
      'Priority support (< 2h)',
      'API access (5K req/mo)',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 20,
    period: '/month',
    description: 'Enterprise-grade for teams',
    badge: 'ENTERPRISE',
    features: [
      'Everything in Premium',
      'Team management',
      'SSO & SAML',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
    ],
  },
];

// Credit Packages for Pay-Per-Use
export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'starter', name: 'Starter', credits: 100, price: 4.99, bonus: 0 },
  { id: 'value', name: 'Value Pack', credits: 500, price: 19.99, bonus: 50, popular: true },
  { id: 'pro', name: 'Pro Pack', credits: 1200, price: 39.99, bonus: 200 },
  { id: 'enterprise', name: 'Enterprise', credits: 5000, price: 149.99, bonus: 1000 },
];

// Pay-Per-Solution Products
export const PAY_PER_SOLUTIONS: PayPerSolution[] = [
  {
    id: 'doc-gen',
    name: 'Document Generation',
    description: 'Contracts, NDAs, business forms, legal templates',
    priceRange: '$5-$50',
    icon: '📄',
  },
  {
    id: 'doc-review',
    name: 'Document Review',
    description: 'Contract analysis, risk assessment, legal review',
    priceRange: '$10-$75',
    icon: '🔍',
  },
  {
    id: 'strategy-report',
    name: 'Strategy Report',
    description: 'Business plan, market analysis, investor deck',
    priceRange: '$50-$200',
    icon: '📊',
  },
  {
    id: 'code-audit',
    name: 'Code Audit',
    description: 'Security review, performance optimization, best practices',
    priceRange: '$25-$100',
    icon: '🛡️',
  },
  {
    id: 'brand-kit',
    name: 'Brand Kit',
    description: 'Logo concepts, color palette, brand guidelines',
    priceRange: '$30-$150',
    icon: '🎨',
  },
];

// API Access Plans
export const API_PLANS: ApiPlan[] = [
  {
    id: 'api-starter',
    name: 'API Starter',
    price: 29,
    requestsPerMonth: 5000,
    features: ['5,000 requests/month', 'Basic endpoints', 'Community support'],
  },
  {
    id: 'api-growth',
    name: 'API Growth',
    price: 99,
    requestsPerMonth: 25000,
    features: ['25,000 requests/month', 'All endpoints', 'Priority support', 'Webhooks'],
  },
  {
    id: 'api-scale',
    name: 'API Scale',
    price: 299,
    requestsPerMonth: 100000,
    features: ['100,000 requests/month', 'Custom endpoints', 'Dedicated support', 'SLA 99.9%'],
  },
];

// White-Label Licensing
export const WHITELABEL_PLANS: WhiteLabelPlan[] = [
  {
    id: 'wl-starter',
    name: 'Starter License',
    price: 199,
    period: '/month',
    features: ['Custom branding', 'Your domain', 'Up to 100 users', 'Basic customization'],
  },
  {
    id: 'wl-business',
    name: 'Business License',
    price: 499,
    period: '/month',
    features: ['Everything in Starter', 'Unlimited users', 'Custom features', 'Priority support'],
  },
  {
    id: 'wl-enterprise',
    name: 'Enterprise License',
    price: 1499,
    period: '/month',
    features: ['Everything in Business', 'Source code access', 'Dedicated server', 'Custom development'],
  },
];

// Credit costs for different actions
export const CREDIT_COSTS = {
  chatMessage: 1,
  imageGeneration: 10,
  codeGeneration: 5,
  webSearch: 3,
  voiceInput: 2,
  documentAnalysis: 8,
  deepResearch: 15,
  strategyReport: 25,
  videoGeneration: 50,
} as const;

// Affiliate commission tiers
export const AFFILIATE_TIERS = [
  { level: 1, name: 'Bronze', minReferrals: 0, commission: 20 },
  { level: 2, name: 'Silver', minReferrals: 5, commission: 25 },
  { level: 3, name: 'Gold', minReferrals: 15, commission: 30 },
  { level: 4, name: 'Platinum', minReferrals: 30, commission: 35 },
  { level: 5, name: 'Diamond', minReferrals: 50, commission: 40 },
];

// Daily limits — canonical definition in productClaims.ts
export { DAILY_LIMITS, isWithinLimit } from '@/lib/productClaims';

// Helper to get pricing text
export const formatPrice = (price: number, period?: string): string => {
  if (price === 0) return 'Free';
  return `$${price}${period || ''}`;
};

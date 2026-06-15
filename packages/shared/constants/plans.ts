export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: { monthly: 49, currency: 'USD' },
    limits: {
      seats: 1,
      customers: 500,
      locations: 1,
    },
    features: {
      crm: true,
      aiTagging: false,
      voiceToCrm: false,
      whatsapp: false,
      instagramParse: false,
      followUpAi: false,
      aiScoring: false,
      customDomain: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 149, currency: 'USD' },
    limits: {
      seats: 5,
      customers: 5000,
      locations: 3,
    },
    features: {
      crm: true,
      aiTagging: true,
      voiceToCrm: true,
      whatsapp: true,
      instagramParse: true,
      followUpAi: true,
      aiScoring: true,
      customDomain: false,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: { monthly: null, currency: 'USD' },
    limits: {
      seats: Infinity,
      customers: Infinity,
      locations: Infinity,
    },
    features: {
      crm: true,
      aiTagging: true,
      voiceToCrm: true,
      whatsapp: true,
      instagramParse: true,
      followUpAi: true,
      aiScoring: true,
      customDomain: true,
    },
  },
} as const

export type PlanId = keyof typeof PLANS
export type Plan = (typeof PLANS)[PlanId]

export const LEAD_SOURCES = ['whatsapp', 'instagram', 'walk_in', 'phone', 'manual'] as const
export type LeadSource = (typeof LEAD_SOURCES)[number]

export const USER_ROLES = ['owner', 'manager', 'sales_staff', 'readonly'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const CURRENCIES = ['AED', 'INR', 'USD'] as const
export type Currency = (typeof CURRENCIES)[number]

export const COUNTRY_CODES = ['+971', '+91', '+1'] as const
export type CountryCode = (typeof COUNTRY_CODES)[number]

export const INTERACTION_TYPES = ['call', 'visit', 'whatsapp', 'instagram', 'voice_note', 'email'] as const
export type InteractionType = (typeof INTERACTION_TYPES)[number]

export const EVENT_TYPES = ['birthday', 'anniversary', 'custom'] as const
export type EventType = (typeof EVENT_TYPES)[number]

export const FAMILY_RELATIONS = ['spouse', 'child', 'parent', 'sibling', 'other'] as const
export type FamilyRelation = (typeof FAMILY_RELATIONS)[number]

export const METAL_PREFERENCES = ['gold', 'silver', 'platinum', 'rose_gold', 'white_gold'] as const
export const STONE_PREFERENCES = ['diamond', 'ruby', 'emerald', 'sapphire', 'pearl', 'other'] as const
export const STYLE_PREFERENCES = ['traditional', 'contemporary', 'fusion', 'minimalist', 'statement'] as const

export const DEFAULT_LEAD_STAGES = [
  { name: 'New', color: '#6366F1', order_index: 0 },
  { name: 'Contacted', color: '#F59E0B', order_index: 1 },
  { name: 'Visited', color: '#8B5CF6', order_index: 2 },
  { name: 'Quoted', color: '#3B82F6', order_index: 3 },
  { name: 'Won', color: '#10B981', order_index: 4 },
  { name: 'Lost', color: '#EF4444', order_index: 5 },
] as const

import type { PlanId, LeadSource, UserRole, Currency, InteractionType, EventType, FamilyRelation } from '../constants/plans'

export type { PlanId, LeadSource, UserRole, Currency, InteractionType, EventType, FamilyRelation }

export interface TenantBranding {
  logo_url?: string
  primary_color: string
  accent_color: string
  store_name: string
}

export interface Tenant {
  id: string
  name: string
  subdomain: string
  plan: PlanId
  branding: TenantBranding
  currency: Currency
  country_code: string
  is_active: boolean
  onboarding_completed: boolean
  created_at: string
}

export interface TenantUser {
  id: string
  tenant_id: string
  location_id?: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Lead {
  id: string
  tenant_id: string
  location_id?: string
  stage_id: string
  assigned_to?: string
  source: LeadSource
  full_name: string
  phone: string
  email?: string
  country_code: string
  raw_message?: string
  intent_score?: number
  budget_amount?: number
  budget_currency?: Currency
  occasion?: string
  category_interest?: string[]
  tags?: string[]
  voice_note_url?: string
  created_at: string
  last_contacted_at?: string
}

export interface Customer {
  id: string
  tenant_id: string
  lead_id?: string
  location_id?: string
  full_name: string
  phone: string
  email?: string
  dob?: string
  anniversary_date?: string
  city?: string
  country_code: string
  metal_pref?: string[]
  stone_pref?: string[]
  style_pref?: string[]
  favourite_categories?: string[]
  notes?: string
  is_vip: boolean
  lifetime_value: number
  created_at: string
}

export interface PlanCheckResult {
  allowed: boolean
  reason?: string
  current: number
  limit: number
}

export interface AILeadProfile {
  customer_type?: string
  budget?: { amount: number; currency: Currency }
  intent_score: number
  occasion?: string
  category_interest?: string[]
  tags: string[]
  recommended_next_action?: string
}

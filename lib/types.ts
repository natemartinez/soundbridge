import { InstrumentKey } from '@/constants/instruments';

export type UserRole = 'musician' | 'church';
export type GigStatus = 'open' | 'filled' | 'cancelled';
export type WorshipStyle = 'contemporary' | 'traditional' | 'blended';
export type CongregationSize = 'small' | 'medium' | 'large';
export type AccountTier = 'basic' | 'premium';

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  location_city: string;
  location_state: string;
  location_address?: string;
  account_tier: AccountTier;
  created_at: string;
}

export interface MusicianDetails {
  id: string;
  instruments: InstrumentKey[];
  experience_years: number;
  available: boolean;
  rate_per_service: number | null;
}

export interface ChurchDetails {
  id: string;
  denomination: string;
  worship_style: WorshipStyle;
  congregation_size: CongregationSize;
  website_url: string | null;
}

export interface Gig {
  id: string;
  church_id: string;
  title: string;
  description: string;
  instruments_needed: InstrumentKey[];
  date: string;
  time: string;
  pay_offered: number | null;
  status: GigStatus;
  created_at: string;
  // Joined fields
  church?: Profile;
}

export interface MusicianWithDetails extends Profile {
  musician_details: MusicianDetails;
}

export interface ChurchWithDetails extends Profile {
  church_details: ChurchDetails;
}

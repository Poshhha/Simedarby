export interface Profile {
  id: string;
  display_name: string;
  role: string;
  home_township_id: string;
  interests: string[];
  email?: string;
}
export interface Township {
  id: string;
  name: string;
  state: string;
  description: string;
  image_url: string;
  official_source_url: string;
}
export interface Facility {
  id: string;
  township_id: string;
  name: string;
  category: string;
  description: string;
  address: string | null;
  amenities: string[];
  access_type: string;
  pricing_status: string;
  operator: string | null;
  booking_type: string;
  source_url: string;
  verification_status: string;
  verified_at: string | null;
  facility_status: string;
  activity_types: string[];
  image_url: string;
}
export interface Activity {
  id: string;
  organizer_id: string;
  township_id: string;
  facility_id: string;
  facility_resource_id: string | null;
  title: string;
  description: string;
  category: string;
  target_audience: string;
  age_suitability: string;
  start_time: string;
  end_time: string;
  minimum_participants: number;
  maximum_participants: number;
  status: string;
  funding_model: string;
  total_estimated_cost_sen: number;
  organizer_contribution_sen: number;
  sponsorship_amount_sen: number;
  sponsorship_status: string;
  venue_confirmed: number | boolean;
  created_at: string;
  registration_count: number;
  waitlist_count: number;
  interest_count: number;
  is_demo?: boolean;
}
export interface Registration {
  id: string;
  activity_id: string;
  user_id: string;
  registration_status: string;
  checked_in_at: string | null;
  reference: string;
  obligation_sen: number;
}
export interface Community {
  id: string;
  township_id: string;
  name: string;
  description: string;
  interest_category: string;
  member_count?: number;
}
export interface Point {
  id: string;
  user_id: string;
  activity_id: string;
  points_change: number;
  reason: string;
  created_at: string;
}
export interface Snapshot {
  user: Profile | null;
  demo_profiles: Profile[];
  townships: Township[];
  facilities: Facility[];
  activities: Activity[];
  registrations: Registration[];
  communities: Community[];
  memberships: { community_id: string; user_id: string }[];
  interests: { activity_id: string; user_id: string }[];
  points: Point[];
  notifications: {
    id: string;
    title: string;
    message: string;
    created_at: string;
  }[];
  audit: {
    id: string;
    actor_id: string;
    action: string;
    entity_id: string;
    timestamp: string;
  }[];
  facility_resources?: {
    id: string;
    facility_id: string;
    resource_name: string;
    exclusive_booking_enabled: number;
  }[];
}

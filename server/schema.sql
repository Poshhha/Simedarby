PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS townships (id TEXT PRIMARY KEY, name TEXT NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS facilities (id TEXT PRIMARY KEY, township_id TEXT NOT NULL REFERENCES townships(id), name TEXT NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY, display_name TEXT NOT NULL, home_township_id TEXT NOT NULL REFERENCES townships(id),
  role TEXT NOT NULL CHECK(role IN ('resident','organizer','township_admin','platform_admin')),
  interests TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id), expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS facility_resources (
  id TEXT PRIMARY KEY, facility_id TEXT NOT NULL REFERENCES facilities(id), resource_name TEXT NOT NULL,
  exclusive_booking_enabled INTEGER NOT NULL DEFAULT 0, is_demo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY, organizer_id TEXT NOT NULL REFERENCES profiles(id), township_id TEXT NOT NULL REFERENCES townships(id),
  facility_id TEXT NOT NULL REFERENCES facilities(id), facility_resource_id TEXT REFERENCES facility_resources(id),
  title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, target_audience TEXT NOT NULL DEFAULT 'Everyone',
  age_suitability TEXT NOT NULL DEFAULT 'All ages', start_time TEXT NOT NULL, end_time TEXT NOT NULL,
  minimum_participants INTEGER NOT NULL CHECK(minimum_participants > 0),
  maximum_participants INTEGER NOT NULL CHECK(maximum_participants >= minimum_participants),
  status TEXT NOT NULL CHECK(status IN ('draft','submitted','under_review','changes_requested','rejected','pending_facility_confirmation','open','completed','cancelled')),
  funding_model TEXT NOT NULL CHECK(funding_model IN ('free','organizer_funded','cost_sharing','sponsorship','mixed')),
  total_estimated_cost_sen INTEGER NOT NULL CHECK(total_estimated_cost_sen >= 0),
  organizer_contribution_sen INTEGER NOT NULL DEFAULT 0 CHECK(organizer_contribution_sen >= 0),
  sponsorship_amount_sen INTEGER NOT NULL DEFAULT 0 CHECK(sponsorship_amount_sen >= 0),
  sponsorship_status TEXT NOT NULL DEFAULT 'not_requested',
  venue_confirmed INTEGER NOT NULL DEFAULT 0, review_note TEXT NOT NULL DEFAULT '',
  is_demo INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY, activity_id TEXT NOT NULL REFERENCES activities(id), user_id TEXT NOT NULL REFERENCES profiles(id),
  registration_status TEXT NOT NULL CHECK(registration_status IN ('registered','waitlisted','cancelled')),
  reference TEXT NOT NULL UNIQUE, obligation_sen INTEGER NOT NULL DEFAULT 0 CHECK(obligation_sen >= 0),
  eligibility_confirmed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, checked_in_at TEXT, checked_in_by TEXT REFERENCES profiles(id),
  UNIQUE(activity_id,user_id)
);
CREATE TABLE IF NOT EXISTS activity_interest (
  id TEXT PRIMARY KEY, activity_id TEXT NOT NULL REFERENCES activities(id), user_id TEXT NOT NULL REFERENCES profiles(id), created_at TEXT NOT NULL,
  UNIQUE(activity_id,user_id)
);
CREATE TABLE IF NOT EXISTS funding_records (
  id TEXT PRIMARY KEY, activity_id TEXT NOT NULL REFERENCES activities(id), funding_source TEXT NOT NULL,
  amount_sen INTEGER NOT NULL CHECK(amount_sen >= 0), status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS communities (
  id TEXT PRIMARY KEY, township_id TEXT NOT NULL REFERENCES townships(id), name TEXT NOT NULL,
  description TEXT NOT NULL, interest_category TEXT NOT NULL, creator_id TEXT NOT NULL REFERENCES profiles(id)
);
CREATE TABLE IF NOT EXISTS community_memberships (
  id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id), user_id TEXT NOT NULL REFERENCES profiles(id), joined_at TEXT NOT NULL,
  UNIQUE(community_id,user_id)
);
CREATE TABLE IF NOT EXISTS points_transactions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES profiles(id), activity_id TEXT NOT NULL REFERENCES activities(id),
  points_change INTEGER NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL, reference_key TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS activity_checkins (
  id TEXT PRIMARY KEY, activity_id TEXT NOT NULL REFERENCES activities(id), user_id TEXT NOT NULL REFERENCES profiles(id),
  verified_by TEXT NOT NULL REFERENCES profiles(id), verified_at TEXT NOT NULL, verification_method TEXT NOT NULL,
  UNIQUE(activity_id,user_id)
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY, recipient_id TEXT NOT NULL REFERENCES profiles(id), title TEXT NOT NULL, message TEXT NOT NULL,
  read_status INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES profiles(id), action TEXT NOT NULL,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, timestamp TEXT NOT NULL, detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS registration_activity_status ON registrations(activity_id,registration_status);
CREATE INDEX IF NOT EXISTS activity_resource_schedule ON activities(facility_resource_id,start_time,end_time,status);
CREATE INDEX IF NOT EXISTS points_user ON points_transactions(user_id);

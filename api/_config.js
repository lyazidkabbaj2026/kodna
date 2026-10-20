// Tracking database (Supabase project "kodna", Paris). Both values are public by design: the
// publishable key can only INSERT into proposal_events (row-level security) and can't read
// anything; stats are read through kodna_stats(), which requires the secret stats key.
// Vercel env vars SUPABASE_URL / SUPABASE_KEY override these. Files starting with "_" are not
// deployed as functions.
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iqytudyprtvvhdhyyjvk.supabase.co';
export const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_1w1zCP9225jgPYjHP0BGrA_0cO3n4Ui';

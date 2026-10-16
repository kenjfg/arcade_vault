-- SPEC 16: least privilege for the API roles.
-- Supabase's default privileges give anon and authenticated every privilege on
-- public tables (UPDATE, DELETE, TRUNCATE, ...); earlier grants only added to
-- them. RLS already blocks the writes, but TRUNCATE bypasses RLS. Reset the
-- tables to exactly what the app uses. RLS policies are unchanged.

revoke all on public.categories, public.games, public.scores, public.profiles
  from anon, authenticated;

-- Catalog and leaderboard: readable by everyone.
grant select on public.categories, public.games, public.scores to anon, authenticated;

-- submitScore: anyone can insert (RLS: only for playable games).
grant insert on public.scores to anon, authenticated;

-- Profiles: a signed-in user reads their own row (RLS). The handle_new_user
-- trigger and username_available are security definer and need no grant here.
grant select on public.profiles to authenticated;

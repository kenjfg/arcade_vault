-- SPEC 14: player profiles for Supabase Auth accounts.
-- Each auth user gets one profile with a unique player name (username),
-- created by a trigger from the `username` sent in signUp's user metadata.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

-- The username format also satisfies scores.name (1-10 chars, uppercase,
-- trimmed), so it can be saved as a score name as is.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[A-Z0-9_]{3,10}$'),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

-- Users only read their own profile. There are no write policies: only the
-- trigger below writes.
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

grant select on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Profile creation on signup
-- ---------------------------------------------------------------------------

-- A missing, malformed or taken username makes this insert fail, and Supabase
-- then rejects the signup.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, upper(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;

-- Only the trigger calls it; never expose it through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Username availability (signup form)
-- ---------------------------------------------------------------------------

-- Security definer because anon cannot read profiles. It only answers
-- yes/no for one name; the unique constraint stays the final guarantee.
create function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles
    where username = upper(p_username)
  );
$$;

revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- SPEC 15: automatic player names for Google/GitHub sign ups.
-- OAuth providers don't send the `username` the SPEC 14 trigger requires, so
-- handle_new_user now generates one when it is missing.

-- ---------------------------------------------------------------------------
-- Username generation
-- ---------------------------------------------------------------------------

-- Turns a seed (GitHub login or the email's local part) into a free username
-- matching profiles.username ('^[A-Z0-9_]{3,10}$'):
--   * accents and diaeresis to their vowel, Ñ to N, uppercase, keep only
--     A-Z 0-9 _, cut to 10;
--   * 3+ chars and free: used as is;
--   * taken: first 6 chars + '_' + 3 random digits, retried until free;
--   * under 3 chars: base 'JUGADOR', always with the suffix.
-- Gives up after 50 attempts, which makes the signup fail.
create function public.generate_username(p_seed text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  base text;
  candidate text;
  attempt int := 0;
begin
  -- Accents are mapped in both cases before upper(): upper() of non-ASCII
  -- letters depends on the database collation.
  base := left(
    regexp_replace(
      upper(translate(coalesce(p_seed, ''), 'áéíóúàèìòùüñÁÉÍÓÚÀÈÌÒÙÜÑ', 'aeiouaeiouunAEIOUAEIOUUN')),
      '[^A-Z0-9_]', '', 'g'
    ),
    10
  );

  if char_length(base) >= 3 then
    if not exists (select 1 from public.profiles where username = base) then
      return base;
    end if;
  else
    base := 'JUGADOR';
  end if;

  loop
    attempt := attempt + 1;
    if attempt > 50 then
      raise exception 'generate_username: no free username for seed %', p_seed;
    end if;
    candidate := left(base, 6) || '_' || lpad(floor(random() * 1000)::int::text, 3, '0');
    if not exists (select 1 from public.profiles where username = candidate) then
      return candidate;
    end if;
  end loop;
end;
$$;

-- Only handle_new_user calls it; never expose it through the API.
revoke execute on function public.generate_username(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Profile creation on signup (replaces the SPEC 14 version)
-- ---------------------------------------------------------------------------

-- Email signups send `username` and keep the SPEC 14 behavior: a malformed or
-- taken name makes the insert fail and Supabase rejects the signup.
-- OAuth signups don't, so the name is generated from the GitHub login or,
-- for Google (or GitHub without a login), the email's local part.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_username text := new.raw_user_meta_data ->> 'username';
begin
  if new_username is null then
    new_username := public.generate_username(
      coalesce(new.raw_user_meta_data ->> 'user_name', split_part(new.email, '@', 1))
    );
  end if;

  insert into public.profiles (id, username)
  values (new.id, upper(new_username));
  return new;
end;
$$;

-- create or replace keeps the grants, but restate them so this file stands alone.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

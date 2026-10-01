-- SPEC 06: game catalog (categories + games), scores, leaderboard views and RLS.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.categories (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null unique,
  sort_order int not null unique
);

create table public.games (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  short_desc text not null,
  long_desc text not null,
  category_id bigint not null references public.categories (id) on delete restrict,
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  playable boolean not null default false,
  sort_order int not null unique,
  created_at timestamptz not null default now()
);

create index games_category_id_idx on public.games (category_id);

create table public.scores (
  id bigint generated always as identity primary key,
  game_id bigint not null references public.games (id) on delete cascade,
  name text not null check (
    char_length(name) between 1 and 10
    and name = upper(name)
    and name = btrim(name)
  ),
  score int not null check (score between 0 and 10000000),
  created_at timestamptz not null default now()
);

create index scores_game_id_score_idx on public.scores (game_id, score desc, created_at asc);

-- ---------------------------------------------------------------------------
-- Views (security_invoker so they respect the RLS of the underlying tables)
-- ---------------------------------------------------------------------------

-- Best score per (game, name). Ties go to whoever set the score first.
create view public.leaderboard
with (security_invoker = true) as
select
  best.game_id,
  best.name,
  best.score,
  best.created_at,
  row_number() over (
    partition by best.game_id
    order by best.score desc, best.created_at asc, best.id asc
  ) as rank
from (
  select distinct on (s.game_id, s.name)
    s.id,
    s.game_id,
    s.name,
    s.score,
    s.created_at
  from public.scores s
  order by s.game_id, s.name, s.score desc, s.created_at asc, s.id asc
) best;

-- One row per game, including games without scores.
create view public.game_stats
with (security_invoker = true) as
select
  g.id as game_id,
  count(s.id)::int as plays,
  coalesce(max(s.score), 0)::int as best
from public.games g
left join public.scores s on s.game_id = g.id
group by g.id;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "Categories are readable by everyone"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "Games are readable by everyone"
  on public.games for select
  to anon, authenticated
  using (true);

create policy "Scores are readable by everyone"
  on public.scores for select
  to anon, authenticated
  using (true);

create policy "Scores can be inserted for playable games"
  on public.scores for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.games g
      where g.id = game_id and g.playable
    )
  );

-- Explicit grants: read everything, write only scores (RLS narrows it further).
grant select on public.categories, public.games, public.scores to anon, authenticated;
grant select on public.leaderboard, public.game_stats to anon, authenticated;
grant insert on public.scores to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------

insert into public.categories (code, name, sort_order) values
  ('arcade', 'ARCADE', 1),
  ('puzzle', 'PUZZLE', 2),
  ('shooter', 'SHOOTER', 3),
  ('versus', 'VERSUS', 4);

insert into public.games (code, title, short_desc, long_desc, category_id, cover, color, playable, sort_order)
select v.code, v.title, v.short_desc, v.long_desc, c.id, v.cover, v.color, v.playable, v.sort_order
from (values
  (
    'asteroids', 'ASTEROIDS',
    'Esquiva y destruye rocas en un espacio sin bordes.',
    'Pilota una nave vectorial en un campo de asteroides donde el espacio se enrosca sobre sí mismo. Cada roca que revientas se parte en fragmentos más rápidos. Atrapa el núcleo verde para disparar en abanico y limpia el sector antes de que llegue la siguiente oleada.',
    'shooter', 'cover-rocas', 'cyan', true, 1
  ),
  (
    'bloque-buster', 'BLOQUE BUSTER',
    'Rebota la pelota y destruye muros de neón.',
    'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?',
    'arcade', 'cover-bricks', 'cyan', false, 2
  ),
  (
    'caida', 'CAÍDA',
    'Encaja las piezas antes de que el techo te aplaste.',
    'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.',
    'puzzle', 'cover-tetro', 'magenta', false, 3
  ),
  (
    'serpentina', 'SERPENTINA',
    'Crece sin morder tu propia cola.',
    'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.',
    'arcade', 'cover-snake', 'green', false, 4
  ),
  (
    'gloton', 'GLOTÓN',
    'Devora puntos y escapa de los fantasmas.',
    'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.',
    'arcade', 'cover-glot', 'yellow', false, 5
  ),
  (
    'invasores', 'INVASORES',
    'Defiende el planeta de filas alienígenas.',
    'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.',
    'shooter', 'cover-invaders', 'green', false, 6
  ),
  (
    'rocas', 'ROCAS',
    'Pulveriza asteroides en gravedad cero.',
    'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.',
    'shooter', 'cover-rocas', 'yellow', false, 7
  ),
  (
    'ranaria', 'RANARIA',
    'Cruza la autopista de pixeles.',
    'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.',
    'arcade', 'cover-rana', 'green', false, 8
  ),
  (
    'duelo-pixel', 'DUELO PIXEL',
    'Dos paletas. Una pelota. Reflejos máximos.',
    'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.',
    'versus', 'cover-duelo', 'cyan', false, 9
  )
) as v (code, title, short_desc, long_desc, category_code, cover, color, playable, sort_order)
join public.categories c on c.code = v.category_code;

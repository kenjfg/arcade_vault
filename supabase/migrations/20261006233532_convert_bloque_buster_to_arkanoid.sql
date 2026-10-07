-- SPEC 08: the BLOQUE BUSTER mock becomes the real game ARKANOID.
-- Category, cover, color, sort_order and texts stay as they are.
-- BLOQUE BUSTER was never playable, so it has no scores to migrate.

update public.games
set code = 'arkanoid',
    title = 'ARKANOID',
    playable = true
where code = 'bloque-buster';

-- SPEC 12: the RANARIA mock becomes the real game FROGGER.
-- Category, cover, color, sort_order and texts stay as they are.
-- RANARIA was never playable, so it has no scores to migrate.

update public.games
set code = 'frogger',
    title = 'FROGGER',
    playable = true
where code = 'ranaria';

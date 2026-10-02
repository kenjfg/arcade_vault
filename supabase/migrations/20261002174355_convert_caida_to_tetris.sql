-- SPEC 07: the CAÍDA mock becomes the real game TETRIS.
-- Category, cover, color, sort_order and texts stay as they are.
-- CAÍDA was never playable, so it has no scores to migrate.

update public.games
set code = 'tetris',
    title = 'TETRIS',
    playable = true
where code = 'caida';

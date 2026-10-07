-- SPEC 09: the SERPENTINA mock becomes the real game SNAKE.
-- Category, cover, color, sort_order and short_desc stay as they are;
-- long_desc is rewritten because the game has fruit, not magenta cores.
-- SERPENTINA was never playable, so it has no scores to migrate.

update public.games
set code = 'snake',
    title = 'SNAKE',
    playable = true,
    long_desc = 'Una serpiente de luz recorre la grilla buscando fruta. Cada bocado la alarga y suma puntos, y cada cinco frutas acelera. Un choque contra la pared o contra tu propia cola y se acabó.'
where code = 'serpentina';

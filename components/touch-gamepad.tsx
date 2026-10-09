"use client";

import { useEffect, useEffectEvent, useRef, type PointerEvent } from "react";
import type { TouchButton, TouchControls } from "@/components/games/registry";

// Held buttons auto-repeat like the system key repeat: a first delay, then a
// steady interval (only buttons with `repeat`, e.g. the Tetris arrows).
const REPEAT_DELAY = 170;
const REPEAT_INTERVAL = 50;

type Slot = keyof TouchControls;

const DPAD: { slot: Slot; label: string }[] = [
  { slot: "up", label: "▲" },
  { slot: "left", label: "◀" },
  { slot: "right", label: "▶" },
  { slot: "down", label: "▼" },
];

const ACTIONS: { slot: Slot; label: string }[] = [
  { slot: "b", label: "B" },
  { slot: "a", label: "A" },
];

interface Held {
  code: string;
  el: HTMLButtonElement;
  timer: ReturnType<typeof setTimeout> | null;
}

// The engines listen to keydown/keyup on window and read `e.code`, so the
// gamepad drives them with synthetic keyboard events.
function emit(type: "keydown" | "keyup", code: string, repeat = false) {
  window.dispatchEvent(
    new KeyboardEvent(type, { code, bubbles: true, repeat }),
  );
}

interface TouchGamepadProps {
  controls: TouchControls;
  paused: boolean;
  over: boolean;
  onTogglePause: () => void;
}

// Shown only on touch devices: `.av-gamepad` is hidden by CSS elsewhere.
export function TouchGamepad({
  controls,
  paused,
  over,
  onTogglePause,
}: TouchGamepadProps) {
  // Held keys by pointer, so several fingers can press at once.
  const heldRef = useRef(new Map<number, Held>());

  function release(pointerId: number) {
    const held = heldRef.current.get(pointerId);
    if (!held) return;
    heldRef.current.delete(pointerId);
    // Timeouts and intervals share one id pool, so this clears either.
    if (held.timer !== null) clearTimeout(held.timer);
    delete held.el.dataset.pressed;
    emit("keyup", held.code);
  }

  function releaseAll() {
    for (const pointerId of [...heldRef.current.keys()]) release(pointerId);
  }

  function press(e: PointerEvent<HTMLButtonElement>, button: TouchButton) {
    e.preventDefault();
    const el = e.currentTarget;
    // A second finger on a button that is already held does nothing.
    for (const held of heldRef.current.values()) if (held.el === el) return;
    el.setPointerCapture(e.pointerId);
    el.dataset.pressed = "";
    emit("keydown", button.code);

    const held: Held = { code: button.code, el, timer: null };
    if (button.repeat) {
      held.timer = setTimeout(() => {
        held.timer = setInterval(
          () => emit("keydown", button.code, true),
          REPEAT_INTERVAL,
        );
      }, REPEAT_DELAY);
    }
    heldRef.current.set(e.pointerId, held);
  }

  // Pausing, ending or leaving the player lets go of every held key.
  const inactive = paused || over;
  const handleReleaseAll = useEffectEvent(() => releaseAll());
  useEffect(() => {
    if (inactive) handleReleaseAll();
  }, [inactive]);
  useEffect(() => () => handleReleaseAll(), []);

  const renderButton = (slot: Slot, label: string) => {
    const button = controls[slot];
    return (
      <button
        key={slot}
        type="button"
        className={`av-gamepad-btn ${slot}`}
        disabled={!button || inactive}
        onPointerDown={button ? (e) => press(e, button) : undefined}
        onPointerUp={(e) => release(e.pointerId)}
        onPointerCancel={(e) => release(e.pointerId)}
        onLostPointerCapture={(e) => release(e.pointerId)}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="av-gamepad" onContextMenu={(e) => e.preventDefault()}>
      <div className="av-gamepad-dpad">
        {DPAD.map(({ slot, label }) => renderButton(slot, label))}
      </div>
      <button
        type="button"
        className="av-gamepad-pause"
        disabled={over}
        onClick={onTogglePause}
      >
        {paused ? "REANUDAR" : "PAUSA"}
      </button>
      <div className="av-gamepad-ab">
        {ACTIONS.map(({ slot, label }) => renderButton(slot, label))}
      </div>
    </div>
  );
}

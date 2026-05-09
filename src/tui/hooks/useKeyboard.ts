import { useInput } from "ink";

export interface KeyboardHandlers {
  up?: () => void;
  down?: () => void;
  select?: () => void;
  back?: () => void;
  quit?: () => void;
  execute?: () => void;
  selectAll?: () => void;
  selectNone?: () => void;
}

export function useKeyboard(handlers: KeyboardHandlers): void {
  useInput((input, key) => {
    if (key.upArrow || input === "k") {
      handlers.up?.();
      return;
    }
    if (key.downArrow || input === "j") {
      handlers.down?.();
      return;
    }
    if (input === " ") {
      handlers.select?.();
      return;
    }
    if (key.escape || input === "b") {
      handlers.back?.();
      return;
    }
    if (input === "q") {
      handlers.quit?.();
      return;
    }
    if (key.return) {
      handlers.execute?.();
      return;
    }
    if (input === "a") {
      handlers.selectAll?.();
      return;
    }
    if (input === "n") {
      handlers.selectNone?.();
      return;
    }
  });
}

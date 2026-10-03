"use client";

import { useEffect, useRef } from "react";

export interface ShortcutHandlers {
  onOpenCommandPalette?: () => void;
  onOpenShortcutsHelp?: () => void;
  onAdvanceTime?: (minutes: number) => void;
  onSelectTab?: (tabIndex: number) => void;
  onCloseModals?: () => void;
  onToggleTheme?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when typing in inputs/textareas
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // Cmd+K / Ctrl+K (always active even if inside input)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handlersRef.current.onOpenCommandPalette?.();
        return;
      }

      if (isInput) return;

      // Escape to close modals
      if (e.key === "Escape") {
        handlersRef.current.onCloseModals?.();
        return;
      }

      // '?' opens keyboard shortcuts helper
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handlersRef.current.onOpenShortcutsHelp?.();
        return;
      }

      // 'T' to advance time 1 hour (+60m)
      if ((e.key === "t" || e.key === "T") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handlersRef.current.onAdvanceTime?.(60);
        return;
      }

      // Number keys 1-9 switch tabs
      if (/^[1-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey) {
        const index = parseInt(e.key, 10) - 1;
        handlersRef.current.onSelectTab?.(index);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

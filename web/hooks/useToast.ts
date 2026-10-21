"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** A short confirmation ("Address copied") that clears itself. */
export function useToast(ms = 1600) {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback(
    (t: string) => {
      setText(t);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setText(null), ms);
    },
    [ms],
  );
  useEffect(() => () => clearTimeout(timer.current), []);
  return { text, show };
}

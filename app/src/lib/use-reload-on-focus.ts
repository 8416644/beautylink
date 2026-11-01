import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

// Reloads when the screen comes back into view, for example after she adds an appointment
// on another screen and returns. The first time the screen opens it has just loaded, so
// that time is skipped.
export function useReloadOnFocus(reload: () => void) {
  const latest = useRef(reload);
  const first = useRef(true);
  useEffect(() => {
    latest.current = reload;
  });
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      latest.current();
    }, []),
  );
}

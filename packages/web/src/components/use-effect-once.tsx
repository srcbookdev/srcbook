import { useRef, useEffect, type EffectCallback } from 'react';

export function useEffectOnce(effect: EffectCallback) {
  const ref = useRef(0);

  useEffect(() => {
    ref.current += 1;

    if (process.env.NODE_ENV === 'production') {
      return effect();
    }
    // Only run effect on second call
    if (ref.current === 2) {
      return effect();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

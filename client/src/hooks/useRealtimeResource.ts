import { useEffect, useRef } from 'react';
import { onRealtimeEvent, subscribeScope, unsubscribeScope } from '../lib/realtime';

export function useRealtimeResource(resource: string, onInvalidate: () => void): void {
  const cbRef = useRef(onInvalidate);
  cbRef.current = onInvalidate;

  useEffect(() => {
    subscribeScope(resource);
    const off = onRealtimeEvent((event) => {
      if (event.resource !== resource) return;
      cbRef.current();
    });
    return () => {
      off();
      unsubscribeScope(resource);
    };
  }, [resource]);
}


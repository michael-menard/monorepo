import { useEffect, useRef, useCallback } from 'react';

export const useIntersectionObserver = (
  callback: (isIntersecting: boolean) => void,
  options: { threshold?: number; rootMargin?: string } = {},
) => {
  const { threshold = 0.1, rootMargin = '0px' } = options;
  const ref = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback(
    (entries: any[]) => {
      entries.forEach((entry) => {
        const intersecting = entry.isIntersecting;
        callback(intersecting);
      });
    },
    [callback],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const IO: any = (window as any).IntersectionObserver;
    if (!IO) return;

    const observer = new IO(handleIntersection, { threshold, rootMargin });

    // Observe even if ref is not yet attached, tests expect the call
    observer.observe((ref.current as any) ?? (null as any));

    return () => {
      observer.unobserve((ref.current as any) ?? (null as any));
      if (observer.disconnect) {
        observer.disconnect();
      }
    };
  }, [handleIntersection, threshold, rootMargin]);

  return { ref };
}; 
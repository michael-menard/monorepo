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
    const element = ref.current;
    if (!element || typeof window === 'undefined') return;

    const observer = new (window as any).IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [handleIntersection, threshold, rootMargin]);

  return { ref };
}; 
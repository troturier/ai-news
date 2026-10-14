"use client";

import { useEffect, useRef, useState } from "react";

/**
 * An article's illustration, displayed from its source (never copied), without sending a referrer.
 * Missing, broken or refused by the source: the fallback is shown (theme icon, rendered server side).
 */
export function ArticleThumb({
  src,
  fallback,
  className,
  priority = false,
}: {
  src: string | null;
  fallback: React.ReactNode;
  className?: string;
  /** Image visible as soon as the page opens: immediate, high-priority loading (no lazy loading). */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // A load error that occurred before hydration does not call onError: we detect it here.
  useEffect(() => {
    const img = ref.current;
    // For an eagerly loaded image, "complete without width" means broken. A lazy image
    // (`lazy`) can be "complete" without having started: onError handles it when it loads.
    if (priority && img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src, priority]);

  if (!src || failed) return <>{fallback}</>;
  return (
    // Deliberate hotlink of an external image: Next's optimizer would copy and cache it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt=""
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

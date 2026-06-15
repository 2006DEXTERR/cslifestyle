'use client';

import { useEffect, useRef } from 'react';
import { track, type TrackType } from '@/lib/api/analytics';

/**
 * Invisible analytics beacon (Phase 8). Renders nothing — fires a single privacy-safe
 * page/entity view event on mount. Adding it to a page is visually a no-op, so existing
 * UI/layout/colors are fully preserved. The server hashes the IP (NFR-SEC-007); no PII
 * is sent from the client.
 */
export function AnalyticsBeacon({
  type,
  entityType,
  entityId,
}: {
  type: TrackType;
  entityType?: string;
  entityId?: string;
}): null {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track(type, { entityType, entityId });
  }, [type, entityType, entityId]);
  return null;
}

import { useCallback, useEffect, useRef } from 'react';
import { Fingerprint } from '@/lib/fingerprint';

interface TrackingOptions {
  metadata?: Record<string, any>;
  debounceMs?: number;
}

/**
 * Hook for tracking post events
 */
export function useEventTracking(postId: string | null) {
  const fingerprintRef = useRef<string>('');
  const sessionIdRef = useRef<string>('');
  const viewTrackedRef = useRef<Set<string>>(new Set());
  const lastEventRef = useRef<{ [key: string]: number }>({});
  
  // Initialize fingerprint and session
  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined') {
        fingerprintRef.current = await Fingerprint.generate();
        sessionIdRef.current = Fingerprint.getSessionId();
      }
    };
    init();
  }, []);
  
  // Track event
  const trackEvent = useCallback(async (
    eventType: 'view' | 'empathy' | 'share' | 'click',
    targetPostId?: string,
    options?: TrackingOptions
  ) => {
    const pid = targetPostId || postId;
    if (!pid || !fingerprintRef.current) return null;
    
    // Debounce check
    const now = Date.now();
    const lastTime = lastEventRef.current[`${pid}:${eventType}`] || 0;
    const debounceMs = options?.debounceMs || (eventType === 'view' ? 5000 : 1000);
    
    if (now - lastTime < debounceMs) {
      return null;
    }
    
    lastEventRef.current[`${pid}:${eventType}`] = now;
    
    try {
      const response = await fetch(`/api/posts/${pid}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: eventType,
          fingerprint: fingerprintRef.current,
          session_id: sessionIdRef.current,
          metadata: options?.metadata
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.stats;
      }
    } catch (error) {
      console.error('Failed to track event:', error);
    }
    
    return null;
  }, [postId]);
  
  // Auto-track view on mount
  const trackView = useCallback(async (targetPostId?: string) => {
    const pid = targetPostId || postId;
    if (!pid || viewTrackedRef.current.has(pid)) return;
    
    viewTrackedRef.current.add(pid);
    return trackEvent('view', pid);
  }, [postId, trackEvent]);
  
  // Track empathy (like)
  const trackEmpathy = useCallback(async (targetPostId?: string) => {
    return trackEvent('empathy', targetPostId);
  }, [trackEvent]);
  
  // Track share
  const trackShare = useCallback(async (targetPostId?: string, platform?: string) => {
    return trackEvent('share', targetPostId, {
      metadata: { platform }
    });
  }, [trackEvent]);
  
  // Track click
  const trackClick = useCallback(async (targetPostId?: string, target?: string) => {
    return trackEvent('click', targetPostId, {
      metadata: { target }
    });
  }, [trackEvent]);
  
  // Get current stats
  const getStats = useCallback(async (targetPostId?: string) => {
    const pid = targetPostId || postId;
    if (!pid) return null;
    
    try {
      const response = await fetch(`/api/posts/${pid}/event`);
      if (response.ok) {
        const data = await response.json();
        return data.stats;
      }
    } catch (error) {
      console.error('Failed to get stats:', error);
    }
    
    return null;
  }, [postId]);
  
  return {
    trackView,
    trackEmpathy,
    trackShare,
    trackClick,
    getStats,
    fingerprint: fingerprintRef.current,
    sessionId: sessionIdRef.current
  };
}

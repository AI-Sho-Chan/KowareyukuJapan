/**
 * Browser fingerprinting for user identification
 * Creates a stable identifier without cookies
 */

export class Fingerprint {
  /**
   * Generate a browser fingerprint
   */
  static async generate(): Promise<string> {
    const components: string[] = [];
    
    // Screen resolution
    if (typeof window !== 'undefined') {
      components.push(`${window.screen.width}x${window.screen.height}`);
      components.push(`${window.screen.colorDepth}`);
      
      // Timezone
      components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
      
      // Language
      components.push(navigator.language);
      
      // Platform
      components.push(navigator.platform || 'unknown');
      
      // User Agent
      components.push(navigator.userAgent);
      
      // Canvas fingerprint (simple version)
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.textBaseline = 'top';
          ctx.font = '14px Arial';
          ctx.fillText('🎌📊💹', 2, 2);
          components.push(canvas.toDataURL().slice(-50));
        }
      } catch {}
      
      // Hardware concurrency
      if (navigator.hardwareConcurrency) {
        components.push(String(navigator.hardwareConcurrency));
      }
      
      // Device memory (if available)
      if ('deviceMemory' in navigator) {
        components.push(String((navigator as any).deviceMemory));
      }
    }
    
    // Hash the components
    const text = components.join('|');
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex.slice(0, 32); // Return first 32 chars
  }
  
  /**
   * Get or create a stable session ID
   */
  static getSessionId(): string {
    if (typeof window === 'undefined') return '';
    
    const key = 'session_id';
    let sessionId = sessionStorage.getItem(key);
    
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(key, sessionId);
    }
    
    return sessionId;
  }
}
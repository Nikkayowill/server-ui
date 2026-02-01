// Browser fingerprint generator for trial abuse prevention
// Creates a hash based on browser characteristics that persist across IP changes

(function() {
  async function generateFingerprint() {
    const components = [];
    
    // Screen properties
    components.push(screen.width + 'x' + screen.height);
    components.push(screen.colorDepth);
    components.push(screen.pixelDepth);
    
    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    components.push(new Date().getTimezoneOffset());
    
    // Language
    components.push(navigator.language);
    components.push((navigator.languages || []).join(','));
    
    // Platform
    components.push(navigator.platform);
    components.push(navigator.hardwareConcurrency || 'unknown');
    components.push(navigator.deviceMemory || 'unknown');
    
    // User agent (partial - just browser/OS info)
    const ua = navigator.userAgent;
    const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
    components.push(browserMatch ? browserMatch[0] : 'unknown');
    
    // Canvas fingerprint (draws invisible text, creates unique hash)
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Basement fingerprint', 2, 2);
      components.push(canvas.toDataURL().slice(-50));
    } catch (e) {
      components.push('canvas-blocked');
    }
    
    // WebGL renderer (GPU info)
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
      }
    } catch (e) {
      components.push('webgl-blocked');
    }
    
    // Touch support
    components.push('ontouchstart' in window ? 'touch' : 'no-touch');
    components.push(navigator.maxTouchPoints || 0);
    
    // Join and hash
    const fingerprint = components.join('|||');
    return await hashString(fingerprint);
  }
  
  // SHA-256 hash function using Web Crypto API with fallback
  async function hashString(str) {
    try {
      // Use Web Crypto API for proper SHA-256
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Fallback: combine multiple djb2 hashes for longer output
      let result = '';
      for (let offset = 0; offset < 8; offset++) {
        let hash = 5381 + offset * 33;
        for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) + hash) + str.charCodeAt(i);
          hash = hash & hash;
        }
        result += Math.abs(hash).toString(16).padStart(8, '0');
      }
      return result; // 64 chars
    }
  }
  
  // Set fingerprint in any form with a fingerprint field
  async function setFingerprint() {
    const fp = await generateFingerprint();
    const fields = document.querySelectorAll('input[name="fingerprint"]');
    fields.forEach(field => {
      field.value = fp;
    });
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setFingerprint());
  } else {
    setFingerprint();
  }

  // Also run on any form with fingerprint field when it's about to submit
  document.addEventListener('submit', async function(e) {
    const form = e.target;
    const fpField = form.querySelector('input[name="fingerprint"]');
    if (fpField && !fpField.value) {
      e.preventDefault();
      fpField.value = await generateFingerprint();
      form.submit();
    }
  });
})();

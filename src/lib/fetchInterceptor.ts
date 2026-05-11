/**
 * S01: Global fetch interceptor that automatically injects JWT Authorization headers
 * into all API requests. This ensures backward-compatible migration without needing
 * to update every single fetch() call across all components.
 * 
 * Import this module once in the app entry point (main.tsx) to activate.
 */

const TOKEN_KEY = 'wayfy_token';

const originalFetch = window.fetch.bind(window);

window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  
  // Only intercept API requests to our own server
  if (url.startsWith('/api/') || url.startsWith(window.location.origin + '/api/')) {
    const token = localStorage.getItem(TOKEN_KEY);
    
    if (token) {
      const headers = new Headers(init?.headers);
      // Don't override if Authorization is already set
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      init = { ...init, headers };
    }
  }

  return originalFetch(input, init);
};

export {}; // Ensure this is treated as a module

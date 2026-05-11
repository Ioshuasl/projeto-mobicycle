import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCacheBustedUrl(url: string, version?: string) {
  if (!url) return url;
  if (!version) return url;
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${version}`;
}

// ============================================================
// Auth token utilities (JWT-based authentication)
// ============================================================
const TOKEN_KEY = 'wayfy_token';
const USER_ID_KEY = 'wayfy_user_id';

export function saveAuthData(userId: string, token?: string) {
  localStorage.setItem(USER_ID_KEY, userId);
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearAuthData() {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  const userId = localStorage.getItem(USER_ID_KEY);
  
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Keep x-user-id as fallback during migration
  if (userId) {
    headers['x-user-id'] = userId;
  }
  return headers;
}

export function getUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem(TOKEN_KEY) || !!localStorage.getItem(USER_ID_KEY);
}

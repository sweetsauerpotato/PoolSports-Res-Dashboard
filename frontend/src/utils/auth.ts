/**
 * Shared utility for retrieving the authentication PIN from sessionStorage.
 * Used by all API services.
 */
export function getPin(): string {
  return sessionStorage.getItem('pin') ?? ''
}

/**
 * API Configuration
 * Centralized API settings for consistent backend communication
 */

// API Base URL from environment or default
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8001'

// Timeout configurations (in milliseconds)
export const TIMEOUT_CONFIG = {
  STANDARD: 30000,        // 30 seconds for standard requests
  DASHBOARD: 180000,      // 3 minutes for dashboard initial load
  ENRICHMENT: 120000,     // 2 minutes for enrichment data
  KEYWORD_ANALYSIS: 300000, // 5 minutes for keyword analysis (can be slow with many products)
  SHORT: 10000            // 10 seconds for quick operations
}

// Polling configuration
export const POLLING_CONFIG = {
  INITIAL_DELAY: 1000,    // Start with 1 second
  INCREMENT: 500,         // Increment by 500ms
  MAX_DELAY: 5000         // Cap at 5 seconds
}

/**
 * Fetch with timeout protection
 * @param {string} url - Request URL
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeout = TIMEOUT_CONFIG.STANDARD) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error('İstek zaman aşımına uğradı - sunucu yanıt vermiyor')
    }
    throw err
  }
}

/**
 * Exponential backoff calculator with jitter
 * @param {number} currentDelay - Current delay value
 * @returns {number} Next delay value
 */
export function calculateNextDelay(currentDelay) {
  // True exponential backoff with jitter to prevent thundering herd
  const nextDelay = currentDelay * 1.5 + Math.random() * 500
  return Math.min(nextDelay, POLLING_CONFIG.MAX_DELAY)
}

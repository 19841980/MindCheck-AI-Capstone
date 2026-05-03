/**
 * MindCheck Frontend — API Service Wrapper.
 *
 * Centralizes all HTTP communication with the FastAPI backend.
 * All API calls go through this module — never from components directly.
 *
 * Handles:
 * - Base URL configuration
 * - Auth headers (JWT from Supabase session)
 * - Error interceptors
 * - Request/response transformation
 * - Manual emotion fallback (SRS §6.3)
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Base fetch wrapper with auth headers and error handling.
 */
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('mindcheck_token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.detail || 'Error en la solicitud');
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  // 204 No Content
  if (response.status === 204) return null;

  return response.json();
}

// --- Journal Entry API ---

export const journalApi = {
  /**
   * Create a new journal entry and trigger AI analysis.
   * POST /api/v1/journal/analyze
   *
   * Response includes ai_available flag:
   * - true → analysis completed, display results
   * - false → AI failed, show manual emotion picker
   */
  async analyzeEntry(content) {
    return apiFetch('/api/v1/journal/analyze', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  /**
   * Save a manually selected emotion (fallback when AI fails).
   * POST /api/v1/journal/manual-emotion
   */
  async saveManualEmotion(entryId, dominantEmotion, sentimentScore = 0, riskLevel = 'bajo') {
    return apiFetch('/api/v1/journal/manual-emotion', {
      method: 'POST',
      body: JSON.stringify({
        entry_id: entryId,
        dominant_emotion: dominantEmotion,
        sentiment_score: sentimentScore,
        risk_level: riskLevel,
      }),
    });
  },

  /**
   * Get paginated journal entries for the current student.
   * GET /api/v1/journal/entries
   */
  async getEntries(limit = 50, offset = 0) {
    return apiFetch(`/api/v1/journal/entries?limit=${limit}&offset=${offset}`);
  },

  /**
   * Get a single entry with full analysis (content is decrypted server-side).
   * GET /api/v1/journal/entries/:id
   */
  async getEntryDetail(entryId) {
    return apiFetch(`/api/v1/journal/entries/${entryId}`);
  },

  /**
   * Permanently delete a journal entry.
   * DELETE /api/v1/journal/entries/:id
   */
  async deleteEntry(entryId) {
    return apiFetch(`/api/v1/journal/entries/${entryId}`, {
      method: 'DELETE',
    });
  },
};

// --- Health Check ---

export async function checkApiHealth() {
  return apiFetch('/health');
}

export default apiFetch;

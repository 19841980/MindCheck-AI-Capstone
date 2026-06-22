import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';

// Mock Supabase client Auth methods
vi.mock('../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// Mock alertsApi to prevent errors on mount
vi.mock('../services/api', () => ({
  alertsApi: {
    getUnreadCount: vi.fn(),
  },
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing and mounts the LoginPage if there is no user session', async () => {
    const { supabase } = await import('../services/supabaseClient');
    
    // Configure session as null
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    // Return empty unsubscribe method
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    render(<App />);

    // Wait for App to evaluate the session and render the LoginPage
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Mind\s*Check/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Correo Institucional/i)).toBeInTheDocument();
    });
  });
});

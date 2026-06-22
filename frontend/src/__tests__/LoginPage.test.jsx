import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';

// Mock Supabase client auth methods
vi.mock('../services/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLoginPage = (onLogin = vi.fn()) => {
    return render(
      <BrowserRouter>
        <LoginPage onLogin={onLogin} />
      </BrowserRouter>
    );
  };

  it('renders login form labels and inputs', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/Correo Institucional/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña', { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ingresar/i })).toBeInTheDocument();
  });

  it('shows validation error for non-institutional email domain', async () => {
    renderLoginPage();
    const emailInput = screen.getByLabelText(/Correo Institucional/i);
    const passwordInput = screen.getByLabelText('Contraseña', { selector: 'input' });
    const submitBtn = screen.getByRole('button', { name: /Ingresar/i });

    // Fill out form with non-institutional email
    fireEvent.change(emailInput, { target: { value: 'student@gmail.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Solo se permiten correos institucionales (@duocuc.cl o @profesor.duoc.cl).')
      ).toBeInTheDocument();
    });
  });

  it('calls Supabase auth and onLogin callback when inputting institutional email', async () => {
    const mockOnLogin = vi.fn();
    const { supabase } = await import('../services/supabaseClient');
    
    // Configure mock success response
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'test-user-uuid', email: 'test.student@duocuc.cl' } },
      error: null,
    });

    renderLoginPage(mockOnLogin);
    const emailInput = screen.getByLabelText(/Correo Institucional/i);
    const passwordInput = screen.getByLabelText('Contraseña', { selector: 'input' });
    const submitBtn = screen.getByRole('button', { name: /Ingresar/i });

    // Fill out with valid institutional email
    fireEvent.change(emailInput, { target: { value: 'test.student@duocuc.cl' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test.student@duocuc.cl',
        password: 'Password123!',
      });
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });
});

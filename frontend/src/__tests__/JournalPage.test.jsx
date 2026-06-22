import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import JournalPage from '../pages/JournalPage';

// Mock the services API call
vi.mock('../services/api', () => ({
  journalApi: {
    getEntries: vi.fn(),
    deleteEntry: vi.fn(),
  },
}));

describe('JournalPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderJournalPage = () => {
    return render(
      <BrowserRouter>
        <JournalPage />
      </BrowserRouter>
    );
  };

  it('renders loading state initially then list of entries', async () => {
    const { journalApi } = await import('../services/api');
    journalApi.getEntries.mockResolvedValue({
      entries: [
        {
          id: '1a',
          content: 'Hoy me siento muy feliz.',
          sentiment_score: 0.9,
          dominant_emotion: 'alegría',
          risk_level: 'bajo',
          keywords: ['feliz'],
          created_at: '2026-06-21T12:00:00Z',
        },
      ],
    });

    renderJournalPage();

    // Check skeletal loaders
    expect(screen.getAllByRole('article', { busy: true })).toHaveLength(3);

    // Wait for the mock entries to render in their place
    await waitFor(() => {
      expect(screen.getByText(/Hoy me siento muy feliz/)).toBeInTheDocument();
      expect(screen.getByText('Alegría', { selector: '.emotion-badge__label' })).toBeInTheDocument();
    });
  });

  it('allows searching within entries', async () => {
    const { journalApi } = await import('../services/api');
    journalApi.getEntries.mockResolvedValue({
      entries: [
        {
          id: '1a',
          content: 'Hoy me siento muy feliz.',
          sentiment_score: 0.9,
          dominant_emotion: 'alegría',
          risk_level: 'bajo',
          keywords: ['feliz'],
          created_at: '2026-06-21T12:00:00Z',
        },
        {
          id: '2b',
          content: 'Estoy estresado por los exámenes.',
          sentiment_score: -0.6,
          dominant_emotion: 'estrés',
          risk_level: 'moderado',
          keywords: ['estresado'],
          created_at: '2026-06-21T14:00:00Z',
        },
      ],
    });

    renderJournalPage();

    await waitFor(() => {
      expect(screen.getByText(/Hoy me siento muy feliz/)).toBeInTheDocument();
      expect(screen.getByText(/Estoy estresado por los exámenes/)).toBeInTheDocument();
    });

    // Search for "estresado"
    const searchInput = screen.getByLabelText(/Buscar entradas de bitácora/i);
    fireEvent.change(searchInput, { target: { value: 'estresado' } });

    expect(screen.queryByText(/Hoy me siento muy feliz/)).not.toBeInTheDocument();
    expect(screen.getByText(/Estoy estresado por los exámenes/)).toBeInTheDocument();
  });

  it('allows deleting an entry', async () => {
    const { journalApi } = await import('../services/api');
    journalApi.getEntries.mockResolvedValue({
      entries: [
        {
          id: '1a',
          content: 'Hoy me siento muy feliz.',
          sentiment_score: 0.9,
          dominant_emotion: 'alegría',
          risk_level: 'bajo',
          keywords: ['feliz'],
          created_at: '2026-06-21T12:00:00Z',
        },
      ],
    });
    journalApi.deleteEntry.mockResolvedValue();

    renderJournalPage();

    await waitFor(() => {
      expect(screen.getByText(/Hoy me siento muy feliz/)).toBeInTheDocument();
    });

    // Click delete button
    const deleteBtn = screen.getByTitle('Eliminar entrada');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(journalApi.deleteEntry).toHaveBeenCalledWith('1a');
      expect(screen.queryByText(/Hoy me siento muy feliz/)).not.toBeInTheDocument();
    });
  });
});

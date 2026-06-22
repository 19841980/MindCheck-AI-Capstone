import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OfflineBanner from '../components/atoms/OfflineBanner';

describe('OfflineBanner Component', () => {
  it('should render nothing when navigator.onLine is true', () => {
    // Mock navigator.onLine to return true
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('should show Sin conexión banner when browser goes offline', () => {
    // Mock navigator.onLine to return false
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    
    render(<OfflineBanner />);
    
    // Fire the offline window event
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    
    expect(screen.getByText('Sin conexión — Los datos guardados siguen disponibles')).toBeInTheDocument();
  });

  it('should show Conexión restaurada banner when browser returns online', () => {
    // Mock navigator.onLine to return true
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    
    render(<OfflineBanner />);
    
    // Fire the online window event
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    
    expect(screen.getByText('Conexión restaurada')).toBeInTheDocument();
  });
});

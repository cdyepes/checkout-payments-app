import { render, screen, waitFor } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    window.localStorage.clear();
  });

  it('boots the store, router and renders the product page', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    render(<App />);

    await waitFor(() => expect(screen.getByText('Store')).toBeInTheDocument());
  });
});

import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SvgImageCard } from '../SvgImageCard';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const VALID_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#050508"/><circle cx="256" cy="256" r="120" fill="#22d3ee"/></svg>`;

describe('SvgImageCard', () => {
  it('renders the preview image with export actions', () => {
    render(<SvgImageCard svg={VALID_SVG} width={512} height={512} />);

    const card = screen.getByTestId('svg-image-card');
    expect(card).toBeTruthy();

    const img = screen.getByAltText('AI-generated image rendered from SVG code') as HTMLImageElement;
    expect(img.src.startsWith('blob:')).toBe(true);

    expect(screen.getByLabelText('Download image as PNG')).toBeTruthy();
    expect(screen.getByLabelText('Download image as JPG')).toBeTruthy();
    expect(screen.getByLabelText('Copy SVG code')).toBeTruthy();
    expect(screen.getByText('coded image · svg · 512×512')).toBeTruthy();
    expect(screen.getByText('rendered on-device · nothing uploaded')).toBeTruthy();
  });

  it('opens the SVG source in Canvas via the Code button', () => {
    const onOpenCanvas = vi.fn();
    render(<SvgImageCard svg={VALID_SVG} onOpenCanvas={onOpenCanvas} />);

    fireEvent.click(screen.getByLabelText('Open SVG code in Canvas'));
    expect(onOpenCanvas).toHaveBeenCalledWith(VALID_SVG, 'svg');
  });

  it('omits the dimensions label when size is unknown', () => {
    render(<SvgImageCard svg={VALID_SVG} />);
    expect(screen.getByText('coded image · svg')).toBeTruthy();
  });
});

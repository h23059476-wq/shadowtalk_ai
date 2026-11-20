import { describe, it, expect } from 'vitest';
import {
  codedImageFileName,
  isCodedSvgFence,
  svgToRasterBlob,
  validateSvg,
} from '../codedImages';

const VALID_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#050508"/><circle cx="256" cy="256" r="120" fill="#22d3ee"/></svg>`;

describe('isCodedSvgFence', () => {
  it('accepts svg language fences', () => {
    expect(isCodedSvgFence('svg', 'anything')).toBe(true);
    expect(isCodedSvgFence('SVG', 'anything')).toBe(true);
  });

  it('accepts xml fences that start with an svg root', () => {
    expect(isCodedSvgFence('xml', VALID_SVG)).toBe(true);
    expect(isCodedSvgFence('xml', '<root><child/></root>')).toBe(false);
  });

  it('accepts bare fences that look like complete svg drawings', () => {
    expect(isCodedSvgFence(undefined, VALID_SVG)).toBe(true);
    expect(isCodedSvgFence(undefined, '<svg><circle/></svg>')).toBe(true);
    expect(isCodedSvgFence(undefined, 'just some text')).toBe(false);
  });

  it('rejects other languages', () => {
    expect(isCodedSvgFence('javascript', VALID_SVG)).toBe(false);
    expect(isCodedSvgFence('html', VALID_SVG)).toBe(false);
    expect(isCodedSvgFence('json', '{}')).toBe(false);
  });
});

describe('validateSvg', () => {
  it('accepts a clean svg and reports its dimensions', () => {
    const result = validateSvg(VALID_SVG);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.width).toBe(512);
      expect(result.height).toBe(512);
      expect(result.svg.startsWith('<svg')).toBe(true);
      expect(result.svg.endsWith('</svg>')).toBe(true);
    }
  });

  it('keeps the w3.org namespace but rejects real external URLs', () => {
    expect(validateSvg(VALID_SVG).ok).toBe(true);
    const external = VALID_SVG.replace(
      'fill="#22d3ee"',
      'fill="url(https://evil.example/pattern.png)"',
    );
    const result = validateSvg(external);
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.reason).toContain('external URLs');
  });

  it('rejects protocol-relative references', () => {
    const proto = VALID_SVG.replace('fill="#22d3ee"', 'fill="url(//evil.example/p.png)"');
    expect(validateSvg(proto).ok).toBe(false);
  });

  it('rejects external href/src but allows data: URIs and #refs', () => {
    const extImage = VALID_SVG.replace(
      '<circle',
      '<image href="https://evil.example/x.png"/><circle',
    );
    expect(validateSvg(extImage).ok).toBe(false);

    const dataImage = VALID_SVG.replace(
      '<circle',
      '<image href="data:image/png;base64,iVBORw0KGgo="/><circle',
    );
    expect(validateSvg(dataImage).ok).toBe(true);

    const internalRef = VALID_SVG.replace(
      '<circle',
      '<use href="#dot"/><circle id="dot"',
    );
    expect(validateSvg(internalRef).ok).toBe(true);
  });

  it('rejects scripts and event handler attributes', () => {
    const scripted = VALID_SVG.replace('</svg>', '<script>alert(1)</script></svg>');
    const scriptResult = validateSvg(scripted);
    expect(scriptResult.ok).toBe(false);
    if (scriptResult.ok === false) expect(scriptResult.reason).toContain('scripts');

    const handler = VALID_SVG.replace('<svg ', '<svg onload="alert(1)" ');
    const handlerResult = validateSvg(handler);
    expect(handlerResult.ok).toBe(false);
    if (handlerResult.ok === false) expect(handlerResult.reason).toContain('event handler');
  });

  it('derives dimensions from viewBox when width/height are missing', () => {
    const viewBoxOnly = VALID_SVG.replace(' width="512" height="512"', '');
    const result = validateSvg(viewBoxOnly);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.width).toBe(512);
      expect(result.height).toBe(512);
      // Injected for deterministic <img> layout and rasterization.
      expect(result.svg).toMatch(/\swidth="512"/);
      expect(result.svg).toMatch(/\sheight="512"/);
    }
  });

  it('falls back to 1024x1024 when nothing declares a size', () => {
    const bare = '<svg><circle r="40"/></svg>';
    const result = validateSvg(bare);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.width).toBe(1024);
      expect(result.height).toBe(1024);
    }
  });

  it('trims trailing prose after the closing svg tag', () => {
    const withProse = `${VALID_SVG}\n\nHere is your logo!`;
    const result = validateSvg(withProse);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.svg.endsWith('</svg>')).toBe(true);
  });

  it('rejects input without a complete svg element', () => {
    expect(validateSvg('no svg here').ok).toBe(false);
    expect(validateSvg('<svg><circle/></svg').ok).toBe(false);
  });
});

describe('svgToRasterBlob', () => {
  /** happy-dom never fires Image load/error events — drive them explicitly. */
  function withMockImage(behavior: 'error' | 'load', run: () => Promise<unknown>) {
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = '';
      get src(): string {
        return this._src;
      }
      set src(value: string) {
        this._src = value;
        queueMicrotask(() => {
          if (behavior === 'load') this.onload?.();
          else this.onerror?.();
        });
      }
    }
    const original = globalThis.Image;
    (globalThis as unknown as { Image: unknown }).Image = MockImage;
    return run().finally(() => {
      (globalThis as unknown as { Image: unknown }).Image = original;
    });
  }

  it('rejects with a clean error when the SVG cannot be rendered', async () => {
    await withMockImage('error', async () => {
      await expect(
        svgToRasterBlob(VALID_SVG, { format: 'png' }),
      ).rejects.toThrow('could not be rendered');
    });
  });

  it('rejects with a clean error when the canvas 2D context is unavailable', async () => {
    await withMockImage('load', async () => {
      await expect(
        svgToRasterBlob(VALID_SVG, { format: 'png' }),
      ).rejects.toThrow('Canvas 2D context');
    });
  });
});

describe('codedImageFileName', () => {
  it('builds a timestamped filename', () => {
    const name = codedImageFileName('png', new Date(2026, 10, 20, 14, 32, 5));
    expect(name).toBe('shadowtalk-coded-image-20261120-143205.png');
  });

  it('supports jpg for jpeg exports', () => {
    const name = codedImageFileName('jpg', new Date(2026, 0, 2, 3, 4, 5));
    expect(name).toBe('shadowtalk-coded-image-20260102-030405.jpg');
  });
});

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useHotkeys } from './useHotkeys';

function press(key: string, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, ...options });
  window.dispatchEvent(event);
}

function pressOn(target: EventTarget, key: string, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, ...options });
  target.dispatchEvent(event);
}

describe('useHotkeys', () => {
  it('ejecuta el handler al presionar una tecla sin modificadores', () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ key: 'n', handler }]));

    act(() => press('n'));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignora teclas de una letra mientras se escribe en un input', () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ key: 'n', handler }]));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    act(() => pressOn(input, 'n'));
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('permite teclas marcadas allowInInput dentro de un input', () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ key: 'F2', allowInInput: true, handler }]));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    act(() => pressOn(input, 'F2'));
    expect(handler).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
  });

  it('respeta modificadores como Alt', () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ key: '1', alt: true, handler }]));

    act(() => press('1'));
    expect(handler).not.toHaveBeenCalled();

    act(() => press('1', { altKey: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

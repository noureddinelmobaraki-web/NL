import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemePicker } from '../ThemePicker';

describe('ThemePicker', () => {
  it('يعرض الأزرار الستة وينادي onPick عند النقر', () => {
    const onPick = vi.fn();
    render(<ThemePicker onPick={onPick} />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(6);
    
    fireEvent.click(buttons[0]);
    expect(onPick).toHaveBeenCalledWith('midnight');
  });
});

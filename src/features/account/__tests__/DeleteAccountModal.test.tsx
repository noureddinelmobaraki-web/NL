import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup }             from '@testing-library/react';

const mockDeleteAccount = vi.fn();

vi.mock('../useDeleteAccount', () => ({
  useDeleteAccount: () => ({
    deleteAccount: mockDeleteAccount,
    status:   'idle',
    errorMsg: null,
    reset:    vi.fn(),
  }),
}));

import { DeleteAccountModal } from '../DeleteAccountModal';

describe('DeleteAccountModal', () => {
  const onClose   = vi.fn();
  const onDeleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the confirmation dialog', () => {
    render(<DeleteAccountModal onClose={onClose} onDeleted={onDeleted} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /delete account/i })).toBeTruthy();
    expect(screen.getByLabelText(/confirm account deletion/i)).toBeTruthy();
  });

  it('confirm button is disabled when input is empty', () => {
    render(<DeleteAccountModal onClose={onClose} onDeleted={onDeleted} />);
    expect((screen.getByLabelText(/confirm account deletion/i) as HTMLButtonElement).disabled).toBe(true);
  });

  it('confirm button is disabled when input is wrong', () => {
    render(<DeleteAccountModal onClose={onClose} onDeleted={onDeleted} />);
    fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'delete' } });
    expect((screen.getByLabelText(/confirm account deletion/i) as HTMLButtonElement).disabled).toBe(true);
  });

  it('confirm button enables when input is DELETE', () => {
    render(<DeleteAccountModal onClose={onClose} onDeleted={onDeleted} />);
    fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } });
    expect((screen.getByLabelText(/confirm account deletion/i) as HTMLButtonElement).disabled).toBe(false);
  });

  it('calls deleteAccount and onDeleted on successful confirmation', async () => {
    mockDeleteAccount.mockResolvedValue(true);
    render(<DeleteAccountModal onClose={onClose} onDeleted={onDeleted} />);
    fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByLabelText(/confirm account deletion/i));
    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    expect(mockDeleteAccount).toHaveBeenCalledOnce();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<DeleteAccountModal onClose={onClose} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when X button is clicked', () => {
    render(<DeleteAccountModal onClose={onClose} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByLabelText(/close dialog/i));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

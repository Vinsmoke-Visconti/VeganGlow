import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockRpc = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ rpc: mockRpc, from: mockFrom }),
}));

import { audit } from './auditLog';

const originalPepper = process.env.AUDIT_IP_PEPPER;

beforeEach(() => {
  mockRpc.mockReset();
  mockInsert.mockReset().mockResolvedValue({ error: null });
  mockFrom.mockClear();
  process.env.AUDIT_IP_PEPPER = 'a'.repeat(32);
});

afterEach(() => {
  if (originalPepper === undefined) delete process.env.AUDIT_IP_PEPPER;
  else process.env.AUDIT_IP_PEPPER = originalPepper;
});

describe('audit', () => {
  it('calls log_admin_action_v2 with shaped payload for auth.login_success', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'uuid-123', error: null });
    await audit(
      { action: 'auth.login_success', severity: 'info', details: { method: 'password' } },
      { ip: '1.2.3.4' }
    );
    expect(mockRpc).toHaveBeenCalledWith(
      'log_admin_action_v2',
      expect.objectContaining({
        p_action: 'auth.login_success',
        p_severity: 'info',
        p_details: { method: 'password' },
      })
    );
  });

  it('hashes IP before sending', async () => {
    mockRpc.mockResolvedValue({ data: 'uuid', error: null });
    await audit(
      { action: 'auth.login_success', severity: 'info', details: { method: 'password' } },
      { ip: '1.2.3.4' }
    );
    const payload = mockRpc.mock.calls[0][1];
    expect(payload.p_ip_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.p_ip_hash).not.toBe('1.2.3.4');
  });

  it('does NOT throw when RPC fails — routes to DLQ', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('db down') });
    await expect(
      audit({ action: 'auth.login_success', severity: 'info', details: { method: 'password' } })
    ).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('audit_logs_dlq');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ error_msg: 'db down' })
    );
  });

  it('passes entity + entity_id for product events', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'uuid', error: null });
    await audit({
      action: 'product.updated',
      severity: 'info',
      entity: 'product',
      entity_id: 'prod-123',
      summary: 'Updated price',
    });
    const payload = mockRpc.mock.calls[0][1];
    expect(payload.p_entity).toBe('product');
    expect(payload.p_entity_id).toBe('prod-123');
    expect(payload.p_summary).toBe('Updated price');
  });

  it('omits ip_hash when no ip given', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'uuid', error: null });
    await audit({ action: 'auth.logout', severity: 'info' });
    expect(mockRpc.mock.calls[0][1].p_ip_hash).toBeNull();
  });
});

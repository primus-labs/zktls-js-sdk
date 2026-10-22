import { ZkAttestationError } from '../src/error.js';

describe('algorithm error messages', () => {
  const fallback = 'Internal algorithm error. Contact Primus Team for assistance.';

  it('describes a base 50000 error when no subcode is available', () => {
    expect(new ZkAttestationError('50000').message).toBe(fallback);
  });

  it('falls back to the base message for an unrecognized algorithm subcode', () => {
    const error = new ZkAttestationError('50000', undefined, undefined, { subCode: '599' });
    expect(error.message).toBe(fallback);
    expect(error.subCode).toBe('599');
  });

  it('preserves a recognized algorithm subcode', () => {
    const error = new ZkAttestationError('50000', undefined, undefined, { subCode: '501' });
    expect(error.message).toBe(fallback);
    expect(error.subCode).toBe('501');
  });

  it('keeps an explicit message from the caller', () => {
    expect(new ZkAttestationError('50000', 'Specific server detail').message)
      .toBe('Specific server detail');
  });

  it('retains specific messages for other error families', () => {
    const error = new ZkAttestationError('30001', undefined, undefined, { subCode: '401' });
    expect(error.message).toBe('Session expired. Please log in again.');
  });

  it('retains legacy nested subcodes and the JSON wire format', () => {
    const error = new ZkAttestationError('50000', undefined, {
      details: { subCode: '599' }, traceId: 'public-example',
    });
    expect(error.message).toBe(fallback);
    expect(error.toJSON()).toEqual({
      code: '50000', message: fallback, subCode: '599',
      data: '{"traceId":"public-example"}',
    });
  });
});

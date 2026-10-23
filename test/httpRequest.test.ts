import { request } from '../src/utils/httpRequest.js';

describe('request response parsing', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parses valid JSON responses', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"rc":0,"result":{"remainingQuota":10}}')
    );

    await expect(request({ url: 'https://example.com' })).resolves.toEqual({
      rc: 0,
      result: { remainingQuota: 10 }
    });
  });

  it.each([undefined, 'json'] as const)(
    'falls back to the original text when responseType is %s and JSON is invalid',
    async (responseType) => {
      const body = '<html>Service temporarily unavailable</html>';
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body));

      await expect(request({ url: 'https://example.com', responseType })).resolves.toBe(body);
    }
  );

  it('returns an empty string for an empty response', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    await expect(request({ url: 'https://example.com' })).resolves.toBe('');
  });

  it.each([
    { body: 'Service unavailable', expected: 'Service unavailable' },
    { body: '{"message":"Service unavailable"}', expected: { message: 'Service unavailable' } }
  ])('preserves HTTP error metadata for body $body', async ({ body, expected }) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(body, { status: 503, statusText: 'Service Unavailable' })
    );

    await expect(request({ url: 'https://example.com' })).rejects.toMatchObject({
      message: 'HTTP 503: Service Unavailable',
      status: 503,
      statusText: 'Service Unavailable',
      data: expected
    });
  });

  it('leaves explicitly requested text unparsed', async () => {
    const body = '{"rc":0}';
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body));

    await expect(request({ url: 'https://example.com', responseType: 'text' })).resolves.toBe(body);
  });

  it.each(['blob', 'arrayBuffer'] as const)('preserves %s responses', async (responseType) => {
    const bytes = new Uint8Array([0, 127, 255]);
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(bytes));

    const result = await request<Blob | ArrayBuffer>({ url: 'https://example.com', responseType });
    const buffer = result instanceof Blob ? await result.arrayBuffer() : result;
    expect(new Uint8Array(buffer)).toEqual(bytes);
  });

  it('propagates response stream errors', async () => {
    const error = new Error('Response stream interrupted');
    const stream = new ReadableStream({
      start(controller) {
        controller.error(error);
      }
    });
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(stream));

    await expect(request({ url: 'https://example.com' })).rejects.toBe(error);
  });
});

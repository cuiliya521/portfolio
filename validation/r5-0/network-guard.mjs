// Audit only: preserve loopback HTTP tests, deny every external request.
const original = globalThis.fetch;
globalThis.fetch = (input, options) => {
  const url = new URL(typeof input === 'string' ? input : input.url || String(input));
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') {
    throw new Error('R5_0_EXTERNAL_FETCH_DENIED');
  }
  return original(input, options);
};

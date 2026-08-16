import test from 'node:test';
import assert from 'node:assert/strict';

// Keep this test isolated from any developer Redis credentials and make the
// fallback ceiling small enough to exercise the exhausted state.
process.env.AI_MONTHLY_LIMIT = '2';
const { __reset } = await import('../lib/rateLimit.js');
const { checkAiAttempt, checkAiRequest } = await import('../lib/aiRateLimit.js');

test.beforeEach(() => __reset());

test('development fallback enforces the monthly paid-attempt ceiling', async () => {
  assert.deepEqual(await checkAiAttempt(), { allowed: true });
  assert.deepEqual(await checkAiAttempt(), { allowed: true });
  const denied = await checkAiAttempt();
  assert.equal(denied.allowed, false);
  assert.match(denied.message, /monthly AI generation budget is exhausted/i);
});

test('development fallback applies per-IP request windows', async () => {
  const first = await checkAiRequest('198.51.100.10');
  assert.equal(first.allowed, true);
});

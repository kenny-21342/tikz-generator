import test from 'node:test';
import assert from 'node:assert/strict';

import {
  __reset,
  checkAll,
  clientIp,
  consume,
  refund,
} from '../lib/rateLimit.js';

test.beforeEach(() => __reset());

test('consume allows exactly the configured number of requests', () => {
  const now = 1_000;
  assert.deepEqual(consume('ip:a', 2, 10_000, now), {
    allowed: true,
    remaining: 1,
    resetAt: 11_000,
    retryAfter: 10,
  });
  assert.equal(consume('ip:a', 2, 10_000, now).allowed, true);
  const denied = consume('ip:a', 2, 10_000, now);
  assert.equal(denied.allowed, false);
  assert.equal(denied.retryAfter, 10);
});

test('a fixed window resets at its boundary', () => {
  assert.equal(consume('ip:a', 1, 5_000, 1_000).allowed, true);
  assert.equal(consume('ip:a', 1, 5_000, 5_999).allowed, false);
  assert.equal(consume('ip:a', 1, 5_000, 6_000).allowed, true);
});

test('refund returns a consumed slot without making the count negative', () => {
  const now = 1_000;
  consume('ip:a', 1, 5_000, now);
  refund('ip:a', now);
  refund('ip:a', now);
  assert.equal(consume('ip:a', 1, 5_000, now).allowed, true);
});

test('checkAll reports the first failing rule and consumed keys', () => {
  const rules = [
    { key: 'hour', limit: 2, windowMs: 10_000, message: 'hourly' },
    { key: 'day', limit: 1, windowMs: 20_000, message: 'daily' },
  ];
  assert.deepEqual(checkAll(rules, 1_000), { allowed: true, keys: ['hour', 'day'] });
  const denied = checkAll(rules, 1_000);
  assert.equal(denied.allowed, false);
  assert.equal(denied.message, 'daily');
  assert.deepEqual(denied.keys, ['hour', 'day']);
});

test('clientIp uses the original forwarded address and throttles unknown clients together', () => {
  const request = {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }),
  };
  assert.equal(clientIp(request), '203.0.113.9');
  assert.equal(clientIp({ headers: new Headers() }), 'unknown');
});

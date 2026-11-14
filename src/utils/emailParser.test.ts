import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEmailList, removeSentEmail, calculateBounceRate } from './emailParser.ts';

test('parseEmailList correctly splits multi-line and comma-separated emails and cleans duplicates', () => {
  const raw = `
    user1@example.com
    user2@test.org, user3@domain.co
    "Admin User" <admin@server.io>
    invalid-email-address
    user1@example.com
  `;

  const result = parseEmailList(raw);
  assert.equal(result.valid.length, 4);
  assert.deepEqual(result.valid, [
    'user1@example.com',
    'user2@test.org',
    'user3@domain.co',
    'admin@server.io'
  ]);
  assert.equal(result.invalid.length, 1);
  assert.equal(result.invalid[0], 'invalid-email-address');
  assert.equal(result.duplicatesCount, 1);
});

test('removeSentEmail deletes the sent email from text and preserves remaining', () => {
  const input = `alex@example.com\nbob@test.com\ncharlie@sample.org`;
  const updated = removeSentEmail(input, 'bob@test.com');
  assert.equal(updated, `alex@example.com\ncharlie@sample.org`);

  // Test removing first
  const updatedFirst = removeSentEmail(updated, 'alex@example.com');
  assert.equal(updatedFirst, `charlie@sample.org`);

  // Test removing last
  const updatedLast = removeSentEmail(updatedFirst, 'charlie@sample.org');
  assert.equal(updatedLast, ``);
});

test('calculateBounceRate computes proper percentage', () => {
  assert.equal(calculateBounceRate(100, 2), 2.0);
  assert.equal(calculateBounceRate(50, 5), 10.0);
  assert.equal(calculateBounceRate(0, 0), 0);
  assert.equal(calculateBounceRate(200, 3), 1.5);
});

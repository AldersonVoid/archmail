import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSpamScore, substituteTokens } from './spamChecker.ts';

test('analyzeSpamScore flags empty subjects and spam trigger words', () => {
  const badEmail = analyzeSpamScore(
    '',
    'ACT NOW! Make money fast and claim your 100% free guaranteed cash bonus! http://bit.ly/claim',
    false
  );

  assert.ok(badEmail.score > 50, `Score should be elevated for spammy text, got ${badEmail.score}`);
  assert.ok(badEmail.riskLevel === 'high' || badEmail.riskLevel === 'critical');
  const triggerHit = badEmail.ruleHits.find(r => r.id === 'TRIGGER_KEYWORDS');
  assert.ok(triggerHit !== undefined);
  const urlHit = badEmail.ruleHits.find(r => r.id === 'URL_SHORTENERS');
  assert.ok(urlHit !== undefined);
});

test('analyzeSpamScore awards clean score for professional email with unsubscribe', () => {
  const goodEmail = analyzeSpamScore(
    'Monthly Product Update - October Architecture Release',
    'Hello team,\n\nHere is our latest update on the platform improvements and release notes.\n\nBest regards,\nThe Core Team\n\nTo manage your preferences or unsubscribe, visit your profile settings.',
    false
  );

  assert.ok(goodEmail.score < 25, `Clean email score should be low, got ${goodEmail.score}`);
  assert.equal(goodEmail.riskLevel, 'clean');
});

test('substituteTokens properly substitutes dynamic variables', () => {
  const tpl = 'Hello {name}, your login for {domain} is confirmed. Ref: {random_id}';
  const substituted = substituteTokens(tpl, 'sarah.connor@cyberdyne.org');

  assert.ok(substituted.includes('Sarah Connor'));
  assert.ok(substituted.includes('cyberdyne.org'));
  assert.ok(!substituted.includes('{name}'));
  assert.ok(!substituted.includes('{domain}'));
});

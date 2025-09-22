import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeToken, tokenize } from './text';

test('normalizeToken lowercases, strips diacritics and punctuation', () => {
  assert.equal(normalizeToken('Caffè!'), 'caffe');
  assert.equal(normalizeToken('HELLO—WORLD'), 'helloworld');
  assert.equal(normalizeToken('  déjà_vu  '), 'dejavu');
});

test('tokenize splits on whitespace and filters empties', () => {
  assert.deepEqual(tokenize('Hello,  world!\nNew\tline'), ['hello','world','new','line']);
});

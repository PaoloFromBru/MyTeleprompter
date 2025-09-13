import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rtfToText, srtToText, mdToText } from './textConverters';

test('rtfToText converts basic RTF', () => {
  const input = "{\\rtf1\\ansi\\deff0 {\\b Bold} \\par Line}";
  assert.equal(rtfToText(input), 'Bold\nLine');
});

test('srtToText removes indices and timecodes', () => {
  const input = `1\n00:00:01,000 --> 00:00:02,000\nHello\n\n2\n00:00:03,000 --> 00:00:04,000\nWorld`;
  assert.equal(srtToText(input), 'Hello\n\nWorld');
});

test('mdToText strips markdown syntax', () => {
  const input = '# Title\nSome *emphasis* and [link](http://example.com).';
  assert.equal(mdToText(input), 'Title\nSome emphasis and link.');
});

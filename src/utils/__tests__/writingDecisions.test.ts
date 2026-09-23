import { describe, expect, it } from 'vitest';
import { MAX_WRITING_DECISION_DATA_LENGTH, parseWritingDecisions, serializeWritingDecisions } from '../writingDecisions';

const key = '0:' + JSON.stringify(['Write in order to remember.', 6, 'in order to', 'A little more direct']);

describe('stored writing decisions', () => {
  it('round trips exact passage keys and removes duplicates', () => {
    expect(serializeWritingDecisions(parseWritingDecisions(JSON.stringify([key, key])))).toBe(JSON.stringify([key]));
  });

  it.each([
    '{}', '[null]', '[1]', '["broken"]',
    JSON.stringify(['-1:' + key.slice(2)]),
    JSON.stringify(['0:' + JSON.stringify(['A different passage.', 6, 'in order to', 'A little more direct'])]),
    JSON.stringify(['0:' + JSON.stringify(['Write in order to remember.', -1, 'in order to', 'A little more direct'])]),
  ])('rejects malformed metadata: %s', value => {
    expect(() => parseWritingDecisions(value)).toThrow();
  });

  it('bounds the stored bytes and number of decisions before using them', () => {
    expect(() => parseWritingDecisions(' '.repeat(MAX_WRITING_DECISION_DATA_LENGTH + 1))).toThrow();
    expect(() => parseWritingDecisions(JSON.stringify(Array(10_001).fill('')))).toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { parseDelimited } from '../csv';

describe('parseDelimited (F-T3)', () => {
  it('tab-separated from a spreadsheet, with a header row', () => {
    expect(parseDelimited('Living area\tPrice\n1\t4\n2.25\t6\n1.5\t5\n')).toEqual({
      header: ['Living area', 'Price'],
      cells: [
        ['1', '4'],
        ['2.25', '6'],
        ['1.5', '5'],
      ],
    });
  });

  it('comma-separated without a header', () => {
    expect(parseDelimited('-1,1\n0,0\n1,0\n2,2')).toEqual({
      header: null,
      cells: [
        ['-1', '1'],
        ['0', '0'],
        ['1', '0'],
        ['2', '2'],
      ],
    });
  });

  it('Windows line endings and blank lines are ignored; cells are trimmed', () => {
    expect(parseDelimited('1, 4\r\n\r\n2.25 ,6\r\n').cells).toEqual([
      ['1', '4'],
      ['2.25', '6'],
    ]);
  });

  it('bad cells are kept as text so they can be highlighted', () => {
    expect(parseDelimited('1,4\nn/a,6').cells).toEqual([
      ['1', '4'],
      ['n/a', '6'],
    ]);
  });

  it('a header is detected only when the first row is not numeric', () => {
    expect(parseDelimited('x,y\n1,2').header).toEqual(['x', 'y']);
    expect(parseDelimited('3/4,2\n1,2').header).toBeNull();
  });

  it('ragged rows throw with a reason', () => {
    expect(() => parseDelimited('1,2\n3')).toThrow(/row 2/i);
  });
});

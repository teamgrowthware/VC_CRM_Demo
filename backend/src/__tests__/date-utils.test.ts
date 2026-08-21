import { describe, it, expect } from 'vitest';
import { getShiftBounds, isWeekend } from '../lib/date-utils';

describe('getShiftBounds', () => {
  it('returns 4 AM UTC marker for a midday IST instant', () => {
    // 2025-01-16T09:00:00Z = 2:30 PM IST on Jan 16
    const result = getShiftBounds(new Date('2025-01-16T09:00:00Z'));
    expect(result.toISOString()).toBe('2025-01-16T04:00:00.000Z');
  });

  it('keeps the same shift day at 5 AM IST (just after cutoff)', () => {
    // 2025-01-16T00:30:00Z = 6:00 AM IST on Jan 16
    const result = getShiftBounds(new Date('2025-01-16T00:30:00Z'));
    expect(result.toISOString()).toBe('2025-01-16T04:00:00.000Z');
  });

  it('assigns pre-4AM IST instants to the previous shift day', () => {
    // 2025-01-15T22:30:00Z = 4:00 AM IST on Jan 16 (exactly 4:00, not before)
    const atFour = getShiftBounds(new Date('2025-01-15T22:30:00Z'));
    expect(atFour.toISOString()).toBe('2025-01-16T04:00:00.000Z');

    // 2025-01-15T21:30:00Z = 3:00 AM IST on Jan 16 -> belongs to Jan 15 shift
    const beforeFour = getShiftBounds(new Date('2025-01-15T21:30:00Z'));
    expect(beforeFour.toISOString()).toBe('2025-01-15T04:00:00.000Z');
  });

  it('handles month rollover when rolling back to previous shift day', () => {
    // 2025-02-01T21:30:00Z = 3:00 AM IST on Feb 2 -> belongs to Feb 1 shift
    const result = getShiftBounds(new Date('2025-02-01T21:30:00Z'));
    expect(result.toISOString()).toBe('2025-02-01T04:00:00.000Z');

    // 2025-03-01T21:30:00Z = 3:00 AM IST on Mar 2 -> belongs to Mar 1 shift
    const monthBack = getShiftBounds(new Date('2025-03-01T21:30:00Z'));
    expect(monthBack.toISOString()).toBe('2025-03-01T04:00:00.000Z');
  });

  it('handles year rollover (Dec 31 late night IST)', () => {
    // 2024-12-31T21:30:00Z = 3:00 AM IST on Jan 1, 2025 -> belongs to Dec 31 shift
    const result = getShiftBounds(new Date('2024-12-31T21:30:00Z'));
    expect(result.toISOString()).toBe('2024-12-31T04:00:00.000Z');
  });
});

describe('isWeekend', () => {
  it('treats all Sundays as weekend', () => {
    // 2025-01-05 is a Sunday; 09:00Z = 2:30 PM IST
    expect(isWeekend(new Date('2025-01-05T09:00:00Z'))).toBe(true);
  });

  it('treats 2nd and 4th Saturdays as weekend', () => {
    // 2025-01-11 is the 2nd Saturday (day 11)
    expect(isWeekend(new Date('2025-01-11T09:00:00Z'))).toBe(true);
    // 2025-01-25 is the 4th Saturday (day 25)
    expect(isWeekend(new Date('2025-01-25T09:00:00Z'))).toBe(true);
  });

  it('treats 1st, 3rd and 5th Saturdays as working days', () => {
    // 2025-01-04 is the 1st Saturday (day 4)
    expect(isWeekend(new Date('2025-01-04T09:00:00Z'))).toBe(false);
    // 2025-01-18 is the 3rd Saturday (day 18)
    expect(isWeekend(new Date('2025-01-18T09:00:00Z'))).toBe(false);
    // 2025-03-29 is the 5th Saturday (day 29)
    expect(isWeekend(new Date('2025-03-29T09:00:00Z'))).toBe(false);
  });

  it('treats weekdays as working days', () => {
    expect(isWeekend(new Date('2025-01-06T09:00:00Z'))).toBe(false); // Monday
    expect(isWeekend(new Date('2025-01-10T09:00:00Z'))).toBe(false); // Friday
  });
});

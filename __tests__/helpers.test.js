const { normalizeCarType, daysBetweenInclusive, yearsBetween, formatCurrency } = require('../rentalPrice');

describe('helpers and edge cases', () => {
  test('normalizeCarType returns Unknown for falsy or unknown values', () => {
    expect(normalizeCarType()).toBe('Unknown');
    expect(normalizeCarType(null)).toBe('Unknown');
    expect(normalizeCarType('bogus')).toBe('Unknown');
    expect(normalizeCarType('compact')).toBe('Compact');
  });

  test('daysBetweenInclusive returns empty array when start > end', () => {
    const days = daysBetweenInclusive('2025-06-10', '2025-06-05');
    expect(Array.isArray(days)).toBe(true);
    expect(days.length).toBe(0);
  });

  test('yearsBetween handles month/day boundaries correctly', () => {
    // b is one day before anniversary -> should be 0 full years
    expect(yearsBetween('2020-06-10', '2021-06-09')).toBe(0);
    // same day next year -> 1 year
    expect(yearsBetween('2020-06-10', '2021-06-10')).toBe(1);
    // b month is earlier -> should be 0 full years
    expect(yearsBetween('2020-06-10', '2021-05-10')).toBe(0);
  });

  test('formatCurrency formats numbers to 2 decimals with $', () => {
    expect(formatCurrency(12)).toBe('$12.00');
    expect(formatCurrency(12.345)).toBe('$12.35');
  });

  test('minimum daily price equals age', () => {
    // choose a one-day rental in low season where multipliers would not reduce the price
    // price should at minimum be the driver's age
    const { price } = require('../rentalPrice');
    const res = price('A', 'B', '2025-01-06', '2025-01-06', 'Compact', 40, 10);
    expect(res).toEqual({ success: true, price: '$40.00' });
  });
});
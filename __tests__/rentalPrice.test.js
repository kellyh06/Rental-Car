const { price, isWeekend, isHighSeason } = require('../rentalPrice');

describe('rental price - business rules', () => {
  test('driver under 18 is ineligible', () => {
    const res = price('A', 'B', '2025-06-01', '2025-06-02', 'Compact', 17, 5);
    expect(res).toEqual({ success: false, error: 'Driver too young - cannot quote the price' });
  });

  test('drivers 21 or less can only rent Compact', () => {
    const res = price('A', 'B', '2025-06-01', '2025-06-02', 'Racer', 21, 5);
    expect(res).toEqual({ success: false, error: 'Drivers 21 y/o or less can only rent Compact vehicles' });
  });

  test('missing license years is rejected', () => {
    const res = price('A', 'B', '2025-06-01', '2025-06-02', 'Compact', 30);
    expect(res).toEqual({ success: false, error: 'Driver license years required' });
  });

  test('license held less than 1 year is ineligible', () => {
    // pickup 2025-06-01, license ~5 months -> 0 years
    const res = price('A', 'B', '2025-06-01', '2025-06-02', 'Compact', 30, 0);
    expect(res).toEqual({ success: false, error: 'Driver must have a license for at least 1 year' });
  });

  test('invalid rental period is rejected', () => {
    const res = price('A', 'B', '2025-06-10', '2025-06-05', 'Compact', 30, 15);
    expect(res).toEqual({ success: false, error: 'Invalid rental period' });
  });

  test('license held less than 2 years increases total by 30% (and <3 adds +15€/day in high season)', () => {
    // pickup 2025-05-05..05-07, license 2024-05-01 => held ~1y4d (<2y and <3y)
    // per-day: base 30 *1.15 (high) = 34.5; +15 = 49.5 -> subtotal 148.5 -> *1.3 = 193.05
    const res = price('A', 'B', '2025-05-05', '2025-05-07', 'Compact', 30, 1); // 1 year -> <2 & <3
    expect(res).toEqual({ success: true, price: '$193.05' });
  });
  test('license held less than 3 years -> +15 per day during high season', () => {
    // pickup 2025-05-05, license 2023-04-01 => held ~2y1m (>=2yrs and <3yrs), so no 30% total increase, but +15€/day applies
    // 1 day in high season: 30*1.15 = 34.5 + 15 = 49.5
    const res = price('A', 'B', '2025-05-05', '2025-05-05', 'Compact', 30, 2); // 2 years -> >=2 & <3
    expect(res).toEqual({ success: true, price: '$49.50' });
  });

  test('racer surcharge 50% applies for <=25 during high season', () => {
    // age 25 on a high season day: 25*1.15*1.5 = 43.125 -> formatted as $43.12
    const res = price('A', 'B', '2025-05-05', '2025-05-05', 'Racer', 25, 6);
    expect(res).toEqual({ success: true, price: '$43.12' });
  });

  test('more than 10 days in low season get 10% discount (weekend surcharge applies)', () => {
    // 11 days 2025-01-01..01-11: includes 3 weekend days (each +5%)
    // weekdays: 8*30=240; weekends:3*31.5=94.5 => subtotal 334.5 -> discount 10% -> 301.05
    const res = price('A', 'B', '2025-01-01', '2025-01-11', 'Compact', 30, 15);
    expect(res).toEqual({ success: true, price: '$301.05' });
  });

  test('example 1: Mon/Tue/Wed three weekdays (50/day) => $150', () => {
    // 2025-02-03 (Mon) -> 2025-02-05 (Wed)
    const res = price('A', 'B', '2025-02-03', '2025-02-05', 'Compact', 50, 15);
    expect(res).toEqual({ success: true, price: '$150.00' });
  });

  test('example 2: Thu/Fri/Sat where Sat is weekend -> $152.50', () => {
    // 2025-02-06 (Thu) -> 2025-02-08 (Sat)
    const res = price('A', 'B', '2025-02-06', '2025-02-08', 'Compact', 50, 15);
    expect(res).toEqual({ success: true, price: '$152.50' });
  });
  test('isWeekend and isHighSeason helpers', () => {
    expect(isWeekend(new Date('2025-02-08'))).toBe(true); // Sat
    expect(isWeekend(new Date('2025-02-05'))).toBe(false); // Wed
    expect(isHighSeason(new Date('2025-05-05'))).toBe(true);
    expect(isHighSeason(new Date('2025-01-05'))).toBe(false);
  });

  test('invalid dates return message', () => {
    const res = price('A', 'B', 'invalid', 'also invalid', 'Compact', 30, '2010-01-01');
    expect(res).toEqual({ success: false, error: 'Invalid dates' });
  });

  test('no license-year-based surcharges when license held >=3 years', () => {
    // single day in high season, age 30, licenseYears 3 -> only high season +15% -> 30*1.15 = 34.5
    const res = price('A', 'B', '2025-05-05', '2025-05-05', 'Compact', 30, 3);
    expect(res).toEqual({ success: true, price: '$34.50' });
  });

  test('unknown car type treated as Unknown and no racer surcharge applied', () => {
    // 25 y/o on high season with unknown type -> should not get racer 50% surcharge
    // 25*1.15 = 28.75
    const res = price('A', 'B', '2025-05-05', '2025-05-05', 'bogus', 25, 5);
    expect(res).toEqual({ success: true, price: '$28.75' });
  });

  test('weekday without weekend surcharge', () => {
    // ensure a weekday (Wed) doesn't get weekend surcharge: 50*3 = 150
    const res = price('A', 'B', '2025-02-04', '2025-02-06', 'Compact', 50, 5);
    expect(res).toEqual({ success: true, price: '$150.00' });
  });
});

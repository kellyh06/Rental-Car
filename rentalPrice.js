/* Refactored rental price calculation with clear helpers */

const SEASON = {
  HIGH: 'High',
  LOW: 'Low'
};

const CAR_TYPES = new Set(['Compact', 'Electric', 'Cabrio', 'Racer']);

function daysBetweenInclusive(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

function isHighSeason(date) {
  const month = date.getMonth(); // 0 = Jan ... 11 = Dec
  // High season: April (3) to October (9) inclusive
  return month >= 3 && month <= 9;
}

function isWeekend(date) {
  const day = date.getDay(); // 0 = Sun, 6 = Sat
  return day === 0 || day === 6;
}

function normalizeCarType(type) {
  if (!type) return 'Unknown';
  const cleaned = String(type).trim();
  const normalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  return CAR_TYPES.has(normalized) ? normalized : 'Unknown';
}

function yearsBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  let years = b.getFullYear() - a.getFullYear();
  const monthDiff = b.getMonth() - a.getMonth();
  const dayDiff = b.getDate() - a.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years--;
  return years;
}

function formatCurrency(value) {
  return '$' + Number(value).toFixed(2);
}

/**
 * Calculate price.
 * Parameters:
 *  - pickup: string location (not used for pricing)
 *  - dropoff: string location (not used for pricing)
 *  - pickupDate: Date or parsable date
 *  - dropoffDate: Date or parsable date
 *  - type: car type name
 *  - age: driver's age (number)
 *  - licenseYears: integer years since the license was obtained (required)
 */
function price(pickup, dropoff, pickupDate, dropoffDate, type, age, licenseYears) {
  const carType = normalizeCarType(type);
  const start = new Date(pickupDate);
  const end = new Date(dropoffDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { success: false, error: 'Invalid dates' };
  }

  if (age < 18) return { success: false, error: 'Driver too young - cannot quote the price' };
  if (age <= 21 && carType !== 'Compact') return { success: false, error: 'Drivers 21 y/o or less can only rent Compact vehicles' };

  const days = daysBetweenInclusive(start, end);
  if (days.length === 0) return { success: false, error: 'Invalid rental period' };

  // License checks (years provided by form)
  if (licenseYears === undefined || licenseYears === null || Number.isNaN(Number(licenseYears))) {
    return { success: false, error: 'Driver license years required' };
  }
  const ly = Number(licenseYears);
  if (ly < 1) return { success: false, error: 'Driver must have a license for at least 1 year' };

  // Compute per-day price
  let dailyTotals = [];

  days.forEach(day => {
    let daily = age; // base daily price (minimum daily price is age)

    // Weekend surcharge +5%
    if (isWeekend(day)) {
      daily *= 1.05;
    }

    // High season surcharge +15% per high season day
    const high = isHighSeason(day);
    if (high) daily *= 1.15;

    // Racer surcharge (50%) if driver <=25 and NOT low season (i.e., only apply on high season days)
    if (carType === 'Racer' && age <= 25 && high) {
      daily *= 1.5;
    }

    // If license held less than 3 years -> during high season add +15 euros to daily
    if (licenseYears < 3 && high) {
      daily += 15;
    }

    // Ensure minimum price per day (age)
    daily = Math.max(daily, age);

    dailyTotals.push(daily);
  });

  let subtotal = dailyTotals.reduce((a, b) => a + b, 0);

  // If license held less than 2 years -> increase price by 30%
  if (licenseYears < 2) subtotal *= 1.3;

  // If renting for more than 10 days and the whole rental is in Low season -> 10% discount
  const anyHighSeasonDay = days.some(d => isHighSeason(d));
  if (days.length > 10 && !anyHighSeasonDay) {
    subtotal *= 0.9;
  }

  return { success: true, price: formatCurrency(subtotal) };
}

module.exports = { price, isHighSeason, isWeekend, daysBetweenInclusive, normalizeCarType, yearsBetween, formatCurrency };
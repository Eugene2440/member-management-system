/**
 * Sanity checks for the AECAS renewal cycle rules.
 *
 * Renewal eligibility is anchored on the member's registration (join) date:
 * joining before August 10 places the member in the cycle that ends that
 * year, so they qualify for the annual renewal once that cycle ends. The
 * date a payment happens to be confirmed does not affect eligibility.
 *
 * Run: node backend/scripts/test-renewal-cycle.js
 * Exits non-zero if any check fails.
 */
const assert = require('assert');
const {
  RENEWAL_FEE_KES,
  getRenewalCycleStart,
  getRenewalCycleEnd,
  getActivationReferenceDate,
  isRenewalEligible,
  getEffectiveMembershipStatus
} = require('../services/renewalCycle');

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date();
const daysAgo = (n) => new Date(now.getTime() - n * DAY_MS);
const iso = (d) => d.toISOString();

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('PASS  ' + name);
  } catch (error) {
    console.error('FAIL  ' + name + '  ::  ' + error.message);
    process.exitCode = 1;
  }
}

// --- Cycle boundary math (fixed dates, deterministic) ---
check('joining exactly on Aug 10 00:00 belongs to the new cycle', () => {
  const start = getRenewalCycleStart(new Date(2026, 7, 10, 0, 0, 0, 0));
  assert.strictEqual(start.getTime(), new Date(2026, 7, 10).getTime());
  const end = getRenewalCycleEnd(new Date(2026, 7, 10, 0, 0, 0, 0));
  assert.strictEqual(end.getTime(), new Date(2027, 7, 10).getTime());
});

check('mid-cycle join date is anchored on the previous Aug 10', () => {
  assert.strictEqual(getRenewalCycleStart(new Date(2026, 6, 4)).getTime(), new Date(2025, 7, 10).getTime());
  assert.strictEqual(getRenewalCycleEnd(new Date(2026, 6, 4)).getTime(), new Date(2026, 7, 10).getTime());
});

check('invalid dates yield null', () => {
  assert.strictEqual(getRenewalCycleStart('not-a-date'), null);
  assert.strictEqual(getRenewalCycleEnd(null), null);
});

// --- Term anchor priority ---
check('lastRenewalDate wins over registrationDate', () => {
  const ref = getActivationReferenceDate({
    lastRenewalDate: iso(daysAgo(400)),
    registrationDate: iso(daysAgo(500))
  });
  assert.ok(Math.abs(ref.getTime() - daysAgo(400).getTime()) < DAY_MS);
});

check('paymentConfirmedAt is ignored - registrationDate anchors the term', () => {
  const ref = getActivationReferenceDate({
    paymentConfirmedAt: iso(daysAgo(1)),
    registrationDate: iso(daysAgo(300))
  });
  assert.ok(Math.abs(ref.getTime() - daysAgo(300).getTime()) < DAY_MS);
});

// --- The qualification rule: join date decides the cycle ---
check('joined before Aug 10 and confirmed today => eligible (join date anchors)', () => {
  const member = {
    paymentStatus: 'confirmed',
    registrationDate: iso(daysAgo(400)),
    paymentConfirmedAt: iso(new Date())
  };
  assert.strictEqual(isRenewalEligible(member), true);
});

check('joined today and confirmed today => NOT eligible', () => {
  const member = {
    paymentStatus: 'confirmed',
    registrationDate: iso(new Date()),
    paymentConfirmedAt: iso(new Date())
  };
  assert.strictEqual(isRenewalEligible(member), false);
});

check('joined in a previous cycle => eligible', () => {
  const member = { paymentStatus: 'confirmed', registrationDate: iso(daysAgo(400)) };
  assert.strictEqual(isRenewalEligible(member), true);
});

check('renewed inside the current cycle => NOT eligible again', () => {
  const cycleStart = getRenewalCycleStart(now);
  const withinCurrentCycle = new Date(Math.max(cycleStart.getTime(), now.getTime() - DAY_MS));
  const member = {
    paymentStatus: 'confirmed',
    lastRenewalDate: iso(withinCurrentCycle),
    registrationDate: iso(daysAgo(400))
  };
  assert.strictEqual(isRenewalEligible(member), false);
});

// --- Guards ---
check('unpaid member is never eligible', () => {
  assert.strictEqual(isRenewalEligible({ paymentStatus: 'pending', registrationDate: iso(daysAgo(400)) }), false);
  assert.strictEqual(isRenewalEligible({ paymentStatus: 'rejected', registrationDate: iso(daysAgo(400)) }), false);
});

check('renewal_pending / renewal_confirmed members are not eligible', () => {
  assert.strictEqual(isRenewalEligible({ paymentStatus: 'confirmed', membershipStatus: 'renewal_pending', registrationDate: iso(daysAgo(400)) }), false);
  assert.strictEqual(isRenewalEligible({ paymentStatus: 'confirmed', membershipStatus: 'renewal_confirmed', registrationDate: iso(daysAgo(400)) }), false);
});

check('member with no anchor dates is NOT eligible', () => {
  assert.strictEqual(isRenewalEligible({ paymentStatus: 'confirmed' }), false);
  assert.strictEqual(isRenewalEligible(null), false);
});

check('future registration date is NOT eligible', () => {
  const member = { paymentStatus: 'confirmed', registrationDate: iso(new Date(now.getTime() + 5 * DAY_MS)) };
  assert.strictEqual(isRenewalEligible(member), false);
});

// --- Effective status ---
check('eligible member surfaces as inactive (renewal due)', () => {
  assert.strictEqual(getEffectiveMembershipStatus({ paymentStatus: 'confirmed', registrationDate: iso(daysAgo(400)) }), 'inactive');
});

check('explicit statuses pass through untouched', () => {
  assert.strictEqual(getEffectiveMembershipStatus({ membershipStatus: 'renewal_pending' }), 'renewal_pending');
  assert.strictEqual(getEffectiveMembershipStatus({ membershipStatus: 'renewal_confirmed' }), 'renewal_confirmed');
  assert.strictEqual(getEffectiveMembershipStatus({ membershipStatus: 'expired' }), 'expired');
});

check('member whose join cycle is still running shows as active', () => {
  const cycleStart = getRenewalCycleStart(now);
  const withinCurrentCycle = new Date(Math.max(cycleStart.getTime(), now.getTime() - DAY_MS));
  const member = { paymentStatus: 'confirmed', registrationDate: iso(withinCurrentCycle) };
  assert.strictEqual(getEffectiveMembershipStatus(member), 'active');
});

check('renewal fee is 100 KES', () => {
  assert.strictEqual(RENEWAL_FEE_KES, 100);
});

console.log(process.exitCode ? '\nSOME CHECKS FAILED' : '\nAll ' + passed + ' checks passed.');
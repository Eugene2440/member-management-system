/**
 * Membership renewal cycle rules for AECAS.
 *
 * The membership year runs from August 10 to August 10. A member's paid term
 * is the cycle that was current when they JOINED (their registration date),
 * or when their most recent renewal was confirmed. Members who joined before
 * August 10 belong to the cycle that is ending, so they qualify for the
 * annual renewal once that cycle ends. Members who joined on or after
 * August 10 belong to the new cycle and are covered until it ends a year
 * later. When a payment gets confirmed does not change which cycle a member
 * belongs to.
 *
 * This module is intentionally pure (no I/O, no Firebase) so the rules can
 * be unit tested in isolation (see backend/scripts/test-renewal-cycle.js).
 */

// Annual renewal fee (KES).
const RENEWAL_FEE_KES = 100;

// The membership year boundary: August 10, 00:00 local server time.
const CYCLE_START_MONTH = 7; // August (0-indexed)
const CYCLE_START_DAY = 10;

function parseDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The membership cycle containing `date` starts on the most recent
 * August 10 (00:00) that is on or before `date`. A member who joined exactly
 * on August 10 belongs to the new cycle starting that day.
 */
function getRenewalCycleStart(date) {
  const value = parseDate(date);
  if (!value) return null;

  const start = new Date(value.getFullYear(), CYCLE_START_MONTH, CYCLE_START_DAY, 0, 0, 0, 0);
  if (start.getTime() > value.getTime()) {
    start.setFullYear(start.getFullYear() - 1);
  }
  return start;
}

/**
 * The moment the membership cycle containing `date` ends: the following
 * August 10. Renewal becomes possible from this point on.
 */
function getRenewalCycleEnd(date) {
  const start = getRenewalCycleStart(date);
  if (!start) return null;

  const end = new Date(start.getTime());
  end.setFullYear(end.getFullYear() + 1);
  return end;
}

/**
 * The date the member's current paid term is anchored on: the last confirmed
 * renewal if present, otherwise the date they joined (registered). The date
 * a payment happens to be confirmed does not affect which cycle a member
 * belongs to.
 */
function getActivationReferenceDate(memberData) {
  if (!memberData) return null;

  const epoch = new Date(0).getTime();
  const candidates = [
    memberData.lastRenewalDate,
    memberData.registrationDate
  ];

  for (const candidate of candidates) {
    const date = parseDate(candidate);
    if (date && date.getTime() > epoch) {
      return date;
    }
  }

  return null;
}

/**
 * A member is inside the renewal window once the membership cycle their
 * reference date belongs to has fully ended. Members without any anchor
 * date never qualify (safe default for malformed records).
 */
function isWithinAnnualRenewalWindow(memberData) {
  const referenceDate = getActivationReferenceDate(memberData);
  if (!referenceDate) return false;

  const now = new Date();
  if (referenceDate.getTime() > now.getTime()) return false; // bad/future data

  const cycleEnd = getRenewalCycleEnd(referenceDate);
  if (!cycleEnd) return false;

  return now.getTime() >= cycleEnd.getTime();
}

function isRenewalEligible(memberData) {
  if (!memberData) return false;
  if (memberData.paymentStatus !== 'confirmed') return false;
  if (memberData.membershipStatus === 'renewal_pending') return false;
  if (memberData.membershipStatus === 'renewal_confirmed') return false;
  return isWithinAnnualRenewalWindow(memberData);
}

/**
 * Status shown in the admin dashboard. Members whose current cycle has ended
 * (renewal window open) surface as 'inactive' so registrars can see who is
 * due for renewal.
 */
function getEffectiveMembershipStatus(memberData) {
  if (!memberData) return 'inactive';

  if (memberData.membershipStatus === 'renewal_pending') return 'renewal_pending';
  if (memberData.membershipStatus === 'renewal_confirmed') return 'renewal_confirmed';
  if (memberData.membershipStatus === 'expired') return 'expired';

  if (isRenewalEligible(memberData)) {
    return 'inactive';
  }

  return memberData.membershipStatus || 'active';
}

module.exports = {
  RENEWAL_FEE_KES,
  getRenewalCycleStart,
  getRenewalCycleEnd,
  getActivationReferenceDate,
  isWithinAnnualRenewalWindow,
  isRenewalEligible,
  getEffectiveMembershipStatus
};
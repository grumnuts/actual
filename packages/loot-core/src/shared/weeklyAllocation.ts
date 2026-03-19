import type { CategoryEntity } from '../types/models';
import type { BillingPeriod } from '../types/models/category';

export type BudgetAllocationPeriod = 'weekly' | 'fortnightly' | 'monthly';

const WEEKS_PER_YEAR = 52;
const FORTNIGHTS_PER_YEAR = 26;
const MONTHS_PER_YEAR = 12;

function billingAmountToAnnual(amount: number, period: BillingPeriod): number {
  switch (period) {
    case 'weekly':
      return amount * WEEKS_PER_YEAR;
    case 'fortnightly':
      return amount * FORTNIGHTS_PER_YEAR;
    case 'monthly':
      return amount * MONTHS_PER_YEAR;
    case 'quarterly':
      return amount * 4;
    case 'annually':
      return amount;
    default:
      return 0;
  }
}

function annualToAllocationPeriod(
  annualAmount: number,
  period: BudgetAllocationPeriod,
): number {
  switch (period) {
    case 'weekly':
      return Math.round(annualAmount / WEEKS_PER_YEAR);
    case 'fortnightly':
      return Math.round(annualAmount / FORTNIGHTS_PER_YEAR);
    case 'monthly':
      return Math.round(annualAmount / MONTHS_PER_YEAR);
    default:
      return 0;
  }
}

export function calculateAllocationForPeriod(
  amount: number,
  billingPeriod: BillingPeriod,
  allocationPeriod: BudgetAllocationPeriod,
): number {
  return annualToAllocationPeriod(
    billingAmountToAnnual(amount, billingPeriod),
    allocationPeriod,
  );
}

export function calculateMonthlyAmountForPeriod(
  monthlyAmount: number,
  allocationPeriod: BudgetAllocationPeriod,
): number {
  return calculateAllocationForPeriod(
    monthlyAmount,
    'monthly',
    allocationPeriod,
  );
}

export function getAllocationPeriodSuffix(
  allocationPeriod: BudgetAllocationPeriod,
): '/week' | '/fortnight' | '/month' {
  switch (allocationPeriod) {
    case 'fortnightly':
      return '/fortnight';
    case 'monthly':
      return '/month';
    case 'weekly':
    default:
      return '/week';
  }
}

/**
 * Given a budget amount (in cents, integer) and a billing period, return the
 * equivalent weekly allocation in cents (rounded to nearest cent).
 */
export function calculateWeeklyAllocation(
  amount: number,
  period: BillingPeriod,
): number {
  return calculateAllocationForPeriod(amount, period, 'weekly');
}

/**
 * Return the auto-calculated weekly allocation for a category.
 */
export function getWeeklyAllocation(category: CategoryEntity): number {
  return calculateWeeklyAllocation(
    category.weekly_allocation_amount ?? 0,
    category.billing_period ?? 'monthly',
  );
}

export function getAllocationForPeriod(
  category: CategoryEntity,
  allocationPeriod: BudgetAllocationPeriod,
): number {
  return calculateAllocationForPeriod(
    category.weekly_allocation_amount ?? 0,
    category.billing_period ?? 'monthly',
    allocationPeriod,
  );
}

/**
 * Calculate the annual equivalent of a weekly allocation.
 */
export function weeklyToAnnual(weeklyAmount: number): number {
  return weeklyAmount * WEEKS_PER_YEAR;
}

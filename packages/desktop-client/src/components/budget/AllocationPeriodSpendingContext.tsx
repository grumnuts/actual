import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import type { BudgetAllocationPeriod } from 'loot-core/shared/weeklyAllocation';
import type { CategoryGroupEntity } from 'loot-core/types/models';
import type { BillingPeriod } from 'loot-core/types/models/category';

import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { liveQuery } from '@desktop-client/queries/liveQuery';

type AllocationPeriodSpendingContextValue = {
  spentByCategory: Map<string, number>;
  periodIncome: number;
  allocationPeriod: BudgetAllocationPeriod;
  periodStart: string;
  periodEnd: string;
};

const AllocationPeriodSpendingContext =
  createContext<AllocationPeriodSpendingContextValue>({
    spentByCategory: new Map(),
    periodIncome: 0,
    allocationPeriod: 'weekly',
    periodStart: '',
    periodEnd: '',
  });

type AllocationPeriodSpendingProviderProps = {
  categoryGroups: CategoryGroupEntity[];
  startMonth: string;
  children: ReactNode;
};

function getReferenceDate(startMonth: string) {
  return startMonth.length <= 7
    ? monthUtils.firstDayOfMonth(startMonth)
    : startMonth;
}

function getPeriodBounds(
  startMonth: string,
  allocationPeriod: BudgetAllocationPeriod,
) {
  if (allocationPeriod === 'monthly') {
    const month = startMonth.slice(0, 7);
    return {
      periodStart: monthUtils.firstDayOfMonth(month),
      periodEnd: monthUtils.lastDayOfMonth(month),
    };
  }

  const refDate = getReferenceDate(startMonth);

  if (allocationPeriod === 'weekly') {
    return {
      periodStart: monthUtils.getISOWeekStart(refDate),
      periodEnd: monthUtils.getISOWeekEnd(refDate),
    };
  }

  const isoWeekNumber = monthUtils.getISOWeekNumber(refDate);
  const isoWeekYear = monthUtils.getISOWeekYear(refDate);
  const fortnight = Math.ceil(isoWeekNumber / 2);
  const weekOneStart = monthUtils.getISOWeekStart(`${isoWeekYear}-01-04`);
  const periodStart = monthUtils.addDays(weekOneStart, (fortnight - 1) * 14);

  return {
    periodStart,
    periodEnd: monthUtils.addDays(periodStart, 13),
  };
}

function getDateBoundsForBillingPeriod(
  billingPeriod: BillingPeriod,
  startMonth: string,
): { start: string; end: string } {
  const refDate = getReferenceDate(startMonth);

  switch (billingPeriod) {
    case 'weekly':
      return {
        start: monthUtils.getISOWeekStart(refDate),
        end: monthUtils.getISOWeekEnd(refDate),
      };

    case 'fortnightly': {
      const isoWeekNumber = monthUtils.getISOWeekNumber(refDate);
      const isoWeekYear = monthUtils.getISOWeekYear(refDate);
      const fortnight = Math.ceil(isoWeekNumber / 2);
      const weekOneStart = monthUtils.getISOWeekStart(`${isoWeekYear}-01-04`);
      const periodStart = monthUtils.addDays(
        weekOneStart,
        (fortnight - 1) * 14,
      );
      return {
        start: periodStart,
        end: monthUtils.addDays(periodStart, 13),
      };
    }

    case 'monthly': {
      const month = startMonth.slice(0, 7);
      return {
        start: monthUtils.firstDayOfMonth(month),
        end: monthUtils.lastDayOfMonth(month),
      };
    }

    case 'quarterly': {
      const monthIndex = parseInt(refDate.slice(5, 7), 10) - 1;
      const quarterIndex = Math.floor(monthIndex / 3);
      const year = refDate.slice(0, 4);
      const quarterStartMonth = quarterIndex * 3 + 1;
      const quarterEndMonth = quarterStartMonth + 2;
      const startMonthStr = `${year}-${String(quarterStartMonth).padStart(2, '0')}`;
      const endMonthStr = `${year}-${String(quarterEndMonth).padStart(2, '0')}`;
      return {
        start: monthUtils.firstDayOfMonth(startMonthStr),
        end: monthUtils.lastDayOfMonth(endMonthStr),
      };
    }

    case 'annually': {
      const year = refDate.slice(0, 4);
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      };
    }
  }
}

export function AllocationPeriodSpendingProvider({
  categoryGroups,
  startMonth,
  children,
}: AllocationPeriodSpendingProviderProps) {
  const [budgetAllocationPeriod] = useGlobalPref('budgetAllocationPeriod');
  const allocationPeriod =
    (budgetAllocationPeriod as BudgetAllocationPeriod | undefined) ?? 'weekly';
  const [spentByCategory, setSpentByCategory] = useState<Map<string, number>>(
    () => new Map(),
  );

  // Group categories by billing_period so we can run a query per period
  const categoryByBillingPeriod = useMemo(() => {
    const groups = new Map<BillingPeriod, string[]>();
    for (const group of categoryGroups) {
      for (const category of group.categories ?? []) {
        const period: BillingPeriod = category.billing_period ?? 'monthly';
        if (!groups.has(period)) groups.set(period, []);
        groups.get(period)!.push(category.id);
      }
    }
    return groups;
  }, [categoryGroups]);

  const categoryByBillingPeriodKey = useMemo(() => {
    return [...categoryByBillingPeriod.entries()]
      .map(([period, ids]) => `${period}:${ids.join(',')}`)
      .join('|');
  }, [categoryByBillingPeriod]);

  const incomeCategoryIds = useMemo(
    () =>
      categoryGroups
        .filter(group => group.is_income)
        .flatMap(group =>
          (group.categories ?? []).map(category => category.id),
        ),
    [categoryGroups],
  );
  const incomeCategoryIdsKey = incomeCategoryIds.join('|');
  const [periodIncome, setPeriodIncome] = useState(0);
  const { periodStart, periodEnd } = useMemo(
    () => getPeriodBounds(startMonth, allocationPeriod),
    [allocationPeriod, startMonth],
  );

  useEffect(() => {
    if (categoryByBillingPeriod.size === 0) {
      setSpentByCategory(new Map());
      return;
    }

    // Partial results keyed by billing period; merged into spentByCategory on each update
    const partials = new Map<BillingPeriod, Map<string, number>>();

    function mergeAndSet() {
      const merged = new Map<string, number>();
      for (const partial of partials.values()) {
        for (const [id, amount] of partial) {
          merged.set(id, amount);
        }
      }
      setSpentByCategory(merged);
    }

    const subscriptions: { unsubscribe: () => void }[] = [];

    for (const [billingPeriod, ids] of categoryByBillingPeriod) {
      const { start, end } = getDateBoundsForBillingPeriod(
        billingPeriod,
        startMonth,
      );
      const partialMap = new Map<string, number>();
      partials.set(billingPeriod, partialMap);

      const query = q('transactions')
        .filter({
          $and: [
            { date: { $gte: start } },
            { date: { $lte: end } },
            { category: { $oneof: ids } },
          ],
        })
        .options({ splits: 'inline' })
        .groupBy([{ $id: '$category' }])
        .select([
          { category: { $id: '$category' } },
          { amount: { $sum: '$amount' } },
        ]);

      const sub = liveQuery<{ category: string; amount: number }>(query, {
        onData: data => {
          partialMap.clear();
          data.forEach(item => {
            if (item.category) {
              partialMap.set(
                item.category,
                typeof item.amount === 'number' ? item.amount : 0,
              );
            }
          });
          mergeAndSet();
        },
        onError: () => {
          partialMap.clear();
          mergeAndSet();
        },
      });

      subscriptions.push(sub);
    }

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [categoryByBillingPeriodKey, startMonth]);

  useEffect(() => {
    if (incomeCategoryIds.length === 0 || allocationPeriod === 'monthly') {
      setPeriodIncome(0);
      return;
    }

    const query = q('transactions')
      .filter({
        $and: [
          { date: { $gte: periodStart } },
          { date: { $lte: periodEnd } },
          { category: { $oneof: incomeCategoryIds } },
        ],
      })
      .options({ splits: 'inline' })
      .select([{ amount: { $sum: '$amount' } }]);

    const subscription = liveQuery<{ amount: number }>(query, {
      onData: data => {
        setPeriodIncome(data[0]?.amount ?? 0);
      },
      onError: () => {
        setPeriodIncome(0);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [
    incomeCategoryIds,
    incomeCategoryIdsKey,
    periodEnd,
    periodStart,
    allocationPeriod,
  ]);

  return (
    <AllocationPeriodSpendingContext.Provider
      value={{
        spentByCategory,
        periodIncome,
        allocationPeriod,
        periodStart,
        periodEnd,
      }}
    >
      {children}
    </AllocationPeriodSpendingContext.Provider>
  );
}

export function useAllocationPeriodSpending() {
  return useContext(AllocationPeriodSpendingContext);
}

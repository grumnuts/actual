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
  const categoryIds = useMemo(
    () =>
      categoryGroups.flatMap(group =>
        (group.categories ?? []).map(category => category.id),
      ),
    [categoryGroups],
  );
  const categoryIdsKey = categoryIds.join('|');
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
    if (categoryIds.length === 0) {
      setSpentByCategory(new Map());
      return;
    }

    const query = q('transactions')
      .filter({
        $and: [
          { date: { $gte: periodStart } },
          { date: { $lte: periodEnd } },
          { category: { $oneof: categoryIds } },
        ],
      })
      .options({ splits: 'inline' })
      .groupBy([{ $id: '$category' }])
      .select([
        { category: { $id: '$category' } },
        { amount: { $sum: '$amount' } },
      ]);

    const subscription = liveQuery<{ category: string; amount: number }>(
      query,
      {
        onData: data => {
          const nextMap = new Map<string, number>();
          data.forEach(item => {
            if (item.category) {
              nextMap.set(
                item.category,
                typeof item.amount === 'number' ? item.amount : 0,
              );
            }
          });
          setSpentByCategory(nextMap);
        },
        onError: () => {
          setSpentByCategory(new Map());
        },
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [categoryIds, categoryIdsKey, periodEnd, periodStart]);

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

import { useLayoutEffect, useMemo, useState } from 'react';

import {
  calculateAllocationForPeriod,
  type BudgetAllocationPeriod,
} from 'loot-core/shared/weeklyAllocation';
import type { CategoryEntity } from 'loot-core/types/models';

import { useSheetName } from '@desktop-client/hooks/useSheetName';
import { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import type { Binding } from '@desktop-client/spreadsheet';

type BudgetSheetName = 'envelope-budget' | 'tracking-budget';
type BudgetFieldName = 'budget' | 'sum-amount' | 'leftover';

type UseConvertedCategoryTotalParams<SheetName extends BudgetSheetName> = {
  categories: CategoryEntity[];
  allocationPeriod: BudgetAllocationPeriod;
  bindingFactory: (id: string) => Binding<SheetName, BudgetFieldName>;
  sheetBinding: Binding<SheetName, BudgetFieldName>;
};

export function useConvertedCategoryTotal<SheetName extends BudgetSheetName>({
  categories,
  allocationPeriod,
  bindingFactory,
  sheetBinding,
}: UseConvertedCategoryTotalParams<SheetName>) {
  const spreadsheet = useSpreadsheet();
  const { sheetName } = useSheetName(sheetBinding);
  const [total, setTotal] = useState(0);
  const categoryKey = useMemo(
    () =>
      categories
        .map(category => `${category.id}:${category.billing_period ?? 'monthly'}`)
        .join('|'),
    [categories],
  );
  const categoryMetadata = useMemo(
    () =>
      categories.map(category => ({
        id: category.id,
        billingPeriod: category.billing_period ?? 'monthly',
      })),
    [categoryKey],
  );

  useLayoutEffect(() => {
    if (categoryMetadata.length === 0) {
      setTotal(0);
      return;
    }

    let isMounted = true;
    const values = new Map<string, number>();

    function recomputeTotal() {
      if (!isMounted) {
        return;
      }

      const nextTotal = categoryMetadata.reduce((sum, category) => {
        const value = values.get(category.id) ?? 0;
        return (
          sum +
          calculateAllocationForPeriod(
            value,
            category.billingPeriod,
            allocationPeriod,
          )
        );
      }, 0);

      setTotal(nextTotal);
    }

    const unbinds = categoryMetadata.map(category =>
      spreadsheet.bind(sheetName, bindingFactory(category.id), result => {
        values.set(category.id, typeof result.value === 'number' ? result.value : 0);
        recomputeTotal();
      }),
    );

    recomputeTotal();

    return () => {
      isMounted = false;
      unbinds.forEach(unbind => unbind());
    };
  }, [allocationPeriod, bindingFactory, categoryKey, categoryMetadata, sheetName, spreadsheet]);

  return total;
}
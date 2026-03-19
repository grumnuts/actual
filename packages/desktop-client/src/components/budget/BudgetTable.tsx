import React, { useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Trans } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { listen, send } from 'loot-core/platform/client/connection';
import { sheetForMonth } from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import { calculateAllocationForPeriod } from 'loot-core/shared/weeklyAllocation';
import type { BudgetAllocationPeriod } from 'loot-core/shared/weeklyAllocation';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from 'loot-core/types/models';

import { AllocationPeriodSpendingProvider } from './AllocationPeriodSpendingContext';
import { BudgetCategories } from './BudgetCategories';
import { BudgetSummaries } from './BudgetSummaries';
import { BudgetTotals } from './BudgetTotals';
import { MonthsProvider } from './MonthsContext';
import type { MonthBounds } from './MonthsContext';
import {
  findSortDown,
  findSortUp,
  getCategorySidebarWidth,
  getScrollbarWidth,
  separateGroups,
} from './util';

import type { DropPosition } from '@desktop-client/components/sort';
import { SchedulesProvider } from '@desktop-client/hooks/useCachedSchedules';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';

type BudgetTableProps = {
  type: string;
  prewarmStartMonth: string;
  startMonth: string;
  numMonths: number;
  monthBounds: MonthBounds;
  onSaveCategory: (category: CategoryEntity) => void;
  onDeleteCategory: (id: CategoryEntity['id']) => void;
  onSaveGroup: (group: CategoryGroupEntity) => void;
  onDeleteGroup: (id: CategoryGroupEntity['id']) => void;
  onApplyBudgetTemplatesInGroup: (
    categoryIds: Array<CategoryEntity['id']>,
  ) => void;
  onReorderCategory: (params: {
    id: CategoryEntity['id'];
    groupId: CategoryGroupEntity['id'];
    targetId: CategoryEntity['id'] | null;
  }) => void;
  onReorderGroup: (params: {
    id: CategoryGroupEntity['id'];
    targetId: CategoryEntity['id'] | null;
  }) => void;
  onShowActivity: (id: CategoryEntity['id'], month?: string) => void;
  onBudgetAction: (month: string, type: string, args: unknown) => void;
};

export function BudgetTable(props: BudgetTableProps) {
  const {
    type,
    prewarmStartMonth,
    startMonth,
    numMonths,
    monthBounds,
    onSaveCategory,
    onDeleteCategory,
    onSaveGroup,
    onDeleteGroup,
    onApplyBudgetTemplatesInGroup,
    onReorderCategory,
    onReorderGroup,
    onShowActivity,
    onBudgetAction,
  } = props;

  const { data: { grouped: categoryGroups } = { grouped: [] } } =
    useCategories();
  const [collapsedGroupIds = [], setCollapsedGroupIdsPref] =
    useLocalPref('budget.collapsed');
  const [showHiddenCategories, setShowHiddenCategoriesPef] = useLocalPref(
    'budget.showHiddenCategories',
  );
  const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
  const categoryExpandedState = categoryExpandedStatePref ?? 0;
  const [editing, setEditing] = useState<{ id: string; cell: string } | null>(
    null,
  );

  const onEditMonth = (id: string, month: string) => {
    setEditing(id ? { id, cell: month } : null);
  };

  const onEditName = (id: string) => {
    setEditing(id ? { id, cell: 'name' } : null);
  };

  const _onReorderCategory = (
    id: string,
    dropPos: DropPosition | null,
    targetId: string,
  ) => {
    const isGroup = !!categoryGroups.find(g => g.id === targetId);

    if (isGroup) {
      const { targetId: groupId } = findSortUp(
        categoryGroups,
        dropPos,
        targetId,
      );
      const group = categoryGroups.find(g => g.id === groupId);

      if (group) {
        const { categories = [] } = group;
        onReorderCategory({
          id,
          groupId: group.id,
          targetId:
            categories.length === 0 || dropPos === 'top'
              ? null
              : categories[0].id,
        });
      }
    } else {
      const group = categoryGroups.find(({ categories = [] }) =>
        categories.some(cat => cat.id === targetId),
      );

      if (group) {
        onReorderCategory({
          id,
          groupId: group.id,
          ...findSortDown(group.categories || [], dropPos, targetId),
        });
      }
    }
  };

  const _onReorderGroup = (
    id: string,
    dropPos: DropPosition | null,
    targetId: string,
  ) => {
    const [expenseGroups] = separateGroups(categoryGroups); // exclude Income group from sortable groups to fix off-by-one error
    onReorderGroup({
      id,
      ...findSortDown(expenseGroups, dropPos, targetId),
    });
  };

  const moveVertically = (dir: 1 | -1) => {
    const flattened = categoryGroups.reduce(
      (all, group) => {
        if (collapsedGroupIds.includes(group.id)) {
          return all.concat({ id: group.id, isGroup: true });
        }
        return all.concat([
          { id: group.id, isGroup: true },
          ...(group?.categories || []),
        ]);
      },
      [] as Array<
        { id: CategoryGroupEntity['id']; isGroup: boolean } | CategoryEntity
      >,
    );

    if (editing) {
      const idx = flattened.findIndex(item => item.id === editing.id);
      let nextIdx = idx + dir;

      while (nextIdx >= 0 && nextIdx < flattened.length) {
        const next = flattened[nextIdx];

        if ('isGroup' in next && next.isGroup) {
          nextIdx += dir;
          continue;
        } else if (
          type === 'tracking' ||
          ('is_income' in next && !next.is_income)
        ) {
          onEditMonth(next.id, editing.cell);
          return;
        } else {
          break;
        }
      }
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!editing) {
      return null;
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      moveVertically(e.shiftKey ? -1 : 1);
    }
  };

  const onCollapse = (collapsedIds: string[]) => {
    setCollapsedGroupIdsPref(collapsedIds);
  };

  const onToggleHiddenCategories = () => {
    setShowHiddenCategoriesPef(!showHiddenCategories);
  };

  const toggleHiddenCategories = () => {
    onToggleHiddenCategories();
  };

  const expandAllCategories = () => {
    onCollapse([]);
  };

  const collapseAllCategories = () => {
    onCollapse(categoryGroups.map(g => g.id));
  };

  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);

  return (
    <AllocationPeriodSpendingProvider
      categoryGroups={categoryGroups}
      startMonth={startMonth}
    >
      <View
        data-testid="budget-table"
        style={{
          flex: 1,
          ...(styles.lightScrollbar && {
            '& ::-webkit-scrollbar': {
              backgroundColor: 'transparent',
            },
            '& ::-webkit-scrollbar-thumb:vertical': {
              backgroundColor: theme.pageTextSubdued,
              // changed from tableHeaderBackground. pageTextSubdued is always visible on pageBackground
            },
          }),
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            overflow: 'hidden',
            flexShrink: 0,
            // This is necessary to align with the table because the
            // table has this padding to allow the shadow to show
            paddingLeft: 5,
            paddingRight: 5 + getScrollbarWidth(),
          }}
        >
          <View
            style={{ width: getCategorySidebarWidth(categoryExpandedState) }}
          />
          <MonthsProvider
            startMonth={prewarmStartMonth}
            numMonths={numMonths}
            monthBounds={monthBounds}
            type={type}
          >
            <BudgetSummaries />
          </MonthsProvider>
        </View>

        <MonthsProvider
          startMonth={startMonth}
          numMonths={numMonths}
          monthBounds={monthBounds}
          type={type}
        >
          <BudgetTotals
            toggleHiddenCategories={toggleHiddenCategories}
            expandAllCategories={expandAllCategories}
            collapseAllCategories={collapseAllCategories}
          />
          <View
            style={{
              overflowY: 'scroll',
              overflowAnchor: 'none',
              flex: 1,
              paddingLeft: 5,
              paddingRight: 5,
            }}
          >
            <View
              style={{
                flexShrink: 0,
              }}
              onKeyDown={onKeyDown}
            >
              <SchedulesProvider query={schedulesQuery}>
                <BudgetCategories
                  categoryGroups={categoryGroups}
                  editingCell={editing}
                  onEditMonth={onEditMonth}
                  onEditName={onEditName}
                  onSaveCategory={onSaveCategory}
                  onSaveGroup={onSaveGroup}
                  onDeleteCategory={onDeleteCategory}
                  onDeleteGroup={onDeleteGroup}
                  onReorderCategory={_onReorderCategory}
                  onReorderGroup={_onReorderGroup}
                  onBudgetAction={onBudgetAction}
                  onShowActivity={onShowActivity}
                  onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
                />
              </SchedulesProvider>
            </View>
            {/* Weekly allocation running total */}
            <WeeklyAllocationSummary
              categoryGroups={categoryGroups}
              month={startMonth}
              type={type}
            />
          </View>
        </MonthsProvider>
      </View>
    </AllocationPeriodSpendingProvider>
  );
}

function WeeklyAllocationSummary({
  categoryGroups,
  month,
  type,
}: {
  categoryGroups: CategoryGroupEntity[];
  month: string;
  type: string;
}) {
  const [budgetAllocationPeriod] = useGlobalPref('budgetAllocationPeriod');
  const allocationPeriod =
    (budgetAllocationPeriod as BudgetAllocationPeriod | undefined) ?? 'weekly';
  const format = useFormat();

  const budgetMonthMethod =
    type === 'tracking' ? 'tracking-budget-month' : 'envelope-budget-month';
  // month may be a full date (yyyy-MM-dd) when period navigation is active;
  // normalize to yyyy-MM for all backend and spreadsheet operations.
  const normalizedMonth = month.slice(0, 7);
  const budgetSheetPrefix = `${sheetForMonth(normalizedMonth)}!budget-`;

  const [monthValues, setMonthValues] = useState<
    Array<{ name: string; value: unknown }>
  >([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchMonthData() {
      const data = await send(budgetMonthMethod, { month: normalizedMonth });
      if (!cancelled) {
        setMonthValues((data as Array<{ name: string; value: unknown }>) ?? []);
      }
    }

    void fetchMonthData();

    const unlisten = listen(
      'cells-changed',
      (nodes: Array<{ name: string }>) => {
        if (nodes.some(n => n.name.startsWith(budgetSheetPrefix))) {
          void fetchMonthData();
        }
      },
    );

    return () => {
      cancelled = true;
      unlisten();
    };
  }, [budgetMonthMethod, budgetSheetPrefix, normalizedMonth]);

  const budgetedByCategory = useMemo(() => {
    const map = new Map<string, number>();

    for (const value of monthValues as Array<{
      name: string;
      value: unknown;
    }>) {
      const match = value.name.match(/budget-(.+)$/);
      if (!match || typeof value.value !== 'number') {
        continue;
      }

      map.set(match[1], Math.abs(value.value));
    }

    return map;
  }, [monthValues]);

  const allocationLabel =
    allocationPeriod === 'fortnightly'
      ? 'fortnightly allocation'
      : allocationPeriod === 'monthly'
        ? 'monthly allocation'
        : 'weekly allocation';

  const total = useMemo(() => {
    return categoryGroups
      .filter(g => !g.is_income)
      .flatMap(g => g.categories ?? [])
      .filter(cat => !cat.hidden)
      .reduce(
        (sum, cat) =>
          sum +
          calculateAllocationForPeriod(
            budgetedByCategory.get(cat.id) ?? 0,
            cat.billing_period ?? 'monthly',
            allocationPeriod,
          ),
        0,
      );
  }, [allocationPeriod, budgetedByCategory, categoryGroups]);

  return (
    <View style={{ flexDirection: 'column', flexShrink: 0 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '8px 16px',
          borderTop: `1px solid ${theme.tableBorder}`,
          backgroundColor: theme.tableBackground,
          flexShrink: 0,
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 13, color: theme.tableTextSubdued }}>
          <Trans>Total {{ allocationLabel }}:</Trans>
        </Text>
        <Text style={{ fontSize: 15, fontWeight: 600, color: theme.tableText }}>
          {format(total, 'financial')}
        </Text>
      </View>
    </View>
  );
}

BudgetTable.displayName = 'BudgetTable';

import React, { useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Trans } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import { calculateMonthlyAmountForPeriod } from 'loot-core/shared/weeklyAllocation';
import type { BudgetAllocationPeriod } from 'loot-core/shared/weeklyAllocation';

import { useAllocationPeriodSpending } from '@desktop-client/components/budget/AllocationPeriodSpendingContext';
import { EnvelopeCellValue } from '@desktop-client/components/budget/envelope/EnvelopeBudgetComponents';
import { useConvertedCategoryTotal } from '@desktop-client/components/budget/useConvertedCategoryTotal';
import { CellValueText } from '@desktop-client/components/spreadsheet/CellValue';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useFormat } from '@desktop-client/hooks/useFormat';
import type { FormatType } from '@desktop-client/hooks/useFormat';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

/**
 * Creates a formatter that displays values with explicit +/- signs.
 * Uses Math.abs to avoid double-negative display (e.g., "--$0.00").
 *
 * @param format - The format function from useFormat hook
 * @param invert - If true, shows '-' for positive and '+' for negative
 */
function makeSignedFormatter(
  format: ReturnType<typeof useFormat>,
  invert = false,
) {
  return (value: number, type?: FormatType) => {
    const v = format(Math.abs(value), type);
    if (value === 0) {
      return '-' + v;
    }
    const isPositive = value > 0;
    return invert
      ? isPositive
        ? '-' + v
        : '+' + v
      : isPositive
        ? '+' + v
        : '-' + v;
  };
}

type TotalsListProps = {
  prevMonthName: string;
  style?: CSSProperties;
};

export function TotalsList({ prevMonthName, style }: TotalsListProps) {
  const [budgetAllocationPeriod] = useGlobalPref('budgetAllocationPeriod');
  const allocationPeriod =
    (budgetAllocationPeriod as BudgetAllocationPeriod | undefined) ?? 'weekly';
  const { periodIncome } = useAllocationPeriodSpending();

  const convert = (value: number) =>
    calculateMonthlyAmountForPeriod(value, allocationPeriod);

  const { data: { grouped: categoryGroups } = { grouped: [] } } =
    useCategories();
  const expenseCategories = useMemo(
    () =>
      categoryGroups.filter(g => !g.is_income).flatMap(g => g.categories ?? []),
    [categoryGroups],
  );
  const budgetBindingFactory = useCallback(
    (id: string) => envelopeBudget.catBudgeted(id),
    [],
  );
  const convertedBudgetTotal = useConvertedCategoryTotal({
    categories: expenseCategories,
    allocationPeriod,
    bindingFactory: budgetBindingFactory,
    sheetBinding: envelopeBudget.catBudgeted(''),
  });

  const format = useFormat();
  const signedFormatter = makeSignedFormatter(format);
  const invertedSignedFormatter = makeSignedFormatter(format, true);
  return (
    <View
      style={{
        flexDirection: 'row',
        lineHeight: 1.5,
        justifyContent: 'center',
        ...styles.smallText,
        ...style,
      }}
    >
      <View
        style={{
          textAlign: 'right',
          marginRight: 10,
          minWidth: 50,
        }}
      >
        <Tooltip
          style={{ ...styles.tooltip, lineHeight: 1.5, padding: '6px 10px' }}
          content={
            <>
              <AlignedText
                left="Income:"
                right={
                  <EnvelopeCellValue
                    binding={envelopeBudget.totalIncome}
                    type="financial"
                  >
                    {props => (
                      <CellValueText {...props} value={convert(props.value)} />
                    )}
                  </EnvelopeCellValue>
                }
              />
              <AlignedText
                left="From Last Month:"
                right={
                  <EnvelopeCellValue
                    binding={envelopeBudget.fromLastMonth}
                    type="financial"
                  >
                    {props => (
                      <CellValueText {...props} value={convert(props.value)} />
                    )}
                  </EnvelopeCellValue>
                }
              />
            </>
          }
          placement="bottom end"
        >
          {allocationPeriod !== 'monthly' ? (
            <Block style={{ fontWeight: 600 }}>
              {format(periodIncome, 'financial')}
            </Block>
          ) : (
            <EnvelopeCellValue
              binding={envelopeBudget.incomeAvailable}
              type="financial"
            >
              {props => (
                <CellValueText
                  {...props}
                  value={convert(props.value)}
                  style={{ fontWeight: 600 }}
                />
              )}
            </EnvelopeCellValue>
          )}
        </Tooltip>

        <EnvelopeCellValue
          binding={envelopeBudget.lastMonthOverspent}
          type="financial"
        >
          {props => (
            <CellValueText
              {...props}
              value={convert(props.value)}
              style={{ fontWeight: 600 }}
              formatter={signedFormatter}
            />
          )}
        </EnvelopeCellValue>

        <Block style={{ fontWeight: 600 }}>
          {signedFormatter(-convertedBudgetTotal, 'financial')}
        </Block>

        <EnvelopeCellValue
          binding={envelopeBudget.forNextMonth}
          type="financial"
        >
          {props => (
            <CellValueText
              {...props}
              value={convert(props.value)}
              style={{ fontWeight: 600 }}
              formatter={invertedSignedFormatter}
            />
          )}
        </EnvelopeCellValue>
      </View>

      <View>
        <Block>
          <Trans>Available funds</Trans>
        </Block>

        {allocationPeriod === 'monthly' ? (
          <>
            <Block>
              <Trans>Overspent in {{ prevMonthName }}</Trans>
            </Block>
            <Block>
              <Trans>Budgeted (month)</Trans>
            </Block>
            <Block>
              <Trans>For next month</Trans>
            </Block>
          </>
        ) : allocationPeriod === 'fortnightly' ? (
          <>
            <Block>
              <Trans>Overspent in previous fortnight</Trans>
            </Block>
            <Block>
              <Trans>Budgeted (fortnight)</Trans>
            </Block>
            <Block>
              <Trans>For next fortnight</Trans>
            </Block>
          </>
        ) : (
          <>
            <Block>
              <Trans>Overspent in previous week</Trans>
            </Block>
            <Block>
              <Trans>Budgeted (week)</Trans>
            </Block>
            <Block>
              <Trans>For next week</Trans>
            </Block>
          </>
        )}
      </View>
    </View>
  );
}

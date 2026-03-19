import React, { useCallback, useMemo } from 'react';
import type { CSSProperties, MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { calculateMonthlyAmountForPeriod } from 'loot-core/shared/weeklyAllocation';
import type { BudgetAllocationPeriod } from 'loot-core/shared/weeklyAllocation';

import { TotalsList } from './TotalsList';

import { useAllocationPeriodSpending } from '@desktop-client/components/budget/AllocationPeriodSpendingContext';
import {
  useEnvelopeSheetName,
  useEnvelopeSheetValue,
} from '@desktop-client/components/budget/envelope/EnvelopeBudgetComponents';
import { useConvertedCategoryTotal } from '@desktop-client/components/budget/useConvertedCategoryTotal';
import { FinancialText } from '@desktop-client/components/FinancialText';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

type ToBudgetAmountProps = {
  prevMonthName: string;
  style?: CSSProperties;
  amountStyle?: CSSProperties;
  onClick: () => void;
  onContextMenu?: MouseEventHandler;
  isTotalsListTooltipDisabled?: boolean;
};

export function ToBudgetAmount({
  prevMonthName,
  style,
  amountStyle,
  onClick,
  isTotalsListTooltipDisabled = false,
  onContextMenu,
}: ToBudgetAmountProps) {
  const { t } = useTranslation();
  const sheetName = useEnvelopeSheetName(envelopeBudget.toBudget);
  const sheetValue = useEnvelopeSheetValue({
    name: envelopeBudget.toBudget,
    value: 0,
  });
  const totalBudgetedSheetValue = useEnvelopeSheetValue({
    name: envelopeBudget.totalBudgeted,
    value: 0,
  });
  const format = useFormat();
  const [budgetAllocationPeriod] = useGlobalPref('budgetAllocationPeriod');
  const allocationPeriod =
    (budgetAllocationPeriod as BudgetAllocationPeriod | undefined) ?? 'weekly';
  const availableValue = sheetValue;
  if (typeof availableValue !== 'number' && availableValue !== null) {
    throw new Error(
      'Expected availableValue to be a number but got ' + availableValue,
    );
  }

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

  const { periodIncome } = useAllocationPeriodSpending();

  // For weekly/fortnightly: compare actual period income to period-aware budgeted total.
  // For monthly: use the spreadsheet's to-budget adjusted for per-category billing periods.
  const rawTotalBudgeted =
    typeof totalBudgetedSheetValue === 'number' ? totalBudgetedSheetValue : 0;
  const num =
    allocationPeriod === 'monthly'
      ? calculateMonthlyAmountForPeriod(availableValue ?? 0, allocationPeriod) -
        calculateMonthlyAmountForPeriod(rawTotalBudgeted, allocationPeriod) -
        convertedBudgetTotal
      : periodIncome - convertedBudgetTotal;
  const isNegative = num < 0;
  const isPositive = num > 0;

  return (
    <View style={{ alignItems: 'center', ...style }}>
      <Block>{isNegative ? t('Overbudgeted:') : t('To Budget:')}</Block>
      <View>
        <Tooltip
          content={
            <TotalsList
              prevMonthName={prevMonthName}
              style={{
                padding: 7,
              }}
            />
          }
          placement="bottom"
          offset={3}
          triggerProps={{ isDisabled: isTotalsListTooltipDisabled }}
        >
          <PrivacyFilter
            style={{
              textAlign: 'center',
            }}
          >
            <Block
              onClick={onClick}
              onContextMenu={onContextMenu}
              data-cellname={sheetName}
              className={css([
                styles.veryLargeText,
                {
                  fontWeight: 400,
                  userSelect: 'none',
                  cursor: 'pointer',
                  color: isPositive
                    ? theme.toBudgetPositive
                    : isNegative
                      ? theme.toBudgetNegative
                      : theme.toBudgetZero,
                  marginBottom: -1,
                  borderBottom: '1px solid transparent',
                  ':hover': {
                    borderColor: isPositive
                      ? theme.toBudgetPositive
                      : isNegative
                        ? theme.toBudgetNegative
                        : theme.toBudgetZero,
                  },
                },
                amountStyle,
              ])}
            >
              <FinancialText>{format(num, 'financial')}</FinancialText>
            </Block>
          </PrivacyFilter>
        </Tooltip>
      </View>
    </View>
  );
}

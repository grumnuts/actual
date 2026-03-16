// @ts-strict-ignore
import React, { memo, useRef, useState } from 'react';
import type { ComponentProps, CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import {
  SvgArrowsSynchronize,
  SvgCalendar3,
} from '@actual-app/components/icons/v2';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import * as monthUtils from 'loot-core/shared/months';
import {
  calculateAllocationForPeriod,
  type BudgetAllocationPeriod,
} from 'loot-core/shared/weeklyAllocation';

import type { CategoryGroupMonthProps, CategoryMonthProps } from '..';

import { BalanceMenu } from './BalanceMenu';
import { BudgetMenu } from './BudgetMenu';

import { BalanceWithCarryover } from '@desktop-client/components/budget/BalanceWithCarryover';
import { makeAmountGrey } from '@desktop-client/components/budget/util';
import {
  CellValue,
  CellValueText,
} from '@desktop-client/components/spreadsheet/CellValue';
import { Field, SheetCell } from '@desktop-client/components/table';
import type { SheetCellProps } from '@desktop-client/components/table';
import { useCategoryScheduleGoalTemplateIndicator } from '@desktop-client/hooks/useCategoryScheduleGoalTemplateIndicator';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import { useUndo } from '@desktop-client/hooks/useUndo';
import type { Binding, SheetFields } from '@desktop-client/spreadsheet';
import { trackingBudget } from '@desktop-client/spreadsheet/bindings';
import { useConvertedCategoryTotal } from '@desktop-client/components/budget/useConvertedCategoryTotal';

export const useTrackingSheetValue = <
  FieldName extends SheetFields<'tracking-budget'>,
>(
  binding: Binding<'tracking-budget', FieldName>,
) => {
  return useSheetValue(binding);
};

const TrackingCellValue = <FieldName extends SheetFields<'tracking-budget'>>(
  props: ComponentProps<typeof CellValue<'tracking-budget', FieldName>>,
) => {
  return <CellValue {...props} />;
};

const TrackingSheetCell = <FieldName extends SheetFields<'tracking-budget'>>(
  props: SheetCellProps<'tracking-budget', FieldName>,
) => {
  return <SheetCell {...props} />;
};

const headerLabelStyle: CSSProperties = {
  flex: 1,
  padding: '0 5px',
  textAlign: 'right',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
};

const cellStyle: CSSProperties = {
  color: theme.tableHeaderText,
  fontWeight: 600,
  textAlign: 'right',
  width: '100%',
};

function getAllocationPeriodLabel(
  allocationPeriod: BudgetAllocationPeriod,
  t: (key: string) => string,
) {
  if (allocationPeriod === 'fortnightly') {
    return t('Fortnight');
  }

  if (allocationPeriod === 'monthly') {
    return t('Month');
  }

  return t('Week');
}

export const BudgetTotalsMonth = memo(function BudgetTotalsMonth() {
  const { t } = useTranslation();
  const { data: { grouped: categoryGroups } = { grouped: [] } } = useCategories();
  const [budgetAllocationPeriod] = useGlobalPref('budgetAllocationPeriod');
  const allocationPeriod =
    (budgetAllocationPeriod as BudgetAllocationPeriod | undefined) ?? 'weekly';
  const expenseCategories = categoryGroups.flatMap(group =>
    group.is_income ? [] : (group.categories ?? []),
  );
  const totalBudgetAllocation = useConvertedCategoryTotal({
    categories: expenseCategories,
    allocationPeriod,
    bindingFactory: trackingBudget.catBudgeted,
    sheetBinding: trackingBudget.catBudgeted('total-budget-allocation'),
  });
  const totalSpent = useTrackingSheetValue(trackingBudget.totalSpent) ?? 0;
  const totalBalanceAllocation = totalBudgetAllocation - Math.abs(totalSpent);

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        marginRight: styles.monthRightPadding,
        paddingTop: 10,
        paddingBottom: 10,
      }}
    >
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.tableHeaderText, textAlign: 'right' }}>
          <Trans>Budgeted</Trans>
        </Text>
        <TrackingCellValue
          binding={trackingBudget.totalBudgetedExpense}
          type="financial"
        >
          {props => <CellValueText {...props} style={cellStyle} />}
        </TrackingCellValue>
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.tableHeaderText, textAlign: 'right' }}>
          {t('Budget ({{period}})', {
            period: getAllocationPeriodLabel(allocationPeriod, t),
          })}
        </Text>
        <TrackingCellValue
          binding={trackingBudget.totalBudgetedExpense}
          type="financial"
        >
          {props => (
            <CellValueText
              {...props}
              name="budget-allocation-total"
              value={totalBudgetAllocation}
              style={cellStyle}
            />
          )}
        </TrackingCellValue>
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.tableHeaderText, textAlign: 'right' }}>
          <Trans>Spent</Trans>
        </Text>
        <TrackingCellValue binding={trackingBudget.totalSpent} type="financial">
          {props => <CellValueText {...props} style={cellStyle} />}
        </TrackingCellValue>
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.tableHeaderText, textAlign: 'right' }}>
          <Trans>Balance</Trans>
        </Text>
        <TrackingCellValue
          binding={trackingBudget.totalLeftover}
          type="financial"
        >
          {props => (
            <CellValueText
              {...props}
              name="balance-allocation-total"
              value={totalBalanceAllocation}
              style={cellStyle}
            />
          )}
        </TrackingCellValue>
      </View>
    </View>
  );
});

export function IncomeHeaderMonth() {
  return (
    <View
      style={{
        flexDirection: 'row',
        marginRight: styles.monthRightPadding,
        paddingBottom: 5,
      }}
    >
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.tableHeaderText }}>
          <Trans>Budgeted</Trans>
        </Text>
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.tableHeaderText }}>
          <Trans>Received</Trans>
        </Text>
      </View>
    </View>
  );
}

export const GroupMonth = memo(function GroupMonth({
  month,
  group,
}: CategoryGroupMonthProps) {
  const [budgetAllocationPeriod] = useGlobalPref('budgetAllocationPeriod');
  const allocationPeriod =
    (budgetAllocationPeriod as BudgetAllocationPeriod | undefined) ?? 'weekly';
  const { id } = group;
  const categories = group.categories ?? [];
  const groupBudgetAllocation = useConvertedCategoryTotal({
    categories,
    allocationPeriod,
    bindingFactory: trackingBudget.catBudgeted,
    sheetBinding: trackingBudget.catBudgeted(id),
  });
  const groupSpent = useTrackingSheetValue(trackingBudget.groupSumAmount(id)) ?? 0;
  const groupBalanceAllocation = groupBudgetAllocation - Math.abs(groupSpent);

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: monthUtils.isCurrentMonth(month)
          ? theme.budgetHeaderCurrentMonth
          : theme.budgetHeaderOtherMonth,
      }}
    >
      <TrackingSheetCell
        name="budgeted"
        width="flex"
        textAlign="right"
        style={{ fontWeight: 600, ...styles.tnum }}
        valueProps={{
          binding: trackingBudget.groupBudgeted(id),
          type: 'financial',
        }}
      />
      <Field name="budget-allocation" width="flex" style={{ textAlign: 'right' }}>
        <CellValueText
          type="financial"
          name={`group-budget-allocation-${id}`}
          value={groupBudgetAllocation}
          style={{ fontWeight: 600, ...styles.tnum }}
        />
      </Field>
      <Field name="spent" width="flex" style={{ textAlign: 'right' }}>
        <TrackingCellValue
          binding={trackingBudget.groupSumAmount(id)}
          type="financial"
        >
          {props => <CellValueText {...props} style={{ fontWeight: 600, ...styles.tnum }} />}
        </TrackingCellValue>
      </Field>
      {!group.is_income && (
        <Field
          name="balance"
          width="flex"
          style={{
            textAlign: 'right',
            paddingRight: styles.monthRightPadding,
          }}
        >
          <CellValueText
            type="financial"
            name={`group-balance-allocation-${id}`}
            value={groupBalanceAllocation}
            style={{ fontWeight: 600, ...styles.tnum }}
          />
        </Field>
      )}
    </View>
  );
});

export const CategoryMonth = memo(function CategoryMonth({
  month,
  category,
  editing,
  onEdit,
  onBudgetAction,
  onShowActivity,
}: CategoryMonthProps) {
  const [budgetAllocationPeriod] = useGlobalPref('budgetAllocationPeriod');
  const allocationPeriod =
    (budgetAllocationPeriod as BudgetAllocationPeriod | undefined) ?? 'weekly';
  const billingPeriod = category.billing_period ?? 'monthly';
  const categoryBudgeted =
    useTrackingSheetValue(trackingBudget.catBudgeted(category.id)) ?? 0;
  const categorySpent =
    useTrackingSheetValue(trackingBudget.catSumAmount(category.id)) ?? 0;
  const categoryBudgetAllocation = calculateAllocationForPeriod(
    categoryBudgeted,
    billingPeriod,
    allocationPeriod,
  );
  const categoryBalanceAllocation = categoryBudgetAllocation - Math.abs(categorySpent);
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);
  const format = useFormat();

  const [balanceMenuOpen, setBalanceMenuOpen] = useState(false);
  const triggerBalanceMenuRef = useRef(null);

  const onMenuAction = (...args: Parameters<typeof onBudgetAction>) => {
    onBudgetAction(...args);
    setBalanceMenuOpen(false);
    setMenuOpen(false);
  };

  const { showUndoNotification } = useUndo();

  const navigate = useNavigate();

  const { schedule, scheduleStatus, isScheduleRecurring, description } =
    useCategoryScheduleGoalTemplateIndicator({
      category,
      month,
    });

  const showScheduleIndicator = schedule && scheduleStatus;

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: monthUtils.isCurrentMonth(month)
          ? theme.budgetCurrentMonth
          : theme.budgetOtherMonth,
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .25s',
        },
        '&:hover .hover-visible, & .force-visible .hover-visible': {
          opacity: 1,
        },
        '& .hover-expand': {
          maxWidth: 0,
          overflow: 'hidden',
          transition: 'max-width 0s .25s',
        },
        '&:hover .hover-expand, & .hover-expand.force-visible': {
          maxWidth: '300px',
          overflow: 'visible',
          transition: 'max-width 0s linear 0s',
        },
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
        }}
      >
        {!editing && (
          <View
            className={`hover-expand ${menuOpen ? 'force-visible' : ''}`}
            style={{
              flexDirection: 'row',
              flexShrink: 0,
              paddingLeft: 3,
              alignItems: 'center',
              justifyContent: 'center',
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: theme.tableBorder,
            }}
          >
            <Button
              ref={triggerRef}
              variant="bare"
              onPress={() => setMenuOpen(true)}
              style={{
                color: theme.budgetNumberNeutral, //make sure button is visible when hovered
                padding: 3,
              }}
            >
              <SvgCheveronDown
                width={14}
                height={14}
                className="hover-visible"
              />
            </Button>

            <Popover
              triggerRef={triggerRef}
              isOpen={menuOpen}
              onOpenChange={() => setMenuOpen(false)}
              placement="bottom start"
            >
              <BudgetMenu
                onCopyLastMonthAverage={() => {
                  onMenuAction(month, 'copy-single-last', {
                    category: category.id,
                  });
                  showUndoNotification({
                    message: `Budget set to last month's budget.`,
                  });
                }}
                onSetMonthsAverage={numberOfMonths => {
                  if (
                    numberOfMonths !== 3 &&
                    numberOfMonths !== 6 &&
                    numberOfMonths !== 12
                  ) {
                    return;
                  }

                  onMenuAction(month, `set-single-${numberOfMonths}-avg`, {
                    category: category.id,
                  });
                  showUndoNotification({
                    message: `Budget set to ${numberOfMonths}-month average.`,
                  });
                }}
                onApplyBudgetTemplate={() => {
                  onMenuAction(month, 'apply-single-category-template', {
                    category: category.id,
                  });
                  showUndoNotification({
                    message: `Budget template applied.`,
                  });
                }}
              />
            </Popover>
          </View>
        )}
        <TrackingSheetCell
          name="budget"
          exposed={editing}
          focused={editing}
          width="flex"
          onExpose={() => onEdit(category.id, month)}
          style={{ ...(editing && { zIndex: 100 }), ...styles.tnum }}
          textAlign="right"
          valueStyle={{
            cursor: 'default',
            margin: 1,
            padding: '0 4px',
            borderRadius: 4,
            ':hover': {
              boxShadow: 'inset 0 0 0 1px ' + theme.pageTextSubdued,
              backgroundColor: theme.budgetCurrentMonth,
            },
          }}
          valueProps={{
            binding: trackingBudget.catBudgeted(category.id),
            type: 'financial',
            getValueStyle: makeAmountGrey,
            formatExpr: format.forEdit,
            unformatExpr: format.fromEdit,
          }}
          inputProps={{
            onBlur: () => {
              onEdit(null);
            },
            style: {
              backgroundColor: theme.budgetCurrentMonth,
            },
          }}
          onSave={(parsedIntegerAmount: number | null) => {
            onBudgetAction(month, 'budget-amount', {
              category: category.id,
              amount: parsedIntegerAmount ?? 0,
            });
          }}
        />
      </View>
      <Field
        name="budget-allocation"
        width="flex"
        style={{ textAlign: 'right', ...styles.tnum }}
      >
        <CellValueText
          type="financial"
          name={`budget-allocation-${category.id}`}
          value={categoryBudgetAllocation}
          className={css(makeAmountGrey(categoryBudgetAllocation) ?? {})}
        />
      </Field>
      <Field name="spent" width="flex" style={{ textAlign: 'right' }}>
        <View
          data-testid="category-month-spent"
          onClick={() => onShowActivity(category.id, month)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: showScheduleIndicator
              ? 'space-between'
              : 'flex-end',
            gap: 2,
          }}
        >
          {showScheduleIndicator && (
            <View title={description}>
              <Button
                variant="bare"
                style={{
                  color:
                    scheduleStatus === 'missed'
                      ? theme.budgetNumberNegative
                      : scheduleStatus === 'due'
                        ? theme.templateNumberUnderFunded
                        : theme.upcomingText,
                }}
                onPress={() =>
                  schedule._account
                    ? navigate(`/accounts/${schedule._account}`)
                    : navigate('/accounts')
                }
              >
                {isScheduleRecurring ? (
                  <SvgArrowsSynchronize style={{ width: 12, height: 12 }} />
                ) : (
                  <SvgCalendar3 style={{ width: 12, height: 12 }} />
                )}
              </Button>
            </View>
          )}
          <TrackingCellValue
            binding={trackingBudget.catSumAmount(category.id)}
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                className={css({
                  cursor: 'pointer',
                  ':hover': {
                    textDecoration: 'underline',
                  },
                  ...makeAmountGrey(props.value),
                })}
              />
            )}
          </TrackingCellValue>
        </View>
      </Field>

      {!category.is_income && (
        <Field
          name="balance"
          width="flex"
          style={{ paddingRight: styles.monthRightPadding, textAlign: 'right' }}
        >
          <Button
            variant="bare"
            ref={triggerBalanceMenuRef}
            onPress={() => !category.is_income && setBalanceMenuOpen(true)}
            style={{
              justifyContent: 'flex-end',
              background: 'transparent',
              width: '100%',
              padding: 0,
            }}
          >
            <BalanceWithCarryover
              isDisabled={category.is_income}
              carryover={trackingBudget.catCarryover(category.id)}
              balance={trackingBudget.catBalance(category.id)}
              goal={trackingBudget.catGoal(category.id)}
              budgeted={trackingBudget.catBudgeted(category.id)}
              longGoal={trackingBudget.catLongGoal(category.id)}
            >
              {props => (
                <CellValueText
                  {...props}
                  value={categoryBalanceAllocation}
                />
              )}
            </BalanceWithCarryover>
          </Button>

          <Popover
            triggerRef={triggerBalanceMenuRef}
            isOpen={balanceMenuOpen}
            onOpenChange={() => setBalanceMenuOpen(false)}
            placement="bottom end"
          >
            <BalanceMenu
              categoryId={category.id}
              onCarryover={carryover => {
                onMenuAction(month, 'carryover', {
                  category: category.id,
                  flag: carryover,
                });
              }}
            />
          </Popover>
        </Field>
      )}
    </View>
  );
});

export { BudgetSummary } from './budgetsummary/BudgetSummary';

export const ExpenseGroupMonth = GroupMonth;
export const ExpenseCategoryMonth = CategoryMonth;

export const IncomeGroupMonth = GroupMonth;
export const IncomeCategoryMonth = CategoryMonth;

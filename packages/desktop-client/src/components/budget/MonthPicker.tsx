// @ts-strict-ignore
import React from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import {
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { SvgCalendar } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';
import type { BudgetAllocationPeriod } from 'loot-core/shared/weeklyAllocation';

import type { MonthBounds } from './MonthsContext';

import { Link } from '@desktop-client/components/common/Link';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { useLocale } from '@desktop-client/hooks/useLocale';

type MonthPickerProps = {
  startMonth: string;
  numDisplayed: number;
  monthBounds: MonthBounds;
  style: CSSProperties;
  onSelect: (month: string) => void;
};

export const MonthPicker = ({
  startMonth,
  numDisplayed: _numDisplayed,
  monthBounds,
  style,
  onSelect,
}: MonthPickerProps) => {
  const locale = useLocale();
  const { t } = useTranslation();
  const [budgetAllocationPeriod] = useGlobalPref('budgetAllocationPeriod');
  const allocationPeriod =
    (budgetAllocationPeriod as BudgetAllocationPeriod | undefined) ?? 'weekly';

  const currentMonth = monthUtils.currentMonth();

  function getPeriodForMonth(month: string) {
    const monthStart = monthUtils.firstDayOfMonth(month);

    if (allocationPeriod === 'monthly') {
      return {
        title: monthUtils.format(month, 'MMMM', locale),
        range: `${monthUtils.format(monthStart, 'MMM d', locale)} - ${monthUtils.format(monthUtils.lastDayOfMonth(month), 'MMM d', locale)}`,
      };
    }

    const yearStart = `${monthUtils.getYear(month)}-01-01`;
    const dayOfYear =
      monthUtils.differenceInCalendarDays(monthStart, yearStart) + 1;
    const periodLength = allocationPeriod === 'weekly' ? 7 : 14;
    const periodNumber = Math.floor((dayOfYear - 1) / periodLength) + 1;
    const periodStart = monthUtils.addDays(
      yearStart,
      (periodNumber - 1) * periodLength,
    );
    const periodEnd = monthUtils.addDays(periodStart, periodLength - 1);

    return {
      title:
        allocationPeriod === 'weekly'
          ? t('Week {{number}}', { number: periodNumber })
          : t('Fortnight {{number}}', { number: periodNumber }),
      range: `${monthUtils.format(periodStart, 'MMM d', locale)} - ${monthUtils.format(periodEnd, 'MMM d', locale)}`,
    };
  }

  const visiblePeriods = [
    monthUtils.prevMonth(startMonth),
    startMonth,
    monthUtils.nextMonth(startMonth),
  ].map(month => {
    const period = getPeriodForMonth(month);

    return {
      month,
      title: period.title,
      range: period.range,
      isBudgeted: month >= monthBounds.start && month <= monthBounds.end,
      isSelected: month === startMonth,
      isCurrent: month === currentMonth,
    };
  });

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...style,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            width: 84,
            gap: 8,
            flexShrink: 0,
          }}
        >
          <Link
            variant="button"
            buttonVariant="bare"
            onPress={() => onSelect(currentMonth)}
            style={{ padding: '3px 3px' }}
          >
            <View title={t('Today')}>
              <SvgCalendar
                style={{
                  width: 16,
                  height: 16,
                }}
              />
            </View>
          </Link>
          <Link
            variant="button"
            buttonVariant="bare"
            onPress={() => onSelect(monthUtils.prevMonth(startMonth))}
            style={{ padding: '3px 3px' }}
          >
            <View title={t('Previous month')}>
              <SvgCheveronLeft
                style={{
                  width: 16,
                  height: 16,
                }}
              />
            </View>
          </Link>
        </View>
        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: 'row',
            gap: 6,
            marginLeft: 8,
            marginRight: 8,
            justifyContent: 'center',
          }}
        >
          {visiblePeriods.map(period => (
            <View
              key={period.month}
              onClick={() => onSelect(period.month)}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                minWidth: 0,
                maxWidth: 180,
                textAlign: 'center',
                userSelect: 'none',
                borderRadius: 4,
                padding: '2px 10px',
                cursor: 'pointer',
                ...styles.smallText,
                ...(period.isBudgeted
                  ? {}
                  : {
                      textDecoration: 'line-through',
                      color: theme.pageTextSubdued,
                    }),
                ...(period.isSelected
                  ? {
                      backgroundColor: theme.buttonPrimaryBackground,
                      color: theme.buttonPrimaryText,
                    }
                  : {
                      backgroundColor: theme.buttonBareBackgroundHover,
                    }),
                ...(period.isCurrent && !period.isSelected
                  ? { fontWeight: 'bold' }
                  : {}),
              }}
            >
              <View
                style={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {period.title}
              </View>
              <View
                style={{
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {period.range}
              </View>
            </View>
          ))}
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            width: 84,
            gap: 8,
            flexShrink: 0,
          }}
        >
          <Link
            variant="button"
            buttonVariant="bare"
            onPress={() => onSelect(monthUtils.nextMonth(startMonth))}
            style={{ padding: '3px 3px' }}
          >
            <View title={t('Next month')}>
              <SvgCheveronRight
                style={{
                  width: 16,
                  height: 16,
                }}
              />
            </View>
          </Link>
          <View style={{ opacity: 0, padding: '3px 3px' }}>
            <SvgCalendar
              style={{
                width: 16,
                height: 16,
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

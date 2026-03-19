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
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
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
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const dayMonthFormat = monthUtils.getDayMonthFormat(dateFormat);
  const [budgetAllocationPeriod] = useGlobalPref('budgetAllocationPeriod');
  const allocationPeriod =
    (budgetAllocationPeriod as BudgetAllocationPeriod | undefined) ?? 'weekly';

  const currentMonth = monthUtils.currentMonth();

  // Returns the canonical ISO week start date (yyyy-MM-dd) for the week
  // containing the given date/month. For monthly mode returns first-of-month.
  function getPeriodStartDate(refDate: string): string {
    if (allocationPeriod === 'monthly') {
      return monthUtils.firstDayOfMonth(refDate);
    }
    // If refDate is yyyy-MM (no day part), resolve to first day of that month
    const date =
      refDate.length <= 7 ? monthUtils.firstDayOfMonth(refDate) : refDate;

    if (allocationPeriod === 'weekly') {
      // For weekly: return Monday of the ISO week
      return monthUtils.getISOWeekStart(date);
    } else {
      // For fortnightly: calculate 2-week periods starting Monday of week 1
      const isoWeekNumber = monthUtils.getISOWeekNumber(date);
      const isoWeekYear = monthUtils.getISOWeekYear(date);

      // For fortnights, use an even/odd system based on ISO week number
      // Fortnight 1 = weeks 1-2, Fortnight 2 = weeks 3-4, etc.
      const fortnight = Math.ceil(isoWeekNumber / 2);

      // Go back to week 1 of that year, then move forward to the start of the fortnight
      const week1Start = monthUtils.getISOWeekStart(
        `${isoWeekYear}-01-04`, // Jan 4 is always in week 1 per ISO 8601
      );
      const daysToAdd = (fortnight - 1) * 14;
      return monthUtils.addDays(week1Start, daysToAdd);
    }
  }

  // Returns display info for a period whose start date is periodStart (yyyy-MM-dd
  // for weekly/fortnightly, yyyy-MM for monthly).
  function getPeriodForMonth(periodStart: string) {
    if (allocationPeriod === 'monthly') {
      const month = periodStart.slice(0, 7);
      const monthStartDate = monthUtils.firstDayOfMonth(month);
      return {
        title: monthUtils.format(month, 'MMMM', locale),
        year: monthUtils.getYear(month),
        range: `${monthUtils.format(monthStartDate, dayMonthFormat)} - ${monthUtils.format(monthUtils.lastDayOfMonth(month), dayMonthFormat)}`,
      };
    }

    if (allocationPeriod === 'weekly') {
      const weekNumber = monthUtils.getISOWeekNumber(periodStart);
      const weekEnd = monthUtils.getISOWeekEnd(periodStart);
      return {
        title: t('Week {{number}}', { number: weekNumber }),
        year: String(monthUtils.getISOWeekYear(periodStart)),
        range: `${monthUtils.format(periodStart, dayMonthFormat)} - ${monthUtils.format(weekEnd, dayMonthFormat)}`,
      };
    } else {
      // Fortnightly
      const weekNumber = monthUtils.getISOWeekNumber(periodStart);
      const fortnight = Math.ceil(weekNumber / 2);
      const periodEnd = monthUtils.addDays(periodStart, 13); // 2 weeks - 1 day
      return {
        title: t('Fortnight {{number}}', { number: fortnight }),
        year: String(monthUtils.getISOWeekYear(periodStart)),
        range: `${monthUtils.format(periodStart, dayMonthFormat)} - ${monthUtils.format(periodEnd, dayMonthFormat)}`,
      };
    }
  }

  const periodDays =
    allocationPeriod === 'weekly'
      ? 7
      : allocationPeriod === 'fortnightly'
        ? 14
        : 0;

  // In weekly/fortnightly mode the current period start may be a full date
  // (yyyy-MM-dd). For monthly mode it stays as the first day of the stored month.
  const currentPeriodStart = getPeriodStartDate(startMonth);

  const prevPeriodStart =
    allocationPeriod === 'monthly'
      ? monthUtils.firstDayOfMonth(monthUtils.prevMonth(startMonth))
      : monthUtils.subDays(currentPeriodStart, periodDays);

  const nextPeriodStart =
    allocationPeriod === 'monthly'
      ? monthUtils.firstDayOfMonth(monthUtils.nextMonth(startMonth))
      : monthUtils.addDays(currentPeriodStart, periodDays);

  const todayPeriodStart = getPeriodStartDate(
    allocationPeriod === 'monthly' ? currentMonth : monthUtils.currentDay(),
  );

  const visiblePeriods = [
    prevPeriodStart,
    currentPeriodStart,
    nextPeriodStart,
  ].map(periodStart => {
    const period = getPeriodForMonth(periodStart);
    const monthSlice = periodStart.slice(0, 7);

    return {
      month: periodStart,
      title: period.title,
      year: period.year,
      range: period.range,
      isBudgeted:
        monthSlice >= monthBounds.start.slice(0, 7) &&
        monthSlice <= monthBounds.end.slice(0, 7),
      isSelected: periodStart === currentPeriodStart,
      isCurrent: periodStart === todayPeriodStart,
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
            onPress={() => onSelect(todayPeriodStart)}
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
            onPress={() => onSelect(prevPeriodStart)}
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
                {period.year}
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
            onPress={() => onSelect(nextPeriodStart)}
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

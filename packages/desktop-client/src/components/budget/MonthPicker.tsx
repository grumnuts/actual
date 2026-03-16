// @ts-strict-ignore
import React, { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
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
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const dayMonthFormat = monthUtils.getDayMonthFormat(dateFormat);
  const { t } = useTranslation();
  const [budgetAllocationPeriod] = useGlobalPref('budgetAllocationPeriod');
  const allocationPeriod =
    (budgetAllocationPeriod as BudgetAllocationPeriod | undefined) ?? 'weekly';

  const currentMonth = monthUtils.currentMonth();
  const periodLength = allocationPeriod === 'weekly' ? 7 : 14;

  function getPeriodStartFromDate(date: string) {
    if (allocationPeriod === 'weekly') {
      return monthUtils.weekFromDate(date, '1');
    }

    if (allocationPeriod === 'fortnightly') {
      const isoWeekStart = monthUtils.weekFromDate(date, '1');
      const isoWeekNumber = parseInt(monthUtils.format(isoWeekStart, 'I'));

      return isoWeekNumber % 2 === 0
        ? monthUtils.subWeeks(isoWeekStart, 1)
        : isoWeekStart;
    }

    const yearStart = `${monthUtils.getYear(date)}-01-01`;
    const dayOfYear = monthUtils.differenceInCalendarDays(date, yearStart) + 1;
    const periodNumber = Math.floor((dayOfYear - 1) / periodLength) + 1;

    return monthUtils.addDays(yearStart, (periodNumber - 1) * periodLength);
  }

  const [selectedPeriodStart, setSelectedPeriodStart] = useState<string>(() => {
    const anchorDate =
      startMonth === currentMonth
        ? monthUtils.currentDay()
        : monthUtils.firstDayOfMonth(startMonth);

    return getPeriodStartFromDate(anchorDate);
  });

  useEffect(() => {
    if (allocationPeriod === 'monthly') {
      return;
    }

    const selectedMonth = monthUtils.monthFromDate(selectedPeriodStart);
    if (selectedMonth !== startMonth) {
      const anchorDate =
        startMonth === currentMonth
          ? monthUtils.currentDay()
          : monthUtils.firstDayOfMonth(startMonth);
      setSelectedPeriodStart(getPeriodStartFromDate(anchorDate));
    }
  }, [allocationPeriod, currentMonth, startMonth]);

  function getPeriodForMonth(month: string) {
    const monthStart = monthUtils.firstDayOfMonth(month);

    if (allocationPeriod === 'monthly') {
      return {
        title: monthUtils.format(month, 'MMMM', locale),
        year: monthUtils.format(month, 'yyyy', locale),
        range: `${monthUtils.format(monthStart, dayMonthFormat, locale)} - ${monthUtils.format(monthUtils.lastDayOfMonth(month), dayMonthFormat, locale)}`,
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
      year: monthUtils.format(periodStart, 'R', locale),
      range: `${monthUtils.format(periodStart, dayMonthFormat, locale)} - ${monthUtils.format(periodEnd, dayMonthFormat, locale)}`,
    };
  }

  const monthTargets = [
    monthUtils.prevMonth(startMonth),
    startMonth,
    monthUtils.nextMonth(startMonth),
  ];

  const currentPeriodStart = getPeriodStartFromDate(monthUtils.currentDay());

  const visiblePeriods =
    allocationPeriod === 'monthly'
      ? monthTargets.map(month => {
          const period = getPeriodForMonth(month);

          return {
            month,
            title: period.title,
            year: period.year,
            range: period.range,
            isBudgeted: month >= monthBounds.start && month <= monthBounds.end,
            isSelected: month === startMonth,
            isCurrent: month === currentMonth,
          };
        })
      : (() => {
          return monthTargets.map((_, index) => {
            const offset = index - 1;
            const periodStart = monthUtils.addDays(
              selectedPeriodStart,
              offset * periodLength,
            );
            const periodEnd = monthUtils.addDays(periodStart, periodLength - 1);
            const periodNumber =
              allocationPeriod === 'weekly'
                ? parseInt(monthUtils.format(periodStart, 'I'))
                : allocationPeriod === 'fortnightly'
                  ? Math.ceil(parseInt(monthUtils.format(periodStart, 'I')) / 2)
                : (() => {
                    const periodYearStart = `${monthUtils.getYear(periodStart)}-01-01`;
                    const periodDayOfYear =
                      monthUtils.differenceInCalendarDays(
                        periodStart,
                        periodYearStart,
                      ) + 1;

                    return Math.floor((periodDayOfYear - 1) / periodLength) + 1;
                  })();

            return {
              month: monthUtils.monthFromDate(periodStart),
              title:
                allocationPeriod === 'weekly'
                  ? t('Week {{number}}', { number: periodNumber })
                  : t('Fortnight {{number}}', { number: periodNumber }),
              year: monthUtils.format(periodStart, 'R', locale),
              range: `${monthUtils.format(periodStart, dayMonthFormat, locale)} - ${monthUtils.format(periodEnd, dayMonthFormat, locale)}`,
              isBudgeted:
                monthUtils.monthFromDate(periodStart) >= monthBounds.start &&
                monthUtils.monthFromDate(periodStart) <= monthBounds.end,
              isSelected: index === 1,
              isCurrent: periodStart === currentPeriodStart,
              periodStart,
            };
          });
        })();

  function navigatePeriod(offset: number) {
    const nextPeriodStart = monthUtils.addDays(
      selectedPeriodStart,
      offset * periodLength,
    );
    setSelectedPeriodStart(nextPeriodStart);
    onSelect(monthUtils.monthFromDate(nextPeriodStart));
  }

  useHotkeys(
    'left',
    () => {
      if (allocationPeriod === 'monthly') {
        return;
      }

      navigatePeriod(-1);
    },
    {
      preventDefault: true,
      scopes: ['app'],
    },
    [allocationPeriod, selectedPeriodStart, periodLength],
  );

  useHotkeys(
    'right',
    () => {
      if (allocationPeriod === 'monthly') {
        return;
      }

      navigatePeriod(1);
    },
    {
      preventDefault: true,
      scopes: ['app'],
    },
    [allocationPeriod, selectedPeriodStart, periodLength],
  );

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
            onPress={() => {
              if (allocationPeriod === 'monthly') {
                onSelect(currentMonth);
                return;
              }

              setSelectedPeriodStart(currentPeriodStart);
              onSelect(monthUtils.monthFromDate(currentPeriodStart));
            }}
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
            onPress={() => {
              if (allocationPeriod === 'monthly') {
                onSelect(monthUtils.prevMonth(startMonth));
                return;
              }

              navigatePeriod(-1);
            }}
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
              key={period.periodStart ?? period.month}
              onClick={() => {
                if (allocationPeriod === 'monthly') {
                  onSelect(period.month);
                  return;
                }

                setSelectedPeriodStart(period.periodStart);
                onSelect(period.month);
              }}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                minWidth: 0,
                maxWidth: 220,
                textAlign: 'center',
                userSelect: 'none',
                borderRadius: 4,
                padding: '4px 10px',
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
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {period.year}
              </View>
              <View
                style={{
                  fontSize: 10,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                  textAlign: 'center',
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
            onPress={() => {
              if (allocationPeriod === 'monthly') {
                onSelect(monthUtils.nextMonth(startMonth));
                return;
              }

              navigatePeriod(1);
            }}
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

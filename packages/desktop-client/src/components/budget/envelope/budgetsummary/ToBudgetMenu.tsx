import React from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';

import type { BudgetAllocationPeriod } from 'loot-core/shared/weeklyAllocation';

import { useEnvelopeSheetValue } from '@desktop-client/components/budget/envelope/EnvelopeBudgetComponents';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

type ToBudgetMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  onTransfer: () => void;
  onCover: () => void;
  onHoldBuffer: () => void;
  onResetHoldBuffer: () => void;
  onBudgetAction?: (month: string, action: string, arg?: unknown) => void;
  month: string;
};

export function ToBudgetMenu({
  onTransfer,
  onCover,
  onHoldBuffer,
  onResetHoldBuffer,
  onBudgetAction,
  month,
  ...props
}: ToBudgetMenuProps) {
  const { t } = useTranslation();
  const [budgetAllocationPeriod] = useGlobalPref('budgetAllocationPeriod');
  const allocationPeriod =
    (budgetAllocationPeriod as BudgetAllocationPeriod | undefined) ?? 'weekly';

  const toBudget = useEnvelopeSheetValue(envelopeBudget.toBudget) ?? 0;
  const forNextMonth = useEnvelopeSheetValue(envelopeBudget.forNextMonth) ?? 0;
  const manualBuffered =
    useEnvelopeSheetValue(envelopeBudget.manualBuffered) ?? 0;
  const autoBuffered = useEnvelopeSheetValue(envelopeBudget.autoBuffered) ?? 0;
  const items = [
    ...(toBudget > 0
      ? [
          {
            name: 'transfer',
            text: t('Move to a category'),
          },
        ]
      : []),
    ...(autoBuffered === 0 && toBudget > 0
      ? [
          {
            name: 'buffer',
            text:
              allocationPeriod === 'monthly'
                ? t('Hold for next month')
                : allocationPeriod === 'fortnightly'
                  ? t('Hold for next fortnight')
                  : t('Hold for next week'),
          },
        ]
      : []),
    ...(toBudget < 0
      ? [
          {
            name: 'cover',
            text: t('Cover from a category'),
          },
        ]
      : []),
    ...(forNextMonth > 0 && manualBuffered === 0
      ? [
          {
            name: 'disable-auto-buffer',
            text: t('Disable current auto hold'),
          },
        ]
      : []),
    ...(forNextMonth > 0 && manualBuffered !== 0
      ? [
          {
            name: 'reset-buffer',
            text:
              allocationPeriod === 'monthly'
                ? t("Reset next month's buffer")
                : allocationPeriod === 'fortnightly'
                  ? t("Reset next fortnight's buffer")
                  : t("Reset next week's buffer"),
          },
        ]
      : []),
  ];

  return (
    <Menu
      {...props}
      onMenuSelect={name => {
        switch (name) {
          case 'transfer':
            onTransfer?.();
            break;
          case 'cover':
            onCover?.();
            break;
          case 'buffer':
            onHoldBuffer?.();
            onBudgetAction?.(month, 'reset-income-carryover', {});
            break;
          case 'reset-buffer':
            onResetHoldBuffer?.();
            break;
          case 'disable-auto-buffer':
            onBudgetAction?.(month, 'reset-income-carryover', {});
            break;
          default:
            throw new Error(`Unrecognized menu option: ${name}`);
        }
      }}
      items={
        items.length > 0
          ? items
          : [
              {
                name: 'none',
                text: t('No actions available'),
                disabled: true,
              },
            ]
      }
    />
  );
}

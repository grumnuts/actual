import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { CategoryEntity } from 'loot-core/types/models';
import type { BillingPeriod } from 'loot-core/types/models/category';

import { BILLING_PERIOD_COLUMN_WIDTH, getBillingPeriodBadgeColors } from './util';

type BillingPeriodColumnProps = {
  category?: CategoryEntity;
  hideBottomBorder?: boolean;
  onSave?: (category: CategoryEntity) => void;
};

const BILLING_PERIOD_MENU_ITEMS: Array<{ name: BillingPeriod; text: string }> =
  [
    { name: 'weekly', text: 'Weekly' },
    { name: 'fortnightly', text: 'Fortnightly' },
    { name: 'monthly', text: 'Monthly' },
    { name: 'quarterly', text: 'Quarterly' },
    { name: 'annually', text: 'Annually' },
  ];

export function BillingPeriodColumn({
  category,
  hideBottomBorder = false,
  onSave,
}: BillingPeriodColumnProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);

  const period = (category?.billing_period ?? 'monthly') as BillingPeriod;
  const periodLabelMap: Record<BillingPeriod, string> = {
    weekly: t('Weekly'),
    fortnightly: t('Fortnightly'),
    monthly: t('Monthly'),
    quarterly: t('Quarterly'),
    annually: t('Annually'),
  };
  const badgeColors = getBillingPeriodBadgeColors(period);

  return (
    <View
      style={{
        width: BILLING_PERIOD_COLUMN_WIDTH,
        borderLeftWidth: 1,
        borderTopWidth: 1,
        borderBottomWidth: hideBottomBorder ? 0 : 1,
        borderColor: theme.tableBorder,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .2s',
        },
        '&:hover .hover-visible': {
          opacity: 1,
        },
      }}
    >
      {category?.id !== 'new' && category ? (
        <>
          <View
            style={{
              backgroundColor: badgeColors.backgroundColor,
              borderRadius: 4,
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 1,
              paddingBottom: 1,
            }}
          >
            <Text style={{ fontSize: 10, color: badgeColors.textColor }}>
              {periodLabelMap[period]}
            </Text>
          </View>

          {onSave ? (
            <View
              ref={triggerRef}
              style={{
                position: 'absolute',
                right: 2,
                top: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <Button
                variant="bare"
                className="hover-visible"
                style={{ color: 'currentColor', padding: 3 }}
                onPress={() => setMenuOpen(true)}
              >
                <SvgCheveronDown
                  width={14}
                  height={14}
                  style={{ color: 'currentColor' }}
                />
              </Button>
            </View>
          ) : null}

          <Popover
            triggerRef={triggerRef}
            placement="bottom start"
            isOpen={menuOpen}
            onOpenChange={() => setMenuOpen(false)}
            style={{ width: 160, margin: 1 }}
            isNonModal
          >
            <Menu
              items={BILLING_PERIOD_MENU_ITEMS.map(item => ({
                name: item.name,
                text: t(item.text),
              }))}
              onMenuSelect={selected => {
                if (!category || !onSave) {
                  setMenuOpen(false);
                  return;
                }

                onSave({
                  ...category,
                  billing_period: selected as BillingPeriod,
                });
                setMenuOpen(false);
              }}
            />
          </Popover>
        </>
      ) : null}
    </View>
  );
}

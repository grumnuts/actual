import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { integerToCurrency } from 'loot-core/shared/util';
import { calculateWeeklyAllocation } from 'loot-core/shared/weeklyAllocation';
import type { BillingPeriod } from 'loot-core/types/models';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '@desktop-client/components/common/Modal';
import { AmountInput } from '@desktop-client/components/util/AmountInput';
import type { Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type NewCategoryModalProps = Extract<
  ModalType,
  { name: 'new-category' }
>['options'];

export function NewCategoryModal({
  onValidate,
  onSubmit,
}: NewCategoryModalProps) {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const weekly = calculateWeeklyAllocation(amount, period);

  const amountLabel: Record<BillingPeriod, string> = {
    weekly: t('Amount per week'),
    fortnightly: t('Amount per fortnight'),
    monthly: t('Amount per month'),
    quarterly: t('Amount per quarter'),
    annually: t('Amount per year'),
  };

  const handleSubmit = async (close: () => void) => {
    const trimmed = name.trim();
    const maybeError = onValidate?.(trimmed) ?? null;
    if (maybeError) {
      setError(maybeError);
      return;
    }
    await onSubmit({
      name: trimmed,
      billingPeriod: period,
      weeklyAllocationAmount: amount,
      weeklyAllocationOverride: 0,
    });
    close();
  };

  return (
    <Modal name="new-category">
      {({ state }) => {
        const closeModal = () => state.close();

        return (
          <>
            <ModalHeader
              title={<ModalTitle title={t('New Category')} shrinkOnOverflow />}
              rightContent={<ModalCloseButton onPress={closeModal} />}
            />
            <View style={{ padding: 20, gap: 12 }}>
              <View
                style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                <Text style={{ fontSize: 13, color: theme.tableText }}>
                  <Trans>Category name</Trans>
                </Text>
                <InitialFocus>
                  <Input
                    value={name}
                    onChangeValue={setName}
                    placeholder={t('Category name')}
                    style={{ width: '100%' }}
                  />
                </InitialFocus>
              </View>

              <View>
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.tableText,
                    marginBottom: 6,
                  }}
                >
                  <Trans>Billing period</Trans>
                </Text>
                <Select<BillingPeriod>
                  options={[
                    ['weekly', t('Weekly')],
                    ['fortnightly', t('Fortnightly')],
                    ['monthly', t('Monthly')],
                    ['quarterly', t('Quarterly')],
                    ['annually', t('Annually')],
                  ]}
                  value={period}
                  onChange={setPeriod}
                />
              </View>

              <View>
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.tableText,
                    marginBottom: 6,
                  }}
                >
                  {amountLabel[period]}
                </Text>
                <AmountInput
                  value={amount}
                  onUpdate={setAmount}
                  style={{ width: '100%' }}
                />
              </View>

              {weekly !== 0 && (
                <Text style={{ fontSize: 12, color: theme.tableTextSubdued }}>
                  <Trans>Calculated weekly allocation</Trans>:{' '}
                  {integerToCurrency(weekly)}
                  /week
                </Text>
              )}

              {error && <Text style={{ color: theme.errorText }}>{error}</Text>}

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  gap: 8,
                }}
              >
                <Button onPress={closeModal}>
                  <Trans>Cancel</Trans>
                </Button>
                <Button
                  variant="primary"
                  onPress={() => void handleSubmit(closeModal)}
                >
                  <Trans>Add</Trans>
                </Button>
              </View>
            </View>
          </>
        );
      }}
    </Modal>
  );
}

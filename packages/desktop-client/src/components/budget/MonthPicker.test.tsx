import React from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as monthUtils from 'loot-core/shared/months';

import { MonthPicker } from './MonthPicker';

import { TestProviders } from '@desktop-client/mocks';

let budgetAllocationPeriod: 'weekly' | 'fortnightly' | 'monthly' = 'weekly';
let configuredDateFormat = 'dd/MM/yyyy';

vi.mock('@desktop-client/hooks/useGlobalPref', () => ({
  useGlobalPref: (key: string) => {
    if (key === 'budgetAllocationPeriod') {
      return [budgetAllocationPeriod];
    }

    return [null];
  },
}));

vi.mock('@desktop-client/components/common/Link', () => ({
  Link: ({ onPress, children, buttonVariant, variant, ...props }) => (
    <button onClick={onPress} type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@desktop-client/hooks/useDateFormat', () => ({
  useDateFormat: () => configuredDateFormat,
}));

describe('MonthPicker period navigation', () => {
  const defaultProps = {
    startMonth: '2026-02',
    numDisplayed: 3,
    monthBounds: { start: '2025-01', end: '2027-12' },
    style: {},
  };

  beforeEach(() => {
    budgetAllocationPeriod = 'weekly';
    configuredDateFormat = 'dd/MM/yyyy';
  });

  it('shows contiguous weekly periods and right arrow advances by one period', async () => {
    const onSelect = vi.fn();
    render(
      <TestProviders>
        <MonthPicker {...defaultProps} onSelect={onSelect} />
      </TestProviders>,
    );

    expect(screen.getByText('Week 4')).toBeInTheDocument();
    expect(screen.getByText('Week 5')).toBeInTheDocument();
    expect(screen.getByText('Week 6')).toBeInTheDocument();

    await userEvent.click(screen.getByTitle('Next month'));

    expect(onSelect).toHaveBeenCalledWith('2026-02-02');
  });

  it('clicking previous fortnight card selects previous period', async () => {
    budgetAllocationPeriod = 'fortnightly';
    const onSelect = vi.fn();

    render(
      <TestProviders>
        <MonthPicker {...defaultProps} onSelect={onSelect} />
      </TestProviders>,
    );

    expect(screen.getByText('Fortnight 2')).toBeInTheDocument();
    expect(screen.getByText('Fortnight 3')).toBeInTheDocument();
    expect(screen.getByText('Fortnight 4')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Fortnight 2'));

    expect(onSelect).toHaveBeenCalledWith('2026-01-12');
  });

  it('uses ISO week number for current week', () => {
    const onSelect = vi.fn();
    const isoWeek = parseInt(monthUtils.format(monthUtils.currentDay(), 'I'));

    render(
      <TestProviders>
        <MonthPicker
          {...defaultProps}
          startMonth={monthUtils.currentMonth()}
          onSelect={onSelect}
        />
      </TestProviders>,
    );

    expect(screen.getByText(`Week ${isoWeek}`)).toBeInTheDocument();
  });

  it('uses ISO-based fortnight number for current fortnight', () => {
    budgetAllocationPeriod = 'fortnightly';
    const onSelect = vi.fn();
    const isoWeek = parseInt(monthUtils.format(monthUtils.currentDay(), 'I'));
    const isoFortnight = Math.ceil(isoWeek / 2);

    render(
      <TestProviders>
        <MonthPicker
          {...defaultProps}
          startMonth={monthUtils.currentMonth()}
          onSelect={onSelect}
        />
      </TestProviders>,
    );

    expect(screen.getByText(`Fortnight ${isoFortnight}`)).toBeInTheDocument();
  });

  it('uses the configured numeric date format for the period range', () => {
    const onSelect = vi.fn();

    render(
      <TestProviders>
        <MonthPicker {...defaultProps} onSelect={onSelect} />
      </TestProviders>,
    );

    expect(screen.getByText('26/01 - 01/02')).toBeInTheDocument();
  });

  it('shows the period year as subheading', () => {
    const onSelect = vi.fn();

    render(
      <TestProviders>
        <MonthPicker {...defaultProps} onSelect={onSelect} />
      </TestProviders>,
    );

    expect(screen.getAllByText('2026').length).toBeGreaterThan(0);
  });
});

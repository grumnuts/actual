import type { CategoryGroupEntity } from './category-group';

export type BillingPeriod =
  | 'weekly'
  | 'fortnightly'
  | 'monthly'
  | 'quarterly'
  | 'annually';

export type CategoryEntity = {
  id: string;
  name: string;
  is_income?: boolean;
  group: CategoryGroupEntity['id'];
  goal_def?: string;
  template_settings?: { source: 'notes' | 'ui' };
  sort_order?: number;
  tombstone?: boolean;
  hidden?: boolean;
  billing_period?: BillingPeriod;
  /** Budget amount for the chosen billing period, stored in cents (integer). */
  weekly_allocation_amount?: number;
  /** Manual override for weekly allocation, in cents. 0 means auto-calculate. */
  weekly_allocation_override?: number;
};

# Actual Budget — Fork Feature Additions

## Context

This is a fork of Actual Budget (https://github.com/actualbudget/actual). Do not rewrite or restructure existing Actual code. Only add the features described below.

---

## Core Concept

The user allocates funds on a **weekly basis** for everything. Every category has a billing period (how often the expense actually hits) and a weekly allocation (how much to set aside each week to cover it).

The weekly allocation is always the primary number. It answers: _"how much do I need to set aside this week for this category?"_

### Billing Periods

| Period      | Budget field         | Weekly allocation formula |
| ----------- | -------------------- | ------------------------- |
| Weekly      | Amount per week      | amount                    |
| Fortnightly | Amount per fortnight | amount / 2                |
| Monthly     | Amount per month     | (amount \* 12) / 52       |
| Quarterly   | Amount per quarter   | (amount \* 4) / 52        |
| Annually    | Amount per year      | amount / 52               |

### Examples

| Category      | Billing Period | Budget Amount | Weekly Allocation |
| ------------- | -------------- | ------------- | ----------------- |
| Rent          | Weekly         | $560/week     | $560.00           |
| Groceries     | Weekly         | $340/week     | $340.00           |
| Electricity   | Quarterly      | $600/quarter  | $46.15            |
| Car Insurance | Monthly        | $99/month     | $22.85            |
| Rego          | Annually       | $936/year     | $18.03            |

---

## What Needs Adding

### 1. Billing Period Field on Categories

Add a billing period selector when creating or editing a category:

- Weekly
- Fortnightly
- Monthly
- Quarterly
- Annually

### 2. Budget Amount Field per Billing Period

The budget amount entered should reflect the billing period selected. If the user selects Quarterly, they enter the quarterly amount. If they select Annually, they enter the annual amount. If Weekly, they enter the weekly amount. The label on the budget input should update to reflect the selected period — e.g. "Amount per quarter", "Amount per week".

### 3. Weekly Allocation (Auto-calculated)

Calculate weekly allocation from the budget amount and billing period using the formulas in the table above. Display on every category row. Allow manual override — if overridden, store the value and stop auto-calculating.

### 4. Annual Budget View (Toggle)

Add a toggleable annual view alongside Actual's existing monthly view. Do not remove the monthly view.

Annual view shows per category:

| Column            | Description                                         |
| ----------------- | --------------------------------------------------- |
| Category          | Name                                                |
| Billing Period    | Badge                                               |
| Budget Amount     | Amount in the category's own period (e.g. $600/qtr) |
| Weekly Allocation | Auto-calculated or manual override                  |
| Spent YTD         | Actual spend January 1 to today                     |
| Remaining         | Annual budget equivalent minus spent YTD            |
| % Used            | Progress bar                                        |
| Status            | On track / At risk / Over budget                    |

For the Remaining and % Used columns, convert everything to annual equivalent for comparison:

```
annual_equivalent = weekly_allocation * 52
remaining = annual_equivalent - spent_ytd
pct_used = spent_ytd / annual_equivalent
```

### 5. Status Logic

```
weeks_elapsed = day_of_year / 7
expected_spend = weekly_allocation * weeks_elapsed

if spent_ytd > annual_equivalent:
  status = OVER BUDGET (red)
elif spent_ytd > expected_spend * 0.8:
  status = AT RISK (amber)
else:
  status = ON TRACK (green)
```

### 6. Weekly Allocation Summary

At the bottom of the budget page show a running total:

```
Total weekly allocation: $XXX.XX
```

Summed across all active categories. This is the total the user needs to set aside each week across all accounts.

---

## What NOT to Change

- Do not touch import/CSV functionality
- Do not touch sync or multi-user functionality
- Do not touch the existing monthly budget view
- Do not touch transaction entry
- Do not touch rules/payee matching
- Do not touch reports
- Do not touch account management
- Do not restructure the database beyond adding the new fields

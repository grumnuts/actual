ALTER TABLE categories ADD COLUMN billing_period TEXT DEFAULT 'monthly';
ALTER TABLE categories ADD COLUMN weekly_allocation_amount INTEGER DEFAULT 0;
ALTER TABLE categories ADD COLUMN weekly_allocation_override INTEGER DEFAULT 0;

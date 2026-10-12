# First-time Aiven database setup

Use `database/paintedloops-aiven.sql` only for an empty `defaultdb`.
This is a setup script, not a migration or a backup restore.

1. Connect to Aiven in MySQL Workbench.
2. Open the SQL file with File > Open SQL Script.
3. Enable Query > Stop Script Execution On Errors.
4. Execute the entire script (Ctrl+Shift+Enter, with no text selected).
5. Check Action Output for errors. Expect 8 tables, 8 categories and 34 products.
6. Refresh Schemas > defaultdb > Tables.
7. Keep Render's DB_NAME set to defaultdb and deploy the latest commit.

If an error occurs, run ROLLBACK and inspect the error before retrying.
MySQL table creation auto-commits: a failed import can leave some empty tables.
Do not rerun the whole script into a partially populated database or delete tables blindly.

## What is included

- Tables compatible with the current backend, including review photo_url and is_approved.
- The 34 product records and 8 categories from the existing repository.
- Existing prices and stock retained. These are not a verified inventory or pricing audit.
- 27 verified product image mappings; products without a matching photo use the frontend placeholder.
- No preset admin password, customer accounts, orders, or fake review counts.
- No old-price discounts or promotional badges from the sample seed.
- No DROP, TRUNCATE or disabling of foreign-key checks.

Register your own account through the website after deployment.
If you need admin access, identify your account with SELECT id,email,role FROM users;
then update only your verified account ID, for example:
UPDATE users SET role='admin' WHERE id=YOUR_VERIFIED_USER_ID;
Replace YOUR_VERIFIED_USER_ID with the actual numeric ID. Log in again afterward.

Before accepting orders, verify each product's price and available stock.
This script does not repair the outstanding checkout/payment backend issues documented
during the deployment review; database setup alone is not a production-readiness sign-off.

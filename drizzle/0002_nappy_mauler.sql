CREATE TABLE `customer_excel_mappings` (
	`customer` text PRIMARY KEY NOT NULL,
	`sheet_name` text NOT NULL,
	`mapping` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sales_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`import_id` text NOT NULL,
	`source_row` integer NOT NULL,
	`transaction_date` text NOT NULL,
	`customer` text NOT NULL,
	`item_code` text,
	`item_name` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`supply_amount` integer NOT NULL,
	`tax_amount` integer NOT NULL,
	`note` text,
	`source_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_transactions_source_hash_unique` ON `sales_transactions` (`source_hash`);--> statement-breakpoint
CREATE INDEX `sales_transactions_date_idx` ON `sales_transactions` (`transaction_date`);--> statement-breakpoint
CREATE INDEX `sales_transactions_customer_idx` ON `sales_transactions` (`customer`);--> statement-breakpoint
CREATE INDEX `sales_transactions_import_idx` ON `sales_transactions` (`import_id`);--> statement-breakpoint
CREATE TABLE `statement_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`file_key` text NOT NULL,
	`file_size` integer NOT NULL,
	`customer` text NOT NULL,
	`sheet_name` text NOT NULL,
	`status` text NOT NULL,
	`source_rows` integer NOT NULL,
	`imported_rows` integer NOT NULL,
	`error_rows` integer NOT NULL,
	`duplicate_rows` integer NOT NULL,
	`imported_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `statement_imports_created_at_idx` ON `statement_imports` (`created_at`);
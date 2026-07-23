import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const systemSettings = sqliteTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by").notNull(),
});

export const appUsers = sqliteTable("app_users", {
  email: text("email").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at").notNull(),
});

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    section: text("section").notNull(),
    action: text("action").notNull(),
    summary: text("summary").notNull(),
    actor: text("actor").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("audit_logs_created_at_idx").on(table.createdAt)],
);

export const statementImports = sqliteTable(
  "statement_imports",
  {
    id: text("id").primaryKey(),
    fileName: text("file_name").notNull(),
    fileKey: text("file_key").notNull(),
    fileSize: integer("file_size").notNull(),
    customer: text("customer").notNull(),
    sheetName: text("sheet_name").notNull(),
    status: text("status").notNull(),
    sourceRows: integer("source_rows").notNull(),
    importedRows: integer("imported_rows").notNull(),
    errorRows: integer("error_rows").notNull(),
    duplicateRows: integer("duplicate_rows").notNull(),
    importedBy: text("imported_by").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("statement_imports_created_at_idx").on(table.createdAt)],
);

export const salesTransactions = sqliteTable(
  "sales_transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    importId: text("import_id").notNull(),
    sourceRow: integer("source_row").notNull(),
    transactionDate: text("transaction_date").notNull(),
    customer: text("customer").notNull(),
    itemCode: text("item_code"),
    itemName: text("item_name").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    supplyAmount: integer("supply_amount").notNull(),
    taxAmount: integer("tax_amount").notNull(),
    note: text("note"),
    sourceHash: text("source_hash").notNull().unique(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("sales_transactions_date_idx").on(table.transactionDate),
    index("sales_transactions_customer_idx").on(table.customer),
    index("sales_transactions_import_idx").on(table.importId),
  ],
);

export const customerExcelMappings = sqliteTable("customer_excel_mappings", {
  customer: text("customer").primaryKey(),
  sheetName: text("sheet_name").notNull(),
  mapping: text("mapping").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const settingsSchemaSql = [
  `CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS app_users (
    email TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    active INTEGER DEFAULT 1 NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    section TEXT NOT NULL,
    action TEXT NOT NULL,
    summary TEXT NOT NULL,
    actor TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at)",
] as const;

export const statementImportSchemaSql = [
  `CREATE TABLE IF NOT EXISTS statement_imports (
    id TEXT PRIMARY KEY NOT NULL,
    file_name TEXT NOT NULL,
    file_key TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    customer TEXT NOT NULL,
    sheet_name TEXT NOT NULL,
    status TEXT NOT NULL,
    source_rows INTEGER NOT NULL,
    imported_rows INTEGER NOT NULL,
    error_rows INTEGER NOT NULL,
    duplicate_rows INTEGER NOT NULL,
    imported_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS statement_imports_created_at_idx ON statement_imports (created_at)",
  `CREATE TABLE IF NOT EXISTS sales_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    import_id TEXT NOT NULL,
    source_row INTEGER NOT NULL,
    transaction_date TEXT NOT NULL,
    customer TEXT NOT NULL,
    item_code TEXT,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    supply_amount INTEGER NOT NULL,
    tax_amount INTEGER NOT NULL,
    note TEXT,
    source_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS sales_transactions_date_idx ON sales_transactions (transaction_date)",
  "CREATE INDEX IF NOT EXISTS sales_transactions_customer_idx ON sales_transactions (customer)",
  "CREATE INDEX IF NOT EXISTS sales_transactions_import_idx ON sales_transactions (import_id)",
  `CREATE TABLE IF NOT EXISTS customer_excel_mappings (
    customer TEXT PRIMARY KEY NOT NULL,
    sheet_name TEXT NOT NULL,
    mapping TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
] as const;

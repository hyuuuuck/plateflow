import { getD1, getFiles } from "../../../db";
import { settingsSchemaSql, statementImportSchemaSql } from "../../../db/schema";

type ImportRow = {
  sourceRow?: number;
  transactionDate?: string;
  customer?: string;
  itemCode?: string;
  itemName?: string;
  quantity?: number;
  unitPrice?: number;
  supplyAmount?: number;
  taxAmount?: number;
  note?: string;
};

type ImportPayload = {
  customer?: string;
  sheetName?: string;
  mapping?: Record<string, string>;
  rows?: ImportRow[];
  sourceRows?: number;
  errorRows?: number;
  allowDuplicates?: boolean;
};

function actorFrom(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email");
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get("oai-authenticated-user-full-name-encoding");
  const name =
    encodedName && encoding === "percent-encoded-utf-8"
      ? decodeURIComponent(encodedName)
      : null;
  return name ? `${name} (${email ?? "workspace"})` : email ?? "local-admin";
}

function safeFileName(value: string) {
  return value.replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 120) || "statement.xlsx";
}

function stringValue(value: unknown, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function numberValue(value: unknown, field: string) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) throw new Error(`${field} 값이 올바르지 않습니다.`);
  return Math.round(number);
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeRow(row: ImportRow, fallbackCustomer: string, index: number) {
  const transactionDate = stringValue(row.transactionDate, 10);
  const customer = stringValue(row.customer || fallbackCustomer, 120);
  const itemName = stringValue(row.itemName, 160);
  if (!validDate(transactionDate)) {
    throw new Error(`${index + 1}번째 행의 거래일을 확인해주세요.`);
  }
  if (!customer || !itemName) {
    throw new Error(`${index + 1}번째 행의 고객사 또는 품명을 확인해주세요.`);
  }

  return {
    sourceRow: numberValue(row.sourceRow ?? index + 2, "원본 행"),
    transactionDate,
    customer,
    itemCode: stringValue(row.itemCode, 80),
    itemName,
    quantity: numberValue(row.quantity, "수량"),
    unitPrice: numberValue(row.unitPrice, "단가"),
    supplyAmount: numberValue(row.supplyAmount, "공급가액"),
    taxAmount: numberValue(row.taxAmount ?? 0, "부가세"),
    note: stringValue(row.note, 300),
  };
}

async function transactionHash(row: ReturnType<typeof normalizeRow>, salt = "") {
  const source = [
    row.transactionDate,
    row.customer,
    row.itemCode,
    row.itemName,
    row.quantity,
    row.unitPrice,
    row.supplyAmount,
    row.taxAmount,
    row.note,
    salt,
  ].join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function ensureSchema() {
  const d1 = getD1();
  await d1.batch([...settingsSchemaSql, ...statementImportSchemaSql].map((sql) => d1.prepare(sql)));
  return d1;
}

async function analytics(year: string) {
  const d1 = await ensureSchema();
  const [batchesResult, monthlyResult, customerResult, summaryResult, mappingsResult] =
    await Promise.all([
      d1
        .prepare(
          `SELECT id, file_name, file_size, customer, sheet_name, status, source_rows,
                  imported_rows, error_rows, duplicate_rows, imported_by, created_at
           FROM statement_imports ORDER BY created_at DESC LIMIT 20`,
        )
        .all(),
      d1
        .prepare(
          `SELECT CAST(substr(transaction_date, 6, 2) AS INTEGER) AS month,
                  SUM(supply_amount) AS amount, COUNT(*) AS count
           FROM sales_transactions
           WHERE substr(transaction_date, 1, 4) = ?
           GROUP BY substr(transaction_date, 6, 2)
           ORDER BY month`,
        )
        .bind(year)
        .all(),
      d1
        .prepare(
          `SELECT customer, SUM(supply_amount) AS amount, COUNT(*) AS count
           FROM sales_transactions
           WHERE substr(transaction_date, 1, 4) = ?
           GROUP BY customer
           ORDER BY amount DESC LIMIT 10`,
        )
        .bind(year)
        .all(),
      d1
        .prepare(
          `SELECT COALESCE(SUM(supply_amount), 0) AS amount, COUNT(*) AS count
           FROM sales_transactions WHERE substr(transaction_date, 1, 4) = ?`,
        )
        .bind(year)
        .first(),
      d1
        .prepare(
          "SELECT customer, sheet_name, mapping, updated_at FROM customer_excel_mappings ORDER BY customer",
        )
        .all(),
    ]);

  return {
    year,
    summary: {
      amount: Number(summaryResult?.amount ?? 0),
      count: Number(summaryResult?.count ?? 0),
    },
    monthly: monthlyResult.results.map((row: Record<string, unknown>) => ({
      month: Number(row.month),
      amount: Number(row.amount),
      count: Number(row.count),
    })),
    customers: customerResult.results.map((row: Record<string, unknown>) => ({
      customer: String(row.customer),
      amount: Number(row.amount),
      count: Number(row.count),
    })),
    batches: batchesResult.results.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      fileName: String(row.file_name),
      fileSize: Number(row.file_size),
      customer: String(row.customer),
      sheetName: String(row.sheet_name),
      status: String(row.status),
      sourceRows: Number(row.source_rows),
      importedRows: Number(row.imported_rows),
      errorRows: Number(row.error_rows),
      duplicateRows: Number(row.duplicate_rows),
      importedBy: String(row.imported_by),
      createdAt: String(row.created_at),
    })),
    mappings: mappingsResult.results.map((row: Record<string, unknown>) => ({
      customer: String(row.customer),
      sheetName: String(row.sheet_name),
      mapping: JSON.parse(String(row.mapping)),
      updatedAt: String(row.updated_at),
    })),
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const downloadId = url.searchParams.get("download");
    if (downloadId) {
      const d1 = await ensureSchema();
      const batch = await d1
        .prepare("SELECT file_name, file_key FROM statement_imports WHERE id = ?")
        .bind(downloadId)
        .first();
      if (!batch) return Response.json({ error: "가져오기 이력을 찾을 수 없습니다." }, { status: 404 });
      const object = await getFiles().get(String(batch.file_key));
      if (!object) return Response.json({ error: "원본 Excel 파일을 찾을 수 없습니다." }, { status: 404 });
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set(
        "content-disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(String(batch.file_name))}`,
      );
      headers.set("etag", object.httpEtag);
      return new Response(object.body, { headers });
    }

    const year = url.searchParams.get("year")?.match(/^\d{4}$/)?.[0] ?? String(new Date().getFullYear());
    return Response.json(await analytics(year));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Excel 등록 이력을 불러오지 못했습니다.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let batchId = "";
  try {
    const form = await request.formData();
    const file = form.get("file");
    const rawPayload = form.get("payload");
    if (!(file instanceof File) || typeof rawPayload !== "string") {
      return Response.json({ error: "Excel 파일과 등록 정보가 필요합니다." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return Response.json({ error: "현재는 Excel .xlsx 파일만 등록할 수 있습니다." }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return Response.json({ error: "Excel 파일은 최대 20MB까지 등록할 수 있습니다." }, { status: 400 });
    }

    const payload = JSON.parse(rawPayload) as ImportPayload;
    const fallbackCustomer = stringValue(payload.customer, 120);
    const sheetName = stringValue(payload.sheetName, 120);
    if (!fallbackCustomer || !sheetName || !Array.isArray(payload.rows) || !payload.rows.length) {
      return Response.json({ error: "고객사, 시트와 유효한 거래 행이 필요합니다." }, { status: 400 });
    }
    const sourceRows = numberValue(payload.sourceRows ?? payload.rows.length, "원본 행 수");
    const errorRows = numberValue(payload.errorRows ?? 0, "오류 행 수");
    if (payload.rows.length > 5000 || sourceRows > 5000) {
      return Response.json({ error: "한 번에 최대 5,000행까지 등록할 수 있습니다." }, { status: 400 });
    }
    if (errorRows < 0 || sourceRows !== payload.rows.length + errorRows) {
      return Response.json({ error: "Excel 행 집계가 올바르지 않습니다." }, { status: 400 });
    }

    const rows = payload.rows.map((row, index) => normalizeRow(row, fallbackCustomer, index));
    const actor = actorFrom(request);
    const now = new Date().toISOString();
    batchId = `IMP-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const fileName = safeFileName(file.name);
    const fileKey = `statement-imports/${now.slice(0, 7)}/${batchId}/${fileName}`;
    const d1 = await ensureSchema();

    await getFiles().put(fileKey, file.stream(), {
      httpMetadata: {
        contentType:
          file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      customMetadata: { batchId, customer: fallbackCustomer, uploadedBy: actor },
    });

    await d1
      .prepare(
        `INSERT INTO statement_imports (
          id, file_name, file_key, file_size, customer, sheet_name, status,
          source_rows, imported_rows, error_rows, duplicate_rows, imported_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?)`,
      )
      .bind(
        batchId,
        fileName,
        fileKey,
        file.size,
        fallbackCustomer,
        sheetName,
        "processing",
        sourceRows,
        errorRows,
        actor,
        now,
      )
      .run();

    const hashes = await Promise.all(
      rows.map((row, index) =>
        transactionHash(row, payload.allowDuplicates ? `${batchId}:${index}` : ""),
      ),
    );
    let importedRows = 0;
    for (let start = 0; start < rows.length; start += 75) {
      const chunk = rows.slice(start, start + 75);
      const results = await d1.batch(
        chunk.map((row, index) =>
          d1
            .prepare(
              `INSERT OR IGNORE INTO sales_transactions (
                import_id, source_row, transaction_date, customer, item_code, item_name,
                quantity, unit_price, supply_amount, tax_amount, note, source_hash, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              batchId,
              row.sourceRow,
              row.transactionDate,
              row.customer,
              row.itemCode || null,
              row.itemName,
              row.quantity,
              row.unitPrice,
              row.supplyAmount,
              row.taxAmount,
              row.note || null,
              hashes[start + index],
              now,
            ),
        ),
      );
      importedRows += results.reduce(
        (sum: number, result: { meta: { changes?: number } }) =>
          sum + Number(result.meta.changes ?? 0),
        0,
      );
    }

    const duplicateRows = rows.length - importedRows;
    const mapping = Object.fromEntries(
      Object.entries(payload.mapping ?? {}).slice(0, 20).map(([key, value]) => [
        stringValue(key, 50),
        stringValue(value, 120),
      ]),
    );
    await d1.batch([
      d1
        .prepare(
          `UPDATE statement_imports
           SET status = ?, imported_rows = ?, duplicate_rows = ?
           WHERE id = ?`,
        )
        .bind("completed", importedRows, duplicateRows, batchId),
      d1
        .prepare(
          `INSERT INTO customer_excel_mappings (customer, sheet_name, mapping, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(customer) DO UPDATE SET
             sheet_name = excluded.sheet_name,
             mapping = excluded.mapping,
             updated_at = excluded.updated_at`,
        )
        .bind(fallbackCustomer, sheetName, JSON.stringify(mapping), now),
      d1
        .prepare(
          "INSERT INTO audit_logs (section, action, summary, actor, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(
          "statement-import",
          "Excel 거래 등록",
          `${fileName}에서 ${importedRows}건 등록, ${duplicateRows}건 중복 제외`,
          actor,
          now,
        ),
    ]);

    return Response.json(
      {
        batch: {
          id: batchId,
          fileName,
          importedRows,
          duplicateRows,
          errorRows,
        },
        analytics: await analytics(String(new Date().getFullYear())),
      },
      { status: 201 },
    );
  } catch (error) {
    if (batchId) {
      try {
        const d1 = getD1();
        await d1.batch([
          d1.prepare("DELETE FROM sales_transactions WHERE import_id = ?").bind(batchId),
          d1
            .prepare("UPDATE statement_imports SET status = ? WHERE id = ?")
            .bind("failed", batchId),
        ]);
      } catch {
        // Preserve the original import error.
      }
    }
    const message = error instanceof Error ? error.message : "Excel 파일을 등록하지 못했습니다.";
    return Response.json({ error: message }, { status: 400 });
  }
}

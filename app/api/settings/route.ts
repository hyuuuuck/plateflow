import { getD1 } from "../../../db";
import { settingsSchemaSql } from "../../../db/schema";

const defaultSettings = {
  drawingNumber: {
    format: "DWG-{YYMM}-{SEQ}",
    prefix: "DWG",
    sequenceDigits: 3,
    resetCycle: "monthly",
    allowManualOverride: false,
  },
  pricingApproval: {
    changeThreshold: 10,
    amountThreshold: 5000000,
    minimumMargin: 18,
    validityDays: 90,
    requireReason: true,
  },
  statement: {
    supplierName: "도금산업 주식회사",
    businessNumber: "000-00-00000",
    closingDay: "month-end",
    paymentTerm: 30,
    autoIssue: false,
    includeSeal: true,
  },
  alerts: {
    drawingReviewHours: 8,
    deliveryNoticeDays: 2,
    urgentCsImmediate: true,
    approvalReminder: true,
    statementReminder: true,
  },
} as const;

const defaultUsers = [
  { email: "owner@plateflow.local", name: "김관리", role: "관리자", active: true },
  { email: "sales@plateflow.local", name: "이영업", role: "영업", active: true },
  { email: "production@plateflow.local", name: "박생산", role: "생산", active: true },
  { email: "accounting@plateflow.local", name: "최회계", role: "회계", active: true },
];

type SettingsSection = keyof typeof defaultSettings;
type UserInput = { email?: string; name?: string; role?: string; active?: boolean };

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

function isSettingsSection(value: string): value is SettingsSection {
  return Object.hasOwn(defaultSettings, value);
}

function sanitizeObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("설정 값의 형식이 올바르지 않습니다.");
  }
  return value as Record<string, unknown>;
}

function sanitizeUsers(value: unknown) {
  if (!value || typeof value !== "object" || !Array.isArray((value as { users?: unknown }).users)) {
    throw new Error("사용자 목록의 형식이 올바르지 않습니다.");
  }

  const users = (value as { users: UserInput[] }).users.slice(0, 50).map((user) => {
    const email = user.email?.trim().toLowerCase() ?? "";
    const name = user.name?.trim() ?? "";
    const role = user.role?.trim() ?? "";
    if (!email || !email.includes("@") || !name || !["관리자", "영업", "생산", "회계", "조회"].includes(role)) {
      throw new Error("사용자 이름, 이메일 또는 역할을 확인해주세요.");
    }
    return { email, name, role, active: user.active !== false };
  });

  if (!users.some((user) => user.role === "관리자" && user.active)) {
    throw new Error("활성 관리자 계정이 최소 1명 필요합니다.");
  }
  return users;
}

async function ensureSchema() {
  const d1 = getD1();
  await d1.batch(settingsSchemaSql.map((sql) => d1.prepare(sql)));

  const now = new Date().toISOString();
  await d1.batch([
    ...Object.entries(defaultSettings).map(([key, value]) =>
      d1
        .prepare(
          "INSERT OR IGNORE INTO system_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)",
        )
        .bind(key, JSON.stringify(value), now, "system"),
    ),
    ...defaultUsers.map((user) =>
      d1
        .prepare(
          "INSERT OR IGNORE INTO app_users (email, name, role, active, updated_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(user.email, user.name, user.role, user.active ? 1 : 0, now),
    ),
  ]);
  return d1;
}

async function readState() {
  const d1 = await ensureSchema();
  const [settingsResult, usersResult, logsResult] = await Promise.all([
    d1.prepare("SELECT key, value, updated_at, updated_by FROM system_settings ORDER BY key").all(),
    d1.prepare("SELECT email, name, role, active, updated_at FROM app_users ORDER BY role, name").all(),
    d1
      .prepare(
        "SELECT id, section, action, summary, actor, created_at FROM audit_logs ORDER BY id DESC LIMIT 50",
      )
      .all(),
  ]);

  const settings = Object.fromEntries(
    settingsResult.results.map((row) => [String(row.key), JSON.parse(String(row.value))]),
  );
  const users = usersResult.results.map((row) => ({
    email: String(row.email),
    name: String(row.name),
    role: String(row.role),
    active: Boolean(row.active),
    updatedAt: String(row.updated_at),
  }));
  const logs = logsResult.results.map((row) => ({
    id: Number(row.id),
    section: String(row.section),
    action: String(row.action),
    summary: String(row.summary),
    actor: String(row.actor),
    createdAt: String(row.created_at),
  }));

  return { settings, users, logs };
}

export async function GET() {
  try {
    return Response.json(await readState());
  } catch (error) {
    const message = error instanceof Error ? error.message : "설정을 불러오지 못했습니다.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as {
      section?: string;
      values?: unknown;
    };
    const section = payload.section?.trim() ?? "";
    const actor = actorFrom(request);
    const now = new Date().toISOString();
    const d1 = await ensureSchema();

    if (section === "users") {
      const users = sanitizeUsers(payload.values);
      const statements = [
        d1.prepare("DELETE FROM app_users"),
        ...users.map((user) =>
          d1
            .prepare(
              "INSERT INTO app_users (email, name, role, active, updated_at) VALUES (?, ?, ?, ?, ?)",
            )
            .bind(user.email, user.name, user.role, user.active ? 1 : 0, now),
        ),
        d1
          .prepare(
            "INSERT INTO audit_logs (section, action, summary, actor, created_at) VALUES (?, ?, ?, ?, ?)",
          )
          .bind("users", "권한 변경", `${users.length}명의 사용자·권한을 저장`, actor, now),
      ];
      await d1.batch(statements);
    } else {
      if (!isSettingsSection(section)) {
        return Response.json({ error: "지원하지 않는 설정 항목입니다." }, { status: 400 });
      }
      const values = sanitizeObject(payload.values);
      const merged = { ...defaultSettings[section], ...values };
      await d1.batch([
        d1
          .prepare(
            `INSERT INTO system_settings (key, value, updated_at, updated_by)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
          )
          .bind(section, JSON.stringify(merged), now, actor),
        d1
          .prepare(
            "INSERT INTO audit_logs (section, action, summary, actor, created_at) VALUES (?, ?, ?, ?, ?)",
          )
          .bind(section, "설정 변경", `${section} 설정을 저장`, actor, now),
      ]);
    }

    return Response.json(await readState());
  } catch (error) {
    const message = error instanceof Error ? error.message : "설정을 저장하지 못했습니다.";
    return Response.json({ error: message }, { status: 400 });
  }
}

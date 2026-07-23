import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("builds the Korean operations dashboard and settings API", async () => {
  const [dashboard, layout, settingsRoute] = await Promise.all([
    readFile(new URL("../app/DashboardApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/settings/route.ts", import.meta.url), "utf8"),
    access(new URL("../dist/server/index.js", import.meta.url)),
  ]);

  assert.match(layout, /lang="ko"/i);
  assert.match(layout, /도면부터 거래명세서까지/);
  assert.match(dashboard, /오늘 처리할 업무/);
  assert.match(dashboard, /도면 등록/);
  assert.match(dashboard, /거래명세서/);
  assert.match(dashboard, /CS·클레임/);
  assert.match(dashboard, /도면번호 규칙/);
  assert.match(settingsRoute, /system_settings/);
  assert.match(settingsRoute, /audit_logs/);
  assert.doesNotMatch(dashboard, /Your site is taking shape/);
});

test("ships the drawing and pricing workflows with social metadata", async () => {
  const [dashboard, css, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/DashboardApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(dashboard, /function DashboardApp/);
  assert.match(dashboard, /새 도면 등록/);
  assert.match(dashboard, /단가 승인/);
  assert.match(dashboard, /발급 처리/);
  assert.match(dashboard, /처리 완료/);
  assert.match(css, /min-width:\s*1000px/);
  assert.match(layout, /openGraph:/);
  assert.match(layout, /twitter:/);
  assert.match(layout, /url:\s*"\/og\.png"/);
  assert.match(packageJson, /"name": "drawing-operations-system"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

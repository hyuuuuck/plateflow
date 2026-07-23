import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Korean operations dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="ko">/i);
  assert.match(
    html,
    /<title>업무 대시보드 · 도면·거래 통합 업무시스템<\/title>/i,
  );
  assert.match(html, /도면부터 거래명세서까지/);
  assert.match(html, /오늘 처리할 업무/);
  assert.match(html, /도면 등록/);
  assert.match(html, /거래명세서/);
  assert.match(html, /CS·클레임/);
  assert.doesNotMatch(html, /Your site is taking shape/);
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

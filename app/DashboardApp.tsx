"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import readExcelFile from "read-excel-file/browser";

type Page =
  | "dashboard"
  | "drawings"
  | "pricing"
  | "orders"
  | "statements"
  | "sales"
  | "cs"
  | "customers"
  | "settings";

type Drawing = {
  id: string;
  name: string;
  customer: string;
  revision: string;
  material: string;
  process: string;
  status: "검토 필요" | "단가 승인" | "승인 완료" | "인식 중";
  confidence: number;
  unitPrice: number;
  updatedAt: string;
};

const navigation: Array<{
  label?: string;
  items: Array<{ page: Page; name: string; icon: string; count?: number }>;
}> = [
  { items: [{ page: "dashboard", name: "오늘의 업무", icon: "⌂" }] },
  {
    label: "업무",
    items: [
      { page: "drawings", name: "도면·품목", icon: "▱", count: 12 },
      { page: "pricing", name: "단가·견적", icon: "₩", count: 4 },
      { page: "orders", name: "주문·납품", icon: "▦" },
      { page: "statements", name: "거래명세서", icon: "▤", count: 8 },
    ],
  },
  {
    label: "관리",
    items: [
      { page: "sales", name: "매출 분석", icon: "↗" },
      { page: "cs", name: "CS·클레임", icon: "◎", count: 5 },
      { page: "customers", name: "고객사", icon: "♙" },
    ],
  },
  { items: [{ page: "settings", name: "시스템 설정", icon: "⚙" }] },
];

const pageInfo: Record<Page, { title: string; description: string }> = {
  dashboard: {
    title: "오늘 처리할 업무",
    description: "승인이 필요한 항목과 납품 일정을 먼저 확인하세요.",
  },
  drawings: {
    title: "도면·품목",
    description: "원본 도면과 리비전, 품목 정보를 한 곳에서 관리합니다.",
  },
  pricing: {
    title: "단가·견적",
    description: "산정 근거, 적용 기간과 승인 이력을 관리합니다.",
  },
  orders: {
    title: "주문·납품",
    description: "입고부터 작업, 출고와 납품까지 진행 상태를 추적합니다.",
  },
  statements: {
    title: "거래명세서",
    description: "확정 납품 건을 기준으로 명세서를 발급합니다.",
  },
  sales: {
    title: "매출 분석",
    description: "고객사와 공정별 매출을 원본 거래까지 추적합니다.",
  },
  cs: {
    title: "CS·클레임",
    description: "문의와 품질 이슈를 관련 도면·납품 건에 연결합니다.",
  },
  customers: {
    title: "고객사",
    description: "거래 조건, 등록 도면, 매출과 상담 이력을 관리합니다.",
  },
  settings: {
    title: "시스템 설정",
    description: "도면번호, 단가 승인과 명세서 발급 기준을 관리합니다.",
  },
};

const seedDrawings: Drawing[] = [
  {
    id: "DWG-2607-041",
    name: "브라켓 A",
    customer: "대한정밀",
    revision: "R2",
    material: "SPCC",
    process: "3가 아연",
    status: "검토 필요",
    confidence: 87,
    unitPrice: 1850,
    updatedAt: "오늘 10:42",
  },
  {
    id: "HB-2407-118",
    name: "모터 하우징",
    customer: "한빛테크",
    revision: "R4",
    material: "AL6061",
    process: "백색 아노다이징",
    status: "단가 승인",
    confidence: 96,
    unitPrice: 4280,
    updatedAt: "오늘 09:18",
  },
  {
    id: "SJ-8821",
    name: "샤프트 고정링",
    customer: "세진산업",
    revision: "R1",
    material: "S45C",
    process: "무전해 니켈",
    status: "승인 완료",
    confidence: 98,
    unitPrice: 920,
    updatedAt: "어제",
  },
  {
    id: "KM-3108",
    name: "커넥터 플레이트",
    customer: "국민모터스",
    revision: "R0",
    material: "SUS304",
    process: "전해연마",
    status: "검토 필요",
    confidence: 79,
    unitPrice: 0,
    updatedAt: "어제",
  },
  {
    id: "DWG-2607-038",
    name: "센서 커버",
    customer: "유신전자",
    revision: "R3",
    material: "AL5052",
    process: "흑색 아노다이징",
    status: "승인 완료",
    confidence: 95,
    unitPrice: 2360,
    updatedAt: "7월 21일",
  },
];

const orders = [
  ["PO-2607-184", "대한정밀", "브라켓 A 외 2건", 4380000, "07.25", "작업 중"],
  ["PO-2607-176", "한빛테크", "모터 하우징", 8560000, "07.24", "출고 준비"],
  ["PO-2607-169", "세진산업", "샤프트 고정링", 1840000, "07.23", "납품 완료"],
  ["PO-2607-161", "유신전자", "센서 커버 외 4건", 7920000, "07.28", "입고 완료"],
] as const;

const seedStatements = [
  {
    id: "TS-202607-0184",
    customer: "대한정밀",
    target: "2026.07.22 납품분",
    amount: 4380000,
    status: "미발급",
    issuedAt: "-",
  },
  {
    id: "TS-202607-0176",
    customer: "한빛테크",
    target: "2026.07.21 납품분",
    amount: 8560000,
    status: "발급 완료",
    issuedAt: "2026.07.22",
  },
  {
    id: "TS-202607-0169",
    customer: "세진산업",
    target: "2026.07.20 납품분",
    amount: 1840000,
    status: "발급 완료",
    issuedAt: "2026.07.21",
  },
];

const seedTickets = [
  { id: "CS-1042", type: "품질", title: "도금 표면 얼룩 확인 요청", customer: "대한정밀", status: "신규", elapsed: "32분" },
  { id: "CS-1039", type: "납기", title: "금주 납품 가능 여부", customer: "한빛테크", status: "답변 대기", elapsed: "1시간" },
  { id: "CS-1036", type: "명세서", title: "거래명세서 재발급", customer: "세진산업", status: "처리 중", elapsed: "3시간" },
  { id: "CS-1032", type: "견적", title: "신규 도면 견적 요청", customer: "유신전자", status: "처리 완료", elapsed: "어제" },
];

const customers = [
  ["대한정밀", "이준호", "월말 마감 · 익월 15일", 86, 128400000],
  ["한빛테크", "최서윤", "건별 결제", 42, 91200000],
  ["세진산업", "박민수", "월말 마감 · 익월 말일", 31, 76400000],
  ["유신전자", "김혜진", "월 2회 마감", 54, 68800000],
] as const;

const monthlySales = [52, 59, 62, 68, 72, 83, 86];

type ConfigSection = "drawingNumber" | "pricingApproval" | "statement" | "alerts";
type SettingsSection = ConfigSection | "users" | "audit";
type SettingsState = {
  drawingNumber: {
    format: string;
    prefix: string;
    sequenceDigits: number;
    resetCycle: string;
    allowManualOverride: boolean;
  };
  pricingApproval: {
    changeThreshold: number;
    amountThreshold: number;
    minimumMargin: number;
    validityDays: number;
    requireReason: boolean;
  };
  statement: {
    supplierName: string;
    businessNumber: string;
    closingDay: string;
    paymentTerm: number;
    autoIssue: boolean;
    includeSeal: boolean;
  };
  alerts: {
    drawingReviewHours: number;
    deliveryNoticeDays: number;
    urgentCsImmediate: boolean;
    approvalReminder: boolean;
    statementReminder: boolean;
  };
};
type AppUser = {
  email: string;
  name: string;
  role: string;
  active: boolean;
  updatedAt?: string;
};
type AuditLog = {
  id: number;
  section: string;
  action: string;
  summary: string;
  actor: string;
  createdAt: string;
};
type StatementImportBatch = {
  id: string;
  fileName: string;
  fileSize: number;
  customer: string;
  sheetName: string;
  status: string;
  sourceRows: number;
  importedRows: number;
  errorRows: number;
  duplicateRows: number;
  importedBy: string;
  createdAt: string;
};
type StatementImportAnalytics = {
  year: string;
  summary: { amount: number; count: number };
  monthly: Array<{ month: number; amount: number; count: number }>;
  customers: Array<{ customer: string; amount: number; count: number }>;
  batches: StatementImportBatch[];
  mappings: Array<{
    customer: string;
    sheetName: string;
    mapping: Record<string, string>;
    updatedAt: string;
  }>;
};
type ExcelMappingKey =
  | "transactionDate"
  | "customer"
  | "itemCode"
  | "itemName"
  | "quantity"
  | "unitPrice"
  | "supplyAmount"
  | "taxAmount"
  | "note";
type ExcelMapping = Record<ExcelMappingKey, string>;
type ParsedImportRow = {
  sourceRow: number;
  transactionDate: string;
  customer: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  supplyAmount: number;
  taxAmount: number;
  note: string;
};

const defaultSettings: SettingsState = {
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
};

function won(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function nextDrawingNumber(config: SettingsState["drawingNumber"], sequence: number) {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const paddedSequence = String(sequence).padStart(config.sequenceDigits, "0");
  return config.format
    .replaceAll("{PREFIX}", config.prefix)
    .replaceAll("{YYMM}", `${year}${month}`)
    .replaceAll("{YY}", year)
    .replaceAll("{MM}", month)
    .replaceAll("{SEQ}", paddedSequence);
}

function Status({ children }: { children: string }) {
  const tone =
    /완료/.test(children)
      ? "green"
      : /긴급|실패/.test(children)
        ? "red"
        : /검토|미발급|답변/.test(children)
          ? "amber"
          : /승인|출고/.test(children)
            ? "blue"
            : "gray";
  return <span className={`status ${tone}`}>{children}</span>;
}

export default function DashboardApp() {
  const [page, setPage] = useState<Page>("dashboard");
  const [drawings, setDrawings] = useState(seedDrawings);
  const [statements, setStatements] = useState(seedStatements);
  const [tickets, setTickets] = useState(seedTickets);
  const [selectedDrawing, setSelectedDrawing] = useState<string | null>(null);
  const [selectedPrice, setSelectedPrice] = useState("HB-2407-118");
  const [selectedStatement, setSelectedStatement] = useState("TS-202607-0184");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("전체");
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState("");
  const [operationalSettings, setOperationalSettings] = useState<SettingsState>(defaultSettings);
  const searchRef = useRef<HTMLInputElement>(null);

  const currentDrawing = drawings.find((item) => item.id === selectedDrawing);
  const priceDrawing = drawings.find((item) => item.id === selectedPrice) ?? drawings[0];
  const statement = statements.find((item) => item.id === selectedStatement) ?? statements[0];

  const filteredDrawings = useMemo(() => {
    const needle = query.toLowerCase().trim();
    return drawings.filter((drawing) => {
      const searchable = [drawing.id, drawing.name, drawing.customer, drawing.material, drawing.process]
        .join(" ")
        .toLowerCase();
      return (!needle || searchable.includes(needle)) && (filter === "전체" || drawing.status === filter);
    });
  }, [drawings, filter, query]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") setModal(false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    void fetch("/api/settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((body: { settings?: Partial<SettingsState> } | null) => {
        if (!body?.settings) return;
        setOperationalSettings({
          drawingNumber: { ...defaultSettings.drawingNumber, ...body.settings.drawingNumber },
          pricingApproval: { ...defaultSettings.pricingApproval, ...body.settings.pricingApproval },
          statement: { ...defaultSettings.statement, ...body.settings.statement },
          alerts: { ...defaultSettings.alerts, ...body.settings.alerts },
        });
      })
      .catch(() => undefined);
  }, []);

  function announce(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function navigate(next: Page) {
    setPage(next);
    setSelectedDrawing(null);
  }

  function approve(id: string) {
    setDrawings((items) =>
      items.map((item) => (item.id === id ? { ...item, status: "승인 완료" as const } : item)),
    );
    announce("단가가 승인되고 변경 이력이 저장되었습니다.");
  }

  function issueStatement(id: string) {
    setStatements((items) =>
      items.map((item) =>
        item.id === id ? { ...item, status: "발급 완료", issuedAt: "2026.07.23" } : item,
      ),
    );
    announce("거래명세서가 발급 처리되었습니다.");
  }

  function addDrawing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = nextDrawingNumber(operationalSettings.drawingNumber, drawings.length + 42);
    const item: Drawing = {
      id,
      name: String(form.get("name") || "신규 품목"),
      customer: String(form.get("customer") || "미지정"),
      revision: "R0",
      material: String(form.get("material") || "확인 필요"),
      process: String(form.get("process") || "확인 필요"),
      status: "인식 중",
      confidence: 0,
      unitPrice: 0,
      updatedAt: "방금",
    };
    setDrawings((items) => [item, ...items]);
    setModal(false);
    announce("도면이 등록되어 인식 대기열에 추가되었습니다.");
    window.setTimeout(() => {
      setDrawings((items) =>
        items.map((drawing) =>
          drawing.id === id ? { ...drawing, status: "검토 필요" as const, confidence: 82 } : drawing,
        ),
      );
    }, 1600);
  }

  const info = pageInfo[page];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="workspace">
          <span className="workspace-logo">D</span>
          <div><strong>도금 업무시스템</strong><small>내부 운영 워크스페이스</small></div>
          <button type="button" aria-label="워크스페이스 메뉴">···</button>
        </div>
        <nav aria-label="주요 메뉴">
          {navigation.map((group, index) => (
            <div className="nav-group" key={group.label ?? index}>
              {group.label && <p>{group.label}</p>}
              {group.items.map((item) => (
                <button
                  type="button"
                  key={item.page}
                  className={page === item.page ? "nav-item active" : "nav-item"}
                  onClick={() => navigate(item.page)}
                >
                  <span>{item.icon}</span><b>{item.name}</b>
                  {item.count && <i>{item.count}</i>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="user">
          <span>김</span><div><strong>김관리</strong><small>관리자</small></div><i />
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div className="breadcrumb">업무시스템 <span>/</span> <b>{currentDrawing?.id ?? info.title}</b></div>
          <div className="top-actions">
            <label className="search">
              <span>⌕</span>
              <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="도면, 고객사, 품목 검색" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button" type="button" aria-label="알림" onClick={() => announce("새로운 알림이 없습니다.")}>♧</button>
            <button className="primary small" type="button" onClick={() => setModal(true)}>＋ 도면 등록</button>
          </div>
        </header>

        <div className="content">
          {currentDrawing ? (
            <DrawingDetail
              drawing={currentDrawing}
              onBack={() => setSelectedDrawing(null)}
              onApprove={() => approve(currentDrawing.id)}
              onUpdate={(updated) => setDrawings((items) => items.map((item) => item.id === updated.id ? updated : item))}
            />
          ) : (
            <>
              <div className="page-head">
                <div>
                  <small>{page === "dashboard" ? "2026년 7월 23일 목요일" : "도금 업무시스템"}</small>
                  <h1>{info.title}</h1>
                  <p>{info.description}</p>
                </div>
                {page === "drawings" && <button className="primary" onClick={() => setModal(true)}>＋ 새 도면 등록</button>}
              </div>

              {page === "dashboard" && <Dashboard drawings={drawings} alerts={operationalSettings.alerts} onNavigate={navigate} onOpen={setSelectedDrawing} />}
              {page === "drawings" && <DrawingList drawings={filteredDrawings} filter={filter} onFilter={setFilter} onOpen={setSelectedDrawing} />}
              {page === "pricing" && <Pricing drawings={drawings} selected={priceDrawing} approvalConfig={operationalSettings.pricingApproval} onSelect={setSelectedPrice} onApprove={approve} />}
              {page === "orders" && <Orders />}
              {page === "statements" && <Statements items={statements} selected={statement} config={operationalSettings.statement} onSelect={setSelectedStatement} onIssue={issueStatement} onAnnounce={announce} />}
              {page === "sales" && <Sales />}
              {page === "cs" && <CS items={tickets} onComplete={(id) => { setTickets((items) => items.map((item) => item.id === id ? { ...item, status: "처리 완료" } : item)); announce("CS 항목을 처리 완료했습니다."); }} />}
              {page === "customers" && <Customers />}
              {page === "settings" && <Settings onAnnounce={announce} onSettingsSaved={setOperationalSettings} />}
            </>
          )}
        </div>
      </main>

      {modal && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-drawing">
            <div className="modal-head"><div><small>신규 접수</small><h2 id="new-drawing">도면 등록</h2></div><button className="icon-button" onClick={() => setModal(false)}>×</button></div>
            <form onSubmit={addDrawing}>
              <label className="field"><span>도면 원본</span><input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg" required /><small>PDF, PNG, JPG · 원본 파일 권장</small></label>
              <div className="form-grid">
                <label className="field"><span>고객사</span><select name="customer" defaultValue="" required><option value="" disabled>선택하세요</option>{customers.map((item) => <option key={item[0]}>{item[0]}</option>)}</select></label>
                <label className="field"><span>품명</span><input name="name" placeholder="예: 브라켓 A" required /></label>
                <label className="field"><span>재질</span><input name="material" placeholder="OCR 자동 인식" /></label>
                <label className="field"><span>도금·공정</span><input name="process" placeholder="OCR 자동 인식" /></label>
              </div>
              <label className="check"><input type="checkbox" defaultChecked /> 기밀 도면으로 분류하고 다운로드 권한을 제한합니다.</label>
              <div className="modal-actions"><button className="secondary" type="button" onClick={() => setModal(false)}>취소</button><button className="primary" type="submit">등록 및 분석 요청</button></div>
            </form>
          </section>
        </div>
      )}
      {toast && <div className="toast" aria-live="polite"><span>✓</span>{toast}</div>}
    </div>
  );
}

function Dashboard({ drawings, alerts, onNavigate, onOpen }: { drawings: Drawing[]; alerts: SettingsState["alerts"]; onNavigate: (page: Page) => void; onOpen: (id: string) => void }) {
  const cards: Array<[string, string, string, string, Page]> = [
    ["▱", "도면 검토 대기", "12", `${alerts.drawingReviewHours}시간 초과 · 인식 실패 2건`, "drawings"],
    ["₩", "단가 승인 대기", "4", "오늘 요청 3건", "pricing"],
    ["▤", "명세서 미발급", "8", "이번 달 납품분", "statements"],
    ["◎", "CS 미처리", "5", alerts.urgentCsImmediate ? "긴급 1건 · 즉시 알림" : "긴급 1건", "cs"],
  ];
  return (
    <>
      <div className="metrics">
        {cards.map(([icon, label, value, note, target], index) => (
          <button type="button" className={`metric tone-${index}`} key={label} onClick={() => onNavigate(target)}>
            <span>{icon}</span><small>{label}</small><strong>{value}</strong><i>{note}</i>
          </button>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <SectionHead title="우선 검토할 도면" description="낮은 인식 신뢰도와 신규 단가 요청을 우선 정렬했습니다." action={<button className="link-button" onClick={() => onNavigate("drawings")}>전체 보기 →</button>} />
          <table><thead><tr><th>도면·품목</th><th>고객사</th><th>상태</th><th>신뢰도</th></tr></thead>
            <tbody>{drawings.slice(0, 4).map((drawing) => (
              <tr className="clickable" key={drawing.id} onClick={() => onOpen(drawing.id)}>
                <td><Record title={drawing.name} subtitle={`${drawing.id} · ${drawing.revision}`} /></td>
                <td>{drawing.customer}</td><td><Status>{drawing.status}</Status></td>
                <td className={drawing.confidence < 85 ? "confidence low" : "confidence"}>{drawing.confidence || "-"}%</td>
              </tr>
            ))}</tbody>
          </table>
        </section>
        <aside className="rail">
          <section className="panel">
            <SectionHead title="오늘 납품" description="7월 23일 · 3건" />
            <ol className="timeline">
              {[
                ["09:30", "세진산업", "샤프트 고정링 · 2,000EA"],
                ["13:00", "대한정밀", "브라켓 A 외 2건"],
                ["16:30", "한빛테크", "모터 하우징 · 500EA"],
              ].map(([time, company, item]) => <li key={time}><time>{time}</time><div><strong>{company}</strong><p>{item}</p></div></li>)}
            </ol>
          </section>
          <section className="quick"><small>빠른 작업</small><button onClick={() => onNavigate("pricing")}>단가 승인하기 <b>4</b></button><button onClick={() => onNavigate("statements")}>명세서 발급하기 <b>8</b></button></section>
        </aside>
      </div>
    </>
  );
}

function DrawingList({ drawings, filter, onFilter, onOpen }: { drawings: Drawing[]; filter: string; onFilter: (value: string) => void; onOpen: (id: string) => void }) {
  return (
    <section className="panel">
      <div className="list-tools"><div className="tabs">{["전체", "검토 필요", "단가 승인", "승인 완료", "인식 중"].map((item) => <button className={filter === item ? "active" : ""} onClick={() => onFilter(item)} key={item}>{item}</button>)}</div><button className="secondary compact">↓ 엑셀</button></div>
      <table><thead><tr><th>도면번호 / 품명</th><th>고객사</th><th>리비전</th><th>재질</th><th>도금·공정</th><th className="number">단가</th><th>상태</th><th>수정일</th></tr></thead>
        <tbody>{drawings.map((drawing) => (
          <tr className="clickable" key={drawing.id} onClick={() => onOpen(drawing.id)}>
            <td><Record title={drawing.name} subtitle={drawing.id} /></td><td>{drawing.customer}</td><td>{drawing.revision}</td><td>{drawing.material}</td><td>{drawing.process}</td>
            <td className="number">{drawing.unitPrice ? won(drawing.unitPrice) : "-"}</td><td><Status>{drawing.status}</Status></td><td className="muted">{drawing.updatedAt}</td>
          </tr>
        ))}</tbody>
      </table>
      {!drawings.length && <div className="empty"><span>⌕</span><strong>검색 결과가 없습니다.</strong><p>다른 도면번호, 고객사 또는 품명으로 검색해 보세요.</p></div>}
    </section>
  );
}

function DrawingDetail({ drawing, onBack, onApprove, onUpdate }: { drawing: Drawing; onBack: () => void; onApprove: () => void; onUpdate: (drawing: Drawing) => void }) {
  return (
    <>
      <button className="back" onClick={onBack}>← 도면 목록</button>
      <div className="detail-head">
        <div className="detail-title"><span className="page-icon">▱</span><div><h1>{drawing.name} <Status>{drawing.status}</Status></h1><p>{drawing.id} · {drawing.customer} · Revision {drawing.revision}</p></div></div>
        <div><button className="secondary">변경 이력</button><button className="primary" onClick={onApprove}>재인증 후 승인</button></div>
      </div>
      <div className="detail-grid">
        <section className="panel document">
          <div className="document-tools"><span>원본 도면 · {drawing.id}.pdf</span><div><button>−</button><span>100%</span><button>＋</button><button>다운로드</button></div></div>
          <div className="drawing-canvas"><div className="drawing-sheet">
            <div className="drawing-code">{drawing.id}<small>{drawing.name}</small></div>
            <div className="shape wide" /><div className="shape tall" /><div className="hole one" /><div className="hole two" />
            <div className="dim top">235.0</div><div className="dim left">149.0</div>
            <div className="drawing-spec"><span>MATERIAL</span><b>{drawing.material}</b><span>FINISH</span><b>{drawing.process}</b></div>
          </div></div>
        </section>
        <aside className="detail-side">
          <section className="panel properties">
            <SectionHead title="인식 결과" description="원본과 대조해 필요한 항목만 수정하세요." action={<b className={drawing.confidence < 85 ? "score low" : "score"}>{drawing.confidence}% 일치</b>} />
            <div className="property-list">
              <Property label="도면번호"><input value={drawing.id} readOnly /></Property>
              <Property label="리비전"><input value={drawing.revision} onChange={(e) => onUpdate({ ...drawing, revision: e.target.value })} /></Property>
              <Property label="재질"><input value={drawing.material} onChange={(e) => onUpdate({ ...drawing, material: e.target.value })} /></Property>
              <Property label="도금·공정"><input value={drawing.process} onChange={(e) => onUpdate({ ...drawing, process: e.target.value })} /></Property>
              <Property label="계산 면적"><input defaultValue="0.182㎡" /></Property>
              <Property label="형상 난이도"><select defaultValue="보통"><option>낮음</option><option>보통</option><option>높음</option></select></Property>
            </div>
          </section>
          <section className="price-box"><div><span>추천 단가</span><strong>{drawing.unitPrice ? won(drawing.unitPrice) : "산정 대기"}</strong></div><dl><div><dt>기본 공정비</dt><dd>1,200원</dd></div><div><dt>면적 보정</dt><dd>420원</dd></div><div><dt>형상·난이도</dt><dd>230원</dd></div></dl></section>
        </aside>
      </div>
      <section className="panel related"><SectionHead title="유사 도면" description="형상과 공정 조건이 가까운 기존 거래입니다." /><div>
        {[["브라켓 B", "DWG-2504-118", "92%", "1,780원"], ["고정 브라켓", "DJ-8821-R1", "86%", "1,920원"], ["센서 브라켓", "DWG-2409-034", "81%", "1,680원"]].map((item) => <button key={item[1]}><span>▱</span><div><strong>{item[0]}</strong><small>{item[1]}</small></div><div><b>{item[2]}</b><small>{item[3]}</small></div></button>)}
      </div></section>
    </>
  );
}

function Pricing({ drawings, selected, approvalConfig, onSelect, onApprove }: { drawings: Drawing[]; selected: Drawing; approvalConfig: SettingsState["pricingApproval"]; onSelect: (id: string) => void; onApprove: (id: string) => void }) {
  const pending = drawings.filter((item) => item.status === "검토 필요" || item.status === "단가 승인");
  return (
    <div className="split">
      <section className="panel">
        <div className="list-tools"><div className="tabs"><button className="active">승인 대기 {pending.length}</button><button>전체 단가</button><button>변경 이력</button></div></div>
        <table><thead><tr><th>도면·품목</th><th>고객사</th><th className="number">기존 단가</th><th className="number">추천 단가</th><th>상태</th></tr></thead><tbody>
          {pending.map((item) => <tr className={`clickable ${item.id === selected.id ? "selected" : ""}`} onClick={() => onSelect(item.id)} key={item.id}><td><Record title={item.name} subtitle={item.id} /></td><td>{item.customer}</td><td className="number">{item.unitPrice ? won(item.unitPrice - 120) : "-"}</td><td className="number strong">{item.unitPrice ? won(item.unitPrice) : "산정 필요"}</td><td><Status>{item.status}</Status></td></tr>)}
        </tbody></table>
      </section>
      <aside className="panel approval">
        <div className="approval-title"><span className="page-icon small">₩</span><div><h2>{selected.name}</h2><p>{selected.id} · {selected.customer}</p></div></div>
        <div className="total"><span>추천 단가</span><strong>{selected.unitPrice ? won(selected.unitPrice) : "산정 필요"}</strong><small>수량 500EA 기준 · 부가세 별도</small></div>
        <dl className="breakdown"><div><dt>기본 공정비</dt><dd>1,200원</dd></div><div><dt>표면적 0.182㎡</dt><dd>420원</dd></div><div><dt>형상·도금 난이도</dt><dd>230원</dd></div></dl>
        <div className="approval-policy"><span>현재 승인 기준</span><strong>변경 {approvalConfig.changeThreshold}% 이상 · 총액 {Math.round(approvalConfig.amountThreshold / 10000).toLocaleString()}만원 이상</strong><small>목표 마진 {approvalConfig.minimumMargin}% · 단가 유효기간 {approvalConfig.validityDays}일</small></div>
        <label className="field"><span>최종 적용 단가</span><input defaultValue={selected.unitPrice ? selected.unitPrice.toLocaleString() : ""} /></label>
        <label className="field"><span>승인 사유 {approvalConfig.requireReason ? "· 필수" : "· 선택"}</span><textarea rows={3} required={approvalConfig.requireReason} defaultValue="신규 도면 기준단가 적용" /></label>
        <div className="two-actions"><button className="secondary">보류</button><button className="primary" onClick={() => onApprove(selected.id)}>단가 승인</button></div>
      </aside>
    </div>
  );
}

function Orders() {
  return (
    <>
      <div className="workflow">{[["입고 대기", 6], ["입고 완료", 12], ["작업 중", 18], ["출고 준비", 5], ["납품 완료", 34]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <section className="panel"><div className="list-tools"><div className="tabs"><button className="active">진행 중</button><button>납품 완료</button><button>전체</button></div><button className="primary compact">＋ 주문 등록</button></div>
        <table><thead><tr><th>주문번호</th><th>고객사</th><th>품목</th><th className="number">공급가액</th><th>납품 예정일</th><th>진행 상태</th></tr></thead><tbody>{orders.map((order) => <tr key={order[0]}><td><button className="link-button">{order[0]}</button></td><td>{order[1]}</td><td>{order[2]}</td><td className="number">{won(order[3])}</td><td>2026.{order[4]}</td><td><Status>{order[5]}</Status></td></tr>)}</tbody></table>
      </section>
    </>
  );
}

function Statements({ items, selected, config, onSelect, onIssue, onAnnounce }: { items: typeof seedStatements; selected: (typeof seedStatements)[number]; config: SettingsState["statement"]; onSelect: (id: string) => void; onIssue: (id: string) => void; onAnnounce: (message: string) => void }) {
  const [mode, setMode] = useState<"statements" | "imports">("statements");
  const [showImport, setShowImport] = useState(false);
  const [analytics, setAnalytics] = useState<StatementImportAnalytics | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  async function loadImports() {
    try {
      const response = await fetch("/api/statement-imports", { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json() as StatementImportAnalytics;
      setAnalytics(body);
      setSelectedBatchId((current) => current ?? body.batches[0]?.id ?? null);
    } catch {
      // Excel history is supplementary to the existing statement list.
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadImports(), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const selectedBatch = analytics?.batches.find((batch) => batch.id === selectedBatchId) ?? analytics?.batches[0];

  return (
    <>
      {analytics && analytics.batches.length > 0 && (
        <div className="import-summary">
          <div><small>Excel 등록 누계</small><strong>{analytics.summary.count.toLocaleString()}건</strong></div>
          <div><small>등록 공급가액</small><strong>{won(analytics.summary.amount)}</strong></div>
          <div><small>최근 등록</small><strong>{analytics.batches[0].customer}</strong><span>{analytics.batches[0].fileName}</span></div>
        </div>
      )}
      <div className="split statements">
        <section className="panel">
          <div className="list-tools">
            <div className="tabs">
              <button className={mode === "statements" ? "active" : ""} onClick={() => setMode("statements")}>거래명세서</button>
              <button className={mode === "imports" ? "active" : ""} onClick={() => setMode("imports")}>Excel 등록 이력 {analytics?.batches.length || ""}</button>
            </div>
            <button className="primary compact" onClick={() => setShowImport(true)}>↑ Excel 가져오기</button>
          </div>
          {mode === "statements" ? (
            <table><thead><tr><th>명세서 번호</th><th>고객사</th><th>대상</th><th className="number">공급가액</th><th>상태</th></tr></thead><tbody>{items.map((item) => <tr className={`clickable ${item.id === selected.id ? "selected" : ""}`} onClick={() => onSelect(item.id)} key={item.id}><td><button className="link-button">{item.id}</button></td><td>{item.customer}</td><td>{item.target}</td><td className="number">{won(item.amount)}</td><td><Status>{item.status}</Status></td></tr>)}</tbody></table>
          ) : analytics?.batches.length ? (
            <table><thead><tr><th>파일 / 등록번호</th><th>고객사</th><th>시트</th><th>등록 결과</th><th>등록일</th></tr></thead><tbody>{analytics.batches.map((batch) => <tr className={`clickable ${batch.id === selectedBatch?.id ? "selected" : ""}`} onClick={() => setSelectedBatchId(batch.id)} key={batch.id}><td><Record title={batch.fileName} subtitle={batch.id} /></td><td>{batch.customer}</td><td>{batch.sheetName}</td><td><Status>{batch.status === "completed" ? "등록 완료" : batch.status === "failed" ? "등록 실패" : "처리 중"}</Status></td><td className="muted">{new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(batch.createdAt))}</td></tr>)}</tbody></table>
          ) : (
            <div className="empty"><span>▦</span><strong>등록된 Excel 파일이 없습니다.</strong><p>고객사 거래명세서 Excel을 가져오면 등록 이력이 표시됩니다.</p></div>
          )}
        </section>
        {mode === "statements" ? (
          <aside className="statement-preview"><div className="preview-tools"><span>미리보기</span><button>PDF 다운로드</button></div>
            <div className="paper"><div className="paper-title"><span>거 래 명 세 서</span><small>{selected.id}</small></div><div className="parties"><div><small>공급받는 자</small><strong>{selected.customer}</strong><span>{selected.target}</span></div><div><small>공급자</small><strong>{config.supplierName}</strong><span>사업자등록번호 {config.businessNumber}</span></div></div>
              <table><thead><tr><th>품명</th><th>수량</th><th>단가</th><th>공급가액</th></tr></thead><tbody><tr><td>브라켓 A</td><td>1,000</td><td>1,850</td><td>1,850,000</td></tr><tr><td>고정 브라켓</td><td>500</td><td>2,180</td><td>1,090,000</td></tr><tr><td>센서 플레이트</td><td>400</td><td>3,600</td><td>1,440,000</td></tr></tbody></table>
              <div className="paper-total"><span>공급가액 합계</span><strong>{won(selected.amount)}</strong></div></div>
            <button className="primary full" disabled={selected.status === "발급 완료"} onClick={() => onIssue(selected.id)}>{selected.status === "발급 완료" ? `${selected.issuedAt} 발급 완료` : "거래명세서 발급"}</button>
          </aside>
        ) : (
          <aside className="import-detail">
            {selectedBatch ? (
              <>
                <header><span>XL</span><div><small>EXCEL IMPORT</small><strong>{selectedBatch.fileName}</strong><p>{selectedBatch.customer} · {selectedBatch.sheetName}</p></div></header>
                <dl><div><dt>원본 행</dt><dd>{selectedBatch.sourceRows.toLocaleString()}행</dd></div><div><dt>등록 완료</dt><dd>{selectedBatch.importedRows.toLocaleString()}건</dd></div><div><dt>오류 제외</dt><dd>{selectedBatch.errorRows.toLocaleString()}건</dd></div><div><dt>중복 제외</dt><dd>{selectedBatch.duplicateRows.toLocaleString()}건</dd></div></dl>
                <p className="import-actor">등록자 {selectedBatch.importedBy}<br />{new Date(selectedBatch.createdAt).toLocaleString("ko-KR")}</p>
                <a className="secondary full import-download" href={`/api/statement-imports?download=${encodeURIComponent(selectedBatch.id)}`}>↓ 원본 Excel 다운로드</a>
              </>
            ) : <div className="empty"><span>XL</span><strong>이력을 선택하세요.</strong></div>}
          </aside>
        )}
      </div>
      {showImport && (
        <ExcelImportModal
          savedMappings={analytics?.mappings ?? []}
          onClose={() => setShowImport(false)}
          onImported={(nextAnalytics) => {
            setAnalytics(nextAnalytics);
            setSelectedBatchId(nextAnalytics.batches[0]?.id ?? null);
            setMode("imports");
            setShowImport(false);
            onAnnounce("Excel 거래내역이 등록되고 매출 데이터에 반영되었습니다.");
          }}
        />
      )}
    </>
  );
}

const excelFieldDefinitions: Array<{
  key: ExcelMappingKey;
  label: string;
  required?: boolean;
  aliases: string[];
}> = [
  { key: "transactionDate", label: "거래일", required: true, aliases: ["거래일", "일자", "납품일", "거래일자", "date", "deliverydate"] },
  { key: "customer", label: "고객사", aliases: ["고객사", "거래처", "업체명", "상호", "customer", "company"] },
  { key: "itemCode", label: "품목코드", aliases: ["품목코드", "품번", "도면번호", "제품코드", "itemcode", "partno"] },
  { key: "itemName", label: "품명", required: true, aliases: ["품명", "제품명", "품목명", "내역", "item", "itemname", "description"] },
  { key: "quantity", label: "수량", required: true, aliases: ["수량", "납품수량", "qty", "quantity"] },
  { key: "unitPrice", label: "단가", aliases: ["단가", "공급단가", "unitprice", "price"] },
  { key: "supplyAmount", label: "공급가액", aliases: ["공급가액", "금액", "합계", "매출액", "amount", "supplyamount"] },
  { key: "taxAmount", label: "부가세", aliases: ["부가세", "세액", "vat", "tax"] },
  { key: "note", label: "비고", aliases: ["비고", "메모", "특이사항", "note", "remark"] },
];

const primaryExcelFieldKeys: ExcelMappingKey[] = [
  "transactionDate",
  "itemName",
  "quantity",
  "unitPrice",
  "supplyAmount",
];
const primaryExcelFields = excelFieldDefinitions.filter((field) =>
  primaryExcelFieldKeys.includes(field.key),
);
const optionalExcelFields = excelFieldDefinitions.filter(
  (field) => !primaryExcelFieldKeys.includes(field.key),
);

const emptyExcelMapping: ExcelMapping = {
  transactionDate: "",
  customer: "",
  itemCode: "",
  itemName: "",
  quantity: "",
  unitPrice: "",
  supplyAmount: "",
  taxAmount: "",
  note: "",
};

function normalizedHeader(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[\s_.·/()-]+/g, "");
}

function detectHeaderRow(data: unknown[][]) {
  let bestIndex = 0;
  let bestScore = -1;
  data.slice(0, 15).forEach((row, index) => {
    const cells = row.map(normalizedHeader);
    const score = excelFieldDefinitions.reduce(
      (total, field) => total + (field.aliases.some((alias) => cells.some((cell) => cell.includes(normalizedHeader(alias)))) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  });
  return bestIndex;
}

function inferExcelMapping(headers: string[]) {
  const next = { ...emptyExcelMapping };
  excelFieldDefinitions.forEach((field) => {
    const match = headers.find((header) => {
      const normalized = normalizedHeader(header);
      return field.aliases.some((alias) => {
        const normalizedAlias = normalizedHeader(alias);
        return normalized === normalizedAlias || normalized.includes(normalizedAlias);
      });
    });
    if (match) next[field.key] = match;
  });
  return next;
}

function excelDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (typeof value === "number" && value > 20000 && value < 80000) {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return date.toISOString().slice(0, 10);
  }
  const compact = String(value ?? "").trim().replace(/[./]/g, "-");
  const digits = compact.replace(/\D/g, "");
  if (digits.length === 8) {
    const date = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    return validExcelDate(date) ? date : "";
  }
  const match = compact.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return "";
  const date = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  return validExcelDate(date) ? date : "";
}

function validExcelDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function excelNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? "").replace(/[,\s₩원]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsedExcelRows(data: unknown[][], headerRow: number, mapping: ExcelMapping, fallbackCustomer: string) {
  const headers = (data[headerRow] ?? []).map((cell) => String(cell ?? "").trim());
  const indexes = Object.fromEntries(
    Object.entries(mapping).map(([key, header]) => [key, header ? headers.indexOf(header) : -1]),
  ) as Record<ExcelMappingKey, number>;
  const validRows: ParsedImportRow[] = [];
  const errors: Array<{ row: number; messages: string[] }> = [];
  const preview: Array<ParsedImportRow & { messages: string[] }> = [];

  data.slice(headerRow + 1).forEach((row, index) => {
    if (!row.some((cell) => String(cell ?? "").trim())) return;
    const sourceRow = headerRow + index + 2;
    const cell = (key: ExcelMappingKey) => indexes[key] >= 0 ? row[indexes[key]] : undefined;
    const quantity = excelNumber(cell("quantity"));
    const mappedUnitPrice = excelNumber(cell("unitPrice"));
    const mappedSupplyAmount = excelNumber(cell("supplyAmount"));
    const supplyAmount = mappedSupplyAmount || Math.round(quantity * mappedUnitPrice);
    const unitPrice = mappedUnitPrice || (quantity ? Math.round(supplyAmount / quantity) : 0);
    const taxAmount = indexes.taxAmount >= 0 ? excelNumber(cell("taxAmount")) : Math.round(supplyAmount * 0.1);
    const parsed: ParsedImportRow = {
      sourceRow,
      transactionDate: excelDate(cell("transactionDate")),
      customer: String(cell("customer") ?? fallbackCustomer).trim(),
      itemCode: String(cell("itemCode") ?? "").trim(),
      itemName: String(cell("itemName") ?? "").trim(),
      quantity: Math.round(quantity),
      unitPrice: Math.round(unitPrice),
      supplyAmount: Math.round(supplyAmount),
      taxAmount: Math.round(taxAmount),
      note: String(cell("note") ?? "").trim(),
    };
    const messages: string[] = [];
    if (!parsed.transactionDate) messages.push("거래일 확인");
    if (!parsed.customer) messages.push("고객사 확인");
    if (!parsed.itemName) messages.push("품명 확인");
    if (!parsed.quantity) messages.push("수량 확인");
    if (!parsed.supplyAmount) messages.push("단가 또는 공급가액 확인");
    if (messages.length) errors.push({ row: sourceRow, messages });
    else validRows.push(parsed);
    if (preview.length < 8) preview.push({ ...parsed, messages });
  });

  return { validRows, errors, preview, sourceRows: validRows.length + errors.length };
}

function ExcelImportModal({ savedMappings, onClose, onImported }: { savedMappings: StatementImportAnalytics["mappings"]; onClose: () => void; onImported: (analytics: StatementImportAnalytics) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<Array<{ sheet: string; data: unknown[][] }>>([]);
  const [sheetName, setSheetName] = useState("");
  const [headerRow, setHeaderRow] = useState(0);
  const [customer, setCustomer] = useState("");
  const [mapping, setMapping] = useState<ExcelMapping>(emptyExcelMapping);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const sheet = sheets.find((item) => item.sheet === sheetName) ?? sheets[0];
  const headers = useMemo(
    () => (sheet?.data[headerRow] ?? []).map((cell) => String(cell ?? "").trim()).filter(Boolean),
    [headerRow, sheet],
  );
  const parsed = useMemo(
    () => parsedExcelRows(sheet?.data ?? [], headerRow, mapping, customer),
    [customer, headerRow, mapping, sheet],
  );
  const requiredMapped = Boolean(mapping.transactionDate && mapping.itemName && mapping.quantity && (mapping.unitPrice || mapping.supplyAmount));

  function activateSheet(nextSheet: { sheet: string; data: unknown[][] }) {
    const nextHeaderRow = detectHeaderRow(nextSheet.data);
    const nextHeaders = (nextSheet.data[nextHeaderRow] ?? []).map((cell) => String(cell ?? "").trim()).filter(Boolean);
    setSheetName(nextSheet.sheet);
    setHeaderRow(nextHeaderRow);
    setMapping(inferExcelMapping(nextHeaders));
  }

  async function chooseFile(nextFile: File | null) {
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".xlsx")) {
      setError("현재는 Excel .xlsx 파일을 선택해주세요.");
      return;
    }
    if (nextFile.size > 20 * 1024 * 1024) {
      setError("Excel 파일은 최대 20MB까지 선택할 수 있습니다.");
      return;
    }
    setReading(true);
    setError("");
    try {
      const workbook = await readExcelFile(nextFile) as Array<{ sheet: string; data: unknown[][] }>;
      if (!workbook.length) throw new Error("empty workbook");
      setFile(nextFile);
      setSheets(workbook);
      activateSheet(workbook[0]);
    } catch {
      setError("Excel 파일을 읽지 못했습니다. 암호가 설정되지 않은 .xlsx 파일인지 확인해주세요.");
    } finally {
      setReading(false);
    }
  }

  function changeCustomer(value: string) {
    setCustomer(value);
    const saved = savedMappings.find((item) => item.customer === value);
    if (!saved) return;
    setMapping((current) => {
      const next = { ...current };
      Object.entries(saved.mapping).forEach(([key, header]) => {
        if (key in next && headers.includes(header)) next[key as ExcelMappingKey] = header;
      });
      return next;
    });
  }

  async function submitImport() {
    if (!file || !sheet || !customer || !requiredMapped || !parsed.validRows.length || parsed.sourceRows > 5000) return;
    setSaving(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("payload", JSON.stringify({
        customer,
        sheetName: sheet.sheet,
        mapping,
        rows: parsed.validRows,
        sourceRows: parsed.sourceRows,
        errorRows: parsed.errors.length,
        allowDuplicates,
      }));
      const response = await fetch("/api/statement-imports", { method: "POST", body: form });
      const body = await response.json() as { analytics?: StatementImportAnalytics; error?: string };
      if (!response.ok || !body.analytics) throw new Error(body.error ?? "Excel 거래내역을 등록하지 못했습니다.");
      onImported(body.analytics);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Excel 거래내역을 등록하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop excel-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="excel-modal" role="dialog" aria-modal="true" aria-labelledby="excel-import-title">
        <header className="excel-modal-head">
          <div><h2 id="excel-import-title">Excel 거래내역 가져오기</h2><p>.xlsx 파일의 열을 확인하고 유효한 행만 등록합니다.</p></div>
          <button className="icon-button" onClick={onClose} aria-label="닫기">×</button>
        </header>

        <div className="excel-import-content">
          <div className="excel-workspace">
            <section className="excel-file-card">
              <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)} hidden />
              {file ? <><div><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(1)}KB · {sheets.length}개 시트</small></div><button className="secondary compact" onClick={() => fileRef.current?.click()}>변경</button></> : <button className="excel-drop" onClick={() => fileRef.current?.click()} disabled={reading}><strong>{reading ? "파일 확인 중…" : "Excel 파일 선택"}</strong><small>.xlsx · 최대 20MB · 5,000행</small></button>}
            </section>

            {sheet && (
              <>
                <section className="excel-options">
                  <label><span>고객사</span><input list="excel-customer-options" value={customer} placeholder="선택 또는 직접 입력" onChange={(event) => changeCustomer(event.target.value)} /><datalist id="excel-customer-options">{customers.map((item) => <option value={item[0]} key={item[0]} />)}</datalist></label>
                  <label><span>시트</span><select value={sheet.sheet} onChange={(event) => { const next = sheets.find((item) => item.sheet === event.target.value); if (next) activateSheet(next); }}>{sheets.map((item) => <option key={item.sheet}>{item.sheet}</option>)}</select></label>
                  <label><span>헤더 행</span><select value={headerRow} onChange={(event) => { const nextRow = Number(event.target.value); setHeaderRow(nextRow); setMapping(inferExcelMapping((sheet.data[nextRow] ?? []).map((cell) => String(cell ?? "").trim()).filter(Boolean))); }}>{sheet.data.slice(0, 10).map((row, index) => <option value={index} key={index}>{index + 1}행 · {row.slice(0, 3).map((cell) => String(cell ?? "")).join(" / ") || "빈 행"}</option>)}</select></label>
                </section>

                <section className="mapping-section">
                  <header><div><h3>필수 열 연결</h3><p>거래일·품명·수량과 단가 또는 공급가액을 확인하세요.</p></div><span>{Object.values(mapping).filter(Boolean).length}개 연결</span></header>
                  <div className="mapping-grid">{primaryExcelFields.map((field) => <label key={field.key}><span>{field.label}{field.required ? <b>*</b> : ""}</span><select value={mapping[field.key]} onChange={(event) => setMapping((current) => ({ ...current, [field.key]: event.target.value }))}><option value="">연결 안 함</option>{headers.map((header) => <option key={header}>{header}</option>)}</select></label>)}</div>
                  <details className="optional-mapping">
                    <summary><span>선택 항목</span><small>고객사 · 품목코드 · 부가세 · 비고</small></summary>
                    <div className="mapping-grid">{optionalExcelFields.map((field) => <label key={field.key}><span>{field.label}</span><select value={mapping[field.key]} onChange={(event) => setMapping((current) => ({ ...current, [field.key]: event.target.value }))}><option value="">연결 안 함</option>{headers.map((header) => <option key={header}>{header}</option>)}</select></label>)}</div>
                  </details>
                </section>

                <section className="excel-validation">
                  <header><div><h3>데이터 검증</h3><p>원본 {parsed.sourceRows.toLocaleString()}행 중 등록 가능한 거래를 확인합니다.</p></div><div><span className="valid">정상 {parsed.validRows.length}</span><span className={parsed.errors.length ? "invalid" : ""}>오류 {parsed.errors.length}</span></div></header>
                  <div className="excel-preview-table"><table><thead><tr><th>행</th><th>거래일</th><th>고객사</th><th>품명</th><th className="number">수량</th><th className="number">공급가액</th><th>검증</th></tr></thead><tbody>{parsed.preview.map((row) => <tr key={row.sourceRow}><td>{row.sourceRow}</td><td>{row.transactionDate || "-"}</td><td>{row.customer || "-"}</td><td>{row.itemName || "-"}</td><td className="number">{row.quantity.toLocaleString()}</td><td className="number">{row.supplyAmount.toLocaleString()}</td><td>{row.messages.length ? <Status>확인 필요</Status> : <Status>정상 완료</Status>}</td></tr>)}</tbody></table></div>
                  {parsed.sourceRows > 5000 && <p className="validation-note">한 번에 최대 5,000행까지 등록할 수 있습니다. 파일을 나누어 등록해주세요.</p>}
                  {parsed.errors.length > 0 && <p className="validation-note">오류 행은 등록에서 제외됩니다: {parsed.errors.slice(0, 4).map((item) => `${item.row}행 ${item.messages.join(", ")}`).join(" · ")}{parsed.errors.length > 4 ? ` 외 ${parsed.errors.length - 4}건` : ""}</p>}
                  <label className="check duplicate-check"><input type="checkbox" checked={allowDuplicates} onChange={(event) => setAllowDuplicates(event.target.checked)} /> 동일한 거래일·고객사·품명·금액의 기존 거래도 새 건으로 등록합니다.</label>
                </section>
              </>
            )}
            {error && <div className="excel-error">{error}</div>}
          </div>
        </div>

        <footer className="excel-modal-actions">
          <div>{file && <><strong>{parsed.validRows.length.toLocaleString()}건 등록 예정</strong><span>오류 {parsed.errors.length}건 제외</span></>}</div>
          <button className="secondary" onClick={onClose}>취소</button>
          <button className="primary" disabled={!file || !customer || !requiredMapped || !parsed.validRows.length || parsed.sourceRows > 5000 || saving} onClick={() => void submitImport()}>{saving ? "등록 중…" : "검증 완료 · 일괄 등록"}</button>
        </footer>
      </section>
    </div>
  );
}

function Sales() {
  const [excelAnalytics, setExcelAnalytics] = useState<StatementImportAnalytics | null>(null);
  const yearlyTarget = 91;
  useEffect(() => {
    void fetch("/api/statement-imports", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((body: StatementImportAnalytics | null) => setExcelAnalytics(body))
      .catch(() => undefined);
  }, []);

  const hasExcelData = Boolean(excelAnalytics?.summary.count);
  const monthCount = hasExcelData
    ? Math.max(7, Math.min(12, Math.max(...(excelAnalytics?.monthly.map((item) => item.month) ?? [7]))))
    : monthlySales.length;
  const salesSeries = hasExcelData
    ? Array.from({ length: monthCount }, (_, index) => {
        const amount = excelAnalytics?.monthly.find((item) => item.month === index + 1)?.amount ?? 0;
        return amount / 1000000;
      })
    : monthlySales;
  const cumulativeSales = salesSeries.reduce((sum, amount) => sum + amount, 0);
  const currentMonthIndex = Math.max(0, salesSeries.findLastIndex((amount) => amount > 0));
  const currentMonthSales = salesSeries[currentMonthIndex] || 0;
  const previousMonthSales = salesSeries[Math.max(0, currentMonthIndex - 1)] || 0;
  const monthChange = previousMonthSales ? ((currentMonthSales - previousMonthSales) / previousMonthSales) * 100 : 0;
  const scaleMax = Math.max(100, Math.ceil(Math.max(...salesSeries, yearlyTarget) / 25) * 25);
  const customerSeries = hasExcelData
    ? (excelAnalytics?.customers ?? []).slice(0, 4).map((item) => ({ name: item.customer, amount: item.amount }))
    : customers.map((item) => ({ name: item[0], amount: item[4] }));
  const customerTotal = customerSeries.reduce((sum, customer) => sum + customer.amount, 0);
  const totalWon = cumulativeSales * 1000000;
  const topCustomerShare = totalWon ? (customerTotal / totalWon) * 100 : 0;
  const compactSales = (amount: number) => amount >= 100000000
    ? `${(amount / 100000000).toFixed(2)}억원`
    : `${Math.round(amount / 10000).toLocaleString()}만원`;
  const summaries = [
    {
      index: "01",
      label: `${excelAnalytics?.year ?? "2026"}년 누적 매출`,
      value: compactSales(totalWon),
      change: hasExcelData ? `${excelAnalytics?.summary.count.toLocaleString()}건` : "+12.4%",
      context: hasExcelData ? "Excel 등록 거래" : "전년 동기",
    },
    {
      index: "02",
      label: `${currentMonthIndex + 1}월 확정 매출`,
      value: compactSales(currentMonthSales * 1000000),
      change: `${((currentMonthSales / yearlyTarget) * 100).toFixed(1)}%`,
      context: "월 목표 달성률",
    },
    {
      index: "03",
      label: "평균 거래단가",
      value: hasExcelData && excelAnalytics?.summary.count
        ? won(Math.round(totalWon / excelAnalytics.summary.count))
        : "2,840원",
      change: `${monthChange >= 0 ? "+" : ""}${monthChange.toFixed(1)}%`,
      context: "전월 매출 대비",
    },
  ];

  return (
    <>
      <div className="sales-kpis">
        {summaries.map((item) => (
          <article key={item.index}>
            <header><span>{item.index}</span><small>{item.label}</small></header>
            <strong>{item.value}</strong>
            <footer><b>{item.change}</b><span>{item.context}</span></footer>
          </article>
        ))}
      </div>
      <div className="sales-grid">
        <section className="panel sales-panel">
          <SectionHead
            title="월별 매출 추이"
            description={hasExcelData ? "Excel 등록 공급가액 · 단위 백만원" : "확정 납품 공급가액 · 단위 백만원"}
            action={<button className="report-period">{excelAnalytics?.year ?? "2026"}년 1–{monthCount}월 <span>⌄</span></button>}
          />
          <div className="sales-chart">
            <div className="chart-scale" aria-hidden="true">
              <span>{scaleMax}</span><span>{Math.round(scaleMax * .75)}</span><span>{Math.round(scaleMax * .5)}</span><span>{Math.round(scaleMax * .25)}</span><span>0</span>
            </div>
            <div className="chart-plot" style={{ gridTemplateColumns: `repeat(${salesSeries.length}, minmax(34px, 1fr))` }}>
              <div className="target-line" style={{ bottom: `${(yearlyTarget / scaleMax) * 100}%` }}>
                <span>월 목표 91</span>
              </div>
              {salesSeries.map((amount, index) => (
                <div className="bar-column" key={index}>
                  <div className="bar-track">
                    <i
                      className={index === currentMonthIndex ? "current" : ""}
                      style={{ height: `${Math.max(2, (amount / scaleMax) * 100)}%` }}
                    >
                      <b>{amount ? Math.round(amount) : "-"}</b>
                    </i>
                  </div>
                  <small>{String(index + 1).padStart(2, "0")}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-summary">
            <div><small>누적</small><strong>{cumulativeSales.toFixed(1)}백만원</strong></div>
            <div><small>월평균</small><strong>{(cumulativeSales / salesSeries.length).toFixed(1)}백만원</strong></div>
            <p><span>{String(currentMonthIndex + 1).padStart(2, "0")}월</span> 전월보다 <b>{Math.abs(monthChange).toFixed(1)}%</b> {monthChange >= 0 ? "증가" : "감소"}했으며 월 목표의 <b>{((currentMonthSales / yearlyTarget) * 100).toFixed(1)}%</b>를 달성했습니다.</p>
          </div>
        </section>
        <section className="panel sales-panel customer-sales">
          <SectionHead
            title="고객사별 매출"
            description={`${excelAnalytics?.year ?? "2026"}년 누적 · 전체 매출 대비 비중`}
            action={<span className="report-code">TOP {String(customerSeries.length).padStart(2, "0")}</span>}
          />
          <ol className="report-ranking">
            {customerSeries.map((item, index) => {
              const share = totalWon ? (item.amount / totalWon) * 100 : 0;
              return (
                <li key={item.name}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <header><strong>{item.name}</strong><em>{share.toFixed(1)}%</em></header>
                    <div className="rank-track">
                      <i style={{ width: `${Math.round((item.amount / (customerSeries[0]?.amount || 1)) * 100)}%` }} />
                    </div>
                    <small>누적 공급가액</small>
                  </div>
                  <b>{(item.amount / 1000000).toFixed(1)}M</b>
                </li>
              );
            })}
          </ol>
          <footer className="ranking-summary">
            <span>상위 4개 고객사 비중</span>
            <strong>{topCustomerShare.toFixed(1)}%</strong>
          </footer>
        </section>
      </div>
    </>
  );
}

function CS({ items, onComplete }: { items: typeof seedTickets; onComplete: (id: string) => void }) {
  return <div className="kanban">{["신규", "처리 중", "답변 대기", "처리 완료"].map((column) => {
    const cards = items.filter((item) => item.status === column);
    return <section key={column}><header><i /><strong>{column}</strong><span>{cards.length}</span><button>···</button></header><div>{cards.map((item) => <article key={item.id}><div><Status>{item.type}</Status><small>{item.id}</small></div><h3>{item.title}</h3><p>{item.customer}</p><footer><span>{item.elapsed}</span>{item.status !== "처리 완료" ? <button onClick={() => onComplete(item.id)}>처리 완료</button> : <span>완료</span>}</footer></article>)}{!cards.length && <p className="kanban-empty">등록된 항목이 없습니다.</p>}</div></section>;
  })}</div>;
}

function Customers() {
  return <section className="panel"><div className="list-tools"><div className="tabs"><button className="active">전체 고객사</button><button>거래 중</button><button>휴면</button></div><button className="primary compact">＋ 고객사 등록</button></div><table><thead><tr><th>고객사</th><th>담당자</th><th>거래 조건</th><th>등록 도면</th><th className="number">누적 매출</th></tr></thead><tbody>{customers.map((item) => <tr key={item[0]}><td><div className="company"><span>{item[0].slice(0, 1)}</span><strong>{item[0]}</strong></div></td><td>{item[1]}</td><td>{item[2]}</td><td>{item[3]}건</td><td className="number">{won(item[4])}</td></tr>)}</tbody></table></section>;
}

function Settings({ onAnnounce, onSettingsSaved }: { onAnnounce: (message: string) => void; onSettingsSaved: (settings: SettingsState) => void }) {
  const sections: Array<{
    id: SettingsSection;
    icon: string;
    title: string;
    description: string;
  }> = [
    { id: "drawingNumber", icon: "▱", title: "도면번호 규칙", description: "신규 도면번호 생성 기준" },
    { id: "pricingApproval", icon: "₩", title: "단가 승인", description: "변경폭·금액별 승인 기준" },
    { id: "statement", icon: "▤", title: "거래명세서", description: "공급자 정보와 월마감" },
    { id: "alerts", icon: "◎", title: "알림 규칙", description: "검토·납기·CS 알림" },
    { id: "users", icon: "♙", title: "사용자·권한", description: "역할별 접근 권한" },
    { id: "audit", icon: "↺", title: "변경 이력", description: "설정 감사 로그" },
  ];
  const [active, setActive] = useState<SettingsSection>("drawingNumber");
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "조회" });

  async function loadSettings() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const body = await response.json() as {
        settings?: Partial<SettingsState>;
        users?: AppUser[];
        logs?: AuditLog[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "설정을 불러오지 못했습니다.");
      const nextSettings = {
        drawingNumber: { ...defaultSettings.drawingNumber, ...body.settings?.drawingNumber },
        pricingApproval: { ...defaultSettings.pricingApproval, ...body.settings?.pricingApproval },
        statement: { ...defaultSettings.statement, ...body.settings?.statement },
        alerts: { ...defaultSettings.alerts, ...body.settings?.alerts },
      };
      setSettings(nextSettings);
      onSettingsSaved(nextSettings);
      setUsers(body.users ?? []);
      setLogs(body.logs ?? []);
      setDirty(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "설정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadSettings(), 0);
    return () => window.clearTimeout(timeout);
    // Reload is also exposed as an explicit user action below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateSetting(section: ConfigSection, field: string, value: string | number | boolean) {
    setSettings((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value },
    }));
    setDirty(true);
  }

  function updateUser(email: string, patch: Partial<AppUser>) {
    setUsers((current) => current.map((user) => user.email === email ? { ...user, ...patch } : user));
    setDirty(true);
  }

  function addUser() {
    const name = newUser.name.trim();
    const email = newUser.email.trim().toLowerCase();
    if (!name || !email.includes("@")) {
      onAnnounce("사용자 이름과 이메일을 확인해주세요.");
      return;
    }
    if (users.some((user) => user.email === email)) {
      onAnnounce("이미 등록된 이메일입니다.");
      return;
    }
    setUsers((current) => [...current, { name, email, role: newUser.role, active: true }]);
    setNewUser({ name: "", email: "", role: "조회" });
    setDirty(true);
  }

  async function saveActive() {
    if (active === "audit") return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          section: active,
          values: active === "users" ? { users } : settings[active],
        }),
      });
      const body = await response.json() as {
        settings?: Partial<SettingsState>;
        users?: AppUser[];
        logs?: AuditLog[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "설정을 저장하지 못했습니다.");
      const savedSettings = {
        drawingNumber: { ...defaultSettings.drawingNumber, ...body.settings?.drawingNumber },
        pricingApproval: { ...defaultSettings.pricingApproval, ...body.settings?.pricingApproval },
        statement: { ...defaultSettings.statement, ...body.settings?.statement },
        alerts: { ...defaultSettings.alerts, ...body.settings?.alerts },
      };
      setSettings(savedSettings);
      onSettingsSaved(savedSettings);
      setUsers(body.users ?? users);
      setLogs(body.logs ?? logs);
      setDirty(false);
      onAnnounce("설정이 저장되고 변경 이력에 기록되었습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "설정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const activeInfo = sections.find((section) => section.id === active) ?? sections[0];

  return (
    <div className="settings-layout">
      <aside className="settings-nav">
        <header><small>CONFIGURATION</small><strong>운영 설정</strong></header>
        <nav aria-label="시스템 설정 항목">
          {sections.map((section) => (
            <button
              type="button"
              className={active === section.id ? "active" : ""}
              key={section.id}
              onClick={() => { setActive(section.id); setError(""); }}
            >
              <span>{section.icon}</span>
              <div><strong>{section.title}</strong><small>{section.description}</small></div>
              <b>›</b>
            </button>
          ))}
        </nav>
        <footer><span className={error ? "error" : dirty ? "dirty" : "saved"} /><small>{error ? "확인 필요" : dirty ? "저장하지 않은 변경사항" : "모든 설정 저장됨"}</small></footer>
      </aside>

      <section className="settings-detail panel">
        <header className="settings-detail-head">
          <div><span>{activeInfo.icon}</span><div><small>SYSTEM SETTING</small><h2>{activeInfo.title}</h2><p>{activeInfo.description}</p></div></div>
          {active === "audit" ? (
            <button className="secondary compact" type="button" onClick={() => void loadSettings()}>↻ 새로고침</button>
          ) : (
            <button className="primary compact" type="button" disabled={saving || loading || !dirty} onClick={() => void saveActive()}>
              {saving ? "저장 중…" : "변경사항 저장"}
            </button>
          )}
        </header>

        {loading ? (
          <div className="settings-loading"><span /><p>운영 설정을 불러오는 중입니다.</p></div>
        ) : error ? (
          <div className="settings-error"><strong>설정을 처리할 수 없습니다.</strong><p>{error}</p><button className="secondary compact" onClick={() => void loadSettings()}>다시 시도</button></div>
        ) : (
          <div className="settings-body">
            {active === "drawingNumber" && (
              <>
                <SettingGroup title="번호 구성" description="신규 도면을 등록할 때 자동으로 부여되는 번호입니다.">
                  <div className="settings-form two">
                    <Property label="도면번호 형식"><input value={settings.drawingNumber.format} onChange={(event) => updateSetting("drawingNumber", "format", event.target.value)} /></Property>
                    <Property label="고정 접두사"><input value={settings.drawingNumber.prefix} onChange={(event) => updateSetting("drawingNumber", "prefix", event.target.value.toUpperCase())} /></Property>
                    <Property label="일련번호 자릿수"><select value={settings.drawingNumber.sequenceDigits} onChange={(event) => updateSetting("drawingNumber", "sequenceDigits", Number(event.target.value))}><option value={3}>3자리</option><option value={4}>4자리</option><option value={5}>5자리</option></select></Property>
                    <Property label="번호 초기화 주기"><select value={settings.drawingNumber.resetCycle} onChange={(event) => updateSetting("drawingNumber", "resetCycle", event.target.value)}><option value="monthly">매월</option><option value="yearly">매년</option><option value="never">초기화 안 함</option></select></Property>
                  </div>
                </SettingGroup>
                <SettingGroup title="생성 예시" description="현재 규칙을 적용한 다음 도면번호입니다.">
                  <div className="number-preview"><small>NEXT DRAWING ID</small><strong>{settings.drawingNumber.prefix}-2607-{String(42).padStart(settings.drawingNumber.sequenceDigits, "0")}</strong><span>2026년 7월 · 42번째 등록</span></div>
                  <Toggle checked={settings.drawingNumber.allowManualOverride} onChange={(checked) => updateSetting("drawingNumber", "allowManualOverride", checked)} label="관리자의 도면번호 수동 변경 허용" description="중복 번호는 저장 단계에서 차단합니다." />
                </SettingGroup>
              </>
            )}

            {active === "pricingApproval" && (
              <>
                <SettingGroup title="승인 기준" description="아래 조건 중 하나라도 충족하면 관리자 승인이 필요합니다.">
                  <div className="settings-form two">
                    <Property label="단가 변경폭"><div className="input-unit"><input type="number" min={0} value={settings.pricingApproval.changeThreshold} onChange={(event) => updateSetting("pricingApproval", "changeThreshold", Number(event.target.value))} /><span>% 이상</span></div></Property>
                    <Property label="견적 총액"><div className="input-unit"><input type="number" min={0} step={100000} value={settings.pricingApproval.amountThreshold} onChange={(event) => updateSetting("pricingApproval", "amountThreshold", Number(event.target.value))} /><span>원 이상</span></div></Property>
                    <Property label="최소 목표 마진"><div className="input-unit"><input type="number" min={0} value={settings.pricingApproval.minimumMargin} onChange={(event) => updateSetting("pricingApproval", "minimumMargin", Number(event.target.value))} /><span>%</span></div></Property>
                    <Property label="승인 단가 유효기간"><div className="input-unit"><input type="number" min={1} value={settings.pricingApproval.validityDays} onChange={(event) => updateSetting("pricingApproval", "validityDays", Number(event.target.value))} /><span>일</span></div></Property>
                  </div>
                </SettingGroup>
                <SettingGroup title="승인 정책" description="단가 변경의 사유와 책임자를 명확하게 남깁니다.">
                  <Toggle checked={settings.pricingApproval.requireReason} onChange={(checked) => updateSetting("pricingApproval", "requireReason", checked)} label="단가 변경 사유 필수 입력" description="형상, 도금 난이도, 면적 등 산정 근거를 기록합니다." />
                  <div className="rule-preview"><span>승인 흐름</span><strong>담당자 산정</strong><b>→</b><strong>관리자 검토</strong><b>→</b><strong>단가 확정</strong></div>
                </SettingGroup>
              </>
            )}

            {active === "statement" && (
              <>
                <SettingGroup title="공급자 정보" description="거래명세서 상단에 표시되는 사업자 정보입니다.">
                  <div className="settings-form two">
                    <Property label="상호"><input value={settings.statement.supplierName} onChange={(event) => updateSetting("statement", "supplierName", event.target.value)} /></Property>
                    <Property label="사업자등록번호"><input value={settings.statement.businessNumber} onChange={(event) => updateSetting("statement", "businessNumber", event.target.value)} /></Property>
                    <Property label="월마감 기준"><select value={settings.statement.closingDay} onChange={(event) => updateSetting("statement", "closingDay", event.target.value)}><option value="month-end">매월 말일</option><option value="25">매월 25일</option><option value="20">매월 20일</option><option value="twice">월 2회</option></select></Property>
                    <Property label="기본 결제기한"><div className="input-unit"><input type="number" min={0} value={settings.statement.paymentTerm} onChange={(event) => updateSetting("statement", "paymentTerm", Number(event.target.value))} /><span>일</span></div></Property>
                  </div>
                </SettingGroup>
                <SettingGroup title="발급 정책" description="확정 납품 데이터를 기준으로 명세서를 생성합니다.">
                  <Toggle checked={settings.statement.autoIssue} onChange={(checked) => updateSetting("statement", "autoIssue", checked)} label="마감일에 거래명세서 자동 발급" description="발급 전 공급가액과 수량 오류를 자동 검사합니다." />
                  <Toggle checked={settings.statement.includeSeal} onChange={(checked) => updateSetting("statement", "includeSeal", checked)} label="공급자 직인 이미지 포함" description="PDF 출력본과 이메일 첨부본에 동일하게 적용합니다." />
                </SettingGroup>
              </>
            )}

            {active === "alerts" && (
              <>
                <SettingGroup title="업무 지연 알림" description="담당자가 놓치기 쉬운 기준 시점을 설정합니다.">
                  <div className="settings-form two">
                    <Property label="도면 검토 지연"><div className="input-unit"><input type="number" min={1} value={settings.alerts.drawingReviewHours} onChange={(event) => updateSetting("alerts", "drawingReviewHours", Number(event.target.value))} /><span>시간 후</span></div></Property>
                    <Property label="납품 예정 알림"><div className="input-unit"><input type="number" min={0} value={settings.alerts.deliveryNoticeDays} onChange={(event) => updateSetting("alerts", "deliveryNoticeDays", Number(event.target.value))} /><span>일 전</span></div></Property>
                  </div>
                </SettingGroup>
                <SettingGroup title="알림 유형" description="활성화한 항목은 업무 대시보드와 담당자 알림에 표시됩니다.">
                  <Toggle checked={settings.alerts.urgentCsImmediate} onChange={(checked) => updateSetting("alerts", "urgentCsImmediate", checked)} label="긴급 CS 즉시 알림" description="품질 클레임과 납기 이슈를 우선 노출합니다." />
                  <Toggle checked={settings.alerts.approvalReminder} onChange={(checked) => updateSetting("alerts", "approvalReminder", checked)} label="단가 승인 지연 알림" description="승인 요청 후 4시간이 지나면 재알림합니다." />
                  <Toggle checked={settings.alerts.statementReminder} onChange={(checked) => updateSetting("alerts", "statementReminder", checked)} label="거래명세서 미발급 알림" description="납품 확정 후 미발급 건을 매일 집계합니다." />
                </SettingGroup>
              </>
            )}

            {active === "users" && (
              <>
                <SettingGroup title="등록 사용자" description="역할에 따라 조회·등록·승인 범위가 달라집니다.">
                  <div className="user-permission-table">
                    <div className="permission-head"><span>사용자</span><span>역할</span><span>상태</span><span /></div>
                    {users.map((user) => (
                      <div className="permission-row" key={user.email}>
                        <div><strong>{user.name}</strong><small>{user.email}</small></div>
                        <select value={user.role} onChange={(event) => updateUser(user.email, { role: event.target.value })}><option>관리자</option><option>영업</option><option>생산</option><option>회계</option><option>조회</option></select>
                        <button type="button" className={user.active ? "user-state active" : "user-state"} onClick={() => updateUser(user.email, { active: !user.active })}>{user.active ? "사용 중" : "중지"}</button>
                        <button type="button" className="remove-user" aria-label={`${user.name} 삭제`} onClick={() => { setUsers((current) => current.filter((item) => item.email !== user.email)); setDirty(true); }}>×</button>
                      </div>
                    ))}
                  </div>
                </SettingGroup>
                <SettingGroup title="사용자 추가" description="이메일 기준으로 사용자를 등록하고 초기 역할을 지정합니다.">
                  <div className="add-user">
                    <input placeholder="이름" value={newUser.name} onChange={(event) => setNewUser((current) => ({ ...current, name: event.target.value }))} />
                    <input type="email" placeholder="name@company.com" value={newUser.email} onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))} />
                    <select value={newUser.role} onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value }))}><option>관리자</option><option>영업</option><option>생산</option><option>회계</option><option>조회</option></select>
                    <button type="button" className="secondary compact" onClick={addUser}>＋ 추가</button>
                  </div>
                </SettingGroup>
              </>
            )}

            {active === "audit" && (
              <SettingGroup title="최근 변경 이력" description="설정 저장 시 사용자와 변경 시각이 자동 기록됩니다.">
                <div className="audit-list">
                  {logs.length ? logs.map((log) => (
                    <article key={log.id}>
                      <span>{log.section.slice(0, 1).toUpperCase()}</span>
                      <div><strong>{log.action}</strong><p>{log.summary}</p><small>{log.actor}</small></div>
                      <time>{new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(log.createdAt))}</time>
                    </article>
                  )) : <div className="audit-empty"><span>↺</span><strong>아직 변경 이력이 없습니다.</strong><p>첫 설정을 저장하면 이곳에 기록됩니다.</p></div>}
                </div>
              </SettingGroup>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function SettingGroup({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="setting-group"><header><h3>{title}</h3><p>{description}</p></header><div>{children}</div></section>;
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (checked: boolean) => void; label: string; description: string }) {
  return <label className="toggle-row"><div><strong>{label}</strong><small>{description}</small></div><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span aria-hidden="true" /></label>;
}

function SectionHead({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="section-head"><div><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}

function Record({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="record"><span>▱</span><div><strong>{title}</strong><small>{subtitle}</small></div></div>;
}

function Property({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span>{label}</span>{children}</label>;
}

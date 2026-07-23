"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

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
    const id = `DWG-2607-${String(drawings.length + 42).padStart(3, "0")}`;
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

              {page === "dashboard" && <Dashboard drawings={drawings} onNavigate={navigate} onOpen={setSelectedDrawing} />}
              {page === "drawings" && <DrawingList drawings={filteredDrawings} filter={filter} onFilter={setFilter} onOpen={setSelectedDrawing} />}
              {page === "pricing" && <Pricing drawings={drawings} selected={priceDrawing} onSelect={setSelectedPrice} onApprove={approve} />}
              {page === "orders" && <Orders />}
              {page === "statements" && <Statements items={statements} selected={statement} onSelect={setSelectedStatement} onIssue={issueStatement} />}
              {page === "sales" && <Sales />}
              {page === "cs" && <CS items={tickets} onComplete={(id) => { setTickets((items) => items.map((item) => item.id === id ? { ...item, status: "처리 완료" } : item)); announce("CS 항목을 처리 완료했습니다."); }} />}
              {page === "customers" && <Customers />}
              {page === "settings" && <Settings onAnnounce={announce} />}
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

function Dashboard({ drawings, onNavigate, onOpen }: { drawings: Drawing[]; onNavigate: (page: Page) => void; onOpen: (id: string) => void }) {
  const cards: Array<[string, string, string, string, Page]> = [
    ["▱", "도면 검토 대기", "12", "인식 실패 2건 포함", "drawings"],
    ["₩", "단가 승인 대기", "4", "오늘 요청 3건", "pricing"],
    ["▤", "명세서 미발급", "8", "이번 달 납품분", "statements"],
    ["◎", "CS 미처리", "5", "긴급 1건", "cs"],
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

function Pricing({ drawings, selected, onSelect, onApprove }: { drawings: Drawing[]; selected: Drawing; onSelect: (id: string) => void; onApprove: (id: string) => void }) {
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
        <label className="field"><span>최종 적용 단가</span><input defaultValue={selected.unitPrice ? selected.unitPrice.toLocaleString() : ""} /></label>
        <label className="field"><span>승인 사유</span><textarea rows={3} defaultValue="신규 도면 기준단가 적용" /></label>
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

function Statements({ items, selected, onSelect, onIssue }: { items: typeof seedStatements; selected: (typeof seedStatements)[number]; onSelect: (id: string) => void; onIssue: (id: string) => void }) {
  return (
    <div className="split statements">
      <section className="panel"><div className="list-tools"><div className="tabs"><button className="active">미발급</button><button>발급 완료</button><button>전체</button></div><button className="secondary compact">월마감 일괄 발급</button></div>
        <table><thead><tr><th>명세서 번호</th><th>고객사</th><th>대상</th><th className="number">공급가액</th><th>상태</th></tr></thead><tbody>{items.map((item) => <tr className={`clickable ${item.id === selected.id ? "selected" : ""}`} onClick={() => onSelect(item.id)} key={item.id}><td><button className="link-button">{item.id}</button></td><td>{item.customer}</td><td>{item.target}</td><td className="number">{won(item.amount)}</td><td><Status>{item.status}</Status></td></tr>)}</tbody></table>
      </section>
      <aside className="statement-preview"><div className="preview-tools"><span>미리보기</span><button>PDF 다운로드</button></div>
        <div className="paper"><div className="paper-title"><span>거 래 명 세 서</span><small>{selected.id}</small></div><div className="parties"><div><small>공급받는 자</small><strong>{selected.customer}</strong><span>{selected.target}</span></div><div><small>공급자</small><strong>도금산업 주식회사</strong><span>사업자등록번호 000-00-00000</span></div></div>
          <table><thead><tr><th>품명</th><th>수량</th><th>단가</th><th>공급가액</th></tr></thead><tbody><tr><td>브라켓 A</td><td>1,000</td><td>1,850</td><td>1,850,000</td></tr><tr><td>고정 브라켓</td><td>500</td><td>2,180</td><td>1,090,000</td></tr><tr><td>센서 플레이트</td><td>400</td><td>3,600</td><td>1,440,000</td></tr></tbody></table>
          <div className="paper-total"><span>공급가액 합계</span><strong>{won(selected.amount)}</strong></div></div>
        <button className="primary full" disabled={selected.status === "발급 완료"} onClick={() => onIssue(selected.id)}>{selected.status === "발급 완료" ? `${selected.issuedAt} 발급 완료` : "거래명세서 발급"}</button>
      </aside>
    </div>
  );
}

function Sales() {
  const yearlyTarget = 91;
  const cumulativeSales = monthlySales.reduce((sum, amount) => sum + amount, 0);
  const customerTotal = customers.reduce((sum, customer) => sum + customer[4], 0);
  const topCustomerShare = (customerTotal / (cumulativeSales * 1000000)) * 100;
  const summaries = [
    {
      index: "01",
      label: "2026년 누적 매출",
      value: "4.82억원",
      change: "+12.4%",
      context: "전년 동기",
    },
    {
      index: "02",
      label: "7월 확정 매출",
      value: "8,600만원",
      change: "94.5%",
      context: "월 목표 달성률",
    },
    {
      index: "03",
      label: "평균 거래단가",
      value: "2,840원",
      change: "+3.1%",
      context: "전월 대비",
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
            description="확정 납품 공급가액 · 단위 백만원"
            action={<button className="report-period">2026년 1–7월 <span>⌄</span></button>}
          />
          <div className="sales-chart">
            <div className="chart-scale" aria-hidden="true">
              <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
            </div>
            <div className="chart-plot">
              <div className="target-line" style={{ bottom: `${yearlyTarget}%` }}>
                <span>월 목표 91</span>
              </div>
              {monthlySales.map((amount, index) => (
                <div className="bar-column" key={index}>
                  <div className="bar-track">
                    <i
                      className={index === monthlySales.length - 1 ? "current" : ""}
                      style={{ height: `${amount}%` }}
                    >
                      <b>{amount}</b>
                    </i>
                  </div>
                  <small>{String(index + 1).padStart(2, "0")}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-summary">
            <div><small>누적</small><strong>{cumulativeSales}백만원</strong></div>
            <div><small>월평균</small><strong>{(cumulativeSales / monthlySales.length).toFixed(1)}백만원</strong></div>
            <p><span>07월</span> 전월보다 <b>3.6%</b> 증가했으며 월 목표의 <b>94.5%</b>를 달성했습니다.</p>
          </div>
        </section>
        <section className="panel sales-panel customer-sales">
          <SectionHead
            title="고객사별 매출"
            description="2026년 누적 · 전체 매출 대비 비중"
            action={<span className="report-code">TOP 04</span>}
          />
          <ol className="report-ranking">
            {customers.map((item, index) => {
              const share = (item[4] / (cumulativeSales * 1000000)) * 100;
              return (
                <li key={item[0]}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <header><strong>{item[0]}</strong><em>{share.toFixed(1)}%</em></header>
                    <div className="rank-track">
                      <i style={{ width: `${Math.round((item[4] / customers[0][4]) * 100)}%` }} />
                    </div>
                    <small>누적 공급가액</small>
                  </div>
                  <b>{(item[4] / 1000000).toFixed(1)}M</b>
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

function Settings({ onAnnounce }: { onAnnounce: (message: string) => void }) {
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
      setSettings({
        drawingNumber: { ...defaultSettings.drawingNumber, ...body.settings?.drawingNumber },
        pricingApproval: { ...defaultSettings.pricingApproval, ...body.settings?.pricingApproval },
        statement: { ...defaultSettings.statement, ...body.settings?.statement },
        alerts: { ...defaultSettings.alerts, ...body.settings?.alerts },
      });
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
    void loadSettings();
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
      setSettings({
        drawingNumber: { ...defaultSettings.drawingNumber, ...body.settings?.drawingNumber },
        pricingApproval: { ...defaultSettings.pricingApproval, ...body.settings?.pricingApproval },
        statement: { ...defaultSettings.statement, ...body.settings?.statement },
        alerts: { ...defaultSettings.alerts, ...body.settings?.alerts },
      });
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

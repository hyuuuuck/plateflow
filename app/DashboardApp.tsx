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
              {page === "settings" && <Settings />}
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

function Settings() {
  const items = [["▱", "도면번호 규칙", "연도, 고객사와 일련번호 조합을 설정합니다.", "DWG-{YYMM}-{SEQ}"], ["₩", "단가 승인", "변경폭과 금액에 따른 승인 단계를 관리합니다.", "10% 이상 관리자 승인"], ["▤", "거래명세서", "발급 양식과 월마감일을 설정합니다.", "매월 말일 마감"], ["♙", "사용자·권한", "관리자, 영업, 생산과 회계 권한을 구분합니다.", "등록 사용자 8명"], ["◎", "알림 규칙", "검토 지연, 납품과 CS 알림 기준을 설정합니다.", "긴급 CS 즉시 알림"], ["↺", "변경 이력", "도면, 단가와 명세서 감사로그를 확인합니다.", "최근 1년 보관"]];
  return <div className="settings">{items.map((item) => <button key={item[1]}><span>{item[0]}</span><div><h2>{item[1]}</h2><p>{item[2]}</p><small>{item[3]}</small></div><b>›</b></button>)}</div>;
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

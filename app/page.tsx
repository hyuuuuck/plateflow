import type { Metadata } from "next";
import DashboardApp from "./DashboardApp";

export const metadata: Metadata = {
  title: "업무 대시보드",
  description:
    "도면 등록, 단가 승인, 주문·납품, 거래명세서, 매출과 CS를 한 곳에서 관리합니다.",
};

export default function Home() {
  return <DashboardApp />;
}

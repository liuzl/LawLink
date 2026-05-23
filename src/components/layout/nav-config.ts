import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Wallet,
  Calendar,
  Inbox,
  Shield,
  Package,
  ClipboardCheck,
  Calculator,
  Archive,
  Settings
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

// v0.4: 一级菜单收紧 —— 收案合并到案件、利益冲突进顶栏、材料只在案件详情
// v0.8.1: 用章统一收口到"审批"（未来可扩文书内审等其他审批类型）
// v0.9: 加"收件箱"（法院短信解析）+ "保全"（财产保全 + 到期预警）
// v0.9.3: 加"快递"
export const primaryNav: NavItem[] = [
  { label: "仪表盘", href: "/", icon: LayoutDashboard },
  { label: "案件", href: "/matters", icon: FolderOpen },
  { label: "客户", href: "/clients", icon: Users },
  { label: "财务", href: "/finance", icon: Wallet },
  { label: "日程", href: "/schedule", icon: Calendar },
  { label: "保全", href: "/preservation", icon: Shield },
  { label: "快递", href: "/express", icon: Package },
  { label: "收件箱", href: "/inbox", icon: Inbox },
  { label: "审批", href: "/approvals/seals", icon: ClipboardCheck }
];

export const secondaryNav: NavItem[] = [
  { label: "工具", href: "/tools/calc", icon: Calculator },
  { label: "归档", href: "/archive", icon: Archive },
  { label: "设置", href: "/settings", icon: Settings }
];

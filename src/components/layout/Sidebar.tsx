"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  Factory,
  ShieldCheck,
  Package,
  Layers,
  Cog,
  ShoppingCart,
  Truck,
  Warehouse,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Calendar,
  ClipboardList,
  Monitor,
  FileBarChart,
  ShoppingCartIcon,
  User,
  Users,
  Shield,
  Wrench,
  Clock,
  Barcode,
  Building2,
  ClipboardCheck,
  Upload,
  Search,
  GitBranch,
  Sparkles,
  Gauge,
  AlertTriangle,
  AlertOctagon as AlertOctagonIcon,
  Award,
  Radio,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface MenuItem {
  href: string;
  label: string;
  icon: any;
  badge?: string;
  description?: string;
  roles?: string[]; // If set, only these roles can see this item. Undefined = all roles.
}

interface MenuSection {
  title: string;
  icon: any;
  items: MenuItem[];
  roles?: string[]; // If set, only these roles see this section header.
}

const ALL_ROLES = ["ADMIN", "SUPERVISOR", "QUALITY_INSPECTOR", "PLANNER", "OPERATOR"];
const MGMT_ROLES = ["ADMIN", "SUPERVISOR", "PLANNER"];
const ADMIN_ONLY = ["ADMIN"];
const MGMT_AND_QUALITY = ["ADMIN", "SUPERVISOR", "QUALITY_INSPECTOR"];

const sections: MenuSection[] = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, description: "Ringkasan KPI & status pabrik real-time" },
      { href: "/copilot", label: "AI Production Copilot", icon: Sparkles, badge: "AI", description: "Asisten AI untuk analisis & prediksi operasional", roles: MGMT_ROLES },
    ],
  },
  {
    title: "Manufacturing & Operations",
    icon: Factory,
    items: [
      { href: "/production", label: "Production Orders", icon: Factory, description: "Kelola & monitor pesanan produksi aktif", roles: MGMT_ROLES },
      { href: "/shop-floor", label: "Shop Floor Control", icon: Monitor, description: "Kontrol lantai produksi & status mesin real-time" },
      { href: "/production/work-orders", label: "Work Orders", icon: ClipboardList, description: "Work order harian per mesin & operator" },
      { href: "/production/scheduling", label: "Scheduling", icon: Calendar, description: "Jadwal produksi & alokasi kapasitas mesin", roles: MGMT_ROLES },
      { href: "/planning", label: "Production Planning", icon: Calendar, description: "MRP & perencanaan kebutuhan material", roles: MGMT_ROLES },
    ],
  },
  {
    title: "Products & Inventory",
    icon: Package,
    items: [
      { href: "/products/catalog", label: "Product Catalog", icon: ShoppingCartIcon, description: "Katalog produk jadi & manajemen SKU", roles: MGMT_ROLES },
      { href: "/bom", label: "Bill of Materials (BOM)", icon: Layers, description: "Struktur material & komponen produk", roles: MGMT_ROLES },
      { href: "/inventory", label: "Inventory Management", icon: Package, description: "Manajemen stok bahan baku & barang jadi" },
      { href: "/warehouse", label: "Warehouse Routing", icon: Warehouse, description: "Routing & alokasi lokasi gudang" },
      { href: "/barcodes", label: "Barcode Studio", icon: Barcode, description: "Desain & cetak label barcode / QR Code", roles: MGMT_ROLES },
      { href: "/traceability", label: "Lot & Traceability", icon: GitBranch, description: "Penelusuran lot produksi & rantai pasok" },
    ],
  },
  {
    title: "Quality & Maintenance",
    icon: ShieldCheck,
    items: [
      { href: "/quality", label: "Quality Control", icon: ShieldCheck, description: "QC inspection, sampling & pass/fail tracking", roles: MGMT_AND_QUALITY },
      { href: "/quality/reports", label: "Quality Reports", icon: FileBarChart, description: "Quality reports, FPY & defect analysis", roles: MGMT_AND_QUALITY },
      { href: "/quality/ncr", label: "NCR — Non-Conformance", icon: AlertTriangle, description: "Non-conformance reports, defect tracking & corrective action", roles: MGMT_AND_QUALITY },
      { href: "/machine", label: "Machines & Equipment", icon: Cog, description: "Machine registration & health monitoring", roles: MGMT_ROLES },
      { href: "/machine/telemetry", label: "IoT Live Telemetry", icon: Radio, description: "Real-time IoT sensor telemetry stream, temperature, vibration & alerts", roles: MGMT_ROLES },
      { href: "/machine/downtime", label: "Downtime Log", icon: AlertOctagonIcon, description: "Machine downtime tracking & analysis — MTTR & MTBF", roles: MGMT_ROLES },
      { href: "/maintenance", label: "Maintenance Log", icon: Wrench, description: "Preventive & corrective maintenance logs" },
      { href: "/maintenance/calendar", label: "PM Calendar & Gantt", icon: Calendar, description: "Preventive maintenance schedules & machine Gantt timeline", roles: MGMT_ROLES },
      { href: "/shifts", label: "Shift Management", icon: Clock, description: "Shift schedule management & handover", roles: MGMT_ROLES },
      { href: "/shifts/scorecard", label: "Operator Scorecard", icon: Award, description: "Operator KPI & performance evaluation — attendance & productivity", roles: MGMT_ROLES },
    ],
  },
  {
    title: "Sales & Purchasing",
    icon: ShoppingCart,
    roles: MGMT_ROLES,
    items: [
      { href: "/purchasing", label: "Purchasing Orders", icon: ShoppingCart, description: "Purchase order & penerimaan barang (GRN)" },
      { href: "/sales", label: "Sales Orders", icon: Truck, description: "Sales order & pengiriman ke pelanggan" },
      { href: "/customers", label: "Customer Accounts", icon: Users, description: "Database & akun pelanggan" },
      { href: "/suppliers", label: "Supplier Directory", icon: Building2, description: "Direktori & evaluasi performa pemasok" },
    ],
  },
  {
    title: "Finance & Analytics",
    icon: BookOpen,
    roles: MGMT_ROLES,
    items: [
      { href: "/analytics/oee", label: "Real-Time OEE Analytics", icon: Gauge, description: "Dashboard OEE real-time per mesin & lini" },
      { href: "/accounting", label: "General Ledger", icon: BookOpen, description: "Akuntansi double-entry & laporan keuangan", roles: ADMIN_ONLY },
      { href: "/cost-analysis", label: "Cost Analysis", icon: BarChart3, description: "Analisis biaya produksi, HPP & profitabilitas", roles: MGMT_ROLES },
      { href: "/reports", label: "Reports & Analytics", icon: FileBarChart, description: "Laporan komprehensif semua modul" },
      { href: "/import", label: "Data Import", icon: Upload, description: "Impor data massal dari file CSV / Excel", roles: ADMIN_ONLY },
    ],
  },
  {
    title: "Administration",
    icon: Shield,
    roles: ADMIN_ONLY,
    items: [
      { href: "/admin/users", label: "User Management", icon: Users, description: "Manage users, roles & access permissions", roles: ADMIN_ONLY },
      { href: "/admin/approvals", label: "Approval Queue", icon: ClipboardCheck, description: "Document & transaction approval queue", roles: ["ADMIN", "SUPERVISOR"] },
      { href: "/admin/audit", label: "Audit Trail", icon: Shield, description: "System activity log & data change history", roles: ADMIN_ONLY },
      { href: "/settings", label: "System Settings", icon: Settings, description: "System config, AI Copilot & factory setup", roles: ADMIN_ONLY },
    ],
  },
];

// ─── Reusable Portal Tooltip Component ────────────────────────────────────────
interface TooltipProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function Tooltip({ label, description, children, disabled = false }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const show = () => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setPos({
      top: rect.top + rect.height / 2,
      left: rect.right + 12,
    });
    timerRef.current = setTimeout(() => {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
    }, 100);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => setMounted(false), 180);
  };

  if (disabled) return <>{children}</>;

  const portalContent = mounted && typeof document !== "undefined"
    ? createPortal(
        <div
            role="tooltip"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              transform: `translateY(-50%) translateX(${visible ? "0px" : "-6px"})`,
              opacity: visible ? 1 : 0,
              transition: "opacity 170ms ease, transform 170ms ease",
              zIndex: 9999,
              pointerEvents: "none",
            }}
          >
            {/* Arrow */}
            <div
              style={{
                position: "absolute",
                left: -6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 0,
                height: 0,
                borderTop: "5px solid transparent",
                borderBottom: "5px solid transparent",
                borderRight: "6px solid #1e293b",
              }}
            />
            {/* Bubble */}
            <div
              style={{
                background: "#1e293b",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 12,
                padding: description ? "8px 12px" : "6px 12px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
                minWidth: 140,
                maxWidth: 220,
              }}
            >
              <p style={{ color: "#fff", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", margin: 0 }}>
                {label}
              </p>
              {description && (
                <p style={{ color: "rgba(255,255,255,0.50)", fontSize: 11, fontWeight: 500, marginTop: 3, lineHeight: 1.4, margin: "3px 0 0" }}>
                  {description}
                </p>
              )}
            </div>
          </div>,
        document.body
      )
    : null;

  return (
    <div ref={wrapRef} onMouseEnter={show} onMouseLeave={hide} style={{ position: "relative" }}>
      {children}
      {portalContent}
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("OPERATOR"); // default conservative

  // Fetch current user session to get role
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.role) setUserRole(json.data.role);
      })
      .catch(() => {});
  }, []);

  const canAccess = (roles?: string[]) =>
    !roles || roles.includes(userRole);

  // Expanded accordion sections state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sections.forEach((sec) => {
      const hasActive = sec.items.some(
        (item) => item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href))
      );
      initial[sec.title] = hasActive || sec.title === "Overview" || sec.title === "Manufacturing & Operations";
    });
    return initial;
  });

  // Auto expand when route changes
  useEffect(() => {
    sections.forEach((sec) => {
      const hasActive = sec.items.some(
        (item) => item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href))
      );
      if (hasActive) {
        setOpenSections((prev) => ({ ...prev, [sec.title]: true }));
      }
    });
  }, [pathname]);

  const toggleSection = (title: string) => {
    if (collapsed) setCollapsed(false);
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isFilterActive = filterQuery.trim().length > 0;

  return (
    <aside
      className={`relative flex flex-col bg-surface-900/[0.97] backdrop-blur-xl text-white h-screen overflow-hidden transition-all duration-300 ease-in-out select-none border-r border-white/[0.06] flex-shrink-0 ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div
        className={`flex items-center border-b border-white/[0.06] ${
          collapsed ? "justify-center px-2 py-4" : "justify-between px-5 py-4"
        }`}
      >
        {!collapsed && (
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:scale-105 transition-transform">
              <Factory size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1">
                MES <span className="text-[10px] bg-primary-500/30 text-primary-300 px-1.5 py-0.2 rounded font-mono">PRO</span>
              </h1>
              <p className="text-[10px] text-white/40 font-medium tracking-widest uppercase">Smart Factory</p>
            </div>
          </Link>
        )}
        {collapsed && (
          <Tooltip label="MES PRO" description="Smart Factory System">
            <Link href="/" className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Factory size={18} className="text-white" />
            </Link>
          </Tooltip>
        )}

        <Tooltip
          label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`${
              collapsed ? "absolute -right-3 top-5" : ""
            } w-6 h-6 rounded-full bg-surface-800 hover:bg-surface-700 border border-white/10 flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-md`}
          >
            {collapsed ? (
              <ChevronRight size={13} className="text-white/80" />
            ) : (
              <ChevronLeft size={13} className="text-white/80" />
            )}
          </button>
        </Tooltip>
      </div>

      {/* Quick Search Filter */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search menus..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary-400 focus:bg-white/[0.08] transition-all"
            />
          </div>
        </div>
      )}

      {/* Menu Sections List */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
      {sections.map((section) => {
          // Hide the entire section if the user's role isn't allowed
          if (!canAccess(section.roles)) return null;

          const accessibleItems = section.items.filter((item) => canAccess(item.roles));
          const matchingItems = accessibleItems.filter((item) =>
            !isFilterActive || item.label.toLowerCase().includes(filterQuery.toLowerCase())
          );

          if (matchingItems.length === 0) return null;

          const isOpen = isFilterActive ? true : !!openSections[section.title];
          const hasActiveChild = accessibleItems.some(
            (item) => item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href))
          );

          return (
            <div key={section.title} className="space-y-0.5">
              {/* Section Header */}
              {!collapsed && (
                <Tooltip
                  label={section.title}
                  disabled={!collapsed}
                >
                  <button
                    onClick={() => toggleSection(section.title)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wider uppercase transition-colors ${
                      hasActiveChild ? "text-primary-400 font-semibold" : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <section.icon size={13} className={hasActiveChild ? "text-primary-400" : "text-white/30"} />
                      <span className="truncate">{section.title}</span>
                    </div>
                    {!isFilterActive && (
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-200 text-white/30 ${isOpen ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>
                </Tooltip>
              )}

              {/* Items List */}
              {(isOpen || collapsed) && (
                <div className={`space-y-0.5 ${!collapsed ? "pl-1 border-l border-white/[0.06] ml-2" : ""}`}>
                  {matchingItems.map((item) => {
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname === item.href || pathname.startsWith(item.href + "/");

                    return (
                      <Tooltip
                        key={item.href}
                        label={item.label}
                        description={item.description}
                        disabled={!collapsed}
                      >
                        <Link
                          href={item.href}
                          onMouseEnter={() => setHoveredItem(item.href)}
                          onMouseLeave={() => setHoveredItem(null)}
                          className={`group relative flex items-center gap-3 rounded-xl transition-all duration-200 ${
                            collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"
                          } ${
                            isActive
                              ? "bg-primary-500/20 text-primary-300 font-semibold shadow-sm shadow-primary-500/10"
                              : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                          }`}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-primary-400 rounded-r-full" />
                          )}
                          <item.icon
                            size={17}
                            className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                              isActive ? "text-primary-400" : "text-white/40 group-hover:text-white/80"
                            }`}
                          />
                          {!collapsed && (
                            <div className="flex-1 flex items-center justify-between min-w-0">
                              <span className={`text-[12.5px] truncate ${isActive ? "text-primary-200" : ""}`}>
                                {item.label}
                              </span>
                              {item.badge && (
                                <span className="text-[9px] font-extrabold bg-primary-500/30 text-primary-300 border border-primary-400/40 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          )}
                        </Link>
                      </Tooltip>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

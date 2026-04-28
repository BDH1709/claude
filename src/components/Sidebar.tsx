"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Cpu,
  MessageSquare,
  FileText,
  Swords,
  Dumbbell,
  TrendingUp,
  LogOut,
} from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/dashboard",         label: "Overview",    icon: LayoutDashboard, badge: null,   exact: true },
  { href: "/dashboard/server",  label: "Server",      icon: Cpu,             badge: null,   exact: false },
  { href: "/dashboard/chat",    label: "AI Chat",     icon: MessageSquare,   badge: null,   exact: false },
  { href: "/dashboard/notes",   label: "Notes",       icon: FileText,        badge: null,   exact: false },
  { href: "/dashboard/pokemon", label: "Pokémon",     icon: Swords,          badge: "soon", exact: false },
  { href: "/dashboard/sport",   label: "Gym",         icon: Dumbbell,        badge: "soon", exact: false },
  { href: "/dashboard/finance", label: "Finance",     icon: TrendingUp,      badge: "soon", exact: false },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-52 shrink-0 flex flex-col h-screen sticky top-0 border-r border-border"
      style={{ background: "rgba(6, 13, 20, 0.95)", backdropFilter: "blur(8px)" }}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <div className="font-mono text-sm font-bold text-accent-blue text-glow-blue tracking-widest">
          BDH1709
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="status-dot online" />
          <span className="font-mono text-xs text-text-muted">System online</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="px-2 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, badge, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(href + "/");

            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "group flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all relative overflow-hidden",
                  active
                    ? "text-text-primary"
                    : "text-text-muted hover:text-text-secondary"
                )}
                style={
                  active
                    ? {
                        background: "rgba(88,166,255,0.08)",
                        borderLeft: "2px solid #58a6ff",
                        boxShadow: "inset 0 0 20px rgba(88,166,255,0.05)",
                      }
                    : { borderLeft: "2px solid transparent" }
                }
              >
                <Icon
                  className={clsx(
                    "w-4 h-4 shrink-0 transition-colors",
                    active ? "text-accent-blue" : "text-text-muted group-hover:text-text-secondary"
                  )}
                  style={active ? { filter: "drop-shadow(0 0 4px rgba(88,166,255,0.6))" } : {}}
                />
                <span className="flex-1 truncate font-mono text-xs tracking-wide">
                  {label}
                </span>
                {badge && (
                  <span className="text-xs font-mono text-accent-orange border border-accent-orange border-opacity-40 rounded px-1 py-0 leading-4 text-[10px]">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Divider */}
      <div className="px-4 mb-1">
        <div className="h-px bg-border opacity-60" />
      </div>

      {/* Logout */}
      <div className="p-2 pb-4">
        <a
          href="/api/logout"
          className="flex items-center gap-3 px-3 py-2.5 rounded text-text-muted hover:text-accent-red transition-all font-mono text-xs tracking-wide"
          style={{ borderLeft: "2px solid transparent" }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Log out
        </a>
      </div>
    </aside>
  );
}

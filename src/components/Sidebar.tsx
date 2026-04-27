"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Cpu,
  MessageSquare,
  FileText,
  Swords,
  Dumbbell,
  TrendingUp,
  LogOut,
  Terminal,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";

const navItems = [
  {
    href: "/dashboard/server",
    label: "Server",
    icon: Cpu,
    badge: null,
  },
  {
    href: "/dashboard/chat",
    label: "AI Chat",
    icon: MessageSquare,
    badge: null,
  },
  {
    href: "/dashboard/notes",
    label: "Notes",
    icon: FileText,
    badge: null,
  },
  {
    href: "/dashboard/pokemon",
    label: "Pokémon",
    icon: Swords,
    badge: "soon",
  },
  {
    href: "/dashboard/sport",
    label: "Sport / Gym",
    icon: Dumbbell,
    badge: "soon",
  },
  {
    href: "/dashboard/finance",
    label: "Finance",
    icon: TrendingUp,
    badge: "soon",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-bg-secondary border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2 group">
          <Terminal className="w-4 h-4 text-accent-green" />
          <span className="font-mono text-sm font-semibold text-text-primary group-hover:text-accent-green transition-colors">
            bdh1709
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="px-2 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors group",
                  active
                    ? "bg-bg-tertiary text-text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                )}
              >
                <Icon
                  className={clsx(
                    "w-4 h-4 shrink-0 transition-colors",
                    active ? "text-accent-blue" : "text-text-muted group-hover:text-text-secondary"
                  )}
                />
                <span className="flex-1 truncate">{label}</span>
                {badge && (
                  <span className="text-xs font-mono text-text-muted border border-border rounded px-1 py-0 leading-4">
                    {badge}
                  </span>
                )}
                {active && (
                  <ChevronRight className="w-3 h-3 text-accent-blue shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2">
        <a
          href="/api/logout"
          className="flex items-center gap-3 px-3 py-2 rounded text-sm text-text-muted hover:text-accent-red hover:bg-bg-tertiary transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </a>
      </div>
    </aside>
  );
}

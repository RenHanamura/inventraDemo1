import {
  LayoutDashboard,
  ArrowLeftRight,
  Building2,
  Settings,
  Menu,
  X,
  MapPin,
  FileText,
  Package,
  ClipboardList,
  Shield,
  Users,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import inventraLogoWhite from "@/assets/inventra-logo-white.svg";

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  const { organization } = useOrganization();
  const { roleLabel, isSuperAdmin } = useUserRole();
  const { t } = useLanguage();

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: "/inventory", icon: Package, label: t('nav.inventory') },
    { to: "/movements", icon: ArrowLeftRight, label: t('nav.movements') },
    { to: "/locations", icon: MapPin, label: t('nav.locations') },
    { to: "/suppliers", icon: Building2, label: t('nav.suppliers') },
    { to: "/audit-logs", icon: FileText, label: t('nav.auditLogs') },
    { to: "/reports", icon: ClipboardList, label: t('nav.reports') },
    { to: "/settings", icon: Settings, label: t('nav.settings') },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-sidebar text-sidebar-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-sidebar-accent lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            {organization?.logo_url ? (
              <img src={organization.logo_url} alt={organization.name} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <img src={inventraLogoWhite} alt="Inventra" className="h-8 w-auto" />
            )}
            <span className="text-xl font-bold truncate">{organization?.name || "Inventra"}</span>
          </div>
          <p className="text-xs text-sidebar-foreground/50 mt-1 ml-0.5">by Ciméntica Solutions</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors hyphens-auto"
              activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
              onClick={() => setIsOpen(false)}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-sidebar-foreground/50" />
            <Badge variant={isSuperAdmin ? "default" : "secondary"} className="text-xs">
              {roleLabel}
            </Badge>
          </div>
          <div className="text-xs text-sidebar-foreground/50">Powered by Ciméntica Solutions</div>
        </div>
      </aside>
    </>
  );
}
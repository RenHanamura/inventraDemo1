import { useState, useEffect } from "react";
import { Menu, Moon, Sun, Settings, Building2, FileText, Sparkles, UsersRound, Globe } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useGenerateNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SuiteMenu } from "./SuiteMenu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLanguage, LANGUAGE_LABELS, LANGUAGE_FLAGS, type Language } from "@/contexts/LanguageContext";
import inventraLogo from "@/assets/inventra-logo.svg";
import inventraLogoWhite from "@/assets/inventra-logo-white.svg";

interface HeaderProps {
  onOpenAI?: () => void;
}

export function Header({ onOpenAI }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const generateNotifications = useGenerateNotifications();
  const { language, setLanguage, t } = useLanguage();

  const secondaryNavItems = [
    { to: "/suppliers", icon: Building2, label: t('header.suppliers') },
    { to: "/audit-logs", icon: FileText, label: t('header.auditLogs') },
    { to: "/team", icon: UsersRound, label: t('header.team') },
    { to: "/settings", icon: Settings, label: t('header.settings') },
  ];

  useEffect(() => {
    if (user) {
      generateNotifications.mutate();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const userInitials =
    user?.user_metadata?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    "U";

  const handleNavigate = (to: string) => {
    navigate(to);
    setIsMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const languages: Language[] = ['es', 'en', 'de'];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src={theme === "dark" ? inventraLogoWhite : inventraLogo} alt="Inventra" className="h-7 w-auto" />
          <span className="font-bold text-lg hidden sm:block">Inventra</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <span className="text-base">{LANGUAGE_FLAGS[language]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover z-50">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={cn("gap-2 cursor-pointer", language === lang && "font-semibold bg-accent/50")}
                >
                  <span>{LANGUAGE_FLAGS[lang]}</span>
                  <span>{LANGUAGE_LABELS[lang]}</span>
                  {language === lang && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <NotificationBell />

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-10 w-10">
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          {/* AI Assistant Button */}
          {onOpenAI && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onOpenAI} className="h-10 w-10 relative">
                    <Sparkles className="h-5 w-5" />
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('ai.assistant')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Suite Menu (Waffle) */}
          <SuiteMenu />

          {/* Menu Button */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>{t('common.menu')}</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-2">
                {secondaryNavItems.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <button
                      key={item.to}
                      onClick={() => handleNavigate(item.to)}
                      className={cn(
                        "flex items-center gap-3 w-full px-4 py-4 rounded-xl transition-colors touch-manipulation",
                        isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground",
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}

                <div className="border-t border-border my-4" />

                {/* User Info */}
                {user && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-xl">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">{t('common.signedInAs')}</p>
                      <p className="font-medium truncate">{user.email}</p>
                    </div>
                  </div>
                )}

                {/* Sign Out */}
                <Button variant="outline" className="w-full h-12 mt-4" onClick={handleSignOut}>
                  {t('common.signOut')}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
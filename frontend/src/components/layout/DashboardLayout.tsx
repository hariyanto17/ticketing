"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearCredentials, setSessionUser } from "@/store/authSlice";
import { useLogoutMutation, useMeQuery } from "@/services/authApi";
import { useToast } from "@/components/ui/toast";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Menu as MenuIcon,
  X,
  Sun,
  Moon,
  ChevronDown,
  User as UserIcon,
  Film,
  Tv,
  Calendar,
  Ticket,
  Receipt,
  ShieldCheck,
  Settings,
} from "lucide-react";
import Link from "next/link";

import { useTheme } from "@/components/ThemeProvider";
import { useTranslation } from "@/lib/i18n";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { error: toastError, success: toastSuccess } = useToast();
  const [logout] = useLogoutMutation();
  const { data: sessionResponse, isLoading: isSessionLoading, isError: isSessionError } = useMeQuery();

  const user = useAppSelector((state) => state.auth.user);
  const authStatus = useAppSelector((state) => state.auth.status);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  const { theme, setTheme } = useTheme();
  const { t, locale, setLocale, localeLabel } = useTranslation();

  useEffect(() => {
    if (sessionResponse?.data.user) {
      dispatch(setSessionUser(sessionResponse.data.user));
    }
  }, [dispatch, sessionResponse]);

  useEffect(() => {
    if (isSessionError) {
      dispatch(clearCredentials());
      router.replace("/login");
    }
  }, [dispatch, isSessionError, router]);

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      dispatch(clearCredentials());
      toastSuccess(t("auth.logoutSuccess"));
      router.push("/login");
    } catch (err: any) {
      toastError(t("auth.logoutFailed"));
    }
  };

  const allMenuItems = [
    { name: t("nav.dashboard"), href: "/admin/dashboard", icon: <LayoutDashboard className="w-5 h-5" />, allowedRoles: ["Admin", "Cashier"] },
    { name: t("nav.users"), href: "/admin/users", icon: <Users className="w-5 h-5" />, allowedRoles: ["Admin"] },
    { name: t("nav.movies"), href: "/admin/movies", icon: <Film className="w-5 h-5" />, allowedRoles: ["Admin"] },
    { name: t("nav.studios"), href: "/admin/studios", icon: <Tv className="w-5 h-5" />, allowedRoles: ["Admin"] },
    { name: t("nav.schedules"), href: "/admin/schedules", icon: <Calendar className="w-5 h-5" />, allowedRoles: ["Admin"] },
    { name: t("nav.ticketSales"), href: "/admin/cashier", icon: <Ticket className="w-5 h-5" />, allowedRoles: ["Admin", "Cashier"] },
    { name: t("nav.transactions"), href: "/admin/transactions", icon: <Receipt className="w-5 h-5" />, allowedRoles: ["Admin", "Cashier"] },
    { name: t("nav.gateValidator"), href: "/admin/tickets/validate", icon: <ShieldCheck className="w-5 h-5" />, allowedRoles: ["Admin", "Cashier"] },
    { name: t("nav.onlineBookings"), href: "/admin/bookings", icon: <Ticket className="w-5 h-5" />, allowedRoles: ["Admin"] },
    { name: t("nav.dailyClosing"), href: "/admin/closing", icon: <Calendar className="w-5 h-5" />, allowedRoles: ["Admin"] },
    { name: t("nav.reports"), href: "/admin/reports", icon: <LayoutDashboard className="w-5 h-5" />, allowedRoles: ["Admin"] },
    { name: t("nav.printerSetup"), href: "/admin/settings/printer", icon: <Settings className="w-5 h-5" />, allowedRoles: ["Admin"] },
    { name: t("nav.settings"), href: "/admin/settings", icon: <Settings className="w-5 h-5" />, allowedRoles: ["Admin"] },
  ];

  const menuItems = allMenuItems.filter((item) => user?.role && item.allowedRoles.includes(user.role));

  if (authStatus === "initializing" || isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400">
        {t("auth.checkingSession")}
      </div>
    );
  }

  if (authStatus !== "authenticated" || !user) {
    return null;
  }

  // Breadcrumbs builder
  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter(Boolean);
    return paths.map((path, idx) => {
      const url = `/${paths.slice(0, idx + 1).join("/")}`;
      const isLast = idx === paths.length - 1;
      const formattedName = path.charAt(0).toUpperCase() + path.slice(1);
      
      return (
        <React.Fragment key={url}>
          <span className="text-zinc-400">/</span>
          {isLast ? (
            <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{formattedName}</span>
          ) : (
            <Link href={url} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
              {formattedName}
            </Link>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-800 dark:text-zinc-200 transition-colors duration-200">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
        {/* Sidebar Brand */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-150 dark:border-zinc-800 bg-indigo-600 text-white font-bold text-lg tracking-wide rounded-br-2xl">
          🎬 Planet Cinema
        </div>
        
        {/* Sidebar Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-950 dark:hover:text-zinc-100"
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            {t("common.signOut")}
          </button>
        </div>
      </aside>

      {/* Sidebar for Mobile overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden bg-black/50" onClick={() => setIsSidebarOpen(false)}>
          <aside className="w-64 h-full bg-white dark:bg-zinc-900 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 bg-indigo-600 text-white font-bold">
              <span>🎬 Planet Cinema</span>
              <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-950 dark:hover:text-zinc-100"
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
                {t("common.signOut")}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg md:hidden hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            
            {/* Breadcrumbs */}
            <div className="hidden sm:flex items-center gap-2 text-sm text-zinc-500">
              <span className="font-medium text-zinc-600 dark:text-zinc-400">{t("common.cinema")}</span>
              {getBreadcrumbs()}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer flex items-center gap-2 text-xs font-bold"
                title={t("common.selectLanguage")}
                aria-label={t("common.selectLanguage")}
              >
                <span>{localeLabel}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isLanguageMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsLanguageMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-lg py-1.5 z-50 text-xs font-semibold">
                    <button
                      onClick={() => {
                        setLocale("id");
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer ${locale === "id" ? "text-indigo-650 dark:text-indigo-400 font-bold" : "text-zinc-700 dark:text-zinc-300"}`}
                    >
                      Bahasa Indonesia
                    </button>
                    <button
                      onClick={() => {
                        setLocale("en");
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer ${locale === "en" ? "text-indigo-650 dark:text-indigo-400 font-bold" : "text-zinc-700 dark:text-zinc-300"}`}
                    >
                      English
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Theme Dropdown Selector */}
            <div className="relative">
              <button
                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer flex items-center justify-center gap-1 text-xs font-bold"
                title={t("theme.selectTheme")}
                aria-label={t("theme.selectTheme")}
              >
                {theme === "light" && <Sun className="w-4 h-4" />}
                {theme === "dark" && <Moon className="w-4 h-4" />}
                {theme === "system" && <span>💻 Sys</span>}
              </button>

              {isThemeMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsThemeMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-lg py-1.5 z-50 text-xs font-semibold">
                    <button
                      onClick={() => {
                        setTheme("light");
                        setIsThemeMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer ${theme === "light" ? "text-indigo-650 dark:text-indigo-400 font-bold" : "text-zinc-700 dark:text-zinc-300"}`}
                    >
                      <Sun className="w-3.5 h-3.5" /> {t("theme.light")}
                    </button>
                    <button
                      onClick={() => {
                        setTheme("dark");
                        setIsThemeMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer ${theme === "dark" ? "text-indigo-650 dark:text-indigo-400 font-bold" : "text-zinc-700 dark:text-zinc-300"}`}
                    >
                      <Moon className="w-3.5 h-3.5" /> {t("theme.dark")}
                    </button>
                    <button
                      onClick={() => {
                        setTheme("system");
                        setIsThemeMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer ${theme === "system" ? "text-indigo-650 dark:text-indigo-400 font-bold" : "text-zinc-700 dark:text-zinc-300"}`}
                    >
                      💻 {t("theme.system")}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-sm font-medium transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                </div>
                <span className="max-w-[80px] truncate hidden md:inline">{user?.name || "Profile"}</span>
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              </button>

              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-lg z-20 py-2">
                    <div className="px-4 py-2 border-b border-zinc-150 dark:border-zinc-800">
                      <p className="text-xs text-zinc-400">Signed in as</p>
                      <p className="font-semibold text-sm truncate">{user?.email || "admin"}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      {t("common.signOut")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Page Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-[1720px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

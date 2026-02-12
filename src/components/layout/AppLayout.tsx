import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    PenTool,
    BarChart3,
    Settings,
    Users,
    Database,
    LogOut,
    User as UserIcon,
    Moon,
    Sun,
    Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
    { href: "/", label: "總覽", icon: LayoutDashboard, roles: ['admin', 'user'] },
    { href: "/input", label: "數據輸入", icon: PenTool, roles: ['admin'] },
    { href: "/report", label: "報表查詢", icon: BarChart3, roles: ['admin', 'user'] },
    { href: "/downtime", label: "停機管理", icon: Wrench, roles: ['admin'] },
    { href: "/settings", label: "設定", icon: Settings, roles: ['admin'] },
    { href: "/users", label: "用戶管理", icon: Users, roles: ['admin'] },
    { href: "/data", label: "資料管理", icon: Database, roles: ['admin'] },
];


export default function AppLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Dark mode state - shared across app
    const [darkMode, setDarkMode] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('theme');
            if (stored) return stored === 'dark';
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    // Apply dark mode class to document
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    const filteredNavItems = navItems.filter(item =>
        !item.roles || (user && item.roles.includes(user.role))
    );

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-secondary/30">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-6">
                        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
                            <span className="hidden md:inline-block">焚化廠營運數據管理系統</span>
                            <span className="md:hidden">焚化廠系統</span>
                        </Link>
                        <nav className="hidden md:flex items-center gap-1">
                            {filteredNavItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        to={item.href}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                            isActive
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Theme Toggle Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDarkMode(!darkMode)}
                            className="h-9 w-9"
                            title={darkMode ? '切換淺色模式' : '切換深色模式'}
                        >
                            {darkMode ? (
                                <Sun className="h-4 w-4 text-amber-500" />
                            ) : (
                                <Moon className="h-4 w-4 text-indigo-500" />
                            )}
                        </Button>
                        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                            <UserIcon className="h-4 w-4" />
                            <span>{user?.username} ({user?.role === 'admin' ? '管理者' : '使用者'})</span>
                        </div>
                        <Button variant="ghost" size="sm" className="gap-2" onClick={handleLogout}>
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">登出</span>
                        </Button>
                    </div>
                </div>

            </header>
            <main className="container py-6 px-4 pb-24 md:pb-6">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation - Fixed */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t shadow-lg">
                <nav className="flex items-center gap-1 p-2 overflow-x-auto w-full no-scrollbar">
                    {filteredNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[10px] font-medium rounded-lg transition-all min-w-[64px] shrink-0",
                                    isActive
                                        ? "bg-primary/15 text-primary scale-105"
                                        : "text-muted-foreground active:scale-95"
                                )}
                            >
                                <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                                <span className="truncate w-full text-center">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}

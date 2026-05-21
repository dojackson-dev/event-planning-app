'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PromoterLayout;
var react_1 = require("react");
var link_1 = require("next/link");
var navigation_1 = require("next/navigation");
var lucide_react_1 = require("lucide-react");
var AuthContext_1 = require("@/contexts/AuthContext");
var RoleSwitcher_1 = require("@/components/RoleSwitcher");
function PromoterLayout(_a) {
    var children = _a.children;
    var pathname = (0, navigation_1.usePathname)();
    var router = (0, navigation_1.useRouter)();
    var _b = (0, AuthContext_1.useAuth)(), user = _b.user, loading = _b.loading, logout = _b.logout;
    var _c = (0, react_1.useState)(false), sidebarOpen = _c[0], setSidebarOpen = _c[1];
    (0, react_1.useEffect)(function () {
        if (!loading && !user) {
            router.push('/promoter/login');
        }
    }, [user, loading, router]);
    var navItems = [
        { href: '/dashboard/promoter', label: 'Dashboard', icon: <lucide_react_1.Home className="h-5 w-5"/> },
        { href: '/dashboard/promoter/events', label: 'Events', icon: <lucide_react_1.Calendar className="h-5 w-5"/> },
        { href: '/dashboard/promoter/artists', label: 'Book Artists', icon: <lucide_react_1.Mic2 className="h-5 w-5"/> },
        { href: '/dashboard/promoter/invoices', label: 'Invoices', icon: <lucide_react_1.FileText className="h-5 w-5"/> },
        { href: '/dashboard/promoter/bookings', label: 'Bookings', icon: <lucide_react_1.Users className="h-5 w-5"/> },
        { href: '/dashboard/promoter/billing', label: 'Billing', icon: <lucide_react_1.CreditCard className="h-5 w-5"/> },
        { href: '/dashboard/promoter/profile', label: 'Profile', icon: <lucide_react_1.Settings className="h-5 w-5"/> },
    ];
    return (<div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={"fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out z-50 ".concat(sidebarOpen ? 'translate-x-0' : '-translate-x-full', " md:translate-x-0 md:static")}>
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200">
          <link_1.default href="/dashboard/promoter" className="flex items-center gap-2 font-bold text-gray-900">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <lucide_react_1.Megaphone className="h-5 w-5 text-purple-600"/>
            </div>
            <span className="hidden sm:inline">Promoter</span>
          </link_1.default>
          <button onClick={function () { return setSidebarOpen(false); }} className="md:hidden text-gray-500 hover:text-gray-700">
            <lucide_react_1.X className="h-5 w-5"/>
          </button>
        </div>

        {/* Navigation */}
        <RoleSwitcher_1.default variant="sidebar"/>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map(function (item) {
            var isActive = pathname === item.href;
            return (<link_1.default key={item.href} href={item.href} className={"flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ".concat(isActive
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-700 hover:bg-gray-50')} onClick={function () { return setSidebarOpen(false); }}>
                <div className="flex items-center gap-3">
                  {item.icon}
                  {item.label}
                </div>
                {item.badge && (<span className="bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {item.badge}
                  </span>)}
              </link_1.default>);
        })}
        </nav>

        {/* Logout */}
        <div className="px-4 py-4 border-t border-gray-200">
          <button onClick={function () {
            logout();
            setSidebarOpen(false);
        }} className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <lucide_react_1.LogOut className="h-5 w-5"/>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <button onClick={function () { return setSidebarOpen(!sidebarOpen); }} className="md:hidden text-gray-500 hover:text-gray-700">
            <lucide_react_1.Menu className="h-6 w-6"/>
          </button>
          <div className="flex-1"/>
          <div className="flex items-center gap-4">
            {user && (<span className="text-sm text-gray-600 hidden sm:block">
                {user.firstName} {user.lastName}
              </span>)}
            <link_1.default href="/dashboard/promoter/profile" className="text-sm text-gray-600 hover:text-gray-900">
              Account Settings
            </link_1.default>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-40" onClick={function () { return setSidebarOpen(false); }}/>)}
    </div>);
}

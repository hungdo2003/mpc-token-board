import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/transfer", label: "Send Tokens", icon: "💸", adminOnly: true },
  { to: "/bulk", label: "Bulk Distribution", icon: "📦", adminOnly: true },
  { to: "/transactions", label: "Transactions", icon: "📋" },
  { to: "/tokens", label: "Tokens", icon: "🪙", adminOnly: true },
  { to: "/users", label: "Users", icon: "👥", adminOnly: true },
  { to: "/audit-logs", label: "Audit Logs", icon: "🔍", adminOnly: true },
];

export function Sidebar() {
  const { isAdmin } = useAuth();

  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col min-h-screen">
      <div className="px-6 py-5 border-b border-gray-800">
        <h1 className="text-lg font-bold text-violet-400">MPC Token Board</h1>
        <p className="text-xs text-gray-500 mt-0.5">Distribution System</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon, adminOnly }) => {
          if (adminOnly && !isAdmin) return null;
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-violet-600/20 text-violet-400"
                    : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

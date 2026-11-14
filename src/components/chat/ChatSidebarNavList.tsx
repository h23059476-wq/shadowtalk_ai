import { NavLink, useLocation } from "react-router-dom";
import { motion, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";
import { CHAT_SIDEBAR_NAV, type ChatSidebarNavItem } from "@/lib/chatSidebarNav";
import { useSettingsMotion } from "@/hooks/useSettingsMotion";
import { settingsHapticTick } from "@/lib/settingsFeedback";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatSidebarNavListProps {
  collapsed: boolean;
  onItemClick?: () => void;
}

function NavRow({
  item,
  collapsed,
  active,
  onItemClick,
}: {
  item: ChatSidebarNavItem;
  collapsed: boolean;
  active: boolean;
  onItemClick?: () => void;
}) {
  const { spring } = useSettingsMotion();
  const Icon = item.icon;
  const label = collapsed ? item.shortLabel ?? item.label : item.label;

  const inner = (
    <motion.span
      className={cn(
        "group relative flex items-center rounded-lg text-[13px] transition-colors duration-150 py-2 overflow-hidden",
        collapsed ? "justify-center w-10 mx-auto px-0" : "space-x-2.5 px-2.5 w-full",
        active
          ? "bg-white/[0.08] text-white font-medium"
          : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]",
      )}
      whileTap={{ scale: 0.97 }}
      transition={spring}
    >
      <Icon
        className={cn(
          "relative z-10 h-4 w-4 shrink-0",
          active ? "text-sky-400" : "text-slate-400 group-hover:text-slate-300",
        )}
      />
      <motion.span
        animate={{
          opacity: collapsed ? 0 : 1,
          width: collapsed ? 0 : "auto",
        }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative z-10 flex-1 truncate overflow-hidden whitespace-nowrap text-left"
      >
        {label}
      </motion.span>
      {item.badge && !collapsed && (
        <span
          className={cn(
            "relative z-10 text-[9px] font-semibold px-1 py-0.5 rounded border overflow-hidden whitespace-nowrap",
            item.badge === "VERIFIED"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-purple-500/10 text-purple-400 border-purple-500/20",
          )}
        >
          {item.badge}
        </span>
      )}
      {active && !item.badge && (
        <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-sky-400 shadow-sm shrink-0" />
      )}
    </motion.span>
  );

  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={() => {
        settingsHapticTick();
        onItemClick?.();
      }}
      className="block select-none"
    >
      {inner}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export function ChatSidebarNavList({ collapsed, onItemClick }: ChatSidebarNavListProps) {
  const location = useLocation();
  const { staggerList, staggerItem } = useSettingsMotion();

  const isActive = (item: ChatSidebarNavItem) => {
    const [itemPath, itemQuery] = item.to.split("?");
    const pathOk = item.end
      ? location.pathname === itemPath
      : location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
    if (!pathOk) return false;
    if (!itemQuery) return true;
    const expected = new URLSearchParams(itemQuery);
    const actual = new URLSearchParams(location.search);
    for (const [key, value] of expected) {
      if (actual.get(key) !== value) return false;
    }
    return true;
  };

  const workspace = CHAT_SIDEBAR_NAV.filter((i) => i.section === "workspace");
  const explore = CHAT_SIDEBAR_NAV.filter((i) => i.section === "explore");

  const renderSection = (title: string, items: ChatSidebarNavItem[]) => (
    <div className={cn("space-y-0.5", collapsed && "space-y-1")}>
      {!collapsed && (
        <p className="px-2.5 text-[10px] font-semibold text-slate-400 tracking-wider uppercase select-none">
          {title}
        </p>
      )}
      {items.map((item) => (
        <motion.div key={item.to} variants={staggerItem}>
          <NavRow
            item={item}
            collapsed={collapsed}
            active={isActive(item)}
            onItemClick={onItemClick}
          />
        </motion.div>
      ))}
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <LayoutGroup id="chat-sidebar-nav">
        <motion.nav
          variants={staggerList}
          initial="hidden"
          animate="visible"
          className="flex-1 px-1 py-1 space-y-4 overflow-y-auto min-h-0 scrollbar-none"
        >
          {renderSection("Workspace", workspace)}
          {renderSection("Explore & Studios", explore)}
        </motion.nav>
      </LayoutGroup>
    </TooltipProvider>
  );
}

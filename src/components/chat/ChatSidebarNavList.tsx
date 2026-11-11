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
        "group relative flex items-center rounded-xl text-[13px] font-normal transition-colors duration-150 h-10 overflow-hidden",
        !active && "hover:bg-white/[0.05]",
        collapsed ? "justify-center w-10 mx-auto px-0" : "gap-3 px-3.5 w-full",
        active ? "text-cyan-200 font-medium" : "text-slate-400 hover:text-slate-100",
      )}
      whileHover={{ x: collapsed ? 0 : 3 }}
      whileTap={{ scale: 0.97 }}
      transition={spring}
    >
      {active && (
        <motion.span
          layoutId="chat-sidebar-nav-active"
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/15 via-indigo-500/10 to-transparent border border-cyan-500/25 shadow-[0_0_14px_rgba(6,182,212,0.12)]"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      <Icon
        className={cn(
          "relative z-10 h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
          active ? "text-cyan-400" : "text-slate-400 group-hover:text-cyan-300"
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
      {item.badge && (
        <motion.span
          animate={{
            opacity: collapsed ? 0 : 1,
            scale: collapsed ? 0.6 : 1,
            width: collapsed ? 0 : "auto",
          }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative z-10 text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 overflow-hidden whitespace-nowrap"
        >
          {item.badge}
        </motion.span>
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
        <p className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400/50 select-none">
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
          className="flex-1 px-1 py-1 space-y-3.5 overflow-y-auto min-h-0 scrollbar-none"
        >
          {renderSection("Workspace", workspace)}
          {renderSection("Explore & Studios", explore)}
        </motion.nav>
      </LayoutGroup>
    </TooltipProvider>
  );
}

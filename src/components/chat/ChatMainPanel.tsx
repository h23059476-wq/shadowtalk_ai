import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChatMainPanelProps {
  children: React.ReactNode;
  className?: string;
}

/** Glass content column for chat messages + composer dock. */
export function ChatMainPanel({ children, className }: ChatMainPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        "relative z-10 flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden",
        "bg-transparent border-x border-border/20",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

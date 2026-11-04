import { MessageSquare, Image, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Modes shown in the selector are general/image/document; the rest are still used internally by tools and agents. */
export type ChatMode =
  | "general" | "image" | "document"
  | "code" | "research" | "creative" | "summarize" | "debug" | "email" | "shadowspectre";

interface ModeSelectorProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  disabled?: boolean;
}

const modes: { value: ChatMode; label: string; icon: React.ReactNode; prompt: string; color: string }[] = [
  {
    value: "general",
    label: "General Chat",
    icon: <MessageSquare className="h-4 w-4" />,
    prompt: "",
    color: "text-foreground"
  },
  {
    value: "image",
    label: "Generate Image",
    icon: <Image className="h-4 w-4" />,
    prompt: "You are in image description mode. Help users craft detailed image prompts for AI generation.",
    color: "text-purple-500"
  },
  {
    value: "document",
    label: "Generate Document",
    icon: <FileText className="h-4 w-4" />,
    prompt: "You are in document generation mode. Create well-structured, professional documents including reports, proposals, memos, and articles.",
    color: "text-green-500"
  },
];

export const getModePrompt = (mode: ChatMode): string => {
  return modes.find(m => m.value === mode)?.prompt || "";
};

export const ModeSelector = ({ mode, onModeChange, disabled }: ModeSelectorProps) => {
  const currentMode = modes.find(m => m.value === mode) || modes[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-9 px-3 border-border/50 hover:border-primary/50 transition-colors"
          disabled={disabled}
        >
          <span className={currentMode.color}>{currentMode.icon}</span>
          <span className="hidden sm:inline text-sm font-medium">{currentMode.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 p-1">
        {modes.map((m) => (
          <DropdownMenuItem
            key={m.value}
            onClick={() => onModeChange(m.value)}
            className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm ${
              mode === m.value ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"
            }`}
          >
            <span className={m.color}>{m.icon}</span>
            <span>{m.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

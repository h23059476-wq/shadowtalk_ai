import { useRef, useState } from "react";
import { ImagePlus, File, X, Loader2, Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { isShadowTalkDesktop, pickAndReadTextFile } from "@/lib/desktopBridge";

interface FileUploadProps {
  onFileSelect: (file: { type: 'image' | 'file'; data: string; name: string; mimeType: string }) => void;
  selectedFile: { type: 'image' | 'file'; data: string; name: string; mimeType: string } | null;
  onClear: () => void;
  disabled?: boolean;
  variant?: "default" | "gemini" | "composer";
}

export const FileUpload = ({ onFileSelect, selectedFile, onClear, disabled, variant = "default" }: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const isDesktop = isShadowTalkDesktop();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file under 100MB",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const isImage = file.type.startsWith('image/');
        
        onFileSelect({
          type: isImage ? 'image' : 'file',
          data: base64,
          name: file.name,
          mimeType: file.type,
        });
        setIsProcessing(false);
      };
      reader.onerror = () => {
        toast({
          title: "Error reading file",
          description: "Please try again",
          variant: "destructive",
        });
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast({
        title: "Error processing file",
        description: "Please try again",
        variant: "destructive",
      });
      setIsProcessing(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDesktopPick = async () => {
    setIsProcessing(true);
    try {
      const picked = await pickAndReadTextFile();
      if (!picked) return;
      const name = picked.path.split(/[/\\]/).pop() ?? "file";
      onFileSelect({
        type: "file",
        data: picked.content,
        name,
        mimeType: "text/plain",
      });
      toast({ title: "File attached", description: name });
    } catch {
      toast({
        title: "Could not open file",
        description: "Try a smaller text or markdown file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={variant === "composer" ? "relative shadowtalk-composer__attach-wrap" : "relative"}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.docx,.pptx,.xlsx,.odt,.txt,.md,.json,.csv,.js,.ts,.tsx,.jsx,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.css,.html,.xml,.yml,.yaml,.sh,.sql,video/mp4,video/webm,video/ogg,video/quicktime,.mkv"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isProcessing}
      />
      
      {selectedFile ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
          {selectedFile.type === 'image' ? (
            <img 
              src={selectedFile.data} 
              alt={selectedFile.name} 
              className="h-8 w-8 object-cover rounded"
            />
          ) : (
            <File className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
            {selectedFile.name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={onClear}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : variant === "composer" ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isProcessing}
          className="shadowtalk-composer__attach"
          aria-label="Attach file"
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      ) : variant === "gemini" ? (
        <div className="flex items-center gap-0.5">
          {isDesktop && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDesktopPick}
              disabled={disabled || isProcessing}
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
              title="Open from computer"
            >
              <FolderOpen className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessing}
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/30 relative"
            aria-label="Attach file"
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          {isDesktop && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDesktopPick}
              disabled={disabled || isProcessing}
              className="px-2"
              title="Open from computer (native picker)"
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

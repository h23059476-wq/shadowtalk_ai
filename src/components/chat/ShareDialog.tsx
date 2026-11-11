import { useState } from "react";
import { Copy, Check, Link2, Instagram, Linkedin, Mail, Download, MessageSquare } from "lucide-react";
import { FOUNDER_SOCIAL } from "@/lib/socialLinks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  conversationTitle?: string;
}

export const ShareDialog = ({ isOpen, onClose, messages, conversationTitle }: ShareDialogProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [shareUrl] = useState(`https://shadowtalk-ai.com/share/${(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); })).slice(0, 8)}`);

  const filteredMessages = messages.filter(m => m.id !== 'welcome');

  const formatAsMarkdown = () => {
    let md = `# ${conversationTitle || 'ShadowTalk AI Conversation'}\n\n`;
    md += `*Shared on ${new Date().toLocaleDateString()}*\n\n---\n\n`;
    
    filteredMessages.forEach(msg => {
      md += `### ${msg.type === 'user' ? '👤 You' : '🤖 ShadowTalk AI'}\n\n`;
      md += `${msg.content}\n\n`;
    });
    
    return md;
  };

  const formatAsText = () => {
    let text = `${conversationTitle || 'ShadowTalk AI Conversation'}\n`;
    text += `Shared on ${new Date().toLocaleDateString()}\n`;
    text += '━'.repeat(40) + '\n\n';
    
    filteredMessages.forEach(msg => {
      text += `[${msg.type === 'user' ? 'You' : 'AI'}]\n`;
      text += `${msg.content}\n\n`;
    });
    
    return text;
  };

  const formatAsJSON = () => {
    return JSON.stringify({
      title: conversationTitle || 'ShadowTalk AI Conversation',
      exported_at: new Date().toISOString(),
      messages: filteredMessages.map(m => ({
        role: m.type,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      })),
    }, null, 2);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: `Saved as ${filename}` });
  };

  const shareVia = (platform: "linkedin" | "email") => {
    const text = `Check out this conversation with ShadowTalk AI!`;
    const urls = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      email: `mailto:?subject=${encodeURIComponent("ShadowTalk AI Conversation")}&body=${encodeURIComponent(text + "\n\n" + shareUrl)}`,
    };
    window.open(urls[platform], "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Share Conversation
          </DialogTitle>
          <DialogDescription>
            Share this conversation via link, social media, or export it.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="mt-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="link">Share Link</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="font-mono text-sm" />
              <Button onClick={() => copyToClipboard(shareUrl)} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can view this conversation.
            </p>
          </TabsContent>

          <TabsContent value="social" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-3">
              <Button variant="outline" className="flex-col gap-2 h-auto py-4" asChild>
                <a href={FOUNDER_SOCIAL.instagram.url} target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-5 w-5" />
                  <span className="text-xs">Instagram</span>
                </a>
              </Button>
              <Button
                variant="outline"
                className="flex-col gap-2 h-auto py-4"
                onClick={() => shareVia('linkedin')}
              >
                <Linkedin className="h-5 w-5" />
                <span className="text-xs">LinkedIn</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col gap-2 h-auto py-4"
                onClick={() => shareVia('email')}
              >
                <Mail className="h-5 w-5" />
                <span className="text-xs">Email</span>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="flex-col gap-2 h-auto py-4"
                onClick={() => downloadFile(formatAsMarkdown(), 'conversation.md', 'text/markdown')}
              >
                <Download className="h-5 w-5" />
                <span className="text-xs">Markdown</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col gap-2 h-auto py-4"
                onClick={() => downloadFile(formatAsText(), 'conversation.txt', 'text/plain')}
              >
                <Download className="h-5 w-5" />
                <span className="text-xs">Text</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col gap-2 h-auto py-4"
                onClick={() => downloadFile(formatAsJSON(), 'conversation.json', 'application/json')}
              >
                <Download className="h-5 w-5" />
                <span className="text-xs">JSON</span>
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Preview:</p>
              <Textarea
                readOnly
                value={formatAsText().slice(0, 500) + (formatAsText().length > 500 ? '...' : '')}
                className="font-mono text-xs h-32"
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

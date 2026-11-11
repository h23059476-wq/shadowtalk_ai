import { lazy, Suspense, useMemo } from "react";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Lazy-load the full katex renderer only when math is detected
const FullMarkdown = lazy(() => import("./FullMarkdown"));

/** Check if content contains math expressions that need KaTeX */
function hasMath(content: string): boolean {
  return /\$\$|\$[^$]+\$|\\\(|\\\[|\\\)|\\\]/.test(content);
}

interface LazyMarkdownProps {
  content?: string;
  className?: string;
  remarkPlugins?: any[];
  rehypePlugins?: any[];
  components?: Record<string, React.ComponentType<any>>;
  children?: string;
}

/**
 * Drop-in replacement for ReactMarkdown that lazy-loads KaTeX.
 *
 * - No math in content: renders with react-markdown + remark-gfm only (no katex)
 * - Math detected: lazy-loads FullMarkdown (which includes remark-math + rehype-katex)
 *
 * This keeps the 4.5MB katex dependency out of the initial chat bundle.
 */
export function LazyMarkdown(props: LazyMarkdownProps) {
  const content = props.content || props.children || "";
  const needsMath = useMemo(() => hasMath(content), [content]);

  if (!needsMath) {
    // Fast path: basic markdown without katex
    return (
      <ReactMarkdown
        remarkPlugins={props.remarkPlugins ? [remarkGfm, ...props.remarkPlugins.slice(1)] : [remarkGfm]}
        components={props.components}
      >
        {content}
      </ReactMarkdown>
    );
  }

  // Slow path: full markdown with katex (lazy-loaded)
  return (
    <Suspense fallback={
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading math renderer…
      </div>
    }>
      <FullMarkdown {...props} content={content} />
    </Suspense>
  );
}

export default LazyMarkdown;

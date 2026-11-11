import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface FullMarkdownProps {
  content?: string;
  className?: string;
  remarkPlugins?: any[];
  rehypePlugins?: any[];
  components?: Record<string, React.ComponentType<any>>;
  children?: string;
}

/**
 * Full markdown renderer with KaTeX math support.
 * Lazy-loaded by LazyMarkdown only when a message contains math expressions.
 */
export default function FullMarkdown(props: FullMarkdownProps) {
  const content = props.content || props.children || "";
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={props.components}
    >
      {content}
    </ReactMarkdown>
  );
}

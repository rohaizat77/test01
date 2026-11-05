import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";

// Markdown + KaTeX. react-markdown never renders raw HTML, so model output can't inject markup.
const katexOpts = { throwOnError: false, strict: false, output: "html" as const };

export function MathText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, katexOpts]]}
        components={{ p: ({ children }) => <>{children}</>, a: ({ children }) => <span>{children}</span>, img: () => null }}
      >
        {text}
      </ReactMarkdown>
    </span>
  );
}

export function MathMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={`space-y-2 leading-relaxed [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_strong]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-ink-300 [&_blockquote]:pl-3 [&_blockquote]:italic ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[[rehypeKatex, katexOpts]]}
        components={{
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="underline">
              {children}
            </a>
          ),
          img: () => null,
          code: ({ children }) => <code className="rounded bg-ink-100 px-1 py-0.5 text-[0.9em] dark:bg-white/10">{children}</code>,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="text-sm [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1">{children}</table>
            </div>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

// Plain-text version of simple LaTeX, for DOCX export.
export function latexToText(s: string): string {
  return s
    .replace(/\$\$?([^$]+)\$\$?/g, (_, m: string) =>
      m
        .replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)")
        .replace(/\\sqrt\{([^{}]*)\}/g, "√($1)")
        .replace(/\\times/g, "×")
        .replace(/\\div/g, "÷")
        .replace(/\\cdot/g, "·")
        .replace(/\\pi/g, "π")
        .replace(/\\pm/g, "±")
        .replace(/\\leq?/g, "≤")
        .replace(/\\geq?/g, "≥")
        .replace(/\\neq/g, "≠")
        .replace(/\\ldots|\\dots/g, "…")
        .replace(/\\Rightarrow/g, "⇒")
        .replace(/\\text\{([^{}]*)\}/g, "$1")
        .replace(/\^2/g, "²")
        .replace(/\^3/g, "³")
        .replace(/\^\{([^{}]*)\}/g, "^($1)")
        .replace(/_\{([^{}]*)\}/g, "_$1")
        .replace(/\\left|\\right|\\,|\;|\\!/g, "")
        .replace(/\\[a-zA-Z]+/g, "")
        .replace(/[{}]/g, ""),
    )
    .replace(/\*\*([^*]+)\*\*/g, "$1");
}

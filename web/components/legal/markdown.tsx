import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Markerii de ciornă ([DE COMPLETAT: ...], [TO BE VERIFIED BY LAWYER] etc.) se afișează evidențiat, ca să nu treacă neobservați la lansare.
const MARKER = /\[(?:DE (?:COMPLETAT|VERIFICAT|ACTUALIZAT)|TO BE (?:COMPLETED|VERIFIED))[^\]]*\]/g;

type Node = { type: string; value?: string; children?: Node[]; data?: { hName: string } };

function markDrafts(node: Node) {
  if (!node.children) return;
  node.children = node.children.flatMap((child) => {
    if (child.type !== "text" || !child.value) {
      markDrafts(child);
      return [child];
    }
    const out: Node[] = [];
    let last = 0;
    const re = new RegExp(MARKER);
    let m: RegExpExecArray | null;
    while ((m = re.exec(child.value))) {
      if (m.index > last) out.push({ type: "text", value: child.value.slice(last, m.index) });
      out.push({ type: "emphasis", data: { hName: "mark" }, children: [{ type: "text", value: m[0] }] });
      last = m.index + m[0].length;
    }
    if (!out.length) return [child];
    if (last < child.value.length) out.push({ type: "text", value: child.value.slice(last) });
    return out;
  });
}

const remarkDraftMarkers = () => (tree: Node) => markDrafts(tree);

export function LegalMarkdown({ source }: { source: string }) {
  return (
    <div
      className="space-y-4 leading-relaxed text-muted-foreground
        [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-[-0.03em] [&_h1]:text-foreground
        [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground
        [&_strong]:text-foreground [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-4
        [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6
        [&_blockquote]:space-y-1 [&_blockquote]:rounded-lg [&_blockquote]:border [&_blockquote]:border-border [&_blockquote]:bg-card [&_blockquote]:p-4 [&_blockquote]:text-sm
        [&_table]:block [&_table]:overflow-x-auto [&_table]:text-sm [&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground
        [&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top
        [&_mark]:rounded [&_mark]:bg-primary/20 [&_mark]:px-1 [&_mark]:not-italic [&_mark]:text-foreground
        [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-sm"
    >
      <Markdown remarkPlugins={[remarkGfm, remarkDraftMarkers]}>{source}</Markdown>
    </div>
  );
}

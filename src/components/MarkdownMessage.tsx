import { memo, useRef } from 'react';
import type { MouseEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Options as SanitizeSchema } from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import { Box } from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import CodeBlock, { MONO_FONT } from './CodeBlock';
import MermaidDiagram from './MermaidDiagram';
import useTypewriter from './useTypewriter';

/* ---------- helpers ---------- */

interface HastLike {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastLike[];
}

function hastText(node: HastLike): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(hastText).join('');
}

/** Pulls the raw code and language out of a <pre><code> node. */
function readCodeBlock(node: unknown) {
  const codeEl = (node as HastLike | undefined)?.children?.find(
    (c) => c.type === 'element' && c.tagName === 'code',
  );
  if (!codeEl) return null;
  const classes = (codeEl.properties?.className as string[] | undefined) ?? [];
  const language = classes.find((c) => c.startsWith('language-'))?.slice('language-'.length) ?? '';
  return { language, text: hastText(codeEl).replace(/\n$/, '') };
}

/* ---------- markdown pipeline ---------- */

// Raw HTML from the model is allowed, but sanitized (no scripts, no event handlers).
const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  // Footnote ids are already made unique per message below.
  clobber: [],
  tagNames: [...(defaultSchema.tagNames ?? []), 'details', 'summary', 'kbd', 'sub', 'sup', 'br'],
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ['className', /^(language-.+|math-inline|math-display)$/],
    ],
  },
};

const components: Components = {
  pre: ({ node, children }) => {
    const block = readCodeBlock(node);
    if (!block) return <pre>{children}</pre>;
    if (block.language === 'mermaid') return <MermaidDiagram code={block.text} />;
    return (
      <CodeBlock language={block.language} text={block.text}>
        {children}
      </CodeBlock>
    );
  },
  table: ({ children }) => (
    <Box data-atomic="" sx={{ overflowX: 'auto', my: 2, border: 1, borderColor: 'divider', borderRadius: '12px' }}>
      <table>{children}</table>
    </Box>
  ),
  a: ({ node, href, children, ...rest }) => {
    void node;
    const external = Boolean(href && /^https?:\/\//.test(href));
    // Footnote and in-page links scroll inside the chat instead of changing the URL hash.
    const jump = href?.startsWith('#')
      ? (e: MouseEvent<HTMLAnchorElement>) => {
          e.preventDefault();
          document
            .getElementById(decodeURIComponent(href.slice(1)))
            ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      : undefined;
    return (
      <a href={href} {...rest} onClick={jump} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  },
};

/* ---------- styles ---------- */

const revealIn = keyframes`
  from { opacity: 0; transform: translateY(8px); filter: blur(3px); }
  to { opacity: 1; transform: none; filter: blur(0); }
`;

// The sweep moves the gradient's background-position instead of translating the overlay.
// A translated overlay ends up parked outside the box, which made scrollable boxes
// (diagrams, tables, code) scroll sideways into an empty gradient after the reveal.
const sheenSweep = keyframes`
  from { background-position: 112.5% 0; }
  to { background-position: -12.5% 0; }
`;

const caretBlink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

const rootSx: SxProps<Theme> = {
  position: 'relative',
  minWidth: 0,
  overflow: 'clip',
  wordBreak: 'break-word',
  '& > :first-child': { mt: 0 },
  '& > :last-child': { mb: 0 },

  '& p': { margin: '0 0 1em' },

  '& h1, & h2, & h3, & h4, & h5, & h6': {
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
    margin: '1.6em 0 0.6em',
  },
  '& h1': { fontSize: '1.6rem' },
  '& h2': { fontSize: '1.35rem' },
  '& h3': { fontSize: '1.15rem' },
  '& h4': { fontSize: '1rem' },
  '& h5, & h6': { fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' },

  '& a': {
    color: 'text.primary',
    textDecoration: 'underline',
    textDecorationColor: 'rgba(255, 255, 255, 0.4)',
    textUnderlineOffset: '3px',
    '&:hover': { textDecorationColor: '#FFFFFF' },
  },
  '& del': { color: 'text.secondary' },

  '& :not(pre) > code': {
    fontFamily: MONO_FONT,
    fontSize: '0.875em',
    padding: '0.15em 0.4em',
    borderRadius: '6px',
    backgroundColor: alpha('#FFFFFF', 0.1),
  },
  '& kbd': {
    fontFamily: MONO_FONT,
    fontSize: '0.8em',
    padding: '0.15em 0.5em',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderBottomWidth: 2,
    backgroundColor: alpha('#FFFFFF', 0.06),
  },

  '& blockquote': {
    margin: '1.2em 0',
    padding: '0.1em 0 0.1em 1.25em',
    borderLeft: '3px solid rgba(255, 255, 255, 0.3)',
    color: 'text.secondary',
    '& p': { margin: '0 0 0.5em' },
  },
  '& hr': { border: 0, borderTop: 1, borderColor: 'divider', my: 3 },

  '& ul, & ol': { margin: '0 0 1em', paddingLeft: '1.5em' },
  '& li': { margin: '0.25em 0' },
  '& li > p': { margin: '0 0 0.4em' },
  '& li > ul, & li > ol': { margin: '0.25em 0' },
  '& ul.contains-task-list': { listStyle: 'none', paddingLeft: '0.25em' },
  '& li.task-list-item input': { marginRight: '0.6em', accentColor: '#FFFFFF' },

  '& img': { display: 'block', maxWidth: '100%', height: 'auto', borderRadius: '12px', my: 1.5 },

  '& table': { borderCollapse: 'collapse', width: '100%', minWidth: 'max-content' },
  '& th, & td': {
    padding: '8px 12px',
    textAlign: 'left',
    fontSize: '0.9em',
    borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
  },
  '& thead th': { fontWeight: 600, backgroundColor: alpha('#FFFFFF', 0.04) },
  '& tbody tr:last-of-type td': { borderBottom: 'none' },

  '& details': { border: 1, borderColor: 'divider', borderRadius: '12px', px: 1.5, py: 1, my: 2 },
  '& summary': { cursor: 'pointer', fontWeight: 600 },
  '& details[open] > summary': { mb: 1 },

  '& .katex-display': { overflowX: 'auto', overflowY: 'hidden', py: 0.5 },

  '& .sr-only': {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
  },
  '& section[data-footnotes]': {
    mt: 3,
    pt: 1.5,
    borderTop: 1,
    borderColor: 'divider',
    fontSize: '0.875rem',
    color: 'text.secondary',
  },
  '& a[data-footnote-ref]': { textDecoration: 'none', px: '2px' },

  // Typing animation: blocks that are not plain text fade in with a light sweep.
  '& .nova-reveal': { animation: `${revealIn} 520ms cubic-bezier(0.2, 0.8, 0.2, 1) both` },
  '& [data-atomic].nova-reveal': {
    position: 'relative',
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      backgroundImage:
        'linear-gradient(100deg, transparent 41.6%, rgba(255, 255, 255, 0.18) 50%, transparent 58.4%)',
      backgroundSize: '300% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '112.5% 0',
      animation: `${sheenSweep} 1000ms 120ms ease-out 1 both`,
    },
  },
  '& .nova-caret': {
    display: 'inline-block',
    width: '2px',
    height: '1.05em',
    ml: '1px',
    verticalAlign: 'text-bottom',
    borderRadius: '1px',
    backgroundColor: 'currentColor',
    animation: `${caretBlink} 900ms steps(1, end) infinite`,
  },
};

/* ---------- component ---------- */

interface Props {
  text: string;
  /** Makes footnote anchors unique when several messages are on screen. */
  messageId: string;
  /** Type the reply out instead of showing it all at once. */
  animate?: boolean;
}

function MarkdownMessage({ text, messageId, animate = false }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  useTypewriter(rootRef, animate);

  return (
    <Box ref={rootRef} sx={rootSx}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeKatex, rehypeHighlight]}
        remarkRehypeOptions={{ allowDangerousHtml: true, clobberPrefix: `msg-${messageId}-` }}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </Box>
  );
}

export default memo(MarkdownMessage);

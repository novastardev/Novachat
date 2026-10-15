import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { MONO_FONT } from './CodeBlock';

let runCounter = 0;

interface Props {
  code: string;
}

/** Renders a ```mermaid block as an SVG diagram (mermaid is loaded only when needed). */
export default function MermaidDiagram({ code }: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = `mermaid-diagram-${++runCounter}`;

    (async () => {
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: {
            darkMode: true,
            background: '#000000',
            primaryColor: '#111111',
            primaryBorderColor: '#FFFFFF',
            primaryTextColor: '#F2F2F2',
            secondaryColor: '#1A1A1A',
            tertiaryColor: '#111111',
            lineColor: '#BDBDBD',
            textColor: '#F2F2F2',
            fontFamily: '"Sora Variable", system-ui, sans-serif',
          },
        });
        const result = await mermaid.render(id, code);
        if (!cancelled) {
          setSvg(result.svg);
          setError(null);
        }
      } catch (e) {
        document.getElementById(`d${id}`)?.remove();
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not render this diagram.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <Box
      data-atomic=""
      sx={{
        my: 2,
        p: 2,
        borderRadius: '14px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflowX: 'auto',
      }}
    >
      {error ? (
        <>
          <Typography variant="caption" color="text.secondary">
            Couldn&apos;t render this diagram.
          </Typography>
          <Box component="pre" sx={{ m: 0, mt: 1, fontFamily: MONO_FONT, fontSize: '0.85rem' }}>
            {code}
          </Box>
        </>
      ) : svg ? (
        <Box
          dangerouslySetInnerHTML={{ __html: svg }}
          sx={{ '& svg': { display: 'block', mx: 'auto', maxWidth: '100%', height: 'auto' } }}
        />
      ) : (
        <Typography variant="caption" color="text.secondary">
          Rendering diagram…
        </Typography>
      )}
    </Box>
  );
}

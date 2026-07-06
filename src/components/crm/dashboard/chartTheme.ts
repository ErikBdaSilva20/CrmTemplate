// Shared Recharts styling for every Dashboard chart card — kept in one place
// so a palette/tooltip tweak doesn't mean editing N chart components.
export const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius)',
  color: 'hsl(var(--popover-foreground))',
  fontSize: 11,
};

export const CHART_COLORS = [
  'hsl(148, 62%, 40%)', // verde MasIA
  'hsl(186, 78%, 42%)', // teal/ciano
  'hsl(43, 90%, 50%)', // ouro
  'hsl(148, 50%, 56%)', // verde claro
  'hsl(186, 65%, 56%)', // ciano claro
  'hsl(0, 72%, 58%)', // vermelho
  'hsl(262, 72%, 60%)', // roxo
  'hsl(43, 75%, 62%)', // ouro claro
];

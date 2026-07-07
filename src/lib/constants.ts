// Constantes de domínio do template (editável pela IA).
// Substitui o hook useIndustries do CellRM, que lia de organizations.settings
// no Supabase — na fundação MasIA não há tabela de org (1 Neon por tenant).

export const INDUSTRIES = [
  'Tecnologia',
  'SaaS',
  'Serviços',
  'E-commerce',
  'Indústria',
  'Consultoria',
  'Educação',
  'Saúde',
  'Financeiro',
  'Varejo',
  'Logística',
  'Agronegócio',
  'Imobiliário',
  'Jurídico',
  'Marketing',
];

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

// Pipeline stages: suggested default colors (hex), used both as the seed in
// SetupScreen and as the initial color when creating a stage manually.
// Centralized so there are no divergent hardcoded hex values across screens
// (AUDITORIA-CODIGO.md §4.3).
export const DEFAULT_STAGE_COLORS = [
  '#94a3b8', // slate — starting stage
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#22c55e', // green — closed/won
];

// Seed dos 5 estágios padrão de um novo pipeline — usado no /setup (primeiro
// pipeline) e em /deals (quando o usuário cria um pipeline sem ter passado
// pelo /setup, ex.: dados criados direto no banco/import).
export const DEFAULT_STAGES = [
  { name: 'Lead', color: DEFAULT_STAGE_COLORS[0], win_probability: 10 },
  { name: 'Qualificado', color: DEFAULT_STAGE_COLORS[1], win_probability: 25 },
  { name: 'Proposta', color: DEFAULT_STAGE_COLORS[2], win_probability: 50 },
  { name: 'Negociação', color: DEFAULT_STAGE_COLORS[3], win_probability: 75 },
  { name: 'Fechado', color: DEFAULT_STAGE_COLORS[4], win_probability: 100 },
];

// Default monthly revenue goal shown on the Dashboard gauge when the user
// has not yet created a `sales_goals` row for the current period.
export const DEFAULT_MONTHLY_REVENUE_GOAL = 100_000;

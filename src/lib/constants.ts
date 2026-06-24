// Constantes de domínio do template (editável pela IA).
// Substitui o hook useIndustries do FlowCRM, que lia de organizations.settings
// no Supabase — na fundação MasIA não há tabela de org (1 Neon por tenant).

export const INDUSTRIES = [
  "Tecnologia", "SaaS", "Serviços", "E-commerce", "Indústria",
  "Consultoria", "Educação", "Saúde", "Financeiro", "Varejo",
  "Logística", "Agronegócio", "Imobiliário", "Jurídico", "Marketing",
];

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

-- =============================================================================
-- CellRM → template MasIA — schema de negócio (Onda 1 / V1)
-- Roda no Neon do tenant, DEPOIS que o gateway cria as tabelas do Better-Auth.
--
-- Regras seguidas à risca (Importantdoc §B4):
--   • SEM org_id, SEM RLS, SEM auth.uid(), SEM profiles, SEM SECURITY DEFINER.
--   • owner_id text not null references "user"(id) on delete cascade
--     em TODA tabela escrita pelo rep — INCLUSIVE filhas (contact_tags, deal_tags).
--   • snake_case minúsculo; sem nomes reservados (user/session/account/
--     verification/organization/member/invitation).
--   • id uuid PK + created_at/updated_at; updated_at via trigger touch_updated_at.
--   • Lookups (config read-only pro rep): SEM owner_id — pipelines, pipeline_stages,
--     tags, loss_reasons.
--
-- ── COMO RODAR ISTO NO POSTGRES LOCAL (docker-compose.yml) ───────────────────
-- Suba o container (`docker compose up -d`) e aplique este arquivo com:
--
--     docker compose exec -T db psql -U masia -d tenant_local < supabase/migrations/0001_business_schema.sql
--
-- (rode a partir da raiz do projeto; `db` é o nome do serviço no docker-compose.yml,
-- não depende do container_name). Idempotente — pode rodar de novo sem quebrar
-- (`create table if not exists` / `do $$ ... exception when duplicate_object`).
-- =============================================================================

-- =============================================================================
-- ⚠️ STUB SÓ PARA LOCAL — tabela "user" do Better-Auth.
-- Em produção (Neon do tenant) essa tabela já existe: o gateway a cria ANTES
-- desta migration rodar (ver cabeçalho acima). O docker-compose.yml deste repo
-- sobe só o Postgres, sem gateway — sem isto, toda FK `owner_id references
-- "user"(id)` abaixo falharia com "relation user does not exist".
-- NÃO rode este bloco contra o Neon/staging/produção: lá a tabela real do
-- Better-Auth já existe e tem colunas adicionais que este stub não replica.
-- =============================================================================
create table if not exists "user" (
  id         text primary key,
  email      text,
  name       text,
  created_at timestamptz not null default now()
);

-- ---------- Enums de domínio (lowercase, ok no modo genérico) ----------
do $$ begin
  create type contact_status as enum ('lead', 'prospect', 'customer', 'churned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deal_status as enum ('open', 'won', 'lost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_type as enum ('call', 'email', 'meeting', 'note', 'task');
exception when duplicate_object then null; end $$;

-- ---------- Trigger genérico de updated_at ----------
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- LOOKUPS (config — admin/manager escreve, rep só lê; SEM owner_id)
-- =============================================================================

create table if not exists pipelines (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  currency    text not null default 'BRL',
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_pipelines_touch on pipelines;
create trigger trg_pipelines_touch before update on pipelines
  for each row execute function touch_updated_at();

create table if not exists pipeline_stages (
  id              uuid primary key default gen_random_uuid(),
  pipeline_id     uuid not null references pipelines(id) on delete cascade,
  name            text not null,
  sort_order      integer not null default 0,        -- era "order" (palavra reservada)
  color           text,
  win_probability numeric not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists idx_pipeline_stages_pipeline on pipeline_stages(pipeline_id);

create table if not exists tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  color      text,
  created_at timestamptz not null default now()
);

create table if not exists loss_reasons (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  is_active   boolean not null default true,
  usage_count integer not null default 0,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- DADOS DO REP (owner_id text references "user"(id) — obrigatório)
-- =============================================================================

create table if not exists companies (
  id           uuid primary key default gen_random_uuid(),
  owner_id     text not null references "user"(id) on delete cascade,
  name         text not null,
  domain       text,
  industry     text,
  size         text,
  revenue      numeric(14,2),
  website      text,
  linkedin_url text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_companies_owner on companies(owner_id);
drop trigger if exists trg_companies_touch on companies;
create trigger trg_companies_touch before update on companies
  for each row execute function touch_updated_at();

create table if not exists contacts (
  id           uuid primary key default gen_random_uuid(),
  owner_id     text not null references "user"(id) on delete cascade,
  company_id   uuid references companies(id) on delete set null,
  first_name   text not null,
  last_name    text,
  email        text,
  phone        text,
  title        text,
  linkedin_url text,
  avatar_url   text,
  status       contact_status not null default 'lead',
  lead_score   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_contacts_owner on contacts(owner_id);
create index if not exists idx_contacts_company on contacts(company_id);
drop trigger if exists trg_contacts_touch on contacts;
create trigger trg_contacts_touch before update on contacts
  for each row execute function touch_updated_at();

create table if not exists deals (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            text not null references "user"(id) on delete cascade,
  title               text not null,
  value               numeric(14,2) not null default 0,
  currency            text not null default 'BRL',
  stage_id            uuid references pipeline_stages(id) on delete set null,
  contact_id          uuid references contacts(id) on delete set null,
  company_id          uuid references companies(id) on delete set null,
  close_date          date,
  probability         numeric not null default 0,
  status              deal_status not null default 'open',
  loss_reason         text,
  qualification       jsonb not null default
    '{"budget":null,"authority":null,"need":null,"timeline":null,"budget_notes":"","authority_notes":"","need_notes":"","timeline_notes":""}'::jsonb,
  qualification_score integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_deals_owner on deals(owner_id);
create index if not exists idx_deals_stage on deals(stage_id);
drop trigger if exists trg_deals_touch on deals;
create trigger trg_deals_touch before update on deals
  for each row execute function touch_updated_at();

-- activities cobre /activities e /tasks (type='task'). user_id → owner_id.
create table if not exists activities (
  id           uuid primary key default gen_random_uuid(),
  owner_id     text not null references "user"(id) on delete cascade,
  type         activity_type not null,
  title        text not null,
  body         text,
  contact_id   uuid references contacts(id) on delete set null,
  deal_id      uuid references deals(id) on delete set null,
  company_id   uuid references companies(id) on delete set null,
  due_date     timestamptz,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_activities_owner on activities(owner_id);
create index if not exists idx_activities_deal on activities(deal_id);
drop trigger if exists trg_activities_touch on activities;
create trigger trg_activities_touch before update on activities
  for each row execute function touch_updated_at();

-- ⚠️ FILHAS: o rep cria estas linhas ao taggear → PRECISAM de owner_id (§B4.1),
-- senão o gateway devolve 403 ao salvar. Eram PK composta sem owner_id no Supabase.
create table if not exists contact_tags (
  id         uuid primary key default gen_random_uuid(),
  owner_id   text not null references "user"(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  tag_id     uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (contact_id, tag_id)
);
create index if not exists idx_contact_tags_owner on contact_tags(owner_id);

create table if not exists deal_tags (
  id         uuid primary key default gen_random_uuid(),
  owner_id   text not null references "user"(id) on delete cascade,
  deal_id    uuid not null references deals(id) on delete cascade,
  tag_id     uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (deal_id, tag_id)
);
create index if not exists idx_deal_tags_owner on deal_tags(owner_id);

-- Metas de venda — owner_id por meta (era user_id + team_id; teams saíram do V1).
create table if not exists sales_goals (
  id           uuid primary key default gen_random_uuid(),
  owner_id     text not null references "user"(id) on delete cascade,
  goal_type    text not null default 'revenue',     -- revenue | deals | activities | contacts
  target_value numeric(14,2) not null default 0,
  current_value numeric(14,2) not null default 0,
  period_month integer not null,
  period_year  integer not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_sales_goals_owner on sales_goals(owner_id);
drop trigger if exists trg_sales_goals_touch on sales_goals;
create trigger trg_sales_goals_touch before update on sales_goals
  for each row execute function touch_updated_at();

-- OKR: meta opcionalmente atrelada a um deal ou empresa (fix.md §6). Aditiva
-- e idempotente — segura tanto numa tabela recém-criada quanto num ambiente
-- que já rodou a migration antes desta coluna existir.
alter table sales_goals add column if not exists deal_id uuid references deals(id) on delete set null;
alter table sales_goals add column if not exists company_id uuid references companies(id) on delete set null;

-- Feature "Filtros Salvos" removida (fix.md §7). A tabela `segments` não faz
-- mais parte do estado desejado. Ambientes já provisionados com a tabela
-- antiga devem rodar manualmente:
--   drop table if exists segments cascade;


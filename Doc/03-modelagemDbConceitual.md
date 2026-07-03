# Work Management / Time Tracking Template

# 03 - Modelagem do Banco de Dados

> Objetivo: Definir toda a estrutura de dados do template Work Management, estabelecendo as entidades, relacionamentos, responsabilidades e regras de modelagem antes da implementação do banco de dados.

---

# Filosofia

O banco deve ser pensado como um domínio de negócio.

As tabelas representam entidades do mundo real.

Cada entidade deve possuir apenas uma responsabilidade.

Nenhuma informação deve possuir duas fontes de verdade.

---

# Princípios

Durante toda a modelagem serão seguidas algumas regras.

## Fonte única da verdade

Cada informação possui apenas uma origem.

Exemplo:

Cliente

↓

Projetos

↓

Tasks

↓

Time Entries

Dashboard, Analytics e Relatórios nunca armazenam informações.

Eles apenas calculam dados derivados.

---

## Dados derivados

Nunca armazenar informações que podem ser calculadas.

Exemplos:

❌ Horas Trabalhadas (Projeto)

✔ Soma(Time Entries)

---

❌ Receita Total

✔ Soma(Time Entries Billable)

---

❌ Horas por Cliente

✔ Soma(Time Entries)

---

## Snapshot

Sempre que um dado puder mudar futuramente, deve ser salvo um snapshot.

Exemplo:

Time Entry

↓

project_name

client_name

task_name

hour_rate

currency

Assim mudanças futuras não alteram o histórico.

---

# Entidades do Sistema

O sistema será dividido em três grupos.

---

## Entidades Mestres

São responsáveis pela criação dos dados.

### Clients

Representa empresas ou clientes.

Responsabilidade:

Quem contrata o serviço.

Relacionamentos:

Clients

↓

Contacts

↓

Projects

↓

Invoices

---

### Contacts

Representa pessoas pertencentes ao cliente.

Responsabilidade:

Centralizar contatos comerciais.

Relacionamentos:

Contact

↓

Client

---

### Projects

Representa trabalhos realizados.

Responsabilidade:

Organizar grandes entregas.

Relacionamentos:

Project

↓

Tasks

↓

Time Entries

---

### Tasks

Representa unidades de trabalho.

Responsabilidade:

Organizar execução.

Relacionamentos:

Task

↓

Time Entries

---

### Members

Representa colaboradores.

Responsabilidade:

Identificar quem executou o trabalho.

Relacionamentos:

Member

↓

Time Entries

---

### Tags

Categorias.

Relacionamentos:

Tags

↓

Time Entries

---

### Work Schedule

Define jornada.

Relacionamentos:

Member

↓

Work Schedule

---

### Goals

Define metas.

Relacionamentos:

Member

↓

Goals

---

## Entidades Operacionais

São responsáveis pela operação.

### Timer

Responsabilidade:

Registrar trabalho em andamento.

Ao finalizar gera:

↓

Time Entry

Timer nunca será utilizado para Analytics.

Ele existe apenas enquanto estiver ativo.

---

### Time Entries

É a entidade mais importante.

Responsabilidade:

Registrar trabalho executado.

Todos os indicadores do sistema serão calculados através dela.

Relacionamentos:

Cliente

Projeto

Task

Member

Tags

---

## Entidades Derivadas

Essas entidades não representam dados primários.

São apenas agregações.

Dashboard

Analytics

Relatórios

Calendário

Activity Feed

Nenhuma delas deve possuir tabelas próprias apenas para armazenar cálculos.

---

# Relacionamentos

Clients

1:N

Contacts

---

Clients

1:N

Projects

---

Projects

1:N

Tasks

---

Tasks

1:N

Time Entries

---

Projects

1:N

Time Entries

---

Members

1:N

Time Entries

---

Time Entries

N:N

Tags

---

Clients

1:N

Invoices

---

Invoices

N:N

Time Entries

---

# Fonte da Verdade

| Informação  | Entidade      |
| ----------- | ------------- |
| Cliente     | Clients       |
| Contato     | Contacts      |
| Projeto     | Projects      |
| Trabalho    | Tasks         |
| Tempo       | Time Entries  |
| Colaborador | Members       |
| Jornada     | Work Schedule |
| Meta        | Goals         |
| Categoria   | Tags          |
| Faturamento | Invoices      |

---

# Entidades que geram informação

Clients

Projects

Tasks

Members

Timer

Time Entries

---

# Entidades que apenas consomem

Dashboard

Analytics

Relatórios

Calendário

Invoices

Activity Feed

---

# Fluxo de Persistência

Cliente

↓

Projeto

↓

Task

↓

Timer

↓

Time Entry

↓

Dashboard

↓

Analytics

↓

Relatórios

↓

Invoices

---

# Dados Calculados

Nunca persistir:

- Receita Total
- Horas Trabalhadas
- Horas Semana
- Horas Mês
- Horas Hoje
- Projeto Mais Ativo
- Cliente Mais Ativo
- Média Semanal
- Média Diária

Tudo deve ser calculado utilizando Time Entries.

---

# Integridade

Um Time Entry nunca pode existir sem:

- Projeto
- Task
- Cliente
- Responsável

---

Uma Task nunca pode existir sem Projeto.

---

Um Projeto nunca pode existir sem Cliente.

---

Um Contato nunca pode existir sem Cliente.

---

# Regras de Exclusão

Excluir Cliente

↓

Bloquear caso existam Projetos

ou

Soft Delete

---

Excluir Projeto

↓

Bloquear caso existam Time Entries

---

Excluir Task

↓

Bloquear caso existam Time Entries

---

Excluir Member

↓

Nunca apagar histórico

Apenas desativar.

---

# Compatibilidade com a Arquitetura MasIA

Todas as entidades persistidas deverão seguir o padrão do tenant-gateway.

Cada tabela deverá possuir:

- owner_id
- created_at
- updated_at

Sem RLS.

Sem backend próprio.

Sem lógica de negócio no banco.

O banco será responsável apenas por persistência.

Toda regra de negócio será implementada na aplicação.

---

# Próxima Etapa

Após validar toda a modelagem conceitual, o próximo documento será responsável por definir a navegação da aplicação.

Nenhuma tabela deverá ser criada antes desta modelagem estar aprovada.

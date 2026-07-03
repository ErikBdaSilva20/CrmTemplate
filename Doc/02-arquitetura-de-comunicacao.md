# Work Management / Time Tracking Template

## Documento de Arquitetura e Planejamento (V2)

> **Objetivo:** Construir um template premium para a plataforma MasIA voltado para empresas prestadoras de serviço, freelancers, agências e software houses. O sistema terá como foco principal o gerenciamento do trabalho através do registro de tempo (Time Tracking), utilizando uma arquitetura simples, organizada e altamente reutilizável.

---

# Filosofia do Produto

O objetivo **não é competir com ClickUp, Monday ou Asana**.

Também não é criar apenas um clone do Clockify.

A proposta é encontrar um equilíbrio entre simplicidade e profundidade.

O sistema deve possuir poucas funcionalidades, porém muito bem conectadas entre si.

Cada informação cadastrada deve gerar valor para outras áreas do sistema.

Exemplo:

Um Time Entry alimenta automaticamente:

- Dashboard
- Relatórios
- Analytics
- Financeiro

Sem necessidade de duplicação de informações.

---

# Princípios do Projeto

Durante todo o desenvolvimento seguiremos algumas regras.

## 1. Qualidade acima de quantidade

Não queremos dezenas de módulos.

Queremos poucos módulos extremamente bem resolvidos.

Sempre perguntar:

> "Essa funcionalidade realmente ajuda uma empresa a registrar, organizar ou analisar trabalho?"

Se a resposta for não, provavelmente ela não pertence ao projeto.

---

## 2. Dados reutilizados

Toda informação cadastrada deve servir para mais de um lugar.

Exemplo:

Cliente

↓

Projetos

↓

Tasks

↓

Time Entries

↓

Dashboard

↓

Relatórios

↓

Analytics

↓

Invoices

---

## 3. Simplicidade operacional

O sistema deve conseguir ser utilizado por qualquer empresa sem treinamento complexo.

O fluxo precisa ser natural.

Criar Cliente

↓

Criar Projeto

↓

Criar Tasks

↓

Registrar Tempo

↓

Gerar Relatórios

---

## 4. Interface limpa

O sistema deve transmitir sensação premium.

Características:

- muito espaço em branco
- poucos elementos
- componentes reutilizáveis
- tipografia forte
- gráficos modernos
- navegação intuitiva

---

# Público Alvo

O template deve atender principalmente:

- Freelancers
- Agências
- Software Houses
- Escritórios
- Consultorias
- Empresas de Marketing
- Pequenos Times

---

# Conceito Central

Todo o sistema gira em torno do trabalho realizado.

A hierarquia principal será:

```text
Cliente
    │
    ├── Contatos
    │
    ├── Projetos
    │       │
    │       ├── Tasks
    │       │
    │       └── Time Entries
    │
    └── Invoices
```

Essa estrutura será a espinha dorsal do sistema.

---

# Fluxo Principal

```text
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

Relatórios

↓

Analytics

↓

Invoice
```

Tudo nasce a partir do Time Entry.

Ele será a principal fonte de dados da plataforma.

---

# Módulos do Sistema

## Dashboard

Objetivo:

Mostrar rapidamente o estado atual da operação.

Indicadores:

- Horas hoje
- Horas semana
- Horas mês
- Receita
- Horas faturáveis
- Horas não faturáveis
- Projeto atual
- Timer ativo
- Projetos ativos

Também possuirá:

- Últimos registros
- Gráfico de produtividade
- Gráfico de horas
- Quick Actions

O Dashboard será fixo.

Não será personalizável.

---

# Clientes

Representam quem contratou os serviços.

Campos principais:

- Nome
- Empresa
- Email
- Telefone
- Website
- Valor/Hora padrão
- Status
- Observações

Relacionamentos:

Cliente

↓

Contatos

↓

Projetos

↓

Invoices

---

# Contatos

Cada cliente poderá possuir vários contatos.

Exemplo:

Empresa

↓

Financeiro

↓

Marketing

↓

CEO

Campos:

- Nome
- Cargo
- Email
- Telefone
- Departamento
- Observações

---

# Projetos

Cada cliente poderá possuir diversos projetos.

Campos:

- Nome
- Cliente
- Descrição
- Cor
- Status
- Data início
- Data fim
- Valor Hora
- Estimativa de Horas
- Horas Trabalhadas
- Budget

O Budget permitirá acompanhar:

- orçamento previsto
- orçamento consumido
- percentual utilizado

---

# Tasks

Representam o trabalho executado.

Campos:

- Nome
- Projeto
- Descrição
- Responsável
- Prioridade
- Status
- Estimativa

As Tasks serão simples.

Não existirão:

- subtasks
- checklist
- comentários
- anexos

O objetivo é manter a simplicidade.

---

# Timer

O Timer será extremamente simples.

Botões:

- Start
- Pause
- Stop

Enquanto estiver rodando:

- alterar projeto
- alterar task
- alterar descrição

Ao parar:

↓

Criar automaticamente um Time Entry.

---

# Time Entries

É o coração do sistema.

Cada registro conterá:

- Cliente
- Projeto
- Task
- Data
- Hora início
- Hora fim
- Duração
- Billable
- Tags
- Observações

Além disso armazenará um Snapshot.

Snapshot:

- Nome do Cliente
- Nome do Projeto
- Nome da Task
- Valor Hora
- Moeda

Assim alterações futuras não quebram o histórico.

---

# Tags

Servem para categorizar trabalho.

Exemplos:

- Frontend
- Backend
- Meeting
- Deploy
- Bug
- Design

Relacionamento:

Time Entry

↓

Tags

---

# Calendário

Visualizações:

- Dia
- Semana
- Mês

Mostrará:

- Time Entries
- Tasks
- Eventos

Sem funcionalidades complexas.

---

# Equipe

Caso utilizado por empresas.

Campos:

- Nome
- Cargo
- Valor Hora
- Meta semanal
- Equipe

Relacionamento:

Equipe

↓

Projetos

↓

Time Entries

---

# Jornada de Trabalho

Cada usuário poderá definir sua jornada.

Exemplo:

Segunda

08:00 às 12:00

13:00 às 18:00

Esses dados alimentarão:

- Horas previstas
- Horas realizadas
- Horas restantes
- Horas extras

---

# Metas

Cada usuário poderá definir metas.

Exemplo:

Meta semanal

40 horas

Meta mensal

160 horas

Dashboard mostrará:

- realizado
- restante
- percentual

---

# Invoices

Fluxo:

Cliente

↓

Selecionar período

↓

Buscar Time Entries faturáveis

↓

Gerar Invoice

Campos:

- Cliente
- Período
- Horas
- Valor Hora
- Total
- Status

---

# Relatórios

Baseados exclusivamente nos Time Entries.

Filtros:

- Cliente
- Projeto
- Task
- Colaborador
- Tag
- Data

Relatórios:

- Horas Trabalhadas
- Receita
- Horas Billable
- Horas Não Billable
- Cliente mais lucrativo
- Projeto mais lucrativo
- Tempo médio por Task
- Horas por colaborador

---

# Analytics

KPIs:

- Horas registradas
- Receita
- Média diária
- Média semanal
- Projeto mais ativo
- Cliente mais ativo
- Horário mais produtivo
- Tempo médio por tarefa

---

# Activity Feed

Será um histórico simples.

Exemplo:

09:00

Timer iniciado

09:40

Timer encerrado

10:20

Task criada

11:00

Invoice gerada

Sem:

- comentários
- curtidas
- menções
- colaboração

Apenas histórico.

---

# Pesquisa Global

Pesquisar:

- Clientes
- Contatos
- Projetos
- Tasks
- Time Entries
- Invoices

Objetivo:

Encontrar qualquer informação rapidamente.

---

# Configurações

- Moeda
- Timezone
- Valor Hora padrão
- Jornada padrão
- Dias úteis
- Preferências do Timer
- Formato de Data

---

# Estrutura de Navegação

Dashboard

Trabalho

- Timer
- Time Entries
- Calendário

Gestão

- Clientes
- Contatos
- Projetos
- Tasks

Financeiro

- Invoices
- Relatórios
- Analytics

Equipe

- Membros
- Jornada
- Metas

Configurações

---

# Funcionalidades propositalmente removidas

Para manter o sistema simples e reutilizável, algumas ideias foram descartadas.

Não existirão nesta versão:

❌ Dashboard personalizável

❌ Comentários

❌ Upload de arquivos

❌ Templates de Projeto

❌ Checklists

❌ Subtasks

❌ Favoritos

❌ Command Palette

❌ Página gigante de Projeto

❌ Funcionalidades colaborativas

❌ Sistema de notificações

❌ Chats internos

❌ Versionamento de arquivos

Essas funcionalidades aumentariam significativamente a complexidade do template sem agregar valor ao objetivo principal.

---

# Filosofia da Arquitetura

O sistema deve ser baseado em poucas entidades altamente conectadas.

Cada entidade deve alimentar automaticamente outras áreas do sistema.

Exemplo:

```text
Cliente
        │
        ▼
Projeto
        │
        ▼
Task
        │
        ▼
Time Entry
        │
        ├────────► Dashboard
        ├────────► Relatórios
        ├────────► Analytics
        ├────────► Financeiro
        ├────────► Activity Feed
        └────────► Metas
```

A ideia principal é que exista apenas uma fonte da verdade para o trabalho realizado.

Quanto menos duplicação de dados existir, mais simples será a manutenção e maior será a confiabilidade das informações.

---

# Próximas Etapas

Após consolidar esta visão macro do produto, os próximos documentos serão focados em:

1. Modelagem completa do banco de dados.
2. Definição das entidades e relacionamentos.
3. Estrutura SQL compatível com a arquitetura da MasIA.
4. Fluxo de navegação entre telas.
5. Arquitetura dos componentes React.
6. Estrutura dos dashboards.
7. Estrutura dos relatórios.
8. Estratégia de CRUD utilizando o tenant-gateway.

Somente após essa base estar completamente definida será iniciada a implementação do frontend.

# BMAD Workflow — Guia de Agentes para Templates MasIA

> Objetivo: Definir quando utilizar cada agente do BMAD durante o desenvolvimento dos templates da MasIA, evitando desperdício de contexto e mantendo um fluxo consistente.

---

# Filosofia

Cada agente possui uma única responsabilidade.

Nunca utilizar um único agente para fazer tudo.

Sempre dividir o trabalho em pequenas etapas.

A IA deve atuar como uma equipe de desenvolvimento, não como um único desenvolvedor.

---

# Fluxo Geral

```text
Ideia
    │
    ▼
Analyst
    │
    ▼
PM
    │
    ▼
UX
    │
    ▼
Architect
    │
    ▼
Architect (Validação)
    │
    ▼
Scrum Master
    │
    ▼
Developer
    │
    ▼
QA
    │
    ▼
Technical Writer
```

---

# Analyst

**Função**

Especialista em descoberta.

Responsável por transformar uma ideia em algo estruturado.

## Utilizar quando

- Criar um novo template
- Fazer brainstorming
- Pesquisar concorrentes
- Identificar oportunidades
- Refinar funcionalidades
- Validar escopo

## Não utilizar para

- Código
- SQL
- React
- Arquitetura

---

# Product Manager (PM)

**Função**

Especialista em produto.

Transforma ideias em requisitos claros.

## Utilizar quando

- Criar PRD
- Organizar funcionalidades
- Priorizar módulos
- Definir MVP
- Criar épicos
- Criar backlog

## Entregáveis

- PRD
- Épicos
- Features
- Prioridades

---

# UX Designer

**Função**

Responsável pela experiência do usuário.

## Utilizar quando

- Criar novas telas
- Definir fluxos
- Melhorar usabilidade
- Organizar dashboards
- Estruturar formulários
- Validar navegação

## Não utilizar para

- Implementação React

---

# Architect

**Função**

Responsável por toda arquitetura técnica.

É um dos agentes mais importantes do projeto.

## Utilizar quando

- Auditar projeto existente
- Definir arquitetura
- Modelar banco
- Revisar relacionamentos
- Organizar módulos
- Definir padrões
- Revisar documentação
- Planejar refatorações

## Perguntas ideais

- Esta arquitetura escala?
- Existe duplicação?
- O banco está correto?
- Posso reutilizar este componente?
- Há débito técnico?

---

# Architect (Implementation Readiness)

Após finalizar a documentação.

Executar uma revisão completa.

Objetivo:

Validar se toda a documentação conversa entre si.

Checklist:

- PRD
- Arquitetura
- Banco
- Design System
- Fluxos
- Navegação

Nenhuma implementação deve começar antes desta validação.

---

# Scrum Master (SM)

Responsável por quebrar o trabalho.

## Utilizar quando

Transformar documentação em Stories.

Exemplo:

Epic

↓

Projects

↓

Story

CRUD

↓

Story

Filtros

↓

Story

Tabela

↓

Story

Modal

↓

Story

Validação

O Developer nunca deverá trabalhar diretamente sobre documentos grandes.

Sempre trabalhar sobre Stories pequenas.

---

# Developer

Responsável apenas pela implementação.

## Utilizar quando

- Implementar uma Story
- Refatorar código
- Corrigir bugs
- Criar componentes
- Ajustar lógica

## Nunca pedir

"Crie todo o sistema."

Sempre pedir:

Implemente apenas:

Story X.Y

---

# QA

Responsável pela qualidade.

## Utilizar quando

- Revisar código
- Encontrar bugs
- Testar fluxos
- Validar regras de negócio
- Revisar acessibilidade

Nunca utilizar QA para implementar funcionalidades.

---

# Technical Writer

Responsável pela documentação.

## Utilizar quando

- Atualizar documentação
- Explicar arquitetura
- Criar diagramas
- Documentar APIs
- Criar guias

---

# Fluxo para Projetos Existentes (MasIA)

Como os templates da MasIA já possuem uma base pronta, utilizar sempre este fluxo:

```text
1.

Architect

↓

Auditoria do projeto

--------------------------

2.

Architect

↓

Comparar projeto × documentação

--------------------------

3.

Architect

↓

Sugerir melhorias

--------------------------

4.

Scrum Master

↓

Criar Stories

--------------------------

5.

Developer

↓

Implementar Story

--------------------------

6.

QA

↓

Revisar implementação

--------------------------

7.

Technical Writer

↓

Atualizar documentação
```

---

# Quando NÃO usar um agente

## Analyst

Não utilizar para implementar código.

---

## PM

Não utilizar para criar SQL.

---

## UX

Não utilizar para React.

---

## Architect

Não utilizar para criar telas completas.

---

## Developer

Não utilizar para definir arquitetura.

---

## QA

Não utilizar para desenvolver funcionalidades.

---

# Fluxo Pessoal (Recomendado)

Como objetivo é evoluir como desenvolvedor React, seguir esta estratégia:

## IA faz

- Arquitetura
- Banco
- Planejamento
- Revisão
- Refatoração
- SQL
- Stories

## Eu faço

- Layout
- Componentes
- CRUDs
- Hooks
- React
- Tailwind
- Responsividade
- Design System
- Experiência do usuário

A IA atua como arquiteta e revisora.

O desenvolvimento da interface permanece manual sempre que possível.

---

# Ordem Recomendada

```text
Ideia

↓

Analyst

↓

PM

↓

UX

↓

Architect

↓

Architect (Validação)

↓

Scrum Master

↓

Developer

↓

QA

↓

Technical Writer
```

---

# Regra de Ouro

Nunca iniciar uma implementação grande.

Sempre trabalhar em pequenas Stories.

Após concluir cada Story:

- Revisar.
- Atualizar documentação.
- Validar arquitetura.

Só então iniciar a próxima Story.

Esse processo reduz retrabalho, economiza contexto e mantém o projeto consistente durante toda a evolução.

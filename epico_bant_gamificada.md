# Épico: A Revolução BANT (Qualificação Gamificada e Inteligente)

Muitos CRMs transformam frameworks de qualificação (BANT, SPIN) num "formulário burocrático" que o vendedor preenche só porque o gerente mandou. O objetivo deste Épico é transformar a BANT em um **mentor de vendas invisível e num radar de oportunidades**, que ativamente ajuda o vendedor a fechar mais negócios e focar no que dá dinheiro.

---

## 🎯 Story 1: O Termômetro de Oportunidades (Radar Visual no Kanban)

**Como** um vendedor com 50 negócios pipocando no meu Kanban,
**Quero** bater o olho no funil e saber em 1 segundo quem está quente (🔥) e quem está frio (🧊),
**Para que** eu pare de desperdiçar meu tempo ligando para curiosos e foque minha energia nos leads que estão prontos para comprar hoje.

**Critérios de Aceite (Fora da Caixa):**
1. Adeus às barras de progresso chatas e pequenas no card. O negócio assumirá um "status térmico" baseado no score da BANT.
2. **🔥 Hot (Score > 75):** O card ganha um indicador vibrante, chamativo.
3. **☀️ Warm (Score 50-75):** O card fica com um status de atenção (morno).
4. **🧊 Cold (Score < 50):** O card fica sutil, indicando que o foco não deve estar ali na reta final do mês.
5. Se o card tem BANT zerada, o status é "Desconhecido 👻" (Ghost).

---

## 🎯 Story 2: O Caçador de Negócios (Smart Filters)

**Como** gerente de vendas (ou vendedor no fechamento do mês),
**Quero** um botão de pânico/foco na minha lista de negócios chamado *"Modo Sniper" (ou Apenas Quentes)*,
**Para que** eu consiga filtrar instantaneamente tudo que é "lixo" e exibir apenas a mina de ouro (score alto).

**Critérios de Aceite:**
1. Em `/deals` (visão Kanban e Lista), adicionar um *toggle* (interruptor) rápido nos filtros principais.
2. Na visão de Lista (Tabela), a coluna "BANT" permite ordenação (sort) decrescente.
3. A interface deve dar a sensação de que o vendedor está filtrando as "melhores cartas do baralho".

---

## 🎯 Story 3: O Mentor de Vendas Invisível (UI de BANT Ativa)

**Como** vendedor júnior,
**Quero** que o próprio sistema me avise o que estou esquecendo de perguntar,
**Para que** eu não envie uma proposta sem saber se a pessoa tem dinheiro (Budget) ou se ela é o tomador de decisão (Authority).

**Critérios de Aceite (Fora da Caixa):**
1. O formulário estático de Checkbox em `DealDetailScreen` se transforma em um "Painel de Missões".
2. Em vez de simplesmente mostrar caixas desmarcadas, o sistema destaca a próxima pergunta lógica. Ex: *"Atenção: Você não sabe o Orçamento! Na próxima ligação, pergunte sobre o limite de gastos."*
3. Se um negócio chegar no estágio final (ex: "Negociação") e a BANT for baixa, um Alerta Visual amarelo (Warning) vai gritar no painel de detalhes: *"Você está negociando às cegas! Avalie a Urgência (Timeline) antes de dar desconto."*

---

## 🎯 Story 4: O "Choque de Realidade" (Dashboard de Win-Rate)

**Como** Diretor de Vendas,
**Quero** um painel na minha Home que me mostre a correlação real entre "Ter BANT alto" e "Ganhar negócios",
**Para que** eu não precise brigar com a equipe para preencher a BANT; os próprios números vão esfregar na cara deles que fazer qualificação bota dinheiro no bolso.

**Critérios de Aceite:**
1. Na Dashboard, criar um card (gráfico ou KPI) de "Eficiência de Qualificação".
2. Fazer um cálculo simples (puramente no frontend, sem endpoints novos): Comparar a % de vitórias (Win-Rate) dos negócios que fecharam com *Score Alto* vs os que fecharam com *Score Baixo*.
3. O card exibe uma mensagem matadora do tipo: **"Vendedores que qualificam bem (🔥) estão convertendo 70% mais do que quem não qualifica (🧊)."**

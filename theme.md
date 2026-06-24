# Tema Base — MASI Dark Green

## Filosofia Visual

O tema utiliza uma combinação de:

- Dark Navy (fundo principal)
- Slate Blue (cards e superfícies)
- Neon Green (ações principais)
- Soft Gray (textos)
- Accent Colors (roxo, azul, amarelo e vermelho)

Objetivo:

- Aparência premium
- Sensação de sistema operacional / centro de comando
- Baixo contraste agressivo
- Fácil leitura em sessões longas

---

# Paleta Principal

## Backgrounds

```css
--background: #0b0f16;
--background-secondary: #0f1522;
--background-tertiary: #121a2a;
```

## Cards

```css
--card: #141b2a;
--card-hover: #182132;
--card-elevated: #1c2436;
```

## Bordas

```css
--border: #252d3e;
--border-light: #313a4e;
```

---

# Verde Principal

Cor dominante da interface.

```css
--primary: #16c784;
--primary-light: #22d393;
--primary-soft: #34d399;
```

Glow:

```css
--primary-glow: rgba(22, 199, 132, 0.18);
```

---

# Texto

## Principal

```css
--text-primary: #e5e7eb;
```

## Secundário

```css
--text-secondary: #94a3b8;
```

## Terciário

```css
--text-muted: #64748b;
```

---

# Cores de Apoio

## Azul

```css
--info: #3b82f6;
```

## Roxo

```css
--purple: #a855f7;
```

## Amarelo

```css
--warning: #f59e0b;
```

## Vermelho

```css
--danger: #ef4444;
```

---

# Sidebar

```css
background: #0d1420;
border-right: 1px solid #1d2636;
```

Item ativo:

```css
background: rgba(22, 199, 132, 0.12);
border: 1px solid rgba(22, 199, 132, 0.25);
color: #ffffff;
```

Item inativo:

```css
color: #94a3b8;
```

Hover:

```css
background: rgba(255, 255, 255, 0.03);
```

---

# Cards

```css
background: #141b2a;
border: 1px solid #252d3e;
border-radius: 18px;
```

Hover:

```css
transform: translateY(-2px);

box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
```

---

# Selects e Inputs

```css
background: #101827;
border: 1px solid #253044;
color: #e5e7eb;
```

Focus:

```css
border-color: #16c784;

box-shadow: 0 0 0 4px rgba(22, 199, 132, 0.12);
```

---

# Badges

Sucesso

```css
background: rgba(22, 199, 132, 0.15);
color: #16c784;
```

Info

```css
background: rgba(59, 130, 246, 0.15);
color: #3b82f6;
```

Alerta

```css
background: rgba(245, 158, 11, 0.15);
color: #f59e0b;
```

Erro

```css
background: rgba(239, 68, 68, 0.15);
color: #ef4444;
```

---

# Background Animado (Rede de Nós)

## Objetivo

Criar profundidade visual sem distrair o usuário.

Inspirado em:

- Linear
- Vercel
- Clerk
- Sistemas de monitoramento corporativo

---

## Configuração

Quantidade de pontos:

```txt
20 ~ 40
```

Opacidade:

```txt
10% ~ 20%
```

Velocidade:

```txt
Muito lenta
```

Linhas:

```txt
1px
```

Cor:

```css
rgba(22,199,132,0.12)
```

Nós:

```css
rgba(22,199,132,0.35)
```

Blur geral:

```css
filter: blur(0.2px);
```

---

# Biblioteca Recomendada

tsParticles

Configuração desejada:

```txt
Particles conectadas
Movimento lento
Interação desabilitada
Fundo transparente
Poucos elementos
```

Evitar:

```txt
Muitas partículas
Movimento rápido
Efeito gamer exagerado
```

---

# Sensação Final

Palavras-chave:

- Premium
- Enterprise
- Command Center
- Cyber Minimal
- Dark Professional
- AI Operating System

# 🦾 Sistema de Treinamento (Elite Protocol) - Rebalanceado

Este documento descreve a implementação e o racional de design do sistema de treinamento do **Urban Clash Team**. O sistema foi projetado para oferecer uma progressão de atributos significativa, porém equilibrada, ao longo do ciclo de 20 dias do jogo.

## 🎯 Conceito de Design

O sistema de treinamento foi rebalanceado para sair de uma progressão linear e oferecer **identidades táticas claras** para cada tipo de sessão. Isso permite que o jogador tome decisões estratégicas baseadas em sua build atual (focada em dano crítico, tanque ou equilíbrio).

### Tipos de Treinamento

#### 1. Treino Técnico (Foco em FOC)
*   **Papel:** Refinamento, precisão e disciplina tática.
*   **Identidade:** É o treino mais curto e barato, mas o único altamente eficiente na geração de **Foco (FOC)**.
*   **Uso Ideal:** Jogadores que buscam builds de acerto crítico e precisão técnica.

#### 2. Simulação Tática (Equilíbrio ATK/DEF)
*   **Papel:** Versatilidade e consistência.
*   **Identidade:** Oferece um ganho idêntico em **Ataque (ATK)** e **Defesa (DEF)**.
*   **Uso Ideal:** Jogadores que precisam de uma base sólida e equilibrada para sobreviver aos diversos perigos da cidade.

#### 3. Protocolo de Assalto (Foco em ATK)
*   **Papel:** Agressividade e força bruta.
*   **Identidade:** Maximiza o ganho de **Ataque (ATK)** e **Experiência (XP)**. É o treino mais caro e exaustivo.
*   **Uso Ideal:** Jogadores "glass cannon" ou que precisam subir de nível rapidamente antes de uma grande operação.

---

## 📊 Tabela de Balanceamento

| Treino | Duração | Custo (AP) | Custo ($) | Energia | ATK | DEF | FOC | XP | Papel Tático |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Técnico** | 20m | 400 | $100 | 15% | +1 | +1 | **+3** | 40 | Especialista em Foco |
| **Tático** | 50m | 1000 | $300 | 35% | **+5** | **+5** | +2 | 110 | Equilíbrio Total |
| **Assalto** | 100m | 2400 | $800 | 70% | **+12** | +4 | +2 | 280 | Força Bruta & XP |

### Racional de Progressão (Ciclo de 20 Dias)
*   **Limite Diário:** 8 sessões totais.
*   **AP Diário Estimado:** 20.000 AP.
*   **Impacto no Final do Jogo (Exemplo 8x Assalto/dia):** +1.920 ATK ao final de 20 dias.
*   **Justiça entre Facções:** Os ganhos são universais. O balanceamento de facção ocorre nas estatísticas base e passivas, garantindo que o treino seja uma ferramenta justa de progressão para Renegados e Guardiões.

---

## 🛠️ Arquitetura Técnica

### 1. Persistência (Redis-First)
*   O estado do treino (`training_ends_at`, `active_training_type`) é armazenado no **Redis** para baixa latência.
*   A sincronização com o **PostgreSQL** ocorre ao final de cada sessão.

### 2. Real-time (SSE Patches)
*   O frontend recebe atualizações via **Server-Sent Events (SSE)**.
*   Quando um treino termina, o backend envia um patch que aciona automaticamente a UI para oferecer a coleta de recompensas.

### 3. Lazy Reset (Daily)
*   O contador de 8 treinos diários é resetado no primeiro acesso do dia (fuso horário `America/Sao_Paulo`).

### 4. Segurança
*   Toda validação de custos (AP, Money, Energy) é feita no servidor.
*   O tempo de término é verificado no backend antes de conceder as recompensas, impedindo manipulações de relógio no cliente.

# Documentação de Atributos e Lógicas do Usuário

Este documento serve para esclarecer como funciona o perfil de um jogador (User Profile) no UrbanClash, explicando as mecânicas, atributos, as fórmulas que o backend utiliza para cálculos de combate e progressão, e como os dados fluem na aplicação.

## 1. Atributos Básicos de Conta
Quando um usuário novo é criado e loga no jogo, um perfil básico é associado a ele. Os atributos gerais que identificam a conta incluem:
- **ID / Username / Email**: Identificadores clássicos.
- **Faction (Facção)** e **Clan ID**: Indicam a que grupos ou equipes o jogador pertence. Existem diferenças nas mecânicas dependendo se a facção é de "Renegados" ou "Guardiões", especialmente no combate.
- **Is_Admin**: Flag que determina se o usuário é administrador.

## 2. Progressão (Nível e Experiência)
O jogo possui mecânicas de nivelamento híbrido, ou seja, compostas do Nível Base (via XP) somadas aos ganhos de atributos e riquezas.

### Nível Base (por XP) e Experiência
O XP flui numa escada progressiva. A dificuldade de avançar aumenta sutilmente:
- **XP Required (Fórmula)**: O XP necessário para completar o Nível Atual.
  - `XP_Necessário = 100 + (Math.floor(Level / 5) * 10)`
  - A cada 5 níveis concluídos, o teto sobe em 10 pontos.
- **Nível Alcançado por XP**: Calculado acumuladamente. Subtrai-se de todo XP Total adquirido o `XP_Required` de cada degrau sucessivamente até o saldo não ser suficiente.

### Escalabilidade de Treino
As recompensas de XP vindas de Treinamento escalam com o Nível do jogador para manter engajamento em High-Level:
- **Fórmula de Recompensa de Treino**: 
  - `XP_Ganho = XP_Base_do_Treino * (1 + (Level * 0.005))`
  - *Sendo que `0.005` é o fator nível. Um level 1000 recebe um multiplicador de 6x.*

### Nível Dinâmico (Prestígio Total)
O nível que é efetivamente exibido no Ranking e na maioria das telas não vem apenas da Experiência (XP). O Nível Dinâmico é:
- **Fórmula do Nível Dinâmico**: `Nível_Base_XP + Bônus_Atributos + Bônus_Riqueza`
  - **Bônus de Atributos**: `Soma de (Ataque + Defesa + Foco) / 25`. Cada 25 atributos puros garantem +1 Nível.
  - **Bônus de Riqueza**: `Dinheiro / 100.000`. Cada $100.000 em mãos garante +1 Nível. 

## 3. Recursos e Economia
- **Gold / Money**: Principal moeda corrente. Influencia o nível dinâmico (a cada $100k, ganha +1 Nível de forma passiva).
- **Gems (Gemas)**: Moeda premium.
- **Resources**: Termo comum em rotinas UI referindo à puramente quantia de *Money*.

## 4. Energia e Restaurar
Para limitar *spam*, ações custam pontos.
- **Energy (Inicial/Padrão):** 100.
- **Cálculo de Regeneração**:
  - **Taxa**: A energia se regenera a cada **3 Minutos**.
  - **Quantidade**: Ganha **1 unidade de energia** por ciclo.
  - A janela de cálculo cuida do tempo offline calculando `(now - lastUpdate) / 3 mins`.

## 5. Atributos de Combate (As Fórmulas do Dano e Crítico)
Eis o escopo matemático de quando dois players trocam socos:

### Dano Base e Defesa Bruta
- **Poder Ofensivo (Fórmula)**: `Dano_Raw = Ataque * 10`. Cada 1 ponto de Ataque (ATK) significa 10 de Dano bruto.
- **Defesa (Softcap e Intimidação)**: 
  - A Defesa Definitiva em campo é reduzida pela **Intimidação** do oponente:
    - `Defesa_Efetiva = Defesa_Defender * (1 - Intimidação_Attacker_%)`
  - A fórmula de mitigação final possui um *softcap* (limite suave) calibrado em `200`:
    - `Redução_% = Defesa_Efetiva / (Defesa_Efetiva + 200)`
- **Dano Físico Após Defesa**: `Dano_Inicial * (1 - Redução_%)`.

### Chances de Crítico (Crit Chance)
- **Fórmula de Chance (%)**:
  - `Crit_Chance_% = 5% (Base Genérica) + (Foco * 0.08) + Atributos_Críticos_Brutos`
- **Softcap limitador**: A chance é sempre **limitada em 60%** para balanceamento mecânico, ninguém consegue dar ataque critico em 100% dos hits.

### Dano Crítico (Evolução Contínua e Teto Funcional)
Diferente da simples rolagem de acerto, o **Multiplicador do Dano Crítico** é empilhado em 3 camadas, recompensando tanto quem grinda quanto quem adquire itens premium:
- **1ª Camada: Facção (A Base)**: Renegados geram garantidos **150%** de bônus, enquanto Guardiões geram **130%**.
- **2ª Camada: Academia (Progresso Orgânico Lento)**: O jogo soma seu Ataque, Defesa e Foco atuais. A cada `50 pontos` combinados, é gerado +1% extra no cálculo. Isso prova ao jogador que ser assíduo gera letalidade imperceptível a longo prazo.
- **3ª Camada: Privilégios (Armas Raras e VIPs)**: Pontos diretos injetados isoladamente no atributo `critical_damage` evitam a burocracia do limite de 50 pontos, dando saltos colossais na força estourando a estamina em torneios ou comprando caixas de arsenal.
- **A CONTA FINAL**: `Multiplicador = 1 + (Base Facção + Treino Diluído de 50 + Armas Escandalosas) / 100` *(Ex: Começa nascendo sempre próximo de 2.5x o dano limite).*
- **Hard-Cap (Limite para o jogo não quebrar)**: Por mais que treine bilhões de pontos na 2ª camada ou use 500 armas raras da 3ª camada, o código tem um abismo intransponível em **4.0x**, impedindo que PvP vire "One-Shots automáticos de um clique contra iniciantes".

## 6. Histórico e Retrospecto de Batalha
- **Wins / Losses**: Vitórias e derrotas gravadas.
- **XP de Combate (PvP)**: 
  - O vencedor recebe **100 XP** genérico de base (+bônus baseado em disparidade de força opc). 
  - O perdedor recebe **20 XP** de consolação (para desencorajar paralisação).
- **Streak / Winning Streak:** Quantidades dinâmicas de vitória ininterruptas para ranking.

## 7. Status Em Tempo Real (SSE) e "Aprimoramento"
Como os dados trafegam do Redis para o FrontEnd e visível na interface:
1. Funciona por **SSE (Server-Sent Events) - `userPlayerStateSSE`**: Todo acréscimo de energia, XP ou dinheiro que ocorre no backend emite um *Patch* enxuto.
2. Nossa função UI só assimila (mescla) o que mudou de fato, sem reler o banco.
3. Se um usuário entra em estado de **Treino**, o Redis registra a data de fim (`training_ends_at`). 
  - O *Frontend* aplica o **Aprimoramento Forçado**: se esse prazo futuro não expirou, ele desconsidera a flag genérica "Operacional" enviada pelo Backend em falhas momentâneas, engessando as funcionalidades do jogador até que o limite de tempo exploda ou conclua. 
  
## 8. Treinamento Diário
- O sistema limita treinamentos (`daily_training_count` vs `DAILY_CAP_TRAIN` de ~100.000 para scale master).
- Registra `last_training_reset` atrelado ao *Timezone* do jogo (`America/Sao_Paulo`). O backend efetua esse *Lazy Reset* no background em vez de sobrecarregar com rotinas *CRON*.

---

## 9. Exemplo Prático de Matemática UI (TopBar)
Para materializar o entendimento das lógicas, eis o fechamento de cálculo aplicado a um soldado "Guardião" exibindo **Nível 35** no topo da tela:
*   Ficha Bruta: **ATK: 58** | **DEF: 27** | **FOC: 29** | **Money: $0**

**Resolução do Nível e XP:**
- Soma Estrutural de Treino = `58 + 27 + 29 = 114 pontos`.
- Bônus por Status (Nível Dinâmico) = `Math.floor(114 / 25) = 4` Níveis bônus.
- Bônus Monetário = `$0 / 100k = 0` Nível bônus.
- Seu **Nível XP Base real** (despido de bônus) = `Nível TopBar (35) - Bônus (4) = 31`.
- Para o jogador 31, o *Teto do Próximo XP (XP Required)* = `100 + floor(31/5) * 10 = 160`. Ou seja, a barra de preenchimento baterá num alvo de `160 XP`.

**Resolução da Chance Crítica (CRIT%):**
- Genérica = `5%`.
- Rendimento Físico = `29 de Foco * 0.08 = 2.32%`.
- Saldo Final = `7.32%`. *(Lembrando que a disciplina foi removida deste cálculo para não violar a natureza defensiva do atributo. Logo, se você ver esse valor inflado no PvP com 11.32% em algum perfil, significa os 4.0% vieram puramente de bônus diretos garantidos por implantes/equipamentos).*

**Resolução do Dano Crítico (O Novo Multiplicador Dinâmico):**
- **Soma dos Atributos** = `58 + 27 + 29 = 114`.
- **Evolução de Esforço** = `114 / 50 = +2` de bônus ganho lentamente na academia.
- **Base Guardiões** = `130`.
- **Conta Final:** `1 + (130 + 2 da academia) / 100 = 2.32x`. 
- Caso caia uma espingarda VIP absurda que dê mais 100 pontos brutos, somaremos `+ 100` nessa fração interna e o multiplicador saltará em 1.0 cravado direto (sendo interrompido apenas pela muralha do limite obrigatório global imposto em `4.0x`).

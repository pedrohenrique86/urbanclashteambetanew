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

## 5. Metagame PvP: Atributos, Aura e Combate
Eis a matriz central matemática da Rinha, que garante que contas ricas e usuários gratuitos lutem com vantagens relativas a como uparam seus personagens e facções.

### 5.1 As Afinidades de Facção (Multiplicadores Genéticos)
Para evitar que jogadores de Guardião e Renegado fiquem idênticos ao treinarem na academia os mesmos status, o Backend injeta um "DNA" silencioso em cada atributo primário antes da briga começar:
- 🔥 **Renegados (Vocação de Dano)**: Todo ponto de Ataque deles rende `1.2x` na fórmula, mas a sua Defesa é capengada rendendo apenas `0.9x`. Renegados que treinam Defesa logo percebem o erro e mudam puramente para Ataque e Foco (Ficando Glass-Cannons letais).
- 🛡️ **Guardiões (Vocação de Tanque)**: Sua Defesa natural brota como impenetrável `1.2x`, enquanto seu próprio Ataque ofensivo nasce enfraquecido na ordem de `0.9x`. Guardiões prosperam ignorando o poder de dano fútil da academia, construindo uma massa invencível de bloqueio e atrito.

*(O atributo FOCO mantém-se com rentabilidade 1.0x para todos).*

### 5.2 O Medo e a Supressão de Aura (Power Solo)
A força bruta total de um personagem é o **Power Solo** *(Ataque + Defesa + Foco)*. O script de luta verifica quem é o guerreiro mais dominante num relance global.
- `Aura Modifier = (PowerSolo Atacante - PowerSolo Defensor) / 10.000`
- Limite do Medo: Um guerreiro gigante pode **punir até 30%** todo o dano que ele aplicará ou limitará do novato por pura "Supressão Tática". Isso valoriza profundamente os veteranos Top Rank do servidor.

### 5.3 Dano Base e Defesa Bruta
- **Poder Ofensivo (Fórmula)**: `Dano_Raw = Ataque_Afinado * 10`. 
- **Defesa (Softcap e Intimidação)**: 
  - Renegados usam a Passiva de **Intimidação** no oponente: `Defesa_Efetiva = Defesa_Afinada * (1 - Intimidação_Attacker_%)`.
  - A fórmula passa pelo *softcap* para evitar imortalidade cega: `Redução_% = Defesa_Efetiva / (Defesa_Efetiva + 200)`.
- **Dano Físico Pós-Defesa**: `Dano_Raw * (1 - Redução_%)`.

### 5.4 Chances de Crítico (Crit Chance)
- **Fórmula de Chance (%)**:
  - `Crit_Chance_% = 5% (Base Genérica) + (Foco * 0.08) + Atributos_Críticos_Brutos`
- **Softcap limitador**: A chance é sempre **limitada em 60%** para balanceamento mecânico, ninguém consegue dar ataque critico em 100% dos hits.

### 5.5 Dano Crítico (As 3 Camadas)
Diferente da simples rolagem de acerto, o **Multiplicador do Crítico** (aquele 2.3x) é empilhado em 3 camadas, recompensando grinds orgânicos e carteiras premium juntas:
- **1ª Camada: Facção**: Renegados geram garantidos **150%** e Guardiões geram **130%**.
- **2ª Camada: Academia (Progresso Orgânico Lento)**: A cada `50 pontos combinados` no Power Solo, é gerado +1% extra invisivel no cálculo. Isso prova ao jogador gratuito que ser assíduo gera letalidade.
- **3ª Camada: Privilégios (Armas Raras)**: Pontos diretos injetados isoladamente evitam burocracia, explodindo instantaneamente o dano num click.
- **Resolução Crítica no Hit**: 
  - Guardiões mitigam pesadamente Críticos inimigos em campo com a Passiva Fixa da **Disciplina**: o Dano Crítico Bônus do atacante sofre uma tesourada (se a disciplina for de 40%, um bônus extra de +200% cai para +120%).
- **Hard-Cap (Teto Limitador)**: Nenhum multiplicador consegue exceder o teto do script de **4.0x**, protegendo os novos de tomarem One-Shots indevidos de armas absurdas da 3ª camada.

## 6. Histórico e Retrospecto de Batalha
- **Wins / Losses**: Vitórias e derrotas gravadas.
- **XP de Combate (PvP)**: 
  - O vencedor recebe **100 XP** genérico (+bônus baseado em disparidade opc). 
  - O perdedor recebe **20 XP** de consolação (desencoraja afk).
- **Streak / Winning Streak:** Quantidades dinâmicas de vitória para ranking.

## 7. Status Em Tempo Real (SSE) e "Aprimoramento"
Como os dados trafegam do Redis para o FrontEnd e visível na interface:
1. Funciona por **SSE (Server-Sent Events) - `userPlayerStateSSE`**: Todo acréscimo de energia, XP ou dinheiro que ocorre no backend emite um *Patch* enxuto.
2. Nossa função UI só assimila (mescla) o que mudou de fato, sem reler o banco.
3. Se um usuário entra em estado de **Treino**, o Redis registra a data de fim. O FrontEnd aplica o **Aprimoramento Forçado**: se esse prazo futuro não expirou, ele desconsidera logs genéricos, engessando as funcionalidades da UI do jogador.
  
## 8. Treinamento Diário
- Sistema limita treinamentos via `daily_training_count` vs `DAILY_CAP_TRAIN`.
- Registra `last_training_reset` usando fuso do jogo (`America/Sao_Paulo`). Backend faz um *Lazy Reset* no background escapando da dor de cabeça do uso de velhos CRONs desnecessários.

---

## 9. Simulação de Combate Prático & Matemática de Status
Para materializar o entendimento das lógicas completas num cenário brutal para testadores:

**O Duelo Level 100 Balanceado (2.500 de Power Solo)**
*   🔥 Renegado: Focou puramente em `ATK: 1.500` | `FOC: 1.000` | `DEF: 0`.
*   🛡️ Guardião: Focou puramente em `DEF: 1.800` | `FOC: 700` | `ATK: 0` (e possui a fixa *Disciplina: 40%*).
*   **A Rinha**: 
    1. O Renagegado ativa o Ataque (`1.500 x Afinidade 1.2`), criando **1.800 de Força Base**. Seu Foco explodiu a chance máxima limitadora cravando brutais `60% de Chance Crítica`.
    2. O soco é letal. Deveria causar um rombo e exterminar com mais de *18.000 de dano* imediato, visto que ele tirou a Passiva de Crítico Absoluta.
    3. Porém, do lado oposto o Guardião aplica a contenção: Usa a Afinidade (`1.800 DEF x 1.2` = **2.160 Armadura impenetrável**). Mesmo com o Renegado reduzindo com Intimidação inata para arrancar um pedaço, o muro deflete incólumes **88% de todo o dano bruto sofrido**. 
    4. O dano base cai para `2.100`. E na hora de aplicar a multiplicação absurda do Crítico, invoca a lendária Habilidade Passiva de **Disciplina de 40%**. O fator crítico do Renegado quebrou ao meio na carapaça defensiva. 
    5. O dano limite, que em um jogador normal arrancaria 10k fáceis da vida do player novato, acerta uma arranhada de *4.000 pontos no tank*. O Combate é levado ao segundo round por pura resistência de Meta Game Tática. Fim da Homogeneização de status.

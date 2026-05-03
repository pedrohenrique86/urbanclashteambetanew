import React, { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { useNavigate } from "react-router-dom";
import { combatService, RadarTarget, PreCombatInfo, CombatResult } from "../services/combatService";
import { useUserProfile } from "../hooks/useUserProfile";
import { useToast } from "../contexts/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldExclamationIcon, 
  BoltIcon, 
  UserCircleIcon, 
  ExclamationTriangleIcon,
  FingerPrintIcon,
  CpuChipIcon,
  StarIcon,
  ClockIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon,
  AdjustmentsHorizontalIcon,
  FireIcon,
  HeartIcon
} from "@heroicons/react/24/outline";
import NPCCountdown from "../components/combat/NPCCountdown";
import { FACTION_ALIAS_MAP_FRONTEND } from "../utils/faction";

const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

const HPBar = ({ current, max, label, color, isRight }: { current: number, max: number, label: string, color: string, isRight?: boolean }) => {
  const percentage = Math.max(0, (current / max) * 100);
  
  return (
    <div className={`flex flex-col ${isRight ? 'items-end' : 'items-start'} w-full flex-1 max-w-[350px]`}>
      <div className={`flex justify-between w-full mb-1.5 px-0.5 items-end ${isRight ? 'flex-row-reverse' : ''}`}>
        <div className="flex items-center gap-1.5">
          <HeartIcon className={`w-3 h-3 ${current < max * 0.3 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
          <span className="text-[10px] font-black font-orbitron text-slate-300 uppercase tracking-widest">{label}</span>
        </div>
        <div className="flex flex-col items-end">
           <span className="text-[11px] font-mono font-bold text-white leading-none">{current.toFixed(0)} <span className="text-slate-500 text-[8px]">/ {max}</span></span>
        </div>
      </div>
      <div className="relative w-full h-5 bg-black/60 border border-slate-800/50 overflow-hidden shadow-inner" style={MILITARY_CLIP}>
        {/* Track Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4px_4px]"></div>
        
        {/* Ghost bar (damage indicator) */}
        <motion.div 
          initial={{ width: "100%" }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          className="absolute top-0 left-0 h-full bg-red-600/30"
        />
        
        {/* Main HP bar */}
        <motion.div 
          initial={{ width: "100%" }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "circOut" }}
          className={`h-full bg-gradient-to-r ${color} relative`}
        >
          {/* Animated Shine */}
          <motion.div 
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-1/2 skew-x-12"
          />
        </motion.div>
        
        {/* Critical Low HP Flash */}
        {current < max * 0.25 && (
          <motion.div 
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="absolute inset-0 bg-red-500/20"
          />
        )}
      </div>
    </div>
  );
};

const ANALYZING_PHRASES = [
  "ANALISANDO DADOS DO ALVO...",
  "RASTREANDO PACOTES DE REDE...",
  "CALCULANDO IMPACTO NEURAL...",
  "SINCRONIZANDO COM SPECTRO...",
  "VERIFICANDO VULNERABILIDADES ARQUITETÔNICAS...",
  "DECODIFICANDO FIREWALL DE DEFESA...",
  "MONITORANDO FLUXO DE DINHEIRO ESCUSO...",
  "MAPEANDO BACKDOORS DE FUGA..."
];

const BattleRulesInfo = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all text-slate-400 hover:text-cyan-400 group"
        style={MILITARY_CLIP}
      >
        <QuestionMarkCircleIcon className="w-4 h-4 group-hover:animate-pulse" />
        <span className="text-[10px] font-mono font-black uppercase tracking-wider">Como Funciona?</span>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000]"
            />

            {/* Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
              className="fixed top-1/2 left-1/2 w-[90%] max-w-lg bg-slate-900 border border-slate-700 p-6 md:p-8 z-[1001] shadow-2xl overflow-y-auto max-h-[80vh]"
              style={MILITARY_CLIP}
            >
              <h3 className="font-orbitron font-black text-cyan-400 uppercase text-sm mb-4 flex items-center gap-2 border-b border-cyan-500/20 pb-2">
                <InformationCircleIcon className="w-5 h-5" />
                Matriz de Combate 1x1
              </h3>
              
              <div className="space-y-4 font-mono text-[10px] leading-relaxed">
                <div>
                  <p className="text-white font-bold mb-1 uppercase flex items-center gap-2">
                    <FireIcon className="w-3 h-3 text-red-500" /> Vitalidade (HP) & Combate Assimétrico
                  </p>
                  <p className="text-slate-400">
                    O Rastreador Spectro <span className="text-white font-bold">ignora facções aliadas</span>; você só encontrará alvos de corporações opostas (Ex: Guardiões x Renegados).
                    Sua <span className="text-emerald-400 font-bold">Vida (HP)</span> agora escala massivamente com seu <span className="text-white">Nível</span>,  <span className="text-white">Defesa</span> e a soma total de <span className="text-white">todos os seus atributos combinados</span>. 
                    <span className="text-blue-400 font-bold"> Guardiões</span> ganham +25% de bônus de constituição estrutural de HP, enquanto <span className="text-red-400 font-bold"> Renegados</span> sacrificam -10% de HP por alta letalidade. A Defesa que você veste amortece diretamente o dano bruto.
                  </p>
                </div>
                
                <div>
                  <p className="text-white font-bold mb-1 uppercase flex items-center gap-2">
                    <StarIcon className="w-3 h-3 text-yellow-400" /> Críticos e Habilidades Periciais
                  </p>
                  <p className="text-slate-400">
                    O <span className="text-yellow-400 font-bold">Foco</span> eleva a taxa base de Crítico. 
                    <span className="text-red-400 font-bold"> Renegados</span> testam a sua chance extraída da perícia <span className="text-white">Intimidação</span> para despoletar um <span className="text-red-500 font-black">BREACH</span> (Quebra de Defesa). Um combate com BREACH ignora completamente 40% de toda armadura/mitigação inimiga para um acerto limpo!
                    Já os <span className="text-blue-400 font-bold"> Guardiões</span> ativam <span className="text-white">Disciplina</span> tanto para reduzir fortemente o impacto sangrento de danos críticos injetados por Renegados, quanto para engatilhar contra-ataques reflexivos.
                  </p>
                </div>

                <div>
                  <p className="text-white font-bold mb-1 uppercase flex items-center gap-2">
                    <AdjustmentsHorizontalIcon className="w-3 h-3 text-violet-400" /> Supressão de Aura e Power Solo
                  </p>
                  <p className="text-slate-400">
                    O seu <span className="text-violet-400 font-bold">Power Solo</span> é a soma bruta de todos os seus atributos diretos <span className="text-slate-500">(ATK + DEF + FOC)</span>. A diferença de Power Solo entre você e o alvo gera uma &quot;Aura&quot;. 
                    O modificador de dano escala dinamicamente baseado nessa diferença, com teto de +/- 20%. Exatamente cada <span className="text-violet-400 font-bold">1000</span> pontos de diferença de Power Solo concedem o máximo impacto sobre o alvo.
                  </p>
                </div>

                <div className="bg-red-500/10 p-3 border border-red-500/20 text-red-400 text-[9px] uppercase italic">
                  NPCs variam de 80% a 120% do seu poder. Alvos BOSS (Raros) sempre operam em 130%+.
                </div>

                <div>
                  <p className="text-white font-bold mb-1 uppercase flex items-center gap-2 mt-4 border-t border-slate-800 pt-4">
                    <FingerPrintIcon className="w-4 h-4 text-emerald-400" /> Recompensas Dinâmicas
                  </p>
                  <p className="text-slate-400 mt-2">
                    A conexão custa <span className="text-emerald-400 font-bold">300 PA</span> e <span className="text-yellow-400 font-bold">50% EN</span>.
                    As recompensas de XP e Atributos são <span className="text-cyan-400 font-bold">MODULARES</span>: quanto maior o desafio do alvo em relação ao seu poder, maior o aprendizado.
                  </p>
                  <ul className="text-[9px] text-slate-500 space-y-1 mt-2 list-disc list-inside uppercase">
                    <li><span className="text-white">XP</span> escala com seu nível (mesma curva do treino).</li>
                    <li>Chance de 5% de <span className="text-yellow-400 italic">Spectro Insight</span> (2x XP).</li>
                    <li>Ganho de atributos varia de acordo com a força do alvo.</li>
                    <li>Bots Comuns soltam sucata monetária ($20-$50).</li>
                  </ul>
                  <p className="text-slate-500 mt-3 italic text-[8px]">
                    VITÓRIA POR DECISÃO: Se nenhum lado for abatido em 3 turnos, quem tiver maior % de HP vence. Se você perder por decisão, ficará SANGRANDO (15 min).
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsOpen(false)}
                className="mt-6 w-full py-2 bg-slate-900 border border-slate-800 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors"
                style={MILITARY_CLIP}
              >
                Entendido
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function ReckoningPage() {
  const { userProfile, refreshProfile } = useUserProfile();
  const { showToast } = useToast();
  
  const playerLevel = userProfile?.level || 1;
  const { data: targets, error, mutate, isValidating } = useSWR(
    playerLevel >= 10 ? "/combat/radar" : null, 
    combatService.getRadarTokens,
    { 
      revalidateOnFocus: false,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      shouldRetryOnError: (err) => {
        // Não retenta se for erro de negócio (403/400 com level insuficiente)
        const status = err?.response?.status;
        return status !== 403 && status !== 401;
      }
    }
  );
  
  const [selectedTarget, setSelectedTarget] = useState<RadarTarget | null>(null);
  const [preCalc, setPreCalc] = useState<PreCombatInfo | null>(null);
  const [loadingPreCalc, setLoadingPreCalc] = useState(false);
  
  const [combatPhase, setCombatPhase] = useState<"radar" | "precalc" | "fighting" | "result">("radar");
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [finalResult, setFinalResult] = useState<CombatResult | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [turnCountdown, setTurnCountdown] = useState<number | null>(null);
  const [countdownMessage, setCountdownMessage] = useState("");
  const [combatHP, setCombatHP] = useState<{ pHP: number; pMax: number; tHP: number; tMax: number } | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [bleedingTime, setBleedingTime] = useState<string | null>(null);
  const navigate = useNavigate();

  const closeResult = useCallback(() => {
    setCombatPhase("radar");
    setSelectedTarget(null);
    setPreCalc(null);
    mutate(); // Refresh radar
  }, [mutate]);

  // Countdown para redirecionamento automático pós-luta
  useEffect(() => {
    if (combatPhase === "result" && finalResult) {
      setRedirectCountdown(15);
      const timer = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            if (finalResult.winner || finalResult.outcome === "draw_flee") {
              closeResult(); // Volta para o radar se ganhou ou se fugiu sem danos críticos
            } else {
              navigate("/recovery-base"); // Manda para a base de recuperação se perdeu ou empate DKO
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [combatPhase, finalResult, navigate, closeResult]);

  // Sincronização do cronômetro de sangramento/status
  useEffect(() => {
    if (userProfile?.status === 'Sangrando' && userProfile?.status_ends_at) {
      const updateTimer = () => {
        const now = Date.now();
        const end = new Date(userProfile.status_ends_at!).getTime();
        const diff = end - now;

        if (diff <= 0) {
          setBleedingTime(null);
          // O playerStateService resetará automaticamente no próximo pull, 
          // mas o useUserProfile já tem o SSE ouvindo mudanças.
        } else {
          const m = Math.floor(diff / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setBleedingTime(`${m}m ${s}s`);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setBleedingTime(null);
    }
  }, [userProfile?.status, userProfile?.status_ends_at]);
  
  const handleSelectTarget = async (target: RadarTarget) => {
    if ((userProfile?.action_points || 0) < 300) {
      showToast("Você precisa de 300 Pontos de Ação (PA) para preparar a interceptação.", "warning");
      return;
    }
    if ((userProfile?.energy || 0) < 50) {
      showToast("Energia insuficiente. Recarregue para 50% para abrir o rastreador.", "warning");
      return;
    }
    setSelectedTarget(target);
    setLoadingPreCalc(true);
    try {
      const info = await combatService.getPreCalc(target.id);
      setPreCalc(info);
      setCombatPhase("precalc");
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
      setSelectedTarget(null);
    } finally {
      setLoadingPreCalc(false);
    }
  };

  const cancelCombat = () => {
    setSelectedTarget(null);
    setPreCalc(null);
    setCombatPhase("radar");
  };

  const handleAttack = async () => {
    if (!selectedTarget) return;
    if ((userProfile?.action_points || 0) < 300) {
      showToast("Protocolo Negado: O Spectro cobra 300 PA pela transferência de dados táticos.", "error");
      return;
    }
    if ((userProfile?.energy || 0) < 50) {
      showToast("Protocolo Negado: Você precisa de 50% de energia para iniciar um Acerto de Contas.", "error");
      return;
    }
    try {
      setCombatPhase("fighting");
      setBattleLog([]);
      setFinalResult(null);
      
      const result = await combatService.attack(selectedTarget.id);
      
      // Inicializa HP bars
      // Inicializa HP bars (Estimativa inicial baseada nos níveis e atributos conhecidos)
      const getEstimate = (lvl: number, def: number, atk: number, foc: number, fac: string) => {
        const totalStats = atk + def + foc;
        let h = 100 + (lvl * 15) + (def * 10) + (totalStats * 4);
        const f = fac.toLowerCase();
        if (f.includes("guard")) h *= 1.25;
        else if (f.includes("reneg") || f.includes("gang")) h *= 0.9;
        return Math.round(h);
      };
      
      const pTotal = (userProfile?.attack || 0) + (userProfile?.defense || 0) + (userProfile?.focus || 0);
      const estTgtAtk = selectedTarget?.level ? selectedTarget.level * 20 : 20;
      const estTgtDef = selectedTarget?.level ? selectedTarget.level * 20 : 20;
      const estTgtFoc = selectedTarget?.level ? selectedTarget.level * 20 : 20;

      const pInitialMax = getEstimate(userProfile?.level || 1, userProfile?.defense || 0, userProfile?.attack || 0, userProfile?.focus || 0, String(userProfile?.faction || ""));
      const tInitialMax = getEstimate(selectedTarget?.level || 1, estTgtDef, estTgtAtk, estTgtFoc, String(preCalc?.targetInfo.faction || ""));
      
      setCombatHP({
        pHP: pInitialMax,
        pMax: pInitialMax,
        tHP: tInitialMax,
        tMax: tInitialMax
      });
      
      // Countdown Inicial (5 segundos)
      const initPhrases = [
        "ESTABELECENDO TÚNEL NEURAL SEGURO...",
        "SINCRONIZANDO RELÓGIO DE COMBATE...",
        "CARREGANDO MÓDULOS SPECTRO_v9.1...",
        "INJETANDO SCRIPTS DE INTERCEPTAÇÃO...",
        "LOCALIZANDO NÓ DE DEFESA DO ALVO..."
      ];
      setCountdownMessage(initPhrases[Math.floor(Math.random() * initPhrases.length)]);
      for (let s = 5; s > 0; s--) {
        setTurnCountdown(s);
        await new Promise(r => setTimeout(r, 1000));
      }
      setTurnCountdown(null);
      setCountdownMessage("");

      const totalTurns = result.log.length;
      for (let i = 0; i < totalTurns; i++) {
        const turnText = result.log[i];
        const turnHP = result.hpLog?.[i];

        // 1. Exibe o texto do turno e inicia a digitação
        setBattleLog(prev => [...prev, turnText]);
        
        // Aguarda a animação de digitação (20ms por caractere)
        await new Promise(r => setTimeout(r, turnText.length * 20));

        // 2. Após o texto aparecer, atualizamos o HP para sincronizar com o impacto do golpe
        if (turnHP) {
          setCombatHP({
            pHP: turnHP.defenderHP,
            pMax: turnHP.defenderMaxHP,
            tHP: turnHP.attackerHP,
            tMax: turnHP.attackerMaxHP
          });
        }
        
        // Aguarda um pequeno buffer antes de avançar para ler o resultado do golpe
        await new Promise(r => setTimeout(r, 800));

        // 2. Se NÃO for o último turno, abre contagem de 10s para o próximo
        if (i < totalTurns - 1) {
          let msg = "";
          if (i === 0) {
            if (result.outcome === "draw_dko") {
               msg = "Bio-assinaturas colidindo... isso vai acabar mal para os dois!";
            } else {
               const pPwr = (userProfile?.attack || 0) + (userProfile?.defense || 0) + (userProfile?.focus || 0);
               const tPwr = (preCalc?.targetInfo.level || 1) * 30;
               const ratio = pPwr / tPwr;
               const dominance = Math.min(99, Math.round(ratio * 100));
               msg = `ANÁLISE DE PODER: ${dominance}% DOMINÂNCIA SOBRE ALVO...`;
            }
          } else {
            msg = "SINCRONIZANDO PROTOCOLO FINAL DO SPECTRO...";
          }
          
          setCountdownMessage(msg);
          for (let s = 10; s > 0; s--) {
            setTurnCountdown(s);
            await new Promise(r => setTimeout(r, 1000));
          }
          setTurnCountdown(null);
        }
      }
      
      // 3. Após o último turno, aguarda 5 segundos antes de seguir o fluxo
      setCountdownMessage("FINALIZANDO CONEXÃO...");
      setTurnCountdown(5);
      for (let s = 5; s > 0; s--) {
        setTurnCountdown(s);
        await new Promise(r => setTimeout(r, 1000));
      }
      setTurnCountdown(null);
      
      const isWin = result.outcome.startsWith("win");
      const isCriticalDirect = !isWin && result.outcome !== "draw_flee";
      
      // Sincroniza o perfil antes de decidir o fluxo
      await refreshProfile();

      if (isCriticalDirect) {
        // Redirecionamento automático para perdas críticas (HP 0 ou hospitalização)
        if (result.outcome === "loss_ko") {
          showToast(`K.O. - Seus sistemas críticos falharam. Recondicionamento obrigatório.`, "error");
        } else if (result.outcome === "loss_bleeding") {
          showToast(`SANGRANDO - Você recuou com danos sistêmicos. Recuperação necessária.`, "warning");
        } else {
          showToast(`SISTEMA COMPROMETIDO - Redirecionando para Base de Recuperação...`, "warning");
        }
        
        setIsFinalizing(true);
        navigate("/recovery-base");
        return;
      }

      setFinalResult({ ...result, winner: isWin });
      
      // Toast notification for successful outcome
      if (isWin) {
        if (result.outcome === "win_bleeding") {
           showToast(`VITÓRIA POR UM FIO! ${result.targetRealName} neutralizado, mas você está SANGRANDO.`, "warning");
        } else {
           showToast(`VITÓRIA! Você neutralizou ${result.targetRealName} com sucesso.`, "success");
        }
      }

      // Ativa a tela de resultados com o timer para vencedores ou fugas
      setCombatPhase("result");
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
      cancelCombat();
    }
  };



  if (userProfile?.status === "Recondicionamento" && combatPhase === "radar") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ExclamationTriangleIcon className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
        <h1 className="text-3xl font-orbitron font-black text-white uppercase tracking-widest mb-4">SISTEMA COMPROMETIDO</h1>
      </div>
    );
  }

  // Evita exibir o radar ou restos da luta durante o redirecionamento
  if (isFinalizing) return null;

  if ((userProfile?.level || 1) < 10 && combatPhase === "radar") {
    // Lógica idêntica ao UnderConstruction para extrair tema por facção
    const rawFaction = userProfile?.faction as any;
    const factionName = typeof rawFaction === 'string' ? rawFaction : (rawFaction?.name || 'gangsters');
    const factionKey = String(factionName).toLowerCase().trim();
    const canonicalFaction = FACTION_ALIAS_MAP_FRONTEND[factionKey] || 'gangsters';
    const isGangster = canonicalFaction === "gangsters";

    const theme = isGangster 
    ? {
        color: "orange",
        text: "text-orange-400",
        bg: "from-orange-500/20 to-red-500/20",
        glow: "drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]",
        gradient: "from-orange-400 to-red-400",
        accent: "bg-orange-500",
        light: "bg-orange-500/10"
      }
    : {
        color: "blue",
        text: "text-blue-400",
        bg: "from-blue-500/20 to-purple-500/20",
        glow: "drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]",
        gradient: "from-blue-400 to-cyan-400",
        accent: "bg-blue-500",
        light: "bg-blue-500/10"
      };

    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
          style={{
            boxShadow: "0 0 30px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
          }}
        >
          <div className={`absolute -top-24 -left-24 w-40 h-40 ${theme.light} blur-[80px] rounded-full`} />
          <div className={`absolute -bottom-24 -right-24 w-40 h-40 ${theme.light} blur-[80px] rounded-full`} />

          <div className="relative z-10 text-center space-y-4">
            <motion.div
              initial={{ y: -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${theme.bg} border border-white/10 mb-0`}
            >
              <ShieldExclamationIcon className={`w-7 h-7 ${theme.text} ${theme.glow}`} />
            </motion.div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-xl md:text-2xl font-bold font-orbitron tracking-tight text-white mb-2 uppercase">
                Spectro <span className={`text-transparent bg-gradient-to-r ${theme.gradient} bg-clip-text`}>Reckoning</span>
              </h1>
              <div className={`w-12 h-1 bg-gradient-to-r ${isGangster ? 'from-orange-500' : 'from-blue-500'} to-transparent mx-auto rounded-full mb-3`} />
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-slate-300 text-sm font-light leading-relaxed max-w-xs mx-auto"
            >
              A arena definitiva de elite para interceptação tática e caça de recompensas. Rastreie alvos de alto valor e domine os setores de Neon City.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 }}
              className="py-5 px-6 bg-red-500/10 border-y border-red-500/30 my-4"
            >
              <p className="text-red-400 font-black text-xs leading-relaxed uppercase italic tracking-tight">
                &quot;Você está fraco demais para acessar essa página! Vá treinar antes que o Spectro frite seus circuitos.&quot;
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="pt-2 flex flex-col items-center gap-4"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                <span className={`w-2 h-2 rounded-full ${theme.accent} animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]`} />
                Requer Nível 10
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] p-4 md:p-8 font-sans text-slate-300 relative selection:bg-yellow-500/30">
      
      {/* HUD DECORATION - CORNERS */}
      <div className="fixed inset-0 pointer-events-none border-[1px] border-yellow-500/10 opacity-30 m-4 hidden md:block z-0">
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-yellow-500/50"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-yellow-500/50"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-yellow-500/50"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-yellow-500/50"></div>
      </div>
      
      <header className="max-w-6xl mx-auto mb-12 relative z-10 flex flex-wrap gap-4 items-center justify-between">
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.8)]"></div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl md:text-6xl font-orbitron font-black tracking-widest text-white uppercase" style={{ textShadow: "2px 0px 0px rgba(234,179,8,0.7), -2px 0px 0px rgba(139,92,246,0.7)" }}>
            Spectro <span className="text-yellow-500">Reckoning</span>
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 text-slate-300">SEC_LEVEL: 10</span>
            <span className="text-[10px] font-mono text-yellow-500 animate-pulse tracking-widest">● LIVE_TARGETS</span>
            <p className="text-slate-400 text-xs font-mono hidden md:block uppercase tracking-tighter">
              SISTEMA DE RASTREAMENTO TÁTICO E INTERCEPTAÇÃO.
            </p>
          </div>
        </motion.div>
        
        <div className="flex items-center gap-6">
          <BattleRulesInfo />
          
          <div className="bg-black/50 border border-slate-700 p-2 md:p-3 flex items-center gap-3">
             <FingerPrintIcon className="w-6 h-6 text-emerald-500" />
             <div className="flex flex-col">
               <span className="text-[10px] font-mono text-slate-400 uppercase">Pontos_Ação</span>
               <span className="text-lg font-black font-orbitron text-emerald-400">{userProfile?.action_points?.toLocaleString() || 0}</span>
             </div>
          </div>
          
          <div className="bg-black/50 border border-slate-700 p-2 md:p-3 flex items-center gap-3">
             <BoltIcon className="w-6 h-6 text-yellow-500 animate-pulse" />
             <div className="flex flex-col">
               <span className="text-[10px] font-mono text-slate-400 uppercase">Energia</span>
               <span className="text-lg font-black font-orbitron text-yellow-400">{userProfile?.energy || 0}%</span>
             </div>
          </div>
        </div>
      </header>

      {userProfile?.status === 'Sangrando' && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto mb-8 bg-black border-2 border-rose-600 p-6 flex items-center gap-6 text-rose-500 shadow-[0_0_40px_rgba(225,29,72,0.3)] relative overflow-hidden group" 
          style={MILITARY_CLIP}
        >
          {/* Animated Background Overlay */}
          <div className="absolute inset-0 bg-rose-600/5 animate-pulse pointer-events-none"></div>
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-600 shadow-[0_0_20px_rgba(225,29,72,1)]"></div>
          
          <div className="relative z-10 flex items-center justify-center w-14 h-14 bg-rose-600/20 border border-rose-600/40 shrink-0">
            <ExclamationTriangleIcon className="w-10 h-10 animate-pulse text-rose-500" />
          </div>

          <div className="relative z-10">
            <h3 className="font-orbitron font-black uppercase text-sm tracking-[0.2em] drop-shadow-[0_0_10px_rgba(225,29,72,0.8)] text-rose-500">
              ESTADO CRÍTICO: UNIDADE SANGRANDO
            </h3>
            <p className="font-mono text-[10px] text-rose-500/90 uppercase leading-relaxed mt-1 max-w-4xl">
               Hemorragia sistêmica detectada. Penalidade de <span className="font-black text-rose-400">-20% em todos os atributos base</span>. 
               O engajamento em combate neste estado é classificado como protocolo de autodestruição.
            </p>
            {bleedingTime && (
              <div className="flex items-center gap-2 mt-3 bg-rose-600/20 border border-rose-600/40 px-3 py-1 w-fit">
                <ClockIcon className="w-3 h-3 text-rose-400" />
                <span className="text-[10px] font-black font-orbitron text-rose-400 uppercase tracking-widest leading-none">
                  Sincronia Estável em: <span className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{bleedingTime}</span>
                </span>
              </div>
            )}
          </div>

          {/* Decorative Corner */}
          <div className="absolute bottom-0 right-0 p-1 opacity-20">
             <div className="w-4 h-4 border-b-2 border-r-2 border-rose-600"></div>
          </div>
        </motion.div>
      )}
      
      <div className="max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {/* FASE: RADAR */}
          {combatPhase === "radar" && (
            <motion.div key="radar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
               {!targets && !error && (
                 <div className="flex justify-center items-center py-20">
                   <div className="w-10 h-10 border-2 border-red-500 border-t-transparent flex rounded-full animate-spin"></div>
                 </div>
               )}
               {error && (
                 <div className="text-center py-10 border border-red-500/30 bg-red-500/5" style={MILITARY_CLIP}>
                   <ExclamationTriangleIcon className="w-10 h-10 text-red-500 mx-auto mb-3" />
                   <p className="font-mono text-red-400 text-sm mb-1">Erro ao varrer a rede por alvos.</p>
                   <p className="font-mono text-red-500/60 text-[10px] mb-4 uppercase">{error?.response?.data?.error || error?.message || 'Falha na conexão com o servidor.'}</p>
                   <button 
                     onClick={() => mutate()} 
                     disabled={isValidating}
                     className="px-6 py-2 bg-red-500/10 border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50"
                     style={MILITARY_CLIP}
                   >
                     {isValidating ? 'REESCANEANDO...' : 'REESCANEAR REDE'}
                   </button>
                 </div>
               )}
               {targets && targets.length === 0 && (
                 <div className="text-center py-20 border border-slate-800 bg-black/40">
                   <p className="font-mono text-slate-500 mb-2">Nenhum alvo viável encontrado na rede no momento.</p>
                   <button onClick={() => mutate()} className="text-xs text-red-400 font-bold hover:underline">REESCANEAR REDE</button>
                 </div>
               )}
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {targets?.map((tgt) => (
                   <div 
                     key={tgt.id}
                     onClick={() => !loadingPreCalc && handleSelectTarget(tgt)}
                     className={`cursor-pointer group relative bg-black/60 backdrop-blur-md border transition-all duration-300 
                       ${tgt.is_rare ? 'border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'border-slate-800'}
                       ${loadingPreCalc ? 'opacity-50 pointer-events-none' : 'hover:border-yellow-500/50 hover:bg-slate-900 shadow-[0_0_20px_rgba(234,179,8,0)] hover:shadow-[0_0_20px_rgba(234,179,8,0.2)]'}`}
                     style={MILITARY_CLIP}
                   >
                     {tgt.is_rare && (
                       <div className="absolute top-0 left-0 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 tracking-widest z-10 animate-pulse drop-shadow-[0_0_8px_rgba(220,38,38,1)] uppercase">
                         BOSS
                       </div>
                     )}
                     {tgt.online && (
                       <div className="absolute top-3 right-3 flex items-center gap-1.5">
                         <span className={`w-2 h-2 rounded-full animate-pulse ${tgt.is_rare ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                         <span className={`text-[8px] font-mono ${tgt.is_rare ? 'text-red-400' : 'text-emerald-400'}`}>{tgt.is_rare ? 'SINAL_INSTÁVEL' : 'ONLINE'}</span>
                       </div>
                     )}
                     <div className="p-5 flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                           <div className={`w-12 h-12 bg-slate-900 border flex items-center justify-center transition-colors
                             ${tgt.is_rare ? 'border-red-500/50 text-red-500' : 'border-slate-800 text-slate-600 group-hover:text-yellow-500'}`}>
                             {tgt.is_rare ? <ExclamationTriangleIcon className="w-8 h-8 animate-pulse" /> : <UserCircleIcon className="w-8 h-8" />}
                           </div>
                           <div className="min-w-0 flex-1">
                             <p className="text-[10px] uppercase font-mono text-slate-500 truncate">{tgt.is_npc ? 'ALVO_SINTÉTICO' : 'IDENTIDADE (ENCRIPTADA)'}</p>
                             <h3 className={`font-orbitron font-black text-xs md:text-sm tracking-widest truncate ${tgt.is_rare ? 'text-red-500' : 'text-white'}`} title={tgt.name}>{tgt.name}</h3>
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2">
                           <div className="bg-white/5 border border-white/5 p-2 flex flex-col items-center">
                              <span className="text-[8px] font-black uppercase text-slate-400">NÍVEL_LVL</span>
                              <span className="font-mono text-sm text-white">{tgt.level}</span>
                           </div>
                           <div className="bg-white/5 border border-white/5 p-2 flex flex-col items-center">
                              <span className="text-[8px] font-black uppercase text-slate-400">STATUS</span>
                              <span className={`font-mono text-[10px] capitalize ${tgt.is_rare ? 'text-red-400' : 'text-slate-400'}`}>
                                {tgt.is_rare ? 'VOLÁTIL' : 'LOCALIZADO'}
                              </span>
                           </div>
                        </div>

                        {tgt.expires_at && (
                          <NPCCountdown expiresAt={tgt.expires_at} onExpire={() => mutate()} />
                        )}
                     </div>
                     <div className={`bg-slate-900 border-t border-slate-800 p-2 text-center text-[10px] font-mono transition-colors
                       ${tgt.is_rare ? 'text-red-400 font-black' : 'text-slate-500 group-hover:text-yellow-400'}`}>
                       {tgt.is_rare ? '>>> INTERCEPTAR_AGORA <<<' : 'CLIQUE PARA RASTREAR...'}
                     </div>
                   </div>
                 ))}
               </div>
            </motion.div>
          )}

          {/* FASE: PRE-CALC */}
          {combatPhase === "precalc" && preCalc && (
            <motion.div key="precalc" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto">
              <div className="bg-black/60 border border-slate-700 backdrop-blur-xl p-8" style={MILITARY_CLIP}>
                <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-4">
                   <CpuChipIcon className="w-10 h-10 text-cyan-400" />
                   <div>
                     <h2 className="font-orbitron font-black text-2xl text-white uppercase">Sinal Rastreado</h2>
                     <p className="text-cyan-400 font-mono text-[10px] tracking-widest">TRANSMISSÃO_SPECTRO_SECURE</p>
                   </div>
                </div>

                <div className="bg-slate-900/50 border-l-4 border-cyan-500 p-4 mb-8 font-mono text-sm text-cyan-100 flex gap-3 italic">
                   <span className="text-cyan-500 mt-0.5">&ldquo;</span>
                   <p>{preCalc.spectroHint}</p>
                   <span className="text-cyan-500 self-end">&rdquo;</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                   <div className="bg-black border border-slate-800 p-4">
                     <span className="block text-[10px] text-slate-500 font-mono uppercase mb-1">Seu Nível</span>
                     <span className="font-orbitron font-black text-2xl text-white">{userProfile?.level || 1}</span>
                   </div>
                   <div className="bg-black border border-slate-800 p-4">
                     <span className="block text-[10px] text-slate-500 font-mono uppercase mb-1">Alvo [{preCalc.targetInfo.name}]</span>
                     <span className="font-orbitron font-black text-2xl text-yellow-500">{preCalc.targetInfo.level}</span>
                   </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={cancelCombat} className="w-1/3 p-4 bg-slate-900 border border-slate-700 text-slate-300 font-orbitron font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors" style={MILITARY_CLIP}>
                    Abortar
                  </button>
                  <button onClick={handleAttack} className="w-2/3 p-4 bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 font-orbitron font-bold text-sm uppercase tracking-widest hover:bg-yellow-500 hover:text-white hover:shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all" style={MILITARY_CLIP}>
                    INICIAR ATAQUE (CUSTO: 50% EN | 300 PA)
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* FASE: COMBATE_HUB (Fighting & Result) */}
          {(combatPhase === "fighting" || combatPhase === "result") && (
            <motion.div 
              key="combat_hub"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-black/80 border-2 border-red-500/50 backdrop-blur-2xl p-6 md:p-10 shadow-[0_0_100px_rgba(220,38,38,0.15)] relative overflow-hidden" style={MILITARY_CLIP}>
                {/* HUD Scanlines Deck */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20"></div>
                
                {/* COMBAT HEADER */}
                <div className="flex justify-between items-center mb-10 border-b border-red-500/30 pb-6 relative z-10">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-mono text-red-500 tracking-[0.3em] uppercase mb-1">Iniciador</span>
                      <h4 className="font-orbitron font-black text-xl text-white uppercase">{userProfile?.username}</h4>
                      <span className="text-[10px] text-slate-500 font-mono">LVL {userProfile?.level}</span>
                   </div>
                   
                   <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-red-500/20 border border-red-500 flex items-center justify-center animate-pulse mb-2">
                         <BoltIcon className="w-8 h-8 text-red-500" />
                      </div>
                      <span className="text-[10px] font-mono text-red-500 animate-pulse uppercase">VS</span>
                   </div>

                   <div className="flex flex-col text-right">
                      <span className="text-[10px] font-mono text-red-500 tracking-[0.3em] uppercase mb-1">Alvo_Interceptado</span>
                      <h4 className="font-orbitron font-black text-xl text-red-500 uppercase">{selectedTarget?.name}</h4>
                      <span className="text-[10px] text-slate-500 font-mono text-right">LVL {selectedTarget?.level}</span>
                   </div>
                </div>

                {/* ANIMATED HP BARS */}
                <div className="mb-10 flex flex-col md:flex-row gap-6 md:gap-12 justify-between items-center relative z-10 px-2">
                   <HPBar 
                     current={combatHP?.pHP ?? 100} 
                     max={combatHP?.pMax ?? 100} 
                     label="Sistemas Vitais" 
                     color="from-cyan-600 to-blue-500" 
                   />
                   
                   <div className="hidden md:flex flex-col items-center justify-center opacity-40">
                      <div className="text-[8px] font-black font-mono text-slate-500 uppercase tracking-[0.4em]">Sincronia_Neural</div>
                      <div className="flex gap-1 mt-1">
                         {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-3 bg-red-500/50"></div>)}
                      </div>
                   </div>

                   <HPBar 
                     current={combatHP?.tHP ?? 100} 
                     max={combatHP?.tMax ?? 100} 
                     label="Nó de Defesa Inimigo" 
                     color="from-red-600 to-orange-500" 
                     isRight 
                   />
                </div>

                {/* LOGS / FIGHTING AREA */}
                <div className="min-h-[300px] flex flex-col justify-center gap-4 relative z-10">
                   {combatPhase === "fighting" && (
                     <div className="space-y-4">
                        {battleLog.length === 0 && (
                          <div className="text-center p-8 border border-white/5 bg-white/5 animate-pulse">
                             <p className="font-mono text-sm text-slate-400 uppercase tracking-widest">Estabelecendo Conexão Neural...</p>
                          </div>
                        )}
                        {turnCountdown !== null && (
                          <div className="flex flex-col items-center gap-2 py-6 border-y border-red-500/20 bg-red-500/5 mb-6">
                             <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-red-500 animate-ping rounded-full"></div>
                                <span className="text-xs font-mono text-red-500 uppercase tracking-[0.4em] font-black">
                                    {countdownMessage} {turnCountdown}s
                                </span>
                             </div>
                             <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
                                <motion.div 
                                   initial={{ width: "100%" }}
                                   animate={{ width: "0%" }}
                                   transition={{ duration: 1, ease: "linear" }}
                                   key={turnCountdown}
                                   className="h-full bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                                />
                             </div>
                          </div>
                        )}
                        {battleLog.map((log, idx) => {
                          const pName = userProfile?.username || "";
                          const tName = selectedTarget?.name || "";
                          const realTName = finalResult?.targetRealName || "";
                          
                          // Procura nomes para destacar
                          // Log V4 Hi-Fi Highlighting Engine
                          const highlights = [
                            { text: pName, className: "text-emerald-400 font-black drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" },
                            { text: tName, className: "text-red-500 font-black drop-shadow-[0_0_8px_rgba(220,38,38,0.4)]" },
                            { text: realTName, className: "text-red-500 font-black" },
                            { text: "{SPECTRO}", className: "text-emerald-500 font-black bg-emerald-500/10 px-1 border border-emerald-500/20", label: "SPECTRO_" },
                            { text: "{CRIT}", className: "text-red-600 font-black animate-pulse bg-red-600/10 px-1 border border-red-600/30", label: "CRITICO_" },
                            { text: "{BREACH}", className: "text-cyan-400 font-black bg-cyan-400/10 px-1 border border-cyan-400/30", label: "BREACH_" },
                            { text: "{MISS}", className: "text-blue-400 font-mono italic", label: "EVASÃO_" },
                            { text: "{AMBIENT}", className: "text-slate-500 italic", label: "SITUACIONAL_" },
                            { text: "BREACH:", className: "text-yellow-400 font-black" },
                            { text: "EVASÃO:", className: "text-blue-400 font-black italic" },
                            { text: "CONTRA-GOLPE:", className: "text-violet-400 font-black animate-pulse" },
                            { text: "RECHAÇO:", className: "text-rose-500 font-black" },
                            { text: "OVERLOAD!", className: "text-cyan-400 font-black animate-pulse" }
                          ].filter(n => n.text.length > 0);

                          const processSegments = (txt: string) => {
                             if (!txt) return [];
                             let result = [{ text: txt, highlight: false, className: "", label: null }];
                             
                             highlights.forEach(h => {
                                const newResult: any[] = [];
                                result.forEach(seg => {
                                   if (seg.highlight) {
                                      newResult.push(seg);
                                      return;
                                   }
                                   const parts = seg.text.split(h.text);
                                   parts.forEach((p, pIdx) => {
                                      if (p) newResult.push({ text: p, highlight: false, className: "" });
                                      if (pIdx < parts.length - 1) newResult.push({ 
                                        text: h.label || h.text, 
                                        highlight: true, 
                                        className: h.className 
                                      });
                                   });
                                });
                                result = newResult;
                             });
                             return result;
                          };

                          const segments = processSegments(log);
                          let globalCharIdx = 0;

                          return (
                            <motion.div 
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="bg-red-500/5 border-l-4 border-red-500 p-5 font-mono text-xs md:text-sm text-slate-200 leading-relaxed shadow-[0_0_20px_rgba(220,38,38,0.05)] whitespace-pre-line"
                            >
                              <span className="text-red-500 mr-3">[{idx + 1}]</span>
                              {segments.map((seg, sIdx) => {
                                 const part = seg.text;
                                 const isTechnical = part.trim().startsWith(">>");
                                 const spanClass = isTechnical ? "text-cyan-400 font-bold opacity-90" : seg.className;

                                 return (
                                   <span key={sIdx} className={spanClass}>
                                      {part.split("").map((char: string, cCharIdx: number) => {
                                         const currentIdx = globalCharIdx++;
                                         if (isTechnical) return char;
                                         
                                         return (
                                           <motion.span
                                             key={`${idx}-${sIdx}-${cCharIdx}`}
                                             initial={{ opacity: 0 }}
                                             animate={{ opacity: 1 }}
                                             transition={{ 
                                               duration: 0.02,
                                               delay: currentIdx * 0.02 
                                             }}
                                           >
                                             {char}
                                           </motion.span>
                                         );
                                      })}
                                   </span>
                                 );
                              })}
                            </motion.div>
                          );
                        })}
                        {battleLog.length > 0 && battleLog.length < 3 && (
                          <div className="flex justify-center p-2">
                             <div className="w-1 h-6 bg-red-500 animate-bounce"></div>
                          </div>
                        )}
                     </div>
                   )}

                   {/* RESULT AREA (Inside Hub) */}
                   {combatPhase === "result" && finalResult && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                      >
                         <div className="mb-6 p-4 border-y-2 border-slate-800 bg-black/60">
                            <h3 className="font-orbitron font-black text-xs md:text-sm tracking-[0.5em] text-slate-400 uppercase mb-2">
                               RESULTADO DO DUELO
                            </h3>
                            <div className="flex flex-col items-center gap-1">
                               <p className={`text-xl font-black font-orbitron ${finalResult.winner ? 'text-emerald-400' : 'text-red-500'}`}>
                                  {finalResult.winner ? 'PROTOCOLO_GANHO' : 'PROTOCOLO_PERDIDO'}
                               </p>
                               <p className="text-[10px] font-mono text-slate-500">
                                  {finalResult.winner 
                                    ? `+${finalResult.loot?.xp || 0} XP | +$${finalResult.loot?.money || 0} CASH`
                                    : `-${finalResult.loot?.xp || 0} XP | -$${finalResult.loot?.moneyLost || 0} CASH | ENERGIA: ${finalResult.outcome === 'loss_ko' ? '-100%' : '-50%'}`}
                               </p>
                               {finalResult.loot?.outcome && (
                                  <p className={`text-[10px] font-mono italic mt-1 ${finalResult.winner ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                                     {finalResult.loot?.outcome}
                                  </p>
                               )}

                               {finalResult.outcome === "loss_bleeding" && (
                                  <p className="text-[9px] text-orange-500 font-black animate-pulse mt-2">
                                     AVISO: SISTEMA SANGRANDO (-20% STATS) - RECONECTE EM 15 MIN PARA REPAROS
                                  </p>
                               )}
                               {finalResult.outcome === "loss_ko" && (
                                  <p className="text-[9px] text-red-600 font-black animate-pulse mt-2">
                                     AVISO: DANO CRÍTICO TOTAL - RECONDICIONAMENTO OBRIGATÓRIO (KO - 30 MIN)
                                  </p>
                               )}
                            </div>
                         </div>

                         {redirectCountdown !== null && (
                            <div className="flex flex-col items-center gap-2 mb-8 p-4 bg-black/40 border border-red-500/20 relative overflow-hidden">
                               <div className="flex items-center gap-2 text-red-500 font-mono text-sm font-black animate-pulse">
                                  <ClockIcon className="w-5 h-5" />
                                  <span className="tracking-widest uppercase">Protocolo de Extração: {redirectCountdown}s</span>
                               </div>
                               <div className="w-full h-1 bg-slate-800/50 absolute bottom-0 left-0">
                                  <motion.div 
                                     initial={{ width: "100%" }}
                                     animate={{ width: `${(redirectCountdown / 15) * 100}%` }}
                                     transition={{ duration: 0.5 }}
                                     className="h-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]"
                                  />
                               </div>
                               <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1 opacity-60">
                                 {finalResult.winner ? 'RETORNANDO AO RADAR SPECTRO...' : 'REDIRECIONANDO PARA BASE DE RECUPERAÇÃO...'}
                               </p>
                            </div>
                         )}

                         <h2 className={`font-orbitron font-black text-5xl md:text-7xl uppercase mb-4 tracking-tighter
                           ${finalResult.winner ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-red-500 drop-shadow-[0_0_15px_rgba(220,38,38,0.4)]'}`}>
                            {finalResult.winner ? "VITÓRIA" : "DERROTA"}
                         </h2>

                         <div className="bg-slate-900/80 border border-white/10 p-6 text-left mb-8 space-y-6 overflow-hidden">
                            <div>
                               <span className="text-[10px] text-red-500 font-mono uppercase tracking-widest">Relatório do Spectro:</span>
                               <p className="mt-2 text-slate-300 italic text-sm">&ldquo;{finalResult.spectroComment}&rdquo;</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                               {finalResult.loot?.xp !== undefined && (
                                 <div className="bg-black/40 p-3 border border-white/5">
                                   <span className="text-[8px] text-slate-500 block uppercase mb-1">XP_GAIN</span>
                                   <span className={`font-black font-orbitron text-xl ${finalResult.loot.xp >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                                     {finalResult.loot.xp >= 0 ? '+' : ''}{finalResult.loot.xp}
                                   </span>
                                 </div>
                               )}
                               
                               <div className="bg-black/40 p-3 border border-white/5">
                                 <span className="text-[8px] text-slate-500 block uppercase mb-1">CASH_VARIATION</span>
                                 <span className={`font-black font-orbitron text-xl ${finalResult.winner ? 'text-green-400' : 'text-red-500'}`}>
                                   {finalResult.winner ? `+$${finalResult.loot?.money || 0}` : `-$${finalResult.loot?.moneyLost || 0}`}
                                 </span>
                               </div>
                               
                               {finalResult.loot?.energyLost !== undefined && (
                                 <div className="bg-black/40 p-3 border border-white/5">
                                   <span className="text-[8px] text-slate-500 block uppercase mb-1">EN_LOSS</span>
                                   <span className="font-black font-orbitron text-xl text-yellow-500">
                                     -{finalResult.loot.energyLost}%
                                   </span>
                                 </div>
                               )}

                               {finalResult.winner && finalResult.loot?.stats && (
                                 <div className="bg-black/40 p-3 border border-white/5">
                                    <span className="text-[8px] text-slate-500 block uppercase mb-1">ATRIBUTOS</span>
                                    <div className="flex gap-2">
                                       <span className="text-cyan-400 font-bold text-[10px]">+{finalResult.loot.stats.attack.toFixed(0)}A</span>
                                       <span className="text-cyan-400 font-bold text-[10px]">+{finalResult.loot.stats.defense.toFixed(0)}D</span>
                                       <span className="text-cyan-400 font-bold text-[10px]">+{finalResult.loot.stats.focus.toFixed(0)}F</span>
                                    </div>
                                 </div>
                               )}
                            </div>

                            {/* DETALHES TÉCNICOS DO CONFRONTO */}
                            {finalResult.details && (
                               <div className="bg-black/60 border border-slate-700/50 p-4" style={MILITARY_CLIP}>
                                  <h4 className="text-[9px] font-black font-orbitron text-slate-500 uppercase tracking-[0.2em] mb-3 border-b border-white/5 pb-2 flex items-center gap-2">
                                    <AdjustmentsHorizontalIcon className="w-3 h-3" />
                                    Análise de Desempenho (Spectro Analyzer)
                                  </h4>
                                  <div className="grid grid-cols-2 gap-8 text-left">
                                     <div>
                                        <p className="text-[8px] text-slate-500 uppercase mb-2">Você (Atacante)</p>
                                        <div className="space-y-1">
                                           <div className="flex justify-between text-[10px] font-mono">
                                              <span className="text-slate-400">Dano Acumulado:</span>
                                              <span className="text-white font-bold">{finalResult.details.totals.attacker}</span>
                                           </div>
                                           <div className="flex justify-between text-[10px] font-mono">
                                              <span className="text-slate-400">Modificador Aura:</span>
                                              <span className={`${finalResult.details.metrics.atkAura >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {(finalResult.details.metrics.atkAura * 100).toFixed(0)}%
                                              </span>
                                           </div>
                                           <div className="flex justify-between text-[10px] font-mono">
                                              <span className="text-slate-400">Chance Crítica:</span>
                                              <span className="text-yellow-500">{finalResult.details.metrics.atkCritChance}%</span>
                                           </div>
                                        </div>
                                     </div>
                                     <div className="border-l border-white/5 pl-8">
                                        <p className="text-[8px] text-slate-500 uppercase mb-2">Alvo (Defensor)</p>
                                        <div className="space-y-1">
                                           <div className="flex justify-between text-[10px] font-mono">
                                              <span className="text-slate-400">Dano Acumulado:</span>
                                              <span className="text-white font-bold">{finalResult.details.totals.defender}</span>
                                           </div>
                                           <div className="flex justify-between text-[10px] font-mono">
                                              <span className="text-slate-400">Modificador Aura:</span>
                                              <span className={`${finalResult.details.metrics.defAura >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {(finalResult.details.metrics.defAura * 100).toFixed(0)}%
                                              </span>
                                           </div>
                                           <div className="flex justify-between text-[10px] font-mono">
                                              <span className="text-slate-400">Chance Crítica:</span>
                                              <span className="text-yellow-500">{finalResult.details.metrics.defCritChance}%</span>
                                           </div>
                                        </div>
                                     </div>
                                  </div>
                               </div>
                            )}

                            <div className="border-t border-white/5 pt-4 flex flex-col md:flex-row justify-between items-center gap-4">
                               <p className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                                  <FingerPrintIcon className="w-3 h-3" />
                                 <span className="text-white uppercase font-bold">{finalResult.targetRealName}</span>
                               </p>
                               <div className="flex gap-4">
                                 {finalResult.outcome === 'loss' && (
                                   <button 
                                     onClick={() => navigate("/recovery-base")}
                                     className="px-6 py-3 bg-slate-800 text-slate-400 font-orbitron font-bold text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all"
                                     style={MILITARY_CLIP}
                                   >
                                     Ir para Base
                                   </button>
                                 )}
                                 <button 
                                   onClick={closeResult}
                                   className="px-8 py-3 bg-red-500 text-white font-orbitron font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                                   style={MILITARY_CLIP}
                                 >
                                   Finalizar_Sessão
                                 </button>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                   )}
                </div>
                
                {/* HUD Footer Decor */}
                <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-end opacity-40">
                   <div className="text-[8px] font-mono text-slate-500">
                      SYS_LOG: DUEL_SOCKET_ENCRYPT_256BIT<br/>
                      EN_CONSUMPTION: 50%_DELTA
                   </div>
                   <div className="text-[8px] font-mono text-slate-500 text-right uppercase">
                      UrbanClash_Duel_Engine_v9.1<br/>
                      {new Date().toLocaleTimeString()}
                   </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* FOOTER - TECHNICAL INFO */}
      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all relative z-10">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
             <span className="text-[8px] font-black tracking-widest uppercase">Encryption</span>
             <span className="text-[10px] font-mono">AES-256_ACTIVE</span>
          </div>
          <div className="flex flex-col">
             <span className="text-[8px] font-black tracking-widest uppercase">Target Locale</span>
             <span className="text-[10px] font-mono">SECTOR_7G_LIVE</span>
          </div>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-[0.5em]">
          Spectro Tactical Interface v4.0.2
        </div>
      </footer>
    </div>
  );
}
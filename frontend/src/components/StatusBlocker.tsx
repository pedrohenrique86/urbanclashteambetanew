import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserProfileContext } from '../contexts/UserProfileContext';
import { Shield, Activity, TrendingUp, MessageSquare, Users } from 'lucide-react';

const StatusBlocker: React.FC = () => {
    const { userProfile } = useUserProfileContext();
    const location = useLocation();
    const navigate = useNavigate();

    const status = userProfile?.status || 'Operacional';
    const endsAt = userProfile?.status_ends_at;

    const allowedPaths = ['/social-zone', '/clan'];
    const isAllowedPath = allowedPaths.includes(location.pathname);

    const isBlocked = status !== 'Operacional' && !isAllowedPath;

    const config = useMemo(() => {
        switch (status) {
            case 'Isolamento':
                return {
                    color: 'text-red-500',
                    border: 'border-red-500/50',
                    bg: 'bg-red-500/10',
                    label: 'ISOLAMENTO',
                    subtitle: 'Unidade em contenção',
                    icon: Shield,
                    glow: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                };
            case 'Recondicionamento':
                return {
                    color: 'text-yellow-500',
                    border: 'border-yellow-500/50',
                    bg: 'bg-yellow-500/10',
                    label: 'RECONDICIONAMENTO',
                    subtitle: 'Sistema de recuperação ativo',
                    icon: Activity,
                    glow: 'shadow-[0_0_30px_rgba(234,179,8,0.2)]'
                };
            case 'Aprimoramento':
                return {
                    color: 'text-cyan-400',
                    border: 'border-cyan-500/50',
                    bg: 'bg-cyan-500/10',
                    label: 'APRIMORAMENTO',
                    subtitle: 'Unidade em evolução ativa',
                    icon: TrendingUp,
                    glow: 'shadow-[0_0_30px_rgba(6,182,212,0.3)]'
                };
            default:
                return null;
        }
    }, [status]);

    const [timeLeft, setTimeLeft] = useState<string | null>(null);

    useEffect(() => {
        if (!endsAt || status === 'Operacional') return;

        const updateTimer = () => {
            const diff = new Date(endsAt).getTime() - Date.now();
            if (diff <= 0) {
                setTimeLeft(null);
                return;
            }
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${mins}m ${secs}s`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [endsAt, status]);

    if (!isBlocked || !config) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center p-6 backdrop-blur-xl bg-black/80"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black pointer-events-none" />
                
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className={`relative w-full max-w-lg overflow-hidden rounded-3xl border-2 ${config.border} ${config.bg} p-8 ${config.glow} text-center`}
                >
                    {/* Scan Effect for Enhancement */}
                    {status === 'Aprimoramento' && (
                        <motion.div 
                            animate={{ y: ['-100%', '300%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                            className="absolute inset-x-0 h-1 bg-cyan-400/30 blur-sm z-0"
                        />
                    )}

                    <div className="relative z-10 space-y-6">
                        <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-black/60 border ${config.border} shadow-lg`}>
                            <config.icon className={`w-8 h-8 ${config.color}`} />
                        </div>

                        <div>
                            <h1 className={`text-3xl font-black font-orbitron tracking-[0.3em] ${config.color} uppercase drop-shadow-[0_0_10px_currentColor]`}>
                                {config.label}
                            </h1>
                            <p className="text-[10px] text-white/50 font-black uppercase tracking-widest mt-2 italic">
                                {config.subtitle}
                            </p>
                        </div>

                        {timeLeft && (
                            <div className="bg-black/40 rounded-xl p-4 border border-white/5 inline-block mx-auto">
                                <span className={`text-2xl font-mono ${config.color}`}>
                                    {timeLeft}
                                </span>
                            </div>
                        )}

                        <div className="pt-6 border-t border-white/10 flex flex-col gap-3">
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                                Acesso negado aos sistemas centrais.<br />
                                Comunicação via canais seguros autorizada.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <button 
                                    onClick={() => navigate('/social-zone')}
                                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                                >
                                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">ZONA SOCIAL</span>
                                </button>
                                <button 
                                    onClick={() => navigate('/clan')}
                                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                                >
                                    <Users className="w-4 h-4 text-purple-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">CLÃ</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default StatusBlocker;

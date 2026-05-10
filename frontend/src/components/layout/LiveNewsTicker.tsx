import React, { useEffect, useState, useRef } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { socketService } from '../../services/socketService';
import { motion, AnimatePresence } from 'framer-motion';
import { NewspaperIcon, SignalIcon } from '@heroicons/react/24/outline';

interface NewsItem {
  id: string;
  message: string;
  type: string;
  timestamp: number;
  is_major?: boolean;
}

const LiveNewsTicker: React.FC = () => {
  const { showLiveFeed } = useSettings();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (news.length <= 1) return;
    
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % news.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [news.length]);

  useEffect(() => {
    if (!showLiveFeed) return;

    // Fetch initial logs
    const fetchInitialLogs = async () => {
      try {
        // Melhor usar a API diretamente para o estado inicial
        const api = (await import('../../lib/api')).default;
        const res = await api.get('/contracts/status');
          console.log("Feed: Logs recebidos do banco:", res.data?.logs?.length);
          if (res.data?.logs) {
            const initialNews = res.data.logs.map((log: any) => ({
              id: log.id,
              message: log.message,
              type: log.event_type,
              timestamp: new Date(log.created_at).getTime(),
              is_major: log.is_major
            }));
            setNews(initialNews.slice(0, 5));
          }
        } catch (err) {
          console.error("Erro ao buscar logs iniciais:", err);
        }
      };

    fetchInitialLogs();

    const handleNewLog = (log: any) => {
      const newItem: NewsItem = {
        id: log.id || Math.random().toString(36).substr(2, 9),
        message: log.message,
        type: log.event_type || 'info',
        timestamp: Date.now(),
        is_major: log.is_major
      };
      
      setNews(prev => {
        // Evita duplicatas (mesma mensagem em curto intervalo)
        if (prev.some(item => item.message === newItem.message)) return prev;
        return [newItem, ...prev].slice(0, 5);
      });
    };

    socketService.on("contract:log", handleNewLog);
    
    return () => {
      socketService.off("contract:log", handleNewLog);
    };
  }, [showLiveFeed]);

  const currentNews = news[activeIndex] || news[0];
  if (!showLiveFeed || !currentNews) return null;

  return (
    <div 
      className={`mt-1 w-full backdrop-blur-2xl border rounded-2xl p-1.5 shadow-2xl flex items-center overflow-hidden font-orbitron pointer-events-auto mx-auto h-8 transition-colors duration-500 ${
        currentNews.is_major 
          ? "bg-red-600/40 border-red-500 animate-pulse" 
          : "bg-black/60 border-white/10"
      }`}
      style={{
        boxShadow: currentNews.is_major 
          ? "inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 0 20px rgba(220, 38, 38, 0.4)"
          : "inset 0 1px 1px rgba(255, 255, 255, 0.05), 0 20px 50px rgba(0, 0, 0, 0.9)",
      }}
    >
      {/* "LIVE" Badge */}
      <div className="flex items-center gap-2 px-3 bg-red-600 h-full text-white text-[9px] font-black italic tracking-tighter shadow-[5px_0_15px_rgba(220,38,38,0.3)] z-10 rounded-lg">
        <SignalIcon className="w-3 h-3 animate-pulse" />
        LIVE
      </div>

      {/* Scrolling Container */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentNews.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="px-6 flex items-center gap-3 w-full"
          >
            <NewspaperIcon className="w-3 h-3 text-red-500 flex-shrink-0" />
            <span className="text-[11px] text-white/90 uppercase tracking-wider truncate">
              {currentNews.message}
            </span>
            <span className="text-[8px] text-white/30 font-mono ml-auto">
              {new Date(currentNews.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Breaking News Visual decoration */}
      <div className="hidden md:flex items-center px-4 h-full border-l border-white/10 gap-4">
        <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            animate={{ x: [-100, 100] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-full h-full bg-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
          />
        </div>
      </div>
    </div>
  );
};

export default LiveNewsTicker;

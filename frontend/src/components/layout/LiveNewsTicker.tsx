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
  faction?: string;
}

interface LiveNewsTickerProps {
  isFixed?: boolean;
}

const LiveNewsTicker: React.FC<LiveNewsTickerProps> = ({ isFixed }) => {
  const { showLiveFeed } = useSettings();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

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
        const api = (await import('../../lib/api')).default;
        const res = await api.get('/contracts/status');
          if (res.data?.logs) {
            const initialNews = res.data.logs.map((log: any) => ({
              id: log.id,
              message: log.message,
              type: log.event_type,
              timestamp: new Date(log.created_at).getTime(),
              is_major: log.is_major,
              faction: log.faction
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
        is_major: log.is_major,
        faction: log.faction
      };
      
      setNews(prev => {
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

  const getFactionBadge = (item: NewsItem) => {
    if (!item.faction) return null;
    if (item.faction === 'gangsters') {
      return (
        <span className="text-orange-400 font-bold mr-1">
          [RENEGADO]
        </span>
      );
    }
    if (item.faction === 'guardas') {
      return (
        <span className="text-blue-800 font-bold mr-1">
          [GUARDIÃO]
        </span>
      );
    }
    return null;
  };

  const newsContent = (
    <div className="flex items-center">
      {news.map((item) => (
        <div key={item.id} className="flex items-center gap-3 px-6 whitespace-nowrap">
          <NewspaperIcon className="w-3 h-3 text-red-500 flex-shrink-0" />
          <span className="text-white font-mono text-[10px]">
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <div className="text-[11px] text-white/90 uppercase tracking-wider flex items-center font-black">
            {getFactionBadge(item)}
            <span>{item.message}</span>
          </div>
          <span className="text-white/20 mx-4 opacity-50">•</span>
        </div>
      ))}
    </div>
  );

  const bgClasses = currentNews?.is_major 
    ? "bg-red-600/40 border-red-500 animate-pulse" 
    : isFixed 
      ? "bg-black border-white/10" 
      : "bg-black/60 backdrop-blur-2xl border-white/10";

  return (
    <div 
      className={`w-full border rounded-full p-1 shadow-2xl flex items-center overflow-hidden font-orbitron pointer-events-auto transition-all duration-500 h-9 ${bgClasses}`}
      style={{
        boxShadow: currentNews?.is_major 
          ? "inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 0 20px rgba(220, 38, 38, 0.4)"
          : "inset 0 1px 1px rgba(255, 255, 255, 0.05), 0 20px 50px rgba(0, 0, 0, 0.9)",
      }}
    >
      {/* "LIVE" Badge Oval */}
      <div className="flex items-center gap-2 px-4 bg-red-600 h-full text-white text-[10px] font-black italic tracking-tighter shadow-[5px_0_15px_rgba(220,38,38,0.3)] z-20 rounded-full flex-shrink-0">
        <SignalIcon className="w-3 h-3 animate-pulse" />
        LIVE
      </div>

      {/* Marquee Container */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <div className="flex items-center animate-marquee-slow" style={{ animationDuration: '80s' }}>
          {newsContent}
          {newsContent}
        </div>
      </div>
    </div>
  );
};

export default LiveNewsTicker;

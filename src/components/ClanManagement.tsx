import { useState, useEffect } from 'react';
import { apiClient } from '../lib/supabaseClient';
import { motion } from 'framer-motion';

interface Clan {
  id: string;
  name: string;
  faction: 'gangsters' | 'guardas';
  score: number;
  member_count: number;
  available_slots: number;
  created_at: string;
}

export default function ClanManagement() {
  const [clans, setClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFaction, setSelectedFaction] = useState<'all' | 'gangsters' | 'guardas'>('all');

  useEffect(() => {
    fetchClans();
  }, []);

  const fetchClans = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getClans();
    
      if (!data) {
        console.error('Erro ao buscar clãs');
        setError('Erro ao carregar clãs');
        return;
      }
    
      setClans(data || []);
    } catch (error) {
      console.error('Erro ao buscar clãs:', error);
      setError('Erro ao carregar clãs');
    } finally {
      setLoading(false);
    }
  };

  const filteredClans = clans.filter(clan => 
    selectedFaction === 'all' || clan.faction === selectedFaction
  );

  const gangsterClans = clans.filter(clan => clan.faction === 'gangsters');
  const guardClans = clans.filter(clan => clan.faction === 'guardas');

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400">
        <h3 className="font-bold mb-2">Erro ao carregar clãs</h3>
        <p>{error}</p>
        <button 
          onClick={fetchClans}
          className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-orbitron font-bold mb-4 text-center">
          <span className="text-transparent bg-gradient-to-r from-orange-400 to-blue-400 bg-clip-text">
            Gerenciamento de Clãs
          </span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-orange-900/20 border border-orange-500 rounded-lg p-4 text-center">
            <h3 className="text-orange-400 font-bold text-lg">Gangsters</h3>
            <p className="text-2xl font-bold">{gangsterClans.length}</p>
            <p className="text-sm text-gray-400">clãs ativos</p>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 text-center">
            <h3 className="text-blue-400 font-bold text-lg">Guardas</h3>
            <p className="text-2xl font-bold">{guardClans.length}</p>
            <p className="text-sm text-gray-400">clãs ativos</p>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4 text-center">
            <h3 className="text-gray-300 font-bold text-lg">Total</h3>
            <p className="text-2xl font-bold">{clans.length}</p>
            <p className="text-sm text-gray-400">clãs no sistema</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex justify-center space-x-2">
          {(['all', 'gangsters', 'guardas'] as const).map((faction) => (
            <button
              key={faction}
              onClick={() => setSelectedFaction(faction)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedFaction === faction
                  ? faction === 'gangsters'
                    ? 'bg-orange-600 text-white'
                    : faction === 'guardas'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {faction === 'all' ? 'Todos' : faction === 'gangsters' ? 'Gangsters' : 'Guardas'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de clãs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClans.map((clan, index) => (
          <motion.div
            key={clan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-gray-800 rounded-lg p-4 border-2 transition-all hover:scale-105 ${
              clan.faction === 'gangsters'
                ? 'border-orange-500/30 hover:border-orange-500'
                : 'border-blue-500/30 hover:border-blue-500'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg truncate">{clan.name}</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                clan.faction === 'gangsters'
                  ? 'bg-orange-900/50 text-orange-400'
                  : 'bg-blue-900/50 text-blue-400'
              }`}>
                {clan.faction === 'gangsters' ? 'Gangster' : 'Guarda'}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Pontuação:</span>
                <span className="font-medium">{clan.score.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Membros:</span>
                <span className="font-medium">{clan.member_count}/40</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Vagas:</span>
                <span className={`font-medium ${
                  clan.available_slots > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {clan.available_slots}
                </span>
              </div>
              
              {/* Barra de progresso de membros */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Capacidade</span>
                  <span>{Math.round((clan.member_count / 40) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      clan.faction === 'gangsters' ? 'bg-orange-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${(clan.member_count / 40) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredClans.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">Nenhum clã encontrado para o filtro selecionado.</p>
        </div>
      )}

      {/* Informações sobre regras */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4 text-center text-gray-300">Regras dos Clãs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-2">
            <h4 className="font-bold text-orange-400">Capacidade</h4>
            <ul className="space-y-1 text-gray-300">
              <li>• Cada clã suporta até 40 jogadores</li>
              <li>• Vagas são preenchidas por ordem de entrada</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-bold text-blue-400">Mudanças de Clã</h4>
            <ul className="space-y-1 text-gray-300">
              <li>• Permanência mínima: 24 horas</li>
              <li>• Cooldown após sair: 6 horas</li>
              <li>• Apenas clãs da mesma facção</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
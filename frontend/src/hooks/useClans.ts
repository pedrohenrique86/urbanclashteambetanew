import { useState, useEffect } from 'react';
import { apiClient } from '../lib/supabaseClient'; // Caminho corrigido

interface Clan {
  id: number;
  name: string;
  description: string;
  faction: 'gangsters' | 'guardas';
  member_count: number;
  max_members: number;
  score?: number;
}

export const useClans = (faction?: 'gangsters' | 'guardas') => {
  const [clans, setClans] = useState<Clan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!faction) {
      setIsLoading(false);
      return;
    }

    const fetchClans = async () => {
      setIsLoading(true);
      try {
        // Usando o método getClans do apiClient importado
        const response = await apiClient.getClans({ faction });
        // A resposta pode já ser o array de clãs, dependendo da implementação do apiClient
        setClans(response.clans || response);
      } catch (err) {
        setError('Falha ao buscar as divisões.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClans();
  }, [faction]);

  return { clans, isLoading, error };
};
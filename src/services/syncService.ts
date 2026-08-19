import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Session, Solve } from '../types';

export interface UserCloudData {
  sessions: Session[];
  solves: Solve[];
  favorites: string[];
  algSolves: Record<string, number[]>;
}

// Carrega todos os dados do usuário autenticado no Supabase
export const loadCloudUserData = async (userId: string): Promise<UserCloudData | null> => {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    // 1. Carregar Sessões
    const { data: cloudSessions, error: sessErr } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (sessErr) throw sessErr;

    // 2. Carregar Resoluções
    const { data: cloudSolves, error: solveErr } = await supabase
      .from('solves')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true });

    if (solveErr) throw solveErr;

    // 3. Carregar Favoritos
    const { data: cloudFavs, error: favErr } = await supabase
      .from('user_favorites')
      .select('alg_id')
      .eq('user_id', userId);

    if (favErr) throw favErr;

    // 4. Carregar Treinos de Algoritmos
    const { data: cloudAlgSolves, error: algErr } = await supabase
      .from('algorithm_solves')
      .select('alg_id, time_ms, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (algErr) throw algErr;

    // Formatar Sessões
    const sessions: Session[] = (cloudSessions || []).map(s => ({
      id: s.id,
      name: s.name,
      createdAt: Number(s.created_at)
    }));

    // Formatar Resoluções
    const solves: Solve[] = (cloudSolves || []).map(s => ({
      id: s.id,
      time: s.time,
      rawTime: s.raw_time,
      scramble: s.scramble,
      timestamp: Number(s.timestamp),
      penalty: s.penalty || 'none',
      sessionId: s.session_id,
      notes: s.notes,
      splits: s.splits
    }));

    // Formatar Favoritos
    const favorites: string[] = (cloudFavs || []).map(f => f.alg_id);

    // Formatar Treinos de Algoritmos
    const algSolvesMap: Record<string, number[]> = {};
    (cloudAlgSolves || []).forEach(row => {
      if (!algSolvesMap[row.alg_id]) {
        algSolvesMap[row.alg_id] = [];
      }
      algSolvesMap[row.alg_id].push(row.time_ms);
    });

    return {
      sessions,
      solves,
      favorites,
      algSolves: algSolvesMap
    };
  } catch (err) {
    console.error('Erro ao carregar dados do Supabase:', err);
    return null;
  }
};

// Migra dados do localStorage local para o Supabase no primeiro login
export const migrateLocalToCloud = async (
  userId: string,
  localSessions: Session[],
  localSolves: Solve[],
  localFavs: string[],
  localAlgSolves: Record<string, number[]>
): Promise<boolean> => {
  if (!isSupabaseConfigured || !userId) return false;

  try {
    // 1. Inserir Sessões locais no Supabase
    if (localSessions.length > 0) {
      const sessPayload = localSessions.map(s => ({
        id: s.id,
        user_id: userId,
        name: s.name,
        created_at: s.createdAt
      }));
      await supabase.from('sessions').upsert(sessPayload, { onConflict: 'id' });
    }

    // 2. Inserir Solves locais
    if (localSolves.length > 0) {
      const solvePayload = localSolves.map(s => ({
        id: s.id,
        user_id: userId,
        session_id: s.sessionId,
        time: s.time,
        raw_time: s.rawTime,
        scramble: s.scramble,
        penalty: s.penalty,
        timestamp: s.timestamp,
        notes: s.notes,
        splits: s.splits
      }));
      await supabase.from('solves').upsert(solvePayload, { onConflict: 'id' });
    }

    // 3. Inserir Favoritos
    if (localFavs.length > 0) {
      const favPayload = localFavs.map(algId => ({
        user_id: userId,
        alg_id: algId
      }));
      await supabase.from('user_favorites').upsert(favPayload, { onConflict: 'user_id,alg_id' });
    }

    // 4. Inserir Treinos de Algoritmos
    const algSolvesPayload: { user_id: string; alg_id: string; time_ms: number }[] = [];
    Object.entries(localAlgSolves).forEach(([algId, times]) => {
      times.forEach(t => {
        algSolvesPayload.push({
          user_id: userId,
          alg_id: algId,
          time_ms: t
        });
      });
    });
    if (algSolvesPayload.length > 0) {
      await supabase.from('algorithm_solves').insert(algSolvesPayload);
    }

    return true;
  } catch (err) {
    console.error('Erro na migração de dados locais para o Supabase:', err);
    return false;
  }
};

// Salvar nova resolução no Supabase
export const saveSolveToCloud = async (userId: string, solve: Solve): Promise<void> => {
  if (!isSupabaseConfigured || !userId) return;
  try {
    await supabase.from('solves').insert({
      id: solve.id,
      user_id: userId,
      session_id: solve.sessionId,
      time: solve.time,
      raw_time: solve.rawTime,
      scramble: solve.scramble,
      penalty: solve.penalty,
      timestamp: solve.timestamp,
      notes: solve.notes,
      splits: solve.splits
    });
  } catch (err) {
    console.error('Erro ao salvar solve na nuvem:', err);
  }
};

// Deletar resolução no Supabase
export const deleteSolveFromCloud = async (userId: string, solveId: string): Promise<void> => {
  if (!isSupabaseConfigured || !userId) return;
  try {
    await supabase.from('solves').delete().eq('id', solveId).eq('user_id', userId);
  } catch (err) {
    console.error('Erro ao deletar solve na nuvem:', err);
  }
};

// Salvar nova sessão no Supabase
export const saveSessionToCloud = async (userId: string, session: Session): Promise<void> => {
  if (!isSupabaseConfigured || !userId) return;
  try {
    await supabase.from('sessions').insert({
      id: session.id,
      user_id: userId,
      name: session.name,
      created_at: session.createdAt
    });
  } catch (err) {
    console.error('Erro ao salvar sessão na nuvem:', err);
  }
};

// Renomear sessão no Supabase
export const renameSessionInCloud = async (userId: string, sessionId: string, newName: string): Promise<void> => {
  if (!isSupabaseConfigured || !userId) return;
  try {
    await supabase.from('sessions').update({ name: newName }).eq('id', sessionId).eq('user_id', userId);
  } catch (err) {
    console.error('Erro ao renomear sessão na nuvem:', err);
  }
};

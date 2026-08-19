-- ===================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS CUBETIMER (SUPABASE)
-- Execute este script no SQL Editor do seu painel Supabase
-- ===================================================

-- 1. Tabela de Perfil de Usuários
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Sessões
CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

-- 3. Tabela de Resoluções (Solves)
CREATE TABLE IF NOT EXISTS public.solves (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  time INTEGER NOT NULL,
  raw_time INTEGER NOT NULL,
  scramble TEXT NOT NULL,
  penalty TEXT DEFAULT 'none',
  timestamp BIGINT NOT NULL,
  notes TEXT,
  splits JSONB
);

-- 4. Tabela de Algoritmos Favoritos
CREATE TABLE IF NOT EXISTS public.user_favorites (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alg_id TEXT NOT NULL,
  PRIMARY KEY (user_id, alg_id)
);

-- 5. Tabela de Solves no Treinador de Algoritmos
CREATE TABLE IF NOT EXISTS public.algorithm_solves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alg_id TEXT NOT NULL,
  time_ms INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================
-- HABILITAR ROW LEVEL SECURITY (RLS) - SEGURANÇA
-- ===================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.algorithm_solves ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: Permite ao usuário logado acessar/alterar APENAS os seus próprios dados

-- User Profiles
CREATE POLICY "Usuários gerenciam seu próprio perfil" ON public.user_profiles
  FOR ALL USING (auth.uid() = id);

-- Sessions
CREATE POLICY "Usuários gerenciam suas próprias sessões" ON public.sessions
  FOR ALL USING (auth.uid() = user_id);

-- Solves
CREATE POLICY "Usuários gerenciam suas próprias resoluções" ON public.solves
  FOR ALL USING (auth.uid() = user_id);

-- Favorites
CREATE POLICY "Usuários gerenciam seus próprios favoritos" ON public.user_favorites
  FOR ALL USING (auth.uid() = user_id);

-- Algorithm Solves
CREATE POLICY "Usuários gerenciam seus treinos de algoritmos" ON public.algorithm_solves
  FOR ALL USING (auth.uid() = user_id);

-- GATILHO AUTOMÁTICO: Cria perfil automaticamente quando um usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

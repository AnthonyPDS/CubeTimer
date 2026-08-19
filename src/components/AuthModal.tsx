import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { X, Mail, Lock, User as UserIcon, LogOut, CheckCircle, AlertTriangle, ShieldCheck, Cloud, Sparkles } from 'lucide-react';

interface AuthModalProps {
  user: User | null;
  onClose: () => void;
  onLoginSuccess: () => void;
  onLogout: () => void;
  totalSolvesCount: number;
  totalSessionsCount: number;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  user,
  onClose,
  onLoginSuccess,
  onLogout,
  totalSolvesCount,
  totalSessionsCount,
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Se o Supabase não estiver configurado no .env
  if (!isSupabaseConfigured) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="title-group">
              <Cloud size={20} className="text-accent" />
              <h3>Conectar à Nuvem</h3>
            </div>
            <button onClick={onClose} className="icon-button"><X size={18} /></button>
          </div>
          <div className="modal-body text-center" style={{ gap: '16px', padding: '10px 0' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '12px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.85rem' }}>
              <AlertTriangle size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
              <strong>Chaves do Supabase Pendentes</strong>
              <p style={{ marginTop: '4px', fontSize: '0.8rem' }}>
                Para habilitar o login e sincronização entre computador e celular, adicione as chaves do seu projeto Supabase no arquivo <code>.env</code> ou na Vercel:
              </p>
            </div>

            <div className="code-block" style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', textAlign: 'left' }}>
              <div>VITE_SUPABASE_URL=https://seu-id.supabase.co</div>
              <div>VITE_SUPABASE_ANON_KEY=sua-chave-anon</div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              O script SQL pronto para criar as tabelas foi gerado no arquivo <code>supabase_schema.sql</code>.
            </p>

            <button onClick={onClose} className="btn-primary" style={{ width: '100%' }}>
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Visão de Perfil (Quando o usuário já está logado)
  if (user) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="title-group">
              <ShieldCheck size={20} className="text-green" />
              <h3>Minha Conta</h3>
            </div>
            <button onClick={onClose} className="icon-button"><X size={18} /></button>
          </div>

          <div className="modal-body">
            <div className="user-profile-card">
              <div className="avatar-circle">
                <UserIcon size={28} />
              </div>
              <div className="user-info">
                <h4>{user.user_metadata?.full_name || user.email?.split('@')[0]}</h4>
                <span className="user-email">{user.email}</span>
              </div>
            </div>

            <div className="sync-status-box">
              <div className="sync-status-header">
                <CheckCircle size={16} className="text-green" />
                <span>Sincronização Ativa</span>
              </div>
              <p className="sync-status-desc">
                Seus tempos e sessões estão salvos na nuvem e seguros. Faça login no celular com esta mesma conta para acessar tudo.
              </p>
              <div className="sync-stats-grid">
                <div className="sync-stat-item">
                  <span className="label">Sessões</span>
                  <span className="value">{totalSessionsCount}</span>
                </div>
                <div className="sync-stat-item">
                  <span className="label">Resoluções</span>
                  <span className="value">{totalSolvesCount}</span>
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between', marginTop: '16px' }}>
              <button onClick={onClose} className="btn-secondary">
                Fechar
              </button>
              <button
                onClick={async () => {
                  setLoading(true);
                  await supabase.auth.signOut();
                  onLogout();
                  setLoading(false);
                  onClose();
                }}
                className="danger-button-sm"
                style={{ padding: '8px 14px' }}
                disabled={loading}
              >
                <LogOut size={16} />
                Sair da Conta
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Submit Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      onLoginSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao fazer login. Verifique seu e-mail e senha.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Cadastro
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name.trim() || email.split('@')[0],
          },
        },
      });

      if (error) throw error;

      setSuccessMessage('Conta criada com sucesso! Verifique seu e-mail para confirmar o cadastro (ou faça login se a confirmação estiver desativada).');
      setTab('login');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Esqueci Senha
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) throw error;

      setSuccessMessage('Link de redefinição enviado para o seu e-mail!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao solicitar redefinição.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content sm auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="title-group">
            <Sparkles size={20} className="text-accent" />
            <h3>Sincronização na Nuvem</h3>
          </div>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        {/* Abas Login / Cadastro */}
        {tab !== 'forgot' && (
          <div className="auth-tabs">
            <button
              className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => { setTab('login'); setErrorMessage(null); }}
            >
              Entrar
            </button>
            <button
              className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
              onClick={() => { setTab('register'); setErrorMessage(null); }}
            >
              Criar Conta
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="auth-alert error">
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="auth-alert success">
            <CheckCircle size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Formulário de Login */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="input-group">
              <label><Mail size={14} /> E-mail</label>
              <input
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-full"
              />
            </div>

            <div className="input-group">
              <label><Lock size={14} /> Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-full"
              />
            </div>

            <button
              type="button"
              onClick={() => setTab('forgot')}
              className="text-btn"
              style={{ fontSize: '0.75rem', alignSelf: 'flex-end', marginTop: '-4px' }}
            >
              Esqueceu a senha?
            </button>

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar na Conta'}
            </button>
          </form>
        )}

        {/* Formulário de Cadastro */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="input-group">
              <label><UserIcon size={14} /> Nome ou Apelido</label>
              <input
                type="text"
                placeholder="Ex: Pedro Speedcuber"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input-full"
              />
            </div>

            <div className="input-group">
              <label><Mail size={14} /> E-mail</label>
              <input
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-full"
              />
            </div>

            <div className="input-group">
              <label><Lock size={14} /> Senha (mínimo 6 caracteres)</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                className="input-full"
              />
            </div>

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? 'Criando Conta...' : 'Cadastrar e Sincronizar'}
            </button>
          </form>
        )}

        {/* Formulário Esqueci Senha */}
        {tab === 'forgot' && (
          <form onSubmit={handleForgot} className="auth-form">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Digite seu e-mail para receber um link de redefinição de senha:
            </p>
            <div className="input-group">
              <label><Mail size={14} /> E-mail</label>
              <input
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-full"
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setTab('login')}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Voltar
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import type { Session } from '../types';
import { Plus, Download, Upload, Clock, Edit2, Check, Folder, Layers } from 'lucide-react';

interface SessionSelectorProps {
  sessions: Session[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onCreateSession: (name: string) => void;
  onRenameSession: (id: string, newName: string) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inspectionEnabled: boolean;
  onToggleInspection: () => void;
  cfopModeEnabled: boolean;
  onToggleCfopMode: () => void;
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onExportData,
  onImportData,
  inspectionEnabled,
  onToggleInspection,
  cfopModeEnabled,
  onToggleCfopMode,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const handleStartRename = () => {
    if (!activeSession) return;
    setEditingName(activeSession.name);
    setIsEditing(true);
  };

  const handleSaveRename = () => {
    if (editingName.trim() && activeSession) {
      onRenameSession(activeSession.id, editingName.trim());
    }
    setIsEditing(false);
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSessionName.trim()) {
      onCreateSession(newSessionName.trim());
      setNewSessionName('');
      setShowNewModal(false);
    }
  };

  return (
    <div className="session-selector-bar">
      <div className="session-controls">
        <Folder size={18} className="text-muted" />
        <select
          value={activeSessionId}
          onChange={(e) => onSelectSession(e.target.value)}
          className="session-dropdown"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {isEditing ? (
          <div className="inline-edit">
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className="input-sm"
              autoFocus
            />
            <button onClick={handleSaveRename} className="icon-button-sm success">
              <Check size={14} />
            </button>
          </div>
        ) : (
          <button onClick={handleStartRename} className="icon-button-sm" title="Renomear sessão">
            <Edit2 size={14} />
          </button>
        )}

        <button
          onClick={() => setShowNewModal(true)}
          className="btn-secondary-sm"
          title="Criar nova sessão"
        >
          <Plus size={14} /> Nova Sessão
        </button>
      </div>

      <div className="right-tools">
        {/* Toggle CFOP Splits Mode */}
        <button
          onClick={onToggleCfopMode}
          className={`toggle-button ${cfopModeEnabled ? 'active' : ''}`}
          title="Ativar/Desativar modo de medição por etapas (Cruz, F2L, OLL, PLL)"
        >
          <Layers size={14} />
          Etapas CFOP: <strong>{cfopModeEnabled ? 'ON' : 'OFF'}</strong>
        </button>

        {/* Toggle Inspection Timer */}
        <button
          onClick={onToggleInspection}
          className={`toggle-button ${inspectionEnabled ? 'active' : ''}`}
          title="Ativar/Desativar tempo de inspeção WCA de 15 segundos"
        >
          <Clock size={14} />
          Inspeção (15s): <strong>{inspectionEnabled ? 'ON' : 'OFF'}</strong>
        </button>

        {/* Export JSON */}
        <button onClick={onExportData} className="btn-secondary-sm" title="Exportar dados da sessão">
          <Download size={14} /> Exportar
        </button>

        {/* Import JSON / TXT */}
        <label className="btn-secondary-sm cursor-pointer" title="Importar arquivo JSON ou TXT (csTimer / CubeTimer)">
          <Upload size={14} /> Importar
          <input
            type="file"
            accept=".json,.txt,text/plain,application/json,*"
            onChange={onImportData}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Modal for creating new session */}
      {showNewModal && (
        <div className="modal-backdrop" onClick={() => setShowNewModal(false)}>
          <div className="modal-content sm" onClick={(e) => e.stopPropagation()}>
            <h3>Nova Sessão</h3>
            <form onSubmit={handleCreateNew}>
              <input
                type="text"
                placeholder="Ex: Treino 3x3, PLL, Main..."
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                className="input-full"
                autoFocus
              />
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

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
          className="icon-button"
          title="Nova Sessão"
          aria-label="Nova Sessão"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="right-tools">
        {/* Toggle CFOP Splits Mode */}
        <button
          onClick={onToggleCfopMode}
          className={`icon-button ${cfopModeEnabled ? 'active' : ''}`}
          title={`Etapas CFOP: ${cfopModeEnabled ? 'Ativado' : 'Desativado'}`}
          aria-label="Alternar Etapas CFOP"
        >
          <Layers size={16} />
        </button>

        {/* Toggle Inspection Timer */}
        <button
          onClick={onToggleInspection}
          className={`icon-button ${inspectionEnabled ? 'active' : ''}`}
          title={`Inspeção WCA (15s): ${inspectionEnabled ? 'Ativada' : 'Desativada'}`}
          aria-label="Alternar Inspeção WCA"
        >
          <Clock size={16} />
        </button>

        {/* Export JSON */}
        <button
          onClick={onExportData}
          className="icon-button"
          title="Exportar dados da sessão"
          aria-label="Exportar dados"
        >
          <Download size={16} />
        </button>

        {/* Import JSON / TXT */}
        <label
          className="icon-button cursor-pointer"
          title="Importar arquivo JSON ou TXT (csTimer / CubeTimer)"
          aria-label="Importar arquivo"
        >
          <Upload size={16} />
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

import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { Button } from '../src/components/ui/Button';
import { Card } from '../src/components/ui/Card';
import { X } from 'lucide-react';

interface NotesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Omit<Note, 'id' | 'user_id' | 'user_name' | 'created_at' | 'updated_at'>) => void;
  loading?: boolean;
  editNote?: Note | null;
}

export const NotesDialog: React.FC<NotesDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  loading = false,
  editNote = null
}) => {
  const [formData, setFormData] = useState({
    atividade: 'Ligação' as Note['atividade'],
    data: new Date().toISOString().split('T')[0],
    horario: new Date().toTimeString().slice(0, 5),
    duracao: '30 minutos',
    anotacoes: ''
  });

  // Preencher formulário quando editando
  useEffect(() => {
    if (editNote) {
      setFormData({
        atividade: editNote.atividade,
        data: editNote.data,
        horario: editNote.horario,
        duracao: editNote.duracao || '30 minutos',
        anotacoes: editNote.anotacoes
      });
    } else {
      setFormData({
        atividade: 'Ligação',
        data: new Date().toISOString().split('T')[0],
        horario: new Date().toTimeString().slice(0, 5),
        duracao: '30 minutos',
        anotacoes: ''
      });
    }
  }, [editNote, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.anotacoes.trim()) return;
    
    onSave(formData);
    setFormData({
      atividade: 'Ligação',
      data: new Date().toISOString().split('T')[0],
      horario: new Date().toTimeString().slice(0, 5),
      duracao: '30 minutos',
      anotacoes: ''
    });
  };

  const handleClose = () => {
    setFormData({
      atividade: 'Ligação',
      data: new Date().toISOString().split('T')[0],
      horario: new Date().toTimeString().slice(0, 5),
      duracao: '30 minutos',
      anotacoes: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">{editNote ? 'Editar Nota' : 'Adicionar Nota'}</h3>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Atividade */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                Atividade *
              </label>
              <select
                value={formData.atividade}
                onChange={(e) => setFormData(prev => ({ ...prev, atividade: e.target.value as Note['atividade'] }))}
                className="w-full bg-white border border-slate-400 rounded p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                required
              >
                <option value="Apresentação">Apresentação</option>
                <option value="Ligação">Ligação</option>
                <option value="Proposta">Proposta</option>
                <option value="Reunião">Reunião</option>
                <option value="Whatsapp">Whatsapp</option>
              </select>
            </div>

            {/* Data */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                Data *
              </label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                className="w-full bg-white border border-slate-400 rounded p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                required
              />
            </div>

            {/* Horário */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                Horário *
              </label>
              <input
                type="time"
                value={formData.horario}
                onChange={(e) => setFormData(prev => ({ ...prev, horario: e.target.value }))}
                className="w-full bg-white border border-slate-400 rounded p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                required
              />
            </div>

            {/* Duração */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                Duração
              </label>
              <select
                value={formData.duracao}
                onChange={(e) => setFormData(prev => ({ ...prev, duracao: e.target.value }))}
                className="w-full bg-white border border-slate-400 rounded p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="">Selecione...</option>
                <option value="5 minutos">5 minutos</option>
                <option value="15 minutos">15 minutos</option>
                <option value="30 minutos">30 minutos</option>
                <option value="1 hora">1 hora</option>
                <option value="2 horas">2 horas</option>
                <option value="3 horas">3 horas</option>
                <option value="4 horas">4 horas</option>
                <option value="5 horas">5 horas</option>
                <option value="6 horas">6 horas</option>
                <option value="7 horas">7 horas</option>
                <option value="8 horas">8 horas</option>
              </select>
            </div>

            {/* Anotações */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                Anotações *
              </label>
              <textarea
                value={formData.anotacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, anotacoes: e.target.value }))}
                placeholder="Descreva os detalhes da atividade..."
                rows={4}
                className="w-full bg-white border border-slate-400 rounded p-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-vertical"
                required
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={loading || !formData.anotacoes.trim()}
            >
              {loading ? 'Salvando...' : editNote ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
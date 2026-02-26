import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit, Key, Trash2, Users } from 'lucide-react';

interface ActionMenuProps {
  userId: number;
  userRole: string;
  onEdit: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
  onReassign?: () => void;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  userId,
  userRole,
  onEdit,
  onResetPassword,
  onDelete,
  onReassign,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-slate-600" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
          <button
            onClick={() => handleAction(onEdit)}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-colors"
          >
            <Edit className="w-4 h-4 text-blue-600" />
            <span>Editar</span>
          </button>

          <button
            onClick={() => handleAction(onResetPassword)}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-yellow-50 transition-colors"
          >
            <Key className="w-4 h-4 text-yellow-600" />
            <span>Resetar Senha</span>
          </button>

          {userRole === 'SELLER' && onReassign && (
            <button
              onClick={() => handleAction(onReassign)}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-orange-50 transition-colors"
            >
              <Users className="w-4 h-4 text-orange-600" />
              <span>Transferir Leads</span>
            </button>
          )}

          <div className="border-t border-slate-100 my-1"></div>

          <button
            onClick={() => handleAction(onDelete)}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>Excluir</span>
          </button>
        </div>
      )}
    </div>
  );
};

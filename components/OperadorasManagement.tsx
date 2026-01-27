import React, { useState, useEffect } from 'react';
import { operadoraService, Operadora, Produto } from '../services/operadoraService';
import { Plus, Trash2, Building2, ArrowLeft, Package, Edit } from 'lucide-react';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import { SystemModal } from './SystemModal';

export const OperadorasManagement: React.FC = () => {
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [selectedOperadora, setSelectedOperadora] = useState<Operadora | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [novaOperadora, setNovaOperadora] = useState('');
  const [novoProduto, setNovoProduto] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddOperadoraDialog, setShowAddOperadoraDialog] = useState(false);
  const [showAddProdutoDialog, setShowAddProdutoDialog] = useState(false);
  const [addOperadoraStep, setAddOperadoraStep] = useState(1);
  const [newOperadoraId, setNewOperadoraId] = useState<number | null>(null);
  const [tempProdutos, setTempProdutos] = useState<string[]>([]);
  const [tempProdutoInput, setTempProdutoInput] = useState('');
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'success' | 'error';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });

  useEffect(() => {
    loadOperadoras();
  }, []);

  const loadOperadoras = async () => {
    try {
      const data = await operadoraService.getOperadoras();
      setOperadoras(data);
    } catch (error) {
      console.error('Erro ao carregar operadoras:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProdutos = async (operadoraId: number) => {
    try {
      const data = await operadoraService.getProdutosByOperadora(operadoraId);
      setProdutos(data);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const handleToggleOperadora = async (id: number, ativa: boolean) => {
    try {
      await operadoraService.toggleOperadora(id, !ativa);
      loadOperadoras();
    } catch (error) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro',
        message: 'Erro ao atualizar operadora'
      });
    }
  };

  const handleAddOperadora = async () => {
    if (!novaOperadora.trim()) return;
    try {
      const result = await operadoraService.createOperadora(novaOperadora);
      setNewOperadoraId(result.id);
      setAddOperadoraStep(2);
    } catch (error) {
      console.error('Erro ao adicionar operadora:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro',
        message: 'Erro ao adicionar operadora: ' + (error as any).message
      });
    }
  };

  const handleAddTempProduto = () => {
    if (!tempProdutoInput.trim()) return;
    setTempProdutos([...tempProdutos, tempProdutoInput]);
    setTempProdutoInput('');
  };

  const handleRemoveTempProduto = (index: number) => {
    setTempProdutos(tempProdutos.filter((_, i) => i !== index));
  };

  const handleFinishAddOperadora = async () => {
    if (newOperadoraId && tempProdutos.length > 0) {
      try {
        for (const produto of tempProdutos) {
          await operadoraService.createProduto(newOperadoraId, produto);
        }
      } catch (error) {
        console.error('Erro ao adicionar produtos:', error);
      }
    }
    setShowAddOperadoraDialog(false);
    setAddOperadoraStep(1);
    setNovaOperadora('');
    setNewOperadoraId(null);
    setTempProdutos([]);
    setTempProdutoInput('');
    await loadOperadoras();
  };

  const handleDeleteOperadora = async (id: number) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Confirmar Exclusão',
      message: 'Tem certeza? Isso excluirá todos os produtos desta operadora.',
      onConfirm: async () => {
        try {
          await operadoraService.deleteOperadora(id);
          loadOperadoras();
          if (selectedOperadora?.id === id) setSelectedOperadora(null);
          setModal({ isOpen: false, type: 'alert', title: '', message: '' });
        } catch (error) {
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Erro',
            message: 'Erro ao excluir operadora'
          });
        }
      }
    });
  };

  const handleAddProduto = async () => {
    if (!selectedOperadora || !novoProduto.trim()) return;
    try {
      console.log('Adicionando produto:', novoProduto, 'para operadora:', selectedOperadora.id);
      const result = await operadoraService.createProduto(selectedOperadora.id, novoProduto);
      console.log('Produto criado:', result);
      setNovoProduto('');
      setShowAddProdutoDialog(false);
      await loadProdutos(selectedOperadora.id);
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro',
        message: 'Erro ao adicionar produto: ' + (error as any).message
      });
    }
  };

  const handleDeleteProduto = async (id: number) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Confirmar Exclusão',
      message: 'Tem certeza que deseja excluir este produto?',
      onConfirm: async () => {
        try {
          await operadoraService.deleteProduto(id);
          if (selectedOperadora) loadProdutos(selectedOperadora.id);
          setModal({ isOpen: false, type: 'alert', title: '', message: '' });
        } catch (error) {
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Erro',
            message: 'Erro ao excluir produto'
          });
        }
      }
    });
  };

  const handleSelectOperadora = (op: Operadora) => {
    setSelectedOperadora(op);
    loadProdutos(op.id);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <img src="/loading.gif" alt="Carregando..." className="w-16 h-16" />
    </div>
  );

  // Lista de Operadoras
  if (!selectedOperadora) {
    return (
      <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Operadoras</h1>
            <p className="text-slate-600 mt-1">Gerencie operadoras e seus produtos</p>
          </div>
          <button
            onClick={() => setShowAddOperadoraDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Operadora</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-24">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase w-32">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {operadoras.map((op) => (
                <tr key={op.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleSelectOperadora(op)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-slate-800">{op.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div onClick={(e) => e.stopPropagation()}>
                      <InputSwitch
                        checked={op.ativa}
                        onChange={() => handleToggleOperadora(op.id, op.ativa)}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectOperadora(op);
                      }}
                      className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOperadora(op.id);
                      }}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {operadoras.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma operadora cadastrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SystemModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={() => setModal({ isOpen: false, type: 'alert', title: '', message: '' })}
      />

      <Dialog
        visible={showAddOperadoraDialog}
        onHide={() => {
          setShowAddOperadoraDialog(false);
          setAddOperadoraStep(1);
          setNovaOperadora('');
          setNewOperadoraId(null);
          setTempProdutos([]);
          setTempProdutoInput('');
        }}
        header={addOperadoraStep === 1 ? 'Nova Operadora' : `Produtos - ${novaOperadora}`}
        style={{ width: '500px' }}
        modal
      >
        {addOperadoraStep === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Nome da Operadora</label>
              <input
                type="text"
                value={novaOperadora}
                onChange={(e) => setNovaOperadora(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddOperadora()}
                placeholder="Digite o nome"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setShowAddOperadoraDialog(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddOperadora}
                disabled={!novaOperadora.trim()}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Adicionar Produtos</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempProdutoInput}
                  onChange={(e) => setTempProdutoInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTempProduto()}
                  placeholder="Nome do produto"
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
                />
                <button
                  onClick={handleAddTempProduto}
                  className="px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            {tempProdutos.length > 0 && (
              <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {tempProdutos.map((prod, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded">
                      <span className="text-sm text-slate-700">{prod}</span>
                      <button
                        onClick={() => handleRemoveTempProduto(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-between pt-4">
              <button
                onClick={() => setAddOperadoraStep(1)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleFinishAddOperadora}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {tempProdutos.length > 0 ? 'Finalizar' : 'Pular'}
              </button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        visible={showAddProdutoDialog}
        onHide={() => setShowAddProdutoDialog(false)}
        header="Novo Produto"
        style={{ width: '450px' }}
        modal
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Nome do Produto</label>
            <input
              type="text"
              value={novoProduto}
              onChange={(e) => setNovoProduto(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddProduto()}
              placeholder="Digite o nome"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setShowAddProdutoDialog(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddProduto}
              disabled={!novoProduto.trim()}
              className="px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Adicionar
            </button>
          </div>
        </div>
      </Dialog>
      </>
    );
  }

  // Lista de Produtos da Operadora
  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedOperadora(null)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{selectedOperadora.nome}</h1>
            <p className="text-slate-600 mt-1">Produtos da operadora</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddProdutoDialog(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Produto</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {produtos.map((prod) => (
              <tr key={prod.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-green-600" />
                    <span className="text-slate-800">{prod.nome}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDeleteProduto(prod.id)}
                    className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {produtos.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-12 text-center text-slate-500">
                  Nenhum produto cadastrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    <SystemModal
      isOpen={modal.isOpen}
      type={modal.type}
      title={modal.title}
      message={modal.message}
      onConfirm={modal.onConfirm}
      onCancel={() => setModal({ isOpen: false, type: 'alert', title: '', message: '' })}
    />

    <Dialog
      visible={showAddProdutoDialog}
      onHide={() => {
        setShowAddProdutoDialog(false);
        setTempProdutos([]);
        setTempProdutoInput('');
      }}
      header="Adicionar Produtos"
      style={{ width: '500px' }}
      modal
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">Nome do Produto</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tempProdutoInput}
              onChange={(e) => setTempProdutoInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTempProduto()}
              placeholder="Digite o nome"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-sm"
              autoFocus
            />
            <button
              onClick={handleAddTempProduto}
              className="px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        {tempProdutos.length > 0 && (
          <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto">
            <div className="space-y-2">
              {tempProdutos.map((prod, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded">
                  <span className="text-sm text-slate-700">{prod}</span>
                  <button
                    onClick={() => handleRemoveTempProduto(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={() => {
              setShowAddProdutoDialog(false);
              setTempProdutos([]);
              setTempProdutoInput('');
            }}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              if (selectedOperadora && tempProdutos.length > 0) {
                try {
                  for (const produto of tempProdutos) {
                    await operadoraService.createProduto(selectedOperadora.id, produto);
                  }
                  setShowAddProdutoDialog(false);
                  setTempProdutos([]);
                  setTempProdutoInput('');
                  await loadProdutos(selectedOperadora.id);
                } catch (error) {
                  console.error('Erro ao adicionar produtos:', error);
                  setModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Erro',
                    message: 'Erro ao adicionar produtos: ' + (error as any).message
                  });
                }
              }
            }}
            disabled={tempProdutos.length === 0}
            className="px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Adicionar {tempProdutos.length > 0 ? `(${tempProdutos.length})` : ''}
          </button>
        </div>
      </div>
    </Dialog>
    </>
  );
};

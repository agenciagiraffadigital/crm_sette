import React, { useState } from 'react';
import { Play, Code, CheckCircle, Database } from 'lucide-react';
import { leadService } from '../services/leadService';
import { Lead } from '../types';

interface SimulationPanelProps {
  onNewLead: (lead: Lead) => void;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({ onNewLead }) => {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<Lead | null>(null);

  const simulateWebhook = async () => {
    setLoading(true);
    
    // Generate random ID to prevent duplicates in demo
    const randomId = Math.floor(Math.random() * 1000000) + 13000000;
    
    const mockPayload = {
      "response": "success",
      "value": [
        {
          "code": randomId,
          "title": "Lead Simulado",
          "contact": {
            "name": `Cliente Teste ${Math.floor(Math.random() * 100)}`,
            "email": "teste@exemplo.com",
            "phone": "11999999999",
            "company": Math.random() > 0.5 ? { "document": "12345678000199" } : null,
            "custom_fields": { "Tipo": Math.random() > 0.8 ? "ADESAO" : "PME" }
          },
          "step": { "name": "Oportunidades" },
          "sales_channel": { "name": "WEBHOOK_SIMULATOR" },
          "custom_fields": { "Operadora": "SulAmérica" },
          "products": [{ "name": "Saúde PME" }],
          "created_at": new Date().toISOString(),
          "updated_at": new Date().toISOString()
        }
      ]
    };

    try {
      // Simulate delay
      await new Promise(r => setTimeout(r, 800));
      const result = await leadService.simulateWebhookIngestion(mockPayload);
      setLastResult(result);
      onNewLead(result);
    } catch (e) {
      console.error(e);
      alert("Erro na simulação: " + e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-8 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Simulador de Integração</h2>
            <p className="text-slate-300 mb-6 max-w-xl">
              Este painel simula o recebimento de um JSON do Make.com. Ele executa a lógica de normalização e o algoritmo de 
              <span className="text-blue-400 font-bold"> Round-Robin (Rodízio)</span>.
            </p>
            <ul className="text-sm text-slate-400 list-disc list-inside space-y-1 mb-4">
               <li>Apenas usuários com a função <strong>Vendedor</strong> participam.</li>
               <li>Usuários <strong>Admin</strong> são excluídos da distribuição.</li>
               <li>A distribuição segue a ordem crescente de IDs dos vendedores.</li>
            </ul>
          </div>
          <Database className="w-16 h-16 text-slate-700 opacity-50" />
        </div>

        <button
          onClick={simulateWebhook}
          disabled={loading}
          className={`flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-blue-500/25 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Play className="w-5 h-5" />
          )}
          <span>Disparar Webhook Fake</span>
        </button>
      </div>

      {lastResult && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex items-center text-emerald-800">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-semibold">Processado com Sucesso!</span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Resultado do Processamento</h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-600">ID Gerado</span>
                  <span className="font-mono text-slate-800">{lastResult.id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-600">Cliente</span>
                  <span className="font-medium text-slate-800">{lastResult.nome}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-600">Tipo Classificado</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">{lastResult.tipo_cliente}</span>
                </div>
                <div className="flex justify-between items-center bg-yellow-50 p-2 rounded border border-yellow-100">
                  <span className="text-yellow-800 font-medium">Vendedor Atribuído (Rodízio)</span>
                  <span className="font-bold text-slate-900">{lastResult.vendedor}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                <Code className="w-4 h-4 mr-2" />
                Objeto Normalizado (Supabase)
              </h3>
              <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg text-xs overflow-x-auto h-48 custom-scrollbar">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
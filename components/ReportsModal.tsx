import React, { useState, useMemo } from 'react';
import { MapData } from '../types';
import { X, FileSpreadsheet, Building2, Calendar } from 'lucide-react';

interface ReportsModalProps {
  data: MapData[];
  onClose: () => void;
}

type StatBucket = {
  count: number;
  value: number;
};

type RowStats = {
  label: string;
  authorized: StatBucket;
  pending: StatBucket;
  total: StatBucket; // Total Ativos (Todas as situações - Cancelados)
  canceled: StatBucket; // Devolvidos/Cancelados
};

const normalize = (str: string) => str.toLowerCase().trim();

const parseVal = (str: string) => {
  if (!str) return 0;
  return parseFloat(str.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
};

const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPercent = (val: number, total: number) => {
  if (total === 0) return '0,00%';
  return ((val / total) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
};

const ReportsModal: React.FC<ReportsModalProps> = ({ data, onClose }) => {
  const [viewMode, setViewMode] = useState<'OM' | 'EVENTO'>('EVENTO');

  const processedData = useMemo(() => {
    const rows: Record<string, RowStats> = {};
    
    // Totais Gerais da linha de cabeçalho (EVENTO/TOTAIS)
    const grandTotal: RowStats = {
      label: viewMode === 'EVENTO' ? 'EVENTO/TOTAIS' : 'OM/TOTAIS',
      authorized: { count: 0, value: 0 },
      pending: { count: 0, value: 0 },
      total: { count: 0, value: 0 },
      canceled: { count: 0, value: 0 }
    };

    data.forEach(item => {
      // Chave de agrupamento
      const key = viewMode === 'EVENTO' ? (item.evento || 'Sem Evento') : (item.om || 'Sem OM');
      const val = parseVal(item.valor);
      const status = normalize(item.situacao);

      if (!rows[key]) {
        rows[key] = {
          label: key,
          authorized: { count: 0, value: 0 },
          pending: { count: 0, value: 0 },
          total: { count: 0, value: 0 },
          canceled: { count: 0, value: 0 }
        };
      }

      // Regras de Negócio
      const isAuthorized = status.includes('pagamento autorizado');
      
      const isPending = status.includes('aguardando autorização cml') || 
                        status.includes('processo encaminhado esc sp') || 
                        status.includes('encaminhado à 4ª bda') ||
                        status.includes('encaminhado a 4ª bda'); // variação comum
      
      const isCanceled = status.includes('cancelado (dea)') || 
                         status.includes('processo devolvido');

      // Total Ativo = Tudo que NÃO é cancelado/devolvido
      // Ou seja: Autorizado + Pendente + Outros (em análise, etc)
      const isActive = !isCanceled;

      // Popula Linha Específica
      if (isAuthorized) {
        rows[key].authorized.count++;
        rows[key].authorized.value += val;
      }
      if (isPending) {
        rows[key].pending.count++;
        rows[key].pending.value += val;
      }
      if (isCanceled) {
        rows[key].canceled.count++;
        rows[key].canceled.value += val;
      }
      if (isActive) {
        rows[key].total.count++;
        rows[key].total.value += val;
      }

      // Popula Grand Total
      if (isAuthorized) {
        grandTotal.authorized.count++;
        grandTotal.authorized.value += val;
      }
      if (isPending) {
        grandTotal.pending.count++;
        grandTotal.pending.value += val;
      }
      if (isCanceled) {
        grandTotal.canceled.count++;
        grandTotal.canceled.value += val;
      }
      if (isActive) {
        grandTotal.total.count++;
        grandTotal.total.value += val;
      }
    });

    const sortedRows = Object.values(rows).sort((a, b) => a.label.localeCompare(b.label));
    return { grandTotal, rows: sortedRows };
  }, [data, viewMode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-5 bg-army-800 text-white flex justify-between items-center">
          <div className="flex items-center space-x-3">
             <div className="bg-white/10 p-2 rounded-lg"><FileSpreadsheet className="w-6 h-6"/></div>
             <div>
               <h3 className="text-xl font-bold uppercase tracking-tight">Relatório Gerencial</h3>
               <p className="text-xs text-army-200">Situação Financeira por {viewMode === 'EVENTO' ? 'Eventos' : 'OM'}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-army-700 rounded-full transition"><X className="w-6 h-6" /></button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-center space-x-4">
          <button 
            onClick={() => setViewMode('EVENTO')}
            className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold uppercase transition shadow-sm ${viewMode === 'EVENTO' ? 'bg-army-600 text-white ring-2 ring-army-600 ring-offset-1' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}
          >
            <Calendar className="w-4 h-4 mr-2" /> Por Evento
          </button>
          <button 
            onClick={() => setViewMode('OM')}
            className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold uppercase transition shadow-sm ${viewMode === 'OM' ? 'bg-army-600 text-white ring-2 ring-army-600 ring-offset-1' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}
          >
            <Building2 className="w-4 h-4 mr-2" /> Por OM
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-auto flex-1 p-6 bg-gray-100">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-300">
            <table className="w-full text-center text-xs">
              <thead>
                {/* Main Header */}
                <tr className="text-white font-bold uppercase tracking-wider">
                  <th className="bg-white text-gray-800 border-b border-r border-gray-300 p-2 w-64 text-left">Referência</th>
                  
                  {/* Pg Autorizado - Cinza/Azul Claro no print, vamos usar um cinza azulado */}
                  <th colSpan={3} className="bg-[#cbd5e1] text-gray-800 border-r border-gray-400 p-2">Pg Autorizado</th>
                  
                  {/* Pendentes - Cyan */}
                  <th colSpan={3} className="bg-cyan-400 text-black border-r border-cyan-500 p-2">Pendentes</th>
                  
                  {/* Total - Azul Escuro */}
                  <th colSpan={2} className="bg-[#0f4c81] border-r border-blue-900 p-2">Total</th>
                  
                  {/* Devolvidos/Cancelados - Salmão/Vermelho Claro */}
                  <th colSpan={3} className="bg-[#e78c82] text-black p-2">Devolvidos/Cancelados</th>
                </tr>
                
                {/* Sub Header */}
                <tr className="font-bold text-gray-700 bg-gray-50 border-b-2 border-gray-300">
                  <th className="p-2 text-left border-r bg-white">{viewMode === 'EVENTO' ? 'Evento/Totais' : 'OM/Totais'}</th>
                  
                  {/* Auth Cols */}
                  <th className="bg-[#e2e8f0] p-2 w-16 border-r border-gray-300">Qnt</th>
                  <th className="bg-[#e2e8f0] p-2 w-32 border-r border-gray-300">Valor</th>
                  <th className="bg-[#e2e8f0] p-2 w-20 border-r border-gray-400">%</th>

                  {/* Pending Cols */}
                  <th className="bg-cyan-100 p-2 w-16 border-r border-cyan-200">Qnt</th>
                  <th className="bg-cyan-100 p-2 w-32 border-r border-cyan-200">Valor</th>
                  <th className="bg-cyan-100 p-2 w-20 border-r border-cyan-300">%</th>

                  {/* Total Cols */}
                  <th className="bg-blue-100 p-2 w-16 border-r border-blue-200">Qnt</th>
                  <th className="bg-blue-100 p-2 w-32 border-r border-blue-900">Valor</th>

                  {/* Canceled Cols */}
                  <th className="bg-red-100 p-2 w-16 border-r border-red-200">Qnt</th>
                  <th className="bg-red-100 p-2 w-32 border-r border-red-200">Valor</th>
                  <th className="bg-red-100 p-2 w-20">%</th>
                </tr>
              </thead>
              <tbody>
                {/* Grand Total Row */}
                <tr className="font-bold bg-blue-50 border-b-2 border-gray-400">
                  <td className="p-3 text-left border-r border-gray-300 bg-[#dbeafe] uppercase tracking-wide">TOTAL GERAL</td>
                  
                  <td className="bg-[#cbd5e1] border-r border-gray-400">{processedData.grandTotal.authorized.count}</td>
                  <td className="bg-[#cbd5e1] border-r border-gray-400">{formatMoney(processedData.grandTotal.authorized.value)}</td>
                  <td className="bg-[#cbd5e1] border-r border-gray-400 text-gray-600">{formatPercent(processedData.grandTotal.authorized.value, processedData.grandTotal.total.value)}</td>

                  <td className="bg-cyan-300 border-r border-cyan-400">{processedData.grandTotal.pending.count}</td>
                  <td className="bg-cyan-300 border-r border-cyan-400">{formatMoney(processedData.grandTotal.pending.value)}</td>
                  <td className="bg-cyan-300 border-r border-cyan-500 font-bold">{formatPercent(processedData.grandTotal.pending.value, processedData.grandTotal.total.value)}</td>

                  <td className="bg-[#0f4c81] text-white border-r border-blue-900">{processedData.grandTotal.total.count}</td>
                  <td className="bg-[#0f4c81] text-white border-r border-blue-900">{formatMoney(processedData.grandTotal.total.value)}</td>

                  <td className="bg-[#e78c82] border-r border-red-400">{processedData.grandTotal.canceled.count}</td>
                  <td className="bg-[#e78c82] border-r border-red-400">{formatMoney(processedData.grandTotal.canceled.value)}</td>
                  <td className="bg-[#e78c82] font-bold">{formatPercent(processedData.grandTotal.canceled.value, processedData.grandTotal.total.value)}</td>
                </tr>

                {/* Data Rows */}
                {processedData.rows.map((row, idx) => (
                  <tr key={idx} className={`border-b border-gray-200 hover:bg-yellow-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="p-2 text-left border-r border-gray-200 font-semibold text-gray-700 truncate max-w-xs">{row.label}</td>

                    <td className="border-r border-gray-200">{row.authorized.count}</td>
                    <td className="border-r border-gray-200">{formatMoney(row.authorized.value)}</td>
                    <td className="border-r border-gray-200 text-gray-500">{formatPercent(row.authorized.value, row.total.value)}</td>

                    <td className="border-r border-gray-200">{row.pending.count}</td>
                    <td className="border-r border-gray-200">{formatMoney(row.pending.value)}</td>
                    <td className="border-r border-gray-200 text-gray-500">{formatPercent(row.pending.value, row.total.value)}</td>

                    <td className="border-r border-gray-200 bg-gray-100 font-bold text-gray-800">{row.total.count}</td>
                    <td className="border-r border-gray-200 bg-gray-100 font-bold text-gray-800">{formatMoney(row.total.value)}</td>

                    <td className="border-r border-gray-200">{row.canceled.count}</td>
                    <td className="border-r border-gray-200">{formatMoney(row.canceled.value)}</td>
                    <td className="text-gray-500">{formatPercent(row.canceled.value, row.total.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[10px] text-gray-500 italic">
            * <strong>Pendentes:</strong> Aguardando autorização CML, Encaminhado Esc Sp, Encaminhado à 4ª Bda.<br/>
            * <strong>Total:</strong> Soma de todos os processos ativos (Exclui Cancelados e Devolvidos).<br/>
            * <strong>% Devolvidos:</strong> Calculado sobre o montante total ativo para referência de impacto.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportsModal;

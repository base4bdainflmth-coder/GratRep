import React, { useEffect, useState, useMemo } from 'react';
import { fetchMapData, fetchAuxiliar, submitNewMap } from '../services/dataService';
import { MapData, User, UserRole, AuxiliarData } from '../types';
import { 
  Search, Filter, FileSpreadsheet, AlertCircle, CheckCircle2, 
  RefreshCcw, LogOut, Building2, Eye, Plus, X, Send, Loader2, Calendar, ClipboardList, Info
} from 'lucide-react';
import StatCard from './StatCard';
import StatusBadge from './StatusBadge';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

// Função auxiliar para formatar YYYY-MM-DD para DD/MM/YY
const formatDateToBR = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
};

const DetailsModal: React.FC<{ data: MapData; onClose: () => void }> = ({ data, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Detalhes Completos</h3>
            <p className="text-sm text-gray-500 font-mono">Mapa: {data.id} | OM: {data.om}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.rawHeaders.map((header, idx) => (
              header && (
                <div key={idx} className="border-b border-gray-50 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{header}</p>
                  <p className="text-sm text-gray-800 break-words font-medium">{data.rawData[idx] || '-'}</p>
                </div>
              )
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-army-700 text-white rounded-lg text-sm font-bold uppercase hover:bg-army-800">Fechar</button>
        </div>
      </div>
    </div>
  );
};

const NewMapForm: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => {
  const [aux, setAux] = useState<AuxiliarData | null>(null);
  const [formData, setFormData] = useState({
    mapa: '', evento: '', ultDiaEvento: '', valor: '', docAutoriza: '', nrDiex: '', dataDiex: '', observacao: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAuxiliar().then(setAux);
  }, []);

  // Máscara de Moeda: 5555 -> 55,55
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é número
    if (!value) {
      setFormData({ ...formData, valor: '' });
      return;
    }
    // Converte para float (centavos) e formata
    const amount = parseInt(value) / 100;
    const formatted = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setFormData({ ...formData, valor: formatted });
  };

  // Máscara de Números: Remove não numéricos
  const handleDiexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, nrDiex: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação extra de segurança
    if (!formData.mapa || !formData.evento || !formData.valor || !formData.nrDiex || !formData.docAutoriza) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    
    // Concatena Mapa com prefixo fixo e OM usando BARRA: Ex "1/2026 - 4 Bda/10º BIL Mth"
    // Garante que não haja duplicação se o select já tiver formatação estranha, pegando apenas a parte do mapa se necessário,
    // mas assumindo que o select traz algo como "1/2026".
    const mapaConcatenado = `${formData.mapa} - 4 Bda/${user.om}`;

    const payload = {
      ...formData,
      mapa: mapaConcatenado, 
      ultDiaEvento: formatDateToBR(formData.ultDiaEvento),
      dataDiex: formatDateToBR(formData.dataDiex),
      om: user.om,
      userEmail: user.email
    };

    const success = await submitNewMap(payload);
    setIsSubmitting(false);
    if (success) onClose();
  };

  if (!aux) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><Loader2 className="animate-spin text-white w-10 h-10" /></div>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative">
        <div className="p-6 bg-army-800 text-white flex justify-between items-center rounded-t-2xl">
          <div><h3 className="text-lg font-bold uppercase tracking-tight">Novo Mapa de Gratificação</h3><p className="text-xs text-army-200">{user.om}</p></div>
          <button onClick={onClose} className="p-1 hover:bg-army-700 rounded-full"><X className="w-6 h-6" /></button>
        </div>
        
        <div className="overflow-y-auto p-6">
          <form id="new-map-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mapa (Mês/Ano)</label>
                <select required className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white" value={formData.mapa} onChange={e => setFormData({...formData, mapa: e.target.value})}>
                  <option value="">Selecione...</option>
                  {aux.mapas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {/* Exemplo visual de como ficará o mapa */}
                <p className="text-[10px] text-gray-400 mt-1">
                  Será enviado como: <span className="font-mono">{formData.mapa ? `${formData.mapa} - 4 Bda/${user.om}` : "..."}</span>
                </p>
              </div>
              <div>
                <label className="flex items-center text-xs font-bold text-gray-500 uppercase mb-1 relative">
                  Evento 
                  <div className="group ml-1 relative">
                    <Info className="w-3 h-3 text-army-600 cursor-help" />
                    <div className="absolute top-full left-0 mt-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-[10px] rounded shadow-lg z-[60] normal-case">
                      ATENÇÃO: Caso não tenha o evento desejado, solicitar a atualização à STA/4ª Bda.
                    </div>
                  </div>
                </label>
                <select required className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white" value={formData.evento} onChange={e => setFormData({...formData, evento: e.target.value})}>
                  <option value="">Selecione...</option>
                  {aux.eventos.map(ev => <option key={ev} value={ev}>{ev}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Últ. Dia Evento</label><input required type="date" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={formData.ultDiaEvento} onChange={e => setFormData({...formData, ultDiaEvento: e.target.value})} /></div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Total (R$)</label>
                <input 
                  required 
                  type="text" 
                  placeholder="0,00" 
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm" 
                  value={formData.valor} 
                  onChange={handleValorChange} 
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="flex items-center text-xs font-bold text-gray-500 uppercase mb-1">
                  Documento que autoriza o Evento
                  <div className="group ml-1 relative">
                    <Info className="w-3 h-3 text-army-600 cursor-help" />
                    <div className="absolute top-full left-0 mt-2 hidden group-hover:block w-64 p-3 bg-gray-900 text-white text-[10px] rounded shadow-lg z-[60] normal-case leading-relaxed">
                      ATENÇÃO: Para operações/atividades, EXCETO ENSINO, inserir o documento do CML que autoriza o evento. Ex: DIM, OS, DIEx etc. Sem este documento, o processo será devolvido.<br/><br/>
                      <strong>ATIVIDADE DE ENSINO:</strong> escrever "Não é o caso".
                    </div>
                  </div>
                </label>
                <input required type="text" placeholder="Ex: DIM CML, OS Nr 123-Sec..." className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={formData.docAutoriza} onChange={e => setFormData({...formData, docAutoriza: e.target.value})} />
              </div>

              <div>
                <label className="flex items-center text-xs font-bold text-gray-500 uppercase mb-1">
                  Nr DIEx Remessa
                  <div className="group ml-1 relative">
                    <Info className="w-3 h-3 text-army-600 cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-[10px] rounded shadow-lg z-[60] normal-case">
                      Inserir apenas os números do DIEx.
                    </div>
                  </div>
                </label>
                <input 
                  required 
                  type="text" 
                  placeholder="Somente números" 
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm" 
                  value={formData.nrDiex} 
                  onChange={handleDiexChange} 
                />
              </div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data DIEx</label><input required type="date" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={formData.dataDiex} onChange={e => setFormData({...formData, dataDiex: e.target.value})} /></div>
              <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observações Adicionais</label><textarea rows={3} className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={formData.observacao} onChange={e => setFormData({...formData, observacao: e.target.value})} /></div>
            </div>
          </form>
        </div>
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">CANCELAR</button>
          <button type="submit" form="new-map-form" disabled={isSubmitting} className="flex items-center px-6 py-2 bg-army-700 rounded-lg text-sm font-bold text-white hover:bg-army-800 disabled:opacity-50 shadow-md transition-all">
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            ENVIAR PARA A BRIGADA
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [data, setData] = useState<MapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<MapData | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterMapa, setFilterMapa] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOM, setFilterOM] = useState(user.role === UserRole.OM ? user.om! : '');

  const loadData = async () => {
    setLoading(true);
    try { setData(await fetchMapData()); } catch (err) { setError('Falha na sincronização.'); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (user.role === UserRole.OM && item.om.trim() !== user.om) return false;
      if (filterOM && !item.om.toLowerCase().includes(filterOM.toLowerCase())) return false;
      if (filterMapa && !item.id.toLowerCase().includes(filterMapa.toLowerCase())) return false;
      if (filterStatus && !item.situacao.toLowerCase().includes(filterStatus.toLowerCase())) return false;
      return true;
    });
  }, [data, user, filterMapa, filterStatus, filterOM]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    const aprovados = filteredData.filter(i => i.situacao.toLowerCase().includes('aprovado')).length;
    const devolvidos = filteredData.filter(i => i.situacao.toLowerCase().includes('devolvido')).length;
    const cancelados = filteredData.filter(i => i.situacao.toLowerCase().includes('cancelado')).length;
    return { total, aprovados, devolvidos, cancelados };
  }, [filteredData]);

  const getRowStyle = (status: string, index: number) => {
    const s = status.toLowerCase();
    if (s.includes('devolvido')) return 'bg-neutral-900 text-white hover:bg-neutral-800';
    if (s.includes('cancelado')) return 'bg-red-600 text-white hover:bg-red-500';
    return index % 2 === 0 ? 'bg-white hover:bg-gray-100' : 'bg-gray-200 hover:bg-gray-300';
  };

  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50"><RefreshCcw className="w-10 h-10 text-army-600 animate-spin mb-4" /><p className="text-gray-600 font-medium tracking-tight uppercase text-xs">Sincronizando dados...</p></div>;

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-10">
      {selectedMap && <DetailsModal data={selectedMap} onClose={() => setSelectedMap(null)} />}
      {isFormOpen && <NewMapForm user={user} onClose={() => { setIsFormOpen(false); loadData(); }} />}

      <nav className="bg-army-800 text-white shadow-xl sticky top-0 z-40 border-b border-army-900">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1 rounded-lg"><ClipboardList className="h-6 w-6 text-army-800" /></div>
            <div><h1 className="text-lg font-bold uppercase tracking-tighter">4ª Bda Inf L Mth</h1><p className="text-[10px] text-army-300 font-bold uppercase">Gratificação de Representação</p></div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block"><p className="text-xs font-bold uppercase">{user.name}</p><p className="text-[10px] text-army-400 font-bold uppercase">{user.om || 'ADMINISTRADOR'}</p></div>
            <button onClick={onLogout} className="p-2 bg-army-700 hover:bg-red-700 rounded-full transition shadow-inner"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="TOTAL MAPAS" value={stats.total} icon={FileSpreadsheet} color="text-blue-600 bg-blue-600" />
          <StatCard title="APROVADOS" value={stats.aprovados} icon={CheckCircle2} color="text-green-600 bg-green-600" />
          <StatCard title="DEVOLVIDOS" value={stats.devolvidos} icon={RefreshCcw} color="text-gray-900 bg-gray-900" />
          <StatCard title="CANCELADOS" value={stats.cancelados} icon={AlertCircle} color="text-red-600 bg-red-600" />
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col lg:flex-row justify-between items-center gap-4">
          {user.role === UserRole.OM && (
            <button onClick={() => setIsFormOpen(true)} className="w-full lg:w-auto flex items-center justify-center px-6 py-2.5 bg-army-700 hover:bg-army-800 text-white rounded-lg font-bold text-sm shadow-md transition uppercase tracking-wider">
              <Plus className="w-5 h-5 mr-2" /> Novo Mapa
            </button>
          )}
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-40"><input type="text" placeholder="Mapa..." value={filterMapa} onChange={e => setFilterMapa(e.target.value)} className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs" /><Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" /></div>
            {user.role === UserRole.ADMIN && (
              <div className="relative flex-1 lg:w-40">
                <select value={filterOM} onChange={e => setFilterOM(e.target.value)} className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs appearance-none">
                  <option value="">Todas OMs</option>
                  {Array.from(new Set(data.map(d => d.om))).sort().map(om => <option key={om} value={om}>{om}</option>)}
                </select>
                <Building2 className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            )}
            <div className="relative flex-1 lg:w-40">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs appearance-none">
                <option value="">Status...</option>
                {Array.from(new Set(data.map(d => d.situacao))).sort().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <Filter className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-[10px] uppercase font-bold text-gray-500">
                  <th className="p-4 w-12 text-center">VER</th>
                  <th className="p-4">OM</th>
                  <th className="p-4">MAPA</th>
                  <th className="p-4">SITUAÇÃO</th>
                  <th className="p-4">EVENTO</th>
                  <th className="p-4">VALOR</th>
                  <th className="p-4 hidden lg:table-cell">DIEx</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {filteredData.map((row, idx) => (
                  <tr key={idx} className={`border-b border-gray-100 transition duration-100 ${getRowStyle(row.situacao, idx)}`}>
                    <td className="p-3 text-center">
                      <button onClick={() => setSelectedMap(row)} className="p-1.5 rounded-full hover:bg-army-100 text-army-700 transition" title="Ver Detalhes"><Eye className="w-4 h-4" /></button>
                    </td>
                    <td className="p-4 font-bold">{row.om}</td>
                    <td className="p-4 font-mono font-bold uppercase">{row.id}</td>
                    <td className="p-4">
                      {row.situacao.toLowerCase().includes('devolvido') || row.situacao.toLowerCase().includes('cancelado') ? (
                        <span className="font-bold uppercase tracking-tighter text-[10px] px-2 py-0.5 border border-white/40 rounded bg-white/10">{row.situacao}</span>
                      ) : <StatusBadge status={row.situacao} />}
                    </td>
                    <td className="p-4">
                      <div className="font-bold uppercase">{row.evento}</div>
                      <div className="text-[10px] opacity-60 flex items-center mt-1"><Calendar className="w-3 h-3 mr-1" /> {row.ultDiaEvento}</div>
                    </td>
                    <td className="p-4 font-bold">{row.valor}</td>
                    <td className="p-4 hidden lg:table-cell opacity-70 font-mono text-[10px]">{row.nrDiex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
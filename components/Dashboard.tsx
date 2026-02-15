import React, { useEffect, useState, useMemo, useRef } from 'react';
import { fetchMapData, fetchAuxiliar, submitNewMap, updateMap, deleteMap, changePassword, fetchUsers } from '../services/dataService';
import { MapData, User, UserRole, AuxiliarData, UserCredential } from '../types';
import { 
  Search, Filter, FileSpreadsheet, AlertCircle, CheckCircle2, 
  RefreshCcw, LogOut, Building2, Eye, Plus, X, Send, Loader2, Calendar, ClipboardList, 
  Printer, FileText, ChevronDown, Square, CheckSquare, Pencil, Lock, Trash2, Key, ArrowUpDown, AlertTriangle
} from 'lucide-react';
import StatCard from './StatCard';
import StatusBadge from './StatusBadge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

// --- Funções Auxiliares ---
const normalizeText = (text: string) => {
  if (!text) return '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

const formatDateToBR = (dateStr: string) => {
  if (!dateStr) return '';
  if (dateStr.includes('/') && dateStr.split('/')[2].length === 4) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

const formatDateToISO = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    let day = parts[0];
    let month = parts[1];
    let year = parts[2];
    if (year.length === 2) year = '20' + year;
    day = day.padStart(2, '0');
    month = month.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return dateStr;
};

const parseCurrency = (valueStr: string): number => {
  if (!valueStr) return 0;
  const cleanStr = valueStr.replace(/[R$\s.]/g, '').replace(',', '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (val: number): string => {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const extractYear = (mapId: string): string => {
  if (!mapId) return '';
  const match = mapId.match(/\/(\d{4})/);
  if (match) return match[1];
  return '';
};

// --- Componente MultiSelect ---
interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  icon?: React.ElementType;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, selected, onChange, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative flex-1 lg:w-40" ref={containerRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full pl-8 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs flex items-center justify-between hover:bg-gray-100 transition truncate"
      >
        <span className="truncate">
          {selected.length === 0 ? label : `${selected.length} selecionado(s)`}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto p-1">
          {options.length === 0 ? (
            <div className="p-2 text-xs text-gray-400 text-center">Nenhuma opção</div>
          ) : (
            options.map(option => {
              const isSelected = selected.includes(option);
              return (
                <div 
                  key={option} 
                  onClick={() => toggleOption(option)}
                  className={`flex items-center px-3 py-2 cursor-pointer rounded-md text-xs transition ${isSelected ? 'bg-army-50 text-army-900' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <div className={`mr-2 ${isSelected ? 'text-army-600' : 'text-gray-300'}`}>
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </div>
                  <span className="truncate">{option}</span>
                </div>
              );
            })
          )}
          {selected.length > 0 && (
            <div 
              onClick={() => { onChange([]); setIsOpen(false); }}
              className="border-t border-gray-100 mt-1 pt-1 p-2 text-center text-[10px] text-red-500 font-bold cursor-pointer hover:bg-red-50 rounded"
            >
              LIMPAR FILTROS
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Modais ---

const ChangePasswordModal: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Stop propagation para evitar fechar o modal se o form estiver dentro de algo clicável
    e.stopPropagation();

    if (newPassword !== confirmPassword) {
      alert("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 4) {
      alert("A senha deve ter pelo menos 4 caracteres.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Para Admin, se não houver email, usa 'admin' como identificador
      const identifier = user.role === UserRole.ADMIN ? (user.email || 'admin') : (user.om || '');
      
      const success = await changePassword(identifier, newPassword, user.role === UserRole.OM);
      
      if (success) {
        alert("Senha alterada com sucesso! Atualize seu login.");
        onClose();
      } else {
        alert("Erro ao alterar senha. Verifique sua conexão e tente novamente.");
      }
    } catch (error) {
      console.error(error);
      alert("Ocorreu um erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-4 bg-gray-800 text-white flex justify-between items-center">
          <h3 className="text-md font-bold uppercase">Trocar Senha</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
           <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nova Senha</label>
             <input type="password" required className="w-full p-2 border rounded" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
           </div>
           <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar Senha</label>
             <input type="password" required className="w-full p-2 border rounded" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
           </div>
           <button 
             type="submit" 
             disabled={isSubmitting} 
             className="w-full py-2 bg-army-700 text-white font-bold rounded hover:bg-army-800 disabled:opacity-50 flex justify-center items-center"
           >
             {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
             Confirmar Troca
           </button>
        </form>
      </div>
    </div>
  );
};

const DeleteConfirmationModal: React.FC<{ mapId: string; onConfirm: () => void; onCancel: () => void; isDeleting: boolean }> = ({ mapId, onConfirm, onCancel, isDeleting }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
       <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Processo?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Você tem certeza que deseja excluir o mapa <strong>{mapId}</strong>? Esta ação removerá o registro do Painel e do Histórico.
            </p>
            <div className="flex space-x-3">
              <button onClick={onCancel} disabled={isDeleting} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={onConfirm} disabled={isDeleting} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center">
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sim, Excluir'}
              </button>
            </div>
          </div>
       </div>
    </div>
  );
};

const DetailsModal: React.FC<{ data: MapData; onClose: () => void }> = ({ data, onClose }) => {
  const getVal = (patterns: string[]) => {
    if (!data.cleanHeaders || !data.rawData) return '-';
    const index = data.cleanHeaders.findIndex(header => 
      header && patterns.some(p => header.toLowerCase().includes(p.toLowerCase()))
    );
    return index >= 0 ? (data.rawData[index] || '-') : '-';
  };

  const getNumericVal = (patterns: string[]) => {
    const val = getVal(patterns);
    if (val === '-') return 0;
    const num = parseInt(val.replace(/\D/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const getStyleForDays = (label: string, value: number) => {
    if (label.includes('Evento -> Remessa')) {
      if (value > 59) return 'text-black font-black'; 
      if (value > 45) return 'text-red-600 font-bold'; 
    }
    if (label.includes('Recb -> Remessa DE')) {
      if (value > 10) return 'text-red-800 font-bold'; 
      if (value > 5) return 'text-red-400 font-bold'; 
    }
    if (label.includes('Remessa DE -> CML')) {
       if (value > 10) return 'text-red-800 font-bold'; 
       if (value > 5) return 'text-red-400 font-bold'; 
    }
    return 'text-gray-800';
  };

  const Field = ({ label, patterns, full = false, isDays = false }: { label: string, patterns: string[], full?: boolean, isDays?: boolean }) => {
    const valStr = getVal(patterns);
    const valNum = isDays ? getNumericVal(patterns) : 0;
    const styleClass = isDays ? getStyleForDays(label, valNum) : 'text-gray-800';

    return (
      <div className={`flex flex-col ${full ? 'col-span-full' : ''}`}>
        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">{label}</span>
        <span className={`text-sm font-semibold break-words ${styleClass}`}>{valStr}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Detalhes Completos</h3>
            <div className="flex items-center space-x-3">
               <span className="text-sm font-mono text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">{data.id}</span>
               <div className="scale-110"><StatusBadge status={data.situacao} /></div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-6 space-y-6 bg-white">
          <section className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 border-b border-gray-200 pb-2">Dados do Mapa e Envio</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Mapa" patterns={['Mapa']} />
              <Field label="Evento" patterns={['Evento']} />
              <Field label="Últ. Dia Evento" patterns={['Ult Dia', 'Ultimo Dia']} />
              <Field label="Valor" patterns={['Valor']} />
              <Field label="Doc. Autoriza Evento" patterns={['Doc que autoriza o Evento']} full={true} />
              <Field label="Nr DIEx Remessa" patterns={['Nr DIEx Remessa']} />
              <Field label="Data DIEx Remessa" patterns={['Data DIEx Remessa']} />
              <Field label="Dias (Evento -> Remessa)" patterns={['Remsessa Bda', 'Dias Evento']} isDays={true} />
            </div>
          </section>
          <section className="bg-sky-50 rounded-xl p-4 border border-sky-100">
             <h4 className="text-xs font-bold text-sky-600 uppercase tracking-widest mb-4 border-b border-sky-200 pb-2">Trâmite Brigada &rarr; DE</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Nr DIEx Saída" patterns={['Nr DIEx Saída']} />
                <Field label="Data DIEx Saída" patterns={['Data DIEx Saída']} />
                <Field label="Destino" patterns={['Destino DIEx Saída']} />
                <Field label="Dias (Recb -> Remessa DE)" patterns={['Remsessa DE', 'Dias Recb']} isDays={true} />
             </div>
          </section>
          <section className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
             <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4 border-b border-indigo-200 pb-2">Trâmite DE &rarr; CML</h4>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="DIEx 1ª DE ao CML" patterns={['DIEx da 1ª DE ao CML']} />
                <Field label="Data DIEx" patterns={['Data DIEx da 1ª DE ao CML']} />
                <Field label="Dias (Remessa DE -> CML)" patterns={['Remsessa DE -> CML']} isDays={true} />
             </div>
          </section>
          {(getVal(['Nr DIEx Devol', 'Nr DIEx Devolução']) !== '-' || data.situacao.toLowerCase().includes('devolvido')) && (
            <section className="bg-red-50 rounded-xl p-4 border border-red-200 ring-1 ring-red-100">
              <h4 className="text-xs font-bold text-red-700 uppercase tracking-widest mb-4 border-b border-red-200 pb-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" /> Devolução
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Field label="Nr DIEx Devol" patterns={['Nr DIEx Devol']} />
                  <Field label="Data DIEx Devol" patterns={['Data DIEx Devol']} />
                  <Field label="Destino Devolução" patterns={['Destino DIEx Devolução']} />
                  <Field label="Motivo" patterns={['Motivo']} full={true} />
              </div>
            </section>
          )}
          <section className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 ring-1 ring-emerald-100">
             <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-4 border-b border-emerald-200 pb-2 flex items-center">
               <CheckCircle2 className="w-4 h-4 mr-2" /> Autorização de Pagamento
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <Field label="Doc Autz Pagamento" patterns={['Doc Autorização de Pagamento']} />
                </div>
                <Field label="Data Doc" patterns={['Data Doc Autz Pg']} />
                <Field label="Dias (OM -> Autz)" patterns={['Dias Recb OM -> Autz Pg']} />
                <Field label="Dias (Bda -> DE -> Autz)" patterns={['Dias Enc Bda -> DE -> Autz Pg']} />
                <Field label="Dias (DE -> CML -> Autz)" patterns={['Dias Enc DE -> CML -> Autz Pg']} />
             </div>
          </section>
          <section className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <h4 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">Observações</h4>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{getVal(['Observação', 'Obs'])}</p>
          </section>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-army-700 text-white rounded-lg text-sm font-bold uppercase hover:bg-army-800 shadow-md">Fechar</button>
        </div>
      </div>
    </div>
  );
};

// --- Edit Components ---
const getFieldKey = (cleanHeaders: string[], pattern: string) => {
  return cleanHeaders.find(h => h.toLowerCase().trim() === pattern.toLowerCase().trim()) || null;
};

const SmartEditInput = ({ label, exactHeader, type = 'text', formData, cleanHeaders, onChange }: { label: string, exactHeader: string, type?: string, formData: Record<string, string>, cleanHeaders: string[], onChange: (k: string, v: string) => void }) => {
  const key = getFieldKey(cleanHeaders, exactHeader);
  if (!key) return null;
  const calculatedFields = ['Qnt Dias Evento -> Remsessa Bda', 'Qnt Dias Recb -> Remsessa DE', 'Qnt Dias Remsessa DE -> CML', 'Qnt Dias Recb OM -> Autz Pg', 'Qnt Dias Enc Bda -> DE -> Autz Pg', 'Qnt Dias Enc DE -> CML -> Autz Pg', 'Situação', 'Ano', 'OM'];
  const isCalculated = calculatedFields.some(f => f.toLowerCase() === exactHeader.toLowerCase());
  let val = formData[key] || '';
  if (type === 'date') val = formatDateToISO(val);
  return (
    <div className="flex flex-col">
      <label className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center justify-between">{label}{isCalculated && <Lock className="w-3 h-3 text-gray-400" />}</label>
      <input type={type} disabled={isCalculated} className={`p-2 border rounded text-sm outline-none w-full ${isCalculated ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300 focus:ring-2 focus:ring-army-500'}`} value={val} onChange={e => onChange(key, e.target.value)} />
    </div>
  );
};

const EditSelect = ({ label, exactHeader, options, formData, cleanHeaders, onChange }: { label: string, exactHeader: string, options: string[], formData: Record<string, string>, cleanHeaders: string[], onChange: (k: string, v: string) => void }) => {
  const key = getFieldKey(cleanHeaders, exactHeader);
  if (!key) return null;
  return (
    <div className="flex flex-col">
      <label className="text-xs font-bold text-gray-500 uppercase mb-1">{label}</label>
      <select className="p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-army-500 outline-none bg-white w-full" value={formData[key] || ''} onChange={e => onChange(key, e.target.value)}>
        <option value="">Selecione...</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
};

const EditTextArea = ({ label, exactHeader, formData, cleanHeaders, onChange }: { label: string, exactHeader: string, formData: Record<string, string>, cleanHeaders: string[], onChange: (k: string, v: string) => void }) => {
  const key = getFieldKey(cleanHeaders, exactHeader);
  if (!key) return null;
  return (
    <div className="flex flex-col col-span-full">
      <label className="text-xs font-bold text-gray-500 uppercase mb-1">{label}</label>
      <textarea rows={3} className="p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-army-500 outline-none w-full" value={formData[key] || ''} onChange={e => onChange(key, e.target.value)} />
    </div>
  );
};

const EditMapModal: React.FC<{ data: MapData; auxData: AuxiliarData | null; onClose: () => void }> = ({ data, auxData, onClose }) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [initialData, setInitialData] = useState<Record<string, string>>({});
  const [headerMap, setHeaderMap] = useState<Record<string, string>>({}); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    const initial: Record<string, string> = {};
    const hMap: Record<string, string> = {};
    data.cleanHeaders.forEach((cleanH, idx) => {
       initial[cleanH] = data.rawData[idx] || '';
       hMap[cleanH] = data.rawHeaders[idx]; 
    });
    setFormData(initial);
    setInitialData(initial);
    setHeaderMap(hMap);
  }, [data]);

  const handleChange = (cleanHeader: string, value: string) => {
    setFormData(prev => ({ ...prev, [cleanHeader]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const updates: Record<string, string> = {};
    Object.keys(formData).forEach(cleanKey => {
      let value = formData[cleanKey];
      let initialVal = initialData[cleanKey];
      if (value.match(/^\d{4}-\d{2}-\d{2}$/)) value = formatDateToBR(value);
      if (initialVal.match(/^\d{4}-\d{2}-\d{2}$/)) initialVal = formatDateToBR(initialVal);
      if (value !== initialVal) {
        const rawKey = headerMap[cleanKey];
        if (rawKey) {
            const sanitizedKey = rawKey.replace(/[\r\n]+/g, '').trim();
            updates[sanitizedKey] = value; 
        }
      }
    });

    if (Object.keys(updates).length === 0) {
      alert("Nenhuma alteração detectada.");
      setIsSubmitting(false);
      return;
    }

    const success = await updateMap('Controle de Mapas', data.mapColumnTitle.trim(), data.id, updates, data.rowIndex);
    setIsSubmitting(false);
    if (success) {
      alert("Processo atualizado com sucesso!");
      onClose();
    } else {
      alert("Erro ao atualizar dados.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 bg-army-800 text-white flex justify-between items-center">
           <div><h3 className="text-lg font-bold uppercase">Editar Processo</h3><p className="text-xs text-army-200">{data.id}</p></div>
           <button onClick={onClose} className="p-1 hover:bg-army-700 rounded-full"><X className="w-6 h-6" /></button>
        </div>
        <form id="edit-form" onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 border-b pb-1">Dados Básicos</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <SmartEditInput label="Evento" exactHeader="Evento" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
              <SmartEditInput label="Últ. Dia" exactHeader="Ult Dia Evento" formData={formData} cleanHeaders={data.cleanHeaders} type="date" onChange={handleChange} />
              <SmartEditInput label="Valor" exactHeader="Valor" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
              <SmartEditInput label="Nr DIEx" exactHeader="Nr DIEx Remessa 4 Bda" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
              <SmartEditInput label="Data DIEx" exactHeader="Data DIEx Remessa 4 Bda" type="date" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
              <SmartEditInput label="Doc Autoriza" exactHeader="Doc que autoriza o Evento" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
              <SmartEditInput label="Dias (Calc)" exactHeader="Qnt Dias Evento -> Remsessa Bda" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
            </div>
          </div>
          <div className="bg-sky-50 p-4 rounded-lg border border-sky-100">
            <h4 className="text-xs font-bold text-sky-600 uppercase mb-3 border-b border-sky-200 pb-1">Trâmite Brigada &rarr; DE</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <SmartEditInput label="Nr DIEx Saída" exactHeader="Nr DIEx Saída" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
              <SmartEditInput label="Data Saída" exactHeader="Data DIEx Saída" type="date" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
              <EditSelect label="Destino" exactHeader="Destino DIEx Saída" options={auxData?.destinos || []} formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
              <SmartEditInput label="Dias (Calc)" exactHeader="Qnt Dias Recb -> Remsessa DE" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
            </div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
             <h4 className="text-xs font-bold text-indigo-600 uppercase mb-3 border-b border-indigo-200 pb-1">Trâmite DE &rarr; CML</h4>
             <div className="grid grid-cols-2 gap-4">
               <SmartEditInput label="DIEx DE ao CML" exactHeader="DIEx da 1ª DE ao CML" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
               <SmartEditInput label="Data" exactHeader="Data DIEx da 1ª DE ao CML" type="date" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
               <SmartEditInput label="Dias (Calc)" exactHeader="Qnt Dias Remsessa DE -> CML" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
             </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h4 className="text-xs font-bold text-red-700 uppercase mb-3 border-b border-red-200 pb-1 flex items-center"><AlertCircle className="w-4 h-4 mr-2"/> Devolução</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <SmartEditInput label="Nr DIEx Devol" exactHeader="Nr DIEx Devol" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
              <SmartEditInput label="Data Devol" exactHeader="Data DIEx Devol" type="date" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
              <EditSelect label="Destino" exactHeader="Destino DIEx Devolução" options={auxData?.destinos || []} formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
              <div className="col-span-full"><EditSelect label="Motivo da Devolução" exactHeader="Motivo" options={auxData?.motivos || []} formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} /></div>
            </div>
          </div>
          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
             <h4 className="text-xs font-bold text-emerald-700 uppercase mb-3 border-b border-emerald-200 pb-1">Pagamento</h4>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               <SmartEditInput label="Doc Autz Pagamento" exactHeader="Doc Autorização de Pagamento" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
               <SmartEditInput label="Data Doc" exactHeader="Data Doc Autz Pg" type="date" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
               <SmartEditInput label="Dias OM->Autz" exactHeader="Qnt Dias Recb OM -> Autz Pg" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
             </div>
          </div>
          <EditTextArea label="Observações Gerais" exactHeader="Observação" formData={formData} cleanHeaders={data.cleanHeaders} onChange={handleChange} />
        </form>
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">CANCELAR</button>
          <button type="submit" form="edit-form" disabled={isSubmitting} className="flex items-center px-6 py-2 bg-army-700 rounded-lg text-sm font-bold text-white hover:bg-army-800 disabled:opacity-50 shadow-md">
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            ATUALIZAR PROCESSO
          </button>
        </div>
      </div>
    </div>
  );
};

const NewMapForm: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => {
  const [aux, setAux] = useState<AuxiliarData | null>(null);
  const [usersInfo, setUsersInfo] = useState<{users: UserCredential[], adminEmail: string}>({users: [], adminEmail: ''});
  const [formData, setFormData] = useState({
    mapa: '', evento: '', ultDiaEvento: '', valor: '', docAutoriza: '', nrDiex: '', dataDiex: '', observacao: '', 
    selectedOM: user.role === UserRole.OM ? user.om! : '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    Promise.all([fetchAuxiliar(), fetchUsers()]).then(([auxRes, usersRes]) => {
      setAux(auxRes);
      setUsersInfo({users: usersRes.users, adminEmail: usersRes.adminEmail});
    });
  }, []);

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (!value) {
      setFormData({ ...formData, valor: '' });
      return;
    }
    const amount = parseInt(value) / 100;
    const formatted = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setFormData({ ...formData, valor: formatted });
  };

  const isLate = (dateStr: string) => {
    if (!dateStr) return false;
    const today = new Date();
    // Força a data para meio-dia para evitar problemas de fuso horário na conversão
    const eventDate = new Date(dateStr + 'T12:00:00');
    
    // Diferença em milissegundos
    const diffTime = today.getTime() - eventDate.getTime();
    
    // Converte para dias
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Se o evento foi há mais de 60 dias atrás
    return diffDays > 60;
  };

  const executeSubmission = async () => {
    setIsSubmitting(true);
    const mapaBase = formData.mapa.split(' - ')[0].trim();
    const mapaConcatenado = `${mapaBase} - 4 Bda/${formData.selectedOM}`;
    
    // Find email associated with the selected OM
    const omUser = usersInfo.users.find(u => u.om === formData.selectedOM);
    const omEmail = omUser ? omUser.email : '';
    const adminEmail = usersInfo.adminEmail;

    const payload = {
      ...formData,
      mapa: mapaConcatenado, 
      ultDiaEvento: formatDateToBR(formData.ultDiaEvento),
      dataDiex: formatDateToBR(formData.dataDiex),
      om: formData.selectedOM,
      userEmail: user.email, // Logged user email (might be admin or om)
      omEmail: omEmail,      // Target OM Email
      adminEmail: adminEmail // Target Admin Email
    };
    const success = await submitNewMap(payload);
    setIsSubmitting(false);
    if (success) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mapa || !formData.evento || !formData.valor || !formData.nrDiex || !formData.docAutoriza || !formData.selectedOM) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (isLate(formData.ultDiaEvento)) {
      setShowConfirmation(true);
      return; // Interrompe a submissão e espera a confirmação do modal
    }
    
    await executeSubmission();
  };

  if (!aux) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><Loader2 className="animate-spin text-white w-10 h-10" /></div>;

  const getPreviewMapa = () => {
    if (!formData.mapa) return "...";
    const mapaBase = formData.mapa.split(' - ')[0].trim();
    return `${mapaBase} - 4 Bda/${formData.selectedOM || '...'}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
        <div className="p-6 bg-army-800 text-white flex justify-between items-center rounded-t-2xl">
          <div><h3 className="text-lg font-bold uppercase tracking-tight">Novo Mapa de Gratificação</h3><p className="text-xs text-army-200">{formData.selectedOM || user.om}</p></div>
          <button onClick={onClose} className="p-1 hover:bg-army-700 rounded-full"><X className="w-6 h-6" /></button>
        </div>
        <div className="overflow-y-auto p-6 relative">
          
          {showConfirmation && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 p-6 backdrop-blur-sm rounded-lg animate-in fade-in zoom-in duration-200">
              <div className="max-w-sm text-center">
                 <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                   <AlertTriangle className="w-8 h-8" />
                 </div>
                 <h4 className="text-lg font-bold text-gray-900 mb-2">Atenção! Prazo Excedido</h4>
                 <p className="text-sm text-gray-600 mb-6">
                   O envio deste mapa ultrapassou 60 dias do evento. A justificativa está juntada ao processo?
                 </p>
                 <div className="flex space-x-3 justify-center">
                   <button 
                     type="button"
                     onClick={() => setShowConfirmation(false)} 
                     className="px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300 transition"
                   >
                     Não
                   </button>
                   <button 
                     type="button"
                     onClick={() => { setShowConfirmation(false); executeSubmission(); }} 
                     className="px-6 py-2 bg-army-700 text-white font-bold rounded hover:bg-army-800 transition"
                   >
                     Sim
                   </button>
                 </div>
              </div>
            </div>
          )}

          <form id="new-map-form" onSubmit={handleSubmit} className="space-y-4">
            {user.role === UserRole.ADMIN && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">OM do Mapa (Admin)</label>
                <select required className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white" value={formData.selectedOM} onChange={e => setFormData({...formData, selectedOM: e.target.value})}>
                  <option value="">Selecione a OM...</option>
                  {aux.oms.map(om => <option key={om} value={om}>{om}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mapa (Mês/Ano)</label>
                <select required className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white" value={formData.mapa} onChange={e => setFormData({...formData, mapa: e.target.value})}>
                  <option value="">Selecione...</option>
                  {aux.mapas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">Será enviado como: <span className="font-mono font-bold text-gray-600">{getPreviewMapa()}</span></p>
              </div>
              <div>
                <label className="flex items-center text-xs font-bold text-gray-500 uppercase mb-1">Evento</label>
                <select required className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white" value={formData.evento} onChange={e => setFormData({...formData, evento: e.target.value})}>
                  <option value="">Selecione...</option>
                  {aux.eventos.map(ev => <option key={ev} value={ev}>{ev}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Últ. Dia Evento</label><input required type="date" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={formData.ultDiaEvento} onChange={e => setFormData({...formData, ultDiaEvento: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Total (R$)</label><input required type="text" placeholder="0,00" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={formData.valor} onChange={handleValorChange} /></div>
              <div className="md:col-span-2"><label className="flex items-center text-xs font-bold text-gray-500 uppercase mb-1">Documento que autoriza o Evento</label><input required type="text" placeholder="Ex: DIM CML, OS Nr 123-Sec..." className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={formData.docAutoriza} onChange={e => setFormData({...formData, docAutoriza: e.target.value})} /></div>
              <div><label className="flex items-center text-xs font-bold text-gray-500 uppercase mb-1">Nr DIEx Remessa</label><input required type="text" placeholder="Somente números" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={formData.nrDiex} onChange={e => setFormData({...formData, nrDiex: e.target.value.replace(/\D/g, '')})} /></div>
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
  const [auxData, setAuxData] = useState<AuxiliarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<MapData | null>(null);
  const [editingMap, setEditingMap] = useState<MapData | null>(null); 
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof MapData, direction: 'asc' | 'desc' } | null>(null);
  const [filterMapa, setFilterMapa] = useState(''); 
  const [filterOM, setFilterOM] = useState(user.role === UserRole.OM ? user.om! : '');
  const [filterAno, setFilterAno] = useState(''); 
  const [filterEventos, setFilterEventos] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  
  // States para o modal de exclusão
  const [mapToDelete, setMapToDelete] = useState<MapData | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try { 
      const [maps, aux] = await Promise.all([fetchMapData(), fetchAuxiliar()]);
      setData(maps);
      setAuxData(aux);
    } catch (err) { setError('Falha na sincronização.'); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSort = (key: keyof MapData) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const confirmDelete = async () => {
    if (!mapToDelete) return;
    setDeletingId(mapToDelete.id);
    const success = await deleteMap(mapToDelete.rowIndex, mapToDelete.id);
    setDeletingId(null);
    setIsDeleteModalOpen(false);
    setMapToDelete(null);
    if (success) {
      alert("Mapa excluído com sucesso!");
      loadData();
    } else {
      alert("Erro ao excluir mapa.");
    }
  };

  const handleDeleteClick = (map: MapData, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setMapToDelete(map);
    setIsDeleteModalOpen(true);
  };

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.forEach(item => {
      const y = extractYear(item.id);
      if (y) years.add(y);
    });
    return Array.from(years).sort().reverse();
  }, [data]);

  const filteredData = useMemo(() => {
    let filtered = data.filter(item => {
      if (user.role === UserRole.OM && item.om.trim() !== user.om) return false;
      if (filterOM && !item.om.toLowerCase().includes(filterOM.toLowerCase())) return false;
      if (filterMapa && !item.id.toLowerCase().includes(filterMapa.toLowerCase())) return false;
      if (filterAno && extractYear(item.id) !== filterAno) return false;
      if (filterEventos.length > 0 && !filterEventos.includes(item.evento)) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(item.situacao)) return false;
      return true;
    });

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return 0;
      });
    }
    return filtered;
  }, [data, user, filterMapa, filterStatus, filterOM, filterEventos, filterAno, sortConfig]);

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
    if (s.includes('cancelado')) return 'bg-red-50 text-red-900 hover:bg-red-100'; 
    return index % 2 === 0 ? 'bg-white hover:bg-gray-100' : 'bg-gray-200 hover:bg-gray-300';
  };

  const generatePDF = (type: 'OM' | 'EVENTO' | 'MAPA') => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');
    doc.setFontSize(16);
    doc.text('Relatório de Gratificações - 4ª Bda Inf L Mth', 14, 15);
    doc.setFontSize(10);
    const filtrosTexto = `OM: ${filterOM || 'Todas'} | Ano: ${filterAno || 'Todos'} | Status: ${filterStatus.length ? filterStatus.join(', ') : 'Todos'}`;
    doc.text(`Gerado em: ${today}`, 14, 22);
    doc.setFontSize(8);
    doc.text(filtrosTexto, 14, 26);
    let tableBody: any[] = [];
    let sortedData = [...filteredData];
    let grandTotal = 0;

    if (type === 'MAPA') {
      sortedData.sort((a, b) => a.id.localeCompare(b.id));
      sortedData.forEach(row => {
        const val = parseCurrency(row.valor);
        grandTotal += val;
        tableBody.push([row.om, row.id, row.evento, row.valor, row.situacao]);
      });
    } else {
      const groupKey = type === 'OM' ? 'om' : 'evento';
      sortedData.sort((a, b) => (a[groupKey] as string).localeCompare(b[groupKey] as string));
      let currentGroup = '';
      let subTotal = 0;
      for (let i = 0; i < sortedData.length; i++) {
        const row = sortedData[i];
        const rowVal = row[groupKey] as string;
        const valorNum = parseCurrency(row.valor);
        if (rowVal !== currentGroup) {
          if (currentGroup !== '') {
            tableBody.push([{ content: `Total ${type === 'OM' ? 'OM' : 'Evento'}: ${formatCurrency(subTotal)}`, colSpan: 5, styles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', halign: 'right' } }]);
          }
          currentGroup = rowVal;
          subTotal = 0;
          tableBody.push([{ content: currentGroup, colSpan: 5, styles: { fillColor: [52, 78, 52], textColor: 255, fontStyle: 'bold', halign: 'left' } }]);
        }
        subTotal += valorNum;
        grandTotal += valorNum;
        tableBody.push([type === 'OM' ? row.id : row.om, type === 'OM' ? row.evento : row.id, row.valor, row.nrDiex, row.situacao]);
        if (i === sortedData.length - 1) {
           tableBody.push([{ content: `Total ${type === 'OM' ? 'OM' : 'Evento'}: ${formatCurrency(subTotal)}`, colSpan: 5, styles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', halign: 'right' } }]);
        }
      }
    }
    tableBody.push([{ content: `TOTAL GERAL: ${formatCurrency(grandTotal)}`, colSpan: 5, styles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold', halign: 'right', fontSize: 10 } }]);
    autoTable(doc, { startY: 30, head: [type === 'MAPA' ? ['OM', 'Mapa', 'Evento', 'Valor', 'Situação'] : [type === 'OM' ? 'Mapa' : 'OM', type === 'OM' ? 'Evento' : 'Mapa', 'Valor', 'DIEx', 'Situação']], body: tableBody, theme: 'grid', headStyles: { fillColor: [100, 100, 100] }, styles: { fontSize: 8 } });
    doc.save(`relatorio_${type.toLowerCase()}_${Date.now()}.pdf`);
    setIsReportMenuOpen(false);
  };

  const SortableHeader = ({ label, sortKey }: { label: string, sortKey: keyof MapData }) => (
    <th className="p-4 cursor-pointer hover:bg-gray-200 transition select-none" onClick={() => handleSort(sortKey)}>
      <div className="flex items-center space-x-1"><span>{label}</span><ArrowUpDown className="w-3 h-3 text-gray-400" /></div>
    </th>
  );

  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50"><RefreshCcw className="w-10 h-10 text-army-600 animate-spin mb-4" /><p className="text-gray-600 font-medium tracking-tight uppercase text-xs">Sincronizando dados...</p></div>;

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-10">
      {selectedMap && <DetailsModal data={selectedMap} onClose={() => setSelectedMap(null)} />}
      {editingMap && <EditMapModal data={editingMap} auxData={auxData} onClose={() => { setEditingMap(null); loadData(); }} />}
      {isFormOpen && <NewMapForm user={user} onClose={() => { setIsFormOpen(false); loadData(); }} />}
      {isChangePasswordOpen && <ChangePasswordModal user={user} onClose={() => setIsChangePasswordOpen(false)} />}
      
      {/* Modal de Exclusão separado */}
      {isDeleteModalOpen && mapToDelete && (
        <DeleteConfirmationModal 
          mapId={mapToDelete.id} 
          onConfirm={confirmDelete} 
          onCancel={() => { setIsDeleteModalOpen(false); setMapToDelete(null); }} 
          isDeleting={deletingId === mapToDelete.id}
        />
      )}

      <nav className="bg-army-800 text-white shadow-xl sticky top-0 z-40 border-b border-army-900">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1 rounded-lg"><ClipboardList className="h-6 w-6 text-army-800" /></div>
            <div><h1 className="text-lg font-bold uppercase tracking-tighter">4ª Bda Inf L Mth</h1><p className="text-[10px] text-army-300 font-bold uppercase">Gratificação de Representação</p></div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block"><p className="text-xs font-bold uppercase">{user.name}</p><p className="text-[10px] text-army-400 font-bold uppercase">{user.om || 'ADMINISTRADOR'}</p></div>
            <button onClick={() => setIsChangePasswordOpen(true)} className="p-2 bg-army-700 hover:bg-army-600 rounded-full transition shadow-inner" title="Trocar Senha"><Key className="w-4 h-4" /></button>
            <button onClick={onLogout} className="p-2 bg-army-700 hover:bg-red-700 rounded-full transition shadow-inner" title="Sair"><LogOut className="w-4 h-4" /></button>
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
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex space-x-2 w-full lg:w-auto">
            <button onClick={() => setIsFormOpen(true)} className="flex-1 lg:flex-none flex items-center justify-center px-6 py-2.5 bg-army-700 hover:bg-army-800 text-white rounded-lg font-bold text-sm shadow-md transition uppercase tracking-wider"><Plus className="w-5 h-5 mr-2" /> Novo Mapa</button>
            {user.role === UserRole.ADMIN && (
              <div className="relative">
                <button onClick={() => setIsReportMenuOpen(!isReportMenuOpen)} className="flex-1 lg:flex-none flex items-center justify-center px-6 py-2.5 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-bold text-sm shadow-md transition uppercase tracking-wider"><Printer className="w-5 h-5 mr-2" /> Relatórios</button>
                {isReportMenuOpen && (
                   <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                     <button onClick={() => generatePDF('OM')} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm flex items-center"><FileText className="w-4 h-4 mr-2 text-gray-400"/> Por OM (com Subtotais)</button>
                     <button onClick={() => generatePDF('EVENTO')} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm flex items-center"><FileText className="w-4 h-4 mr-2 text-gray-400"/> Por Evento (com Subtotais)</button>
                     <button onClick={() => generatePDF('MAPA')} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm flex items-center"><FileText className="w-4 h-4 mr-2 text-gray-400"/> Por Mapa (Geral)</button>
                   </div>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 w-full lg:flex-1 justify-end">
            <div className="relative flex-1 lg:max-w-[140px]">
               <input type="text" placeholder="Buscar Mapa..." value={filterMapa} onChange={e => setFilterMapa(e.target.value)} className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs" />
               <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
            <div className="relative flex-1 lg:max-w-[100px]">
              <select value={filterAno} onChange={e => setFilterAno(e.target.value)} className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs appearance-none cursor-pointer">
                <option value="">Ano...</option>
                {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
              <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
            {user.role === UserRole.ADMIN && (
              <div className="relative flex-1 lg:max-w-[120px]">
                <select value={filterOM} onChange={e => setFilterOM(e.target.value)} className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs appearance-none cursor-pointer">
                  <option value="">Todas OMs</option>
                  {Array.from(new Set(data.map(d => d.om))).sort().map(om => <option key={om} value={om}>{om}</option>)}
                </select>
                <Building2 className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            )}
            <MultiSelect label="Eventos..." options={auxData?.eventos || []} selected={filterEventos} onChange={setFilterEventos} icon={Filter} />
            <MultiSelect label="Status..." options={Array.from(new Set(data.map(d => d.situacao))).sort()} selected={filterStatus} onChange={setFilterStatus} icon={Filter} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-[10px] uppercase font-bold text-gray-500">
                  <SortableHeader label="MAPA" sortKey="id" />
                  {user.role === UserRole.ADMIN && <SortableHeader label="OM" sortKey="om" />}
                  <SortableHeader label="EVENTO" sortKey="evento" />
                  <th className="p-4">VALOR</th>
                  <th className="p-4 hidden lg:table-cell">DIEx</th>
                  <th className="p-4 hidden lg:table-cell">DATA DIEx</th>
                  <SortableHeader label="SITUAÇÃO" sortKey="situacao" />
                  <th className="p-4 w-28 text-center">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {filteredData.map((row, idx) => (
                  <tr 
                    key={idx} 
                    className={`border-b border-gray-100 transition duration-100 cursor-pointer ${getRowStyle(row.situacao, idx)}`}
                    onClick={() => setSelectedMap(row)}
                  >
                    <td className="p-4 font-mono font-bold uppercase">{row.id}</td>
                    {user.role === UserRole.ADMIN && <td className="p-4 font-bold">{row.om}</td>}
                    <td className="p-4">
                      <div className="font-bold uppercase">{row.evento}</div>
                      <div className="text-[10px] opacity-60 flex items-center mt-1"><Calendar className="w-3 h-3 mr-1" /> {row.ultDiaEvento}</div>
                    </td>
                    <td className="p-4 font-bold">{row.valor}</td>
                    <td className="p-4 hidden lg:table-cell opacity-70 font-mono text-[10px]">{row.nrDiex}</td>
                    <td className="p-4 hidden lg:table-cell opacity-70 font-mono text-[10px]">{row.dataDiex}</td>
                    <td className="p-4">
                      {row.situacao.toLowerCase().includes('devolvido') || row.situacao.toLowerCase().includes('cancelado') ? (
                        <span className="font-bold uppercase tracking-tighter text-[10px] px-2 py-0.5 border border-white/40 rounded bg-white/10">{row.situacao}</span>
                      ) : <StatusBadge status={row.situacao} />}
                    </td>
                    <td className="p-3 text-center flex justify-center space-x-1" onClick={e => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedMap(row); }} className="p-1.5 rounded-full hover:bg-army-100 text-army-700 transition" title="Ver Detalhes"><Eye className="w-4 h-4" /></button>
                      {user.role === UserRole.ADMIN && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setEditingMap(row); }} className="p-1.5 rounded-full hover:bg-blue-100 text-blue-700 transition" title="Editar Processo"><Pencil className="w-4 h-4" /></button>
                          <button 
                            onClick={(e) => handleDeleteClick(row, e)} 
                            disabled={deletingId === row.id} 
                            className="p-1.5 rounded-full hover:bg-red-100 text-red-700 transition disabled:opacity-50" 
                            title="Excluir Mapa"
                          >
                            {deletingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                    </td>
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
import {
  MapData, SHEET_ID, GID_CONTROLE_MAPAS, GID_AUXILIAR, GID_USUARIOS,
  UserCredential, AuxiliarData, SCRIPT_URL, DATA_START_COL_INDEX
} from '../types';
import { parseCSV } from '../utils/csv';

const fetchCSV = async (gid: string) => {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Erro de rede ao acessar aba GID: " + gid);
  const text = await response.text();
  return parseCSV(text);
};

// Função auxiliar para envio de dados com tratamento de resposta
const sendRequest = async (payload: any): Promise<boolean> => {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain evita preflight OPTIONS no GAS
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (result.status === 'success') {
      return true;
    } else {
      console.error("Erro retornado pelo script:", result.message);
      return false;
    }
  } catch (e) {
    console.error("Falha na requisição:", e);
    return false;
  }
};
const formatDateToISO = (dateStr: string) => {
  if (!dateStr) return null;
  if (dateStr.includes('-')) return dateStr; // Já está no formato ISO
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

const formatDateToBR = (dateStr: string) => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr; // Já aparenta ser BR
  const parts = dateStr.split('-'); // ex: 2026-10-05
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// Cabeçalhos virtuais para manter compatibilidade com a lógica do frontend que usa cleanHeaders/rawData
const VIRTUAL_HEADERS = [
  'Mapa', 'Evento', 'Ult Dia Evento', 'Valor', 'Doc que autoriza o Evento',
  'Nr DIEx Remessa 4 Bda', 'Data DIEx Remessa 4 Bda', 'Nr DIEx Saída', 'Data DIEx Saída',
  'Destino DIEx Saída', 'DIEx da 1ª DE ao CML', 'Data DIEx da 1ª DE ao CML',
  'Nr DIEx Devol', 'Data DIEx Devol', 'Destino DIEx Devolução', 'Motivo',
  'Doc Autorização de Pagamento', 'Data Doc Autz Pg', 'Observação', 'Situação', 'OM', 'Ano'
];

const mapDatabaseToFrontend = (row: any): MapData => {
  const rawData = [
    row.id, row.evento || '', formatDateToBR(row.ult_dia_evento) || '', row.valor || '', row.doc_autoriza_evento || '',
    row.nr_diex_remessa || '', formatDateToBR(row.data_diex_remessa) || '', row.nr_diex_saida || '', formatDateToBR(row.data_diex_saida) || '',
    row.destino_diex_saida || '', row.diex_de_ao_cml || '', formatDateToBR(row.data_diex_de_ao_cml) || '',
    row.nr_diex_devol || '', formatDateToBR(row.data_diex_devol) || '', row.destino_diex_devolucao || '', row.motivo_devolucao || '',
    row.doc_autz_pagamento || '', formatDateToBR(row.data_doc_autz_pg) || '', row.observacao || '', row.situacao || '', row.om || '', row.ano || ''
  ];

  return {
    id: row.id,
    evento: row.evento || '',
    ultDiaEvento: formatDateToBR(row.ult_dia_evento) || '',
    valor: row.valor || '',
    docAutoriza: row.doc_autoriza_evento || '',
    nrDiex: row.nr_diex_remessa || '',
    dataDiex: formatDateToBR(row.data_diex_remessa) || '',
    observacao: row.observacao || '',
    situacao: row.situacao || '',
    om: row.om || '',
    rawData: rawData,
    rawHeaders: VIRTUAL_HEADERS,
    cleanHeaders: VIRTUAL_HEADERS,
    rowIndex: 0, // No Supabase usamos o ID para update/delete
    mapColumnTitle: 'Mapa'
  };
>>>>>>> b06c47e (feat: Adicionados SLA Chips ajustados, caixa alta e logicas de Dias Corridos globais no Dashboard)
};

export const getNextMapNumber = async (year: string): Promise<number> => {
  const { data, error } = await supabase
    .from('map_data')
    .select('id')
    .eq('ano', year);

  if (error) throw error;

  if (!data || data.length === 0) return 1;

  const numbers = data
    .map(row => {
      const match = row.id.match(/^(\d+)\//);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(n => n > 0);

  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
};

export const fetchMapData = async (): Promise<MapData[]> => {
  const rows = await fetchCSV(GID_CONTROLE_MAPAS);

  if (rows.length < 5) return [];

  let headerRowIndex = 3;

  if (!rows[headerRowIndex] || !rows[headerRowIndex][DATA_START_COL_INDEX]?.toLowerCase().includes('mapa')) {
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const cell = rows[i][DATA_START_COL_INDEX];
      if (cell && cell.trim().toLowerCase() === 'mapa') {
        headerRowIndex = i;
        break;
      }
    }
  }

  const rawHeaders = rows[headerRowIndex];
  const cleanHeaders = rawHeaders.map(h => h ? h.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim() : '');
  const getColIndex = (namePart: string) => cleanHeaders.findIndex(h => h.toLowerCase().includes(namePart.toLowerCase()));

  const idxMapa = getColIndex('mapa');
  const idxEvento = getColIndex('evento');
  const idxUltDia = getColIndex('ult dia');
  const idxValor = getColIndex('valor');
  const idxDoc = cleanHeaders.findIndex(h => h.toLowerCase().includes('doc') && h.toLowerCase().includes('autoriza') && h.toLowerCase().includes('evento'));
  const idxNrDiex = getColIndex('nr diex remessa');
  const idxDataDiex = getColIndex('data diex remessa');
  const idxObs = getColIndex('observ');

  let idxSituacao = cleanHeaders.findIndex(h => h.toLowerCase() === 'situação' || h.toLowerCase() === 'situacao');
  if (idxSituacao === -1 && rawHeaders.length > 27) idxSituacao = 27;

  let idxOM = cleanHeaders.findIndex(h => h === 'OM');
  if (idxOM === -1 && rawHeaders.length > 28) idxOM = 28;

  const mapColumnTitle = rawHeaders[idxMapa] || 'Mapa';

  return rows.slice(headerRowIndex + 1).map((row, index) => {
    if (!row[idxMapa]) return null;

    return {
      id: row[idxMapa] || '',
      evento: idxEvento > -1 ? row[idxEvento] : '',
      ultDiaEvento: idxUltDia > -1 ? row[idxUltDia] : '',
      valor: idxValor > -1 ? row[idxValor] : '',
      docAutoriza: idxDoc > -1 ? row[idxDoc] : '',
      nrDiex: idxNrDiex > -1 ? row[idxNrDiex] : '',
      dataDiex: idxDataDiex > -1 ? row[idxDataDiex] : '',
      observacao: idxObs > -1 ? row[idxObs] : '',
      situacao: idxSituacao > -1 ? row[idxSituacao] : '',
      om: idxOM > -1 ? row[idxOM] : '',
      rawData: row,
      rawHeaders: rawHeaders,
      cleanHeaders: cleanHeaders,
      rowIndex: headerRowIndex + 1 + index + 1,
      mapColumnTitle: mapColumnTitle
    };
  }).filter((item): item is MapData => item !== null);
};

export const fetchUsers = async (): Promise<{ users: UserCredential[], adminEmail: string, adminPassword?: string }> => {
  const rows = await fetchCSV(GID_USUARIOS);

  if (rows.length < 2) return { users: [], adminEmail: '' };

  // Admin Email está em G2 (Linha índice 1, Coluna índice 6)
  // Admin Senha está em H2 (Linha índice 1, Coluna índice 7)
  const adminEmail = rows[1]?.[6] || '';
  const adminPassword = rows[1]?.[7] || '';

  // Usuários começam na Linha 2 (Índice 1). 
  const users = rows.slice(1).map(r => ({
    om: r[0] || '',       // A
    senha: r[1] || '',    // B
    email: r[2] || '',    // C
    telefone: r[3] || ''  // D
  })).filter(u => u.om && u.senha);

  return { users, adminEmail, adminPassword };
};

export const fetchAuxiliar = async (): Promise<AuxiliarData> => {
  const rows = await fetchCSV(GID_AUXILIAR);
  if (rows.length < 2) return { oms: [], mapas: [], eventos: [], destinos: [], motivos: [], exercicioCorrente: '', adminEmail: '' };

  // Mapeamento conforme solicitado:
  // Eventos: B3:B (Index 1, slice(2))
  // Motivos: K3:K (Index 10, slice(2))
  // Destinos: M3:M (Index 12, slice(2))
  // Exercício Corrente: F2 (Index 5)

  const eventos = rows.slice(2).map(r => r[1]).filter(Boolean);
  const motivos = rows.slice(2).map(r => r[10]).filter(Boolean);
  const destinos = rows.slice(2).map(r => r[12]).filter(Boolean);
  const exercicioCorrente = rows[1]?.[5] || '';

  // OMs agora vêm da aba Usuários, mas para compatibilidade mantemos aqui se necessário
  const oms = rows.slice(1).map(r => r[14]).filter(Boolean);
  const mapas = rows.slice(1).map(r => r[8]).filter(Boolean);

  return {
    oms,
    mapas,
    eventos,
    destinos,
    motivos,
    exercicioCorrente,
    adminEmail: '',
    adminPassword: ''
  };
};

export const updateConfig = async (data: { eventos: string[], motivos: string[], destinos: string[], exercicio: string }): Promise<boolean> => {
  const payload = {
    action: 'updateConfig',
    sheetName: 'Auxiliar',
    sheet: 'Auxiliar',
    ...data
  };
  return sendRequest(payload);
};

export const updateUsersConfig = async (data: { users: UserCredential[], adminEmail: string, adminPassword: string }): Promise<boolean> => {
  const payload = {
    action: 'updateUsers',
    sheetName: 'Usuarios',
    sheet: 'Usuarios',
    ...data
  };
  return sendRequest(payload);
};

<<<<<<< HEAD
export const submitNewMap = async (data: any): Promise<boolean> => {
  const payload = {
    ...data,
    action: 'create',
    sheetName: 'Controle de Mapas',
    sheet: 'Controle de Mapas'
  };
  return sendRequest(payload);
=======
export const submitNewMap = async (formData: any): Promise<boolean> => {
  // Tentar extrair o ano de forma robusta
  let anoMapa = new Date().getFullYear().toString();
  if (formData.ultDiaEvento) {
    if (formData.ultDiaEvento.includes('-')) { // ISO YYYY-MM-DD
      anoMapa = formData.ultDiaEvento.split('-')[0];
    } else if (formData.ultDiaEvento.includes('/')) { // BR DD/MM/YYYY
      const parts = formData.ultDiaEvento.split('/');
      if (parts.length === 3) anoMapa = parts[2];
    }
  }

  // Buscar o próximo número sequencial GLOBAL para este ano
  const nextNum = await getNextMapNumber(anoMapa);

  const mapaConcatenado = `${nextNum}/${anoMapa} - 4 Bda/${formData.selectedOM}`;

  const statusInicial = formData.nrDiex ? 'Encaminhado para a 4ª Bda Inf L Mth.' : 'Não encaminhado à Bda';

  const payload = {
    id: mapaConcatenado,
    evento: formData.evento,
    ult_dia_evento: formData.ultDiaEvento ? formatDateToISO(formData.ultDiaEvento) : null,
    valor: formData.valor,
    doc_autoriza_evento: formData.docAutoriza,
    nr_diex_remessa: formData.nrDiex || '',
    data_diex_remessa: formData.dataDiex ? formatDateToISO(formData.dataDiex) : null,
    observacao: formData.observacao || '',
    situacao: statusInicial,
    om: formData.selectedOM,
    ano: anoMapa
  };

  const { error } = await supabase.from('map_data').insert(payload);

  if (error) {
    console.error("Erro ao inserir mapa no Supabase:", error);
    console.log("Payload tentado:", payload);
  }

  return !error;
>>>>>>> b06c47e (feat: Adicionados SLA Chips ajustados, caixa alta e logicas de Dias Corridos globais no Dashboard)
};

export const updateMap = async (sheetName: string, keyColumn: string, keyValue: string, updates: Record<string, string>, rowIndex?: number): Promise<boolean> => {
  const payload = {
    action: 'update',
    sheetName: sheetName,
    sheet: sheetName,
    ...updates,
    filterColumn: keyColumn,
    filterValue: keyValue,
    rowIndex: rowIndex ?? null,
    row: rowIndex ?? null
  };
<<<<<<< HEAD
  return sendRequest(payload);
=======

  const dateColumns = [
    'ult_dia_evento', 'data_diex_remessa', 'data_diex_saida',
    'data_diex_de_ao_cml', 'data_diex_devol', 'data_doc_autz_pg'
  ];

  const dbUpdates: Record<string, any> = {};
  Object.keys(updates).forEach(key => {
    const dbKey = columnMap[key.trim()];
    if (dbKey) {
      const value = updates[key];
      if (dateColumns.includes(dbKey)) {
        dbUpdates[dbKey] = value ? formatDateToISO(value) : null;
      } else {
        dbUpdates[dbKey] = value;
      }
    }
  });

  const { error } = await supabase
    .from('map_data')
    .update(dbUpdates)
    .eq('id', keyValue);

  return !error;
>>>>>>> b06c47e (feat: Adicionados SLA Chips ajustados, caixa alta e logicas de Dias Corridos globais no Dashboard)
};

export const deleteMap = async (rowIndex: number, mapId: string): Promise<boolean> => {
  const payload = {
    action: 'delete',
    sheetName: 'Controle de Mapas',
    sheet: 'Controle de Mapas',
    rowIndex: rowIndex,
    filterValue: mapId
  };
  return sendRequest(payload);
};

export const changePassword = async (userIdentifier: string, newPassword: string, isOm: boolean): Promise<boolean> => {
  const payload = {
    action: 'changePassword',
    sheetName: 'Usuarios',
    sheet: 'Usuarios',
    user: userIdentifier,
    newPassword: newPassword,
    type: isOm ? 'OM' : 'ADMIN'
  };
  return sendRequest(payload);
};

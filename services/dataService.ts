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
    console.log("Enviando payload:", payload);
    
    // IMPORTANTE: Para que isso funcione sem 'no-cors', o Google Apps Script deve
    // retornar ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain evita preflight OPTIONS no GAS
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const result = await response.json();
    console.log("Resposta do servidor:", result);

    if (result.status === 'success') {
      return true;
    } else {
      console.error("Erro retornado pelo script:", result.message);
      return false;
    }
  } catch (e) {
    console.error("Falha na requisição:", e);
    // Fallback: Se o JSON falhar mas a requisição foi feita (ex: erro de parse), 
    // assumimos erro para segurança, a menos que saibamos que o script não retorna JSON.
    return false;
  }
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

export const fetchUsers = async (): Promise<{users: UserCredential[], adminEmail: string, adminPassword?: string}> => {
  const rows = await fetchCSV(GID_USUARIOS);
  if (rows.length < 2) return { users: [], adminEmail: '' };
  
  // Linha 1 (índice 1) contém configurações do Admin nas colunas G e H
  // Coluna G = índice 6, Coluna H = índice 7
  const adminEmail = rows[1]?.[6] || '';
  const adminPassword = rows[1]?.[7] || '';
  
  // Começa a pegar usuários da linha 2 em diante (índice 2)
  const usersStartIndex = rows.length > 2 ? 2 : 1; 
  
  const users = rows.slice(usersStartIndex).map(r => ({
    om: r[0] || '',
    senha: r[1] || '',
    email: r[2] || '',
    telefone: r[3] || ''
  })).filter(u => u.om && u.senha);
  
  return { users, adminEmail, adminPassword };
};

export const fetchAuxiliar = async (): Promise<AuxiliarData> => {
  const rows = await fetchCSV(GID_AUXILIAR);
  if (rows.length < 2) return { oms: [], mapas: [], eventos: [], destinos: [], motivos: [], adminEmail: '' };
  const oms = rows.slice(2, 15).map(r => r[14]).filter(Boolean);
  const mapas = rows.slice(1).map(r => r[8]).filter(Boolean);
  const eventos = rows.slice(2).map(r => r[1]).filter(Boolean);
  const motivos = rows.slice(2, 15).map(r => r[10]).filter(Boolean);
  const destinos = rows.slice(2, 10).map(r => r[12]).filter(Boolean);

  return {
    oms,
    mapas,
    eventos,
    destinos,
    motivos,
    adminEmail: '', 
    adminPassword: ''
  };
};

export const submitNewMap = async (data: any): Promise<boolean> => {
  const payload = { 
    ...data, 
    action: 'create', 
    sheetName: 'Controle de Mapas', 
    sheet: 'Controle de Mapas' 
  };
  return sendRequest(payload);
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
  return sendRequest(payload);
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

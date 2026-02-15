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

export const fetchMapData = async (): Promise<MapData[]> => {
  const rows = await fetchCSV(GID_CONTROLE_MAPAS);
  
  if (rows.length < 5) return [];

  // Tenta localizar "Mapa" na coluna C (index 2), começando da linha 4 (index 3)
  let headerRowIndex = 3; 
  
  // Confirmação de segurança para achar a linha de cabeçalho
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
  
  // Normaliza cabeçalhos para busca interna, mas mantém rawHeaders para envio ao script
  const cleanHeaders = rawHeaders.map(h => h ? h.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim() : '');
  
  const getColIndex = (namePart: string) => cleanHeaders.findIndex(h => h.toLowerCase().includes(namePart.toLowerCase()));

  // Mapeamento baseado nos nomes exatos ou parciais únicos fornecidos
  const idxMapa = getColIndex('mapa'); // C
  const idxEvento = getColIndex('evento'); // D
  const idxUltDia = getColIndex('ult dia'); // E
  const idxValor = getColIndex('valor'); // F
  
  // Doc que autoriza o Evento
  const idxDoc = cleanHeaders.findIndex(h => h.toLowerCase().includes('doc') && h.toLowerCase().includes('autoriza') && h.toLowerCase().includes('evento'));
  
  const idxNrDiex = getColIndex('nr diex remessa'); 
  const idxDataDiex = getColIndex('data diex remessa');
  const idxObs = getColIndex('observ');
  
  // Ajuste explícito conforme informado: Situação na coluna AB (Index 27)
  // O código tenta achar pelo nome 'Situação', se não achar, força 27
  let idxSituacao = cleanHeaders.findIndex(h => h.toLowerCase() === 'situação' || h.toLowerCase() === 'situacao');
  if (idxSituacao === -1 && rawHeaders.length > 27) idxSituacao = 27;

  // Ajuste explícito conforme informado: OM na coluna AC (Index 28)
  let idxOM = cleanHeaders.findIndex(h => h === 'OM');
  if (idxOM === -1 && rawHeaders.length > 28) idxOM = 28;

  const mapColumnTitle = rawHeaders[idxMapa] || 'Mapa';

  return rows.slice(headerRowIndex + 1).map((row, index) => {
    // Se não tiver ID do mapa, ignora a linha
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
  
  const adminEmail = rows[1]?.[6] || '';
  const adminPassword = rows[1]?.[7] || '';
  
  const users = rows.slice(1).map(r => ({
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
    adminPassword: '', 
    oms,
    mapas,
    eventos,
    destinos,
    motivos,
    adminEmail: '' 
  };
};

export const submitNewMap = async (data: any): Promise<boolean> => {
  try {
    const payload = { ...data, action: 'create', sheetName: 'Controle de Mapas', sheet: 'Controle de Mapas' };
    console.log("Enviando Novo Mapa:", payload);
    
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return true; 
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const updateMap = async (sheetName: string, keyColumn: string, keyValue: string, updates: Record<string, string>, rowIndex?: number): Promise<boolean> => {
  try {
    const payload = {
      action: 'update',
      sheetName: sheetName,
      sheet: sheetName, // Alias extra caso o script use 'sheet'
      // Passa os dados achatados
      ...updates,
      // Metadata para busca
      filterColumn: keyColumn,
      filterValue: keyValue,
      // Importante: Passamos rowIndex como string e number para garantir que o script pegue
      rowIndex: rowIndex ? Number(rowIndex) : 0, 
      row: rowIndex ? Number(rowIndex) : 0 
    };
    
    console.log("Enviando Atualização:", payload);

    // O mode: 'no-cors' impede que vejamos a resposta, mas permite o envio para o Google Script
    // Content-Type text/plain evita Preflight CORS que causa erros no Google Script
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
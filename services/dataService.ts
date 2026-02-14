import { 
  MapData, SHEET_ID, GID_DADOS_APP, GID_AUXILIAR, GID_USUARIOS,
  COL_INDEX_MAPA, COL_INDEX_SITUACAO, COL_INDEX_OM,
  UserCredential, AuxiliarData, SCRIPT_URL 
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
  const rows = await fetchCSV(GID_DADOS_APP);
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => ({
    id: row[COL_INDEX_MAPA] || '',
    evento: row[1] || '',
    ultDiaEvento: row[2] || '',
    valor: row[3] || '',
    docAutoriza: row[4] || '',
    nrDiex: row[5] || '',
    dataDiex: row[6] || '',
    observacao: row[7] || '',
    situacao: row[COL_INDEX_SITUACAO] || '',
    om: row[COL_INDEX_OM] || '',
    rawData: row,
    rawHeaders: headers
  })).filter(item => item.id);
};

export const fetchUsers = async (): Promise<{users: UserCredential[], adminEmail: string, adminPassword?: string}> => {
  const rows = await fetchCSV(GID_USUARIOS);
  if (rows.length < 2) return { users: [], adminEmail: '' };
  
  // Admin Email em G2 (Fila 1, Col G = Index 6)
  const adminEmail = rows[1]?.[6] || '';
  
  // Admin Senha em H2 (Fila 1, Col H = Index 7)
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
  if (rows.length < 2) return { oms: [], mapas: [], eventos: [], adminEmail: '' };

  return {
    // Não busca mais senha daqui, pois foi movida para fetchUsers (Aba Usuarios)
    adminPassword: '', 
    // OM: O3:O15 -> Fila 2 em diante (Index 2), Col O (Index 14)
    oms: rows.slice(2, 15).map(r => r[14]).filter(Boolean),
    // Mapa: I2:I -> Fila 1 em diante (Index 1), Col I (Index 8)
    mapas: rows.slice(1).map(r => r[8]).filter(Boolean),
    // Evento: B3:B -> Fila 2 em diante (Index 2), Col B (Index 1)
    eventos: rows.slice(2).map(r => r[1]).filter(Boolean),
    adminEmail: '' 
  };
};

export const submitNewMap = async (data: any): Promise<boolean> => {
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return true; 
  } catch (e) {
    console.error(e);
    return false;
  }
};
export interface MapData {
  id: string; // Mapa
  evento: string; 
  ultDiaEvento: string;
  valor: string; 
  docAutoriza: string; 
  nrDiex: string; 
  dataDiex: string; 
  observacao: string;
  situacao: string; 
  om: string; 
  rawData: string[]; 
  rawHeaders: string[]; // Cabeçalhos originais (com \n) para o backend
  cleanHeaders: string[]; // Cabeçalhos limpos para o frontend encontrar os campos
  rowIndex: number; // Para identificar a linha na edição
  mapColumnTitle: string; // O nome exato do cabeçalho da coluna Mapa
}

export interface UserCredential {
  om: string;
  senha: string;
  email: string;
  telefone: string;
}

export interface AuxiliarData {
  oms: string[];
  mapas: string[];
  eventos: string[];
  destinos: string[];
  motivos: string[];
  adminEmail: string;
  adminPassword?: string;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  OM = 'OM'
}

export interface User {
  name: string;
  role: UserRole;
  om?: string;
  email?: string;
}

export const SHEET_ID = '1Qr5ywS7F7bHfY0Pp6hb0MoNnZlh64jxezDwI1Z9S4vY';

// SUBSTITUA PELO GID DA ABA 'Controle de Mapas'
export const GID_CONTROLE_MAPAS = '193511285'; 
export const GID_AUXILIAR = '534658444'; 
export const GID_USUARIOS = '474187194'; 

export const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzh3nXwLS4kcEkiTIqTENQx40fuIQqgwQW3aT_J1aSVmd7rjCVfriFVICk-5xRWq-bLGQ/exec';

// Índices absolutos baseados na planilha (A=0, B=1, C=2...)
// Baseado na lista fornecida:
// H (7) -> Qnt Dias Evento -> Remsessa Bda (Não, C=2, D=3, E=4, F=5, G=6, H=7? Vamos contar do zero absoluto)
// 0:A, 1:B, 2:C(Mapa)...
// Campos Calculados:
// 9: J (Qnt Dias Evento -> Remsessa Bda)
// 13: N (Qnt Dias Recb -> Remsessa DE)
// 16: Q (Qnt Dias Remsessa DE -> CML)
// 23: X (Qnt Dias Recb OM -> Autz Pg)
// 24: Y (Qnt Dias Enc Bda -> DE -> Autz Pg)
// 25: Z (Qnt Dias Enc DE -> CML -> Autz Pg)
// 27: AB (Situação)
// 29: AD (Ano)
export const FORMULA_COLUMNS_INDICES = [
  9,  // J - Qnt Dias Evento -> Remsessa Bda
  13, // N - Qnt Dias Recb -> Remsessa DE
  16, // Q - Qnt Dias Remsessa DE -> CML
  23, // X - Qnt Dias Recb OM -> Autz Pg
  24, // Y - Qnt Dias Enc Bda -> DE -> Autz Pg
  25, // Z - Qnt Dias Enc DE -> CML -> Autz Pg
  27, // AB - Situação
  29  // AD - Ano
];

export const DATA_START_COL_INDEX = 2; // C
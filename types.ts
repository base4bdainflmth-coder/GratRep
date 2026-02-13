export interface MapData {
  id: string; // Col A - Mapa
  evento: string; // Col B
  ultDiaEvento: string; // Col C
  valor: string; // Col D
  docAutoriza: string; // Col E
  nrDiex: string; // Col F
  dataDiex: string; // Col G
  observacao: string; // Col H
  situacao: string; // Col Z (Index 25)
  om: string; // Col AA (Index 26)
  rawData: string[]; 
  rawHeaders: string[]; 
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
  adminEmail: string;
  adminPassword?: string; // Capturado de Auxiliar H2
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

// IMPORTANTE: Verifique os números exatos de GID na URL da sua planilha para cada aba!
export const GID_DADOS_APP = '42960322';
export const GID_AUXILIAR = '534658444'; 
export const GID_USUARIOS = '474187194'; 

export const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzh3nXwLS4kcEkiTIqTENQx40fuIQqgwQW3aT_J1aSVmd7rjCVfriFVICk-5xRWq-bLGQ/exec';

export const COL_INDEX_MAPA = 0; // A
export const COL_INDEX_SITUACAO = 25; // Z
export const COL_INDEX_OM = 26; // AA

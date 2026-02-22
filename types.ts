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
  rawHeaders: string[]; // Cabeçalhos originais
  cleanHeaders: string[]; // Cabeçalhos limpos
  rowIndex: number; // Para compatibilidade
  mapColumnTitle: string; // Para compatibilidade
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
  exercicioCorrente: string;
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

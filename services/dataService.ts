import { supabase } from './supabaseClient';
import {
  MapData, UserCredential, AuxiliarData
} from '../types';

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
    row.id, row.evento || '', row.ult_dia_evento || '', row.valor || '', row.doc_autoriza_evento || '',
    row.nr_diex_remessa || '', row.data_diex_remessa || '', row.nr_diex_saida || '', row.data_diex_saida || '',
    row.destino_diex_saida || '', row.diex_de_ao_cml || '', row.data_diex_de_ao_cml || '',
    row.nr_diex_devol || '', row.data_diex_devol || '', row.destino_diex_devolucao || '', row.motivo_devolucao || '',
    row.doc_autz_pagamento || '', row.data_doc_autz_pg || '', row.observacao || '', row.situacao || '', row.om || '', row.ano || ''
  ];

  return {
    id: row.id,
    evento: row.evento || '',
    ultDiaEvento: row.ult_dia_evento || '',
    valor: row.valor || '',
    docAutoriza: row.doc_autoriza_evento || '',
    nrDiex: row.nr_diex_remessa || '',
    dataDiex: row.data_diex_remessa || '',
    observacao: row.observacao || '',
    situacao: row.situacao || '',
    om: row.om || '',
    rawData: rawData,
    rawHeaders: VIRTUAL_HEADERS,
    cleanHeaders: VIRTUAL_HEADERS,
    rowIndex: 0, // No Supabase usamos o ID para update/delete
    mapColumnTitle: 'Mapa'
  };
};

export const fetchMapData = async (): Promise<MapData[]> => {
  const { data, error } = await supabase
    .from('map_data')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDatabaseToFrontend);
};

export const fetchUsers = async (): Promise<{ users: UserCredential[], adminEmail: string, adminPassword?: string }> => {
  const { data, error } = await supabase
    .from('app_users')
    .select('*');

  if (error) throw error;

  const admin = (data || []).find(u => u.role === 'ADMIN');
  const oms = (data || []).filter(u => u.role === 'OM').map(u => ({
    om: u.om,
    senha: u.password,
    email: u.email || '',
    telefone: u.phone || ''
  }));

  return {
    users: oms,
    adminEmail: admin?.email || '',
    adminPassword: admin?.password || ''
  };
};

export const fetchAuxiliar = async (): Promise<AuxiliarData> => {
  const { data, error } = await supabase
    .from('system_configs')
    .select('data')
    .eq('id', 'auxiliar')
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  const config = data?.data || { eventos: [], motivos: [], destinos: [], exercicio: '' };

  // OMs e Mapas agora podem ser derivados se necessário, ou mantidos vazios se o frontend souber lidar
  // No código original, mapas vinha da aba Auxiliar (index 8).
  // OMs vinha da aba Usuários mas estava sendo pego na Auxiliar também.

  return {
    oms: [], // Pode ser populado se necessário
    mapas: [],
    eventos: config.eventos || [],
    destinos: config.destinos || [],
    motivos: config.motivos || [],
    exercicioCorrente: config.exercicio || '',
    adminEmail: '',
    adminPassword: ''
  };
};

export const updateConfig = async (data: { eventos: string[], motivos: string[], destinos: string[], exercicio: string }): Promise<boolean> => {
  const { error } = await supabase
    .from('system_configs')
    .upsert({ id: 'auxiliar', data }, { onConflict: 'id' });

  return !error;
};

export const updateUsersConfig = async (data: { users: UserCredential[], adminEmail: string, adminPassword: string }): Promise<boolean> => {
  // ATENÇÃO: Esta operação é mais complexa no Supabase pois envolve múltiplos usuários.
  // Para simplificar e manter a lógica atual, vamos deletar e reinserir (ou fazer upserts individuais)

  try {
    // Atualiza Admin
    await supabase
      .from('app_users')
      .upsert({ om: 'ADMIN', password: data.adminPassword, email: data.adminEmail, role: 'ADMIN' }, { onConflict: 'om' });

    // Atualiza OMs (simplificado: remove e adiciona as novas para garantir sincronia)
    // CUIDADO: Em produção isso pode ser perigoso. Melhor seria um merge.
    await supabase.from('app_users').delete().eq('role', 'OM');

    const usersToInsert = data.users.map(u => ({
      om: u.om,
      password: u.senha,
      email: u.email,
      phone: u.telefone,
      role: 'OM'
    }));

    if (usersToInsert.length > 0) {
      await supabase.from('app_users').insert(usersToInsert);
    }

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const submitNewMap = async (formData: any): Promise<boolean> => {
  const mapaBase = formData.mapa.split(' - ')[0].trim();
  const mapaConcatenado = `${mapaBase} - 4 Bda/${formData.selectedOM}`;

  const payload = {
    id: mapaConcatenado,
    evento: formData.evento,
    ult_dia_evento: formData.ultDiaEvento || null,
    valor: formData.valor,
    doc_autoriza_evento: formData.docAutoriza,
    nr_diex_remessa: formData.nrDiex,
    data_diex_remessa: formData.dataDiex || null,
    observacao: formData.observacao,
    situacao: 'Encaminhado para a 4ª Bda Inf L Mth',
    om: formData.selectedOM,
    ano: formData.ultDiaEvento ? formData.ultDiaEvento.split('-')[0] : new Date().getFullYear().toString()
  };

  const { error } = await supabase.from('map_data').insert(payload);
  return !error;
};

export const updateMap = async (sheetName: string, keyColumn: string, keyValue: string, updates: Record<string, string>, rowIndex?: number): Promise<boolean> => {
  // Mapeamento de nomes de colunas do Google Sheets para Supabase
  const columnMap: Record<string, string> = {
    'Evento': 'evento',
    'Ult Dia Evento': 'ult_dia_evento',
    'Valor': 'valor',
    'Doc que autoriza o Evento': 'doc_autoriza_evento',
    'Nr DIEx Remessa 4 Bda': 'nr_diex_remessa',
    'Data DIEx Remessa 4 Bda': 'data_diex_remessa',
    'Nr DIEx Saída': 'nr_diex_saida',
    'Data DIEx Saída': 'data_diex_saida',
    'Destino DIEx Saída': 'destino_diex_saida',
    'DIEx da 1ª DE ao CML': 'diex_de_ao_cml',
    'Data DIEx da 1ª DE ao CML': 'data_diex_de_ao_cml',
    'Nr DIEx Devol': 'nr_diex_devol',
    'Data DIEx Devol': 'data_diex_devol',
    'Destino DIEx Devolução': 'destino_diex_devolucao',
    'Motivo': 'motivo_devolucao',
    'Doc Autorização de Pagamento': 'doc_autz_pagamento',
    'Data Doc Autz Pg': 'data_doc_autz_pg',
    'Observação': 'observacao',
    'Situação': 'situacao',
    'OM': 'om',
    'Ano': 'ano'
  };

  const dbUpdates: Record<string, any> = {};
  Object.keys(updates).forEach(key => {
    const dbKey = columnMap[key.trim()];
    if (dbKey) {
      dbUpdates[dbKey] = updates[key];
    }
  });

  const { error } = await supabase
    .from('map_data')
    .update(dbUpdates)
    .eq('id', keyValue);

  return !error;
};

export const deleteMap = async (rowIndex: number, mapId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('map_data')
    .delete()
    .eq('id', mapId);

  return !error;
};

export const changePassword = async (userIdentifier: string, newPassword: string, isOm: boolean): Promise<boolean> => {
  const { error } = await supabase
    .from('app_users')
    .update({ password: newPassword })
    .eq('om', userIdentifier);

  return !error;
};

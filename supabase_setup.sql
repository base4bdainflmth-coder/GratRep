-- TABELA DE DADOS DOS PROCESSOS (MAPA)
CREATE TABLE IF NOT EXISTS map_data (
  id TEXT PRIMARY KEY, -- Ex: 2024/001 - 4 Bda/OM
  evento TEXT,
  ult_dia_evento DATE,
  valor TEXT,
  doc_autoriza_evento TEXT,
  nr_diex_remessa TEXT,
  data_diex_remessa DATE,
  nr_diex_saida TEXT,
  data_diex_saida DATE,
  destino_diex_saida TEXT,
  diex_de_ao_cml TEXT,
  data_diex_de_ao_cml DATE,
  nr_diex_devol TEXT,
  data_diex_devol DATE,
  destino_diex_devolucao TEXT,
  motivo_devolucao TEXT,
  doc_autz_pagamento TEXT,
  data_doc_autz_pg DATE,
  observacao TEXT,
  situacao TEXT,
  om TEXT,
  ano TEXT,
  raw_data JSONB, -- Backup dos dados originais se necessário
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA DE USUÁRIOS (LOGICA ATUAL)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  om TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'OM',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA DE CONFIGURAÇÕES (AUXILIAR)
CREATE TABLE IF NOT EXISTS system_configs (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INSERIR USUÁRIO ADMIN PADRÃO
INSERT INTO app_users (om, password, role) 
VALUES ('ADMIN', 'admin', 'ADMIN')
ON CONFLICT (om) DO NOTHING;

-- INSERIR CONFIGURAÇÕES INICIAIS
INSERT INTO system_configs (id, data) 
VALUES ('auxiliar', '{"eventos": [], "motivos": [], "destinos": [], "exercicio": "2024"}')
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS (Opcional, mas recomendado. Por enquanto liberado para anon)
ALTER TABLE map_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated/anon" ON map_data FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated/anon" ON app_users FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated/anon" ON system_configs FOR ALL USING (true);

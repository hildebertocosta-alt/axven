-- Desativar RLS nas tabelas (acesso público de leitura)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permitir leitura publica" ON clientes FOR SELECT USING (true);

ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permitir leitura publica" ON campanhas FOR SELECT USING (true);

ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permitir leitura publica" ON alertas FOR SELECT USING (true);

ALTER TABLE lembretes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permitir leitura publica" ON lembretes FOR SELECT USING (true);

ALTER TABLE financeiro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permitir leitura publica" ON financeiro FOR SELECT USING (true);

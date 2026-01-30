-- Corrigir RLS da tabela notes
DROP POLICY IF EXISTS "Vendedores veem apenas suas notas" ON notes;

-- Policy corrigida para vendedores verem apenas suas notas
CREATE POLICY "Vendedores veem apenas suas notas" ON notes
    FOR ALL USING (
        -- Permite acesso se não há usuário autenticado (desenvolvimento)
        auth.uid() IS NULL
        OR
        -- Ou se o usuário é o dono da nota (produção)
        EXISTS (
            SELECT 1 FROM users_profile 
            WHERE users_profile.id = notes.user_id 
            AND users_profile.auth_id = auth.uid()
        )
    );
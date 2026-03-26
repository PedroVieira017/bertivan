

# Criar Utilizador Admin

## O que será feito
Criar uma edge function temporária que usa a API de administração para registar o primeiro utilizador admin com as credenciais fornecidas.

## Passos

1. **Criar edge function `create-admin`** que:
   - Usa o service role key para criar o utilizador via `supabase.auth.admin.createUser()`
   - Email: `admin@bertivan.pt`, password: `Admin123!`
   - Insere o role `admin` na tabela `user_roles`
   - O trigger `handle_new_user` cria automaticamente o perfil

2. **Executar a função** para criar o utilizador

3. **Remover a edge function** após uso (é temporária)

## Resultado
Poderá fazer login com `admin@bertivan.pt` / `Admin123!` e terá acesso completo de administrador.


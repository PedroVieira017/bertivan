# Testes Rápidos

Este projeto inclui um seed de exemplo para testar os fluxos da Bertivan:

- patrão
- administrador
- trabalhador
- obras com geolocalização
- horários planeados

## Modelo recomendado para a empresa

- a empresa cria as contas dos colaboradores
- o trabalhador não faz auto-registo
- o trabalhador entra uma vez no telemóvel
- depois usa o PIN para marcar entrada e saída
- o administrador gere trabalhadores, obras e horários
- o patrão consulta dashboard e relatórios

## 1. Criar utilizadores no Supabase Auth

Cria estes três utilizadores no painel do Supabase em `Authentication > Users`:

- `berto@bertivan.pt` / `123456`
- `raquel@bertivan.pt` / `123456`
- `miguel@bertivan.pt` / `123456`

Importante:

- o login só funciona se estas passwords forem mesmo criadas no `Authentication > Users`
- o ficheiro SQL de seed não cria passwords no Supabase Auth, apenas associa perfis, PINs, obras e horários

## 2. Executar o seed

Depois de criares os utilizadores, abre o SQL Editor do Supabase e executa:

- [supabase/demo_seed.sql](/c:/Users/Master/Desktop/bertivan-check-in-main/bertivan-check-in-main/supabase/demo_seed.sql)

Esse script:

- atribui os papéis `boss`, `admin` e `worker`
- atualiza nomes e PINs
- cria três obras de exemplo
- cria horários de exemplo

## 3. Credenciais para teste

### Patrão

- email: `berto@bertivan.pt`
- password: `123456`
- PIN: `1111`

### Administrador

- email: `raquel@bertivan.pt`
- password: `123456`
- PIN: `2222`

### Trabalhador

- email: `miguel@bertivan.pt`
- password: `123456`
- PIN: `3333`

## 4. Cenários para validar

### Trabalhador

- entrar com `miguel@bertivan.pt`
- abrir `Marcar Ponto`
- escolher a obra
- marcar entrada com PIN `3333`
- marcar saída no fim

### Administrador

- entrar com `raquel@bertivan.pt`
- abrir `Trabalhadores`
- abrir `Obras`
- abrir `Horários`
- validar presenças e horários planeados

### Patrão

- entrar com `berto@bertivan.pt`
- abrir `Dashboard`
- abrir `Horários`
- validar consulta da equipa sem acesso à gestão de trabalhadores/obras

## 5. Arranque local

```powershell
npm run dev
```

ou para testar a build:

```powershell
npm run preview
```

## 6. Como partilhar com a empresa

- publicar a app por URL privada
- abrir no Chrome ou Edge no telemóvel
- usar `Adicionar ao ecrã principal`
- manter a sessão iniciada no equipamento do colaborador
- usar o PIN no dia a dia para a marcação

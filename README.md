# Bertivan Check-In

Aplicação de controlo de presenças com geolocalização para a Bertivan.

## Arranque

```powershell
npm install
npm run dev
```

## Build

```powershell
npm run build
```

## Testes com dados de exemplo

Segue o guia em [TESTING.md](/c:/Users/Master/Desktop/bertivan-check-in-main/bertivan-check-in-main/TESTING.md).

Resumo rápido de login de teste:

- `berto@bertivan.pt` / `123456`
- `raquel@bertivan.pt` / `123456`
- `miguel@bertivan.pt` / `123456`

## Fluxo recomendado

- contas criadas pela empresa
- trabalhador entra uma vez no telemóvel
- sessão mantida no equipamento
- marcação diária feita com PIN e localização

## Criação de contas por backend

Para evitar `rate limit` e confirmação de email no `signUp` público, o projeto inclui a edge function:

- `supabase/functions/create-worker/index.ts`

Deploy:

```powershell
supabase functions deploy create-worker
```

Depois disso, a página `Trabalhadores` passa a criar contas via backend usando `auth.admin.createUser`.

# FinChat

O FinChat é um aplicativo financeiro mobile-first e PWA que simplifica o registro de gastos e ganhos através de uma interface de chat.

## Stack Tecnológica
- Next.js 15 (App Router)
- React 19
- TailwindCSS 4
- TypeScript
- Supabase (Auth + Banco de Dados)
- PWA (Progressive Web App)

## Como Executar

1. Instale as dependências:
```bash
npm install
```

2. Configure o Supabase:
As variáveis de ambiente `.env.local` já estão configuradas.
No entanto, você precisará criar a tabela no banco de dados. Para isso, execute o script `schema.sql` no SQL Editor do seu projeto Supabase para criar as tabelas e políticas de segurança necessárias.

3. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

4. Acesse no navegador (use a visão de dispositivo móvel no Chrome DevTools para melhor experiência):
`http://localhost:3000`

## Como usar o Chat
O chat interpreta as seguintes mensagens usando Expressões Regulares (Regex):
- `gasto 50 mercado` -> Cria uma despesa de R$ 50,00 na categoria Mercado
- `receita 3000 salário` -> Cria uma receita de R$ 3000,00 na categoria Salário
- `despesa 120.50 internet` -> Cria despesa de 120.50 na categoria Internet

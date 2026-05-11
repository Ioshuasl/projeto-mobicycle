# MOBICYCLE - Documentação para Desenvolvedores

## Visão Geral
O **MOBICYCLE** é um ecossistema descentralizado de serviços e mobilidade, focado em economia colaborativa e cashback. O projeto utiliza uma arquitetura full-stack com React (Vite) no frontend e Express no backend, com SQLite como banco de dados.

## Tecnologias Utilizadas
- **Frontend:** React 18, TypeScript, Tailwind CSS, Motion (framer-motion), Lucide React.
- **Backend:** Node.js, Express, Better-SQLite3.
- **IA:** Google Gemini API (para geração de logotipos e assistência).
- **Estilização:** Tailwind CSS com variáveis de tema neon.

## Guia de Configuração do Ambiente

### Pré-requisitos
- Node.js (v18 ou superior)
- npm ou yarn

### Instalação
1. Clone o repositório.
2. Instale as dependências:
   ```bash
   npm install
   ```

### Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com as seguintes chaves:
```env
GEMINI_API_KEY=sua_chave_aqui
NODE_ENV=development
```

## Instruções de Build
Para gerar a versão de produção do frontend:
```bash
npm run build
```
Os arquivos serão gerados na pasta `dist/`.

## Como Rodar o Servidor

### Modo Desenvolvimento
O servidor e o frontend rodam juntos usando `tsx` para o backend e o middleware do Vite para o frontend:
```bash
npm run dev
```
O servidor estará disponível em `http://localhost:3000`.

### Modo Produção
1. Primeiro, faça o build: `npm run build`.
2. Inicie o servidor:
   ```bash
   npm start
   ```

## Estrutura de Pastas
- `src/components/`: Componentes React da interface.
- `src/server/`: Lógica de negócio do backend (DB, Managers).
- `server.ts`: Ponto de entrada do servidor Express.
- `public/`: Ativos estáticos (logo, ícones).
- `scripts/`: Scripts utilitários.

## API de Pagamentos
A integração de pagamentos está localizada em `src/services/paymentService.ts`. Atualmente, suporta simulação de Cartão de Crédito e PIX QR Code para ativação de licenças.

## Sistema de Cashback e Bônus
A lógica financeira está centralizada em `src/server/financialManager.ts`, gerenciando distribuições unilevel, bônus infinitos e cashbacks de serviços (Mecânica, Energy, Snack, etc).

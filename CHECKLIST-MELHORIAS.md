# Checklist de Melhorias - SocialTeam Kanban

## Como usar este documento
- [ ] = Não implementado / Não prioritário
- [x] = Implementado / Descartado
- [P] = Alta Prioridade
- [M] = Média Prioridade
- [B] = Baixa Prioridade

---

## 1. Backend / Supabase

### 1.1 Types do Banco de Dados
- [ ] **(P)** Gerar tipos automaticamente do Supabase (`supabase gen types typescript`) para usar no lugar de tipos manuais inline em `boardApi.ts`
- [ ] **(P)** Criar arquivo `src/types/database/index.ts` com tipos gerados

### 1.2 Migrations
- [ ] **(P)** Criar pasta `supabase/migrations/` para versionar alterações de schema
- [ ] **(M)** Documentar migrações já aplicadas (constantes no PROJECT.md)

### 1.3 Segurança (RLS)
- [ ] **(M)** Verificar se Row Level Security está configurado nas tabelas
- [ ] **(M)** Auditar policies de acesso para `boards`, `cards`, `lists`

### 1.4 Performance do Banco
- [ ] **(M)** Avaliar necessidade de índices compostos para queries frequentes
- [ ] **(M)** Analisar queries com `EXPLAIN ANALYZE` nas funções mais lentas

### 1.5 Funções SQL / Edge Functions
- [ ] **(M)** Avaliar se parte da lógica de negócio pode migrar para Edge Functions
- [ ] **(B)** Considerar triggers para cálculos automatizados (ex: posição de cards)

---

## 2. Frontend - Qualidade de Código

### 2.1 Testes
- [ ] **(P)** Adicionar testes unitários com **Vitest** para services críticos
  - `boardApi.ts`
  - `authService.ts`
  - `loginRateLimitService.ts`
- [ ] **(P)** Adicionar testes de componentes com **Vitest + Testing Library**
- [ ] **(P)** Adicionar testes E2E com **Playwright**
  - Login com Google OAuth
  - CRUD de boards, listas e cards
  - Drag and drop
  - Busca FTS

### 2.2 Lazy Loading / Code Splitting
- [ ] **(M)** Implementar `React.lazy()` para componentes pesados
  - `CardModal`
  - `ShareBoardModal`
  - `ArchivedBoard`
- [ ] **(M)** Analisar bundle com `rollup-plugin-visualizer`

### 2.3 Estado Global
- [ ] **(M)** Avaliar necessidade de state manager dedicado (Zustand/Redux)
  - Necessário se estado de UI global crescer
- [ ] **(B)** Considerar Context API para estado compartilhado leve

### 2.4 Storybook
- [ ] **(M)** Criar Storybook para componentes principais
- [ ] **(B)** Adicionar stories para estados (loading, error, empty)

---

## 3. Frontend - Performance

### 3.1 Virtualização
- [x] **(M)** Avaliar uso de `react-window` ou `react-virtualized` para boards com muitas listas/cards
- [x] **(M)** Implementar virtualização com `@tanstack/react-virtual` para cards dentro das colunas
- [ ] **(B)** Implementar infinite scroll onde aplicável

### 3.2 Memoização
- [ ] **(M)** Auditar componentes que se beneficiam de `useMemo`/`useCallback`
- [ ] **(B)** Adicionar `React.memo` em componentes puros

### 3.3 Imagens e Assets
- [ ] **(B)** Adicionar plugin Vite para compressão de imagens
- [ ] **(B)** Implementar lazy loading de imagens com `loading="lazy"`

---

## 4. UX / UI

### 4.1 Acessibilidade
- [ ] **(M)** Testar navegação completa por teclado
- [ ] **(M)** Adicionar skip links para navegação
- [ ] **(M)** Melhorar contraste em elementos com `aria-live`
- [ ] **(M)** Testar com screen reader (NVDA/VoiceOver)

### 4.2 Drag and Drop
- [ ] **(M)** Testar drag and drop em dispositivos touch
- [ ] **(M)** Adicionar indicadores visuais durante arrastar
- [ ] **(B)** Suporte a teclado para reordenação

### 4.3 Estados de Interface
- [x] **(B)** Skeleton loaders para carregamento de boards (estilo Trello com shimmer)
- [ ] **(B)** Empty states mais descritivos e com ilustrações
- [ ] **(B)** Adicionar tooltips de ajuda/atalhos

### 4.4 Responsividade
- [ ] **(M)** Testar em tablets e mobile
- [ ] **(M)** Avaliar drawer mobile da sidebar

---

## 5. DevOps / CI-CD

### 5.1 Pipeline de Deploy
- [ ] **(P)** Configurar **GitHub Actions** para CI/CD
- [ ] **(P)** Adicionar jobs: lint, typecheck, tests, build
- [ ] **(M)** Deploy automático para ambiente de staging
- [ ] **(M)** Deploy manual para produção com approval

### 5.2 Git Hooks
- [ ] **(M)** Configurar **Husky** para pre-commit
- [ ] **(M)** Adicionar **lint-staged** para validação pré-commit
- [ ] **(M)** Rodar lint + tests no pre-push

### 5.3 Commits
- [ ] **(M)** Configurar **Commitlint** com Conventional Commits
- [ ] **(B)** Hook de commit semântico

---

## 6. Segurança

### 6.1 Dependências
- [ ] **(P)** Configurar **Dependabot** ou **Snyk** para atualizar dependências
- [ ] **(M)** Auditar dependências com `npm audit`
- [ ] **(M)** Remover dependências não utilizadas

### 6.2 Segredos
- [ ] **(P)** Verificar se todas as variáveis de ambiente estão no `.env.example`
- [ ] **(M)** Implementar rotação de chaves do Supabase

---

## 7. Documentação

### 7.1 Documentação de Código
- [ ] **(M)** Adicionar JSDoc em funções exported
- [ ] **(M)** Documentar RPCs e suas parametrizções
- [ ] **(B)** Gerar API docs com TypeDoc

### 7.2 Documentação de Projeto
- [ ] **(M)** Manter PROJECT.md atualizado
- [ ] **(B)** Criar CONTRIBUTING.md

---

## 8. Observabilidade

### 8.1 Logging e Monitoring
- [ ] **(M)** Implementar logging estruturado (Sentry/Datadog)
- [ ] **(M)** Rastrear erros em produção
- [ ] **(B)** Métricas de performance (Core Web Vitals)

### 8.2 Analytics
- [ ] **(B)** Implementar analytics para usage patterns
- [ ] **(B)** Track eventos de uso principais

---

## Priorização Sugerida

### Fase 1 - Crítico (Semana 1)
- [ ] Configurar Dependabot
- [ ] Adicionar Husky + lint-staged
- [ ] Começar a escrever testes unitários para services

### Fase 2 - Importante (Semanas 2-3)
- [ ] Configurar CI/CD (GitHub Actions)
- [ ] Gerar tipos do Supabase
- [ ] Adicionar testes E2E com Playwright

### Fase 3 - Enhancement (Semanas 4-6)
- [x] Lazy loading de componentes (CardModal, ShareBoardModal)
- [ ] Aprimorar acessibilidade
- [ ] Empty states e tooltips

### Fase 4 - Nice to Have (Futuro)
- [ ] Storybook
- [ ] Virtualização
- [ ] Observabilidade (Sentry)
- [ ] PWA support

---

## Decisões Tomadas (a ser preenchido)

| Data | Melhoria | Decisão | Motivo |
|------|----------|---------|--------|
|  |  |  |  |

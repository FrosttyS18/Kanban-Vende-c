# Checklist de Homologação Controlada - Duplicar Card

## Objetivo
- Validar de forma segura a feature de duplicar card antes de qualquer deploy em produção.
- Garantir que o card duplicado seja um novo registro independente, sem conflito de IDs e sem efeito colateral no card original.

---

## Resumo Executivo
- A feature pode ser implementada sem criar novo projeto no Supabase.
- A feature não precisa de nova tabela, migration, RPC, trigger ou alteração de schema.
- A implementação mais segura é reaproveitar o fluxo atual de criação de card.
- O ponto crítico é fazer cópia profunda com novos IDs para tudo que pertence exclusivamente ao card duplicado.

---

## Impacto no Supabase

### Não precisa mudar
- [x] Schema de tabelas
- [x] Migration
- [x] RLS
- [x] RPC
- [x] Edge Function
- [x] Storage

### Tabelas já existentes que serão usadas pela feature
- [x] `cards`
- [x] `card_labels`
- [x] `card_members`
- [x] `card_links`
- [x] `checklists`
- [x] `checklist_items`

### Tabela opcional
- [ ] `card_activities`
- Usar apenas se registrarmos atividade do tipo "cartão duplicado".

### Observação importante
- Labels podem reaproveitar o mesmo `label.id`, porque já são entidades compartilhadas do board.
- Não pode reaproveitar IDs de:
  - card
  - link
  - checklist
  - checklist item

---

## Mapeamento da Implementação Segura

### Menu de contexto
- [ ] Adicionar ação `Duplicar cartão` no menu de contexto do card
- [ ] Posicionar a ação acima de `Arquivar`
- [ ] Fechar o menu imediatamente após o clique

### Estratégia da cópia
- [ ] Criar um novo `card.id`
- [ ] Criar novos `id`s para todos os links
- [ ] Criar novos `id`s para todos os checklists
- [ ] Criar novos `id`s para todos os checklist items
- [ ] Gerar novo `createdAt`
- [ ] Gerar novo `updatedAt`
- [ ] Manter `listId` original
- [ ] Manter `description`
- [ ] Manter `labels`
- [ ] Manter `memberIds`
- [ ] Manter `dueDate`
- [ ] Manter `links` como conteúdo, mas com IDs novos
- [ ] Manter `checklists` como conteúdo, mas com IDs novos
- [ ] Não copiar `activities`
- [ ] Resetar `isCompleted` para `false`

### Título do card duplicado
- [ ] Criar como `Cópia de {título atual}`
- [ ] Garantir que cards original e duplicado fiquem distinguíveis visualmente

### Posição do card duplicado
- [ ] Inserir logo abaixo do card original
- [ ] Sincronizar ordenação após a criação
- [ ] Garantir que não vá para o topo ou para o fim da lista por acidente

### Persistência
- [ ] Reaproveitar o fluxo atual de criação de card
- [ ] Persistir relações com as funções já existentes
- [ ] Não usar `upsert` do card original
- [ ] Garantir que o duplicado nunca compartilhe referência com o original

---

## Regras de Segurança da Feature

### O que não pode acontecer
- [ ] Duplicado com mesmo `id` do card original
- [ ] Duplicado com mesmo `id` de checklist
- [ ] Duplicado com mesmo `id` de checklist item
- [ ] Duplicado com mesmo `id` de link
- [ ] Excluir o duplicado apagar dados do original
- [ ] Editar o duplicado alterar o original
- [ ] Mover o duplicado mover o original
- [ ] Marcar o duplicado como concluído refletir no original

### O que precisa acontecer
- [ ] O duplicado abre normalmente no modal
- [ ] O duplicado pode ser editado normalmente
- [ ] O duplicado pode ser movido normalmente
- [ ] O duplicado pode ser excluído normalmente
- [ ] O original permanece intacto em todos os casos

---

## Cenários de Teste Obrigatórios

### 1. Fluxo base
- [ ] Duplicar card simples apenas com título
- [ ] Confirmar que aparece na mesma lista
- [ ] Confirmar que aparece logo abaixo do original
- [ ] Confirmar que o título vem como `Cópia de ...`

### 2. Independência entre original e duplicado
- [ ] Editar título do duplicado e validar que o original não muda
- [ ] Editar descrição do duplicado e validar que o original não muda
- [ ] Excluir duplicado e validar que o original continua
- [ ] Excluir original e validar que o duplicado continua

### 3. Data e status
- [ ] Duplicar card com data de entrega
- [ ] Confirmar que a data aparece corretamente no duplicado
- [ ] Confirmar que `isCompleted` vem como `false`

### 4. Labels e membros
- [ ] Duplicar card com labels
- [ ] Confirmar que labels aparecem no duplicado
- [ ] Duplicar card com membros
- [ ] Confirmar que membros aparecem no duplicado
- [ ] Remover membro do duplicado e validar que o original não muda

### 5. Links
- [ ] Duplicar card com 1 link
- [ ] Duplicar card com múltiplos links
- [ ] Editar link do duplicado e validar que o original não muda
- [ ] Excluir link do duplicado e validar que o original não muda

### 6. Checklists
- [ ] Duplicar card com checklist vazia
- [ ] Duplicar card com checklist preenchida
- [ ] Duplicar card com múltiplas checklists
- [ ] Duplicar card com itens concluídos e pendentes
- [ ] Marcar item do duplicado como concluído e validar que o original não muda
- [ ] Excluir checklist do duplicado e validar que o original não muda

### 7. Navegação e modal
- [ ] Abrir o duplicado no modal
- [ ] Fechar e reabrir o duplicado
- [ ] Abrir o original após duplicar
- [ ] Validar que não houve troca de conteúdo entre os dois

### 8. Reordenação
- [ ] Arrastar o duplicado dentro da mesma lista
- [ ] Arrastar o duplicado para outra lista
- [ ] Validar que o original mantém posição e dados

### 9. Realtime e múltiplos usuários
- [ ] Duplicar card com outro usuário conectado no mesmo board
- [ ] Validar que o segundo usuário recebe o novo card corretamente
- [ ] Validar que o segundo usuário não vê alteração indevida no original

### 10. Casos limite
- [ ] Duplicar card sem descrição, sem labels, sem membros e sem checklist
- [ ] Duplicar card com conteúdo mais completo possível
- [ ] Duplicar o mesmo card duas vezes seguidas
- [ ] Duplicar um card recém-duplicado

---

## Checklist Técnico Antes de Deploy

### Validação local obrigatória
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Diagnósticos do editor sem erro

### Validação manual obrigatória
- [ ] Testar duplicação em board real com poucos cards
- [ ] Testar duplicação em board com muitos cards
- [ ] Testar como admin
- [ ] Testar como member

### Revisão de risco
- [ ] Confirmar que a feature não toca schema do Supabase
- [ ] Confirmar que a feature só usa funções já existentes de criação/persistência
- [ ] Confirmar que a feature não muda lógica de excluir card
- [ ] Confirmar que a feature não muda lógica de editar card

---

## Estratégia de Rollout Seguro
- [ ] Implementar a feature de forma isolada
- [ ] Validar localmente todos os cenários críticos
- [ ] Fazer deploy em janela controlada
- [ ] Testar imediatamente em produção com 1 card simples
- [ ] Testar 1 card completo após o primeiro teste passar
- [ ] Monitorar comportamento do board após deploy

---

## Critério de Go / No-Go

### Go
- [ ] Todos os cenários críticos passaram
- [ ] Nenhum erro em lint/build
- [ ] Nenhum efeito colateral entre original e duplicado
- [ ] Duplicado abre, edita, move e exclui normalmente

### No-Go
- [ ] Qualquer compartilhamento indevido de dados entre original e duplicado
- [ ] Qualquer conflito de exclusão
- [ ] Qualquer conflito de checklist, item ou link
- [ ] Qualquer persistência errada no board

---

## Decisão Técnica Atual
- A feature pode ser construída sem alteração no Supabase.
- O maior risco está apenas na geração incorreta de IDs dos objetos aninhados.
- A implementação recomendada é segura desde que:
  - use novos IDs para estruturas próprias do card
  - preserve labels por referência
  - não copie activities
  - sincronize a ordenação após criar o novo card

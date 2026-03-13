# SocialTeam Kanban - Planejamento de Implementação

## Objetivo

Definir o fluxo de UI e o backlog por ordem de execução para autenticação, papéis, múltiplos boards e governança de acesso.

## Fluxo UI (MVP)

1. Usuário acessa a aplicação e cai na tela de login com Google.
2. Sistema valida domínio corporativo (`@vende-c.com`).
3. Se domínio inválido, acesso negado com mensagem clara.
4. Se domínio válido, usuário entra na Home de Boards.
5. Sistema identifica papel do usuário no banco:
   - `admin`: pode criar board, gerenciar membros e administrar boards que possui.
   - `member`: pode acessar apenas boards onde foi adicionado.
6. Usuário seleciona um board e entra no Kanban.
7. Dentro do board:
   - `admin`: cria/edita board, adiciona membros, gerencia listas e cards.
   - `member`: cria/move/edita cards e listas conforme permissão do board, sem criar novos boards globais.

## Regras de Acesso

- Apenas email corporativo pode autenticar.
- Usuário só enxerga boards em que participa.
- Criação de novos boards é restrita a admins.
- Adição de membros ocorre na UI do sistema (não manual no Supabase).

## Anexos e Entregáveis

- Não haverá upload local de imagens/arquivos.
- Card terá seção de links (Google Drive, Figma, etc.).
- Cada link terá: título, URL, tipo e data de inserção. (ESSA PARTE AQUI O UI TEM QUE IDENTIFICAR AUTOMATICO, COMO FUNCIONA METADA SABE?)

## Backlog por Ordem (Q1 -> Q6)

## Q1 - Autenticação e Controle de Domínio
- Configurar login com Google via Supabase Auth.
- Bloquear login fora de `@vende-c.com`.
- Criar fluxo de erro e acesso negado.
- Criar sessão persistente segura.
- Manter usuário logado no dispositivo até logout explícito.
- COLOCAR RATE LIMITE DE TENTATIVA DE LOGIN E BLOQUEAR SE TENTAR LOGAR POR MAIS DE 10X E DER ERRO. adicionar tempo de 30 minutos para voltar a tentar

## Q2 - Modelo de Papéis e Permissões
- Criar tabela de perfis com papel (`admin` | `member`).
- Definir política inicial de admins.
- Implementar guardas de permissão no front e no banco.
- Garantir que member não cria board novo.

## Q3 - Múltiplos Boards e Home de Boards
- Criar entidade de boards.
- Criar tela de listagem e criação de boards.
- Implementar associação usuário-board (membros por board).
- Entrar no board por rota dinâmica.

## Q4 - Gestão de Membros no UI
- Criar fluxo para admin adicionar membro por email corporativo.
- Validar domínio no convite/adição.
- Permitir remoção de membro por admin.
- Exibir membros ativos do board.

## Q5 - Links no Lugar de Upload
- Remover fluxo de upload atual.
- Implementar CRUD de links no card.
- Exibir links no card/modal com ações abrir/copiar/remover.
- Validar URL e tratar estados de erro.

## Q6 - Realtime, Auditoria e Hardening
- Ativar realtime por board com isolamento.
- Registrar atividades principais (movimentação, edição, membros).
- Revisar RLS e segurança de acesso.
- Validar loading, erro e empty states críticos.

## Critérios de Pronto por Fase

- Q1 pronto: login corporativo funcionando com bloqueio de domínio.
- Q1 pronto: sessão persistente no dispositivo até logout do usuário.
- Q2 pronto: papéis aplicados em UI e backend.
- Q3 pronto: múltiplos boards funcionais e isolados.
- Q4 pronto: admin gerencia membros diretamente no site.
- Q5 pronto: links substituem upload sem regressão de uso.
- Q6 pronto: realtime estável e regras de acesso auditáveis.

## Ordem de Implementação Recomendada

Q1 -> Q2 -> Q3 -> Q4 -> Q5 -> Q6

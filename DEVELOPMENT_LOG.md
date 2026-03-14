# Log de Desenvolvimento - Vende-c Projeto

Este arquivo rastreia o progresso do desenvolvimento, decisões técnicas e tarefas pendentes.

## Convenções do Projeto
- **Sem Emojis**: O projeto deve manter uma aparência profissional. Evite o uso de emojis na interface (ex: substituir 📦 por ícones Lucide).
- **Segurança na Exclusão**: Ações destrutivas (como excluir listas) devem exigir confirmação do usuário.
- **Edição Inline**: Títulos de listas e cartões devem ser editáveis clicando neles (com suporte a Enter/Esc).
- **Gerenciamento de Estado**: Evitar duplicação de estado e garantir que componentes de input não sejam remontados desnecessariamente (causa perda de foco/inversão de digitação).

## Histórico de Alterações

### [13/03/2026] - Padronização de Encoding, MCP e Qualidade de Front

- **Encoding Global (UTF-8)**:
  - Adicionado `.editorconfig` com `charset = utf-8`.
  - Adicionado `.gitattributes` para normalização de texto no Git.
  - Removidos BOMs remanescentes dos arquivos do projeto.
- **MCP**:
  - Adicionado servidor `context7` em `.mcp.json` para consulta de documentação atualizada de bibliotecas.
- **UI / Tailwind**:
  - Ajustadas classes para forma canônica em componentes com warnings ativos.
  - Base voltou a ficar sem erros de lint e build.
- **Documentação**:
  - README, PROJECT_STATUS e backlog ajustados para refletir o estado real do código em 13/03/2026.

### [07/01/2026] - Correções e Melhorias de Interface

#### Correções Críticas
- **Fix: Input "Digitando ao Contrário"**: Resolvido o problema onde o texto do input de criar cartão aparecia invertido.
  - *Causa*: O componente de input estava sendo recriado a cada renderização do componente pai (`Column`), perdendo o foco e o estado interno.
  - *Solução*: Extração do componente `AddCardInput` para fora do componente `Column`.
- **Fix: Erros no CardModal.tsx**: Resolvido erro de compilação (arquivo vermelho).
  - *Ações*: Removidas declarações duplicadas de `useState`, consolidados os tipos de `Props` e removida interseção de tipos redundante na assinatura da função.

#### Funcionalidades Implementadas
- **Gerenciamento de Listas**:
  - Adicionada funcionalidade de **Renomear Lista** (clique no título ou via menu).
  - Adicionada funcionalidade de **Excluir Lista** com confirmação de segurança.
- **Remoção de Emojis**:
  - Substituído emoji 📦 por ícone `Archive` (Lucide React) na tela de Arquivos.
  - Substituídos emojis de alerta nas etiquetas globais por texto ("ATENÇÃO", "REVISAR").

## Tarefas Pendentes / Em Progresso
- [ ] Implementar persistência real dos dados (atualmente em memória/estado local).
- [ ] Verificar se há outros emojis remanescentes no código.
- [ ] Melhorar a responsividade do Modal de Cartão em telas menores.

### [07/01/2026] - Correções de Persistência e Limpeza de Dados
- **Fix: Persistência de Dados do Cartão**: 
  - Resolvido problema onde alterações no título do cartão e etiquetas não eram salvas.
  - Implementado callback `onUpdate` para propagar mudanças do `CardModal` -> `Card` -> `Column`.
- **Fix: Tipagem de Refs**:
  - Corrigido erro de TypeScript em `CardModal.tsx` ajustando o tipo de `ref` para botões (`HTMLButtonElement`).
- **Limpeza de Dados Iniciais**:
  - Removidos todos os dados "mockados" (listas e cartões de exemplo).
  - O aplicativo agora inicia vazio ("limpo"), conforme solicitado, para que o usuário crie sua própria estrutura.
- **Refatoração de Etiquetas**:
    - Atualizado estrutura de dados de etiquetas em `Column.tsx` e `Card.tsx` (de booleano para `Label[]`).
    - Etiquetas agora são renderizadas dinamicamente com as cores corretas.
  - **Correção de Erros Críticos (Clean Code)**:
    - Resolvidos diversos erros de TypeScript e Linter (unused imports, type mismatches).
    - Removidos props não utilizados (`initialDate`, `count`) e imports desnecessários.
    - Corrigido erro de referência `handleUpdateCard` em `Column.tsx`.
    - Ajustado `ArchivedBoard.tsx` para suportar a nova tipagem de `labels`.
    - **Refinamento Visual e Correção de Bugs (CardModal)**:
      - Corrigido erro crítico de `RefObject` (separação de `ref` para botão e div).
      - Removida variável `setAttachments` não utilizada.
      - Ajustado layout do cabeçalho do modal para alinhar ícone de check e título, reduzindo tamanho do ícone para conformidade com design do cliente.
      - **Correção de Usabilidade e Layout (CardModal & Card)**:
        - Corrigido campo de data no modal para permitir digitação manual (inputs editáveis com parsing automático).
        - Corrigida sobreposição do botão "Fechar" com "Ocultar detalhes" no sidebar do modal (ajuste de padding).
        - Atualizado visual do Card no board:
          - Etiquetas agora exibem texto e são maiores.
          - Adicionado badge de data de entrega (com cores para atrasado/em dia).
          - Adicionado avatar de membros no rodapé do card.
          - Integração completa de atualização de data entre Modal e Card via `onUpdate`.
      - **Correção de Bugs e Sincronização (CardModal & Card)**:
        - Corrigido posicionamento do menu de datas (agora detecta borda da tela e abre para cima se necessário).
        - Implementada sincronização do status de conclusão ("Check") entre Modal e Card.
        - Corrigido bug onde etiquetas criadas/editadas não apareciam ao reabrir o modal (passagem de `initialLabels`).
        - Adicionado indicador visual de conclusão no Card (badge verde com ícone de check e texto "CONCLUÍDO").

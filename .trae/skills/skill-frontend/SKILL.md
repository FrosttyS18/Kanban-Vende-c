---
name: "skill-frontend"
description: "Implementa front-end com padrão sênior e layout fiel. Invoke when creating or changing UI, UX, components, pages, or styling."
---

# Skill Front-end

## Principios Fundamentais

### UI/UX Senior
- Sempre seguir decisoes de UI/UX senior
- Interface limpa, profissional, consistente e responsiva
- Acessibilidade basica obrigatoria
- HTML semantico sempre
- Manter padrao visual consistente entre telas, componentes e estados

### Codigo Limpo
- Codigo simples, direto e bem organizado
- JavaScript/TypeScript claro, sem abstracoes desnecessarias
- Tailwind CSS organizado e sem poluicao
- Nao criar arquivos monoliticos nem componentes gigantes
- Separar responsabilidades: componentes, hooks, services, utils e types
- Back-end limpo e bem estruturado quando houver integracao necessaria

### Stack Fixa
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- dnd-kit para drag and drop
- Supabase para backend

## Regras de Implementacao

### Componentes
- Um componente por arquivo
- Props tipadas com interface
- Export default no final
- Nomes em PascalCase

### Estilizacao
- Tailwind primeiro
- Classes ordenadas: layout > spacing > typography > colors > effects
- Evitar inline styles
- Usar variaveis do Tailwind para consistencia
- Priorizar classes canonicas do Tailwind quando houver equivalente
- Evitar classes duplicadas ou conflitantes na mesma string
- Entregar front-end sem warnings de lint e sem warnings de diagnostico de classes

### Estado
- useState para estado local simples
- useContext para estado compartilhado
- Hooks customizados para logica reutilizavel

### Performance
- Memoizacao quando necessario (useMemo, useCallback)
- Lazy loading para componentes pesados
- Evitar re-renders desnecessarios

## Tratamento de Estados

Sempre tratar:
- Loading state
- Error state
- Empty state

## Regras de Figma e Transparencia

- Ao usar MCP do Figma, identificar componentes, estrutura e layout antes de codar
- Implementar 1:1 com o Figma, sem inventar ou chutar comportamento visual
- Se faltar informacao do Figma, avisar imediatamente o usuario
- Se houver duvida de regra ou layout, perguntar ao usuario antes de implementar
- Nunca criar codigo apenas para agradar; priorizar precisao e transparencia

## Proibicoes

- NAO usar `any` sem necessidade real
- NAO inventar layouts - usar Figma como fonte de verdade
- NAO criar componentes gigantes
- NAO duplicar codigo
- NAO fazer overengineering
- NAO assumir detalhes tecnicos sem evidencia no projeto ou no Figma

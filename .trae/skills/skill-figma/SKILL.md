---
name: "skill-figma"
description: "Implementa interfaces com base exata no Figma via MCP. Invoke when converting Figma designs into production UI."
---

# Skill Figma

## Objetivo

Implementar UI 1:1 com o Figma usando MCP, sem suposicoes de layout.

## Fluxo Obrigatorio

1. Obter contexto do design via MCP do Figma
2. Mapear todos os componentes, hierarquia, espacamentos e estados
3. Levantar tipografia, cores, tamanhos, alinhamentos e comportamento responsivo
4. Implementar no codigo com fidelidade ao layout
5. Validar visual e funcionalmente antes de concluir

## Regras de Implementacao

- O Figma e a fonte definitiva de layout
- Nao inventar, nao chutar e nao inferir sem evidencia
- Se faltar dado no Figma, avisar o usuario de forma explicita
- Se houver duvida de componente ou interacao, perguntar ao usuario
- Ser 100% transparente sobre limites tecnicos ou diferencas encontradas

## Qualidade de Entrega

- Garantir semantica HTML
- Garantir acessibilidade basica
- Garantir consistencia visual entre estados
- Garantir responsividade conforme o design

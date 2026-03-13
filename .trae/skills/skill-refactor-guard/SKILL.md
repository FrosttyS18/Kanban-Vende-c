---
name: "skill-refactor-guard"
description: "Executa refatorações seguras por migração incremental. Invoke when splitting, reorganizing, or modernizing existing code."
---

# Skill Refactor Guard

## Objetivo

Garantir refatoracoes seguras, incrementais e sem quebra de comportamento.

## Fluxo Obrigatorio de Refatoracao

1. Criar primeiro o novo arquivo de destino
2. Copiar ou mover o codigo para o novo arquivo
3. Validar que a logica foi preservada
4. Somente depois remover do arquivo antigo
5. Validar lint, typecheck e build

## Regra para Arquivos Grandes

- Se o arquivo for muito grande, criar backup seguro antes da migracao
- Fazer mudancas em partes pequenas e verificaveis
- Confirmar funcionamento a cada etapa

## Regras de Seguranca

- Nao remover codigo antes de existir destino funcional
- Nao alterar comportamento sem necessidade tecnica clara
- Nao fazer refatoracao ampla em um unico passo
- Nao misturar refatoracao estrutural com mudanca de regra de negocio

## Padrao de Validacao

- Rodar validacoes do projeto apos cada bloco relevante
- Corrigir regressao antes de continuar
- Finalizar apenas com comportamento preservado e codigo limpo

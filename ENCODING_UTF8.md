# Política de Encoding UTF-8

## Regra obrigatória
- Todo arquivo de código deve ser salvo em UTF-8.
- Literais de UI em português devem permanecer legíveis e acentuados.
- O comando `npm run encoding:check` é obrigatório antes de lint/build/deploy.

## Sinais de mojibake
- Sequências como `Ã`, `ï¿½`, `â€™`, `â€œ`, `â€`, `Ì`, `�`.
- Exemplo de erro: `cartÃ£o` no lugar de `cartão`.

## Checklist pré-deploy
1. Rodar `npm run encoding:check`.
2. Rodar `npm run lint`.
3. Rodar `npm run build`.
4. Validar no UI mensagens de atividades/notificações com acentuação correta.

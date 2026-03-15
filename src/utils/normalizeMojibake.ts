const REPLACEMENTS: Array<[string, string]> = [
  ['conclu�do', 'conclu\u00eddo'],
  ['Conclu�do', 'Conclu\u00eddo'],
  ['concluído', 'conclu\u00eddo'],
  ['VocÃª', 'Voc\u00ea'],
  ['vocÃª', 'voc\u00ea'],
  ['cartÃ£o', 'cart\u00e3o'],
  ['organizaÃ§Ã£o', 'organiza\u00e7\u00e3o'],
  ['Ã¡', '\u00e1'],
  ['Ã¢', '\u00e2'],
  ['Ã£', '\u00e3'],
  ['Ã©', '\u00e9'],
  ['Ãª', '\u00ea'],
  ['Ã­', '\u00ed'],
  ['Ã³', '\u00f3'],
  ['Ã´', '\u00f4'],
  ['Ãµ', '\u00f5'],
  ['Ãº', '\u00fa'],
  ['Ã§', '\u00e7'],
  ['Ã\u0081', '\u00c1'],
  ['Ã\u0089', '\u00c9'],
  ['Ã\u0093', '\u00d3'],
  ['Ã\u0087', '\u00c7'],
  ['â€™', '\u2019'],
  ['â€œ', '\u201c'],
  ['â€\u009d', '\u201d'],
  ['â€“', '\u2013'],
  ['â€”', '\u2014']
]

export function normalizeMojibake(value: string): string {
  let nextValue = value
  for (const [broken, fixed] of REPLACEMENTS) {
    nextValue = nextValue.replaceAll(broken, fixed)
  }
  return nextValue.normalize('NFC')
}

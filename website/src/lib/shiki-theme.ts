/**
 * Code colours built on the site palette (see the tokens in src/styles/global.css):
 * keywords in orchid, strings in gold, numbers and built-ins in cryo blue, comments muted.
 * Every colour has at least AA contrast on the code background.
 */
const palette = {
  background: '#0c0b16',
  text: '#ede8f2', // frost
  muted: '#9d93ab', // comments
  punctuation: '#b3a9c0', // frost-muted
  keyword: '#e891db', // orchid
  string: '#d6b26e', // gold
  number: '#96acd4', // cryo
  function: '#c9d4ee', // cryo, lighter
  type: '#f2c4ea', // orchid, lighter
};

export const qubitoCodeTheme = {
  name: 'qubito',
  type: 'dark' as const,
  colors: {
    'editor.background': palette.background,
    'editor.foreground': palette.text,
  },
  tokenColors: [
    { settings: { foreground: palette.text } },
    {
      scope: ['comment', 'punctuation.definition.comment', 'string.quoted.docstring'],
      settings: { foreground: palette.muted, fontStyle: 'italic' },
    },
    {
      scope: [
        'keyword',
        'storage',
        'storage.type',
        'keyword.operator.logical',
        'variable.language',
      ],
      settings: { foreground: palette.keyword },
    },
    {
      scope: ['string', 'punctuation.definition.string', 'constant.character.escape'],
      settings: { foreground: palette.string },
    },
    {
      scope: ['constant.numeric', 'constant.language', 'support.function.builtin', 'support.type'],
      settings: { foreground: palette.number },
    },
    {
      scope: ['entity.name.function', 'meta.function-call.generic', 'support.function'],
      settings: { foreground: palette.function },
    },
    {
      scope: ['entity.name.type', 'entity.name.class', 'entity.other.inherited-class'],
      settings: { foreground: palette.type },
    },
    {
      scope: [
        'entity.name.function.decorator',
        'meta.decorator',
        'punctuation.definition.decorator',
      ],
      settings: { foreground: palette.string },
    },
    {
      scope: ['punctuation', 'keyword.operator', 'meta.brace'],
      settings: { foreground: palette.punctuation },
    },
  ],
};

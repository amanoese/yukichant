export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat',
      'fix',
      'perf',
      'refactor',
      'revert',
      'test',
      'docs',
      'chore',
      'ci',
      'deps',
      'release',
    ]],
    'subject-case': [0],
    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never'],
  },
};

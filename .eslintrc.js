module.exports = {
  extends: ['plugin:prettier/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    'no-var': 'error', // 不能使用var声明变量
    'import/extensions': 'off',
    'linebreak-style': [0, 'error', 'windows'],
    'space-before-function-paren': 0, // 在函数左括号的前面是否有空格
    'no-console': ['error', { allow: ['log', 'warn'] }], // 允许使用console.log()
    'arrow-parens': 0,
    'no-new': 0, //允许使用 new 关键字
    'no-undef': 0,
  },
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      modules: true,
    },
  },
}

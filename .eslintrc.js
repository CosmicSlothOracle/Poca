module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': process.env.CI ? 'warn' : 'error',
    'react-hooks/exhaustive-deps': process.env.CI ? 'warn' : 'error'
  },
  env: {
    node: true,
    browser: true,
    es6: true
  }
};

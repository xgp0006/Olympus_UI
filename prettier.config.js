/** @type {import("prettier").Config} */
export default {
  useTabs: false,
  tabWidth: 2,
  singleQuote: true,
  trailingComma: 'none',
  printWidth: 100,
  plugins: ['prettier-plugin-svelte'],
  overrides: [
    {
      files: '*.svelte',
      options: {
        parser: 'svelte'
      }
    }
  ]
};

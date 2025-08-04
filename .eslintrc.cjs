module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:svelte/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
    extraFileExtensions: ['.svelte'],
    project: './tsconfig.json'
  },
  env: {
    browser: true,
    es2017: true,
    node: true
  },
  ignorePatterns: [
    'build/',
    '.svelte-kit/',
    'node_modules/',
    'src-tauri/target/',
    '*.config.js',
    '*.config.ts',
    'scripts/',
    'src/lib/utils/examples/'
  ],
  overrides: [
    {
      files: ['*.svelte'],
      parser: 'svelte-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser'
      },
      rules: {
        // Svelte-specific consistency rules
        'svelte/valid-compile': 'error',
        'svelte/no-dom-manipulating': 'error',
        'svelte/no-dupe-on-directives': 'error',
        'svelte/no-dupe-use-directives': 'error',
        'svelte/require-store-callbacks-use-set-param': 'error',
        'svelte/require-store-reactive-access': 'error',
        'svelte/no-reactive-literals': 'error',
        'svelte/no-useless-mustaches': 'error',
        'svelte/prefer-destructured-store-props': 'error',
        'svelte/button-has-type': 'error',
        'svelte/no-at-debug-tags': 'error',
        'svelte/no-reactive-reassign': 'error',
        'svelte/no-unused-class-name': 'warn',
        'svelte/require-each-key': 'error',
        'svelte/valid-each-key': 'error',
        'svelte/no-inline-styles': ['warn', { allowTransitions: true }],
        'svelte/sort-attributes': 'warn',
        'svelte/first-attribute-linebreak': ['error', {
          multiline: 'below',
          singleline: 'beside'
        }]
      }
    }
  ],
  rules: {
    // NASA JPL Power of 10 Rules
    'max-lines-per-function': ['error', { 
      max: 60, 
      skipBlankLines: true, 
      skipComments: true 
    }],
    'max-depth': ['error', 4],
    'max-nested-callbacks': ['error', 3],
    'complexity': ['error', 10],
    'max-statements': ['error', 20],
    'max-params': ['error', 4],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',

    // Import ordering rules
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        ['parent', 'sibling', 'index'],
        'type'
      ],
      pathGroups: [
        {
          pattern: '$app/**',
          group: 'internal',
          position: 'before'
        },
        {
          pattern: '$lib/**',
          group: 'internal'
        },
        {
          pattern: '@tauri-apps/**',
          group: 'external',
          position: 'after'
        }
      ],
      pathGroupsExcludedImportTypes: ['type'],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true
      }
    }],
    'import/no-duplicates': 'error',
    'import/no-unresolved': 'off', // TypeScript handles this
    'import/no-cycle': ['error', { maxDepth: 3 }],

    // Consistent event naming (camelCase)
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'default',
        format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow',
        trailingUnderscore: 'allow'
      },
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow'
      },
      {
        selector: 'typeLike',
        format: ['PascalCase']
      },
      {
        selector: 'enumMember',
        format: ['UPPER_CASE']
      },
      {
        selector: 'property',
        format: ['camelCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow'
      },
      {
        selector: 'method',
        format: ['camelCase']
      }
    ],

    // Prefer const over let
    'prefer-const': 'error',
    'no-var': 'error',
    'no-const-assign': 'error',

    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': ['warn', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
      allowHigherOrderFunctions: true,
      allowDirectConstAssertionInArrowFunctions: true
    }],
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/strict-boolean-expressions': ['error', {
      allowString: false,
      allowNumber: false,
      allowNullableObject: false
    }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-unnecessary-condition': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-as-const': 'error',
    '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],

    // General code quality rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-unused-expressions': 'error',
    'no-unreachable': 'error',
    'no-constant-condition': ['error', { checkLoops: false }],
    'no-duplicate-imports': 'error',
    'no-self-compare': 'error',
    'no-template-curly-in-string': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-use-before-define': ['error', { functions: false }],
    'no-useless-concat': 'error',
    'no-useless-rename': 'error',
    'no-useless-return': 'error',
    'require-await': 'error',
    'yoda': ['error', 'never'],
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'no-throw-literal': 'error',
    'no-return-await': 'error',
    'no-param-reassign': ['error', { props: true }],
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',
    'no-nested-ternary': 'error',
    'no-unneeded-ternary': 'error',
    'no-mixed-operators': 'error',
    'no-bitwise': ['error', { allow: ['~'] }],

    // Array and object consistency
    'array-callback-return': 'error',
    'no-array-constructor': 'error',
    'object-shorthand': ['error', 'always'],
    'prefer-destructuring': ['error', {
      array: true,
      object: true
    }, {
      enforceForRenamedProperties: false
    }],
    'prefer-spread': 'error',
    'prefer-rest-params': 'error',
    'prefer-object-spread': 'error',
    'dot-notation': 'error',

    // Promise and async rules
    'promise/catch-or-return': 'off',
    'promise/always-return': 'off',
    'promise/no-nesting': 'off',
    'no-async-promise-executor': 'error',
    'no-await-in-loop': 'warn',
    'no-promise-executor-return': 'error',
    'require-atomic-updates': 'error',

    // Comments and documentation
    'spaced-comment': ['error', 'always', {
      line: {
        markers: ['/'],
        exceptions: ['-', '+']
      },
      block: {
        markers: ['!'],
        exceptions: ['*'],
        balanced: true
      }
    }],
    'capitalized-comments': ['warn', 'always', {
      ignorePattern: 'pragma|ignore|todo|fixme|hack',
      ignoreInlineComments: true
    }],

    // Switch statement rules
    'default-case': 'error',
    'default-case-last': 'error',
    'no-fallthrough': 'error',

    // Error handling
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',

    // Disable rules that conflict with Prettier
    'svelte/no-unused-svelte-ignore': 'error',
    'svelte/no-at-html-tags': 'error'
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json'
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.svelte']
      }
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
      'svelte-eslint-parser': ['.svelte']
    }
  }
};
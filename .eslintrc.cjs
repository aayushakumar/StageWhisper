module.exports = {
    root: true,
    env: {
        browser: true,
        es2020: true,
        webextensions: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'prettier',
    ],
    ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: __dirname,
    },
    plugins: ['react', '@typescript-eslint'],
    settings: {
        react: {
            version: 'detect',
        },
    },
    rules: {
        'react/react-in-jsx-scope': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'error',
        'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
};

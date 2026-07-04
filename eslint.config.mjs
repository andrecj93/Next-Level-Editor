// ESLint 9 flat config — replaces the legacy .eslintrc.cjs (which ESLint 9 no
// longer reads). Mirrors the previous setup: vue3-recommended +
// eslint:recommended + the Vue/TypeScript config, with the same rule overrides.
import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from "@vue/eslint-config-typescript";

export default defineConfigWithVueTs(
  {
    // Previously handled by `--ignore-path .gitignore`.
    ignores: [
      "dist/**",
      "dist-demo/**",
      "coverage/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      ".smoke/**",
      ".claude/**",
      "*.html",
    ],
  },
  js.configs.recommended,
  pluginVue.configs["flat/recommended"],
  vueTsConfigs.recommended,
  {
    rules: {
      // Pre-existing codebase style: the legacy setup (eslint 8 + the older
      // Vue/TS shared config) did not error on these; keep the gate's meaning
      // unchanged across the ESLint 9 major bump.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "vue/multi-word-component-names": "off",
      "vue/no-v-html": "off",
      "vue/html-closing-bracket-newline": "off",
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-indent": "off",
      "vue/html-self-closing": [
        "error",
        {
          html: {
            void: "never",
            normal: "any",
            component: "always",
          },
        },
      ],
    },
  },
  {
    // CommonJS config files (e.g. .stylelintrc.cjs) use module/require.
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        module: "writable",
        require: "readonly",
        __dirname: "readonly",
        process: "readonly",
      },
    },
  },
  {
    // Tests may define multiple tiny components in one file.
    files: ["**/__tests__/**", "**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "vue/one-component-per-file": "off",
    },
  }
);

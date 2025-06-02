// @ts-check
import tseslint from "typescript-eslint";

export default tseslint.config(
  tseslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    rules: {
      "@typescript-eslint/explicit-member-accessibility": "error",
    },
  }
);

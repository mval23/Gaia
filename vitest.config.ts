import { defineConfig } from 'vitest/config';

// The swatch test reads the generated tokens, which Vitest would otherwise stub out.
export default defineConfig({
  test: { css: { include: /tokens\.css/ } },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // Pure logic and data contracts run in node. Test files that need a
        // DOM opt in with a `@vitest-environment jsdom` docblock, so only the
        // component tests pay for jsdom.
        environment: "node",
        include: ["packages/*/src/**/*.test.ts", "apps/web/src/**/*.test.ts", "apps/web/src/**/*.test.tsx"],
    },
});

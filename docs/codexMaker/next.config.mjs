import nextra from "nextra";

const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
  search: {
    codeblocks: true,
  },
});

export default withNextra({
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: "/codexmaker",
});

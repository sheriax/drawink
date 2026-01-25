// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

// Set the env variable to false so the drawink npm package doesn't throw
// process undefined as docusaurus doesn't expose env variables by default

process.env.IS_PREACT = "false";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Drawink Internal Docs",
  tagline: "Internal development documentation for Drawink contributors",
  url: "https://docs.drawink.app",
  baseUrl: "/",
  onBrokenLinks: "warn", // Changed to warn during migration
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.png",
  organizationName: "Drawink",
  projectName: "drawink",

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: undefined, // Internal docs - no public edit link
          showLastUpdateAuthor: false, // Internal docs
          showLastUpdateTime: true,
        },
        theme: {
          customCss: [require.resolve("./src/css/custom.scss")],
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: "Drawink Internal Docs",
        logo: {
          alt: "Drawink Logo",
          src: "img/logo.svg",
        },
        items: [
          {
            to: "/docs",
            position: "left",
            label: "Documentation",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Documentation",
            items: [
              {
                label: "Get Started",
                to: "/docs",
              },
              {
                label: "Development",
                to: "/docs/introduction/development",
              },
              {
                label: "Contributing",
                to: "/docs/introduction/contributing",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Drawink. Internal documentation.`,
      },
      prism: {
        theme: require("prism-react-renderer/themes/dracula"),
      },
      image: "img/og-image-2.png",
      docs: {
        sidebar: {
          hideable: true,
        },
      },
      tableOfContents: {
        maxHeadingLevel: 4,
      },
      // Algolia search disabled for internal docs
      // algolia: {
      //   appId: "8FEAOD28DI",
      //   apiKey: "4b07cca33ff2d2919bc95ff98f148e9e",
      //   indexName: "drawink",
      // },
    }),
  // Live codeblock theme removed - internal docs don't need interactive examples
  // themes: ["@docusaurus/theme-live-codeblock"],
  plugins: [
    "docusaurus-plugin-sass",
    [
      "docusaurus2-dotenv",
      {
        systemvars: true,
      },
    ],
    () => ({
      name: "disable-fully-specified-error",
      configureWebpack() {
        return {
          module: {
            rules: [
              {
                test: /\.m?js$/,
                resolve: {
                  fullySpecified: false,
                },
              },
            ],
          },
          optimization: {
            // disable terser minification
            minimize: false,
          },
        };
      },
    }),
  ],
};

module.exports = config;

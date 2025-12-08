/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    {
      type: "category",
      label: "Introduction",
      link: {
        type: "doc",
        id: "introduction/get-started",
      },
      items: ["introduction/development", "introduction/contributing"],
    },
    {
      type: "category",
      label: "Codebase",
      items: ["codebase/json-schema", "codebase/frames"],
    },
    {
      type: "category",
      label: "@drawink/drawink",
      collapsed: false,
      items: [
        "@drawink/drawink/installation",
        "@drawink/drawink/integration",
        "@drawink/drawink/customizing-styles",
        {
          type: "category",
          label: "API",
          link: {
            type: "doc",
            id: "@drawink/drawink/api/api-intro",
          },
          items: [
            {
              type: "category",
              label: "Props",
              link: {
                type: "doc",
                id: "@drawink/drawink/api/props/props",
              },
              items: [
                "@drawink/drawink/api/props/initialdata",
                "@drawink/drawink/api/props/drawink-api",
                "@drawink/drawink/api/props/render-props",
                "@drawink/drawink/api/props/ui-options",
              ],
            },
            {
              type: "category",
              label: "Children Components",
              link: {
                type: "doc",
                id: "@drawink/drawink/api/children-components/children-components-intro",
              },
              items: [
                "@drawink/drawink/api/children-components/main-menu",
                "@drawink/drawink/api/children-components/welcome-screen",
                "@drawink/drawink/api/children-components/sidebar",
                "@drawink/drawink/api/children-components/footer",
                "@drawink/drawink/api/children-components/live-collaboration-trigger",
              ],
            },
            {
              type: "category",
              label: "Utils",
              link: {
                type: "doc",
                id: "@drawink/drawink/api/utils/utils-intro",
              },
              items: [
                "@drawink/drawink/api/utils/export",
                "@drawink/drawink/api/utils/restore",
              ],
            },
            "@drawink/drawink/api/constants",
            "@drawink/drawink/api/drawink-element-skeleton",
          ],
        },
        "@drawink/drawink/faq",
        "@drawink/drawink/development",
      ],
    },
    {
      type: "category",
      label: "@drawink/mermaid-to-drawink",
      link: {
        type: "doc",
        id: "@drawink/mermaid-to-drawink/installation",
      },
      items: [
        "@drawink/mermaid-to-drawink/api",
        "@drawink/mermaid-to-drawink/development",
        {
          type: "category",
          label: "Codebase",
          link: {
            type: "doc",
            id: "@drawink/mermaid-to-drawink/codebase/codebase",
          },
          items: [
            {
              type: "category",
              label: "How Parser works under the hood?",
              link: {
                type: "doc",
                id: "@drawink/mermaid-to-drawink/codebase/parser/parser",
              },
              items: ["@drawink/mermaid-to-drawink/codebase/parser/flowchart"],
            },
            "@drawink/mermaid-to-drawink/codebase/new-diagram-type",
          ],
        },
      ],
    },
  ],
};

module.exports = sidebars;

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
      label: "@drawink/excalidraw",
      collapsed: false,
      items: [
        "@drawink/excalidraw/installation",
        "@drawink/excalidraw/integration",
        "@drawink/excalidraw/customizing-styles",
        {
          type: "category",
          label: "API",
          link: {
            type: "doc",
            id: "@drawink/excalidraw/api/api-intro",
          },
          items: [
            {
              type: "category",
              label: "Props",
              link: {
                type: "doc",
                id: "@drawink/excalidraw/api/props/props",
              },
              items: [
                "@drawink/excalidraw/api/props/initialdata",
                "@drawink/excalidraw/api/props/excalidraw-api",
                "@drawink/excalidraw/api/props/render-props",
                "@drawink/excalidraw/api/props/ui-options",
              ],
            },
            {
              type: "category",
              label: "Children Components",
              link: {
                type: "doc",
                id: "@drawink/excalidraw/api/children-components/children-components-intro",
              },
              items: [
                "@drawink/excalidraw/api/children-components/main-menu",
                "@drawink/excalidraw/api/children-components/welcome-screen",
                "@drawink/excalidraw/api/children-components/sidebar",
                "@drawink/excalidraw/api/children-components/footer",
                "@drawink/excalidraw/api/children-components/live-collaboration-trigger",
              ],
            },
            {
              type: "category",
              label: "Utils",
              link: {
                type: "doc",
                id: "@drawink/excalidraw/api/utils/utils-intro",
              },
              items: [
                "@drawink/excalidraw/api/utils/export",
                "@drawink/excalidraw/api/utils/restore",
              ],
            },
            "@drawink/excalidraw/api/constants",
            "@drawink/excalidraw/api/excalidraw-element-skeleton",
          ],
        },
        "@drawink/excalidraw/faq",
        "@drawink/excalidraw/development",
      ],
    },
    {
      type: "category",
      label: "@drawink/mermaid-to-excalidraw",
      link: {
        type: "doc",
        id: "@drawink/mermaid-to-excalidraw/installation",
      },
      items: [
        "@drawink/mermaid-to-excalidraw/api",
        "@drawink/mermaid-to-excalidraw/development",
        {
          type: "category",
          label: "Codebase",
          link: {
            type: "doc",
            id: "@drawink/mermaid-to-excalidraw/codebase/codebase",
          },
          items: [
            {
              type: "category",
              label: "How Parser works under the hood?",
              link: {
                type: "doc",
                id: "@drawink/mermaid-to-excalidraw/codebase/parser/parser",
              },
              items: [
                "@drawink/mermaid-to-excalidraw/codebase/parser/flowchart",
              ],
            },
            "@drawink/mermaid-to-excalidraw/codebase/new-diagram-type",
          ],
        },
      ],
    },
  ],
};

module.exports = sidebars;

#!/usr/bin/env bun

// React 19 Import Migration Script
// This script analyzes and fixes React import patterns for React 19 compatibility

import { readFile, writeFile } from "node:fs/promises";
import { glob } from "glob";

const REACT_IMPORT_PATTERNS = {
  // Hook imports that need to be direct
  hooks: ["useEffect", "useMemo", "useRef", "useState", "useContext", "createRef"],

  // Component imports that need to be direct
  components: ["Component", "PureComponent"],

  // Type imports that should not use React namespace
  types: ["JSX", "ReactNode", "FC", "KeyboardEvent", "PointerEvent", "MouseEvent", "TouchEvent"],

  // Context imports
  context: ["createContext"],
};

async function analyzeReactImports() {
  console.log("🔍 Analyzing React import patterns...");

  const files = await glob("packages/drawink/**/*.{ts,tsx}", {
    ignore: ["**/node_modules/**", "**/dist/**", "**/*.d.ts"],
  });

  const issues: Array<{
    file: string;
    message: string;
    matches: number;
    fix: string;
    preview: string;
  }> = [];

  for (const file of files) {
    try {
      const content = await readFile(file, "utf-8");

      // Check for problematic patterns
      const patterns = [
        {
          pattern: /import\s+React,\s*{\s*[^}]*\s*}\s+from\s+["']react["']/g,
          message: "Mixed React namespace and destructured imports",
          fix: "Split into separate imports",
        },
        {
          pattern:
            /React\.(Component|useState|useEffect|useMemo|useRef|createContext|JSX|ReactNode|FC|KeyboardEvent|PointerEvent)/g,
          message: "React namespace usage (React 19 incompatible)",
          fix: "Import directly from 'react'",
        },
        {
          pattern: /class\s+\w+\s+extends\s+React\.Component/g,
          message: "React.Component usage",
          fix: "Import Component directly",
        },
      ];

      for (const { pattern, message, fix } of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          issues.push({
            file,
            message,
            matches: matches.length,
            fix,
            preview: matches[0]?.substring(0, 100) + "...",
          });
        }
      }
    } catch (error) {
      console.error(`Error reading ${file}:`, error);
    }
  }

  return issues;
}

async function fixReactImports() {
  console.log("🛠️  Fixing React import patterns...");

  const files = await glob("packages/drawink/**/*.{ts,tsx}", {
    ignore: ["**/node_modules/**", "**/dist/**", "**/*.d.ts"],
  });

  let fixedCount = 0;
  
  for (const file of files) {
    try {
      let content = await readFile(file, 'utf-8');
      const originalContent = content;
      
      // Fix React.Component → Component
      content = content.replace(/extends\s+React\.Component/g, 'extends Component');
      
      // Fix React namespace usage in types and hooks
      content = content.replace(/React\.(JSX|ReactNode|FC|KeyboardEvent|PointerEvent|MouseEvent|TouchEvent)/g, '$1');
      
      // Fix React namespace usage in hooks
      content = content.replace(/React\.(useState|useEffect|useMemo|useRef|useContext|createRef|createContext)/g, '$1');
      
      // Fix mixed imports: import React, { useState } from "react"
      if (content.includes('import React, {') && content.includes('} from "react"')) {
        const matches = content.match(/import React, {([^}]+)} from "react"/);
        if (matches) {
          const destructured = matches[1].trim();
          content = content.replace(
            /import React, {[^}]+} from "react"/,
            `import React from "react"\nimport { ${destructured} } from "react"`
          );
        }
      }
      
      // Add direct imports for commonly used items
      const neededImports: string[] = [];
      
      if (content.includes('Component') && !content.includes('import { Component }')) {
        neededImports.push('Component');
      }
      
      if (content.includes('JSX') && !content.includes('import { JSX }')) {
        neededImports.push('JSX');
      }
      
      if (content.includes('ReactNode') && !content.includes('import { ReactNode }')) {
        neededImports.push('ReactNode');
      }
      
      if (content.includes('FC') && !content.includes('import { FC }')) {
        neededImports.push('FC');
      }
      
      if (neededImports.length > 0) {
        const importStatement = `import { ${neededImports.join(', ')} } from "react";\n`;
        
        // Find the existing react import and add after it
        const reactImportMatch = content.match(/import[^;]+from\s+["']react["'];?/);
        if (reactImportMatch) {
          const insertIndex = reactImportMatch.index! + reactImportMatch[0].length;
          content = content.slice(0, insertIndex) + '\n' + importStatement + content.slice(insertIndex);
        } else {
          // Add at the top
          content = importStatement + content;
        }
      }
      
      if (content !== originalContent) {
        await writeFile(file, content, 'utf-8');
        fixedCount++;
        console.log(`✅ Fixed: ${file}`);
      }
      
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
    try {
      let content = await readFile(file, "utf-8");
      const originalContent = content;

      // Fix React.Component → Component
      content = content.replace(/extends\s+React\.Component/g, "extends Component");

      // Fix React namespace usage in types and hooks
      content = content.replace(
        /React\.(JSX|ReactNode|FC|KeyboardEvent|PointerEvent|MouseEvent|TouchEvent)/g,
        "$1",
      );

      // Fix React namespace usage in hooks
      content = content.replace(
        /React\.(useState|useEffect|useMemo|useRef|useContext|createRef|createContext)/g,
        "$1",
      );

      // Fix mixed imports: import React, { useState } from "react"
      if (content.includes("import React, {") && content.includes('} from "react"')) {
        const matches = content.match(/import React, {([^}]+)} from "react"/);
        if (matches) {
          const destructured = matches[1].trim();
          content = content.replace(
            /import React, {[^}]+} from "react"/,
            `import React from "react"\nimport { ${destructured} } from "react"`,
          );
        }
      }

      // Add direct imports for commonly used items
      const neededImports = [];

      if (content.includes("Component") && !content.includes("import { Component }")) {
        neededImports.push("Component");
      }

      if (content.includes("JSX") && !content.includes("import { JSX }")) {
        neededImports.push("JSX");
      }

      if (content.includes("ReactNode") && !content.includes("import { ReactNode }")) {
        neededImports.push("ReactNode");
      }

      if (content.includes("FC") && !content.includes("import { FC }")) {
        neededImports.push("FC");
      }

      if (neededImports.length > 0) {
        const importStatement = `import { ${neededImports.join(", ")} } from "react";\n`;

        // Find the existing react import and add after it
        const reactImportMatch = content.match(/import[^;]+from\s+["']react["'];?/);
        if (reactImportMatch) {
          const insertIndex = reactImportMatch.index! + reactImportMatch[0].length;
          content =
            content.slice(0, insertIndex) + "\n" + importStatement + content.slice(insertIndex);
        } else {
          // Add at the top
          content = importStatement + content;
        }
      }

      if (content !== originalContent) {
        await writeFile(file, content, "utf-8");
        fixedCount++;
        console.log(`✅ Fixed: ${file}`);
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }

  return fixedCount;
}

async function main() {
  console.log("🚀 React 19 Import Migration Tool");
  console.log("=====================================\n");

  // Analyze first
  const issues = await analyzeReactImports();

  if (issues.length === 0) {
    console.log("✅ No React import issues found!");
    return;
  }

  console.log(`📊 Found ${issues.length} files with React import issues:\n`);

  issues.forEach((issue) => {
    console.log(`📁 ${issue.file}`);
    console.log(`   Issue: ${issue.message}`);
    console.log(`   Matches: ${issue.matches}`);
    console.log(`   Fix: ${issue.fix}`);
    console.log(`   Preview: ${issue.preview}\n`);
  });

  // Fix
  console.log("Starting fixes...\n");
  const fixed = await fixReactImports();

  console.log(`\n🎉 Fixed ${fixed} files!`);
  console.log("Run 'bun run typecheck' to verify the changes.");
}

if (import.meta.main) {
  main().catch(console.error);
}

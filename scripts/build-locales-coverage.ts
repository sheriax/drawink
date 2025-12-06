#!/usr/bin/env bun

import { readdirSync, writeFileSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = resolve(__dirname, "../packages/drawink/locales");

const flatten = (object: Record<string, any> = {}, result: Record<string, any> = {}, extraKey = ""): Record<string, any> => {
  for (const key in object) {
    if (typeof object[key] !== "object") {
      result[extraKey + key] = object[key];
    } else {
      flatten(object[key], result, `${extraKey}${key}.`);
    }
  }
  return result;
};

const files = readdirSync(localesDir);
const locales = files.filter(
  (file) => file !== "README.md" && file !== "percentages.json",
);

const percentages: Record<string, number> = {};

for (const currentLocale of locales) {
  const localeData = JSON.parse(
    readFileSync(resolve(localesDir, currentLocale), "utf-8")
  );
  const data = flatten(localeData);
  const allKeys = Object.keys(data);
  const translatedKeys = allKeys.filter((item) => data[item] !== "");
  const percentage = Math.floor((100 * translatedKeys.length) / allKeys.length);
  percentages[currentLocale.replace(".json", "")] = percentage;
}

writeFileSync(
  resolve(localesDir, "percentages.json"),
  `${JSON.stringify(percentages, null, 2)}\n`,
  "utf8",
);

console.log("✅ Locale percentages updated!");

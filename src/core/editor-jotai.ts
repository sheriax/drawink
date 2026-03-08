// eslint-disable-next-line no-restricted-imports
import { type PrimitiveAtom, type WritableAtom, atom, createStore } from "jotai";
import { createIsolation } from "jotai-scope";

const jotai = createIsolation();

export { atom, type PrimitiveAtom, type WritableAtom };
export const { useAtom, useSetAtom, useAtomValue, useStore } = jotai;
export const EditorJotaiProvider: ReturnType<typeof createIsolation>["Provider"] = jotai.Provider;

export const editorJotaiStore: ReturnType<typeof createStore> = createStore();

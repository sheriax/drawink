// eslint-disable-next-line no-restricted-imports
import {
  type PrimitiveAtom,
  Provider,
  atom,
  createStore,
  useAtom,
  useAtomValue,
  useSetAtom,
} from "jotai";
import { useLayoutEffect } from "react";

export const appJotaiStore = createStore();

export { atom, Provider, useAtom, useAtomValue, useSetAtom };

export const useAtomWithInitialValue = <T, A extends PrimitiveAtom<T>>(
  atom: A,
  initialValue: T | (() => T),
) => {
  const [value, setValue] = useAtom(atom);

  useLayoutEffect(() => {
    if (typeof initialValue === "function") {
      // @ts-ignore
      setValue(initialValue());
    } else {
      setValue(initialValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [value, setValue] as const;
};

import { useLayoutEffect, useState } from "react";

import { THEME } from "@/lib/common";

import { useDrawinkContainer, useEditorInterface } from "../components/App";
import { useUIAppState } from "../context/ui-appState";

export const useCreatePortalContainer = (opts?: {
  className?: string;
  parentSelector?: string;
}) => {
  const [div, setDiv] = useState<HTMLDivElement | null>(null);

  const editorInterface = useEditorInterface();
  const { theme } = useUIAppState();

  const { container: drawinkContainer } = useDrawinkContainer();

  useLayoutEffect(() => {
    if (div) {
      div.className = "";
      div.classList.add("drawink", ...(opts?.className?.split(/\s+/) || []));
      div.classList.toggle("drawink--mobile", editorInterface.formFactor === "phone");
      div.classList.toggle("theme--dark", theme === THEME.DARK);
    }
  }, [div, theme, editorInterface.formFactor, opts?.className]);

  useLayoutEffect(() => {
    const container = opts?.parentSelector
      ? drawinkContainer?.querySelector(opts.parentSelector)
      : document.body;

    if (!container) {
      return;
    }

    const div = document.createElement("div");

    container.appendChild(div);

    setDiv(div);

    return () => {
      container.removeChild(div);
    };
  }, [drawinkContainer, opts?.parentSelector]);

  return div;
};

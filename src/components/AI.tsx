import {
  DiagramToCodePlugin,
  MIME_TYPES,
  TTDDialog,
  exportToBlob,
  getTextFromElements,
} from "@/core";
import { getDataURL } from "@/core/data/blob";

import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

import type { DrawinkImperativeAPI } from "@/core/types";

export const AIComponents = ({
  drawinkAPI,
}: {
  drawinkAPI: DrawinkImperativeAPI;
}) => {
  const textToDiagram = useAction(api.ai.textToDiagram);
  const diagramToCode = useAction(api.ai.diagramToCode);

  return (
    <>
      <DiagramToCodePlugin
        generate={async ({ frame, children }) => {
          const appState = drawinkAPI.getAppState();

          const blob = await exportToBlob({
            elements: children,
            appState: {
              ...appState,
              exportBackground: true,
              viewBackgroundColor: appState.viewBackgroundColor,
            },
            exportingFrame: frame,
            files: drawinkAPI.getFiles(),
            mimeType: MIME_TYPES.jpg,
          });

          const dataURL = await getDataURL(blob);
          const textFromFrameChildren = getTextFromElements(children);

          try {
            const result = await diagramToCode({
              image: dataURL,
              texts: [textFromFrameChildren],
              theme: appState.theme,
            });

            return { html: result.html };
          } catch (error: any) {
            if (error.message?.includes("rate limit")) {
              return {
                html: `<html>
                <body style="margin: 0; text-align: center">
                <div style="display: flex; align-items: center; justify-content: center; flex-direction: column; height: 100vh; padding: 0 60px">
                  <div style="color:red">Too many requests,</br>please try again later!</div>
                </div>
                </body>
                </html>`,
              };
            }
            throw error;
          }
        }}
      />

      <TTDDialog
        onTextSubmit={async (input) => {
          try {
            const result = await textToDiagram({ prompt: input });

            return {
              generatedResponse: result.generatedResponse,
            };
          } catch (error: any) {
            if (error.message?.includes("rate limit")) {
              return {
                error: new Error("Too many requests, please try again later!"),
              };
            }
            if (error.message?.includes("Unauthorized")) {
              return {
                error: new Error("Please sign in to use AI features."),
              };
            }
            return {
              error: new Error(error.message || "Generation failed"),
            };
          }
        }}
      />
    </>
  );
};

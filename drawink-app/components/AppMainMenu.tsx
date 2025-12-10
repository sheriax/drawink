import {
  loginIcon,
  // ExcalLogo,
  eyeIcon,
  ExternalLinkIcon,
} from "@drawink/drawink/components/icons";
import { MainMenu } from "@drawink/drawink/index";
import React from "react";

import { isDevEnv } from "@drawink/common";

import type { Theme } from "@drawink/element/types";

import { LanguageList } from "../app-language/LanguageList";
import { useAuth } from "../auth";

import { saveDebugState } from "./DebugCanvas";

export const AppMainMenu: React.FC<{
  onCollabDialogOpen: () => any;
  isCollaborating: boolean;
  isCollabEnabled: boolean;
  theme: Theme | "system";
  setTheme: (theme: Theme | "system") => void;
  refresh: () => void;
}> = React.memo((props) => {
  const { isAuthenticated, openAuthDialog, signOut, displayName } = useAuth();

  return (
    <MainMenu>
      <MainMenu.DefaultItems.LoadScene />
      <MainMenu.DefaultItems.SaveToActiveFile />
      <MainMenu.DefaultItems.Export />
      <MainMenu.DefaultItems.SaveAsImage />
      {props.isCollabEnabled && (
        <MainMenu.DefaultItems.LiveCollaborationTrigger
          isCollaborating={props.isCollaborating}
          onSelect={() => props.onCollabDialogOpen()}
        />
      )}
      <MainMenu.DefaultItems.CommandPalette className="highlighted" />
      <MainMenu.DefaultItems.SearchMenu />
      <MainMenu.DefaultItems.Help />
      <MainMenu.DefaultItems.ClearCanvas />
      <MainMenu.Separator />
      <MainMenu.DefaultItems.Socials disabled />

      {/* Auth Menu Items */}
      {isAuthenticated ? (
        <>
          <MainMenu.Item icon={loginIcon} onSelect={() => { }}>
            {displayName || "Signed in"}
          </MainMenu.Item>
          <MainMenu.Item icon={ExternalLinkIcon} onSelect={signOut}>
            Sign out
          </MainMenu.Item>
        </>
      ) : (
        <MainMenu.Item
          icon={loginIcon}
          onSelect={openAuthDialog}
          className="highlighted"
        >
          Sign in
        </MainMenu.Item>
      )}

      {isDevEnv() && (
        <MainMenu.Item
          icon={eyeIcon}
          onClick={() => {
            if (window.visualDebug) {
              delete window.visualDebug;
              saveDebugState({ enabled: false });
            } else {
              window.visualDebug = { data: [] };
              saveDebugState({ enabled: true });
            }
            props?.refresh();
          }}
        >
          Visual Debug
        </MainMenu.Item>
      )}
      <MainMenu.Separator />
      <MainMenu.DefaultItems.ToggleTheme
        allowSystemTheme
        theme={props.theme}
        onSelect={props.setTheme}
      />
      <MainMenu.ItemCustom>
        <LanguageList style={{ width: "100%" }} />
      </MainMenu.ItemCustom>
      <MainMenu.DefaultItems.ChangeCanvasBackground />
    </MainMenu>
  );
});

import {
  // loginIcon,
  // ExcalLogo,
  eyeIcon,
} from "@drawink/drawink/components/icons";
import { MainMenu } from "@drawink/drawink/index";
import React from "react";

import { isDevEnv } from "@drawink/common";

import type { Theme } from "@drawink/element/types";

import { LanguageList } from "../app-language/LanguageList";
// import { isDrawinkPlusSignedUser } from "../app_constants";

import { CloudSyncMenuItem } from "./CloudSyncMenuItem";
import { saveDebugState } from "./DebugCanvas";

export const AppMainMenu: React.FC<{
  onCollabDialogOpen: () => any;
  isCollaborating: boolean;
  isCollabEnabled: boolean;
  theme: Theme | "system";
  setTheme: (theme: Theme | "system") => void;
  refresh: () => void;
}> = React.memo((props) => {
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
      {/* Cloud Sync Login/Logout */}
      <CloudSyncMenuItem />
      <MainMenu.Separator />
      {/* Dashboard Link */}
      <MainMenu.ItemLink href="/dashboard">
        Dashboard
      </MainMenu.ItemLink>
      <MainMenu.Separator />
      {/* <MainMenu.ItemLink
        icon={ExcalLogo}
        href={`${
          import.meta.env.
        }/plus?utm_source=drawink&utm_medium=app&utm_content=hamburger`}
        className=""
      >
        Drawink Pro
      </MainMenu.ItemLink> */}
      <MainMenu.DefaultItems.Socials disabled />
      {/* <MainMenu.ItemLink
        icon={loginIcon}
        href={`${import.meta.env.VITE_APP_PLUS_APP}${
          isDrawinkPlusSignedUser ? "" : "/sign-up"
        }?utm_source=signin&utm_medium=app&utm_content=hamburger`}
        className="highlighted"
      >
        {isDrawinkPlusSignedUser ? "Sign in" : "Sign up"}
      </MainMenu.ItemLink> */}
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

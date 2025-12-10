import { useI18n } from "@drawink/drawink/i18n";
import { WelcomeScreen } from "@drawink/drawink/index";
import React from "react";

import { useAuth } from "../auth";
import { loginIcon } from "@drawink/drawink/components/icons";

export const AppWelcomeScreen: React.FC<{
  onCollabDialogOpen: () => any;
  isCollabEnabled: boolean;
}> = React.memo((props) => {
  const { t } = useI18n();
  const { isAuthenticated, openAuthDialog, displayName } = useAuth();

  let headingContent;
  if (isAuthenticated) {
    headingContent = `Welcome back, ${displayName || "friend"}!`;
  } else {
    headingContent = t("welcomeScreen.app.center_heading");
  }

  return (
    <WelcomeScreen>
      <WelcomeScreen.Hints.MenuHint>
        {t("welcomeScreen.app.menuHint")}
      </WelcomeScreen.Hints.MenuHint>
      <WelcomeScreen.Hints.ToolbarHint />
      <WelcomeScreen.Hints.HelpHint />
      <WelcomeScreen.Center>
        <WelcomeScreen.Center.Logo />
        <WelcomeScreen.Center.Heading>
          {headingContent}
        </WelcomeScreen.Center.Heading>
        <WelcomeScreen.Center.Menu>
          <WelcomeScreen.Center.MenuItemLoadScene />
          <WelcomeScreen.Center.MenuItemHelp />
          {props.isCollabEnabled && (
            <WelcomeScreen.Center.MenuItemLiveCollaborationTrigger
              onSelect={() => props.onCollabDialogOpen()}
            />
          )}
          {!isAuthenticated && (
            <WelcomeScreen.Center.MenuItemLink
              href="#"
              shortcut={null}
              icon={loginIcon}
              onClick={(e) => {
                e.preventDefault();
                openAuthDialog();
              }}
            >
              Sign in
            </WelcomeScreen.Center.MenuItemLink>
          )}
        </WelcomeScreen.Center.Menu>
      </WelcomeScreen.Center>
    </WelcomeScreen>
  );
});

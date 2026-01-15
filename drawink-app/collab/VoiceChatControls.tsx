import { FilledButton } from "@drawink/drawink/components/FilledButton";
import { microphoneIcon, microphoneMutedIcon } from "@drawink/drawink/components/icons";
import { useEffect, useState } from "react";

import { VoiceChat } from "./VoiceChat";

import "./VoiceChat.scss";

interface VoiceChatControlsProps {
  voiceChat: VoiceChat | null;
  isCollaborating: boolean;
}

export const VoiceChatControls = ({ voiceChat, isCollaborating }: VoiceChatControlsProps) => {
  console.log("[VoiceChatControls] Render", { hasVoiceChat: !!voiceChat, isCollaborating });
  
  const [isMuted, setIsMuted] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[VoiceChatControls] useEffect triggered", { hasVoiceChat: !!voiceChat, isCollaborating });
    
    if (!voiceChat || !isCollaborating) {
      console.log("[VoiceChatControls] Skipping - no voiceChat or not collaborating");
      return;
    }

    // Check if voice chat is ready
    const ready = voiceChat.isReady();
    console.log("[VoiceChatControls] Voice chat ready check", { ready });
    
    if (ready) {
      setHasPermission(true);
      const muteState = voiceChat.getMuteState();
      setIsMuted(muteState);
      console.log("[VoiceChatControls] Voice chat ready, state set", { hasPermission: true, isMuted: muteState });
    } else {
      setHasPermission(false);
      console.log("[VoiceChatControls] Voice chat not ready, permission set to false");
    }

    // Set up mute state callback
    const handleMuteStateChange = (muted: boolean) => {
      console.log("[VoiceChatControls] Mute state changed callback", { muted });
      setIsMuted(muted);
    };

    // Note: VoiceChat doesn't expose callbacks directly, so we'll handle it via the toggle
    // In a real implementation, you'd want to expose callbacks from VoiceChat
  }, [voiceChat, isCollaborating]);

  const handleToggleMute = () => {
    console.log("[VoiceChatControls] handleToggleMute called", { hasVoiceChat: !!voiceChat });
    
    if (!voiceChat) {
      console.warn("[VoiceChatControls] Cannot toggle mute - no voiceChat");
      return;
    }

    try {
      console.log("[VoiceChatControls] Calling voiceChat.toggleMute()");
      const newMuteState = voiceChat.toggleMute();
      console.log("[VoiceChatControls] Mute toggled successfully", { newMuteState });
      setIsMuted(newMuteState);
      setError(null);
    } catch (err: any) {
      console.error("[VoiceChatControls] Failed to toggle mute:", err);
      setError(err.message || "Failed to toggle microphone");
    }
  };

  if (!isCollaborating || !voiceChat) {
    console.log("[VoiceChatControls] Not rendering - conditions not met", { isCollaborating, hasVoiceChat: !!voiceChat });
    return null;
  }

  // Show permission denied state
  if (hasPermission === false) {
    console.log("[VoiceChatControls] Rendering permission denied state");
    return (
      <div className="VoiceChatControls VoiceChatControls--error">
        <p className="VoiceChatControls__error">
          Microphone permission is required for voice chat
        </p>
      </div>
    );
  }

  // Show error state
  if (error) {
    console.log("[VoiceChatControls] Rendering error state", { error });
    return (
      <div className="VoiceChatControls VoiceChatControls--error">
        <p className="VoiceChatControls__error">{error}</p>
      </div>
    );
  }

  // Show controls
  console.log("[VoiceChatControls] Rendering controls", { isMuted });
  return (
    <div className="VoiceChatControls">
      <FilledButton
        size="large"
        variant="icon"
        label={isMuted ? "Unmute" : "Mute"}
        icon={isMuted ? microphoneMutedIcon : microphoneIcon}
        className={`VoiceChatControls__button ${isMuted ? "VoiceChatControls__button--muted" : ""}`}
        onClick={handleToggleMute}
        title={isMuted ? "Unmute microphone" : "Mute microphone"}
      />
    </div>
  );
};

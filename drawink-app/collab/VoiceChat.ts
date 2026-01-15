import type { Socket } from "socket.io-client";
import type { SocketId } from "@drawink/drawink/types";

import { WS_EVENTS } from "../app_constants";

export interface VoiceChatCallbacks {
  onMuteStateChange?: (isMuted: boolean) => void;
  onError?: (error: Error) => void;
  onPermissionDenied?: () => void;
}

export class VoiceChat {
  private socket: Socket | null = null;
  private roomId: string | null = null;
  private localStream: MediaStream | null = null;
  private peers: Map<SocketId, RTCPeerConnection> = new Map();
  private remoteStreams: Map<SocketId, MediaStream> = new Map();
  private audioElements: Map<SocketId, HTMLAudioElement> = new Map();
  private isMuted: boolean = false;
  private callbacks: VoiceChatCallbacks;
  private isInitialized: boolean = false;

  constructor(callbacks: VoiceChatCallbacks = {}) {
    console.log("[VoiceChat] Constructor called");
    this.callbacks = callbacks;
  }

  async initialize(socket: Socket, roomId: string): Promise<void> {
    console.log("[VoiceChat] initialize called", { roomId, socketId: socket.id, isInitialized: this.isInitialized });

    if (this.isInitialized) {
      console.log("[VoiceChat] Already initialized, skipping");
      return;
    }

    // Check if WebRTC APIs are available
    if (typeof RTCPeerConnection === "undefined") {
      console.error("[VoiceChat] WebRTC is not supported in this browser");
      throw new Error("WebRTC is not supported in this browser");
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("[VoiceChat] getUserMedia is not supported in this browser");
      throw new Error("getUserMedia is not supported in this browser");
    }

    console.log("[VoiceChat] WebRTC APIs available, proceeding with initialization");
    this.socket = socket;
    this.roomId = roomId;

    try {
      console.log("[VoiceChat] Requesting microphone permission...");
      // Request microphone permission and get audio stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      console.log("[VoiceChat] Microphone permission granted, stream obtained", {
        tracks: this.localStream.getTracks().length,
        audioTracks: this.localStream.getAudioTracks().length,
      });

      this.setupSocketListeners();
      this.isInitialized = true;
      console.log("[VoiceChat] Initialization complete");
    } catch (error: any) {
      console.error("[VoiceChat] Failed to initialize voice chat:", error, {
        name: error.name,
        message: error.message,
      });
      // Clean up partial state
      this.socket = null;
      this.roomId = null;

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        console.warn("[VoiceChat] Permission denied, failing gracefully");
        this.callbacks.onPermissionDenied?.();
        // Don't throw for permission errors - just fail silently
        return;
      } else {
        this.callbacks.onError?.(error);
        throw error;
      }
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) {
      console.warn("[VoiceChat] setupSocketListeners called but socket is null");
      return;
    }

    console.log("[VoiceChat] Setting up socket listeners");

    this.socket.on(WS_EVENTS.VOICE_OFFER, async (data: { fromSocketId: string; offer: RTCSessionDescriptionInit }) => {
      console.log("[VoiceChat] Received voice-offer", { fromSocketId: data.fromSocketId });
      await this.handleOffer(data.fromSocketId as SocketId, data.offer);
    });

    this.socket.on(WS_EVENTS.VOICE_ANSWER, async (data: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => {
      console.log("[VoiceChat] Received voice-answer", { fromSocketId: data.fromSocketId });
      await this.handleAnswer(data.fromSocketId as SocketId, data.answer);
    });

    this.socket.on(WS_EVENTS.VOICE_ICE_CANDIDATE, async (data: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      console.log("[VoiceChat] Received voice-ice-candidate", { fromSocketId: data.fromSocketId });
      await this.handleIceCandidate(data.fromSocketId as SocketId, data.candidate);
    });

    this.socket.on(WS_EVENTS.VOICE_MUTE_STATE, (data: { socketId: string; isMuted: boolean }) => {
      console.log("[VoiceChat] Received voice-mute-state", { socketId: data.socketId, isMuted: data.isMuted });
    });

    console.log("[VoiceChat] Socket listeners set up");
  }

  async addPeer(socketId: SocketId, isInitiator: boolean): Promise<void> {
    console.log("[VoiceChat] addPeer called", { socketId, isInitiator, hasPeer: this.peers.has(socketId), hasStream: !!this.localStream, hasSocket: !!this.socket, hasRoomId: !!this.roomId, isInitialized: this.isInitialized });

    if (this.peers.has(socketId) || !this.localStream || !this.socket || !this.roomId || !this.isInitialized) {
      console.log("[VoiceChat] addPeer skipped - conditions not met");
      return;
    }

    console.log("[VoiceChat] Creating RTCPeerConnection for", socketId);
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    // Add local audio tracks to peer connection
    const audioTracks = this.localStream.getAudioTracks();
    console.log("[VoiceChat] Adding audio tracks to peer connection", { trackCount: audioTracks.length });
    audioTracks.forEach((track) => {
      peerConnection.addTrack(track, this.localStream!);
      console.log("[VoiceChat] Added track", { trackId: track.id, enabled: track.enabled, kind: track.kind });
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log("[VoiceChat] Received remote track", { socketId, trackCount: event.streams.length });
      const remoteStream = event.streams[0];
      this.remoteStreams.set(socketId, remoteStream);
      this.playRemoteAudio(socketId, remoteStream);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        console.log("[VoiceChat] ICE candidate generated", { socketId, candidate: event.candidate.candidate });
        this.socket.emit(WS_EVENTS.VOICE_ICE_CANDIDATE, {
          targetSocketId: socketId,
          candidate: event.candidate,
        });
      } else if (!event.candidate) {
        console.log("[VoiceChat] ICE gathering complete", { socketId });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`[VoiceChat] Connection state changed for ${socketId}:`, peerConnection.connectionState);
      if (peerConnection.connectionState === "failed" || peerConnection.connectionState === "disconnected") {
        console.log(`[VoiceChat] Connection failed/disconnected for ${socketId}, removing peer`);
        this.removePeer(socketId);
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log(`[VoiceChat] ICE connection state changed for ${socketId}:`, peerConnection.iceConnectionState);
    };

    this.peers.set(socketId, peerConnection);
    console.log("[VoiceChat] Peer connection created and stored", { socketId, totalPeers: this.peers.size });

    if (isInitiator) {
      // Create and send offer
      try {
        console.log("[VoiceChat] Creating offer as initiator", { socketId });
        const offer = await peerConnection.createOffer();
        console.log("[VoiceChat] Offer created", { socketId, offerType: offer.type });
        await peerConnection.setLocalDescription(offer);
        console.log("[VoiceChat] Local description set, sending offer", { socketId });
        this.socket.emit(WS_EVENTS.VOICE_OFFER, {
          targetSocketId: socketId,
          offer: offer,
        });
        console.log("[VoiceChat] Offer sent", { socketId });
      } catch (error) {
        console.error(`[VoiceChat] Failed to create offer for ${socketId}:`, error);
        this.removePeer(socketId);
      }
    }
  }

  private async handleOffer(fromSocketId: SocketId, offer: RTCSessionDescriptionInit): Promise<void> {
    console.log("[VoiceChat] handleOffer called", { fromSocketId, hasLocalStream: !!this.localStream, hasSocket: !!this.socket, isInitialized: this.isInitialized });

    if (!this.localStream || !this.socket || !this.isInitialized) {
      console.warn("[VoiceChat] handleOffer skipped - not ready");
      return;
    }

    // If we don't have a peer connection yet, create one
    if (!this.peers.has(fromSocketId)) {
      console.log("[VoiceChat] No peer connection exists, creating one", { fromSocketId });
      await this.addPeer(fromSocketId, false);
    }

    const peerConnection = this.peers.get(fromSocketId);
    if (!peerConnection) {
      console.error("[VoiceChat] Peer connection not found after addPeer", { fromSocketId });
      return;
    }

    try {
      console.log("[VoiceChat] Setting remote description from offer", { fromSocketId });
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("[VoiceChat] Creating answer", { fromSocketId });
      const answer = await peerConnection.createAnswer();
      console.log("[VoiceChat] Answer created, setting local description", { fromSocketId, answerType: answer.type });
      await peerConnection.setLocalDescription(answer);
      console.log("[VoiceChat] Sending answer", { fromSocketId });
      this.socket.emit(WS_EVENTS.VOICE_ANSWER, {
        targetSocketId: fromSocketId,
        answer: answer,
      });
      console.log("[VoiceChat] Answer sent", { fromSocketId });
    } catch (error) {
      console.error(`[VoiceChat] Failed to handle offer from ${fromSocketId}:`, error);
      this.removePeer(fromSocketId);
    }
  }

  private async handleAnswer(fromSocketId: SocketId, answer: RTCSessionDescriptionInit): Promise<void> {
    console.log("[VoiceChat] handleAnswer called", { fromSocketId });
    const peerConnection = this.peers.get(fromSocketId);
    if (!peerConnection) {
      console.warn("[VoiceChat] handleAnswer - peer connection not found", { fromSocketId });
      return;
    }

    try {
      console.log("[VoiceChat] Setting remote description from answer", { fromSocketId });
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log("[VoiceChat] Answer processed successfully", { fromSocketId });
    } catch (error) {
      console.error(`[VoiceChat] Failed to handle answer from ${fromSocketId}:`, error);
      this.removePeer(fromSocketId);
    }
  }

  private async handleIceCandidate(fromSocketId: SocketId, candidate: RTCIceCandidateInit): Promise<void> {
    console.log("[VoiceChat] handleIceCandidate called", { fromSocketId, candidate: candidate.candidate });
    const peerConnection = this.peers.get(fromSocketId);
    if (!peerConnection) {
      console.warn("[VoiceChat] handleIceCandidate - peer connection not found", { fromSocketId });
      return;
    }

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("[VoiceChat] ICE candidate added successfully", { fromSocketId });
    } catch (error) {
      console.error(`[VoiceChat] Failed to add ICE candidate from ${fromSocketId}:`, error);
    }
  }

  private playRemoteAudio(socketId: SocketId, stream: MediaStream): void {
    console.log("[VoiceChat] playRemoteAudio called", { socketId, trackCount: stream.getTracks().length });
    // Create or reuse audio element for this peer
    let audioElement = this.audioElements.get(socketId);
    if (!audioElement) {
      console.log("[VoiceChat] Creating new audio element", { socketId });
      audioElement = new Audio();
      audioElement.autoplay = true;
      audioElement.volume = 1.0;
      
      // Append to DOM (hidden) - some browsers require this for playback
      audioElement.style.display = 'none';
      document.body.appendChild(audioElement);
      
      audioElement.srcObject = stream;
      this.audioElements.set(socketId, audioElement);

      audioElement.onloadedmetadata = () => {
        console.log("[VoiceChat] Audio metadata loaded", { socketId });
      };

      audioElement.onplay = () => {
        console.log("[VoiceChat] Audio started playing", { socketId });
      };

      audioElement.onerror = (error) => {
        console.error("[VoiceChat] Audio element error", { socketId, error });
      };

      // Explicitly call play() with promise handling for autoplay policy
      audioElement.play().then(() => {
        console.log("[VoiceChat] Audio play() succeeded", { socketId });
      }).catch((error) => {
        console.warn("[VoiceChat] Audio play() blocked by autoplay policy", { socketId, error: error.message });
        // User interaction may be required - audio will play when user interacts with page
      });
    } else {
      console.log("[VoiceChat] Reusing existing audio element", { socketId });
      audioElement.srcObject = stream;
      audioElement.play().catch((error) => {
        console.warn("[VoiceChat] Audio replay blocked", { socketId, error: error.message });
      });
    }
  }

  removePeer(socketId: SocketId): void {
    console.log("[VoiceChat] removePeer called", { socketId });
    const peerConnection = this.peers.get(socketId);
    if (peerConnection) {
      console.log("[VoiceChat] Closing peer connection", { socketId, connectionState: peerConnection.connectionState });
      peerConnection.close();
      this.peers.delete(socketId);
      console.log("[VoiceChat] Peer connection removed", { socketId, remainingPeers: this.peers.size });
    }

    const audioElement = this.audioElements.get(socketId);
    if (audioElement) {
      console.log("[VoiceChat] Stopping audio element", { socketId });
      audioElement.pause();
      audioElement.srcObject = null;
      // Remove from DOM since we appended it there
      if (audioElement.parentNode) {
        audioElement.parentNode.removeChild(audioElement);
      }
      this.audioElements.delete(socketId);
    }

    this.remoteStreams.delete(socketId);
    console.log("[VoiceChat] Peer cleanup complete", { socketId });
  }

  toggleMute(): boolean {
    console.log("[VoiceChat] toggleMute called", { hasStream: !!this.localStream, isInitialized: this.isInitialized, currentMuteState: this.isMuted });

    if (!this.localStream || !this.isInitialized) {
      console.warn("[VoiceChat] toggleMute failed - not ready");
      return false;
    }

    this.isMuted = !this.isMuted;
    const tracks = this.localStream.getAudioTracks();
    console.log("[VoiceChat] Toggling mute state", { newMuteState: this.isMuted, trackCount: tracks.length });

    tracks.forEach((track) => {
      track.enabled = !this.isMuted;
      console.log("[VoiceChat] Track mute state updated", { trackId: track.id, enabled: track.enabled });
    });

    // Broadcast mute state to room
    if (this.socket && this.roomId) {
      console.log("[VoiceChat] Broadcasting mute state", { roomId: this.roomId, isMuted: this.isMuted });
      this.socket.emit(WS_EVENTS.VOICE_MUTE_STATE, {
        roomID: this.roomId,
        isMuted: this.isMuted,
      });
    }

    this.callbacks.onMuteStateChange?.(this.isMuted);
    console.log("[VoiceChat] Mute toggle complete", { isMuted: this.isMuted });
    return this.isMuted;
  }

  getMuteState(): boolean {
    console.log("[VoiceChat] getMuteState called", { isMuted: this.isMuted });
    return this.isMuted;
  }

  cleanup(): void {
    console.log("[VoiceChat] cleanup called", { peerCount: this.peers.size, hasStream: !!this.localStream, hasSocket: !!this.socket });

    // Close all peer connections
    this.peers.forEach((peerConnection, socketId) => {
      console.log("[VoiceChat] Removing peer during cleanup", { socketId });
      this.removePeer(socketId);
    });

    // Stop local stream
    if (this.localStream) {
      const tracks = this.localStream.getTracks();
      console.log("[VoiceChat] Stopping local stream tracks", { trackCount: tracks.length });
      tracks.forEach((track) => {
        track.stop();
        console.log("[VoiceChat] Track stopped", { trackId: track.id });
      });
      this.localStream = null;
    }

    // Remove socket listeners
    if (this.socket) {
      console.log("[VoiceChat] Removing socket listeners");
      this.socket.off(WS_EVENTS.VOICE_OFFER);
      this.socket.off(WS_EVENTS.VOICE_ANSWER);
      this.socket.off(WS_EVENTS.VOICE_ICE_CANDIDATE);
      this.socket.off(WS_EVENTS.VOICE_MUTE_STATE);
    }

    this.socket = null;
    this.roomId = null;
    this.isInitialized = false;
    this.isMuted = false;
    console.log("[VoiceChat] Cleanup complete");
  }

  isReady(): boolean {
    const ready = this.isInitialized && this.localStream !== null;
    console.log("[VoiceChat] isReady called", { ready, isInitialized: this.isInitialized, hasStream: !!this.localStream });
    return ready;
  }
}

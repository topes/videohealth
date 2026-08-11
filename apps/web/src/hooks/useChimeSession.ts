import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
  type AudioVideoObserver,
  type ContentShareObserver,
  type VideoTileState,
} from 'amazon-chime-sdk-js';

interface UseChimeSessionOptions {
  meeting: unknown;
  attendee: unknown;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteContainerRef: React.RefObject<HTMLDivElement>;
  screenShareRef: React.RefObject<HTMLVideoElement>;
}

interface RemoteTileEntry {
  tileId: number;
  el: HTMLDivElement;
  video: HTMLVideoElement;
  label: HTMLDivElement;
}

export interface ChimeSessionState {
  ready: boolean;
  error: string | null;
  muted: boolean;
  videoOn: boolean;
  sharingScreen: boolean;
  isReceivingScreenShare: boolean;
  canShareScreen: boolean;
  toggleMute: () => void;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  leave: () => void;
}

export function detectScreenShareSupport(): boolean {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) return false;
  if (typeof navigator.mediaDevices.getDisplayMedia !== 'function') return false;
  // iOS/iPadOS Safari expose no reliable screen capture for arbitrary web apps.
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return false;
  return true;
}

export function useChimeSession({
  meeting,
  attendee,
  localVideoRef,
  remoteContainerRef,
  screenShareRef,
}: UseChimeSessionOptions): ChimeSessionState {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [isReceivingScreenShare, setIsReceivingScreenShare] = useState(false);
  const [canShareScreen] = useState(() => detectScreenShareSupport());

  const sessionRef = useRef<DefaultMeetingSession | null>(null);
  const remoteTiles = useRef<Map<number, RemoteTileEntry>>(new Map());
  const localAttendeeIdRef = useRef<string | null>(null);
  const contentTileIdRef = useRef<number | null>(null);
  /** User intent: camera should be on when not screensharing. */
  const wantsVideoRef = useRef(true);
  const videoOnRef = useRef(false);

  useEffect(() => {
    videoOnRef.current = videoOn;
  }, [videoOn]);

  const startLocalCamera = useCallback(async (): Promise<boolean> => {
    const session = sessionRef.current;
    if (!session) return false;
    const av = session.audioVideo;
    try {
      const cams = await session.deviceController.listVideoInputDevices();
      if (!cams[0]) {
        setError('No camera found');
        return false;
      }
      await av.startVideoInput(cams[0].deviceId);
      av.startLocalVideoTile();
      setVideoOn(true);
      videoOnRef.current = true;
      return true;
    } catch (err) {
      console.warn('Failed to start camera', err);
      setError(err instanceof Error ? err.message : String(err));
      setVideoOn(false);
      videoOnRef.current = false;
      return false;
    }
  }, []);

  const stopLocalCamera = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    const av = session.audioVideo;
    try {
      av.stopLocalVideoTile();
      await av.stopVideoInput();
    } catch {
      /* noop */
    }
    setVideoOn(false);
    videoOnRef.current = false;
  }, []);

  useEffect(() => {
    if (!meeting || !attendee) return;
    let disposed = false;

    (async () => {
      try {
        const logger = new ConsoleLogger('VideoHealth', LogLevel.WARN);
        const deviceController = new DefaultDeviceController(logger);
        const configuration = new MeetingSessionConfiguration(meeting, attendee);
        localAttendeeIdRef.current = configuration.credentials?.attendeeId ?? null;
        const session = new DefaultMeetingSession(configuration, logger, deviceController);
        sessionRef.current = session;

        const av = session.audioVideo;

        const isLocalContentTile = (tileState: VideoTileState) => {
          const localId = localAttendeeIdRef.current;
          if (!localId || !tileState.boundAttendeeId) return false;
          return (
            tileState.boundAttendeeId === `${localId}#content` ||
            tileState.boundAttendeeId.startsWith(`${localId}#`)
          );
        };

        const observer: AudioVideoObserver = {
          audioVideoDidStart: () => {
            if (!disposed) setReady(true);
          },
          audioVideoDidStop: () => {
            if (!disposed) setReady(false);
          },
          videoTileDidUpdate: (tileState: VideoTileState) => {
            if (tileState.localTile && !tileState.isContent) {
              if (tileState.tileId != null && localVideoRef.current) {
                av.bindVideoElement(tileState.tileId, localVideoRef.current);
              }
              return;
            }

            if (tileState.isContent) {
              if (tileState.tileId == null || !tileState.boundAttendeeId) return;
              // Don't mirror our own screenshare into the main receive surface.
              if (isLocalContentTile(tileState)) return;
              if (screenShareRef.current) {
                contentTileIdRef.current = tileState.tileId;
                av.bindVideoElement(tileState.tileId, screenShareRef.current);
                setIsReceivingScreenShare(true);
              }
              return;
            }

            if (!tileState.boundAttendeeId || tileState.tileId == null) return;
            const container = remoteContainerRef.current;
            if (!container) return;

            const boundExternal = tileState.boundExternalUserId ?? undefined;
            let entry = remoteTiles.current.get(tileState.tileId);
            if (!entry) {
              const el = document.createElement('div');
              el.className = 'room-remote-tile';
              const video = document.createElement('video');
              video.autoplay = true;
              video.playsInline = true;
              const label = document.createElement('div');
              label.className = 'room-remote-label';
              label.textContent = decodeExternalUserId(boundExternal) ?? 'Guest';
              el.appendChild(video);
              el.appendChild(label);
              container.appendChild(el);
              entry = { tileId: tileState.tileId, el, video, label };
              remoteTiles.current.set(tileState.tileId, entry);
            }
            entry.label.textContent = decodeExternalUserId(boundExternal) ?? 'Guest';
            av.bindVideoElement(tileState.tileId, entry.video);
          },
          videoTileWasRemoved: (tileId: number) => {
            if (contentTileIdRef.current === tileId) {
              contentTileIdRef.current = null;
              setIsReceivingScreenShare(false);
            }
            const entry = remoteTiles.current.get(tileId);
            if (entry) {
              entry.el.remove();
              remoteTiles.current.delete(tileId);
            }
          },
        };

        const contentObserver: ContentShareObserver = {
          contentShareDidStart: () => {
            setSharingScreen(true);
          },
          contentShareDidStop: () => {
            setSharingScreen(false);
            // Browser "Stop sharing" UI also lands here — restore camera if user still wants it.
            if (!disposed && wantsVideoRef.current && !videoOnRef.current) {
              void startLocalCamera();
            }
          },
        };

        av.addObserver(observer);
        av.addContentShareObserver(contentObserver);

        const audioInputs = await deviceController.listAudioInputDevices();
        if (audioInputs[0]) await av.startAudioInput(audioInputs[0].deviceId);
        const audioOutputs = await deviceController.listAudioOutputDevices();
        if (audioOutputs[0]) {
          try {
            await av.chooseAudioOutput(audioOutputs[0].deviceId);
          } catch {
            /* ignore in browsers without setSinkId */
          }
        }

        av.start();

        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        document.body.appendChild(audioEl);
        await av.bindAudioElement(audioEl);

        if (!disposed && wantsVideoRef.current) {
          await startLocalCamera();
        }
      } catch (err) {
        console.error(err);
        if (!disposed) setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      disposed = true;
      const session = sessionRef.current;
      if (session) {
        try {
          session.audioVideo.stopLocalVideoTile();
        } catch {
          /* noop */
        }
        try {
          session.audioVideo.stopContentShare();
        } catch {
          /* noop */
        }
        try {
          session.audioVideo.stop();
        } catch {
          /* noop */
        }
      }
      remoteTiles.current.forEach((t) => t.el.remove());
      remoteTiles.current.clear();
      contentTileIdRef.current = null;
      sessionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting, attendee]);

  const toggleMute = useCallback(() => {
    const av = sessionRef.current?.audioVideo;
    if (!av) return;
    if (av.realtimeIsLocalAudioMuted()) {
      av.realtimeUnmuteLocalAudio();
      setMuted(false);
    } else {
      av.realtimeMuteLocalAudio();
      setMuted(true);
    }
  }, []);

  const toggleVideo = useCallback(async () => {
    if (videoOnRef.current) {
      wantsVideoRef.current = false;
      await stopLocalCamera();
    } else {
      wantsVideoRef.current = true;
      await startLocalCamera();
    }
  }, [startLocalCamera, stopLocalCamera]);

  const toggleScreenShare = useCallback(async () => {
    const av = sessionRef.current?.audioVideo;
    if (!av) return;

    if (sharingScreen) {
      try {
        await av.stopContentShare();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
      // contentShareDidStop restores camera when wantsVideoRef is true
      setSharingScreen(false);
      return;
    }

    if (!detectScreenShareSupport()) {
      setError('Screen sharing isn’t supported on this device. Use a desktop browser.');
      return;
    }

    try {
      await av.startContentShareFromScreenCapture();
      setSharingScreen(true);
      setError(null);
      // Some browsers/devices drop the camera when capture starts — heal after a beat if needed.
      window.setTimeout(() => {
        if (wantsVideoRef.current && !videoOnRef.current) {
          void startLocalCamera();
        }
      }, 500);
    } catch (err) {
      setSharingScreen(false);
      const message = err instanceof Error ? err.message : String(err);
      setError(
        /NotAllowedError|Permission|denied/i.test(message)
          ? 'Screen share was blocked. Allow screen capture and try again.'
          : /getDisplayMedia|not supported|undefined/i.test(message)
            ? 'Screen sharing isn’t supported on this device. Use a desktop browser.'
            : message,
      );
      if (wantsVideoRef.current && !videoOnRef.current) {
        await startLocalCamera();
      }
    }
  }, [sharingScreen, startLocalCamera]);

  const leave = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    try {
      session.audioVideo.stopLocalVideoTile();
      session.audioVideo.stopContentShare();
      session.audioVideo.stop();
    } catch {
      /* noop */
    }
  }, []);

  return {
    ready,
    error,
    muted,
    videoOn,
    sharingScreen,
    isReceivingScreenShare,
    canShareScreen,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    leave,
  };
}

function decodeExternalUserId(id: string | undefined): string | null {
  if (!id) return null;
  const idx = id.indexOf('#');
  return idx >= 0 ? id.slice(idx + 1) : id;
}

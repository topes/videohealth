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
  externalUserId?: string;
}

export interface ChimeSessionState {
  ready: boolean;
  error: string | null;
  muted: boolean;
  videoOn: boolean;
  sharingScreen: boolean;
  isReceivingScreenShare: boolean;
  toggleMute: () => void;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  leave: () => void;
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

  const sessionRef = useRef<DefaultMeetingSession | null>(null);
  const remoteTiles = useRef<Map<number, RemoteTileEntry>>(new Map());

  useEffect(() => {
    if (!meeting || !attendee) return;
    let disposed = false;

    (async () => {
      try {
        const logger = new ConsoleLogger('VideoHealth', LogLevel.WARN);
        const deviceController = new DefaultDeviceController(logger);
        const configuration = new MeetingSessionConfiguration(meeting, attendee);
        const session = new DefaultMeetingSession(configuration, logger, deviceController);
        sessionRef.current = session;

        const av = session.audioVideo;

        const observer: AudioVideoObserver = {
          audioVideoDidStart: () => {
            if (!disposed) setReady(true);
          },
          audioVideoDidStop: () => {
            if (!disposed) setReady(false);
          },
          videoTileDidUpdate: (tileState: VideoTileState) => {
            if (
              !tileState.boundAttendeeId ||
              tileState.localTile ||
              tileState.isContent
            ) {
              if (tileState.localTile && tileState.tileId != null && localVideoRef.current) {
                av.bindVideoElement(tileState.tileId, localVideoRef.current);
              }
              if (tileState.isContent && tileState.tileId != null && screenShareRef.current) {
                av.bindVideoElement(tileState.tileId, screenShareRef.current);
                setIsReceivingScreenShare(true);
              }
              return;
            }
            if (tileState.tileId == null) return;
            const container = remoteContainerRef.current;
            if (!container) return;

            const boundExternal = tileState.boundExternalUserId ?? undefined;
            let entry = remoteTiles.current.get(tileState.tileId);
            if (!entry) {
              const el = document.createElement('div');
              el.style.position = 'relative';
              el.style.background = '#000';
              el.style.borderRadius = '8px';
              el.style.overflow = 'hidden';
              el.style.aspectRatio = '16/9';
              const video = document.createElement('video');
              video.autoplay = true;
              video.playsInline = true;
              video.style.width = '100%';
              video.style.height = '100%';
              video.style.objectFit = 'cover';
              const label = document.createElement('div');
              label.style.position = 'absolute';
              label.style.left = '8px';
              label.style.bottom = '8px';
              label.style.padding = '2px 8px';
              label.style.background = 'rgba(0,0,0,0.5)';
              label.style.color = '#fff';
              label.style.fontSize = '12px';
              label.style.borderRadius = '999px';
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
            const entry = remoteTiles.current.get(tileId);
            if (entry) {
              entry.el.remove();
              remoteTiles.current.delete(tileId);
            }
          },
        };

        const contentObserver: ContentShareObserver = {
          contentShareDidStop: () => {
            setIsReceivingScreenShare(false);
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
          session.audioVideo.stop();
        } catch {
          /* noop */
        }
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
      }
      remoteTiles.current.forEach((t) => t.el.remove());
      remoteTiles.current.clear();
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
    const session = sessionRef.current;
    if (!session) return;
    const av = session.audioVideo;
    if (videoOn) {
      av.stopLocalVideoTile();
      await av.stopVideoInput();
      setVideoOn(false);
    } else {
      const cams = await session.deviceController.listVideoInputDevices();
      if (!cams[0]) {
        setError('No camera found');
        return;
      }
      await av.startVideoInput(cams[0].deviceId);
      av.startLocalVideoTile();
      setVideoOn(true);
    }
  }, [videoOn]);

  const toggleScreenShare = useCallback(async () => {
    const av = sessionRef.current?.audioVideo;
    if (!av) return;
    if (sharingScreen) {
      await av.stopContentShare();
      setSharingScreen(false);
    } else {
      try {
        await av.startContentShareFromScreenCapture();
        setSharingScreen(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }, [sharingScreen]);

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

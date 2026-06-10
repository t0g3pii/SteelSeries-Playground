import type { ScreenHandler } from "../gamesense/client.js";
import {
  resolveMediaAppIconId,
  resolveMediaAppLabel,
  supportsMediaTimelineDisplay,
  type MediaAppIconId,
} from "../oled/app-icons.js";
import {
  buildMediaFrame,
  MEDIA_MARQUEE_PIXELS_PER_SECOND,
} from "../oled/media-frame.js";
import {
  advancePlaybackDisplayMs,
  formatMediaTimeline,
  hasValidMediaTimeline,
  mediaTimelineTrackKey,
} from "../oled/media-timeline.js";
import { getBitmapScreenHandlers } from "../oled/renderer.js";
import {
  queryWindowsMediaSession,
  type WindowsMediaSession,
} from "../windows/media-session.js";
import type { OledFrameKind } from "../oled/preview.js";
import type {
  DisplayFrame,
  DisplayModule,
  DisplayRotationEventId,
  ModuleRotationSettingDef,
} from "./types.js";

/** OLED + GSMTC + Marquee: alles 1×/s (schont GameDAC). */
export const MEDIA_REFRESH_INTERVAL_MS = 1_000;

export interface MediaNowPlaying {
  available: boolean;
  title: string;
  artist: string;
  album: string;
  status: string;
  appName: string;
  appIcon: MediaAppIconId;
  appLabel: string;
  hasTimeline: boolean;
  positionMs: number;
  durationMs: number;
  timeline: string | null;
  error: string | null;
}

function timelineForPosition(
  session: WindowsMediaSession,
  positionMs: number,
): string | null {
  if (
    !supportsMediaTimelineDisplay(session.appName) ||
    !hasValidMediaTimeline(session.hasTimeline, session.durationMs)
  ) {
    return null;
  }
  return formatMediaTimeline(positionMs, session.durationMs);
}

function toNowPlaying(
  session: WindowsMediaSession,
  displayPositionMs: number,
): MediaNowPlaying {
  return {
    available: session.available,
    title: session.title,
    artist: session.artist,
    album: session.album,
    status: session.status,
    appName: session.appName,
    appIcon: resolveMediaAppIconId(session.appName),
    appLabel: resolveMediaAppLabel(session.appName),
    hasTimeline: session.hasTimeline,
    positionMs: displayPositionMs,
    durationMs: session.durationMs,
    timeline: timelineForPosition(session, displayPositionMs),
    error: session.error ?? null,
  };
}

export class MediaModule implements DisplayModule {
  readonly id = "media";
  readonly name = "Now Playing";
  readonly description = "Aktueller Medientitel von Windows (Spotify, Jellyfin, …).";
  readonly supportsRotation = true;
  readonly rotationEvents: DisplayRotationEventId[] = ["media:track-changed"];
  readonly rotationSettings: ModuleRotationSettingDef[] = [
    {
      id: "media:track-changed",
      label: "Bei neuem Song priorisieren",
      description:
        "Unterbricht die Rotation und zeigt Now Playing für die Event-Dauer.",
      defaultEnabled: true,
    },
  ];
  readonly preferredRefreshIntervalMs = MEDIA_REFRESH_INTERVAL_MS;

  private cachedSession: WindowsMediaSession = {
    available: false,
    title: "",
    artist: "",
    album: "",
    status: "none",
    appName: "",
    thumbnailBase64: null,
    hasTimeline: false,
    positionMs: 0,
    durationMs: 0,
    timelineUpdatedAtMs: 0,
  };

  private cached: MediaNowPlaying = toNowPlaying(this.cachedSession, 0);
  private playbackDisplayMs = 0;
  private timelineTrackKey = "";
  private rotationEventTrackKey = "";
  private marqueeScrollPx = 0;

  getScreenHandlers(): ScreenHandler[] {
    return getBitmapScreenHandlers();
  }

  private tickPlaybackPosition(session: WindowsMediaSession): void {
    const trackKey = mediaTimelineTrackKey(session.title, session.durationMs);
    const trackChanged = trackKey !== this.timelineTrackKey;
    if (trackChanged) {
      this.timelineTrackKey = trackKey;
    }

    this.playbackDisplayMs = advancePlaybackDisplayMs(
      this.playbackDisplayMs,
      session.positionMs,
      session.durationMs,
      session.status,
      trackChanged,
    );
  }

  async fetchNowPlaying(): Promise<MediaNowPlaying> {
    this.cachedSession = await queryWindowsMediaSession();
    this.tickPlaybackPosition(this.cachedSession);
    this.cached = toNowPlaying(this.cachedSession, this.playbackDisplayMs);
    return this.cached;
  }

  async getFrame(): Promise<DisplayFrame> {
    this.cachedSession = await queryWindowsMediaSession();
    this.tickPlaybackPosition(this.cachedSession);
    this.marqueeScrollPx += MEDIA_MARQUEE_PIXELS_PER_SECOND;

    const frame = buildMediaFrame({
      session: this.cachedSession,
      timelinePositionMs: this.playbackDisplayMs,
      marqueeScrollPx: this.marqueeScrollPx,
    });
    this.cached = toNowPlaying(this.cachedSession, this.playbackDisplayMs);
    return frame;
  }

  getCachedNowPlaying(): MediaNowPlaying {
    return toNowPlaying(this.cachedSession, this.playbackDisplayMs);
  }

  getFrameKind(): OledFrameKind {
    return "media";
  }

  async getModuleData(): Promise<MediaNowPlaying> {
    return this.fetchNowPlaying();
  }

  async pollRotationEvent(): Promise<DisplayRotationEventId | null> {
    const session = await queryWindowsMediaSession();
    const trackKey = mediaTimelineTrackKey(session.title, session.durationMs);

    if (
      session.available &&
      this.rotationEventTrackKey !== "" &&
      trackKey !== this.rotationEventTrackKey
    ) {
      this.rotationEventTrackKey = trackKey;
      return "media:track-changed";
    }

    this.rotationEventTrackKey = trackKey;
    return null;
  }
}

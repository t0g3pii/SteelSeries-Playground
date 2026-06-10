import type {
  DisplayRotationConfig,
  DisplayRotationEventId,
} from "../modules/types.js";
import { ROTATION_EVENT_TARGETS } from "../modules/types.js";

export interface DisplayRotationStatus {
  active: boolean;
  moduleIds: string[];
  intervalMs: number;
  eventHoldMs: number;
  events: DisplayRotationEventId[];
  currentIndex: number;
  currentModuleId: string | null;
  eventHoldUntil: string | null;
}

export class DisplayRotationController {
  private config: DisplayRotationConfig | null = null;
  private currentIndex = 0;
  private slotStartedAt = 0;
  private eventHoldUntil: number | null = null;
  private eventTargetModuleId: string | null = null;

  getStatus(): DisplayRotationStatus | null {
    if (!this.config) {
      return null;
    }

    return {
      active: true,
      moduleIds: [...this.config.moduleIds],
      intervalMs: this.config.intervalMs,
      eventHoldMs: this.config.eventHoldMs,
      events: [...this.config.events],
      currentIndex: this.currentIndex,
      currentModuleId: this.resolveActiveModuleId(),
      eventHoldUntil:
        this.eventHoldUntil !== null
          ? new Date(this.eventHoldUntil).toISOString()
          : null,
    };
  }

  start(config: DisplayRotationConfig): void {
    if (config.moduleIds.length === 0) {
      throw new Error("Rotations-Warteschlange ist leer");
    }

    this.config = this.normalizeConfig(config);
    this.currentIndex = 0;
    this.slotStartedAt = Date.now();
    this.eventHoldUntil = null;
    this.eventTargetModuleId = null;
  }

  /** Live-Update — behält aktuelles Modul wenn möglich. */
  update(config: DisplayRotationConfig): void {
    if (config.moduleIds.length === 0) {
      throw new Error("Rotations-Warteschlange ist leer");
    }

    const previousActiveId = this.resolveActiveModuleId();
    const previousIndex = this.currentIndex;

    this.config = this.normalizeConfig(config);

    if (previousActiveId) {
      const nextIndex = this.config.moduleIds.indexOf(previousActiveId);
      if (nextIndex >= 0) {
        this.currentIndex = nextIndex;
      } else {
        this.currentIndex = Math.min(
          previousIndex,
          this.config.moduleIds.length - 1,
        );
        this.slotStartedAt = Date.now();
      }
    } else {
      this.currentIndex = Math.min(
        this.currentIndex,
        this.config.moduleIds.length - 1,
      );
    }

    if (
      this.eventTargetModuleId &&
      !this.config.moduleIds.includes(this.eventTargetModuleId)
    ) {
      this.eventHoldUntil = null;
      this.eventTargetModuleId = null;
    }
  }

  private normalizeConfig(
    config: DisplayRotationConfig,
  ): DisplayRotationConfig {
    return {
      moduleIds: [...config.moduleIds],
      intervalMs: Math.max(1_000, config.intervalMs),
      eventHoldMs: Math.max(1_000, config.eventHoldMs),
      events: [...config.events],
    };
  }

  stop(): void {
    this.config = null;
    this.currentIndex = 0;
    this.slotStartedAt = 0;
    this.eventHoldUntil = null;
    this.eventTargetModuleId = null;
  }

  isActive(): boolean {
    return this.config !== null;
  }

  resolveActiveModuleId(): string | null {
    if (!this.config) {
      return null;
    }

    const now = Date.now();

    if (
      this.eventHoldUntil !== null &&
      now < this.eventHoldUntil &&
      this.eventTargetModuleId
    ) {
      return this.eventTargetModuleId;
    }

    if (this.eventHoldUntil !== null && now >= this.eventHoldUntil) {
      this.eventHoldUntil = null;
      this.eventTargetModuleId = null;
      this.slotStartedAt = now;
    }

    if (
      this.config.moduleIds.length > 1 &&
      now - this.slotStartedAt >= this.config.intervalMs
    ) {
      this.currentIndex =
        (this.currentIndex + 1) % this.config.moduleIds.length;
      this.slotStartedAt = now;
    }

    return this.config.moduleIds[this.currentIndex] ?? null;
  }

  triggerEvent(eventId: DisplayRotationEventId): boolean {
    if (!this.config || !this.config.events.includes(eventId)) {
      return false;
    }

    const targetModuleId = ROTATION_EVENT_TARGETS[eventId];
    if (!targetModuleId || !this.config.moduleIds.includes(targetModuleId)) {
      return false;
    }

    this.eventTargetModuleId = targetModuleId;
    this.eventHoldUntil = Date.now() + this.config.eventHoldMs;
    return true;
  }

  getConfig(): DisplayRotationConfig | null {
    return this.config ? { ...this.config, moduleIds: [...this.config.moduleIds], events: [...this.config.events] } : null;
  }
}

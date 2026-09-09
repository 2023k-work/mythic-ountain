export type M1ExperienceState = 'scanning' | 'interactionReady' | 'groupFlying' | 'grace' | 'resetting';

export interface M1ExperienceCallbacks {
  onRevealGroup: () => void;
  onFadeOutGroup: () => void;
  onLaunchGroup: () => void;
  onReset: () => void;
}

export class M1ExperienceController {
  private state: M1ExperienceState = 'scanning';
  private groupRevealed = false;
  private groupDeparted = false;
  private groupFadeRequested = false;

  constructor(private readonly callbacks: M1ExperienceCallbacks) {}

  onTargetFound(): void {
    if (!this.groupRevealed) {
      this.groupRevealed = true;
    }
    if (!this.groupFadeRequested) this.callbacks.onRevealGroup();
    this.state = this.groupDeparted ? 'groupFlying' : 'interactionReady';
  }

  onTargetLostGrace(): void {
    if (this.state !== 'resetting') {
      this.callbacks.onFadeOutGroup();
      this.state = 'grace';
    }
  }

  onTargetLostExpired(): void {
    this.resetExperience();
  }

  launchGroup(): boolean {
    if (this.state !== 'interactionReady') return false;
    this.groupDeparted = true;
    this.state = 'groupFlying';
    this.callbacks.onLaunchGroup();
    return true;
  }

  fadeGroup(): boolean {
    if (this.state !== 'groupFlying' || this.groupFadeRequested) return false;
    this.groupFadeRequested = true;
    this.callbacks.onFadeOutGroup();
    return true;
  }

  resetExperience(): void {
    this.state = 'resetting';
    this.groupRevealed = false;
    this.groupDeparted = false;
    this.groupFadeRequested = false;
    this.callbacks.onReset();
    this.state = 'scanning';
  }

  getState(): M1ExperienceState {
    return this.state;
  }

  hasRevealedGroup(): boolean {
    return this.groupRevealed;
  }
}

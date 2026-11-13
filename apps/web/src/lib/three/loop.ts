export type FrameCallback = (dt: number, time: number) => boolean | void;

interface LoopOptions {
  /** Pause while this element is off screen. */
  target?: Element;
  /**
   * In demand mode a frame is only drawn after `invalidate()` or while the callback returns `true`
   * (for example while an animation is still settling). Idle configurators then cost nothing.
   */
  demand?: boolean;
  /** Called with the real duration of each rendered frame in ms (for adaptive resolution). */
  onFrameTime?: (ms: number) => void;
}

/** requestAnimationFrame loop that sleeps when the tab is hidden or the canvas is out of view. */
export class RenderLoop {
  private raf = 0;
  private last = 0;
  private pending = true;
  private inView = true;
  private running = false;
  private inTick = false;

  constructor(
    private readonly frame: FrameCallback,
    private readonly options: LoopOptions = {},
  ) {
    document.addEventListener('visibilitychange', this.wake);
    if (options.target) {
      new IntersectionObserver(([entry]) => {
        this.inView = entry?.isIntersecting ?? true;
        this.wake();
      }).observe(options.target);
    }
  }

  start() {
    this.running = true;
    this.wake();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Request at least one more frame (demand mode). */
  invalidate() {
    this.pending = true;
    this.wake();
  }

  private get active() {
    return this.running && this.inView && !document.hidden;
  }

  private wake = () => {
    // While a frame is running, `invalidate()` (e.g. from OrbitControls' change event) only marks
    // the next frame as wanted: scheduling here as well would start a second, parallel rAF chain.
    if (this.inTick || !this.active || this.raf) return;
    if (this.options.demand && !this.pending) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  };

  private tick = (now: number) => {
    this.raf = 0;
    if (!this.active) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.pending = false;
    this.inTick = true;
    let keepGoing: boolean | void;
    try {
      keepGoing = this.frame(dt, now / 1000);
    } finally {
      this.inTick = false;
    }
    // Frame-to-frame interval: includes GPU time, which is what we need to react to.
    if (!this.options.demand && dt > 0) this.options.onFrameTime?.(dt * 1000);
    if (!this.options.demand || keepGoing || this.pending) {
      this.raf = requestAnimationFrame(this.tick);
    }
  };
}

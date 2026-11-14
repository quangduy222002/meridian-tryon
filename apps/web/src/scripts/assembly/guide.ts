/** Build-guide data: plain JSON-like objects so the studio can edit them and the viewer can play them. */

export type Vec3 = [number, number, number];

export type ToolId = 'screwdriver' | 'paste' | 'strap' | 'ties' | 'hands';

/** 24×24 stroke icons. */
export const TOOLS: Record<ToolId, { label: string; icon: string }> = {
  screwdriver: {
    label: 'Phillips #2',
    icon: '<path d="M14.5 3.5l6 6-2.5 2.5-6-6zM12 6l-7.5 7.5L3 19l1 1 5.5-1.5L17 11"/>',
  },
  paste: { label: 'Thermal paste', icon: '<path d="M4 20l3-3M6 14l4 4M8.5 11.5l8-8 4 4-8 8zM15 5l4 4"/>' },
  strap: { label: 'Anti-static strap', icon: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>' },
  ties: { label: 'Cable ties', icon: '<path d="M9 15a5 5 0 1 1 6 0M12 13v8M10 19h4"/>' },
  hands: {
    label: 'Hands only',
    icon: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-6.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.5a6 6 0 0 1-5-2.7L3.6 14a1.5 1.5 0 0 1 2.6-1.5L8 15"/>',
  },
};

export interface StepView {
  pos: Vec3;
  target: Vec3;
}

export interface Step {
  id: string;
  title: string;
  body: string;
  warning: string;
  tools: ToolId[];
  /** Part ids that move home during this step. */
  parts: string[];
  view?: StepView;
}

export interface Guide {
  title: string;
  steps: Step[];
  /** Where each part starts, relative to its installed position. */
  offsets: Record<string, Vec3>;
}

let seq = 0;
export const newId = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`;

export const DEFAULT_VIEW: StepView = { pos: [6.8, 5.6, 11], target: [0, 2.5, 0] };

/** Sensible start offsets for every part: used by the sample and as the default for new guides. */
export const DEFAULT_OFFSETS: Record<string, Vec3> = {
  case: [0, 2.6, 0],
  psu: [3.4, 0, 0],
  mobo: [0, 0, 2.8],
  cpu: [0, 0, 1.4],
  cooler: [0, 0, 2.6],
  ram: [0, 0, 1.6],
  ssd: [0.7, 0, 0.9],
  gpu: [0, 0, 2.8],
  fans: [0, 0, 2.6],
  'fan-rear': [0, 0, 2.6],
  cables: [0, 0, 1.8],
  glass: [0, 0, 2.6],
};

const step = (s: Omit<Step, 'id' | 'warning'> & { warning?: string }): Step => ({ id: newId(), warning: '', ...s });

export const SAMPLE_GUIDE: Guide = {
  title: 'Forge X1 — gaming PC build',
  offsets: DEFAULT_OFFSETS,
  steps: [
    step({
      title: 'Prepare the case',
      body: 'Stand the case on a clean, hard table — not carpet. Unscrew the four thumbscrews and lift off the glass side panel; set it somewhere soft until the last step. Keep all screws in a cup.',
      warning: 'Touch the bare metal of the case before handling any part, to discharge static.',
      tools: ['hands', 'strap'],
      parts: ['case'],
      view: { pos: [6.8, 5.6, 11], target: [0, 2.5, 0] },
    }),
    step({
      title: 'Install the power supply',
      body: 'Slide the PSU in from the rear with its fan facing down, so it breathes through the dust filter under the case. Fasten it with the four 6-32 screws on the back.',
      warning: 'Make sure the PSU switch is set to O (off) and the power cable is unplugged.',
      tools: ['screwdriver'],
      parts: ['psu'],
      view: { pos: [6.6, 2.6, 6.4], target: [1.2, 0.8, 0] },
    }),
    step({
      title: 'Mount the motherboard',
      body: 'Line the rear I/O up with the cutout in the back of the case and lower the board onto the six standoffs. Fasten each with an M3 screw — snug, not tight.',
      warning: 'Hold the board by its edges. Never by the heatsinks or the socket.',
      tools: ['screwdriver', 'strap'],
      parts: ['mobo'],
      view: { pos: [3.6, 4.6, 8.4], target: [0.7, 3.1, -0.8] },
    }),
    step({
      title: 'Seat the CPU',
      body: 'Lift the socket lever. Match the gold triangle on the CPU with the marked corner of the socket and lower it straight down — it drops in with no force. Close the lever.',
      warning: 'Never touch the contacts under the CPU or the pins in the socket.',
      tools: ['hands'],
      parts: ['cpu'],
      view: { pos: [2.9, 5.2, 3.6], target: [1.0, 3.9, -0.95] },
    }),
    step({
      title: 'Install the CPU cooler',
      body: 'Put a pea-sized dot of thermal paste in the middle of the CPU. Lower the cooler straight on and tighten its two screws a few turns at a time, alternating sides, until they stop.',
      warning: 'Peel the protective film off the cooler’s copper base first.',
      tools: ['paste', 'screwdriver'],
      parts: ['cooler'],
      view: { pos: [4.4, 5.6, 5.6], target: [0.9, 3.8, -0.3] },
    }),
    step({
      title: 'Add the memory',
      body: 'Open the clips on the 2nd and 4th slots from the CPU — that is dual-channel. Line up the notch in each stick with the slot and press firmly on both ends until the clips snap shut.',
      tools: ['hands'],
      parts: ['ram'],
      view: { pos: [1.2, 5.4, 3.6], target: [0.25, 3.9, -0.75] },
    }),
    step({
      title: 'Install the M.2 SSD',
      body: 'Slide the drive into the M.2 slot at a slight angle, gold contacts first. Press the other end down onto the standoff and fix it with the tiny screw.',
      warning: 'The M.2 screw is very small — easy to drop into the case. Use a magnetic screwdriver.',
      tools: ['screwdriver'],
      parts: ['ssd'],
      view: { pos: [1.9, 3.9, 2.4], target: [0.7, 2.9, -0.95] },
    }),
    step({
      title: 'Install the graphics card',
      body: 'Remove the two slot covers at the back of the case. Open the latch of the top PCIe x16 slot and press the card in until it clicks, then screw its bracket to the case.',
      warning: 'It is heavy: support the card with one hand until the bracket is screwed in.',
      tools: ['screwdriver'],
      parts: ['gpu'],
      view: { pos: [4.4, 2.4, 7], target: [0.8, 2.3, -0.3] },
    }),
    step({
      title: 'Mount the case fans',
      body: 'Three intake fans go on the front, blowing in; one exhaust fan at the rear, blowing out. The arrows on each fan frame show the airflow. Four screws per fan.',
      tools: ['screwdriver'],
      parts: ['fans', 'fan-rear'],
      view: { pos: [4.6, 5, 9.2], target: [-0.1, 2.6, 0] },
    }),
    step({
      title: 'Connect the cables',
      body: 'The 24-pin goes to the long connector on the board’s front edge, the 8-pin EPS to the top corner by the rear I/O, and the PCIe cable into the graphics card. Push each until its latch clicks.',
      warning: 'Only use the modular cables that came with this PSU — they are not interchangeable between brands.',
      tools: ['ties'],
      parts: ['cables'],
      view: { pos: [3.2, 3.8, 7], target: [0.2, 2.9, -0.4] },
    }),
    step({
      title: 'Close up and power on',
      body: 'Hang the glass panel back on and tighten the four thumbscrews by hand. Plug in the power cable, flip the PSU switch to I and press the power button. Welcome to your new PC.',
      tools: ['hands'],
      parts: ['glass'],
      view: { pos: [7.4, 5.2, 10.4], target: [0, 2.5, 0] },
    }),
  ],
};

export const cloneGuide = (g: Guide): Guide => structuredClone(g);

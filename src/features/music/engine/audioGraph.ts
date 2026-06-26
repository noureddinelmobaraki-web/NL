import { EQ_FREQS } from './eqPresets';

export class AudioGraph {
  ctx: AudioContext;
  inputNode: GainNode;
  eqFilters: BiquadFilterNode[] = [];
  pannerNode: StereoPannerNode;
  masterGain: GainNode;
  analyser: AnalyserNode;
  analyserL: AnalyserNode;
  analyserR: AnalyserNode;
  splitter: ChannelSplitterNode;
  bypassEq: boolean = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // 1. Create input gain node
    this.inputNode = ctx.createGain();

    // 2. Create 10-band equalizer filters
    for (let i = 0; i < EQ_FREQS.length; i++) {
      const filter = ctx.createBiquadFilter();
      if (i === 0) {
        filter.type = 'lowshelf';
      } else if (i === EQ_FREQS.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.0;
      }
      filter.frequency.value = EQ_FREQS[i];
      filter.gain.value = 0; // default to flat
      this.eqFilters.push(filter);
    }

    // Connect EQ filters in series
    for (let i = 0; i < this.eqFilters.length - 1; i++) {
      this.eqFilters[i].connect(this.eqFilters[i + 1]);
    }

    // 3. Create Panner Node
    // Safari might not support StereoPannerNode, so gracefully fall back if unavailable
    if (ctx.createStereoPanner) {
      this.pannerNode = ctx.createStereoPanner();
    } else {
      // Fallback object mimicking StereoPannerNode if unsupported (highly unlikely in 2026, but safe)
      this.pannerNode = {
        pan: { value: 0 },
        connect: (_dest: any) => {},
        disconnect: () => {}
      } as any;
    }

    // 4. Create Master Gain
    this.masterGain = ctx.createGain();

    // 5. Create Main Analyser
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // 6. Create Splitter and Stereo Analysers for VU metering
    this.splitter = ctx.createChannelSplitter(2);
    this.analyserL = ctx.createAnalyser();
    this.analyserL.fftSize = 512;
    this.analyserR = ctx.createAnalyser();
    this.analyserR.fftSize = 512;

    // Assemble routing chain
    this.rebuildRouting();
  }

  setEqBypass(bypass: boolean) {
    if (this.bypassEq === bypass) return;
    this.bypassEq = bypass;
    this.rebuildRouting();
  }

  setEqGain(index: number, db: number) {
    if (index >= 0 && index < this.eqFilters.length) {
      this.eqFilters[index].gain.setValueAtTime(db, this.ctx.currentTime);
    }
  }

  setPan(panValue: number) {
    if (this.pannerNode && this.pannerNode.pan) {
      this.pannerNode.pan.setValueAtTime(panValue, this.ctx.currentTime);
    }
  }

  private rebuildRouting() {
    // Disconnect everything in the dynamic part of the chain
    try {
      this.inputNode.disconnect();
      for (const filter of this.eqFilters) {
        filter.disconnect();
      }
      if (this.pannerNode.disconnect) this.pannerNode.disconnect();
      this.masterGain.disconnect();
      this.splitter.disconnect();
    } catch (e) {
      // Ignore disconnect errors if nodes weren't connected
    }

    // Connect from inputNode
    if (this.bypassEq) {
      // Connect Input -> Panner directly
      if ((this.pannerNode as any).connect) {
        this.inputNode.connect(this.pannerNode);
      } else {
        this.inputNode.connect(this.masterGain);
      }
    } else {
      // Connect Input -> EQ Chain -> Panner
      this.inputNode.connect(this.eqFilters[0]);
      for (let i = 0; i < this.eqFilters.length - 1; i++) {
        this.eqFilters[i].connect(this.eqFilters[i + 1]);
      }
      if ((this.pannerNode as any).connect) {
        this.eqFilters[this.eqFilters.length - 1].connect(this.pannerNode);
      } else {
        this.eqFilters[this.eqFilters.length - 1].connect(this.masterGain);
      }
    }

    // Connect Panner -> Master Gain -> Destination & Analysers
    if ((this.pannerNode as any).connect) {
      this.pannerNode.connect(this.masterGain);
    }

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Channel Splitter connection for stereo VU bars
    this.masterGain.connect(this.splitter);
    this.splitter.connect(this.analyserL, 0);
    this.splitter.connect(this.analyserR, 1);
  }
}

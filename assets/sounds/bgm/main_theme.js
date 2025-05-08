/**
 * メインテーマBGM
 * Web Audio APIを使用してゲームのメインBGMを生成します
 * ループ再生可能なシンセサイザーベースの音楽
 */
class MainThemeBGM {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.isPlaying = false;
    this.nodes = [];
    this.tempo = 120; // BPM
    this.beatLength = 60 / this.tempo;
    this.sequence = null;
  }

  // BGMを開始
  start(volume = 0.5) {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // マスターゲインノード
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = volume;
    this.masterGain.connect(this.audioContext.destination);

    // リバーブエフェクト
    this.reverb = this.createReverb();
    this.reverb.connect(this.masterGain);

    // メロディとベースラインを開始
    this.startMelody();
    this.startBassline();
    this.startDrums();

    return this;
  }

  // BGMを停止
  stop() {
    if (!this.isPlaying) return;
    
    // すべてのノードを停止
    this.nodes.forEach(node => {
      if (node.stop) {
        try {
          node.stop();
        } catch (e) {
          // すでに停止している場合はエラー無視
        }
      }
    });

    this.isPlaying = false;
    this.nodes = [];
  }

  // リバーブエフェクトの作成
  createReverb() {
    const convolver = this.audioContext.createConvolver();
    const reverbTime = 2.5;
    const decay = 0.5;
    
    // インパルス応答バッファを生成
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * reverbTime;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    
    for (let i = 0; i < length; i++) {
      left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    
    convolver.buffer = impulse;
    return convolver;
  }

  // シンセサイザー音源を作成
  createSynth(type = 'sine', frequency = 440, attack = 0.05, decay = 0.2, sustain = 0.7, release = 0.5) {
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0;
    
    // アタックフェーズ
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + attack);
    
    // ディケイ・サステインフェーズ
    gainNode.gain.linearRampToValueAtTime(sustain, this.audioContext.currentTime + attack + decay);
    
    oscillator.connect(gainNode);
    this.nodes.push(oscillator);
    this.nodes.push(gainNode);
    
    return { oscillator, gainNode };
  }

  // メロディパートを開始
  startMelody() {
    // メロディの音符データ
    const melodyNotes = [
      { note: 'E4', duration: this.beatLength * 2 },
      { note: 'G4', duration: this.beatLength },
      { note: 'A4', duration: this.beatLength },
      { note: 'B4', duration: this.beatLength * 2 },
      { note: 'A4', duration: this.beatLength },
      { note: 'G4', duration: this.beatLength },
      { note: 'E4', duration: this.beatLength * 2 },
      { note: 'G4', duration: this.beatLength },
      { note: 'A4', duration: this.beatLength },
      { note: 'G4', duration: this.beatLength * 2 },
      { note: 'E4', duration: this.beatLength * 2 },
    ];

    // 周波数変換テーブル
    const noteToFreq = {
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
      'G4': 392.00, 'A4': 440.00, 'B4': 493.88, 'C5': 523.25
    };

    // モジュレーションエフェクト
    const modulator = this.audioContext.createOscillator();
    modulator.frequency.value = 5;
    modulator.start();
    const modulationGain = this.audioContext.createGain();
    modulationGain.gain.value = 10;
    modulator.connect(modulationGain);

    let currentTime = this.audioContext.currentTime;
    let loopTime = 0;

    // メロディのシーケンスを生成して再生
    melodyNotes.forEach(noteData => {
      const synth = this.createSynth('triangle', noteToFreq[noteData.note], 0.05, 0.1, 0.7, 0.3);
      
      // ビブラートのような効果を加える
      if (noteData.duration >= this.beatLength * 2) {
        modulationGain.connect(synth.oscillator.frequency);
      }
      
      // フィルターを適用
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000;
      filter.Q.value = 5;
      
      synth.gainNode.connect(filter);
      filter.connect(this.reverb);
      filter.connect(this.masterGain);
      
      synth.oscillator.start(currentTime);
      synth.oscillator.stop(currentTime + noteData.duration);
      
      // リリースフェーズ
      synth.gainNode.gain.setValueAtTime(synth.gainNode.gain.value, currentTime + noteData.duration - 0.3);
      synth.gainNode.gain.linearRampToValueAtTime(0, currentTime + noteData.duration);
      
      loopTime += noteData.duration;
      currentTime += noteData.duration;
    });

    // ループ再生するために、終わりに近づいたら再度スタート
    setTimeout(() => {
      if (this.isPlaying) {
        this.startMelody();
      }
    }, (loopTime - 0.1) * 1000);
  }

  // ベースラインパートを開始
  startBassline() {
    // ベースラインの音符データ
    const bassNotes = [
      { note: 'E2', duration: this.beatLength * 2 },
      { note: 'E2', duration: this.beatLength * 2 },
      { note: 'A2', duration: this.beatLength * 2 },
      { note: 'A2', duration: this.beatLength * 2 },
      { note: 'G2', duration: this.beatLength * 2 },
      { note: 'G2', duration: this.beatLength * 2 },
      { note: 'E2', duration: this.beatLength * 4 }
    ];

    // 周波数変換テーブル
    const noteToFreq = {
      'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31,
      'G2': 98.00, 'A2': 110.00, 'B2': 123.47, 'C3': 130.81
    };

    let currentTime = this.audioContext.currentTime;
    let loopTime = 0;

    // ベースラインのシーケンスを生成して再生
    bassNotes.forEach(noteData => {
      const synth = this.createSynth('sawtooth', noteToFreq[noteData.note], 0.1, 0.3, 0.7, 0.5);
      
      // フィルターを適用
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      filter.Q.value = 2;
      
      synth.gainNode.connect(filter);
      filter.connect(this.masterGain);
      
      synth.oscillator.start(currentTime);
      synth.oscillator.stop(currentTime + noteData.duration);
      
      // リリースフェーズ
      synth.gainNode.gain.setValueAtTime(synth.gainNode.gain.value, currentTime + noteData.duration - 0.5);
      synth.gainNode.gain.linearRampToValueAtTime(0, currentTime + noteData.duration);
      
      loopTime += noteData.duration;
      currentTime += noteData.duration;
    });

    // ループ再生するために、終わりに近づいたら再度スタート
    setTimeout(() => {
      if (this.isPlaying) {
        this.startBassline();
      }
    }, (loopTime - 0.1) * 1000);
  }

  // ドラムパートを開始
  startDrums() {
    // ドラムパターンの定義
    const pattern = [
      { type: 'kick', time: 0 },
      { type: 'hihat', time: this.beatLength * 0.5 },
      { type: 'snare', time: this.beatLength },
      { type: 'hihat', time: this.beatLength * 1.5 },
      { type: 'kick', time: this.beatLength * 2 },
      { type: 'hihat', time: this.beatLength * 2.5 },
      { type: 'snare', time: this.beatLength * 3 },
      { type: 'hihat', time: this.beatLength * 3.5 }
    ];

    let currentTime = this.audioContext.currentTime;
    
    // ドラムシーケンスを再生
    pattern.forEach(hit => {
      const time = currentTime + hit.time;
      
      if (hit.type === 'kick') {
        this.playKick(time);
      } else if (hit.type === 'snare') {
        this.playSnare(time);
      } else if (hit.type === 'hihat') {
        this.playHihat(time);
      }
    });

    // ループ再生
    setTimeout(() => {
      if (this.isPlaying) {
        this.startDrums();
      }
    }, this.beatLength * 4 * 1000);
  }

  // キックドラム音源
  playKick(time) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.frequency.value = 150;
    oscillator.frequency.exponentialRampToValueAtTime(50, time + 0.15);
    
    gainNode.gain.setValueAtTime(1, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.start(time);
    oscillator.stop(time + 0.3);
    
    this.nodes.push(oscillator);
    this.nodes.push(gainNode);
  }

  // スネアドラム音源
  playSnare(time) {
    const noise = this.audioContext.createBufferSource();
    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.2, this.audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    
    noise.buffer = noiseBuffer;
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0.8, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    
    // ハイパスフィルタ
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    noise.start(time);
    noise.stop(time + 0.2);
    
    this.nodes.push(noise);
    this.nodes.push(gainNode);
  }

  // ハイハット音源
  playHihat(time) {
    const noise = this.audioContext.createBufferSource();
    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    
    noise.buffer = noiseBuffer;
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0.3, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    
    // ハイパスフィルタ
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    noise.start(time);
    noise.stop(time + 0.1);
    
    this.nodes.push(noise);
    this.nodes.push(gainNode);
  }

  // ボリューム調整
  setVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
    return this;
  }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MainThemeBGM };
}
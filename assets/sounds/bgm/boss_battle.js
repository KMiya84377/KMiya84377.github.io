/**
 * ボスバトルBGM
 * Web Audio APIを使用してボスバトル用のインテンスなBGMを生成します
 * 緊迫感のある速いテンポのシンセサイザーベース音楽
 */
class BossBattleBGM {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.isPlaying = false;
    this.nodes = [];
    this.tempo = 140; // BPM（メインテーマより速め）
    this.beatLength = 60 / this.tempo;
  }

  // BGMを開始
  start(volume = 0.6) {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // マスターゲインノード
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = volume;
    this.masterGain.connect(this.audioContext.destination);

    // ディストーションエフェクト
    this.distortion = this.createDistortion();
    this.distortion.connect(this.masterGain);

    // リードシンセ、ベース、ドラムを開始
    this.startLeadSynth();
    this.startBassline();
    this.startDrums();
    this.startArpeggio();

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

  // ディストーションエフェクトの作成
  createDistortion() {
    const distortion = this.audioContext.createWaveShaper();
    function makeDistortionCurve(amount) {
      const k = typeof amount === 'number' ? amount : 50;
      const samples = 44100;
      const curve = new Float32Array(samples);
      const deg = Math.PI / 180;
      
      for (let i = 0; i < samples; ++i) {
        const x = i * 2 / samples - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
      }
      
      return curve;
    }
    
    distortion.curve = makeDistortionCurve(30);
    distortion.oversample = '4x';
    return distortion;
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

  // リードシンセパートを開始
  startLeadSynth() {
    // リードシンセの音符データ
    const leadNotes = [
      { note: 'E4', duration: this.beatLength },
      { note: 'E4', duration: this.beatLength },
      { note: 'G4', duration: this.beatLength * 0.5 },
      { note: 'A4', duration: this.beatLength * 0.5 },
      { note: 'B4', duration: this.beatLength },
      { note: 'A4', duration: this.beatLength },
      { note: 'G4', duration: this.beatLength * 0.5 },
      { note: 'A4', duration: this.beatLength * 0.5 },
      { note: 'B4', duration: this.beatLength },
      { note: 'C5', duration: this.beatLength },
      { note: 'B4', duration: this.beatLength * 0.5 },
      { note: 'A4', duration: this.beatLength * 0.5 },
      { note: 'G4', duration: this.beatLength },
      { note: 'E4', duration: this.beatLength },
      { note: 'B4', duration: this.beatLength },
      { note: 'A4', duration: this.beatLength * 2 }
    ];

    // 周波数変換テーブル
    const noteToFreq = {
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
      'G4': 392.00, 'A4': 440.00, 'B4': 493.88, 'C5': 523.25,
      'D5': 587.33, 'E5': 659.25
    };

    let currentTime = this.audioContext.currentTime;
    let loopTime = 0;

    // リードシンセのシーケンスを生成して再生
    leadNotes.forEach(noteData => {
      // デュアルオシレーター（より太いサウンド）
      const synth1 = this.createSynth('sawtooth', noteToFreq[noteData.note], 0.02, 0.1, 0.8, 0.2);
      const synth2 = this.createSynth('square', noteToFreq[noteData.note] * 1.01, 0.02, 0.1, 0.7, 0.2); // わずかにデチューン
      
      // フィルターとエフェクト
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000 + Math.random() * 500;
      filter.Q.value = 8;
      
      // LFO for filter cutoff modulation
      const lfo = this.audioContext.createOscillator();
      lfo.frequency.value = 6;
      const lfoGain = this.audioContext.createGain();
      lfoGain.gain.value = 300;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(currentTime);
      lfo.stop(currentTime + noteData.duration + 0.1);
      
      synth1.gainNode.connect(filter);
      synth2.gainNode.connect(filter);
      filter.connect(this.distortion);
      
      synth1.oscillator.start(currentTime);
      synth1.oscillator.stop(currentTime + noteData.duration);
      synth2.oscillator.start(currentTime);
      synth2.oscillator.stop(currentTime + noteData.duration);
      
      // リリースフェーズ
      synth1.gainNode.gain.setValueAtTime(synth1.gainNode.gain.value, currentTime + noteData.duration - 0.2);
      synth1.gainNode.gain.linearRampToValueAtTime(0, currentTime + noteData.duration);
      synth2.gainNode.gain.setValueAtTime(synth2.gainNode.gain.value, currentTime + noteData.duration - 0.2);
      synth2.gainNode.gain.linearRampToValueAtTime(0, currentTime + noteData.duration);
      
      loopTime += noteData.duration;
      currentTime += noteData.duration;
      
      this.nodes.push(lfo);
      this.nodes.push(lfoGain);
    });

    // ループ再生
    setTimeout(() => {
      if (this.isPlaying) {
        this.startLeadSynth();
      }
    }, (loopTime - 0.1) * 1000);
  }

  // ベースラインパートを開始
  startBassline() {
    // ボス戦用の激しいベースライン
    const bassNotes = [
      { note: 'E1', duration: this.beatLength },
      { note: 'E1', duration: this.beatLength * 0.5 },
      { note: 'E1', duration: this.beatLength * 0.5 },
      { note: 'E1', duration: this.beatLength },
      { note: 'B1', duration: this.beatLength },
      { note: 'A1', duration: this.beatLength },
      { note: 'A1', duration: this.beatLength * 0.5 },
      { note: 'A1', duration: this.beatLength * 0.5 },
      { note: 'G1', duration: this.beatLength },
      { note: 'G1', duration: this.beatLength * 0.5 },
      { note: 'G1', duration: this.beatLength * 0.5 },
      { note: 'A1', duration: this.beatLength },
      { note: 'E1', duration: this.beatLength * 2 }
    ];

    // 周波数変換テーブル（低いオクターブ）
    const noteToFreq = {
      'C1': 32.70, 'D1': 36.71, 'E1': 41.20, 'F1': 43.65,
      'G1': 49.00, 'A1': 55.00, 'B1': 61.74, 'C2': 65.41,
      'D2': 73.42, 'E2': 82.41
    };

    let currentTime = this.audioContext.currentTime;
    let loopTime = 0;

    // ベースラインのシーケンスを生成して再生
    bassNotes.forEach(noteData => {
      // 倍音豊かなベース音
      const synth = this.createSynth('sawtooth', noteToFreq[noteData.note], 0.01, 0.2, 0.8, 0.2);
      
      // フィルターを適用
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      filter.Q.value = 10;
      
      // フィルターエンベロープ
      filter.frequency.setValueAtTime(200, currentTime);
      filter.frequency.linearRampToValueAtTime(800, currentTime + 0.1);
      filter.frequency.exponentialRampToValueAtTime(200, currentTime + noteData.duration);
      
      synth.gainNode.connect(filter);
      filter.connect(this.distortion);
      
      synth.oscillator.start(currentTime);
      synth.oscillator.stop(currentTime + noteData.duration);
      
      // リリースフェーズ
      synth.gainNode.gain.setValueAtTime(synth.gainNode.gain.value, currentTime + noteData.duration - 0.2);
      synth.gainNode.gain.linearRampToValueAtTime(0, currentTime + noteData.duration);
      
      loopTime += noteData.duration;
      currentTime += noteData.duration;
    });

    // ループ再生
    setTimeout(() => {
      if (this.isPlaying) {
        this.startBassline();
      }
    }, (loopTime - 0.1) * 1000);
  }

  // アルペジオパートを開始
  startArpeggio() {
    // アルペジオのパターン
    const arpeggioNotes = [
      { note: 'E3', time: 0 },
      { note: 'G3', time: this.beatLength * 0.25 },
      { note: 'B3', time: this.beatLength * 0.5 },
      { note: 'E4', time: this.beatLength * 0.75 },
      { note: 'G3', time: this.beatLength },
      { note: 'B3', time: this.beatLength * 1.25 },
      { note: 'E4', time: this.beatLength * 1.5 },
      { note: 'G4', time: this.beatLength * 1.75 },
      { note: 'A3', time: this.beatLength * 2 },
      { note: 'C4', time: this.beatLength * 2.25 },
      { note: 'E4', time: this.beatLength * 2.5 },
      { note: 'A4', time: this.beatLength * 2.75 },
      { note: 'G3', time: this.beatLength * 3 },
      { note: 'B3', time: this.beatLength * 3.25 },
      { note: 'D4', time: this.beatLength * 3.5 },
      { note: 'G4', time: this.beatLength * 3.75 }
    ];

    // 周波数変換テーブル
    const noteToFreq = {
      'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61,
      'G3': 196.00, 'A3': 220.00, 'B3': 246.94, 'C4': 261.63,
      'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00,
      'A4': 440.00, 'B4': 493.88
    };

    let currentTime = this.audioContext.currentTime;
    
    // アルペジオのシーケンスを生成して再生
    arpeggioNotes.forEach(noteData => {
      const time = currentTime + noteData.time;
      const synth = this.createSynth('triangle', noteToFreq[noteData.note], 0.005, 0.1, 0.3, 0.1);
      
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = noteToFreq[noteData.note] * 2;
      filter.Q.value = 2;
      
      synth.gainNode.connect(filter);
      filter.connect(this.distortion);
      
      synth.oscillator.start(time);
      synth.oscillator.stop(time + this.beatLength * 0.25);
      
      // 短いリリース
      synth.gainNode.gain.setValueAtTime(synth.gainNode.gain.value, time + this.beatLength * 0.2);
      synth.gainNode.gain.linearRampToValueAtTime(0, time + this.beatLength * 0.25);
    });

    // ループ再生
    setTimeout(() => {
      if (this.isPlaying) {
        this.startArpeggio();
      }
    }, this.beatLength * 4 * 1000);
  }

  // ドラムパートを開始
  startDrums() {
    // 激しいドラムパターン
    const pattern = [
      { type: 'kick', time: 0 },
      { type: 'hihat', time: this.beatLength * 0.25 },
      { type: 'kick', time: this.beatLength * 0.5 },
      { type: 'hihat', time: this.beatLength * 0.75 },
      { type: 'snare', time: this.beatLength },
      { type: 'hihat', time: this.beatLength * 1.25 },
      { type: 'kick', time: this.beatLength * 1.5 },
      { type: 'hihat', time: this.beatLength * 1.75 },
      { type: 'kick', time: this.beatLength * 2 },
      { type: 'hihat', time: this.beatLength * 2.25 },
      { type: 'kick', time: this.beatLength * 2.5 },
      { type: 'hihat', time: this.beatLength * 2.75 },
      { type: 'snare', time: this.beatLength * 3 },
      { type: 'hihat', time: this.beatLength * 3.25 },
      { type: 'kick', time: this.beatLength * 3.5 },
      { type: 'snare', time: this.beatLength * 3.75 }
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

  // キックドラム音源（重低音）
  playKick(time) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.frequency.value = 180;
    oscillator.frequency.exponentialRampToValueAtTime(40, time + 0.2);
    
    gainNode.gain.setValueAtTime(1, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.start(time);
    oscillator.stop(time + 0.4);
    
    this.nodes.push(oscillator);
    this.nodes.push(gainNode);
    
    // キックの倍音を追加
    const oscHarmonic = this.audioContext.createOscillator();
    const gainHarmonic = this.audioContext.createGain();
    
    oscHarmonic.frequency.value = 120;
    oscHarmonic.frequency.exponentialRampToValueAtTime(80, time + 0.1);
    
    gainHarmonic.gain.setValueAtTime(0.5, time);
    gainHarmonic.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    
    oscHarmonic.connect(gainHarmonic);
    gainHarmonic.connect(this.distortion);
    
    oscHarmonic.start(time);
    oscHarmonic.stop(time + 0.2);
    
    this.nodes.push(oscHarmonic);
    this.nodes.push(gainHarmonic);
  }

  // スネアドラム音源（大きくクリアなサウンド）
  playSnare(time) {
    // ノイズコンポーネント
    const noise = this.audioContext.createBufferSource();
    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.2, this.audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    
    noise.buffer = noiseBuffer;
    
    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(1, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    
    // バンドパスフィルタ
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 2;
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    
    noise.start(time);
    noise.stop(time + 0.2);
    
    this.nodes.push(noise);
    this.nodes.push(noiseGain);
    
    // トーナルコンポーネント
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = 'triangle';
    oscillator.frequency.value = 180;
    
    gainNode.gain.setValueAtTime(0.7, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.distortion);
    
    oscillator.start(time);
    oscillator.stop(time + 0.1);
    
    this.nodes.push(oscillator);
    this.nodes.push(gainNode);
  }

  // ハイハット音源（クリスプでメタリック）
  playHihat(time) {
    const noise = this.audioContext.createBufferSource();
    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    
    noise.buffer = noiseBuffer;
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0.4, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
    
    // ハイパスフィルタ
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    noise.start(time);
    noise.stop(time + 0.08);
    
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
  module.exports = { BossBattleBGM };
}
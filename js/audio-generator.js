/**
 * オーディオジェネレータ
 * Web Audio APIを使用して音楽を生成するためのクラス
 */
class AudioGenerator {
    constructor() {
        this.context = null;
        this.tracks = {
            bedrock: {
                title: 'Bedrock Harmony',
                theme: 'Amazon Bedrock',
                image: 'images/bedrock.svg'
            },
            amplify: {
                title: 'Amplify Wave',
                theme: 'AWS Amplify',
                image: 'images/amplify.svg'
            },
            lambda: {
                title: 'Lambda Function',
                theme: 'AWS Lambda',
                image: 'images/lambda.svg'
            },
            workers: {
                title: '社畜ファイターズ',
                theme: '全世界の社畜たちを応援',
                image: 'images/workers.svg'
            },
            humanity: {
                title: '人間という存在',
                theme: '人間という生き物について',
                image: 'images/humanity.svg'
            }
        };
    }

    /**
     * AudioContextを初期化する
     */
    initAudioContext() {
        // AudioContextを初期化（ブラウザのユーザーインタラクション後に行う必要がある）
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.context;
    }

    /**
     * 指定されたトラックの音楽生成パラメータを取得する
     * @param {string} trackId - トラックID
     * @returns {object} 音楽生成パラメータ
     */
    getTrackParams(trackId) {
        // 各曲ごとに特徴的なパラメータを設定
        const params = {
            bedrock: {
                tempo: 110,
                baseFrequency: 220,
                scale: [0, 2, 4, 7, 9], // ペンタトニックスケール
                chordProgression: [
                    [0, 4, 7], // C major
                    [5, 9, 12], // F major
                    [7, 11, 14], // G major
                    [0, 4, 7]  // C major
                ],
                bassPattern: [0, 0, 7, 7, 5, 5, 3, 3], // ベースパターン
                duration: 180, // 曲の長さ（秒）
                rhythmPattern: [1, 0, 1, 0, 1, 1, 0, 1], // リズムパターン
                melodyNotes: [0, 2, 4, 7, 9, 12, 14, 16], // メロディノート
                effects: {
                    reverb: 0.3,
                    delay: 0.2
                }
            },
            amplify: {
                tempo: 125,
                baseFrequency: 261.63, // C4
                scale: [0, 2, 3, 7, 10], // マイナーペンタトニック
                chordProgression: [
                    [0, 3, 7], // Cm
                    [5, 8, 12], // Fm
                    [7, 10, 14], // Gm
                    [3, 7, 10]  // Eb
                ],
                bassPattern: [0, 0, 5, 5, 7, 7, 3, 3],
                duration: 180,
                rhythmPattern: [1, 1, 0, 1, 0, 1, 1, 0],
                melodyNotes: [0, 3, 7, 10, 12, 15, 19, 22],
                effects: {
                    reverb: 0.4,
                    delay: 0.3
                }
            },
            lambda: {
                tempo: 140,
                baseFrequency: 329.63, // E4
                scale: [0, 2, 4, 5, 7, 9, 11], // メジャースケール
                chordProgression: [
                    [0, 4, 7], // E
                    [2, 6, 9], // F#m
                    [4, 7, 11], // G#m
                    [5, 9, 12]  // A
                ],
                bassPattern: [0, 7, 5, 7, 0, 7, 5, 9],
                duration: 180,
                rhythmPattern: [1, 0, 1, 1, 0, 1, 0, 1],
                melodyNotes: [0, 4, 7, 12, 16, 19, 24, 28],
                effects: {
                    reverb: 0.2,
                    delay: 0.4
                }
            },
            workers: {
                tempo: 118,
                baseFrequency: 196, // G3
                scale: [0, 2, 4, 7, 9, 11], // メジャースケール（一部）
                chordProgression: [
                    [0, 4, 7], // G
                    [5, 9, 12], // C
                    [7, 11, 14], // D
                    [2, 5, 9]  // Am
                ],
                bassPattern: [0, 0, 5, 5, 7, 7, 2, 2],
                duration: 180,
                rhythmPattern: [1, 1, 1, 0, 1, 0, 1, 0],
                melodyNotes: [0, 2, 4, 7, 9, 12, 14, 16],
                effects: {
                    reverb: 0.3,
                    delay: 0.1
                }
            },
            humanity: {
                tempo: 90,
                baseFrequency: 246.94, // B3
                scale: [0, 2, 3, 5, 7, 8, 10], // 自然マイナースケール
                chordProgression: [
                    [0, 3, 7], // Bm
                    [5, 8, 12], // Em
                    [7, 10, 14], // F#m
                    [2, 5, 9]  // C#m
                ],
                bassPattern: [0, 7, 3, 7, 5, 7, 3, 0],
                duration: 180,
                rhythmPattern: [0, 1, 0, 1, 0, 1, 1, 1],
                melodyNotes: [0, 3, 7, 10, 12, 15, 19, 22],
                effects: {
                    reverb: 0.5,
                    delay: 0.3
                }
            }
        };
        
        return params[trackId];
    }
    
    /**
     * オシレーターを作成する
     * @param {AudioContext} context - オーディオコンテキスト
     * @param {number} freq - 周波数
     * @param {string} type - 波形タイプ
     * @param {number} detune - デチューン値
     * @returns {OscillatorNode} オシレーターノード
     */
    createOscillator(context, freq, type, detune = 0) {
        const osc = context.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        osc.detune.value = detune;
        return osc;
    }
    
    /**
     * ゲインノードを作成する
     * @param {AudioContext} context - オーディオコンテキスト
     * @param {number} gain - ゲイン値
     * @returns {GainNode} ゲインノード
     */
    createGain(context, gain) {
        const gainNode = context.createGain();
        gainNode.gain.value = gain;
        return gainNode;
    }
    
    /**
     * ディレイエフェクトを作成する
     * @param {AudioContext} context - オーディオコンテキスト
     * @param {number} delayTime - ディレイタイム
     * @param {number} feedback - フィードバック量
     * @returns {object} ディレイノードとフィードバックゲイン
     */
    createDelay(context, delayTime, feedback) {
        const delayNode = context.createDelay();
        delayNode.delayTime.value = delayTime;
        
        const feedbackGain = context.createGain();
        feedbackGain.gain.value = feedback;
        
        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        
        return { delayNode, feedbackGain };
    }
    
    /**
     * コンボリューションリバーブを作成する（シンプルな実装）
     * @param {AudioContext} context - オーディオコンテキスト
     * @param {number} duration - リバーブの長さ
     * @param {number} decay - 減衰率
     * @returns {ConvolverNode} コンボルバーノード
     */
    async createReverb(context, duration, decay) {
        const sampleRate = context.sampleRate;
        const length = sampleRate * duration;
        const impulse = context.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const impulseData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
            }
        }
        
        const convolver = context.createConvolver();
        convolver.buffer = impulse;
        return convolver;
    }
    
    /**
     * 音符の周波数を計算する
     * @param {number} baseFreq - 基本周波数
     * @param {number} semitones - 半音数
     * @returns {number} 周波数
     */
    calculateNoteFrequency(baseFreq, semitones) {
        return baseFreq * Math.pow(2, semitones / 12);
    }

    /**
     * 音符を生成する
     * @param {AudioContext} context - オーディオコンテキスト
     * @param {number} frequency - 周波数
     * @param {number} startTime - 開始時間
     * @param {number} duration - 長さ
     * @param {number} volume - 音量
     * @param {string} type - 波形タイプ
     * @param {GainNode} outputNode - 出力先ノード
     */
    playNote(context, frequency, startTime, duration, volume = 0.5, type = 'sine', outputNode) {
        const noteGain = context.createGain();
        noteGain.gain.value = 0;
        noteGain.gain.setValueAtTime(0, startTime);
        noteGain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        noteGain.gain.linearRampToValueAtTime(0, startTime + duration - 0.01);
        
        const oscillator = this.createOscillator(context, frequency, type);
        oscillator.connect(noteGain);
        noteGain.connect(outputNode);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }
    
    /**
     * ドラムサウンドを生成する
     * @param {AudioContext} context - オーディオコンテキスト
     * @param {string} type - ドラムタイプ (kick, snare, hihat)
     * @param {number} time - 開始時間
     * @param {GainNode} outputNode - 出力先ノード
     */
    playDrum(context, type, time, outputNode) {
        const drumGain = context.createGain();
        drumGain.connect(outputNode);
        
        if (type === 'kick') {
            // キックドラム
            const kickOsc = context.createOscillator();
            kickOsc.frequency.value = 150;
            kickOsc.frequency.exponentialRampToValueAtTime(50, time + 0.15);
            
            const kickGain = context.createGain();
            kickGain.gain.setValueAtTime(1, time);
            kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
            
            kickOsc.connect(kickGain);
            kickGain.connect(drumGain);
            kickOsc.start(time);
            kickOsc.stop(time + 0.2);
            
        } else if (type === 'snare') {
            // スネアドラム
            const snareOsc = context.createOscillator();
            snareOsc.type = 'triangle';
            snareOsc.frequency.value = 200;
            
            const snareGain = context.createGain();
            snareGain.gain.setValueAtTime(1, time);
            snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
            
            // ノイズ成分
            const noiseBuffer = context.createBuffer(1, context.sampleRate * 0.1, context.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseBuffer.length; i++) {
                noiseData[i] = Math.random() * 2 - 1;
            }
            
            const noise = context.createBufferSource();
            noise.buffer = noiseBuffer;
            
            const noiseGain = context.createGain();
            noiseGain.gain.setValueAtTime(0.8, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
            
            snareOsc.connect(snareGain);
            snareGain.connect(drumGain);
            noise.connect(noiseGain);
            noiseGain.connect(drumGain);
            
            snareOsc.start(time);
            snareOsc.stop(time + 0.1);
            noise.start(time);
            noise.stop(time + 0.1);
            
        } else if (type === 'hihat') {
            // ハイハット
            const hihatBuffer = context.createBuffer(1, context.sampleRate * 0.05, context.sampleRate);
            const hihatData = hihatBuffer.getChannelData(0);
            
            for (let i = 0; i < hihatBuffer.length; i++) {
                hihatData[i] = Math.random() * 2 - 1;
            }
            
            const hihat = context.createBufferSource();
            hihat.buffer = hihatBuffer;
            
            // ハイパスフィルター
            const filter = context.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 7000;
            
            const hihatGain = context.createGain();
            hihatGain.gain.setValueAtTime(0.2, time);
            hihatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
            
            hihat.connect(filter);
            filter.connect(hihatGain);
            hihatGain.connect(drumGain);
            
            hihat.start(time);
            hihat.stop(time + 0.05);
        }
    }

    /**
     * 音楽トラックを生成する
     * @param {string} trackId - トラックID
     * @returns {AudioBufferSourceNode} 音楽トラック
     */
    async generateTrack(trackId) {
        const context = this.initAudioContext();
        const params = this.getTrackParams(trackId);
        
        if (!params) {
            console.error('Invalid track ID:', trackId);
            return null;
        }
        
        // 60秒のオーディオバッファを作成（サンプルとして60秒に制限）
        const duration = Math.min(60, params.duration);
        const sampleRate = context.sampleRate;
        const buffer = context.createBuffer(2, duration * sampleRate, sampleRate);
        
        // メインミキサー
        const mainGain = context.createGain();
        mainGain.gain.value = 0.8;
        
        // エフェクト
        const reverb = await this.createReverb(context, 2, 3);
        const reverbGain = context.createGain();
        reverbGain.gain.value = params.effects.reverb;
        
        const delay = this.createDelay(context, 0.3, 0.4);
        const delayGain = context.createGain();
        delayGain.gain.value = params.effects.delay;
        
        // 接続
        mainGain.connect(context.destination);
        mainGain.connect(reverb);
        reverb.connect(reverbGain);
        reverbGain.connect(context.destination);
        
        mainGain.connect(delay.delayNode);
        delay.delayNode.connect(delayGain);
        delayGain.connect(context.destination);
        
        // BPM to seconds
        const beatDuration = 60 / params.tempo;
        
        // ドラム、ベース、コード、メロディーのパターン生成
        const patterns = {
            kick: [1, 0, 0, 0, 1, 0, 0, 0],
            snare: [0, 0, 1, 0, 0, 0, 1, 0],
            hihat: [0, 1, 0, 1, 0, 1, 0, 1]
        };
        
        // オフラインレンダリングのためのオフラインコンテキスト
        const offlineContext = new OfflineAudioContext(2, duration * sampleRate, sampleRate);
        const offlineMainGain = offlineContext.createGain();
        offlineMainGain.gain.value = 0.8;
        offlineMainGain.connect(offlineContext.destination);
        
        // 曲の生成
        this.generateDrums(offlineContext, params, offlineMainGain, beatDuration, patterns, duration);
        this.generateBass(offlineContext, params, offlineMainGain, beatDuration, duration);
        this.generateChords(offlineContext, params, offlineMainGain, beatDuration, duration);
        this.generateMelody(offlineContext, params, offlineMainGain, beatDuration, duration);
        
        // オフラインでレンダリング
        const renderedBuffer = await offlineContext.startRendering();
        
        // メインコンテキストで再生するためのバッファーソースを作成
        const bufferSource = context.createBufferSource();
        bufferSource.buffer = renderedBuffer;
        bufferSource.connect(mainGain);
        
        return bufferSource;
    }
    
    /**
     * ドラムパターンを生成する
     * @param {OfflineAudioContext} context - オーディオコンテキスト
     * @param {object} params - 音楽パラメータ
     * @param {GainNode} outputNode - 出力先ノード
     * @param {number} beatDuration - ビート間隔
     * @param {object} patterns - ドラムパターン
     * @param {number} duration - トラック長さ
     */
    generateDrums(context, params, outputNode, beatDuration, patterns, duration) {
        const drumsGain = context.createGain();
        drumsGain.gain.value = 0.7;
        drumsGain.connect(outputNode);
        
        const patternLength = patterns.kick.length;
        const barDuration = beatDuration * patternLength;
        const bars = Math.ceil(duration / barDuration);
        
        for (let bar = 0; bar < bars; bar++) {
            for (let i = 0; i < patternLength; i++) {
                const time = bar * barDuration + i * beatDuration;
                
                // キックドラム
                if (patterns.kick[i]) {
                    this.playDrum(context, 'kick', time, drumsGain);
                }
                
                // スネアドラム
                if (patterns.snare[i]) {
                    this.playDrum(context, 'snare', time, drumsGain);
                }
                
                // ハイハット
                if (patterns.hihat[i]) {
                    this.playDrum(context, 'hihat', time, drumsGain);
                }
            }
        }
    }
    
    /**
     * ベースラインを生成する
     * @param {OfflineAudioContext} context - オーディオコンテキスト
     * @param {object} params - 音楽パラメータ
     * @param {GainNode} outputNode - 出力先ノード
     * @param {number} beatDuration - ビート間隔
     * @param {number} duration - トラック長さ
     */
    generateBass(context, params, outputNode, beatDuration, duration) {
        const bassGain = context.createGain();
        bassGain.gain.value = 0.5;
        bassGain.connect(outputNode);
        
        const patternLength = params.bassPattern.length;
        const barDuration = beatDuration * patternLength;
        const bars = Math.ceil(duration / barDuration);
        
        // 各小節ごとにコードを変更
        for (let bar = 0; bar < bars; bar++) {
            const chordIndex = bar % params.chordProgression.length;
            const chord = params.chordProgression[chordIndex];
            const rootNote = chord[0];
            
            // ベースパターン
            for (let i = 0; i < patternLength; i++) {
                const time = bar * barDuration + i * beatDuration;
                const note = rootNote + params.bassPattern[i];
                const noteFreq = this.calculateNoteFrequency(params.baseFrequency / 2, note);
                
                this.playNote(context, noteFreq, time, beatDuration * 0.8, 0.7, 'sawtooth', bassGain);
            }
        }
    }
    
    /**
     * コードパターンを生成する
     * @param {OfflineAudioContext} context - オーディオコンテキスト
     * @param {object} params - 音楽パラメータ
     * @param {GainNode} outputNode - 出力先ノード
     * @param {number} beatDuration - ビート間隔
     * @param {number} duration - トラック長さ
     */
    generateChords(context, params, outputNode, beatDuration, duration) {
        const chordsGain = context.createGain();
        chordsGain.gain.value = 0.3;
        chordsGain.connect(outputNode);
        
        const patternLength = 8; // 8ビートのパターン
        const barDuration = beatDuration * patternLength;
        const bars = Math.ceil(duration / barDuration);
        
        // 各小節ごとにコードを演奏
        for (let bar = 0; bar < bars; bar++) {
            const chordIndex = bar % params.chordProgression.length;
            const chord = params.chordProgression[chordIndex];
            
            // リズムパターンに合わせてコードを演奏
            for (let i = 0; i < patternLength; i++) {
                const rhythm = params.rhythmPattern[i % params.rhythmPattern.length];
                if (rhythm) {
                    const time = bar * barDuration + i * beatDuration;
                    
                    // 各コード構成音を演奏
                    chord.forEach(note => {
                        const noteFreq = this.calculateNoteFrequency(params.baseFrequency, note);
                        this.playNote(context, noteFreq, time, beatDuration * 0.7, 0.15, 'sine', chordsGain);
                    });
                }
            }
        }
    }
    
    /**
     * メロディーパターンを生成する
     * @param {OfflineAudioContext} context - オーディオコンテキスト
     * @param {object} params - 音楽パラメータ
     * @param {GainNode} outputNode - 出力先ノード
     * @param {number} beatDuration - ビート間隔
     * @param {number} duration - トラック長さ
     */
    generateMelody(context, params, outputNode, beatDuration, duration) {
        const melodyGain = context.createGain();
        melodyGain.gain.value = 0.4;
        melodyGain.connect(outputNode);
        
        const patternLength = 16; // 16ビートのメロディパターン
        const barDuration = beatDuration * patternLength;
        const bars = Math.ceil(duration / barDuration);
        
        // 簡単なシードベースのランダム化
        const seed = trackIdToSeed(params.baseFrequency);
        const random = seededRandom(seed);
        
        function trackIdToSeed(baseFreq) {
            return Math.floor(baseFreq * 1000) % 10000;
        }
        
        function seededRandom(seed) {
            let value = seed;
            return function() {
                value = (value * 9301 + 49297) % 233280;
                return value / 233280;
            }
        }
        
        // 各小節ごとにメロディーを生成
        for (let bar = 0; bar < bars; bar++) {
            const chordIndex = bar % params.chordProgression.length;
            const chord = params.chordProgression[chordIndex];
            
            // メロディーノートの生成
            for (let i = 0; i < patternLength; i++) {
                // ランダム要素を追加（ただし、一貫したパターン）
                if (random() < 0.6) {
                    const time = bar * barDuration + i * beatDuration;
                    
                    // スケールノートからメロディーを選択
                    const noteIndex = Math.floor(random() * params.melodyNotes.length);
                    const note = params.melodyNotes[noteIndex];
                    
                    // コードに合わせて調整
                    const adjustedNote = note + chord[0];
                    const noteFreq = this.calculateNoteFrequency(params.baseFrequency, adjustedNote);
                    
                    // ノートの長さもランダム化
                    const noteDuration = beatDuration * (random() * 0.8 + 0.3);
                    this.playNote(context, noteFreq, time, noteDuration, 0.3, 'triangle', melodyGain);
                }
            }
        }
    }

    /**
     * トラック情報を取得する
     * @param {string} trackId - トラックID
     * @returns {object} トラック情報
     */
    getTrackInfo(trackId) {
        return this.tracks[trackId];
    }
}

// AudioGeneratorのグローバルインスタンス
const audioGenerator = new AudioGenerator();
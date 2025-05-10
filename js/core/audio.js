/**
 * ゲームオーディオクラス
 * ゲーム内のサウンドとBGMを管理する
 */
class GameAudio {
    constructor(game) {
        this.game = game;
        this.audioContext = null;
        this.soundBuffers = {};
        this.musicTracks = {};
        this.currentMusic = null;
    }
    
    /**
     * オーディオシステムの初期化
     */
    init() {
        // Web Audio APIの初期化
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        
        // サウンド設定
        const soundConfig = GameConfig.sounds;
        
        // サウンドファイルをロード
        this.loadSounds(soundConfig);
    }
    
    /**
     * サウンドファイルのロード
     */
    loadSounds(soundConfig) {
        const loadAudioBuffer = (url, name) => {
            console.log(`Loading sound: ${name} from ${url}`);
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.arrayBuffer();
                })
                .then(arrayBuffer => {
                    return this.audioContext.decodeAudioData(arrayBuffer);
                })
                .then(audioBuffer => {
                    this.soundBuffers[name] = audioBuffer;
                    console.log(`Sound loaded successfully: ${name}`);
                })
                .catch(error => {
                    console.error(`Error loading sound ${name} from ${url}:`, error);
                });
        };
        
        // 効果音のロード
        for (const [name, path] of Object.entries(soundConfig.sfx || {})) {
            loadAudioBuffer(`assets/sounds/effects/${path}`, name);
        }
        
        // BGMのロード
        for (const [name, path] of Object.entries(soundConfig.music || {})) {
            loadAudioBuffer(`assets/sounds/bgm/${path}`, name);
        }
        
        // 敵の遠距離攻撃用のサウンドを追加
        loadAudioBuffer('assets/sounds/effects/ranged-attack.mp3', 'enemyRangedAttack');
        loadAudioBuffer('assets/sounds/effects/switch.mp3', 'switchAbility');
    }
    
    /**
     * 効果音の再生
     */
    playSound(soundName) {
        if (this.audioContext && this.soundBuffers[soundName]) {
            try {
                // AudioContextが一時停止状態なら再開
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                
                // 音源を作成
                const source = this.audioContext.createBufferSource();
                source.buffer = this.soundBuffers[soundName];
                
                // 音量調整
                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = 0.5; // 音量は0.0〜1.0
                
                // 接続
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                // 再生
                source.start(0);
                
                console.log(`Playing sound: ${soundName}`);
                return source;
            } catch (e) {
                console.error(`Error playing sound ${soundName}:`, e);
            }
        } else {
            console.warn(`Sound not found or audio not initialized: ${soundName}`);
        }
        return null;
    }
    
    /**
     * BGMの再生
     */
    playMusic(musicName) {
        // 現在再生中のBGMを停止
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic = null;
        }
        
        if (this.audioContext && this.soundBuffers[musicName]) {
            try {
                // AudioContextが一時停止状態なら再開
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                
                // 音源を作成
                const source = this.audioContext.createBufferSource();
                source.buffer = this.soundBuffers[musicName];
                source.loop = true; // BGMはループ再生
                
                // 音量調整
                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = 0.3; // BGMは少し小さめ
                
                // 接続
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                // 再生
                source.start(0);
                console.log(`Playing music: ${musicName}`);
                
                // 現在のBGMとして保存
                this.currentMusic = source;
                
                return source;
            } catch (e) {
                console.error(`Error playing music ${musicName}:`, e);
            }
        } else {
            console.warn(`Music not found or audio not initialized: ${musicName}`);
        }
        return null;
    }
    
    /**
     * BGMの停止
     */
    stopMusic() {
        if (this.currentMusic) {
            try {
                this.currentMusic.stop();
                this.currentMusic = null;
                console.log('Music stopped');
            } catch(e) {
                console.error('Error stopping music:', e);
            }
        }
    }
    
    /**
     * 音量調整
     * @param {string} type - 'master', 'sfx', 'music'のいずれか
     * @param {number} value - 0.0〜1.0の音量値
     */
    setVolume(type, value) {
        // 実装は後で必要に応じて追加
        console.log(`Setting ${type} volume to ${value}`);
    }
}

// 他のファイルからインポートできるようにエクスポート
export default GameAudio;
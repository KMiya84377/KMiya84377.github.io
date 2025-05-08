/**
 * レベルアップ効果音
 * Web Audio APIを使用してレベルアップ音を生成します
 */
function createLevelUpSound(audioContext) {
  // オーディオバッファを作成
  const bufferSize = audioContext.sampleRate * 1.0; // 1秒の音
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  
  // 上向きの明るいサウンドを生成
  for (let i = 0; i < bufferSize; i++) {
    const t = i / audioContext.sampleRate;
    
    // 徐々に周波数が上がるシーケンス
    let frequency;
    if (t < 0.3) {
      frequency = 400 + t * 1000;
    } else if (t < 0.6) {
      frequency = 700 + (t - 0.3) * 1500;
    } else {
      frequency = 1150 + (t - 0.6) * 500;
    }
    
    // ベースの正弦波
    let signal = Math.sin(2 * Math.PI * frequency * t);
    
    // 高音のアクセントを加える
    if (t > 0.3 && t < 0.4) {
      signal += 0.3 * Math.sin(2 * Math.PI * frequency * 2 * t);
    }
    if (t > 0.6 && t < 0.8) {
      signal += 0.4 * Math.sin(2 * Math.PI * frequency * 1.5 * t);
    }
    
    // エンベロープ（音量の変化）を適用
    let envelope;
    if (t < 0.3) {
      envelope = t / 0.3;
    } else if (t > 0.8) {
      envelope = 1 - (t - 0.8) / 0.2;
    } else {
      envelope = 1.0;
    }
    
    data[i] = signal * envelope * 0.5; // 音量を調整
  }
  
  return buffer;
}

// 音を再生する関数
function playLevelUpSound(audioContext, volume = 1.0) {
  const buffer = createLevelUpSound(audioContext);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  
  // ボリュームコントロール
  const gainNode = audioContext.createGain();
  gainNode.gain.value = volume;
  
  // 明るい音質にするためのフィルタ
  const filter = audioContext.createBiquadFilter();
  filter.type = 'highshelf';
  filter.frequency.value = 5000;
  filter.gain.value = 5;
  
  // 接続して再生
  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);
  source.start();
  
  return source;
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createLevelUpSound, playLevelUpSound };
}
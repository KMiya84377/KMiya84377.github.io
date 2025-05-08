/**
 * 射撃音効果音
 * Web Audio APIを使用して射撃音を生成します
 */
function createShotSound(audioContext) {
  // オーディオバッファを作成
  const bufferSize = audioContext.sampleRate * 0.2; // 0.2秒の音
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  
  // 銃声のような音を生成
  for (let i = 0; i < bufferSize; i++) {
    // 最初の部分は大きな音
    if (i < bufferSize * 0.1) {
      data[i] = Math.random() * 0.5 - 0.25;
    } 
    // 後半は徐々に小さくなる
    else {
      data[i] = (Math.random() * 0.5 - 0.25) * (1 - (i / bufferSize));
    }
  }
  
  return buffer;
}

// 音を再生する関数
function playShot(audioContext, volume = 1.0) {
  const buffer = createShotSound(audioContext);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  
  // ボリュームコントロール
  const gainNode = audioContext.createGain();
  gainNode.gain.value = volume;
  
  // 接続して再生
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  source.start();
  
  return source;
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createShotSound, playShot };
}
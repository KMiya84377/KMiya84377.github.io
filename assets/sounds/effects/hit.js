/**
 * 敵ヒット効果音
 * Web Audio APIを使用してヒット音を生成します
 */
function createHitSound(audioContext) {
  // オーディオバッファを作成
  const bufferSize = audioContext.sampleRate * 0.15; // 0.15秒の音
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  
  // 衝撃音のようなサウンドを生成
  for (let i = 0; i < bufferSize; i++) {
    // 基本的なノイズ
    let noise = Math.random() * 2 - 1;
    
    // 時間とともに減衰させる
    const decay = 1.0 - (i / bufferSize);
    
    // 周波数の違いで音色を調整
    const frequency = 400 + (i % 10) * 20;
    const sine = Math.sin(i * frequency / audioContext.sampleRate);
    
    // 衝撃音と正弦波を組み合わせる
    data[i] = (noise * 0.3 + sine * 0.7) * decay;
  }
  
  return buffer;
}

// 音を再生する関数
function playHitSound(audioContext, volume = 0.8) {
  const buffer = createHitSound(audioContext);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  
  // ボリュームコントロール
  const gainNode = audioContext.createGain();
  gainNode.gain.value = volume;
  
  // ローパスフィルタを追加して音を柔らかく
  const filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1000;
  
  // 接続して再生
  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);
  source.start();
  
  return source;
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createHitSound, playHitSound };
}
/**
 * ゲームオーバー効果音
 * Web Audio APIを使用してゲームオーバー音を生成します
 */
function createGameOverSound(audioContext) {
  // オーディオバッファを作成
  const bufferSize = audioContext.sampleRate * 2.0; // 2秒の音
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  
  // 低音から始まり、さらに低くなる「失敗」のサウンド
  for (let i = 0; i < bufferSize; i++) {
    const t = i / audioContext.sampleRate;
    
    // 徐々に周波数が下がる
    const frequency = 400 * Math.pow(0.92, t * 5);
    
    // 正弦波をベースにした音
    let signal = Math.sin(2 * Math.PI * frequency * t);
    
    // 微妙に揺らぎを加える
    signal += 0.2 * Math.sin(2 * Math.PI * (frequency/2) * t);
    
    // 時間経過で音量が小さくなる
    const envelope = Math.pow(1 - t/2, 1.5);
    
    data[i] = signal * envelope;
  }
  
  return buffer;
}

// 音を再生する関数
function playGameOverSound(audioContext, volume = 1.0) {
  const buffer = createGameOverSound(audioContext);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  
  // ボリュームコントロール
  const gainNode = audioContext.createGain();
  gainNode.gain.value = volume;
  
  // リバーブ効果を追加
  const convolver = audioContext.createConvolver();
  const convolverBufferSize = audioContext.sampleRate * 3;
  const convolverBuffer = audioContext.createBuffer(2, convolverBufferSize, audioContext.sampleRate);
  
  // シンプルなリバーブインパルス応答を生成
  const convolverL = convolverBuffer.getChannelData(0);
  const convolverR = convolverBuffer.getChannelData(1);
  for (let i = 0; i < convolverBufferSize; i++) {
    convolverL[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / convolverBufferSize, 2);
    convolverR[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / convolverBufferSize, 2);
  }
  
  convolver.buffer = convolverBuffer;
  
  // 接続して再生
  source.connect(gainNode);
  gainNode.connect(convolver);
  gainNode.connect(audioContext.destination); // ダイレクト音
  convolver.connect(audioContext.destination); // リバーブ音
  source.start();
  
  return source;
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createGameOverSound, playGameOverSound };
}
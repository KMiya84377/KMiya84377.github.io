/**
 * コアシステムのエントリーポイント
 * 各モジュールをインポートしてエクスポートします
 */
import GameCore from './core.js';
import GameAudio from './audio.js';
import GameRendering from './rendering.js';
import GameEnvironment from './environment.js';
import GameMinimap from './minimap.js';

// 初期化関数
const initGame = () => {
    // GameCoreインスタンスを作成
    window.game = new GameCore();
    
    // ゲームを初期化
    window.game.init();
    
    console.log('ゲームコアシステムが初期化されました');
};

// ページロード時にゲームを初期化
window.addEventListener('load', initGame);

// エクスポート
export {
    GameCore,
    GameAudio,
    GameRendering,
    GameEnvironment,
    GameMinimap,
    initGame
};

export default GameCore;
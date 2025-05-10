/**
 * ゲーム初期化スクリプト
 * index.htmlから読み込まれ、GameCoreインスタンスを作成してゲームを開始します
 */
import GameCore from './core.js';

// ページロード時にゲームを初期化
window.addEventListener('load', () => {
    // GameCoreインスタンスを作成
    window.game = new GameCore();
    
    // ゲームを初期化
    window.game.init();
    
    console.log('ゲームコアシステムが初期化されました');
});
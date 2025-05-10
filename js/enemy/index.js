/**
 * 敵関連モジュールのエントリーポイント
 * すべての敵クラスとファクトリーを一つのファイルからインポートできるようにします
 */
import Enemy from './base.js';
import BossEnemy from './types/bossEnemy.js';
import InternEnemy from './types/internEnemy.js';
import EnemyFactory from './factory.js';

// すべてのクラスをエクスポート
export {
    Enemy,
    BossEnemy,
    InternEnemy,
    EnemyFactory
};

// デフォルトエクスポートとしてファクトリーを設定
export default EnemyFactory;
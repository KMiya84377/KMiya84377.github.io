/**
 * 敵生成ファクトリークラス
 * 様々な種類の敵を簡単に生成するためのファクトリー
 */
import Enemy from './base.js';
import BossEnemy from './types/bossEnemy.js';
import InternEnemy from './types/internEnemy.js';

class EnemyFactory {
    /**
     * 通常の敵を生成
     * @param {Game} game - ゲームインスタンス
     * @param {string} type - 敵タイプ
     * @param {Object} position - 敵の初期位置
     * @returns {Enemy} - 敵インスタンス
     */
    static createEnemy(game, type, position) {
        let options = {
            position: position,
            type: type
        };
        
        switch (type) {
            case 'boss':
                options = {
                    ...options,
                    name: '部長',
                    health: 500,
                    attackPower: 25,
                    attackRange: 3,
                    detectRange: 20,
                    moveSpeed: 0.03,
                    score: 1000,
                    hasRangedAttack: true,
                    rangedAttackPower: 20,
                    rangedAttackRange: 15,
                    rangedAttackCooldown: 4000
                };
                return new BossEnemy(game, options);
                
            case 'customer':
                options = {
                    ...options,
                    name: 'お客様',
                    health: 120,
                    attackPower: 15,
                    moveSpeed: 0.04,
                    score: 150,
                    hasRangedAttack: true,
                    rangedAttackPower: 8,
                    rangedAttackRange: 10
                };
                return new Enemy(game, options);
                
            case 'sales':
                options = {
                    ...options,
                    name: '営業部員',
                    health: 80,
                    attackPower: 12,
                    moveSpeed: 0.07,
                    score: 120,
                    hasRangedAttack: true,
                    rangedAttackPower: 10,
                    rangedAttackRange: 12
                };
                return new Enemy(game, options);
                
            case 'intern':
                options = {
                    ...options,
                    hasRangedAttack: false
                };
                return new InternEnemy(game, options);
                
            case 'finalBoss':
                options = {
                    ...options,
                    name: '社長',
                    health: 1000,
                    attackPower: 30,
                    attackRange: 4,
                    detectRange: 25,
                    moveSpeed: 0.04,
                    score: 5000,
                    hasRangedAttack: true,
                    rangedAttackPower: 25,
                    rangedAttackRange: 20,
                    rangedAttackCooldown: 3000
                };
                return new BossEnemy(game, options);
                
            default:
                options = {
                    ...options,
                    name: '社員',
                    health: 100,
                    attackPower: 10,
                    moveSpeed: 0.05,
                    score: 100,
                    hasRangedAttack: Math.random() > 0.5, // 50%の確率で遠距離攻撃を持つ
                    rangedAttackPower: 7,
                    rangedAttackRange: 8
                };
                return new Enemy(game, options);
        }
    }
    
    /**
     * ステージに応じた敵グループを生成
     * @param {Game} game - ゲームインスタンス
     * @param {number} stageNumber - ステージ番号
     * @param {Array} spawnPoints - スポーンポイント配列
     * @returns {Array} - 敵インスタンスの配列
     */
    static createEnemiesForStage(game, stageNumber, spawnPoints) {
        const enemies = [];
        
        // ステージに応じて敵の数と種類を調整
        let enemyCount = 3 + Math.min(10, Math.floor(stageNumber * 1.5));
        let bossCount = Math.floor(stageNumber / 3);
        let internCount = Math.floor(stageNumber * 0.5); // インターンはステージ数に応じて増加
        
        // スポーンポイントがない場合はランダムな位置に生成
        if (!spawnPoints || spawnPoints.length === 0) {
            spawnPoints = [];
            
            // ランダムなスポーンポイントを生成
            for (let i = 0; i < enemyCount + bossCount + internCount; i++) {
                spawnPoints.push({
                    x: (Math.random() - 0.5) * 40,
                    y: 0,
                    z: (Math.random() - 0.5) * 40
                });
            }
        }
        
        // 通常の敵を生成
        for (let i = 0; i < enemyCount; i++) {
            const spawnIndex = i % spawnPoints.length;
            const position = spawnPoints[spawnIndex];
            
            // ランダムな敵タイプを選択
            const enemyTypes = ['default', 'customer', 'sales'];
            const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            
            enemies.push(EnemyFactory.createEnemy(game, randomType, position));
        }
        
        // インターン敵を生成
        for (let i = 0; i < internCount; i++) {
            const spawnIndex = (enemyCount + i) % spawnPoints.length;
            const position = spawnPoints[spawnIndex];
            
            enemies.push(EnemyFactory.createEnemy(game, 'intern', position));
        }
        
        // ボスを生成
        for (let i = 0; i < bossCount; i++) {
            const spawnIndex = (enemyCount + internCount + i) % spawnPoints.length;
            const position = spawnPoints[spawnIndex];
            
            enemies.push(EnemyFactory.createEnemy(game, 'boss', position));
        }
        
        // ラスボス（最終ステージのみ）
        if (stageNumber % 10 === 0) {
            const finalBossPosition = spawnPoints[0] || { x: 0, y: 0, z: -15 };
            enemies.push(EnemyFactory.createEnemy(game, 'finalBoss', finalBossPosition));
        }
        
        return enemies;
    }
}

export default EnemyFactory;
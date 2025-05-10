/**
 * インターン敵クラス
 * 通常の敵より弱いが素早い敵
 */
import Enemy from '../base.js';

class InternEnemy extends Enemy {
    /**
     * コンストラクタ
     * @param {Game} game - ゲームインスタンス
     * @param {Object} options - 敵の設定オプション
     */
    constructor(game, options = {}) {
        // インターン特有の初期設定を適用
        const internOptions = {
            type: 'intern',
            name: options.name || 'インターン',
            health: options.health || 50,
            attackPower: options.attackPower || 5,
            attackRange: options.attackRange || 1.5,
            detectRange: options.detectRange || 12,
            moveSpeed: options.moveSpeed || 0.09,
            score: options.score || 50,
            ...options
        };
        
        super(game, internOptions);
        
        // インターン特有のプロパティ
        this.evasionChance = 0.3; // 30%の確率で攻撃を回避
    }
    
    /**
     * ダメージを受ける処理のオーバーライド
     */
    takeDamage(damage, source) {
        // 回避判定
        if (Math.random() < this.evasionChance) {
            console.log(`${this.name}が攻撃を回避した！`);
            // 回避エフェクト
            this.showEvasionEffect();
            return;
        }
        
        super.takeDamage(damage, source);
    }
    
    /**
     * 回避エフェクト表示
     */
    showEvasionEffect() {
        // このメソッドは視覚的なフィードバックのために実装
        // 実際のエフェクトはgameのエフェクトシステムを使用する
    }
    
    /**
     * 更新処理のオーバーライド
     */
    update() {
        super.update();
        
        // 素早い動きを表現するためにランダムに方向転換
        if (this.isDetectingPlayer && Math.random() < 0.05) {
            this.performEvasiveMovement();
        }
    }
    
    /**
     * 回避行動
     */
    performEvasiveMovement() {
        if (!this.targetPlayer) return;
        
        // プレイヤーからの方向
        const dx = this.position.x - this.targetPlayer.position.x;
        const dz = this.position.z - this.targetPlayer.position.z;
        
        // 直角方向に動く（横に逃げる）
        const angle = Math.atan2(dx, dz) + (Math.PI / 2) * (Math.random() > 0.5 ? 1 : -1);
        
        // 速度を設定
        this.velocity.x = Math.sin(angle) * this.moveSpeed * 1.5;
        this.velocity.z = Math.cos(angle) * this.moveSpeed * 1.5;
    }
}

export default InternEnemy;
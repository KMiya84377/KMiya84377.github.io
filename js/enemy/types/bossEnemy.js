/**
 * ボス敵クラス
 * 通常の敵よりも強力な特殊敵
 */
import Enemy from '../base.js';

class BossEnemy extends Enemy {
    /**
     * コンストラクタ
     * @param {Game} game - ゲームインスタンス
     * @param {Object} options - 敵の設定オプション
     */
    constructor(game, options = {}) {
        // ボス特有の初期設定を適用
        const bossOptions = {
            type: 'boss',
            name: options.name || '部長',
            health: options.health || 500,
            attackPower: options.attackPower || 25,
            attackRange: options.attackRange || 3,
            detectRange: options.detectRange || 20,
            moveSpeed: options.moveSpeed || 0.03,
            score: options.score || 1000,
            ...options
        };
        
        super(game, bossOptions);
        
        // ボス特有のプロパティ
        this.specialAttackCooldown = 10000; // ミリ秒
        this.lastSpecialAttackTime = 0;
        this.phase = 1; // ボス戦フェーズ
    }
    
    /**
     * 更新処理のオーバーライド
     */
    update() {
        super.update();
        
        // 特殊攻撃の更新
        this.updateSpecialAttack();
        
        // ボスの体力に応じてフェーズ変更
        this.updatePhase();
    }
    
    /**
     * 特殊攻撃の更新
     */
    updateSpecialAttack() {
        // プレイヤーがいない場合は処理しない
        if (!this.targetPlayer) return;
        
        // 現在時刻を取得
        const currentTime = performance.now();
        
        // クールダウンが終わったか
        if (currentTime - this.lastSpecialAttackTime >= this.specialAttackCooldown) {
            // プレイヤーが範囲内にいるか
            const distanceToPlayer = this.distanceTo(this.targetPlayer.position);
            
            if (distanceToPlayer <= this.detectRange) {
                this.performSpecialAttack();
                this.lastSpecialAttackTime = currentTime;
            }
        }
    }
    
    /**
     * 特殊攻撃の実行
     */
    performSpecialAttack() {
        // ボスの種類やフェーズによって異なる特殊攻撃
        switch (this.type) {
            case 'boss':
                this.bossSpecialAttack();
                break;
            case 'finalBoss':
                this.finalBossSpecialAttack();
                break;
            default:
                this.defaultSpecialAttack();
        }
    }
    
    /**
     * 通常ボスの特殊攻撃
     */
    bossSpecialAttack() {
        // 効果音
        this.game.playSound('bossSpecialAttack');
        
        // 範囲攻撃などの特殊効果
        console.log(`${this.name}が特殊攻撃を使用！`);
        
        // プレイヤーにダメージ（範囲攻撃なので通常より広範囲）
        if (this.targetPlayer) {
            const distanceToPlayer = this.distanceTo(this.targetPlayer.position);
            
            if (distanceToPlayer <= this.attackRange * 2) {
                this.targetPlayer.takeDamage(this.attackPower * 1.5, this);
            }
        }
    }
    
    /**
     * 最終ボスの特殊攻撃
     */
    finalBossSpecialAttack() {
        // 効果音
        this.game.playSound('finalBossSpecialAttack');
        
        console.log(`${this.name}が強力な特殊攻撃を使用！`);
        
        // プレイヤーにダメージ（広範囲強力攻撃）
        if (this.targetPlayer) {
            const distanceToPlayer = this.distanceTo(this.targetPlayer.position);
            
            if (distanceToPlayer <= this.attackRange * 3) {
                this.targetPlayer.takeDamage(this.attackPower * 2, this);
            }
        }
        
        // 追加の特殊効果（ここでは簡易的に実装）
        // 例：ミニオン召喚など
        if (Math.random() > 0.5) {
            this.summonMinions();
        }
    }
    
    /**
     * デフォルトの特殊攻撃
     */
    defaultSpecialAttack() {
        console.log(`${this.name}が特殊攻撃を使用！`);
        
        // プレイヤーにダメージ
        if (this.targetPlayer) {
            const distanceToPlayer = this.distanceTo(this.targetPlayer.position);
            
            if (distanceToPlayer <= this.attackRange * 1.5) {
                this.targetPlayer.takeDamage(this.attackPower * 1.2, this);
            }
        }
    }
    
    /**
     * ミニオン召喚（部下の召喚）
     */
    summonMinions() {
        console.log(`${this.name}が部下を召喚！`);
        
        // 周りにランダムな位置に敵を召喚
        for (let i = 0; i < 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 2 + Math.random() * 3;
            
            const spawnPos = {
                x: this.position.x + Math.sin(angle) * distance,
                y: this.position.y,
                z: this.position.z + Math.cos(angle) * distance
            };
            
            // 敵を生成
            const minionOptions = {
                type: 'minion',
                name: '部下',
                health: 50,
                attackPower: 5,
                moveSpeed: 0.06,
                position: spawnPos
            };
            
            const minion = new Enemy(this.game, minionOptions);
            this.game.addEnemy(minion);
        }
    }
    
    /**
     * ボスのフェーズ更新
     */
    updatePhase() {
        const healthPercentage = this.health / this.maxHealth;
        
        // 体力75%以下でフェーズ2
        if (healthPercentage <= 0.75 && this.phase === 1) {
            this.phase = 2;
            this.onPhaseChange();
        }
        // 体力50%以下でフェーズ3
        else if (healthPercentage <= 0.5 && this.phase === 2) {
            this.phase = 3;
            this.onPhaseChange();
        }
        // 体力25%以下でフェーズ4
        else if (healthPercentage <= 0.25 && this.phase === 3) {
            this.phase = 4;
            this.onPhaseChange();
        }
    }
    
    /**
     * フェーズ変更時の処理
     */
    onPhaseChange() {
        console.log(`${this.name}のフェーズが${this.phase}に変化！`);
        
        // フェーズに応じてステータス変更
        switch (this.phase) {
            case 2:
                // 少し速く、攻撃力アップ
                this.moveSpeed *= 1.1;
                this.attackPower *= 1.2;
                break;
            case 3:
                // さらに速く、特殊攻撃の頻度アップ
                this.moveSpeed *= 1.2;
                this.specialAttackCooldown *= 0.8;
                break;
            case 4:
                // 最終フェーズ: 攻撃力大幅アップ
                this.moveSpeed *= 1.3;
                this.attackPower *= 1.5;
                this.specialAttackCooldown *= 0.6;
                
                // 効果音
                this.game.playSound('bossEnrage');
                break;
        }
    }
    
    /**
     * ダメージを受ける処理のオーバーライド
     */
    takeDamage(damage, source) {
        super.takeDamage(damage, source);
        
        // ボス特有の反応
        if (this.health > 0) {
            // 体力の一定割合でプレイヤーに対して特殊な反応
            if (this.health / this.maxHealth <= 0.5 && Math.random() > 0.7) {
                this.performSpecialAttack();
            }
        }
    }
}

export default BossEnemy;
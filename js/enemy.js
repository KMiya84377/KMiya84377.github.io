/**
 * 敵クラス
 * ゲーム内の敵キャラクターを管理するクラス
 */
class Enemy {
    /**
     * コンストラクタ
     * @param {Game} game - ゲームインスタンス
     * @param {Object} options - 敵の設定オプション
     */
    constructor(game, options = {}) {
        this.game = game;
        
        // 敵の基本情報
        this.id = options.id || 'enemy_' + Math.floor(Math.random() * 10000);
        this.type = options.type || 'default';
        this.name = options.name || '社員';
        
        // ステータス
        this.maxHealth = options.health || 100;
        this.health = this.maxHealth;
        this.attackPower = options.attackPower || 10;
        this.attackRange = options.attackRange || 2;
        this.detectRange = options.detectRange || 15;
        this.moveSpeed = options.moveSpeed || 0.05;
        this.attackSpeed = options.attackSpeed || 1; // 秒間の攻撃回数
        this.score = options.score || 100;
        
        // 遠距離攻撃の設定
        this.hasRangedAttack = options.hasRangedAttack || false;
        this.rangedAttackPower = options.rangedAttackPower || this.attackPower * 0.7;
        this.rangedAttackRange = options.rangedAttackRange || 12;
        this.rangedAttackSpeed = options.rangedAttackSpeed || 0.5; // 秒間の攻撃回数
        this.rangedAttackCooldown = options.rangedAttackCooldown || 3000; // ミリ秒
        this.lastRangedAttackTime = 0;
        
        // 位置と動き
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.rotation = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        
        // 状態フラグ
        this.isActive = true;
        this.isAttacking = false;
        this.isRangedAttacking = false;
        this.isDead = false;
        this.isDetectingPlayer = false;
        
        // ターゲット（プレイヤー）
        this.targetPlayer = null;
        
        // 攻撃タイマー
        this.attackTimer = 0;
        this.lastAttackTime = 0;
        
        // AI状態
        this.aiState = 'idle'; // idle, patrol, chase, attack, ranged_attack, retreat
        this.patrolPoints = options.patrolPoints || [];
        this.currentPatrolIndex = 0;
        
        // 3Dモデル（Game クラスで設定される）
        this.model = null;
    }
    
    /**
     * プレイヤーをターゲットに設定
     * @param {Player} player - プレイヤーオブジェクト
     */
    setTarget(player) {
        this.targetPlayer = player;
        this.aiState = 'chase';  // プレイヤーを追いかける状態に設定
    }
    
    /**
     * 敵の更新
     */
    update() {
        if (this.isDead) return;
        
        // AI状態の更新
        this.updateAI();
        
        // 位置の更新
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.position.z += this.velocity.z;
        
        // モデルの位置を更新
        if (this.model) {
            this.model.position.set(
                this.position.x, 
                this.position.y + 1, // 床の上に置く
                this.position.z
            );
            this.model.rotation.y = this.rotation.y;
        } else {
            console.warn(`敵のモデルが設定されていません: ${this.id}`);
        }
        
        // 攻撃処理
        this.updateAttack();
        
        // 遠距離攻撃処理
        this.updateRangedAttack();
    }
    
    /**
     * AI状態の更新
     */
    updateAI() {
        // プレイヤーがいない場合はパトロールモード
        if (!this.targetPlayer) {
            this.aiState = 'patrol';
            this.patrol();
            return;
        }
        
        // プレイヤーとの距離を計算
        const distanceToPlayer = this.distanceTo(this.targetPlayer.position);
        
        // プレイヤーが検知範囲内にいるか
        if (distanceToPlayer <= this.detectRange) {
            this.isDetectingPlayer = true;
            
            // 攻撃範囲内ならば攻撃
            if (distanceToPlayer <= this.attackRange) {
                this.aiState = 'attack';
                this.stopMoving();
                // 攻撃処理は updateAttack() で行う
            } 
            // 遠距離攻撃範囲内ならば遠距離攻撃
            else if (this.hasRangedAttack && distanceToPlayer <= this.rangedAttackRange) {
                this.aiState = 'ranged_attack';
                this.stopMoving();
                // 遠距離攻撃処理は updateRangedAttack() で行う
            }
            // 検知範囲内ならば追跡
            else {
                this.aiState = 'chase';
                this.chasePlayer();
            }
        } 
        // 検知範囲外ならばパトロール
        else {
            this.isDetectingPlayer = false;
            this.aiState = 'patrol';
            this.patrol();
        }
    }
    
    /**
     * パトロール行動
     */
    patrol() {
        // パトロールポイントがない場合は待機
        if (this.patrolPoints.length === 0) {
            this.stopMoving();
            return;
        }
        
        // 現在のパトロールポイントを取得
        const currentPoint = this.patrolPoints[this.currentPatrolIndex];
        
        // ポイントまでの距離を計算
        const distanceToPoint = this.distanceTo(currentPoint);
        
        // ポイントに近づいたら次のポイントへ
        if (distanceToPoint < 0.5) {
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
            return;
        }
        
        // ポイントに向かって移動
        this.moveTowards(currentPoint);
    }
    
    /**
     * プレイヤー追跡
     */
    chasePlayer() {
        if (!this.targetPlayer) return;
        
        // プレイヤーの位置に向かって移動
        this.moveTowards(this.targetPlayer.position);
    }
    
    /**
     * 指定した位置に向かって移動
     * @param {Object} targetPosition - 目標位置
     */
    moveTowards(targetPosition) {
        // 目標への方向を計算
        const dx = targetPosition.x - this.position.x;
        const dz = targetPosition.z - this.position.z;
        
        // 角度を計算
        const angle = Math.atan2(dx, dz);
        this.rotation.y = angle;
        
        // 速度を設定
        this.velocity.x = Math.sin(angle) * this.moveSpeed;
        this.velocity.z = Math.cos(angle) * this.moveSpeed;
    }
    
    /**
     * 移動を停止
     */
    stopMoving() {
        this.velocity = { x: 0, y: 0, z: 0 };
    }
    
    /**
     * 二つの位置間の距離を計算
     * @param {Object} targetPosition - 目標位置
     * @returns {number} - 距離
     */
    distanceTo(targetPosition) {
        const dx = targetPosition.x - this.position.x;
        const dy = targetPosition.y - this.position.y;
        const dz = targetPosition.z - this.position.z;
        
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    /**
     * 攻撃処理の更新
     */
    updateAttack() {
        // 攻撃中でない、またはプレイヤーがいない場合
        if (this.aiState !== 'attack' || !this.targetPlayer) return;
        
        // 現在時刻を取得
        const currentTime = performance.now();
        
        // 前回の攻撃から十分な時間が経過したか
        if (currentTime - this.lastAttackTime >= 1000 / this.attackSpeed) {
            this.attack();
            this.lastAttackTime = currentTime;
        }
    }
    
    /**
     * 遠距離攻撃処理の更新
     */
    updateRangedAttack() {
        // 遠距離攻撃中でない、またはプレイヤーがいない場合
        if (this.aiState !== 'ranged_attack' || !this.targetPlayer) return;
        
        // 現在時刻を取得
        const currentTime = performance.now();
        
        // 前回の遠距離攻撃から十分な時間が経過したか
        if (currentTime - this.lastRangedAttackTime >= this.rangedAttackCooldown) {
            this.rangedAttack();
            this.lastRangedAttackTime = currentTime;
        }
    }
    
    /**
     * 攻撃実行
     */
    attack() {
        // プレイヤーが範囲内にいるかを再確認
        if (!this.targetPlayer) return;
        
        const distanceToPlayer = this.distanceTo(this.targetPlayer.position);
        
        if (distanceToPlayer <= this.attackRange) {
            // 攻撃アニメーション（仮）
            this.isAttacking = true;
            
            // 効果音
            this.game.playSound('enemyAttack');
            
            // プレイヤーにダメージ
            this.targetPlayer.takeDamage(this.attackPower, this);
            
            // 攻撃モーションの終了
            setTimeout(() => {
                this.isAttacking = false;
            }, 300);
        }
    }
    
    /**
     * 遠距離攻撃実行
     */
    rangedAttack() {
        // プレイヤーが範囲内にいるかを再確認
        if (!this.targetPlayer) return;
        
        const distanceToPlayer = this.distanceTo(this.targetPlayer.position);
        
        if (distanceToPlayer <= this.rangedAttackRange) {
            // 遠距離攻撃アニメーション（仮）
            this.isRangedAttacking = true;
            
            // 効果音
            this.game.playSound('enemyRangedAttack');
            
            // 攻撃方向を計算
            const direction = {
                x: this.targetPlayer.position.x - this.position.x,
                y: this.targetPlayer.position.y + 1 - (this.position.y + 1), // 目線の高さに合わせる
                z: this.targetPlayer.position.z - this.position.z
            };
            
            // 方向を正規化
            const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
            direction.x /= length;
            direction.y /= length;
            direction.z /= length;
            
            // 遠距離攻撃エフェクトの作成
            this.createRangedAttackEffect(direction);
            
            // プレイヤーにダメージ（ランダムなミス率を設定）
            if (Math.random() > 0.3) { // 70%の命中率
                this.targetPlayer.takeDamage(this.rangedAttackPower, this);
            }
            
            // 遠距離攻撃モーションの終了
            setTimeout(() => {
                this.isRangedAttacking = false;
            }, 300);
        }
    }
    
    /**
     * 遠距離攻撃エフェクトの作成
     */
    createRangedAttackEffect(direction) {
        // 攻撃の開始位置（敵の位置、少し高めに）
        const startPosition = new THREE.Vector3(
            this.position.x,
            this.position.y + 1.2, 
            this.position.z
        );
        
        // 攻撃の終了位置（方向ベクトルを使って計算）
        const endPosition = new THREE.Vector3(
            startPosition.x + direction.x * 20,
            startPosition.y + direction.y * 20,
            startPosition.z + direction.z * 20
        );
        
        // レイキャストで実際の衝突位置を検出
        const raycaster = new THREE.Raycaster(startPosition, new THREE.Vector3(direction.x, direction.y, direction.z));
        const targets = [this.game.player.model];
        
        // 環境オブジェクトも含める
        const environmentObjects = this.game.gameObjects.environment;
        const allTargets = [...environmentObjects];
        
        const intersects = raycaster.intersectObjects(allTargets, true);
        if (intersects.length > 0) {
            // 衝突地点があればそこまでの攻撃を描画
            endPosition.copy(intersects[0].point);
        }
        
        // 攻撃を表す線分を作成
        const attackGeometry = new THREE.BufferGeometry().setFromPoints([
            startPosition,
            endPosition
        ]);
        
        // 敵タイプに応じた攻撃エフェクトの色を設定
        let attackColor = 0xff0000; // デフォルト: 赤色
        
        if (this.type === 'boss' || this.type === 'finalBoss') {
            attackColor = 0xff00ff; // ボス: 紫色
        } else if (this.type === 'customer') {
            attackColor = 0x0000ff; // お客様: 青色
        } else if (this.type === 'sales') {
            attackColor = 0x00ff00; // 営業: 緑色
        }
        
        const attackMaterial = new THREE.LineBasicMaterial({ 
            color: attackColor,
            transparent: true,
            opacity: 0.8,
            linewidth: 2
        });
        
        const attackLine = new THREE.Line(attackGeometry, attackMaterial);
        this.game.scene.add(attackLine);
        
        // 少し経過したら攻撃エフェクトを消す
        setTimeout(() => {
            this.game.scene.remove(attackLine);
            attackLine.geometry.dispose();
            attackMaterial.dispose();
        }, 200);
    }
    
    /**
     * ターゲット（プレイヤー）の設定
     * @param {Player} player - プレイヤーインスタンス
     */
    setTarget(player) {
        this.targetPlayer = player;
    }
    
    /**
     * ダメージを受ける
     * @param {number} damage - ダメージ量
     * @param {Object} source - ダメージ源（通常はプレイヤー）
     */
    takeDamage(damage, source) {
        // 既に死亡している場合は処理しない
        if (this.isDead) return;
        
        // ダメージを適用
        this.health -= damage;
        
        // 効果音
        this.game.playSound('enemyHit');
        
        // ダメージ表示エフェクト（必要に応じて実装）
        this.showDamageEffect(damage);
        
        console.log(`${this.name}に${damage}のダメージ！ 残りHP: ${this.health}`);
        
        // 体力が0以下になったら死亡
        if (this.health <= 0) {
            this.die(source);
        }
        // ダメージを受けたらプレイヤーを追跡
        else if (source && source === this.game.player) {
            this.isDetectingPlayer = true;
            this.aiState = 'chase';
        }
    }
    
    /**
     * ダメージ表示エフェクト
     * @param {number} damage - ダメージ量
     */
    showDamageEffect(damage) {
        // このメソッドは視覚的なフィードバックのために実装
        // 実際のエフェクトはgameのエフェクトシステムを使用する
    }
    
    /**
     * 死亡処理
     * @param {Object} killer - 倒したオブジェクト（通常はプレイヤー）
     */
    die(killer) {
        this.isDead = true;
        this.health = 0;
        this.stopMoving();
        
        // 効果音
        this.game.playSound('enemyDeath');
        
        // プレイヤーにスコアを加算
        if (killer && killer === this.game.player) {
            killer.addScore(this.score);
        }
        
        // 死亡アニメーション/エフェクト
        this.playDeathAnimation();
        
        // 一定時間後に敵を削除
        setTimeout(() => {
            this.game.removeEnemy(this);
        }, 1000);
    }
    
    /**
     * 死亡アニメーション
     */
    playDeathAnimation() {
        // このメソッドは視覚的なフィードバックのために実装
        // モデルが存在する場合はアニメーション
        if (this.model) {
            // 回転させながら沈む簡易アニメーション
            const animate = () => {
                if (!this.model) return; // モデルが既に削除されていたら中止
                
                this.model.rotation.y += 0.1;
                this.model.position.y -= 0.03;
                
                if (this.model.position.y > -1) {
                    requestAnimationFrame(animate);
                }
            };
            
            animate();
        }
    }
}

/**
 * ボス敵クラス
 * 通常の敵よりも強力な特殊敵
 */
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

/**
 * インターン敵クラス
 * 通常の敵より弱いが素早い敵
 */
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

/**
 * 敵生成ファクトリークラス
 * 様々な種類の敵を簡単に生成するためのファクトリー
 */
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
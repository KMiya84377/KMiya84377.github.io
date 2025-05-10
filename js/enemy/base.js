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
        this.detectRange = options.detectRange || 8; // 検知範囲をさらに縮小（10→8）
        this.moveSpeed = options.moveSpeed * 0.6 || 0.03; // 移動速度をさらに低減（30%→40%減）
        this.attackSpeed = options.attackSpeed || 1; // 秒間の攻撃回数
        this.score = options.score || 100;
        
        // 遠距離攻撃の設定
        this.hasRangedAttack = options.hasRangedAttack || false;
        this.rangedAttackPower = options.rangedAttackPower || this.attackPower * 0.7;
        this.rangedAttackRange = options.rangedAttackRange || 10; // 遠距離攻撃範囲も縮小
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
        this.aiState = 'patrol'; // 最初はパトロール状態から
        
        // パトロールポイントを自動生成（デフォルト設定）
        if (!options.patrolPoints || options.patrolPoints.length === 0) {
            this.generatePatrolPoints();
        } else {
            this.patrolPoints = options.patrolPoints;
        }
        
        this.currentPatrolIndex = 0;
        
        // 3Dモデル（Game クラスで設定される）
        this.model = null;
        
        // ゲーム開始時にプレイヤーを即座に攻撃しないようにするための遅延
        this.initialDetectionDelay = 5000 + Math.random() * 5000; // 5-10秒のランダムな遅延に延長
        this.canDetectPlayer = false;
        
        // 一定時間後に検知を有効化
        setTimeout(() => {
            this.canDetectPlayer = true;
        }, this.initialDetectionDelay);
        
        // 敵の攻撃頻度を下げるためのクールダウンを追加
        this.attackCooldown = 1500 + Math.random() * 1000; // 1.5-2.5秒
    }
    
    /**
     * パトロールポイントを自動生成
     */
    generatePatrolPoints() {
        // スポーン位置を中心に数個のパトロールポイントを生成
        this.patrolPoints = [];
        const patrolRadius = 5 + Math.random() * 10; // 5-15メートルの範囲
        
        // 3〜5個のランダムなパトロールポイントを生成
        const numPoints = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2 + Math.random() * 0.5; // 少しランダム性を加える
            const distance = patrolRadius * (0.6 + Math.random() * 0.4); // 半径の60-100%
            
            const point = {
                x: this.position.x + Math.cos(angle) * distance,
                y: 0, // 地面に配置
                z: this.position.z + Math.sin(angle) * distance
            };
            
            // 部屋の境界内に収める
            const roomSize = 24;
            point.x = Math.max(-roomSize, Math.min(roomSize, point.x));
            point.z = Math.max(-roomSize, Math.min(roomSize, point.z));
            
            this.patrolPoints.push(point);
        }
        
        // 最初のポイントとしてスポーン位置を追加
        this.patrolPoints.push({
            x: this.position.x,
            y: 0,
            z: this.position.z
        });
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
        
        // モデルがなければ作成
        if (!this.model) {
            console.log('敵のモデルがないため作成します');
            this.createModel();
        }
        
        // ゲームが一時停止中は何もしない
        if (this.game.isPaused) {
            return;
        }
        
        // モデルの位置を更新
        if (this.model) {
            this.model.position.set(this.position.x, this.position.y, this.position.z);
        } else {
            console.warn(`モデルが正しく設定されていません: ${this.name} (ID: ${this.id})`);
        }
        
        // プレイヤーの検知と追跡
        if (this.targetPlayer && this.canDetectPlayer) {
            this.trackPlayer();
        }
        
        // 経路探索の更新
        this.updatePathFinding();
        
        // 物理演算の更新
        this.updatePhysics();
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

        // 初期検知遅延中は検知しない
        if (!this.canDetectPlayer) {
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
     * プレイヤー追跡の実装
     * Note: 現在のコードには実装されていないようなので、空のメソッドとして定義
     */
    trackPlayer() {
        // プレイヤーを追跡するロジックを実装
        this.updateAI();
    }

    /**
     * 経路探索の更新
     * Note: 現在のコードには実装されていないようなので、空のメソッドとして定義
     */
    updatePathFinding() {
        // 経路探索ロジックを実装
    }

    /**
     * 物理演算の更新
     * Note: 現在のコードには実装されていないようなので、空のメソッドとして定義
     */
    updatePhysics() {
        // 衝突判定など物理演算の更新
        this.checkCollision();
        
        // 位置の更新
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.position.z += this.velocity.z;
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
        if (this.isDead) {
            console.warn(`重複死亡処理が発生: ${this.name} (ID: ${this.id}) は既に倒されています`);
            return; // 既に死亡処理済みならスキップ（２重死亡防止）
        }
        
        // 死亡時の詳細なデバッグログ
        const killerInfo = killer ? 
            (killer === this.game.player ? "プレイヤー" : killer.name || "unknown") : 
            "不明な原因";
        
        const positionInfo = `位置: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)})`;
        const timeInfo = `ゲーム経過時間: ${(performance.now() / 1000).toFixed(1)}秒`;
        
        console.log(`[敵死亡] ${this.name} (ID: ${this.id}) が${killerInfo}によって倒されました - ${positionInfo} - ${timeInfo}`);
        
        // 死亡フラグ設定
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
    
    /**
     * 衝突判定の処理
     */
    checkCollision() {
        // 敵がすでに死亡していたら衝突判定はスキップ
        if (this.isDead) return;

        // デバッグログ
        const debugCollision = false; // デバッグ用フラグ

        // 敵の円柱状のバウンディングボックス
        const enemyRadius = 0.5; // 敵の横幅（半径）
        
        // 部屋の境界チェック
        const roomSize = 24; // 部屋の半分のサイズ（余裕を持たせる）
        
        // X座標の制限
        if (this.position.x > roomSize) this.position.x = roomSize;
        if (this.position.x < -roomSize) this.position.x = -roomSize;
        
        // Z座標の制限
        if (this.position.z > roomSize) this.position.z = roomSize;
        if (this.position.z < -roomSize) this.position.z = -roomSize;
        
        // Y座標が異常な場合は修正（地面より下や高すぎる場合）
        if (this.position.y < 0) this.position.y = 0;
        if (this.position.y > 10) this.position.y = 0;
        
        // プレイヤーとの衝突を防ぐ（近すぎる場合は少し離す）
        if (this.targetPlayer && this.targetPlayer.position) {
            const dx = this.targetPlayer.position.x - this.position.x;
            const dz = this.targetPlayer.position.z - this.position.z;
            const distanceSquared = dx * dx + dz * dz;
            
            const minDistance = 2.0; // プレイヤーとの最小距離
            if (distanceSquared < minDistance * minDistance) {
                // プレイヤーから離れる方向に移動
                const angle = Math.atan2(dx, dz);
                const pushDistance = minDistance - Math.sqrt(distanceSquared);
                this.position.x -= Math.sin(angle) * pushDistance;
                this.position.z -= Math.cos(angle) * pushDistance;
            }
        }
        
        // 前のフレームの位置を記憶（衝突時に戻すため）
        const previousPosition = { x: this.position.x, y: this.position.y, z: this.position.z };
        
        // 環境内の障害物との衝突チェック
        // このコードブロックを try-catch で囲み、エラーでゲームが止まらないようにする
        try {
            const obstacles = this.game.gameObjects.environment.filter(obj => 
                obj.name === "obstacle" || obj.name === "furniture" || obj.name === "wall");
            
            // 衝突判定した障害物の数をカウント（デバッグ用）
            let collisionChecks = 0;
            let actualCollisions = 0;
            
            for (const obstacle of obstacles) {
                if (!obstacle.geometry) continue; // ジオメトリがない場合はスキップ
                
                try {
                    collisionChecks++;
                    
                    // 障害物のバウンディングボックスを取得
                    let box;
                    if (!obstacle.geometry.boundingBox) {
                        obstacle.geometry.computeBoundingBox();
                    }
                    box = obstacle.geometry.boundingBox.clone();
                    
                    // ワールド座標系に変換
                    box.applyMatrix4(obstacle.matrixWorld);
                    
                    // 障害物の位置を取得
                    const obstaclePos = new THREE.Vector3();
                    obstacle.getWorldPosition(obstaclePos);
                    
                    // 敵から障害物への方向ベクトル
                    const dx = obstaclePos.x - this.position.x;
                    const dz = obstaclePos.z - this.position.z;
                    
                    // 距離の2乗
                    const distanceSquared = dx * dx + dz * dz;
                    
                    // 衝突判定の半径
                    const boxSize = new THREE.Vector3();
                    box.getSize(boxSize);
                    const obstacleRadius = Math.max(boxSize.x, boxSize.z) / 2;
                    
                    // 衝突判定
                    const minDistance = enemyRadius + obstacleRadius;
                    if (distanceSquared < minDistance * minDistance) {
                        actualCollisions++;
                        
                        // 衝突しているので位置を調整
                        if (distanceSquared > 0.1) { // 0に近すぎると方向が定まらないので小さな値で制限
                            const angle = Math.atan2(dx, dz);
                            const pushDistance = (minDistance - Math.sqrt(distanceSquared)) * 0.5; // 緩やかに押し戻す
                            
                            this.position.x -= Math.sin(angle) * pushDistance;
                            this.position.z -= Math.cos(angle) * pushDistance;
                        } else {
                            // 完全に重なっている場合はランダムな方向に少し押し出す
                            const randomAngle = Math.random() * Math.PI * 2;
                            this.position.x += Math.sin(randomAngle) * 0.2;
                            this.position.z += Math.cos(randomAngle) * 0.2;
                        }
                    }
                } catch (e) {
                    if (debugCollision) {
                        console.warn("敵の衝突判定処理でエラー:", e);
                    }
                    continue; // このオブジェクトをスキップ
                }
            }
            
            if (debugCollision && (collisionChecks > 0 || actualCollisions > 0)) {
                console.log(`敵 ${this.id} の衝突判定: 障害物 ${collisionChecks}個中 ${actualCollisions}個と衝突`);
            }
            
        } catch (err) {
            // すべての衝突判定が失敗しても、敵は消えない
            console.warn("敵の衝突判定処理全体でエラー:", err);
        }
        
        // 敵同士の衝突を防止（ただし計算量を抑えるため近くの敵だけチェック）
        try {
            const nearbyEnemies = this.game.enemies.filter(enemy => 
                enemy !== this && !enemy.isDead && 
                Math.abs(enemy.position.x - this.position.x) < 3 && 
                Math.abs(enemy.position.z - this.position.z) < 3
            );
            
            for (const otherEnemy of nearbyEnemies) {
                const dx = otherEnemy.position.x - this.position.x;
                const dz = otherEnemy.position.z - this.position.z;
                const distanceSquared = dx * dx + dz * dz;
                
                const minDistance = 1.5; // 敵同士の最小距離
                if (distanceSquared < minDistance * minDistance && distanceSquared > 0.1) {
                    // 互いに離れる方向に移動（押し出し力を弱める）
                    const angle = Math.atan2(dx, dz);
                    const pushDistance = (minDistance - Math.sqrt(distanceSquared)) * 0.2; // 押し出し力を0.3から0.2に弱める
                    this.position.x -= Math.sin(angle) * pushDistance;
                    this.position.z -= Math.cos(angle) * pushDistance;
                }
            }
        } catch (err) {
            console.warn("敵同士の衝突判定でエラー:", err);
        }
        
        // モデルの位置を更新
        if (this.model) {
            this.model.position.set(
                this.position.x, 
                this.position.y + 1, // 床の上に置く
                this.position.z
            );
        }
    }
    
    /**
     * 敵の初期化
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {number} z - Z座標
     */
    init(x, y, z) {
        console.log(`敵の初期化: ${this.name} (ID: ${this.id})`);
        
        this.position = {
            x: x !== undefined ? x : (Math.random() - 0.5) * 20,
            y: y !== undefined ? y : 1,
            z: z !== undefined ? z : (Math.random() - 0.5) * 20
        };
        
        console.log(`敵の初期位置: (${this.position.x}, ${this.position.y}, ${this.position.z})`);
        
        this.rotation = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.isActive = true;
        this.isDead = false;
        this.isAttacking = false;
        this.lastAttackTime = 0;
        this.targetPlayer = null;
        this.detectionDistance = 15; // プレイヤー検知距離
        this.attackDistance = 2;     // 攻撃可能距離
        this.pathFindingTimer = 0;   // 経路探索のクールダウン
        this.canDetectPlayer = false; // 初期状態では検知しない（遅延後に有効化）
        
        // モデルが設定されていなければ作成する
        if (!this.model) {
            this.createModel();
        } else {
            // モデルがすでにある場合は位置を更新
            this.model.position.set(this.position.x, this.position.y, this.position.z);
        }
    }
    
    /**
     * 敵のモデルを作成
     */
    createModel() {
        // 敵のタイプに基づいて異なるモデルを作成
        let geometry, material;
        
        switch(this.type) {
            case 'boss':
                geometry = new THREE.BoxGeometry(1.2, 2.2, 1.2);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xff0000,
                    roughness: 0.7,
                    metalness: 0.3
                });
                break;
            case 'customer':
                geometry = new THREE.BoxGeometry(0.9, 1.8, 0.9);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0x0000ff,
                    roughness: 0.8,
                    metalness: 0.2
                });
                break;
            case 'finalBoss':
                geometry = new THREE.BoxGeometry(1.5, 2.5, 1.5);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0x550000,
                    roughness: 0.5,
                    metalness: 0.5,
                    emissive: 0x330000,
                    emissiveIntensity: 0.2
                });
                break;
            default:
                geometry = new THREE.BoxGeometry(1, 2, 1);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xffff00,
                    roughness: 0.8,
                    metalness: 0.2
                });
        }
        
        // モデルの作成
        this.model = new THREE.Mesh(geometry, material);
        this.model.position.set(this.position.x, this.position.y, this.position.z);
        this.model.castShadow = true;
        this.model.receiveShadow = true;
        this.model.name = `enemy-${this.id}`;
        this.model.userData.enemyId = this.id; // モデルに敵のIDを関連付ける
        
        // シーンに追加
        if (this.game && this.game.scene) {
            this.game.scene.add(this.model);
            console.log(`敵のモデルをシーンに追加: ${this.name} (ID: ${this.id})`);
        } else {
            console.error('シーンが見つかりません。敵のモデルを追加できませんでした。');
        }
    }
}

// エクスポート
export default Enemy;
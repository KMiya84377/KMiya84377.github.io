/**
 * プレイヤークラス
 * プレイヤーの動作や状態を管理します
 */
class Player {
    constructor(game) {
        this.game = game;
        this.health = GameConfig.player.health;
        this.maxHealth = GameConfig.player.health;
        this.ammo = GameConfig.player.maxAmmo;
        this.maxAmmo = GameConfig.player.maxAmmo;
        this.score = 0;
        this.isReloading = false;
        this.canShoot = true;
        this.specialAbilityReady = true;
        this.specialAbilityActive = false;
        this.specialAbilityMeter = 0;
        
        // 特殊能力のタイプ: "attack"(攻撃強化) または "buff"(バフ/防御強化)
        this.specialAbilityType = "attack";
        
        // 位置と方向
        this.position = { x: 0, y: 0, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.onGround = true;
        
        // 3Dモデル関連
        this.model = null;
        this.weaponModel = null;
        this.muzzleFlash = null;
        this.specialEffects = [];
        
        // キー状態を記録するオブジェクト
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            reload: false,
            special: false
        };
        
        // 3Dモデルの初期化
        this.initModel();
        
        // 入力設定
        this.setupControls();
    }
    
    /**
     * 3Dモデルの初期化
     */
    initModel() {
        // プレイヤーの視点が一人称なので、自分自身のモデルは基本的に表示しない
        
        // 武器モデル
        const weaponGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
        const weaponMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        this.weaponModel = new THREE.Mesh(weaponGeometry, weaponMaterial);
        
        // 武器の位置を調整（画面右下あたり）
        this.weaponModel.position.set(0.3, -0.2, -0.5);
        
        // カメラの子要素として武器を追加
        this.game.camera.add(this.weaponModel);
        
        // マズルフラッシュ（射撃時のエフェクト）の準備
        const flashGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        this.muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        this.muzzleFlash.position.set(0, 0, -0.3);
        this.muzzleFlash.visible = false;
        this.weaponModel.add(this.muzzleFlash);
        
        // 特殊能力エフェクト
        const specialEffectGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const specialEffectMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.5
        });
        const specialEffect = new THREE.Mesh(specialEffectGeometry, specialEffectMaterial);
        specialEffect.visible = false;
        this.specialEffects.push(specialEffect);
        this.game.camera.add(specialEffect);
    }
    
    /**
     * キーボードとマウスの入力制御をセットアップ
     */
    setupControls() {
        // キーの押下状態を管理
        document.addEventListener('keydown', (event) => {
            switch (event.key.toLowerCase()) {
                case 'w':
                case 'arrowup':
                    this.keys.forward = true;
                    break;
                case 's':
                case 'arrowdown':
                    this.keys.backward = true;
                    break;
                case 'a':
                case 'arrowleft':
                    this.keys.left = true;
                    break;
                case 'd':
                case 'arrowright':
                    this.keys.right = true;
                    break;
                case ' ':
                    this.keys.jump = true;
                    break;
                case 'r':
                    this.reload();
                    break;
                case 'q': // Qキーでも特殊能力が発動できるようにする
                case 'e': // Eキーでも特殊能力が発動できるようにする
                case 'shift': // シフトキーでも特殊能力が発動できるようにする
                    this.useSpecialAbility();
                    break;
            }
        });
        
        // キーを離した時の処理を追加
        document.addEventListener('keyup', (event) => {
            switch (event.key.toLowerCase()) {
                case 'w':
                case 'arrowup':
                    this.keys.forward = false;
                    break;
                case 's':
                case 'arrowdown':
                    this.keys.backward = false;
                    break;
                case 'a':
                case 'arrowleft':
                    this.keys.left = false;
                    break;
                case 'd':
                case 'arrowright':
                    this.keys.right = false;
                    break;
                case ' ':
                    this.keys.jump = false;
                    break;
            }
        });
        
        // スペースキーでの特殊能力発動を別のイベントハンドラで監視
        document.addEventListener('keypress', (event) => {
            if (event.key === ' ' && this.game.isActive) {
                this.useSpecialAbility();
            }
        });
        
        // 特殊能力切り替えボタンのイベントリスナー
        const switchButton = document.getElementById('switch-ability-button');
        if (switchButton) {
            switchButton.addEventListener('click', () => {
                this.switchSpecialAbilityType();
            });
        }
        
        // マウス動作
        document.addEventListener('mousemove', (event) => {
            if (this.game.isActive) {
                // マウス移動で視点を変える（FPSスタイル）
                const sensitivity = 0.002;
                this.rotation.y -= event.movementX * sensitivity;
                this.rotation.x -= event.movementY * sensitivity;
                
                // 視点の上下制限（真上や真下を超えないように）
                this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));
            }
        });
        
        // 射撃処理
        document.addEventListener('mousedown', (event) => {
            if (event.button === 0 && this.game.isActive) { // 左クリック
                this.shoot();
            }
        });
        
        // ポインターロック（マウスカーソルをゲーム画面内に固定）
        document.getElementById('game-canvas').addEventListener('click', () => {
            if (this.game.isActive) {
                document.getElementById('game-canvas').requestPointerLock();
            }
        });
    }
    
    /**
     * 移動処理
     */
    move() {
        // 移動方向を計算
        const moveSpeed = GameConfig.player.moveSpeed;
        // 特殊能力「バフ」発動中は移動速度アップ
        const speedMultiplier = (this.specialAbilityActive && this.specialAbilityType === "buff") ? 1.5 : 1;
        
        let moveVector = { x: 0, y: 0, z: 0 };
        
        // 現在向いている方向を基準に前後左右の移動を計算（修正済み）
        if (this.keys.forward) {  // Wキー: 前進
            moveVector.x += Math.sin(this.rotation.y) * moveSpeed * speedMultiplier;
            moveVector.z += Math.cos(this.rotation.y) * moveSpeed * speedMultiplier;
        }
        
        if (this.keys.backward) { // Sキー: 後退
            moveVector.x -= Math.sin(this.rotation.y) * moveSpeed * speedMultiplier;
            moveVector.z -= Math.cos(this.rotation.y) * moveSpeed * speedMultiplier;
        }
        
        if (this.keys.left) {     // Aキー: 左へ移動
            moveVector.x -= Math.cos(this.rotation.y) * moveSpeed * speedMultiplier;
            moveVector.z += Math.sin(this.rotation.y) * moveSpeed * speedMultiplier;
        }
        
        if (this.keys.right) {    // Dキー: 右へ移動
            moveVector.x += Math.cos(this.rotation.y) * moveSpeed * speedMultiplier;
            moveVector.z -= Math.sin(this.rotation.y) * moveSpeed * speedMultiplier;
        }
        
        // 移動量を適用
        this.position.x += moveVector.x;
        this.position.z += moveVector.z;
        
        // カメラの位置更新を追加
        this.game.camera.position.set(this.position.x, this.position.y + 2, this.position.z);
        
        // 壁との衝突判定（簡易版）
        this.checkCollision();
        
        // ジャンプと重力
        if (this.keys.jump && this.onGround) {
            this.velocity.y = GameConfig.player.jumpForce;
            this.onGround = false;
            // ジャンプ音の再生
            this.game.playSound('jump');
        }
        
        // 重力を適用
        if (!this.onGround) {
            this.velocity.y -= GameConfig.player.gravity;
        }
        
        this.position.y += this.velocity.y;
        
        // 地面との衝突判定
        if (this.position.y <= 0) {
            this.position.y = 0;
            this.velocity.y = 0;
            this.onGround = true;
        }
    }
    
    /**
     * 壁や障害物との衝突判定
     */
    checkCollision() {
        // プレイヤーの円柱状のバウンディングボックス
        const playerRadius = 0.5; // プレイヤーの横幅（半径）
        
        // 部屋の境界チェック
        const roomSize = 24; // 部屋の半分のサイズ（余裕を持たせる）
        
        // X座標の制限
        if (this.position.x > roomSize) this.position.x = roomSize;
        if (this.position.x < -roomSize) this.position.x = -roomSize;
        
        // Z座標の制限
        if (this.position.z > roomSize) this.position.z = roomSize;
        if (this.position.z < -roomSize) this.position.z = -roomSize;
        
        // 環境内の障害物との衝突チェック
        const obstacles = this.game.gameObjects.environment.filter(obj => obj.name === "obstacle" || obj.name === "furniture" || obj.name === "wall");
        
        // 前のフレームの位置を記憶（衝突時に戻すため）
        const previousPosition = { x: this.position.x, y: this.position.y, z: this.position.z };
        
        for (const obstacle of obstacles) {
            if (!obstacle.geometry) continue; // ジオメトリがない場合はスキップ
            
            // 障害物のバウンディングボックスを取得
            let box;
            if (!obstacle.geometry.boundingBox) {
                obstacle.geometry.computeBoundingBox();
            }
            box = obstacle.geometry.boundingBox.clone();
            
            // ワールド座標系に変換
            box.applyMatrix4(obstacle.matrixWorld);
            
            // プレイヤーと障害物の距離を計算
            const obstaclePos = new THREE.Vector3();
            obstacle.getWorldPosition(obstaclePos);
            
            // プレイヤーから障害物への方向ベクトル
            const dx = obstaclePos.x - this.position.x;
            const dz = obstaclePos.z - this.position.z;
            
            // 距離の2乗（ルート計算を避けるため）
            const distanceSquared = dx * dx + dz * dz;
            
            // 衝突判定の半径（障害物のサイズに応じて調整）
            let collisionRadius = playerRadius;
            
            // バウンディングボックスから近似する衝突半径
            const boxSize = new THREE.Vector3();
            box.getSize(boxSize);
            const obstacleRadius = Math.max(boxSize.x, boxSize.z) / 2;
            
            // 衝突判定
            const minDistance = collisionRadius + obstacleRadius;
            if (distanceSquared < minDistance * minDistance) {
                // 衝突しているので位置を調整
                // 衝突した方向と逆に少し押し戻す
                if (distanceSquared > 0) {
                    const angle = Math.atan2(dx, dz);
                    const pushDistance = minDistance - Math.sqrt(distanceSquared) + 0.1; // 少し余分に押し戻す
                    
                    this.position.x = previousPosition.x - Math.sin(angle) * pushDistance;
                    this.position.z = previousPosition.z - Math.cos(angle) * pushDistance;
                } else {
                    // 完全に重なっている場合はランダムな方向に押し出す
                    const randomAngle = Math.random() * Math.PI * 2;
                    this.position.x = obstaclePos.x + Math.sin(randomAngle) * minDistance;
                    this.position.z = obstaclePos.z + Math.cos(randomAngle) * minDistance;
                }
            }
        }
    }
    
    /**
     * 射撃処理
     */
    shoot() {
        if (!this.canShoot || this.isReloading || this.ammo <= 0) return;
        
        this.canShoot = false;
        this.ammo--;
        
        // 弾の発射音を再生
        this.game.playSound('shoot');
        
        // マズルフラッシュの表示
        this.showMuzzleFlash();
        
        // 弾道エフェクトの作成
        this.createBulletTrail();
        
        // レイキャスト（弾道計算）して敵との当たり判定
        const hit = this.game.raycast(this.position, this.rotation, GameConfig.player.weaponRange);
        
        if (hit && hit.enemy) {
            // 敵に当たった場合のダメージ計算
            const damage = this.specialAbilityActive ? 
                GameConfig.player.damage * 2 : GameConfig.player.damage;
            
            hit.enemy.takeDamage(damage, this);
            
            // ヒット効果音
            this.game.playSound('hit');
            
            // ヒットエフェクトを表示
            this.createHitEffect(hit.point);
            
            console.log(`敵に命中! ダメージ: ${damage}`);
        } else {
            console.log('射撃: 外れ');
        }
        
        // 射撃後のディレイを設定
        setTimeout(() => {
            this.canShoot = true;
        }, GameConfig.player.shootDelay);
        
        // 弾切れチェック
        if (this.ammo <= 0) {
            this.reload();
        }
        
        // HUDの更新
        this.updateHUD();
    }
    
    /**
     * 弾道エフェクトの作成
     */
    createBulletTrail() {
        // 弾道の開始位置（マズルフラッシュの位置）
        const startPosition = new THREE.Vector3();
        this.muzzleFlash.getWorldPosition(startPosition);
        
        // 弾道の方向ベクトル
        const direction = new THREE.Vector3(
            Math.sin(this.rotation.y) * Math.cos(this.rotation.x),
            Math.sin(this.rotation.x),
            Math.cos(this.rotation.y) * Math.cos(this.rotation.x)
        ).normalize();
        
        // 弾道の終了位置（一定距離前方）
        const endPosition = new THREE.Vector3().copy(startPosition).add(
            direction.clone().multiplyScalar(50)
        );
        
        // レイキャストで実際の衝突位置を検出
        const raycaster = new THREE.Raycaster(startPosition, direction);
        const targets = this.game.enemies
            .filter(enemy => enemy.model && !enemy.isDead)
            .map(enemy => enemy.model);
        
        // 環境オブジェクトも含める
        const environmentObjects = this.game.gameObjects.environment;
        const allTargets = [...targets, ...environmentObjects];
        
        const intersects = raycaster.intersectObjects(allTargets, true);
        if (intersects.length > 0) {
            // 衝突地点があればそこまでの弾道を描画
            endPosition.copy(intersects[0].point);
        }
        
        // 弾道を表す線分を作成
        const trailGeometry = new THREE.BufferGeometry().setFromPoints([
            startPosition,
            endPosition
        ]);
        
        const trailMaterial = new THREE.LineBasicMaterial({ 
            color: this.specialAbilityActive ? 0x00ffff : 0xffffaa,
            transparent: true,
            opacity: 0.8,
            linewidth: 1
        });
        
        const trail = new THREE.Line(trailGeometry, trailMaterial);
        this.game.scene.add(trail);
        
        // 少し経過したら弾道を消す
        setTimeout(() => {
            this.game.scene.remove(trail);
            trail.geometry.dispose();
            trail.material.dispose();
        }, 100);
    }
    
    /**
     * ヒットエフェクトの表示
     */
    createHitEffect(position) {
        if (!position) return;
        
        // ヒットエフェクト（パーティクル）
        const particleCount = 20;
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        for (let i = 0; i < particleCount; i++) {
            // ヒット地点から全方向にパーティクルを飛ばす
            const x = (Math.random() - 0.5) * 0.5;
            const y = (Math.random() - 0.5) * 0.5;
            const z = (Math.random() - 0.5) * 0.5;
            
            vertices.push(position.x, position.y, position.z);
            vertices.push(position.x + x, position.y + y, position.z + z);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        const material = new THREE.LineBasicMaterial({
            color: this.specialAbilityActive ? 0x00ffff : 0xff0000,
            transparent: true,
            opacity: 0.8
        });
        
        const particles = new THREE.LineSegments(geometry, material);
        this.game.scene.add(particles);
        
        // 少し経過したらエフェクトを消す
        setTimeout(() => {
            this.game.scene.remove(particles);
            particles.geometry.dispose();
            particles.material.dispose();
        }, 300);
    }
    
    /**
     * マズルフラッシュエフェクトの表示
     */
    showMuzzleFlash() {
        if (this.muzzleFlash) {
            // フラッシュを表示
            this.muzzleFlash.visible = true;
            
            // 少し経過したら非表示に
            setTimeout(() => {
                this.muzzleFlash.visible = false;
            }, 50);
        }
    }
    
    /**
     * リロード処理
     */
    reload() {
        if (this.isReloading || this.ammo >= this.maxAmmo) return;
        
        this.isReloading = true;
        
        // リロード音の再生
        this.game.playSound('reload');
        
        // 武器モデルのリロードアニメーション
        this.playReloadAnimation();
        
        setTimeout(() => {
            this.ammo = this.maxAmmo;
            this.isReloading = false;
            // HUDの更新
            this.updateHUD();
        }, GameConfig.player.reloadTime);
    }
    
    /**
     * リロードアニメーション
     */
    playReloadAnimation() {
        if (this.weaponModel) {
            // 武器を下げるアニメーション
            const originalPosition = { ...this.weaponModel.position };
            
            // 武器を下げる
            this.weaponModel.position.y -= 0.1;
            this.weaponModel.rotation.x = 0.3;
            
            // リロード時間の半分で元に戻す
            setTimeout(() => {
                this.weaponModel.position.y = originalPosition.y;
                this.weaponModel.rotation.x = 0;
            }, GameConfig.player.reloadTime / 2);
        }
    }
    
    /**
     * 特殊能力のタイプを切り替える
     */
    switchSpecialAbilityType() {
        // 特殊能力がアクティブ中は切り替え不可
        if (this.specialAbilityActive) return;
        
        // タイプを切り替え
        this.specialAbilityType = this.specialAbilityType === "attack" ? "buff" : "attack";
        
        // UIの更新
        const typeElement = document.getElementById('special-ability-type');
        if (typeElement) {
            typeElement.textContent = this.specialAbilityType === "attack" ? "攻撃強化" : "防御強化";
            typeElement.className = this.specialAbilityType; // CSSクラスを更新
        }
        
        // 切り替え音を再生
        this.game.playSound('switchAbility');
        
        // エフェクトカラーの更新
        this.updateSpecialEffectColor();
    }
    
    /**
     * 特殊能力の効果を適用
     */
    applySpecialAbilityEffect() {
        if (this.specialAbilityType === "attack") {
            // 攻撃強化モードの効果
            // 既存の実装で、shoot() メソッド内でダメージが2倍になる
        } else if (this.specialAbilityType === "buff") {
            // 防御強化モードの効果
            // 既存の実装で、takeDamage() メソッド内でダメージが半減
            // 追加効果として、一時的に回復
            this.heal(this.maxHealth * 0.1); // 最大体力の10%回復
            
            // 移動速度一時的アップの効果も追加可能
            // この部分は move() メソッド内で対応する必要がある
        }
    }
    
    /**
     * 特殊能力エフェクトの色を更新
     */
    updateSpecialEffectColor() {
        const color = this.specialAbilityType === "attack" ? 0x00ffff : 0x33cc33;
        this.specialEffects.forEach(effect => {
            if (effect && effect.material) {
                effect.material.color.setHex(color);
            }
        });
    }
    
    /**
     * 特殊能力の使用
     */
    useSpecialAbility() {
        if (!this.specialAbilityReady || this.specialAbilityActive) return;
        
        this.specialAbilityReady = false;
        this.specialAbilityActive = true;
        this.game.playSound('specialAbility');
        
        // 特殊能力効果の適用
        this.applySpecialAbilityEffect();
        
        // 特殊能力のエフェクト表示
        this.showSpecialAbilityEffect();
        
        // HUDの更新
        const barFill = document.querySelector('#special-meter .bar-fill');
        if (barFill) {
            barFill.style.width = '100%';
            barFill.style.backgroundColor = this.specialAbilityType === "attack" ? '#ff00ff' : '#33cc33';
        }
        
        // 特殊能力の効果時間
        setTimeout(() => {
            this.specialAbilityActive = false;
            
            if (barFill) {
                barFill.style.backgroundColor = '#4ea6ff';
            }
            
            // 特殊能力エフェクト終了
            this.hideSpecialAbilityEffect();
            
            // クールダウン開始
            let cooldownProgress = 0;
            const cooldownInterval = 100; // 更新間隔（ミリ秒）
            
            const cooldownTimer = setInterval(() => {
                cooldownProgress += cooldownInterval;
                const percentage = (cooldownProgress / GameConfig.player.specialAbilityCooldown) * 100;
                
                if (barFill) {
                    barFill.style.width = percentage + '%';
                }
                
                if (cooldownProgress >= GameConfig.player.specialAbilityCooldown) {
                    clearInterval(cooldownTimer);
                    this.specialAbilityReady = true;
                }
            }, cooldownInterval);
            
        }, GameConfig.player.specialAbilityDuration);
    }
    
    /**
     * 特殊能力エフェクトの表示
     */
    showSpecialAbilityEffect() {
        // エフェクトを表示
        this.specialEffects.forEach(effect => {
            if (effect) {
                effect.visible = true;
                
                // エフェクトのアニメーション
                // 単純に拡大縮小を繰り返す
                const animate = () => {
                    if (!this.specialAbilityActive) return;
                    
                    const scale = 0.5 + 0.2 * Math.sin(Date.now() * 0.005);
                    effect.scale.set(scale, scale, scale);
                    
                    requestAnimationFrame(animate);
                };
                
                animate();
            }
        });
    }
    
    /**
     * 特殊能力エフェクトの非表示
     */
    hideSpecialAbilityEffect() {
        this.specialEffects.forEach(effect => {
            if (effect) {
                effect.visible = false;
            }
        });
    }
    
    /**
     * ダメージを受ける処理
     */
    takeDamage(amount) {
        // 特殊能力発動中は半分のダメージ
        const actualDamage = this.specialAbilityActive ? amount / 2 : amount;
        
        this.health -= actualDamage;
        
        // ダメージ音の再生
        this.game.playSound('playerDamage');
        
        // 画面を赤く点滅させるなどのダメージ表現（オプション）
        this.showDamageEffect();
        
        // 体力が0以下になったらゲームオーバー
        if (this.health <= 0) {
            this.health = 0;
            this.game.gameOver();
        }
        
        // HUDの更新
        this.updateHUD();
    }
    
    /**
     * ダメージエフェクトの表示
     */
    showDamageEffect() {
        // 画面を赤く点滅させる簡易エフェクト
        const damageOverlay = document.createElement('div');
        damageOverlay.style.position = 'absolute';
        damageOverlay.style.top = '0';
        damageOverlay.style.left = '0';
        damageOverlay.style.width = '100%';
        damageOverlay.style.height = '100%';
        damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        damageOverlay.style.pointerEvents = 'none';
        damageOverlay.style.zIndex = '10';
        damageOverlay.style.opacity = '0.7';
        document.getElementById('game-screen').appendChild(damageOverlay);
        
        // フェードアウト
        setTimeout(() => {
            damageOverlay.style.transition = 'opacity 0.5s ease-out';
            damageOverlay.style.opacity = '0';
            
            // エフェクト終了後に要素を削除
            setTimeout(() => {
                damageOverlay.remove();
            }, 500);
        }, 100);
    }
    
    /**
     * 回復処理
     */
    heal(amount) {
        this.health = Math.min(this.health + amount, this.maxHealth);
        this.updateHUD();
    }
    
    /**
     * スコア加算
     */
    addScore(points) {
        this.score += points;
        this.updateHUD();
    }
    
    /**
     * HUDの更新
     */
    updateHUD() {
        // 体力バーの更新
        const healthBar = document.querySelector('#health-bar .bar-fill');
        if (healthBar) {
            const healthPercentage = (this.health / this.maxHealth) * 100;
            healthBar.style.width = healthPercentage + '%';
        }
        
        // 残弾数の更新
        const ammoElement = document.getElementById('ammo');
        const maxAmmoElement = document.getElementById('max-ammo');
        if (ammoElement) ammoElement.textContent = this.ammo;
        if (maxAmmoElement) maxAmmoElement.textContent = this.maxAmmo;
        
        // スコアの更新
        const scoreElement = document.getElementById('score');
        if (scoreElement) scoreElement.textContent = this.score;
        
        // リロード中の表示
        const ammoDisplay = document.getElementById('ammo-display');
        if (ammoDisplay) {
            if (this.isReloading) {
                ammoDisplay.textContent = "リロード中...";
            } else {
                ammoDisplay.textContent = `残弾: ${this.ammo} / ${this.maxAmmo}`;
            }
        }
    }
    
    /**
     * プレイヤーの更新処理
     */
    update() {
        this.move();
        
        // プレイヤーの3Dモデル（武器など）の位置と回転を更新
        this.updateModel();
        
        // HUDの更新
        this.updateHUD();
    }
    
    /**
     * プレイヤーモデルの更新
     */
    updateModel() {
        // 武器モデルの動きを追加（歩行時の揺れなど）
        if (this.weaponModel && !this.isReloading) {
            // 移動中は武器を軽く揺らす
            if (this.keys.forward || this.keys.backward || this.keys.left || this.keys.right) {
                const bobAmount = 0.01;
                const bobSpeed = 5;
                const now = Date.now() * 0.001; // 秒単位
                
                this.weaponModel.position.y = -0.2 + Math.sin(now * bobSpeed) * bobAmount;
                this.weaponModel.position.x = 0.3 + Math.sin(now * bobSpeed * 0.5) * bobAmount * 0.5;
            }
        }
    }
}
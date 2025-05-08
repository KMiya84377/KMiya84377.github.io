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
                    // 特殊能力の発動とジャンプを分離
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
        
        // スペースキーでの特殊能力発動を別のイベントハンドラで監視
        document.addEventListener('keypress', (event) => {
            if (event.key === ' ' && this.game.isActive) {
                this.useSpecialAbility();
            }
        });
        
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
        let moveVector = { x: 0, y: 0, z: 0 };
        
        // 現在向いている方向を基準に前後左右の移動を計算
        if (this.keys.forward) {
            moveVector.z -= Math.cos(this.rotation.y) * moveSpeed;
            moveVector.x -= Math.sin(this.rotation.y) * moveSpeed;
        }
        
        if (this.keys.backward) {
            moveVector.z += Math.cos(this.rotation.y) * moveSpeed;
            moveVector.x += Math.sin(this.rotation.y) * moveSpeed;
        }
        
        if (this.keys.left) {
            moveVector.z -= Math.sin(this.rotation.y) * moveSpeed;
            moveVector.x += Math.cos(this.rotation.y) * moveSpeed;
        }
        
        if (this.keys.right) {
            moveVector.z += Math.sin(this.rotation.y) * moveSpeed;
            moveVector.x -= Math.cos(this.rotation.y) * moveSpeed;
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
        // 簡易的な衝突判定
        // 実際のゲームでは、Three.jsのRaycasterや物理エンジンを使ってより精密な判定を行う
        
        // プレイヤーのバウンディングボックス
        const playerSize = 1.0; // プレイヤーの横幅
        
        // 部屋の境界チェック
        const roomSize = 24; // 部屋の半分のサイズ（余裕を持たせる）
        
        // X座標の制限
        if (this.position.x > roomSize) this.position.x = roomSize;
        if (this.position.x < -roomSize) this.position.x = -roomSize;
        
        // Z座標の制限
        if (this.position.z > roomSize) this.position.z = roomSize;
        if (this.position.z < -roomSize) this.position.z = -roomSize;
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
        
        // レイキャスト（弾道計算）して敵との当たり判定
        const hit = this.game.raycast(this.position, this.rotation, GameConfig.player.weaponRange);
        
        if (hit && hit.enemy) {
            // 敵に当たった場合のダメージ計算
            const damage = this.specialAbilityActive ? 
                GameConfig.player.damage * 2 : GameConfig.player.damage;
            
            hit.enemy.takeDamage(damage, this);
            
            // ヒット効果音
            this.game.playSound('hit');
            
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
     * 特殊能力の使用
     */
    useSpecialAbility() {
        if (!this.specialAbilityReady || this.specialAbilityActive) return;
        
        this.specialAbilityReady = false;
        this.specialAbilityActive = true;
        this.game.playSound('specialAbility');
        
        // 特殊能力のエフェクト表示
        this.showSpecialAbilityEffect();
        
        // HUDの更新
        document.querySelector('#special-meter .bar-fill').style.width = '100%';
        document.querySelector('#special-meter .bar-fill').style.backgroundColor = '#ff00ff';
        
        // 特殊能力の効果時間
        setTimeout(() => {
            this.specialAbilityActive = false;
            document.querySelector('#special-meter .bar-fill').style.backgroundColor = '#4ea6ff';
            
            // 特殊能力エフェクト終了
            this.hideSpecialAbilityEffect();
            
            // クールダウン開始
            let cooldownProgress = 0;
            const cooldownInterval = 100; // 更新間隔（ミリ秒）
            
            const cooldownTimer = setInterval(() => {
                cooldownProgress += cooldownInterval;
                const percentage = (cooldownProgress / GameConfig.player.specialAbilityCooldown) * 100;
                
                document.querySelector('#special-meter .bar-fill').style.width = percentage + '%';
                
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
        const healthPercentage = (this.health / this.maxHealth) * 100;
        document.querySelector('#health-bar .bar-fill').style.width = healthPercentage + '%';
        
        // 残弾数の更新
        document.getElementById('ammo').textContent = this.ammo;
        document.getElementById('max-ammo').textContent = this.maxAmmo;
        
        // スコアの更新
        document.getElementById('score').textContent = this.score;
        
        // リロード中の表示
        if (this.isReloading) {
            document.getElementById('ammo-display').textContent = "リロード中...";
        } else {
            document.getElementById('ammo-display').textContent = 
                `残弾: ${this.ammo} / ${this.maxAmmo}`;
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
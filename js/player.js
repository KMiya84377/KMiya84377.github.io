/**
 * プレイヤークラス
 */
class Player {
    constructor(game) {
        this.game = game;
        
        // 初期位置
        this.position = { x: 0, y: 1.0, z: 0 }; // 原点近くに初期化してミニマップ表示を修正
        this.rotation = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        
        // プレイヤーの状態
        this.health = 100;
        this.maxHealth = 100;
        this.score = 0;
        this.level = 1;
        
        // 移動関連パラメータ - 調整済み
        this.moveSpeed = 0.15;           // 移動速度
        this.rotationSpeed = 0.003;      // 回転速度
        this.jumpForce = 0.4;            // ジャンプ力
        this.gravity = 0.015;            // 重力加速度
        this.groundFriction = 0.92;      // 地面の摩擦
        this.airFriction = 0.98;         // 空中の摩擦
        
        // 物理演算用状態
        this.onGround = true;            // 地面にいるかどうか
        this.isJumping = false;          // ジャンプ中かどうか
        this.isFalling = false;          // 落下中かどうか
        this.collisionRadius = 0.5;      // 衝突判定用の半径
        this.height = 1.8;               // プレイヤーの身長
        
        // 入力状態
        this.keys = {};                 // キー入力状態
        this.mouseMovement = { x: 0, y: 0 }; // マウス移動量
        this.mouseSensitivity = 2.0;    // マウス感度
        this.controlsEnabled = true;     // コントロール有効フラグ
        
        // 3Dモデル
        this.model = null;
        this.loadModel();
        
        // スキルと能力
        this.skills = [];
        this.activeSkill = null;
        this.skillCooldown = 0;
        
        // プレイヤーの武器
        this.weapons = [];
        this.currentWeapon = null;
        this.initWeapons();
        
        // 入力イベントリスナー
        this.setupEventListeners();
        
        // 操作可能状態の監視
        this.setupControlsStateMonitor();
        
        console.log('プレイヤーを初期化しました');
    }
    
    /**
     * プレイヤーモデルの読み込み
     */
    loadModel() {
        // シンプルなプレーヤーモデル（暫定的にボックス）
        const geometry = new THREE.BoxGeometry(0.6, this.height, 0.6);
        const material = new THREE.MeshStandardMaterial({ color: 0x0000ff, opacity: 0.0, transparent: true });
        
        this.model = new THREE.Mesh(geometry, material);
        this.model.castShadow = true;
        this.model.receiveShadow = true;
        this.model.name = "player";
        
        // 開始位置に設定
        this.model.position.set(this.position.x, this.position.y, this.position.z);
        
        // シーンに追加
        this.game.scene.add(this.model);
    }
    
    /**
     * 武器の初期化
     */
    initWeapons() {
        // 初期武器を追加
        this.weapons.push(new Weapon(this.game, 'basic'));
        
        // 現在の武器を設定
        this.currentWeapon = this.weapons[0];
    }
    
    /**
     * 入力イベントリスナーの設定
     */
    setupEventListeners() {
        // キー入力のイベントリスナー
        document.addEventListener('keydown', (event) => {
            if (!this.controlsEnabled) return;
            this.keys[event.code] = true;
            
            // ジャンプ処理（スペースキー）
            if (event.code === 'Space' && this.onGround && !this.isJumping) {
                this.startJump();
                this.game.playSound('jump');
            }
            
            // 武器発射（マウス左クリックまたはCtrl）
            if (event.code === 'ControlLeft') {
                this.shoot();
            }
            
            // 武器切り替え
            if (event.code === 'KeyQ') {
                this.switchWeapon();
            }
            
            // スキル使用（右クリックまたはE）
            if (event.code === 'KeyE' && this.activeSkill && this.skillCooldown <= 0) {
                this.useSkill();
            }
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
        
        // マウス移動のイベントリスナー
        document.addEventListener('mousemove', (event) => {
            if (!this.controlsEnabled) return;
            
            // ポインターロックが有効な時だけ処理
            if (document.pointerLockElement === this.game.canvas ||
                document.mozPointerLockElement === this.game.canvas) {
                this.mouseMovement.x = event.movementX || 0;
                this.mouseMovement.y = event.movementY || 0;
                
                // カメラの回転
                this.rotateCamera();
            }
        });
        
        // マウスクリックイベント
        document.addEventListener('mousedown', (event) => {
            if (!this.controlsEnabled) return;
            
            // 左クリックで射撃
            if (event.button === 0) {
                this.shoot();
            }
            
            // 右クリックでスキル使用
            if (event.button === 2 && this.activeSkill && this.skillCooldown <= 0) {
                this.useSkill();
            }
        });
        
        // コンテキストメニューの無効化（右クリックメニュー対策）
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
        
        // ポインターロックの変更を検出
        document.addEventListener('pointerlockchange', () => {
            // ポインターロックの状態に応じてコントロールの有効/無効を切り替え
            if (document.pointerLockElement === this.game.canvas ||
                document.mozPointerLockElement === this.game.canvas) {
                console.log('ポインターロックが有効になりました');
                this.enableControls();
            } else {
                console.log('ポインターロックが解除されました');
                // ゲーム中であれば、一時停止メニューを表示
                if (this.game.isPlaying) {
                    this.game.pause();
                }
            }
        });
        
        // ポインターロックのエラー処理
        document.addEventListener('pointerlockerror', (event) => {
            console.error('ポインターロックの取得に失敗しました:', event);
            // エラー回復処理を行う（必要に応じて）
            setTimeout(() => {
                try {
                    this.game.canvas.requestPointerLock();
                } catch (e) {
                    console.warn('ポインターロックの再試行に失敗しました:', e);
                }
            }, 1000);
        });
        
        // ゲームキャンバスクリック時に自動的にポインターロックを要求
        this.game.canvas.addEventListener('click', () => {
            if (!document.pointerLockElement && this.game.isPlaying) {
                try {
                    this.game.canvas.requestPointerLock();
                } catch (e) {
                    console.warn('ポインターロックの要求に失敗しました:', e);
                }
            }
        });
        
        // プレイヤー位置がリセットされたときのイベント処理
        document.addEventListener('playerPositionReset', () => {
            console.log('プレイヤー位置がリセットされました - 状態の同期を行います');
            
            // モデルの位置をプレイヤー位置と同期
            if (this.model) {
                this.model.position.set(this.position.x, this.position.y, this.position.z);
            }
            
            // カメラの位置も更新
            this.updateCamera();
        });
    }
    
    /**
     * 操作可能状態を監視するセットアップ
     */
    setupControlsStateMonitor() {
        // 操作不能になった時の自動復旧タイマー
        setInterval(() => {
            if (this.game.isPlaying && !this.controlsEnabled) {
                console.log('自動コントロール復旧を試みます');
                this.enableControls();
            }
            
            // カメラとプレイヤーの位置同期をチェック
            this.validateCameraPosition();
        }, 3000);
    }
    
    /**
     * コントロールの有効化
     */
    enableControls() {
        this.controlsEnabled = true;
        console.log('プレイヤーコントロールが有効になりました');
        
        // キー状態をリセット（押しっぱなし防止）
        this.keys = {};
    }
    
    /**
     * コントロールの無効化
     */
    disableControls() {
        this.controlsEnabled = false;
        console.log('プレイヤーコントロールが無効になりました');
        
        // キー状態をリセット
        this.keys = {};
    }
    
    /**
     * カメラの回転処理
     */
    rotateCamera() {
        if (!this.controlsEnabled || !this.game.camera) return;
        
        // X軸回転（上下）- 制限つき
        const pitchChange = this.mouseMovement.y * this.rotationSpeed * this.mouseSensitivity;
        this.rotation.x -= pitchChange; 
        
        // 上下の回転を制限（-85度〜85度）
        const maxPitch = Math.PI * 0.45;
        this.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, this.rotation.x));
        
        // Y軸回転（左右）
        const yawChange = this.mouseMovement.x * this.rotationSpeed * this.mouseSensitivity;
        this.rotation.y -= yawChange;
        
        // 回転を適用
        this.updateCamera();
        
        // マウス移動量をリセット
        this.mouseMovement.x = 0;
        this.mouseMovement.y = 0;
    }
    
    /**
     * カメラ位置の更新
     */
    updateCamera() {
        if (!this.game.camera) return;
        
        // カメラ位置を更新（目の高さ分上にオフセット）
        const eyeHeight = 1.0; // 目の高さ
        this.game.camera.position.set(
            this.position.x,
            this.position.y + eyeHeight,
            this.position.z
        );
        
        // カメラの回転を更新
        this.game.camera.rotation.order = 'YXZ'; // 回転順序を設定（重要）
        this.game.camera.rotation.x = this.rotation.x; // X軸回転（上下）
        this.game.camera.rotation.y = this.rotation.y; // Y軸回転（左右）
        
        // 現在のカメラ向きベクトルを計算（デバッグ用）
        //const direction = new THREE.Vector3(0, 0, -1);
        //direction.applyQuaternion(this.game.camera.quaternion);
        //console.log('カメラ方向:', direction);
    }
    
    /**
     * カメラ位置が正しいか検証
     */
    validateCameraPosition() {
        if (!this.game.camera) return;
        
        const eyeHeight = 1.0;
        const expectedCameraY = this.position.y + eyeHeight;
        const cameraDiffY = Math.abs(this.game.camera.position.y - expectedCameraY);
        
        // カメラとプレイヤーの位置の差が大きい場合は修正
        if (cameraDiffY > 0.2 ||
            Math.abs(this.game.camera.position.x - this.position.x) > 0.2 ||
            Math.abs(this.game.camera.position.z - this.position.z) > 0.2) {
            
            console.log('カメラ位置を修正します');
            this.updateCamera();
        }
    }
    
    /**
     * ジャンプの開始
     */
    startJump() {
        if (this.onGround) {
            this.velocity.y = this.jumpForce;
            this.isJumping = true;
            this.onGround = false;
            this.isFalling = false;
            
            // ジャンプ効果音（任意）
            // this.game.playSound('jump');
        }
    }
    
    /**
     * 射撃処理
     */
    shoot() {
        if (this.currentWeapon && !this.game.isPaused) {
            this.currentWeapon.fire(this.position, this.getForwardVector());
        }
    }
    
    /**
     * 武器を切り替える
     */
    switchWeapon() {
        if (this.weapons.length <= 1) return;
        
        const currentIndex = this.weapons.indexOf(this.currentWeapon);
        const nextIndex = (currentIndex + 1) % this.weapons.length;
        
        this.currentWeapon = this.weapons[nextIndex];
        console.log(`武器を切り替え: ${this.currentWeapon.name}`);
        
        // 武器切り替え効果音
        this.game.playSound('weapon_switch');
        
        // UI更新
        this.game.updateWeaponUI(this.currentWeapon);
    }
    
    /**
     * スキルを使用
     */
    useSkill() {
        if (this.activeSkill && this.skillCooldown <= 0) {
            this.activeSkill.activate();
            this.skillCooldown = this.activeSkill.cooldown;
            
            // スキル使用効果音
            this.game.playSound('skill_activate');
            
            // UI更新
            this.game.updateSkillUI(this.activeSkill, this.skillCooldown);
        }
    }
    
    /**
     * 前方ベクトルの取得（射撃方向）
     */
    getForwardVector() {
        // カメラの向いている方向を取得
        const forward = new THREE.Vector3(0, 0, -1);  // Z軸の負の方向が前方
        
        // カメラの回転を適用
        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(new THREE.Euler(this.rotation.x, this.rotation.y, 0, 'YXZ'));
        forward.applyQuaternion(quaternion);
        
        return forward.normalize();
    }
    
    /**
     * 移動処理
     */
    move() {
        if (!this.controlsEnabled) return;
        
        // プレイヤーの向きベクトル
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);
        
        // Y軸回転のみ適用（上下の視点変更を移動方向に影響させない）
        const quaternionY = new THREE.Quaternion();
        quaternionY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
        
        forward.applyQuaternion(quaternionY);
        right.applyQuaternion(quaternionY);
        
        // 移動ベクトル
        let moveX = 0;
        let moveZ = 0;
        
        // WASDキーで移動
        if (this.keys['KeyW']) {
            moveX += forward.x * this.moveSpeed;
            moveZ += forward.z * this.moveSpeed;
        }
        if (this.keys['KeyS']) {
            moveX -= forward.x * this.moveSpeed;
            moveZ -= forward.z * this.moveSpeed;
        }
        if (this.keys['KeyA']) {
            moveX -= right.x * this.moveSpeed;
            moveZ -= right.z * this.moveSpeed;
        }
        if (this.keys['KeyD']) {
            moveX += right.x * this.moveSpeed;
            moveZ += right.z * this.moveSpeed;
        }
        
        // 斜め移動の速度を正規化
        if (moveX !== 0 && moveZ !== 0) {
            const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
            moveX /= length;
            moveZ /= length;
            moveX *= this.moveSpeed;
            moveZ *= this.moveSpeed;
        }
        
        // 移動速度に加算
        this.velocity.x += moveX;
        this.velocity.z += moveZ;
        
        // 移動処理を行う
        this.updatePosition();
    }
    
    /**
     * 位置の更新と物理演算
     */
    updatePosition() {
        // 重力の適用
        if (!this.onGround) {
            this.velocity.y -= this.gravity;
            
            // 落下状態の判定
            if (this.velocity.y < 0) {
                this.isFalling = true;
                this.isJumping = false;
            }
        }
        
        // 摩擦の適用
        const friction = this.onGround ? this.groundFriction : this.airFriction;
        this.velocity.x *= friction;
        this.velocity.z *= friction;
        
        // 微小な速度をゼロにする（浮動小数点の誤差対策）
        if (Math.abs(this.velocity.x) < 0.001) this.velocity.x = 0;
        if (Math.abs(this.velocity.z) < 0.001) this.velocity.z = 0;
        
        // 位置の更新
        const newPosition = {
            x: this.position.x + this.velocity.x,
            y: this.position.y + this.velocity.y,
            z: this.position.z + this.velocity.z
        };
        
        // 衝突判定（下方向のみ簡易チェック）
        this.checkGroundCollision(newPosition);
        
        // 障害物との衝突判定
        const collision = this.checkObstacleCollision(newPosition);
        
        // 衝突がなければ移動
        if (!collision) {
            this.position = newPosition;
        } else {
            // 衝突があれば、X/Z方向の速度をゼロにする（衝突面には移動不可）
            this.velocity.x = 0;
            this.velocity.z = 0;
            
            // 壁からスライドする処理などを実装可能
        }
        
        // モデルの位置も更新
        if (this.model) {
            this.model.position.set(this.position.x, this.position.y, this.position.z);
        }
        
        // カメラの位置も更新
        this.updateCamera();
    }
    
    /**
     * 地面との衝突判定
     */
    checkGroundCollision(newPosition) {
        // 地面の高さ（Y=0）
        const groundHeight = 0;
        
        // 地面に接地または地面より下にいる場合
        if (newPosition.y <= groundHeight + this.height / 2) {
            newPosition.y = groundHeight + this.height / 2;
            this.velocity.y = 0;
            this.onGround = true;
            this.isJumping = false;
            this.isFalling = false;
        }
    }
    
    /**
     * 障害物との衝突判定
     */
    checkObstacleCollision(newPosition) {
        // プレイヤーの足元と中心高さの位置
        const playerBottom = newPosition.y - this.height / 2;
        const playerMiddle = newPosition.y;
        const playerTop = newPosition.y + this.height / 2;
        
        // 障害物リスト（環境オブジェクト内の障害物のみを対象に）
        const obstacles = this.game.gameObjects.environment.filter(obj => 
            obj.name === "obstacle" || obj.name === "furniture" || obj.name === "wall");
        
        for (const obstacle of obstacles) {
            // 障害物の位置と大きさを取得
            if (!obstacle.geometry) continue;
            let box;
            
            try {
                // バウンディングボックスがなければ計算
                if (!obstacle.geometry.boundingBox) {
                    obstacle.geometry.computeBoundingBox();
                }
                
                // ローカル座標のバウンディングボックスをコピー
                box = obstacle.geometry.boundingBox.clone();
                
                // ワールド座標に変換
                box.applyMatrix4(obstacle.matrixWorld);
            } catch (e) {
                console.warn("障害物のバウンディングボックス計算に失敗:", e);
                continue;
            }
            
            // 球体による衝突検出（簡易版）
            const obstacleCenter = new THREE.Vector3();
            box.getCenter(obstacleCenter);
            
            const boxSize = new THREE.Vector3();
            box.getSize(boxSize);
            
            // 障害物の半径（XZの最大値の半分）
            const obstacleRadius = Math.max(boxSize.x, boxSize.z) / 2;
            
            // プレイヤーと障害物の中心間の水平距離
            const dx = newPosition.x - obstacleCenter.x;
            const dz = newPosition.z - obstacleCenter.z;
            const horizontalDistanceSquared = dx * dx + dz * dz;
            
            // 衝突判定の距離（プレイヤーの半径 + 障害物の半径）
            const collisionDistanceSquared = Math.pow(this.collisionRadius + obstacleRadius, 2);
            
            // 水平方向の衝突判定
            if (horizontalDistanceSquared < collisionDistanceSquared) {
                // 高さ方向の衝突判定（プレイヤーの足元〜頭まで）
                const obstacleTop = obstacleCenter.y + boxSize.y / 2;
                const obstacleBottom = obstacleCenter.y - boxSize.y / 2;
                
                // 高さ方向の交差判定
                if (playerBottom <= obstacleTop && playerTop >= obstacleBottom) {
                    // 衝突発生！
                    return true; 
                }
            }
        }
        
        return false; // 衝突なし
    }
    
    /**
     * ダメージを受ける
     */
    takeDamage(amount) {
        if (this.health <= 0) return; // すでに死亡していれば何もしない
        
        this.health -= amount;
        
        // 体力が0以下なら死亡処理
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
        
        // UIの更新
        this.game.updateHealthUI(this.health, this.maxHealth);
        
        // ヒット効果音
        this.game.playSound('player_hit');
        
        // ヒットエフェクト（画面を一瞬赤く）
        const damageOverlay = document.getElementById('damage-overlay');
        if (damageOverlay) {
            damageOverlay.style.opacity = '0.6';
            setTimeout(() => {
                damageOverlay.style.opacity = '0';
            }, 300);
        }
    }
    
    /**
     * 死亡処理
     */
    die() {
        this.disableControls();
        
        // 死亡アニメーション（例: カメラを倒す）
        if (this.game.camera) {
            const deathAnimation = {
                rotationX: this.rotation.x,
                destRotationX: Math.PI / 2 // 90度（真上を向く）
            };
            
            const animateDeath = () => {
                if (deathAnimation.rotationX < deathAnimation.destRotationX) {
                    deathAnimation.rotationX += 0.03;
                    this.rotation.x = deathAnimation.rotationX;
                    this.updateCamera();
                    requestAnimationFrame(animateDeath);
                } else {
                    // 死亡アニメーション完了後
                    setTimeout(() => {
                        this.game.gameOver();
                    }, 1000);
                }
            };
            
            animateDeath();
        } else {
            this.game.gameOver();
        }
        
        console.log('プレイヤーが死亡しました');
        
        // 死亡効果音
        this.game.playSound('player_death');
    }
    
    /**
     * スキルを習得
     */
    learnSkill(skill) {
        this.skills.push(skill);
        
        if (!this.activeSkill) {
            this.activeSkill = skill;
        }
        
        console.log(`新しいスキルを習得: ${skill.name}`);
        
        // UI更新
        this.game.updateSkillUI(this.activeSkill, this.skillCooldown);
    }
    
    /**
     * 武器を入手
     */
    acquireWeapon(weapon) {
        this.weapons.push(weapon);
        
        console.log(`新しい武器を入手: ${weapon.name}`);
        
        // UI更新
        this.game.updateWeaponUI(this.currentWeapon);
    }
    
    /**
     * 回復処理
     */
    heal(amount) {
        this.health = Math.min(this.health + amount, this.maxHealth);
        
        // UI更新
        this.game.updateHealthUI(this.health, this.maxHealth);
        
        // 回復効果音
        this.game.playSound('heal');
    }
    
    /**
     * 更新処理
     */
    update() {
        // 移動処理
        this.move();
        
        // スキルのクールダウン処理
        if (this.skillCooldown > 0) {
            this.skillCooldown--;
            
            // UI更新（一定間隔で）
            if (this.skillCooldown % 10 === 0) {
                this.game.updateSkillUI(this.activeSkill, this.skillCooldown);
            }
        }
    }
    
    /**
     * モデルの更新（アニメーションなど）
     */
    updateModel() {
        // 将来的にアニメーション処理を追加
    }
    
    /**
     * 位置とカメラを強制的にリセット
     */
    resetPositionAndCamera(position = { x: 0, y: 1, z: 0 }) {
        console.log('プレイヤー位置とカメラを強制リセットします:', position);
        
        // 位置を設定
        this.position = {
            x: position.x,
            y: position.y,
            z: position.z
        };
        
        // 速度をゼロにリセット
        this.velocity = { x: 0, y: 0, z: 0 };
        
        // 回転は前向きにリセット
        this.rotation = { x: 0, y: 0, z: 0 };
        
        // モデル位置を更新
        if (this.model) {
            this.model.position.set(position.x, position.y, position.z);
        }
        
        // カメラ位置も更新
        this.updateCamera();
        
        console.log('プレイヤーとカメラの位置をリセットしました');
    }
}
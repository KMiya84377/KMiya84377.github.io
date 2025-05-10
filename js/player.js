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
        this.initSkills(); // スキルを初期化
        
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
     * スキルの初期化
     */
    initSkills() {
        // デフォルトスキルを追加
        const attackSkill = {
            name: '攻撃強化',
            type: 'attack',
            cooldown: 10,
            duration: 5,
            isActive: false,
            activate: () => {
                console.log('攻撃強化スキルを発動しました');
                
                // スキル効果：武器のダメージを一時的に強化
                if (this.currentWeapon) {
                    const originalDamage = this.currentWeapon.damage;
                    this.currentWeapon.damage *= 2;
                    
                    // スキル効果時間後に元に戻す
                    setTimeout(() => {
                        if (this.currentWeapon) {
                            this.currentWeapon.damage = originalDamage;
                            console.log('攻撃強化効果が切れました');
                        }
                        attackSkill.isActive = false;
                    }, attackSkill.duration * 1000);
                    
                    attackSkill.isActive = true;
                }
                
                // エフェクトの表示
                const flash = document.createElement('div');
                flash.style.position = 'absolute';
                flash.style.top = '0';
                flash.style.left = '0';
                flash.style.width = '100%';
                flash.style.height = '100%';
                flash.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
                flash.style.zIndex = '100';
                flash.style.pointerEvents = 'none';
                flash.style.transition = 'opacity 0.5s';
                
                document.body.appendChild(flash);
                
                setTimeout(() => {
                    flash.style.opacity = '0';
                    setTimeout(() => {
                        if (flash.parentNode) {
                            document.body.removeChild(flash);
                        }
                    }, 500);
                }, 500);
                
                // 効果音の再生
                this.game.playSound('skill_activate');
            }
        };
        
        const defenseSkill = {
            name: '防御強化',
            type: 'defense',
            cooldown: 15,
            duration: 7,
            isActive: false,
            activate: () => {
                console.log('防御強化スキルを発動しました');
                
                // スキル効果：ダメージを一時的に軽減
                const damageReduction = 0.5; // 50%のダメージ軽減
                const originalTakeDamage = this.takeDamage;
                
                this.takeDamage = function(amount) {
                    // ダメージを軽減
                    originalTakeDamage.call(this, amount * damageReduction);
                };
                
                // スキル効果時間後に元に戻す
                setTimeout(() => {
                    this.takeDamage = originalTakeDamage;
                    console.log('防御強化効果が切れました');
                    defenseSkill.isActive = false;
                }, defenseSkill.duration * 1000);
                
                defenseSkill.isActive = true;
                
                // エフェクトの表示
                const flash = document.createElement('div');
                flash.style.position = 'absolute';
                flash.style.top = '0';
                flash.style.left = '0';
                flash.style.width = '100%';
                flash.style.height = '100%';
                flash.style.backgroundColor = 'rgba(0, 0, 255, 0.2)';
                flash.style.zIndex = '100';
                flash.style.pointerEvents = 'none';
                flash.style.transition = 'opacity 0.5s';
                
                document.body.appendChild(flash);
                
                setTimeout(() => {
                    flash.style.opacity = '0';
                    setTimeout(() => {
                        if (flash.parentNode) {
                            document.body.removeChild(flash);
                        }
                    }, 500);
                }, 500);
                
                // 効果音の再生
                this.game.playSound('skill_activate');
            }
        };
        
        // スキルをリストに追加
        this.skills.push(attackSkill);
        this.skills.push(defenseSkill);
        
        // デフォルトでアクティブなスキルを設定
        this.activeSkill = this.skills[0];
        
        console.log('スキルを初期化しました: ', this.activeSkill.name);
    }
    
    /**
     * 入力イベントリスナーの設定
     */
    setupEventListeners() {
        console.log('プレイヤーの入力イベントリスナーを設定開始');
        
        // キー状態を強制的にリセット (重要: 既存のキー状態をクリアする)
        this.keys = {};
        
        // デバッグ用：最初から強制的にキー状態を有効にする
        window.forceKeyState = (key, state) => {
            console.log(`キー状態を強制設定: ${key} = ${state}`);
            this.keys[key] = state;
        };
        
        // デバッグ用：キー状態の出力
        window.showKeyStates = () => {
            console.log('キー状態:', this.keys);
            return this.keys;
        };
        
        // キー入力のイベントリスナー
        document.addEventListener('keydown', (event) => {
            console.log(`キー押下: ${event.code}`);
            
            // コントロールが無効でも常にキー状態は更新する (問題対応)
            this.keys[event.code] = true;
            
            if (!this.controlsEnabled) {
                console.log('コントロールが無効のため、キー入力のアクションは実行しません');
                return;
            }
            
            // ジャンプ処理（スペースキー）
            if (event.code === 'Space' && this.onGround && !this.isJumping) {
                this.startJump();
                this.game.playSound('jump');
                console.log('ジャンプを実行しました');
            }
            
            // 武器発射（マウス左クリックまたはCtrl）
            if (event.code === 'ControlLeft') {
                this.shoot();
                console.log('射撃を実行しました（キー）');
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
            console.log(`キー解放: ${event.code}`);
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
            console.log(`マウスボタン押下: ${event.button}`);
            if (!this.controlsEnabled) {
                console.log('コントロールが無効のため、マウス入力を無視します');
                return;
            }
            
            // 左クリックで射撃
            if (event.button === 0) {
                console.log('射撃を実行しました（マウス）');
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
                    this.game.togglePause(); // pauseではなくtogglePauseを使用
                }
            }
        });
        
        // ポインターロックのエラー処理
        document.addEventListener('pointerlockerror', (event) => {
            console.error('ポインターロックの取得に失敗しました:', event);
            // エラー回復処理を行う（必要に応じて）
            setTimeout(() => {
                try {
                    if (this.game.canvas) {
                        this.game.canvas.requestPointerLock();
                    }
                } catch (e) {
                    console.warn('ポインターロックの再試行に失敗しました:', e);
                }
            }, 1000);
        });
        
        // ゲームキャンバスクリック時に自動的にポインターロックを要求
        if (this.game.canvas) {
            this.game.canvas.addEventListener('click', () => {
                if (!document.pointerLockElement && this.game.isPlaying) {
                    try {
                        this.game.canvas.requestPointerLock();
                    } catch (e) {
                        console.warn('ポインターロックの要求に失敗しました:', e);
                    }
                }
            });
        } else {
            console.warn('ゲームキャンバスが見つかりません。プレイヤー初期化時点ではキャンバスがまだ設定されていない可能性があります。');
            
            // ゲームが開始されたときにイベントリスナーを追加する
            document.addEventListener('gameStarted', () => {
                if (this.game.canvas) {
                    this.game.canvas.addEventListener('click', () => {
                        if (!document.pointerLockElement && this.game.isPlaying) {
                            try {
                                this.game.canvas.requestPointerLock();
                            } catch (e) {
                                console.warn('ポインターロックの要求に失敗しました:', e);
                            }
                        }
                    });
                    console.log('ゲーム開始後にキャンバスイベントリスナーを設定しました');
                }
            });
        }
        
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
        
        console.log('プレイヤーの入力イベントリスナーを設定完了');
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
        const wasDisabled = !this.controlsEnabled;
        this.controlsEnabled = true;
        console.log('プレイヤーコントロールが有効になりました');
        
        if (wasDisabled) {
            // キー状態をリセットするが、現在押されているキーは維持する
            // 現在のキーボード状態をチェックし、実際に押されているキーを更新
            const keyCodesToCheck = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            const currentKeys = {};
            
            keyCodesToCheck.forEach(keyCode => {
                // 現在のDOM上のキー状態を維持
                if (this.keys[keyCode]) {
                    currentKeys[keyCode] = true;
                }
            });
            
            this.keys = currentKeys; // 新しいオブジェクトで更新
        }
    }
    
    /**
     * コントロールの無効化
     */
    disableControls() {
        this.controlsEnabled = false;
        console.log('プレイヤーコントロールが無効になりました');
        
        // キー状態を記憶するが、操作は処理しない
        // this.keys は直接クリアせず、残しておく
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
        console.log('========== 射撃処理開始 ==========');
        
        if (!this.currentWeapon) {
            console.error('武器がありません');
            return;
        }
        
        // ゲームが一時停止中かチェック
        if (this.game.isPaused) {
            console.log('ゲームが一時停止中のため射撃できません');
            
            // ゲームの一時停止状態が異常に長い場合はリセットを試みる
            if (this.game.resetGameState && typeof this.game.resetGameState === 'function') {
                console.log('ゲーム状態をリセットしています...');
                this.game.resetGameState();
                
                // リセット後は射撃を続行
                if (this.game.isPaused) {
                    console.log('ゲーム状態のリセットに失敗しました。射撃処理を中止します。');
                    return;
                } else {
                    console.log('ゲーム状態のリセットに成功しました。射撃処理を続行します。');
                }
            } else {
                return;
            }
        }
        
        // 前方ベクトルの取得
        const forwardDirection = this.getForwardVector();
        console.log(`射撃方向: (${forwardDirection.x.toFixed(2)}, ${forwardDirection.y.toFixed(2)}, ${forwardDirection.z.toFixed(2)})`);
        console.log(`プレイヤー位置: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)})`);
        console.log(`カメラ回転: pitch=${this.rotation.x.toFixed(2)}, yaw=${this.rotation.y.toFixed(2)}`);
        
        try {
            // 武器の発射処理を呼び出し
            console.log(`武器: ${this.currentWeapon.name}, 残弾: ${this.currentWeapon.ammo}/${this.currentWeapon.maxAmmo}`);
            this.currentWeapon.fire(this.position, forwardDirection);
            console.log('武器の発射処理を呼び出しました');
            
            // 発射エフェクト（画面に一瞬フラッシュを表示）
            const flashOverlay = document.getElementById('muzzle-flash-overlay');
            if (flashOverlay) {
                flashOverlay.style.opacity = '0.3';
                setTimeout(() => {
                    flashOverlay.style.opacity = '0';
                }, 50);
            } else {
                console.log('muzzle-flash-overlay要素が見つかりません。HTMLに追加してください');
                
                // 要素がなければ作成
                const newFlashOverlay = document.createElement('div');
                newFlashOverlay.id = 'muzzle-flash-overlay';
                newFlashOverlay.style.position = 'absolute';
                newFlashOverlay.style.top = '0';
                newFlashOverlay.style.left = '0';
                newFlashOverlay.style.width = '100%';
                newFlashOverlay.style.height = '100%';
                newFlashOverlay.style.backgroundColor = 'rgba(255, 255, 180, 0.3)';
                newFlashOverlay.style.pointerEvents = 'none';
                newFlashOverlay.style.transition = 'opacity 0.05s';
                newFlashOverlay.style.opacity = '0';
                newFlashOverlay.style.zIndex = '1000';
                document.body.appendChild(newFlashOverlay);
                console.log('マズルフラッシュオーバーレイを作成しました');
                
                // 作成した要素にエフェクトを適用
                newFlashOverlay.style.opacity = '0.3';
                setTimeout(() => {
                    newFlashOverlay.style.opacity = '0';
                }, 50);
            }
            
        } catch (error) {
            console.error('射撃処理中にエラーが発生しました:', error);
        }
        
        console.log('========== 射撃処理完了 ==========');
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
            console.log(`スキル "${this.activeSkill.name}" を使用しています...`);
            this.activeSkill.activate();
            this.skillCooldown = this.activeSkill.cooldown;
            
            // スキル使用効果音
            this.game.playSound('skill_activate');
            
            // UI更新
            this.game.updateSkillUI(this.activeSkill, this.skillCooldown);
        } else if (this.skillCooldown > 0) {
            console.log(`スキルのクールダウン中: あと ${this.skillCooldown.toFixed(1)} 秒`);
        } else {
            console.log('使用可能なスキルがありません');
        }
    }
    
    /**
     * スキル切り替え
     */
    switchSkill() {
        if (this.skills.length <= 1) return;
        
        const currentIndex = this.skills.indexOf(this.activeSkill);
        const nextIndex = (currentIndex + 1) % this.skills.length;
        
        this.activeSkill = this.skills[nextIndex];
        console.log(`スキルを切り替え: ${this.activeSkill.name}`);
        
        // スキル切り替え効果音
        this.game.playSound('switchAbility');
        
        // UI更新
        this.game.updateSkillUI(this.activeSkill, this.skillCooldown);
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
        // 落下中・ダメージスタン中・死亡時・コントロール無効時は移動しない
        if (this.isDead || !this.controlsEnabled) {
            return;
        }
        
        // ダメージスタン中は移動しない
        if (this.isStunned) {
            this.velocity.x = 0;
            this.velocity.z = 0;
            return;
        }
        
        // 移動のデバッグログ
        const movementKeys = Object.entries(this.keys)
            .filter(([key, isPressed]) => isPressed && ['forward', 'backward', 'left', 'right'].includes(key))
            .map(([key]) => key);
            
        if (movementKeys.length > 0) {
            console.log(`プレイヤー移動: ${movementKeys.join(', ')}`);
        }
        
        // いずれかの移動キーが押されているかチェック
        const isMoving = 
            this.keys.forward || 
            this.keys.backward || 
            this.keys.left || 
            this.keys.right;
            
        // デバッグ：移動キーの状態を表示
        console.log(`移動キー状態: forward=${this.keys.forward}, backward=${this.keys.backward}, left=${this.keys.left}, right=${this.keys.right}`);
        
        // プレイヤーのローカル座標系での移動方向
        let moveX = 0;
        let moveZ = 0;
        
        // 前後移動
        if (this.keys.forward) {
            moveZ -= 1;
        }
        if (this.keys.backward) {
            moveZ += 1;
        }
        
        // 左右移動
        if (this.keys.left) {
            moveX -= 1;
        }
        if (this.keys.right) {
            moveX += 1;
        }
        
        // 移動ベクトルの正規化（斜め移動時に速度が上がらないようにする）
        if (moveX !== 0 && moveZ !== 0) {
            const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
            moveX /= length;
            moveZ /= length;
        }
        
        // カメラの向きに基づいて移動方向を変換
        const angle = this.rotation.y;
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        
        // 移動方向をワールド座標に変換
        const velocityX = (moveX * cos - moveZ * sin) * this.moveSpeed;
        const velocityZ = (moveX * sin + moveZ * cos) * this.moveSpeed;
        
        // 速度を設定
        if (isMoving) {
            this.velocity.x = velocityX;
            this.velocity.z = velocityZ;
        } else {
            // 移動キーが押されていない場合は停止
            this.velocity.x = 0;
            this.velocity.z = 0;
        }
        
        // デバッグログ: 計算された速度ベクトル
        if (isMoving) {
            console.log(`計算された速度: (${this.velocity.x.toFixed(2)}, ${this.velocity.z.toFixed(2)}), 角度: ${(angle * 180 / Math.PI).toFixed(0)}度`);
        }
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
        // コントロールが無効の場合、処理を減らす
        if (!this.controlsEnabled || this.isDead) {
            return;
        }
        
        // デルタタイム（前回のフレームからの経過時間）を計算
        const now = performance.now();
        const deltaTime = now - this.lastUpdateTime;
        this.lastUpdateTime = now;
        
        // スキルのクールダウンを更新
        this.updateSkillCooldown(deltaTime);
        
        // 移動処理
        this.move();
        
        // 物理演算処理
        this.updatePhysics();
        
        // 武器の更新
        if (this.weapon) {
            this.weapon.update(deltaTime);
        }
        
        // 無敵時間の更新
        if (this.invincibilityTime > 0) {
            this.invincibilityTime -= deltaTime;
            
            // 無敵時間中は点滅させる
            if (this.model) {
                // 200ミリ秒ごとに点滅
                const isVisible = Math.floor(now / 200) % 2 === 0;
                this.model.visible = isVisible;
            }
            
            // 無敵時間終了
            if (this.invincibilityTime <= 0) {
                this.invincibilityTime = 0;
                if (this.model) {
                    this.model.visible = true; // モデルを確実に表示
                }
            }
        }
        
        // ダメージスタンの更新
        if (this.stunTime > 0) {
            this.stunTime -= deltaTime;
            if (this.stunTime <= 0) {
                this.stunTime = 0;
                this.isStunned = false;
            }
        }
        
        // UIの更新（不要なアップデートを避けるため、100ミリ秒ごとに）
        if (now - this.lastUIUpdateTime > 100) {
            // 体力バーの更新
            this.game.updateHealthUI(this.health, this.maxHealth);
            
            // 武器情報の更新
            if (this.weapon) {
                this.game.updateWeaponUI(this.weapon);
            }
            
            this.lastUIUpdateTime = now;
        }
        
        // モデルがある場合は位置を更新
        if (this.model) {
            this.model.position.set(this.position.x, this.position.y, this.position.z);
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
    
    /**
     * 特殊能力を使用
     */
    useSpecialAbility() {
        console.log("特殊能力の使用が試行されました");
        // 特殊能力が選択されていない場合
        if (!this.activeSkill) {
            console.log("特殊能力が選択されていません");
            return;
        }
        
        // クールダウン中の場合
        if (this.skillCooldown > 0) {
            console.log(`特殊能力 ${this.activeSkill.name} はクールダウン中です (${(this.skillCooldown / 1000).toFixed(1)}秒)）`);
            return;
        }
        
        console.log(`特殊能力 ${this.activeSkill.name} を使用中`);
        // 特殊能力の効果を適用
        switch (this.activeSkill.type) {
            case 'timeStop':
                this.activateTimeStop();
                break;
            case 'heal':
                this.activateHeal();
                break;
            case 'berserker':
                this.activateBerserker();
                break;
            case 'invisible':
                this.activateInvisibility();
                break;
            default:
                console.warn(`未知の特殊能力タイプ: ${this.activeSkill.type}`);
                return;
        }
        
        // クールダウンを設定
        this.skillCooldown = this.activeSkill.cooldown;
        console.log(`特殊能力 ${this.activeSkill.name} のクールダウンを ${this.activeSkill.cooldown / 1000} 秒に設定`);
        
        // UIを更新
        this.game.updateSkillUI(this.activeSkill, this.skillCooldown);
        
        // 効果音
        this.game.playSound('specialAbility');
    }
    
    /**
     * タイムストップ能力の発動
     */
    activateTimeStop() {
        console.log("タイムストップを発動");
        // タイムストップ効果音を再生
        this.game.playSound('timeStop');
        
        // 敵の動きを停止
        this.game.enemies.forEach(enemy => {
            // 敵の状態を保存
            enemy._previousVelocity = { ...enemy.velocity };
            enemy._previousMoveSpeed = enemy.moveSpeed;
            enemy._previousAttackSpeed = enemy.attackSpeed;
            
            // 敵を停止
            enemy.velocity = { x: 0, y: 0, z: 0 };
            enemy.moveSpeed = 0;
            enemy.attackSpeed = 0;
            
            // 敵のマテリアルを変更して時間停止を視覚的に表現
            if (enemy.model && enemy.model.material) {
                // マテリアルの元の色を保存
                enemy._originalColor = enemy.model.material.color.getHex();
                // 青っぽい色に変更
                enemy.model.material.color.set(0x4444ff);
            }
        });
        
        // タイムストップのエフェクト（画面の青い色調）
        const overlay = document.createElement('div');
        overlay.id = 'time-stop-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 255, 0.2)';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '100';
        overlay.style.transition = 'opacity 0.5s';
        document.getElementById('game-screen').appendChild(overlay);
        
        // タイムストップの持続時間
        const duration = this.activeSkill.duration;
        
        // 効果時間後にエフェクトを解除
        setTimeout(() => {
            console.log("タイムストップの効果が切れました");
            
            // 敵の動きを元に戻す
            this.game.enemies.forEach(enemy => {
                // 敵がまだ存在し、死んでいなければ状態を復元
                if (enemy && !enemy.isDead) {
                    // 元の速度と能力を復元
                    if (enemy._previousVelocity) {
                        enemy.velocity = { ...enemy._previousVelocity };
                    }
                    if (enemy._previousMoveSpeed !== undefined) {
                        enemy.moveSpeed = enemy._previousMoveSpeed;
                    }
                    if (enemy._previousAttackSpeed !== undefined) {
                        enemy.attackSpeed = enemy._previousAttackSpeed;
                    }
                    
                    // 敵のマテリアルを元に戻す
                    if (enemy.model && enemy.model.material && enemy._originalColor !== undefined) {
                        enemy.model.material.color.setHex(enemy._originalColor);
                    }
                }
            });
            
            // オーバーレイを非表示にして削除
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                }, 500); // フェードアウト完了後に削除
            }
            
            // 能力終了の効果音
            this.game.playSound('timeStopEnd');
        }, duration);
    }
    
    /**
     * 回復能力の発動
     */
    activateHeal() {
        console.log("回復能力を発動");
        // 回復効果音を再生
        this.game.playSound('heal');
        
        // 体力を回復
        const healAmount = 50; // 固定回復量
        this.health = Math.min(this.maxHealth, this.health + healAmount);
        
        // 回復エフェクト（緑色のオーバーレイ）
        const overlay = document.createElement('div');
        overlay.id = 'heal-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '100';
        overlay.style.transition = 'opacity 1s';
        document.getElementById('game-screen').appendChild(overlay);
        
        // エフェクト終了
        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 1000); // フェードアウト完了後に削除
        }, 500);
        
        // UI更新
        this.game.updateHealthUI(this.health, this.maxHealth);
    }
    
    /**
     * バーサーカー能力の発動
     */
    activateBerserker() {
        console.log("バーサーカー能力を発動");
        // バーサーカー効果音を再生
        this.game.playSound('berserker');
        
        // 元のステータスを保存
        this._originalDamage = this.damage;
        this._originalFireRate = this.weapon.fireRate;
        
        // 攻撃力と発射速度を強化
        this.damage *= 2; // 攻撃力2倍
        this.weapon.fireRate *= 1.5; // 発射速度1.5倍
        
        // バーサーカーエフェクト（赤いオーバーレイ）
        const overlay = document.createElement('div');
        overlay.id = 'berserker-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '100';
        overlay.style.transition = 'opacity 0.5s';
        document.getElementById('game-screen').appendChild(overlay);
        
        // バーサーカーの持続時間
        const duration = this.activeSkill.duration;
        
        // 効果時間後にエフェクトを解除
        setTimeout(() => {
            console.log("バーサーカーの効果が切れました");
            
            // 元のステータスに戻す
            if (this._originalDamage !== undefined) {
                this.damage = this._originalDamage;
            }
            if (this._originalFireRate !== undefined) {
                this.weapon.fireRate = this._originalFireRate;
            }
            
            // オーバーレイを非表示にして削除
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                }, 500); // フェードアウト完了後に削除
            }
            
            // 能力終了の効果音
            this.game.playSound('berserkerEnd');
        }, duration);
    }
    
    /**
     * 透明化能力の発動
     */
    activateInvisibility() {
        console.log("透明化能力を発動");
        // 透明化効果音を再生
        this.game.playSound('invisibility');
        
        // 透明化の効果を設定
        this.isInvisible = true;
        
        // 透明化エフェクト（プレイヤーモデルを半透明に）
        if (this.model) {
            this._originalOpacity = this.model.material.opacity;
            this.model.material.transparent = true;
            this.model.material.opacity = 0.3;
        }
        
        // 透明化のエフェクト（薄い紫のオーバーレイ）
        const overlay = document.createElement('div');
        overlay.id = 'invisibility-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(128, 0, 255, 0.1)';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '100';
        overlay.style.transition = 'opacity 0.5s';
        document.getElementById('game-screen').appendChild(overlay);
        
        // 敵のターゲットを解除
        this.game.enemies.forEach(enemy => {
            enemy.isDetectingPlayer = false;
            enemy.targetPlayer = null;
            
            // 敵の行動をパトロールに変更
            if (enemy.aiState) {
                enemy.aiState = 'patrol';
            }
        });
        
        // 透明化の持続時間
        const duration = this.activeSkill.duration;
        
        // 効果時間後にエフェクトを解除
        setTimeout(() => {
            console.log("透明化の効果が切れました");
            
            // 透明化の効果を解除
            this.isInvisible = false;
            
            // プレイヤーモデルを元に戻す
            if (this.model && this._originalOpacity !== undefined) {
                this.model.material.opacity = this._originalOpacity;
                if (this._originalOpacity >= 1) {
                    this.model.material.transparent = false;
                }
            }
            
            // オーバーレイを非表示にして削除
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                }, 500); // フェードアウト完了後に削除
            }
            
            // 能力終了の効果音
            this.game.playSound('invisibilityEnd');
        }, duration);
    }
    
    /**
     * 特殊能力の切り替え
     */
    switchSpecialAbility() {
        console.log("特殊能力の切り替えを試行");
        // 特殊能力の配列
        const abilities = [
            {
                name: "タイムストップ",
                type: "timeStop",
                cooldown: 15000, // 15秒
                duration: 5000   // 5秒
            },
            {
                name: "回復",
                type: "heal",
                cooldown: 20000, // 20秒
                duration: 0      // 即座に効果
            },
            {
                name: "バーサーカー",
                type: "berserker",
                cooldown: 25000, // 25秒
                duration: 8000   // 8秒
            },
            {
                name: "透明化",
                type: "invisible",
                cooldown: 30000, // 30秒
                duration: 10000  // 10秒
            }
        ];
        
        // 現在のスキルのインデックスを取得
        let currentIndex = -1;
        if (this.activeSkill) {
            currentIndex = abilities.findIndex(ability => ability.type === this.activeSkill.type);
        }
        
        // 次のスキルに切り替え
        currentIndex = (currentIndex + 1) % abilities.length;
        this.activeSkill = abilities[currentIndex];
        
        // スキル切り替えの効果音
        this.game.playSound('switchAbility');
        
        console.log(`特殊能力を ${this.activeSkill.name} に切り替えました`);
        
        // UIを更新
        this.skillCooldown = 0; // 切り替え時はクールダウンをリセット
        this.game.updateSkillUI(this.activeSkill, this.skillCooldown);
    }
    
    /**
     * 特殊能力のクールダウンを更新
     */
    updateSkillCooldown(deltaTime) {
        if (this.skillCooldown > 0) {
            this.skillCooldown -= deltaTime;
            if (this.skillCooldown < 0) {
                this.skillCooldown = 0;
            }
            
            // UIを更新
            if (this.activeSkill) {
                this.game.updateSkillUI(this.activeSkill, this.skillCooldown);
            }
        }
    }
    
    /**
     * キーの状態の更新
     * @param {string} keyCode - キーコード
     * @param {boolean} isPressed - キーが押されているか
     */
    updateKey(keyCode, isPressed) {
        // キー入力処理
        const key = this.keyMap[keyCode];
        if (key) {
            // キーの状態を更新
            this.keys[key] = isPressed;
            
            // デバッグログ
            console.log(`キー入力: ${key} = ${isPressed ? 'Pressed' : 'Released'}`);
            
            // WASD/矢印キーの入力状態を管理
            if (['forward', 'backward', 'left', 'right'].includes(key)) {
                this.keyPressTime = isPressed ? performance.now() : 0;
            }
            
            // ジャンプキーが押された場合
            if (key === 'jump' && isPressed && this.onGround) {
                this.jump();
            }
            
            // リロードキー
            if (key === 'reload' && isPressed) {
                this.reload();
            }
            
            // 特殊能力の使用
            if (key === 'special' && isPressed) {
                this.useSpecialAbility();
            }
            
            // 特殊能力の切り替え
            if (key === 'switchAbility' && isPressed) {
                this.switchSpecialAbility();
            }
        }
    }
}
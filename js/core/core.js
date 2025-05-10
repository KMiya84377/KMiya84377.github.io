// filepath: d:\Private\mcp-app\game\js\core\core.js
/**
 * ゲームコアクラス
 * ゲーム全体の管理と処理を行う中心的なクラス
 */
export default class GameCore {
    constructor() {
        // ゲームの状態
        this.isActive = false;
        this.isPaused = false;
        this.isGameOver = false;
        this.isVictory = false;
        this.isPlaying = false; // プレイヤーのコントロールに関わるフラグを追加
        
        // ゲーム要素
        this.player = null;
        this.enemies = [];
        this.stageManager = null;
        this.storyManager = null;
        
        // 3Dレンダリング関連
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = null;
        this.lights = [];
        this.gameObjects = {
            environment: [],
            items: [],
            effects: []
        };
        
        // 画面要素
        this.screens = {
            loading: document.getElementById('loading-screen'),
            start: document.getElementById('start-screen'),
            game: document.getElementById('game-screen'),
            stageTransition: document.getElementById('stage-transition'),
            gameOver: document.getElementById('game-over-screen'),
            victory: document.getElementById('victory-screen')
        };
        
        // その他のシステムを保持するプロパティ
        this.audioSystem = null;
        this.uiSystem = null;
        this.renderingSystem = null;
        this.environmentSystem = null;
        this.minimapSystem = null;
    }
    
    /**
     * ゲームの初期化
     */
    init() {
        console.log("ゲームを初期化中...");
        
        // 各システムを初期化
        this.initSystems();
        
        // アセットのロード
        this.loadAssets()
            .then(() => {
                // ロード完了、ゲームの準備
                this.setupGame();
            })
            .catch(error => {
                console.error("アセットのロード中にエラーが発生しました:", error);
            });
    }

    /**
     * 各システムを初期化
     */
    initSystems() {
        // 必要なシステムをインスタンス化
        this.audioSystem = new GameAudio(this);
        this.uiSystem = new GameUI(this);
        this.renderingSystem = new GameRendering(this);
        this.environmentSystem = new GameEnvironment(this);
        this.minimapSystem = new GameMinimap(this);
    }
    
    /**
     * アセットのロード
     */
    async loadAssets() {
        return new Promise((resolve, reject) => {
            // アセットのロードをシミュレート
            const totalAssets = 100;
            let loadedAssets = 0;
            const progressBar = document.querySelector('#loading-screen .progress');
            const progressText = document.getElementById('loading-progress');
            const startButton = document.getElementById('start-button');
            
            // オーディオコンテキストの初期化
            try {
                this.audioSystem.init();
            } catch (e) {
                console.warn("Audio initialization failed:", e);
            }
            
            const loadInterval = setInterval(() => {
                loadedAssets += 5;
                const percentage = Math.min(100, loadedAssets);
                
                // プログレスバーとテキストを更新
                progressBar.style.width = percentage + '%';
                progressText.textContent = percentage;
                
                if (loadedAssets >= totalAssets) {
                    clearInterval(loadInterval);
                    
                    // ロード完了、スペースキー押下で開始のメッセージを表示
                    startButton.textContent = "スペースキーを押してゲームを開始";
                    startButton.style.display = 'block';
                    
                    // スペースキーのイベントリスナーを追加
                    const handleKeydown = (event) => {
                        if (event.code === 'Space') {
                            document.removeEventListener('keydown', handleKeydown);
                            this.showStartScreen();
                            resolve();
                        }
                    };
                    
                    document.addEventListener('keydown', handleKeydown);
                    
                    // クリックでも可能にしておく（アクセシビリティ向上）
                    startButton.addEventListener('click', () => {
                        document.removeEventListener('keydown', handleKeydown);
                        this.showStartScreen();
                        resolve();
                    });
                }
            }, 100);
        });
    }
    
    /**
     * ゲームのセットアップ
     */
    setupGame() {
        // 3Dシーンの初期化
        this.renderingSystem.setupThreeJS();
        
        // イベントリスナーのセットアップ
        this.setupEventListeners();
        
        // ミニマップの初期化
        this.minimapSystem.init();
        
        // ゲームマネージャーの初期化
        this.stageManager = new StageManager(this);
        this.storyManager = new StoryManager(this);
        
        // プレイヤーの初期化（ゲーム開始時に実行）
        // this.player = new Player(this);
        
        // ゲームループ開始
        this.startGameLoop();
    }
    
    /**
     * イベントリスナーのセットアップ
     */
    setupEventListeners() {
        // スタート画面のプレイボタン
        document.getElementById('play-button').addEventListener('click', () => {
            this.startGame();
        });
        
        // ゲームオーバー画面のリスタートボタン
        document.getElementById('restart-button').addEventListener('click', () => {
            this.restartGame();
        });
        
        // ゲームオーバー画面のメニューボタン
        document.getElementById('main-menu-button').addEventListener('click', () => {
            this.showStartScreen();
        });
        
        // ポーズメニューのボタン
        document.getElementById('resume-button').addEventListener('click', () => {
            this.resumeGame();
        });
        
        document.getElementById('pause-menu-button').addEventListener('click', () => {
            // ポーズから直接メインメニューに戻る
            this.showStartScreen();
        });
        
        // 勝利画面のボタン
        document.getElementById('play-again-button').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('victory-menu-button').addEventListener('click', () => {
            this.showStartScreen();
        });
        
        // キーボードイベント
        document.addEventListener('keydown', (event) => {
            // ESCキーでゲームをポーズ/再開
            if (event.key === 'Escape' && this.isActive) {
                this.togglePause();
            }
            
            // ゲームオーバー画面でのキー操作
            if (this.isGameOver) {
                if (event.code === 'Space' || event.code === 'Enter' || event.code === 'KeyR') {
                    this.restartGame(); // リスタート
                } else if (event.code === 'KeyM') {
                    this.showStartScreen(); // メインメニューに戻る
                }
            }
            
            // 勝利画面でのキー操作
            if (this.isVictory) {
                if (event.code === 'Space' || event.code === 'Enter' || event.code === 'KeyR') {
                    this.restartGame(); // もう一度プレイ
                } else if (event.code === 'KeyM') {
                    this.showStartScreen(); // メインメニューに戻る
                }
            }
            
            // スタート画面でのキー操作
            if (!this.isActive && !this.isGameOver && !this.isVictory && this.screens.start.classList.contains('active')) {
                if (event.code === 'Space' || event.code === 'Enter') {
                    this.startGame(); // ゲーム開始
                }
            }
        });
    }
    
    /**
     * スタート画面の表示
     */
    showStartScreen() {
        // 全ての画面を非表示
        this.hideAllScreens();
        
        // スタート画面を表示
        this.screens.start.classList.add('active');
    }
    
    /**
     * ゲームの開始
     */
    startGame() {
        this.isActive = true;
        this.isPaused = false;
        this.isGameOver = false;
        this.isVictory = false;
        this.isPlaying = true; // プレイヤーの操作を有効化するためのフラグを設定
        
        console.log("ゲームを開始します");
        
        // 敵をクリア
        this.enemies.forEach(enemy => {
            if (enemy.model) {
                this.scene.remove(enemy.model);
            }
        });
        this.enemies = [];
        
        // 全ての画面を非表示
        this.hideAllScreens();
        
        // ゲーム画面を表示
        this.screens.game.classList.add('active');
        
        // ミニマップを完全にリセット
        this.minimapSystem.reset();
        
        // プレイヤーを初期化（明示的に安全な位置に配置）
        this.player = new Player(this);
        
        // 安全な初期位置に明示的に配置（地面から確実に浮いた位置）
        const safeStartPosition = { x: 0, y: 1.5, z: 0 };
        this.player.position = { ...safeStartPosition };
        this.player.velocity = { x: 0, y: 0, z: 0 };
        this.player.rotation = { x: 0, y: 0, z: 0 };
        this.player.onGround = true;
        this.player.isJumping = false;
        this.player.isFalling = false;
        
        // プレイヤーのモデルも正しい位置に設定
        if (this.player.model) {
            this.player.model.position.set(
                safeStartPosition.x,
                safeStartPosition.y,
                safeStartPosition.z
            );
        }
        
        console.log(`プレイヤーを初期位置(${safeStartPosition.x}, ${safeStartPosition.y}, ${safeStartPosition.z})に配置しました`);
        
        // カメラの初期設定
        if (this.camera) {
            this.camera.position.set(
                safeStartPosition.x, 
                safeStartPosition.y + 1.0, // 目線の高さ
                safeStartPosition.z
            );
            
            // カメラの回転順序を設定（重要）
            this.camera.rotation.order = 'YXZ';
            
            // カメラの向きを明示的に設定
            this.camera.rotation.x = 0; // 水平を向く
            this.camera.rotation.y = 0; // 前方を向く
        }
        
        // プレイヤーの操作を確実に有効化
        this.player.enableControls();
        console.log("プレイヤー操作を有効化しました");
        
        setTimeout(() => {
            if (this.player) {
                this.player.enableControls(); // 遅延してもう一度有効化（確実に適用するため）
                this.player.updateCamera(); // カメラ位置を更新
                console.log("プレイヤー操作を再度有効化確認しました");
            }
        }, 200);
        
        // ステージマネージャーを初期化して最初のステージを開始
        this.stageManager.currentStageIndex = -1;
        
        // マウスをゲームキャンバスに関連付け
        this.canvas = document.getElementById('game-canvas');
        
        // gameStartedイベントを発火して、プレイヤーコントロールが準備できたことを通知
        const gameStartedEvent = new Event('gameStarted');
        document.dispatchEvent(gameStartedEvent);
        
        // ポインターロックを有効化（ゲームコントロールのため）
        setTimeout(() => {
            // プレイヤーの位置を再確認
            console.log("ゲーム開始時のプレイヤー位置:", this.player.position);
            
            this.setupPointerLock();
            
            // ミニマップを更新して確実にプレイヤーが中央に表示されるようにする
            this.minimapSystem.update();
            
            // ステージ開始
            this.stageManager.nextStage();
            
            console.log("ゲームが正常に開始されました");
            
            // プレイヤーコントロールが有効か確認
            console.log("現在のコントロール状態:", this.player.controlsEnabled);
            console.log("現在のゲームプレイ状態:", this.isPlaying);
        }, 500); // 少し長めの遅延で安定性を確保
    }
    
    /**
     * ポインターロックの設定（マウス操作のため）
     */
    setupPointerLock() {
        if (!this.canvas) {
            this.canvas = document.getElementById('game-canvas');
        }
        
        if (this.canvas && this.player) {
            // ポインターロック機能を確保
            this.canvas.requestPointerLock = this.canvas.requestPointerLock || 
                                           this.canvas.mozRequestPointerLock || 
                                           this.canvas.webkitRequestPointerLock;
            
            // ポインターロックを要求するためのイベントリスナー
            const requestLock = () => {
                try {
                    this.canvas.requestPointerLock();
                    console.log("ポインターロックを要求しました");
                } catch (e) {
                    console.warn("ポインターロックの要求に失敗しました:", e);
                }
            };
            
            // クリックでポインターロックを要求（一度だけ実行）
            this.canvas.addEventListener('click', requestLock, { once: true });
            
            // 自動的にロック要求（ユーザーエクスペリエンス向上のため）
            setTimeout(() => {
                try {
                    this.canvas.click(); // 自動クリックでポインターロックを開始
                } catch (e) {
                    console.warn("自動ポインターロック要求に失敗:", e);
                }
            }, 100);
            
            console.log("ポインターロック機能をセットアップしました");
            
            // ロックとカメラの位置が確実に同期されるよう、再度設定を試行
            setTimeout(() => {
                if (!document.pointerLockElement && this.isActive) {
                    try {
                        this.canvas.click(); // 2回目の試行
                    } catch (e) {
                        console.warn("ポインターロックの再試行に失敗:", e);
                    }
                    
                    // プレイヤーの位置とカメラを再同期
                    if (this.player) {
                        this.player.updateCamera();
                    }
                }
            }, 500);
        }
    }
    
    /**
     * ゲームのリスタート
     */
    restartGame() {
        // ゲームの全ての状態をリセット
        this.isGameOver = false;
        this.isVictory = false;
        this.isPaused = false;
        
        // 敵をクリア
        this.enemies.forEach(enemy => {
            if (enemy.model) {
                this.scene.remove(enemy.model);
            }
        });
        this.enemies = [];
        
        // 環境オブジェクトをリセット（必要に応じて）
        // 次のステージ開始時に環境が再構築されるため、ここでは最小限のクリーンアップのみ実行
        
        // プレイヤーとステージのデータは startGame() で再初期化されるので呼び出すだけ
        this.startGame();
    }
    
    /**
     * 全ての画面を非表示
     */
    hideAllScreens() {
        for (const key in this.screens) {
            this.screens[key].classList.remove('active');
        }
    }
    
    /**
     * ゲームループの開始
     */
    startGameLoop() {
        // ゲームループを毎フレーム実行
        const gameLoop = () => {
            // ゲームが一時停止中でなければ更新
            if (this.isActive && !this.isPaused) {
                this.update();
            }
            
            // 3Dシーンをレンダリング
            this.renderingSystem.render();
            
            // 次のフレームでも実行
            requestAnimationFrame(gameLoop);
        };
        
        // ループ開始
        gameLoop();
    }
    
    /**
     * ゲームの更新
     */
    update() {
        // デバッグ情報 - 常に表示
        console.log(`ゲーム状態: active=${this.isActive}, isPaused=${this.isPaused}, isPlaying=${this.isPlaying}`);
        
        // ゲームがアクティブでないまたは一時停止中の場合は更新しない
        if (!this.isActive || this.isPaused) {
            console.log('ゲームが非アクティブまたは一時停止中のため更新をスキップします');
            return;
        }
        
        // プレイヤーの更新
        if (this.player) {
            // プレイヤーの状態をログ出力
            console.log(`プレイヤー状態: controlsEnabled=${this.player.controlsEnabled}, 位置=(${this.player.position.x.toFixed(2)}, ${this.player.position.y.toFixed(2)}, ${this.player.position.z.toFixed(2)})`);
            
            // デバッグ用：キー状態を強制的に確認（問題解決のため）
            if (window.showKeyStates) {
                window.showKeyStates(); // キー状態をコンソールに出力
            }
            
            // 強制的にコントロールを有効化（問題解決のため）
            if (!this.player.controlsEnabled) {
                console.log('プレイヤーコントロールを強制的に有効化します');
                this.player.enableControls();
            }
            
            // プレイヤーの更新処理を実行（移動処理を含む）
            this.player.update();
            
            // カメラの位置をプレイヤーの目線位置に設定
            if (this.camera) {
                const eyeHeight = 1.0; // 目の高さ
                
                // カメラ位置をプレイヤー位置に同期
                this.camera.position.set(
                    this.player.position.x,
                    this.player.position.y + eyeHeight,
                    this.player.position.z
                );
                
                // プレイヤーの視線方向をカメラの向きに反映
                const lookDirection = new THREE.Vector3(
                    Math.sin(this.player.rotation.y) * Math.cos(this.player.rotation.x),
                    Math.sin(this.player.rotation.x),
                    Math.cos(this.player.rotation.y) * Math.cos(this.player.rotation.x)
                );
                
                this.camera.lookAt(
                    this.camera.position.x + lookDirection.x,
                    this.camera.position.y + lookDirection.y,
                    this.camera.position.z + lookDirection.z
                );
                
                // カメラ位置をログに出力（デバッグ用）
                console.log(`カメラ位置: (${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)})`);
            }
        }
        
        // 敵の更新
        this.updateEnemies();
        
        // ステージの更新
        if (this.stageManager) {
            this.stageManager.update();
        }
        
        // ミニマップの更新
        this.minimapSystem.update();
    }
    
    /**
     * 敵の更新
     */
    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // 削除済みの敵はスキップ
            if (enemy.isDead) continue;
            
            // プレイヤーをターゲットに設定
            if (this.player && !enemy.targetPlayer) {
                enemy.setTarget(this.player);
            }
            
            // 敵の更新
            enemy.update();
        }
    }
    
    /**
     * 敵の追加
     */
    addEnemy(enemy) {
        // 位置が未定義の場合は安全な位置に配置
        if (!enemy.position || (enemy.position.x === 0 && enemy.position.z === 0)) {
            console.warn("敵の位置が未定義です。安全な位置に配置します。");
            enemy.position = {
                x: (Math.random() - 0.5) * 40, // -20〜20の範囲
                y: 0,
                z: (Math.random() - 0.5) * 40
            };
        }
        
        // 敵同士が重ならないように位置を調整
        const safeDistance = 3.0; // 敵同士の最小安全距離
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            let overlapping = false;
            
            // 既存の敵と位置が重なっていないかチェック
            for (const existingEnemy of this.enemies) {
                const dx = existingEnemy.position.x - enemy.position.x;
                const dz = existingEnemy.position.z - enemy.position.z;
                const distanceSquared = dx * dx + dz * dz;
                
                if (distanceSquared < safeDistance * safeDistance) {
                    overlapping = true;
                    break;
                }
            }
            
            // 重なりがなければ配置完了
            if (!overlapping) {
                break;
            }
            
            // 重なりがある場合は少し位置をずらす
            enemy.position.x += (Math.random() - 0.5) * 6;
            enemy.position.z += (Math.random() - 0.5) * 6;
            
            // 部屋の境界内に収める
            const roomSize = 23;
            enemy.position.x = Math.max(-roomSize, Math.min(roomSize, enemy.position.x));
            enemy.position.z = Math.max(-roomSize, Math.min(roomSize, enemy.position.z));
            
            attempts++;
        }
        
        // 敵をリストに追加
        this.enemies.push(enemy);
        
        // プレイヤーをターゲットに設定
        if (this.player) {
            enemy.setTarget(this.player);
        }
        
        // 初期状態では敵はプレイヤーを即時検知しない（initialDetectionDelay内）
        enemy.canDetectPlayer = false;
        setTimeout(() => {
            if (enemy && !enemy.isDead) {
                enemy.canDetectPlayer = true;
                console.log(`敵 ${enemy.id} の検知遅延が終了`);
            }
        }, enemy.initialDetectionDelay || 5000);
        
        // 3Dモデルの作成
        this.renderingSystem.createEnemyModel(enemy);
        
        // ミニマップに敵のマーカーを追加
        this.minimapSystem.addEnemyMarker(enemy);
        
        // デバッグログ
        console.log(`敵を追加: ${enemy.name} (ID: ${enemy.id}) を位置 (${enemy.position.x.toFixed(2)}, ${enemy.position.y.toFixed(2)}, ${enemy.position.z.toFixed(2)}) に配置`);
    }
    
    /**
     * 敵の削除
     */
    removeEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        if (index !== -1) {
            // 3Dモデルもシーンから削除
            if (enemy.model) {
                this.scene.remove(enemy.model);
            }
            
            // 敵リストから削除
            this.enemies.splice(index, 1);
            
            // ミニマップから敵のマーカーを削除
            this.minimapSystem.removeEnemyMarker(enemy);
        }
    }
    
    /**
     * レイキャストによる衝突判定（主に射撃用）
     */
    raycast(position, rotation, maxDistance) {
        // レイの開始位置
        const rayOrigin = new THREE.Vector3(position.x, position.y + 2, position.z); // プレイヤーの目線位置
        
        // レイの方向ベクトル
        const rayDirection = new THREE.Vector3(
            Math.sin(rotation.y) * Math.cos(rotation.x),
            Math.sin(rotation.x),
            Math.cos(rotation.y) * Math.cos(rotation.x)
        ).normalize();
        
        // レイキャスト用のRaycasterオブジェクト
        const raycaster = new THREE.Raycaster(rayOrigin, rayDirection, 0, maxDistance);
        
        // 敵のモデルを含む配列
        const targets = this.enemies
            .filter(enemy => enemy.model && !enemy.isDead)
            .map(enemy => enemy.model);
        
        // モデルがあっても表示されていない敵がいれば警告
        for (const enemy of this.enemies) {
            if (!enemy.isDead && !enemy.model) {
                console.warn(`敵 ${enemy.id} のモデルが見つかりません`);
            }
        }
        
        // レイキャストの実行
        const intersects = raycaster.intersectObjects(targets, true);
        
        // デバッグログ
        console.log(`Raycast: ${targets.length}体の敵をチェック, ${intersects.length}件のヒット`);
        
        // 衝突があれば最も近い敵を返す
        if (intersects.length > 0) {
            // 最初の交点に対応する敵オブジェクトを見つける
            for (const enemy of this.enemies) {
                if (enemy.model) {
                    // intersectObject がモデルの子孫かどうかをチェック
                    let meshFound = false;
                    const checkObject = (obj) => {
                        if (obj === intersects[0].object) {
                            return true;
                        }
                        if (obj.children) {
                            for (const child of obj.children) {
                                if (checkObject(child)) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    };
                    
                    if (checkObject(enemy.model)) {
                        return { enemy: enemy, point: intersects[0].point };
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * ゲームの一時停止/再開
     */
    togglePause() {
        if (this.isPaused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }
    
    /**
     * ゲームを一時停止
     */
    pauseGame() {
        if (!this.isPaused) {
            this.isPaused = true;
            this.isPlaying = false;
            console.log("ゲームを一時停止しました");
            
            // プレイヤーコントロールを無効化
            if (this.player) {
                this.player.disableControls();
            }
            
            // ポーズメニューを表示
            const pauseMenu = document.getElementById('pause-menu');
            if (pauseMenu) {
                pauseMenu.style.display = 'block';
            }
            
            // ポーズイベントを発行
            const gamePausedEvent = new Event('gamePaused');
            document.dispatchEvent(gamePausedEvent);
            
            // ポーズメニューのボタン設定
            this.setupPauseMenuButtons();
        }
    }
    
    /**
     * ポーズメニューのボタン設定
     */
    setupPauseMenuButtons() {
        console.log("ポーズメニューボタンを設定");
        
        // 再開ボタン
        const resumeButton = document.getElementById('resume-button');
        if (resumeButton) {
            // イベントリスナーを設定前に全てクリアする（重複防止）
            const newResumeButton = resumeButton.cloneNode(true);
            if (resumeButton.parentNode) {
                resumeButton.parentNode.replaceChild(newResumeButton, resumeButton);
            }
            
            newResumeButton.addEventListener('click', () => {
                console.log("再開ボタンがクリックされました");
                this.resumeGame();
            });
        }
        
        // メインメニューに戻るボタン
        const menuButton = document.getElementById('pause-menu-button');
        if (menuButton) {
            // イベントリスナーを設定前に全てクリアする（重複防止）
            const newMenuButton = menuButton.cloneNode(true);
            if (menuButton.parentNode) {
                menuButton.parentNode.replaceChild(newMenuButton, menuButton);
            }
            
            newMenuButton.addEventListener('click', () => {
                console.log("メインメニューに戻るボタンがクリックされました");
                this.goToMainMenu();
            });
        }
    }
    
    /**
     * ゲームを再開
     */
    resumeGame() {
        if (this.isPaused) {
            this.isPaused = false;
            this.isPlaying = true;
            console.log("ゲームを再開しました (resumeGame)");
            
            // プレイヤーコントロールを有効化
            if (this.player) {
                this.player.enableControls();
                this.player.updateCamera();
                
                // キーの状態をリセット（キーが押しっぱなしになるのを防止）
                this.player.keys = {};
                console.log("プレイヤーコントロールを再有効化しました");
            }
            
            // ポーズメニューを非表示
            const pauseMenu = document.getElementById('pause-menu');
            if (pauseMenu) {
                pauseMenu.style.display = 'none';
            }
            
            // ポインターロックを再取得（重要: 操作を再開できるようにする）
            if (this.canvas) {
                try {
                    this.canvas.requestPointerLock();
                    console.log("ポインターロック再取得を要求");
                } catch (e) {
                    console.warn("ポインターロック再取得に失敗:", e);
                }
            }
            
            // ゲームの状態イベントを発行
            const gameResumedEvent = new Event('gameResumed');
            document.dispatchEvent(gameResumedEvent);
        }
    }
    
    /**
     * メインメニューに戻る
     */
    goToMainMenu() {
        this.isPaused = false;
        this.isActive = false;
        this.isPlaying = false;
        
        // ポーズメニューを非表示
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
        
        // スタート画面を表示
        this.showStartScreen();
    }
    
    /**
     * ゲーム状態の強制リセット（ポーズ状態が固まった場合の対策）
     */
    resetGameState() {
        console.log("ゲーム状態をリセットします");
        this.isPaused = false;
        this.isPlaying = true;
        
        if (this.player) {
            this.player.enableControls();
            this.player.updateCamera();
        }
        
        // ポーズ画面がある場合は非表示に
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
        
        return true; // 状態がリセットされたことを確認
    }
    
    /**
     * ステージクリア時の処理
     */
    onStageClear(stage) {
        console.log(`ステージ ${stage.id} クリア!`);
        
        // ストーリーイベントを再生
        this.storyManager.playStageClearEvent(stage.id);
        
        // 少し待ってから次のステージへ
        setTimeout(() => {
            if (!this.isPaused) {
                this.stageManager.nextStage();
            }
        }, 1000);
    }
    
    /**
     * ゲームオーバー処理
     */
    gameOver() {
        this.isActive = false;
        this.isGameOver = true;
        this.isPlaying = false; // プレイヤーの操作を無効化
        
        // ゲームオーバー音を再生
        this.audioSystem.playMusic('gameOver');
        
        // スコア表示
        document.getElementById('final-score').textContent = this.player.score;
        
        // 画面を表示
        this.hideAllScreens();
        this.screens.gameOver.classList.add('active');
    }
    
    /**
     * ゲームクリア処理
     */
    onGameComplete() {
        this.isActive = false;
        this.isVictory = true;
        
        // 勝利音を再生
        this.audioSystem.playMusic('victory');
        
        // スコア表示
        document.getElementById('victory-score').textContent = this.player.score;
        
        // エンディングメッセージの表示
        this.storyManager.showEndingMessage();
        
        // 画面を表示
        this.hideAllScreens();
        this.screens.victory.classList.add('active');
    }
    
    /**
     * 敵の生成
     */
    spawnEnemies() {
        console.log(`ステージ ${this.currentStage} の敵を生成します`);
        
        // ステージに応じた敵のスポーン数
        const stageConfig = this.stageManager.getStageConfig(this.currentStage);
        
        // 敵のスポーンポイントを設定
        const spawnPoints = [];
        
        // スポーンエリアを定義（プレイヤーから一定距離離れた位置）
        const safeDistance = 10; // プレイヤーからの最小距離
        const spawnRadius = 20; // スポーン半径
        
        // 敵の数（ステージ設定または基本値）
        const enemyCount = stageConfig && stageConfig.enemyCount ? 
                          stageConfig.enemyCount : 
                          Math.min(15, 3 + Math.floor(this.currentStage * 1.5));
        
        // ボスの数（3ステージごとに1体）
        const bossCount = Math.floor(this.currentStage / 3);
        
        // スポーン位置を生成
        for (let i = 0; i < enemyCount + bossCount; i++) {
            let x, z;
            let distanceToPlayer;
            let attempts = 0;
            const maxAttempts = 10;
            
            // プレイヤーからある程度離れた位置に配置
            do {
                x = (Math.random() * 2 - 1) * spawnRadius;
                z = (Math.random() * 2 - 1) * spawnRadius;
                
                if (this.player) {
                    const dx = x - this.player.position.x;
                    const dz = z - this.player.position.z;
                    distanceToPlayer = Math.sqrt(dx * dx + dz * dz);
                } else {
                    distanceToPlayer = safeDistance + 1; // プレイヤーがいない場合は条件を満たす
                }
                
                attempts++;
            } while (distanceToPlayer < safeDistance && attempts < maxAttempts);
            
            // スポーン位置を追加
            spawnPoints.push({ x, y: 0, z });
        }
        
        // 敵を生成
        const enemies = EnemyFactory.createEnemiesForStage(this, this.currentStage, spawnPoints);
        
        // 生成した敵をゲームに追加
        enemies.forEach(enemy => {
            this.addEnemy(enemy);
            
            // 各敵にプレイヤーをターゲットとして設定
            if (this.player) {
                enemy.setTarget(this.player);
            }
            
            console.log(`敵を追加: ${enemy.name} (${enemy.id}) - 位置: (${enemy.position.x.toFixed(2)}, ${enemy.position.y.toFixed(2)}, ${enemy.position.z.toFixed(2)})`);
        });
        
        console.log(`合計 ${enemies.length} 体の敵を生成しました`);
    }
}
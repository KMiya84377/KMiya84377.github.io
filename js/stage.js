/**
 * ステージクラス
 * ゲームの各ステージを管理
 */
class Stage {
    constructor(game, stageData) {
        this.game = game;
        this.id = stageData.id;
        this.name = stageData.name;
        this.description = stageData.description;
        this.objective = stageData.objective;
        this.enemyConfig = stageData.enemies;
        this.environment = stageData.environment;
        this.isBossBattle = stageData.isBossBattle;
        
        this.enemies = [];
        this.isCleared = false;
        this.spawnPoints = [];
        this.isActive = false;
        // EnemyFactoryのインスタンス化を削除し、静的メソッドを使用するように変更
    }
    
    /**
     * ステージ開始処理
     */
    start() {
        this.isActive = true;
        this.setupEnvironment();
        
        // プレイヤーを安全な位置に配置
        this.placePlayerSafely();
        
        // 敵を生成
        this.spawnEnemies();
        
        // ボス戦用のBGM
        if (this.isBossBattle) {
            this.game.playMusic('boss');
        } else {
            this.game.playMusic('game');
        }
        
        // ステージ情報表示
        document.getElementById('stage').textContent = this.id;
    }
    
    /**
     * プレイヤーを安全な位置に配置
     */
    placePlayerSafely() {
        if (!this.game.player) return;
        
        // ステージ開始時のプレイヤー初期位置
        // 実装例: ステージの中央付近の床の上に配置
        const safePosition = this.findSafePlayerPosition();
        
        // プレイヤーの位置を設定
        this.game.player.position.x = safePosition.x;
        this.game.player.position.y = safePosition.y;
        this.game.player.position.z = safePosition.z;
        
        // プレイヤーの向きをリセット
        this.game.player.rotation.y = 0;
        
        console.log(`プレイヤーを安全な位置に配置: (${safePosition.x}, ${safePosition.y}, ${safePosition.z})`);
    }
    
    /**
     * 安全なプレイヤーの初期位置を探す
     */
    findSafePlayerPosition() {
        // 候補となる位置
        const candidatePositions = [
            { x: 0, y: 0, z: 0 },      // 原点
            { x: 5, y: 0, z: 5 },      // 右前方
            { x: -5, y: 0, z: 5 },     // 左前方
            { x: 5, y: 0, z: -5 },     // 右後方
            { x: -5, y: 0, z: -5 },    // 左後方
            { x: 10, y: 0, z: 0 },     // 右
            { x: -10, y: 0, z: 0 },    // 左
            { x: 0, y: 0, z: 10 },     // 前
            { x: 0, y: 0, z: -10 }     // 後
        ];
        
        // 環境オブジェクトのリスト
        const obstacles = this.game.gameObjects.environment.filter(obj => 
            obj.name === "obstacle" || obj.name === "furniture" || obj.name === "wall");
        
        // 各候補位置について障害物との衝突をチェックし、衝突しない位置を見つける
        for (const position of candidatePositions) {
            let isColliding = false;
            
            for (const obstacle of obstacles) {
                if (!obstacle.geometry) continue;
                
                // 障害物のバウンディングボックスを取得
                let box;
                if (!obstacle.geometry.boundingBox) {
                    obstacle.geometry.computeBoundingBox();
                }
                box = obstacle.geometry.boundingBox.clone();
                
                // ワールド座標系に変換
                box.applyMatrix4(obstacle.matrixWorld);
                
                // プレイヤーの位置と障害物との距離を計算
                const obstaclePos = new THREE.Vector3();
                obstacle.getWorldPosition(obstaclePos);
                
                // プレイヤーの半径（衝突判定用）
                const playerRadius = 1.0;
                
                // 障害物のサイズを考慮した安全距離
                const boxSize = new THREE.Vector3();
                box.getSize(boxSize);
                const obstacleRadius = Math.max(boxSize.x, boxSize.z) / 2;
                
                // 距離の2乗（平方根計算を避けるため）
                const dx = obstaclePos.x - position.x;
                const dz = obstaclePos.z - position.z;
                const distanceSquared = dx * dx + dz * dz;
                
                // 安全距離の2乗
                const minDistanceSquared = Math.pow(playerRadius + obstacleRadius + 1.0, 2);
                
                // 衝突判定
                if (distanceSquared < minDistanceSquared) {
                    isColliding = true;
                    break;
                }
            }
            
            // 衝突していない位置を見つけた場合
            if (!isColliding) {
                return position;
            }
        }
        
        // どの位置も安全でない場合は、原点から十分に上に配置
        return { x: 0, y: 5, z: 0 };
    }
    
    /**
     * 環境の設定（背景や地形など）
     */
    setupEnvironment() {
        // environment プロパティに基づいて適切な環境をセットアップ
        console.log(`Setting up environment: ${this.environment}`);
        
        // 遮蔽物を含む環境を正しくセットアップ
        if (this.environment) {
            this.game.setupEnvironment(this.environment);
        } else {
            // 環境が指定されていない場合はデフォルト環境を使用
            this.game.setupEnvironment("office");
        }
    }
    
    /**
     * 敵を生成して配置
     */
    spawnEnemies() {
        // スポーン位置を設定（実際のゲームではマップ情報から取得）
        this.setupSpawnPoints();
        
        // 敵の生成
        if (this.enemyConfig.boss > 0) {
            this.spawnEnemyGroup('boss', this.enemyConfig.boss);
        }
        
        if (this.enemyConfig.customer > 0) {
            this.spawnEnemyGroup('customer', this.enemyConfig.customer);
        }
        
        if (this.enemyConfig.sales > 0) {
            this.spawnEnemyGroup('sales', this.enemyConfig.sales);
        }
        
        // ボス敵が設定されていれば生成
        if (this.enemyConfig.finalBoss && this.enemyConfig.finalBoss.count > 0) {
            const bossType = this.enemyConfig.finalBoss.type;
            const bossCount = this.enemyConfig.finalBoss.count;
            
            for (let i = 0; i < bossCount; i++) {
                const position = this.getRandomSpawnPoint();
                const boss = EnemyFactory.createEnemy(this.game, bossType, position);
                
                if (boss) {
                    this.enemies.push(boss);
                    this.game.addEnemy(boss);
                }
            }
        }
        
        // デバッグログ
        console.log(`ステージ ${this.id} に敵を生成: ${this.enemies.length}体`);
        
        // もし敵が一体も生成されなかった場合は、デフォルトで敵を生成
        if (this.enemies.length === 0) {
            console.warn(`ステージ ${this.id} に敵が生成されませんでした。デフォルト敵を生成します。`);
            const position = { x: 0, y: 0, z: -15 };
            const enemy = EnemyFactory.createEnemy(this.game, 'default', position);
            this.enemies.push(enemy);
            this.game.addEnemy(enemy);
        }
    }
    
    /**
     * 敵グループを生成
     */
    spawnEnemyGroup(type, count) {
        for (let i = 0; i < count; i++) {
            const position = this.getRandomSpawnPoint();
            // 静的メソッドの正しい呼び出し方法に変更
            const enemy = EnemyFactory.createEnemy(this.game, type, position);
            
            if (enemy) {
                this.enemies.push(enemy);
                this.game.addEnemy(enemy);
            }
        }
    }
    
    /**
     * スポーン位置の設定
     */
    setupSpawnPoints() {
        // 実際のゲームでは地形情報からスポーン位置を決定
        // ここではランダムな位置を設定
        const areaSize = 50; // 地形の大きさ
        const minDistance = 10; // プレイヤーから最低限離れるべき距離
        
        // 4つのスポーン領域を設定
        this.spawnPoints = [
            { x: -areaSize/2, z: -areaSize/2 }, // 左奥
            { x: areaSize/2, z: -areaSize/2 },  // 右奥
            { x: -areaSize/2, z: areaSize/2 },  // 左手前
            { x: areaSize/2, z: areaSize/2 }    // 右手前
        ];
    }
    
    /**
     * ランダムなスポーン位置を取得
     */
    getRandomSpawnPoint() {
        const basePoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
        // ベース位置から少しランダムにずらす
        const offset = 10;
        return {
            x: basePoint.x + (Math.random() * 2 - 1) * offset,
            y: 0, // 地面の高さ
            z: basePoint.z + (Math.random() * 2 - 1) * offset
        };
    }
    
    /**
     * ステージ更新処理
     */
    update() {
        if (!this.isActive) return;
        
        // 生きている敵の数をチェック
        const aliveEnemies = this.enemies.filter(enemy => !enemy.isDead);
        
        // 敵がすべて倒されたらステージクリア
        if (aliveEnemies.length === 0 && !this.isCleared) {
            this.clear();
        }
    }
    
    /**
     * ステージクリア処理
     */
    clear() {
        this.isCleared = true;
        this.isActive = false;
        
        console.log(`Stage ${this.id} cleared!`);
        
        // クリア通知
        this.game.onStageClear(this);
        
        // ボス戦だった場合は特別な演出
        if (this.isBossBattle) {
            this.game.playSound('victory');
        }
    }
    
    /**
     * ステージ終了処理
     */
    end() {
        this.isActive = false;
        
        // 残っている敵を削除
        for (const enemy of this.enemies) {
            this.game.removeEnemy(enemy);
        }
        this.enemies = [];
    }
}

/**
 * ステージマネージャークラス
 * 複数ステージの管理と遷移を担当
 */
class StageManager {
    constructor(game) {
        this.game = game;
        this.stages = [];
        this.currentStageIndex = -1;
        this.currentStage = null;
        this.isLastStageClear = false;
        
        this.initStages();
    }
    
    /**
     * ステージデータの初期化
     */
    initStages() {
        for (const stageData of GameConfig.stages) {
            this.stages.push(new Stage(this.game, stageData));
        }
    }
    
    /**
     * 次のステージに進む
     */
    nextStage() {
        // 現在のステージがあれば終了処理
        if (this.currentStage) {
            this.currentStage.end();
        }
        
        // 次のステージに進む
        this.currentStageIndex++;
        
        // すべてのステージをクリアした場合
        if (this.currentStageIndex >= this.stages.length) {
            this.isLastStageClear = true;
            this.game.onGameComplete();
            return;
        }
        
        // 次のステージを開始
        this.currentStage = this.stages[this.currentStageIndex];
        
        // ステージ遷移画面を表示
        this.showStageTransition();
    }
    
    /**
     * ステージ遷移画面の表示
     */
    showStageTransition() {
        const stage = this.currentStage;
        
        // トランジション画面の要素を更新
        document.getElementById('next-stage').textContent = stage.id;
        document.getElementById('stage-description').textContent = stage.description;
        document.getElementById('stage-objective').textContent = `目標: ${stage.objective}`;
        
        // トランジション画面を表示
        const transitionScreen = document.getElementById('stage-transition');
        transitionScreen.classList.add('active');
        
        // スペースキーでゲーム画面へ
        const handleKeydown = (event) => {
            if (event.code === 'Space') {
                transitionScreen.classList.remove('active');
                document.getElementById('game-screen').classList.add('active');
                this.startCurrentStage();
                
                // イベントリスナーを削除
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        
        document.addEventListener('keydown', handleKeydown);
    }
    
    /**
     * 現在のステージを開始
     */
    startCurrentStage() {
        if (this.currentStage) {
            this.currentStage.start();
        }
    }
    
    /**
     * 現在のステージを取得
     */
    getCurrentStage() {
        return this.currentStage;
    }
    
    /**
     * 現在のステージ番号を取得
     */
    getCurrentStageNumber() {
        return this.currentStageIndex + 1;
    }
    
    /**
     * 更新処理
     */
    update() {
        if (this.currentStage) {
            this.currentStage.update();
        }
    }
}
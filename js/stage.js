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
     * 環境の設定（背景や地形など）
     */
    setupEnvironment() {
        // 環境に応じた背景やオブジェクトを設定
        // 実装はゲームエンジンに依存
        console.log(`Setting up environment: ${this.environment}`);
    }
    
    /**
     * 敵を生成して配置
     */
    spawnEnemies() {
        // スポーン位置を設定（実際のゲームではマップ情報から取得）
        this.setupSpawnPoints();
        
        // 敵の生成
        this.spawnEnemyGroup('boss', this.enemyConfig.boss);
        this.spawnEnemyGroup('customer', this.enemyConfig.customer);
        this.spawnEnemyGroup('sales', this.enemyConfig.sales);
        
        // ボス敵が設定されていれば生成
        if (this.enemyConfig.finalBoss) {
            const bossType = this.enemyConfig.finalBoss.type;
            const bossCount = this.enemyConfig.finalBoss.count;
            
            for (let i = 0; i < bossCount; i++) {
                const position = this.getRandomSpawnPoint();
                // 静的メソッドの正しい呼び出し方法に変更
                const boss = EnemyFactory.createEnemy(this.game, bossType, position);
                
                if (boss) {
                    this.enemies.push(boss);
                    this.game.addEnemy(boss);
                }
            }
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
        
        // クリックでゲーム画面へ
        const handleClick = () => {
            transitionScreen.classList.remove('active');
            document.getElementById('game-screen').classList.add('active');
            this.startCurrentStage();
            
            // イベントリスナーを削除
            transitionScreen.removeEventListener('click', handleClick);
        };
        
        transitionScreen.addEventListener('click', handleClick);
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
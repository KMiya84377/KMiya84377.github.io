/**
 * ゲームクラス
 * ゲーム全体の管理と処理を行う中心的なクラス
 */
class Game {
    constructor() {
        // ゲームの状態
        this.isActive = false;
        this.isPaused = false;
        this.isGameOver = false;
        this.isVictory = false;
        
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
        
        // サウンド関連
        this.audioContext = null;
        this.soundBuffers = {};
        this.musicTracks = {};
        this.currentMusic = null;
        
        // ゲームのセットアップ
        this.init();
    }
    
    /**
     * ゲームの初期化
     */
    init() {
        console.log("ゲームを初期化中...");
        
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
                this.initAudio();
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
                    
                    // ロード完了、スタートボタンを表示
                    startButton.style.display = 'block';
                    startButton.addEventListener('click', () => {
                        this.showStartScreen();
                        resolve();
                    });
                }
            }, 100);
        });
    }
    
    /**
     * オーディオの初期化
     */
    initAudio() {
        // Web Audio APIの初期化
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        
        // サウンド設定
        const soundConfig = GameConfig.sounds;
        
        // サウンドファイルをロード
        this.loadSounds(soundConfig);
    }
    
    /**
     * サウンドファイルのロード
     */
    loadSounds(soundConfig) {
        const loadAudioBuffer = (url, name) => {
            fetch(url)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    this.soundBuffers[name] = audioBuffer;
                    console.log(`Sound loaded: ${name}`);
                })
                .catch(error => {
                    console.error(`Error loading sound ${name}:`, error);
                });
        };
        
        // 効果音のロード
        for (const [name, path] of Object.entries(soundConfig.effects)) {
            loadAudioBuffer(`assets/sounds/effects/${path}`, name);
        }
        
        // BGMのロード
        for (const [name, path] of Object.entries(soundConfig.music)) {
            loadAudioBuffer(`assets/sounds/bgm/${path}`, name);
        }
    }
    
    /**
     * ゲームのセットアップ
     */
    setupGame() {
        // 3Dシーンの初期化
        this.setupThreeJS();
        
        // イベントリスナーのセットアップ
        this.setupEventListeners();
        
        // ゲームマネージャーの初期化
        this.stageManager = new StageManager(this);
        this.storyManager = new StoryManager(this);
        
        // プレイヤーの初期化（ゲーム開始時に実行）
        // this.player = new Player(this);
        
        // ゲームループ開始
        this.startGameLoop();
    }
    
    /**
     * Three.jsの初期化
     */
    setupThreeJS() {
        // シーンの作成
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // 空色の背景
        this.scene.fog = new THREE.Fog(0x87ceeb, 20, 100); // 霧の効果
        
        // カメラの作成 (視野角, アスペクト比, 近面, 遠面)
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(0, 2, 5); // 初期位置
        
        // レンダラーの作成
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true; // 影を有効化
        document.getElementById('game-canvas').appendChild(this.renderer.domElement);
        
        // レイキャスター（マウスや弾道の判定に使用）
        this.raycaster = new THREE.Raycaster();
        
        // 光源の追加
        // 環境光（全体を均等に照らす）
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);
        
        // 平行光源（太陽光などの強い光源）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true; // 影を落とす
        this.scene.add(directionalLight);
        this.lights.push(directionalLight);
        
        // 地面の作成
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x999999,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // 水平に寝かせる
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.gameObjects.environment.push(ground);
        
        // ウィンドウリサイズ対応
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    /**
     * オフィス環境のセットアップ
     * @param {string} envType - 環境タイプ（"office", "meeting_room"など）
     */
    setupEnvironment(envType) {
        // 既存の環境オブジェクトをクリア
        for (const obj of this.gameObjects.environment) {
            if (obj.name !== "ground") {
                this.scene.remove(obj);
            }
        }
        this.gameObjects.environment = this.gameObjects.environment.filter(obj => obj.name === "ground");
        
        // 環境タイプに基づいて新しいオブジェクトを追加
        switch (envType) {
            case "office":
                this.createOfficeEnvironment();
                break;
            case "meeting_room":
                this.createMeetingRoomEnvironment();
                break;
            case "cafeteria":
                this.createCafeteriaEnvironment();
                break;
            case "conference_room":
                this.createConferenceRoomEnvironment();
                break;
            case "executive_office":
                this.createExecutiveOfficeEnvironment();
                break;
            case "server_room":
                this.createServerRoomEnvironment();
                break;
            case "night_office":
                this.createNightOfficeEnvironment();
                break;
            case "burning_office":
                this.createBurningOfficeEnvironment();
                break;
            case "hr_office":
                this.createHROfficeEnvironment();
                break;
            case "ceo_office":
                this.createCEOOfficeEnvironment();
                break;
            default:
                this.createDefaultEnvironment();
        }
    }
    
    /**
     * デフォルトのオフィス環境を作成
     */
    createDefaultEnvironment() {
        // 壁を作成
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
        
        // 部屋の四方の壁
        const wallGeometry = new THREE.BoxGeometry(50, 10, 1);
        
        // 奥の壁
        const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
        backWall.position.set(0, 5, -25);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        backWall.name = "wall";
        this.scene.add(backWall);
        this.gameObjects.environment.push(backWall);
        
        // 手前の壁
        const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
        frontWall.position.set(0, 5, 25);
        frontWall.castShadow = true;
        frontWall.receiveShadow = true;
        frontWall.name = "wall";
        this.scene.add(frontWall);
        this.gameObjects.environment.push(frontWall);
        
        // 左の壁
        const leftWallGeometry = new THREE.BoxGeometry(1, 10, 50);
        const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
        leftWall.position.set(-25, 5, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        leftWall.name = "wall";
        this.scene.add(leftWall);
        this.gameObjects.environment.push(leftWall);
        
        // 右の壁
        const rightWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
        rightWall.position.set(25, 5, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        rightWall.name = "wall";
        this.scene.add(rightWall);
        this.gameObjects.environment.push(rightWall);
        
        // 天井（光源の遮蔽のために使用）
        const ceilingGeometry = new THREE.PlaneGeometry(50, 50);
        const ceilingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            side: THREE.DoubleSide
        });
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(0, 10, 0);
        ceiling.receiveShadow = true;
        ceiling.name = "ceiling";
        this.scene.add(ceiling);
        this.gameObjects.environment.push(ceiling);
        
        // 基本的な遮蔽物を追加
        this.addObstacles();
    }
    
    /**
     * 基本的な遮蔽物を追加
     */
    addObstacles() {
        // デスク用の素材
        const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const metalMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            metalness: 0.7,
            roughness: 0.2
        });
        const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const screenMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111133,
            emissive: 0x222244,
            emissiveIntensity: 0.5
        });
        
        // 中央に会議テーブルを配置
        const tableGeometry = new THREE.BoxGeometry(8, 0.5, 3);
        const table = new THREE.Mesh(tableGeometry, deskMaterial);
        table.position.set(0, 0.75, 0);
        table.castShadow = true;
        table.receiveShadow = true;
        table.name = "obstacle";
        this.scene.add(table);
        this.gameObjects.environment.push(table);
        
        // 椅子を会議テーブルの周りに配置
        for (let i = 0; i < 6; i++) {
            const chairGeometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
            const chair = new THREE.Mesh(chairGeometry, chairMaterial);
            
            const angle = (i / 6) * Math.PI * 2;
            const radius = 2;
            
            const x = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius;
            
            chair.position.set(x, 0.6, z);
            chair.castShadow = true;
            chair.receiveShadow = true;
            chair.name = "obstacle";
            this.scene.add(chair);
            this.gameObjects.environment.push(chair);
        }
        
        // デスクを部屋の四隅に配置
        const deskPositions = [
            { x: -15, z: -15, rotY: Math.PI / 4 },
            { x: 15, z: -15, rotY: -Math.PI / 4 },
            { x: -15, z: 15, rotY: -Math.PI / 4 },
            { x: 15, z: 15, rotY: Math.PI / 4 }
        ];
        
        deskPositions.forEach((pos) => {
            // デスク
            const deskGeometry = new THREE.BoxGeometry(3, 0.8, 1.5);
            const desk = new THREE.Mesh(deskGeometry, deskMaterial);
            desk.position.set(pos.x, 0.4, pos.z);
            desk.rotation.y = pos.rotY;
            desk.castShadow = true;
            desk.receiveShadow = true;
            desk.name = "obstacle";
            this.scene.add(desk);
            this.gameObjects.environment.push(desk);
            
            // 椅子
            const chairGeometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
            const chair = new THREE.Mesh(chairGeometry, chairMaterial);
            const chairOffsetX = Math.sin(pos.rotY) * 1.2;
            const chairOffsetZ = Math.cos(pos.rotY) * 1.2;
            chair.position.set(pos.x + chairOffsetX, 0.6, pos.z + chairOffsetZ);
            chair.castShadow = true;
            chair.receiveShadow = true;
            chair.name = "obstacle";
            this.scene.add(chair);
            this.gameObjects.environment.push(chair);
            
            // モニター
            const monitorStandGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.1);
            const monitorStand = new THREE.Mesh(monitorStandGeometry, metalMaterial);
            monitorStand.position.set(
                pos.x - Math.sin(pos.rotY) * 0.5,
                0.8 + 0.25,
                pos.z - Math.cos(pos.rotY) * 0.5
            );
            monitorStand.castShadow = true;
            monitorStand.receiveShadow = true;
            this.scene.add(monitorStand);
            this.gameObjects.environment.push(monitorStand);
            
            const monitorGeometry = new THREE.BoxGeometry(1, 0.6, 0.1);
            const monitor = new THREE.Mesh(monitorGeometry, screenMaterial);
            monitor.position.set(
                pos.x - Math.sin(pos.rotY) * 0.5,
                0.8 + 0.25 + 0.3,
                pos.z - Math.cos(pos.rotY) * 0.5
            );
            monitor.rotation.y = pos.rotY;
            monitor.castShadow = true;
            monitor.receiveShadow = true;
            monitor.name = "obstacle";
            this.scene.add(monitor);
            this.gameObjects.environment.push(monitor);
        });
        
        // パーティションを中央から放射状に配置
        for (let i = 0; i < 4; i++) {
            const partitionGeometry = new THREE.BoxGeometry(10, 2, 0.2);
            const partition = new THREE.Mesh(partitionGeometry, new THREE.MeshStandardMaterial({ color: 0xaaaaaa }));
            
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const radius = 10;
            
            const x = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius;
            
            partition.position.set(x, 1, z);
            partition.rotation.y = angle + Math.PI / 2;
            partition.castShadow = true;
            partition.receiveShadow = true;
            partition.name = "obstacle";
            this.scene.add(partition);
            this.gameObjects.environment.push(partition);
        }
        
        // 植木鉢をランダムに配置
        for (let i = 0; i < 6; i++) {
            const potGeometry = new THREE.CylinderGeometry(0.5, 0.4, 1, 12);
            const pot = new THREE.Mesh(potGeometry, new THREE.MeshStandardMaterial({ color: 0x773300 }));
            
            // ランダムな位置（壁の近くを避ける）
            const x = (Math.random() - 0.5) * 40;
            const z = (Math.random() - 0.5) * 40;
            
            pot.position.set(x, 0.5, z);
            pot.castShadow = true;
            pot.receiveShadow = true;
            pot.name = "obstacle";
            this.scene.add(pot);
            this.gameObjects.environment.push(pot);
            
            // 植物
            const plantGeometry = new THREE.SphereGeometry(0.7, 8, 8);
            const plant = new THREE.Mesh(plantGeometry, new THREE.MeshStandardMaterial({ color: 0x00aa00 }));
            plant.position.set(x, 1.5, z);
            plant.castShadow = true;
            plant.receiveShadow = true;
            plant.name = "obstacle";
            this.scene.add(plant);
            this.gameObjects.environment.push(plant);
        }
        
        // 高さの異なる障害物を追加（距離感の把握のため）
        const obstacleGeometries = [
            new THREE.BoxGeometry(1, 3, 1),
            new THREE.BoxGeometry(1, 2, 1),
            new THREE.BoxGeometry(1.5, 1, 1.5),
            new THREE.CylinderGeometry(0.5, 0.5, 4, 8),
            new THREE.CylinderGeometry(0.7, 0.7, 2, 8)
        ];
        
        const obstacleColors = [0x8B4513, 0x555555, 0x333333, 0x222222, 0x444444];
        
        for (let i = 0; i < 10; i++) {
            const index = Math.floor(Math.random() * obstacleGeometries.length);
            const geometry = obstacleGeometries[index];
            const material = new THREE.MeshStandardMaterial({ color: obstacleColors[index] });
            const obstacle = new THREE.Mesh(geometry, material);
            
            // ランダムな位置（ただし中央付近は避ける）
            let x, z;
            do {
                x = (Math.random() - 0.5) * 40;
                z = (Math.random() - 0.5) * 40;
            } while (Math.sqrt(x * x + z * z) < 5); // 中央5mの範囲は避ける
            
            obstacle.position.set(x, geometry.parameters.height / 2, z);
            obstacle.castShadow = true;
            obstacle.receiveShadow = true;
            obstacle.name = "obstacle";
            this.scene.add(obstacle);
            this.gameObjects.environment.push(obstacle);
        }
    }
    
    // 各環境タイプごとの作成メソッド（詳細な実装は省略）
    createOfficeEnvironment() {
        this.createDefaultEnvironment();
        // デスクや椅子、パソコンなどのオブジェクトを追加
    }
    
    createMeetingRoomEnvironment() {
        this.createDefaultEnvironment();
        // 会議テーブルや椅子などのオブジェクトを追加
    }
    
    createCafeteriaEnvironment() {
        this.createDefaultEnvironment();
        // テーブルや椅子、カウンターなどのオブジェクトを追加
    }
    
    createConferenceRoomEnvironment() {
        this.createDefaultEnvironment();
        // 大型会議テーブル、プロジェクタースクリーンなどを追加
    }
    
    createExecutiveOfficeEnvironment() {
        this.createDefaultEnvironment();
        // 豪華な机、応接セットなどを追加
    }
    
    createServerRoomEnvironment() {
        this.createDefaultEnvironment();
        // サーバーラックなどを追加
    }
    
    createNightOfficeEnvironment() {
        this.createDefaultEnvironment();
        // 夜のライティング設定
        this.scene.background = new THREE.Color(0x001133); // 暗めの背景色
        
        // 蛍光灯の光源を追加
        const officeLight1 = new THREE.PointLight(0xccffff, 1, 20);
        officeLight1.position.set(0, 9, 0);
        this.scene.add(officeLight1);
        this.lights.push(officeLight1);
    }
    
    createBurningOfficeEnvironment() {
        this.createDefaultEnvironment();
        // 炎のエフェクトや煙などを追加
        // 赤みがかったライティングに設定
        this.scene.background = new THREE.Color(0x331100); // 燃えているような背景色
        
        // 赤い光源を追加
        const fireLight = new THREE.PointLight(0xff5500, 1.5, 30);
        fireLight.position.set(0, 5, 0);
        this.scene.add(fireLight);
        this.lights.push(fireLight);
    }
    
    createHROfficeEnvironment() {
        this.createDefaultEnvironment();
        // 人事部特有のオブジェクトを追加
    }
    
    createCEOOfficeEnvironment() {
        this.createDefaultEnvironment();
        // 最高級の家具や広い部屋のセットアップ
        
        // 社長席用の大きな机
        const deskGeometry = new THREE.BoxGeometry(8, 1, 4);
        const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x663300 });
        const desk = new THREE.Mesh(deskGeometry, deskMaterial);
        desk.position.set(0, 0.5, -10);
        desk.castShadow = true;
        desk.receiveShadow = true;
        desk.name = "desk";
        this.scene.add(desk);
        this.gameObjects.environment.push(desk);
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
        
        // 敵をクリア
        this.enemies = [];
        
        // プレイヤーを初期化
        this.player = new Player(this);
        
        // 全ての画面を非表示
        this.hideAllScreens();
        
        // ステージマネージャーを初期化して最初のステージを開始
        this.stageManager.currentStageIndex = -1;
        this.stageManager.nextStage();
        
        // ゲーム開始時にポインターロックを有効化
        document.getElementById('game-canvas').requestPointerLock();
    }
    
    /**
     * ゲームのリスタート
     */
    restartGame() {
        // ゲームの状態をリセット
        this.isGameOver = false;
        this.isVictory = false;
        
        // ゲームを開始
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
            this.render();
            
            // 次のフレームでも実行
            requestAnimationFrame(gameLoop);
        };
        
        // ループ開始
        gameLoop();
    }
    
    /**
     * 3Dシーンのレンダリング
     */
    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * ゲームの更新
     */
    update() {
        // プレイヤーの更新
        if (this.player) {
            this.player.update();
            
            // プレイヤーの位置にカメラを追従
            if (this.camera) {
                // カメラの位置をプレイヤーの目線位置に設定
                this.camera.position.set(
                    this.player.position.x,
                    this.player.position.y + 2, // 目線の高さ
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
            }
        }
        
        // 敵の更新
        this.updateEnemies();
        
        // ステージの更新
        if (this.stageManager) {
            this.stageManager.update();
        }
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
        this.enemies.push(enemy);
        
        // プレイヤーをターゲットに設定
        if (this.player) {
            enemy.setTarget(this.player);
        }
        
        // 3Dモデルの作成
        this.createEnemyModel(enemy);
    }
    
    /**
     * 敵の3Dモデルを作成
     */
    createEnemyModel(enemy) {
        // 敵のタイプに応じたモデルを作成
        let geometry, material;
        
        switch (enemy.type) {
            case 'boss':
                geometry = new THREE.BoxGeometry(1.2, 2.2, 1.2);
                material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                break;
            case 'customer':
                geometry = new THREE.BoxGeometry(1, 2, 1);
                material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
                break;
            case 'sales':
                geometry = new THREE.BoxGeometry(0.9, 1.9, 0.9);
                material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
                break;
            case 'finalBoss':
                geometry = new THREE.BoxGeometry(1.5, 2.5, 1.5);
                material = new THREE.MeshStandardMaterial({ color: 0x880000 });
                break;
            default:
                geometry = new THREE.BoxGeometry(1, 2, 1);
                material = new THREE.MeshStandardMaterial({ color: 0x888888 });
        }
        
        const model = new THREE.Mesh(geometry, material);
        model.position.set(enemy.position.x, enemy.position.y + 1, enemy.position.z);
        model.castShadow = true;
        model.receiveShadow = true;
        
        // 敵オブジェクトにモデルを関連付け
        enemy.model = model;
        
        // シーンに追加
        this.scene.add(model);
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
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            console.log("ゲームを一時停止しました");
        } else {
            console.log("ゲームを再開しました");
        }
    }
    
    /**
     * ゲームを一時停止
     */
    pauseGame() {
        this.isPaused = true;
    }
    
    /**
     * ゲームを再開
     */
    resumeGame() {
        this.isPaused = false;
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
        
        // ゲームオーバー音を再生
        this.playMusic('gameOver');
        
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
        this.playMusic('victory');
        
        // スコア表示
        document.getElementById('victory-score').textContent = this.player.score;
        
        // エンディングメッセージの表示
        this.storyManager.showEndingMessage();
        
        // 画面を表示
        this.hideAllScreens();
        this.screens.victory.classList.add('active');
    }
    
    /**
     * 効果音の再生
     */
    playSound(soundName) {
        if (this.audioContext && this.soundBuffers[soundName]) {
            try {
                // AudioContextが一時停止状態なら再開
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                
                // 音源を作成
                const source = this.audioContext.createBufferSource();
                source.buffer = this.soundBuffers[soundName];
                
                // 音量調整
                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = 0.5; // 音量は0.0〜1.0
                
                // 接続
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                // 再生
                source.start(0);
                
                return source;
            } catch (e) {
                console.error(`Error playing sound ${soundName}:`, e);
            }
        } else {
            console.warn(`Sound not found or audio not initialized: ${soundName}`);
        }
        return null;
    }
    
    /**
     * BGMの再生
     */
    playMusic(musicName) {
        // 現在再生中のBGMを停止
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic = null;
        }
        
        if (this.audioContext && this.soundBuffers[musicName]) {
            try {
                // AudioContextが一時停止状態なら再開
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                
                // 音源を作成
                const source = this.audioContext.createBufferSource();
                source.buffer = this.soundBuffers[musicName];
                source.loop = true; // BGMはループ再生
                
                // 音量調整
                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = 0.3; // BGMは少し小さめ
                
                // 接続
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                // 再生
                source.start(0);
                
                // 現在のBGMとして保存
                this.currentMusic = source;
            } catch (e) {
                console.error(`Error playing music ${musicName}:`, e);
            }
        } else {
            console.warn(`Music not found or audio not initialized: ${musicName}`);
        }
    }
}

// ページロード時にゲームを初期化
window.addEventListener('load', () => {
    window.game = new Game();
});
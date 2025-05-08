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
            console.log(`Loading sound: ${name} from ${url}`);
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.arrayBuffer();
                })
                .then(arrayBuffer => {
                    return this.audioContext.decodeAudioData(arrayBuffer);
                })
                .then(audioBuffer => {
                    this.soundBuffers[name] = audioBuffer;
                    console.log(`Sound loaded successfully: ${name}`);
                })
                .catch(error => {
                    console.error(`Error loading sound ${name} from ${url}:`, error);
                });
        };
        
        // 効果音のロード
        // GameConfigのsoundsオブジェクトのキーが「sfx」になっているのを修正
        for (const [name, path] of Object.entries(soundConfig.sfx || {})) {
            loadAudioBuffer(`assets/sounds/effects/${path}`, name);
        }
        
        // BGMのロード
        for (const [name, path] of Object.entries(soundConfig.music || {})) {
            loadAudioBuffer(`assets/sounds/bgm/${path}`, name);
        }
        
        // 敵の遠距離攻撃用のサウンドを追加
        loadAudioBuffer('assets/sounds/effects/ranged-attack.mp3', 'enemyRangedAttack');
        loadAudioBuffer('assets/sounds/effects/switch.mp3', 'switchAbility');
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
                
                console.log(`Playing sound: ${soundName}`);
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
                console.log(`Playing music: ${musicName}`);
                
                // 現在のBGMとして保存
                this.currentMusic = source;
                
                return source;
            } catch (e) {
                console.error(`Error playing music ${musicName}:`, e);
            }
        } else {
            console.warn(`Music not found or audio not initialized: ${musicName}`);
        }
        return null;
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
        this.scene.background = new THREE.Color(0x87ceeb); // デフォルトの空色の背景
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
        
        // 背景用のメッシュ（遠くの風景を表現）
        this.setupBackgroundMesh();
        
        // ウィンドウリサイズ対応
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    /**
     * 背景メッシュの作成（遠くの風景を表現）
     */
    setupBackgroundMesh() {
        // 背景用の円柱状メッシュ（スカイボックス的な役割）
        const bgGeometry = new THREE.CylinderGeometry(50, 50, 30, 32, 1, true);
        const textureLoader = new THREE.TextureLoader();
        
        // デフォルトの背景テクスチャ
        const bgTexture = textureLoader.load('assets/images/background/office.svg');
        bgTexture.wrapS = THREE.RepeatWrapping;
        bgTexture.repeat.set(4, 1);
        
        const bgMaterial = new THREE.MeshBasicMaterial({
            map: bgTexture,
            side: THREE.BackSide // 内側からテクスチャを見えるようにする
        });
        
        this.backgroundMesh = new THREE.Mesh(bgGeometry, bgMaterial);
        this.backgroundMesh.position.set(0, 10, 0);
        this.backgroundMesh.name = "background";
        this.scene.add(this.backgroundMesh);
    }
    
    /**
     * 背景テクスチャの更新
     */
    updateBackgroundTexture(envType) {
        if (!this.backgroundMesh) return;
        
        const textureLoader = new THREE.TextureLoader();
        let texturePath;
        
        // 環境タイプに基づいてテクスチャを選択
        switch (envType) {
            case "office":
                texturePath = 'assets/images/background/office.svg';
                break;
            case "meeting_room":
                texturePath = 'assets/images/background/meeting_room.svg';
                break;
            case "cafeteria":
                texturePath = 'assets/images/background/cafeteria.svg';
                break;
            case "night_office":
                texturePath = 'assets/images/background/night_office.svg';
                break;
            case "ceo_office":
                texturePath = 'assets/images/background/ceo_office.svg';
                break;
            default:
                texturePath = 'assets/images/background/office.svg';
        }
        
        textureLoader.load(texturePath, (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.repeat.set(4, 1);
            
            // マテリアルのテクスチャを更新
            this.backgroundMesh.material.map = texture;
            this.backgroundMesh.material.needsUpdate = true;
            
            console.log(`背景テクスチャを更新: ${texturePath}`);
        });
    }
    
    /**
     * オフィス環境のセットアップ
     * @param {string} envType - 環境タイプ（"office", "meeting_room"など）
     */
    setupEnvironment(envType) {
        // 既存の環境オブジェクトをクリア（地面は残す）
        for (const obj of this.gameObjects.environment) {
            if (obj.name !== "ground" && obj.name !== "background") {
                this.scene.remove(obj);
            }
        }
        this.gameObjects.environment = this.gameObjects.environment.filter(obj => 
            obj.name === "ground" || obj.name === "background");
        
        // 背景テクスチャを更新
        this.updateBackgroundTexture(envType);
        
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
        
        // フォグ効果を環境に合わせて調整
        this.updateFogForEnvironment(envType);
    }
    
    /**
     * 環境に合わせてフォグを調整
     */
    updateFogForEnvironment(envType) {
        switch (envType) {
            case "night_office":
                this.scene.fog = new THREE.Fog(0x0a192f, 10, 40);
                break;
            case "burning_office":
                this.scene.fog = new THREE.Fog(0x331100, 5, 20);
                break;
            case "ceo_office":
                this.scene.fog = new THREE.Fog(0x221408, 15, 50);
                break;
            default:
                this.scene.fog = new THREE.Fog(0x87ceeb, 20, 100);
        }
    }
    
    /**
     * テクスチャをロードする関数
     */
    loadTexture(path) {
        const textureLoader = new THREE.TextureLoader();
        return textureLoader.load(path);
    }
    
    /**
     * 遮蔽物を作成
     * @param {Object} options - オプション
     * @returns {THREE.Mesh} - 作成された遮蔽物のメッシュ
     */
    createObstacle(options) {
        const defaults = {
            position: { x: 0, y: 0, z: 0 },
            size: { width: 1, height: 1, depth: 1 },
            rotation: { x: 0, y: 0, z: 0 },
            color: 0x8B4513,
            textureUrl: null,
            type: 'box' // box, cylinder, custom
        };
        
        const config = { ...defaults, ...options };
        let geometry, mesh;
        
        // 形状に基づいてジオメトリを作成
        switch (config.type) {
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(
                    config.size.width / 2, 
                    config.size.width / 2, 
                    config.size.height, 
                    16
                );
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(config.size.width / 2, 16, 16);
                break;
            case 'pyramid':
                geometry = new THREE.ConeGeometry(config.size.width / 2, config.size.height, 4);
                break;
            case 'custom':
                // カスタム形状の場合は事前に作成されたジオメトリを使用
                geometry = config.geometry;
                break;
            default:
                // デフォルトはボックス
                geometry = new THREE.BoxGeometry(
                    config.size.width, 
                    config.size.height, 
                    config.size.depth
                );
        }
        
        // マテリアルの作成
        let material;
        if (config.textureUrl) {
            const texture = this.loadTexture(config.textureUrl);
            material = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.7,
                metalness: 0.3
            });
        } else {
            material = new THREE.MeshStandardMaterial({
                color: config.color,
                roughness: 0.7,
                metalness: 0.3
            });
        }
        
        // メッシュの作成
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(config.position.x, config.position.y + config.size.height / 2, config.position.z);
        mesh.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.name = "obstacle";
        
        // シーンに追加
        this.scene.add(mesh);
        this.gameObjects.environment.push(mesh);
        
        return mesh;
    }
    
    /**
     * 家具オブジェクトを作成
     * @param {string} type - 家具のタイプ
     * @param {Object} position - 位置
     * @param {number} rotation - Y軸回転（ラジアン）
     * @returns {THREE.Group} - 家具オブジェクトグループ
     */
    createFurniture(type, position, rotation = 0) {
        const group = new THREE.Group();
        group.position.set(position.x, position.y, position.z);
        group.rotation.y = rotation;
        
        switch (type) {
            case 'desk':
                // デスク
                const deskTop = this.createObstacle({
                    position: { x: 0, y: 0, z: 0 },
                    size: { width: 1.5, height: 0.1, depth: 0.8 },
                    color: 0x8B4513,
                    textureUrl: 'assets/images/textures/wood.png'
                });
                
                // 机の脚
                const legPositions = [
                    { x: -0.65, y: 0, z: -0.3 },
                    { x: 0.65, y: 0, z: -0.3 },
                    { x: -0.65, y: 0, z: 0.3 },
                    { x: 0.65, y: 0, z: 0.3 }
                ];
                
                for (const legPos of legPositions) {
                    const leg = this.createObstacle({
                        position: { x: legPos.x, y: 0, z: legPos.z },
                        size: { width: 0.1, height: 0.7, depth: 0.1 },
                        color: 0x6B4513
                    });
                    group.add(leg);
                }
                
                group.add(deskTop);
                break;
                
            case 'chair':
                // 椅子の座面
                const seat = this.createObstacle({
                    position: { x: 0, y: 0.4, z: 0 },
                    size: { width: 0.5, height: 0.1, depth: 0.5 },
                    color: 0x444444,
                    textureUrl: 'assets/images/textures/fabric.png'
                });
                
                // 椅子の背もたれ
                const backrest = this.createObstacle({
                    position: { x: 0, y: 0.85, z: 0.2 },
                    size: { width: 0.5, height: 0.8, depth: 0.1 },
                    color: 0x444444,
                    textureUrl: 'assets/images/textures/fabric.png'
                });
                
                // 椅子の脚
                const chairLegPositions = [
                    { x: -0.2, y: 0, z: -0.2 },
                    { x: 0.2, y: 0, z: -0.2 },
                    { x: -0.2, y: 0, z: 0.2 },
                    { x: 0.2, y: 0, z: 0.2 }
                ];
                
                for (const legPos of chairLegPositions) {
                    const leg = this.createObstacle({
                        position: { x: legPos.x, y: 0, z: legPos.z },
                        size: { width: 0.05, height: 0.4, depth: 0.05 },
                        color: 0x333333
                    });
                    group.add(leg);
                }
                
                group.add(seat);
                group.add(backrest);
                break;
                
            case 'bookshelf':
                // 本棚の本体
                const bookshelf = this.createObstacle({
                    position: { x: 0, y: 0.9, z: 0 },
                    size: { width: 1.2, height: 1.8, depth: 0.4 },
                    color: 0x8B4513,
                    textureUrl: 'assets/images/textures/wood.png'
                });
                
                // 棚板
                for (let i = 0; i < 3; i++) {
                    const shelf = this.createObstacle({
                        position: { x: 0, y: 0.3 + i * 0.5, z: 0 },
                        size: { width: 1.18, height: 0.03, depth: 0.38 },
                        color: 0x6B4513
                    });
                    group.add(shelf);
                }
                
                // 本を追加
                const bookColors = [0x8B0000, 0x006400, 0x00008B, 0x4B0082];
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 4; j++) {
                        if (Math.random() > 0.3) { // 70%の確率で本を配置
                            const bookColor = bookColors[Math.floor(Math.random() * bookColors.length)];
                            const book = this.createObstacle({
                                position: { 
                                    x: -0.5 + j * 0.25, 
                                    y: 0.15 + i * 0.5, 
                                    z: -0.05 
                                },
                                size: { width: 0.2, height: 0.3, depth: 0.1 },
                                color: bookColor
                            });
                            group.add(book);
                        }
                    }
                }
                
                group.add(bookshelf);
                break;
                
            case 'plant':
                // 植木鉢
                const pot = this.createObstacle({
                    position: { x: 0, y: 0, z: 0 },
                    size: { width: 0.4, height: 0.4, depth: 0.4 },
                    color: 0x8B4513,
                    type: 'cylinder'
                });
                
                // 植物の葉
                const plant = this.createObstacle({
                    position: { x: 0, y: 0.5, z: 0 },
                    size: { width: 0.7, height: 0.7, depth: 0.7 },
                    color: 0x228B22,
                    type: 'sphere',
                    textureUrl: 'assets/images/textures/plant.png'
                });
                
                group.add(pot);
                group.add(plant);
                break;
                
            case 'filecabinet':
                // ファイルキャビネット本体
                const cabinet = this.createObstacle({
                    position: { x: 0, y: 0.6, z: 0 },
                    size: { width: 0.8, height: 1.2, depth: 0.6 },
                    color: 0x708090,
                    textureUrl: 'assets/images/textures/metal.png'
                });
                
                // 引き出し
                for (let i = 0; i < 3; i++) {
                    const drawer = this.createObstacle({
                        position: { x: 0, y: 0.2 + i * 0.4, z: 0.02 },
                        size: { width: 0.75, height: 0.38, depth: 0.01 },
                        color: 0x607080
                    });
                    
                    // 取っ手
                    const handle = this.createObstacle({
                        position: { x: 0, y: 0.2 + i * 0.4, z: 0.05 },
                        size: { width: 0.3, height: 0.05, depth: 0.05 },
                        color: 0xC0C0C0
                    });
                    
                    group.add(drawer);
                    group.add(handle);
                }
                
                group.add(cabinet);
                break;
                
            case 'computer':
                // モニター
                const monitor = this.createObstacle({
                    position: { x: 0, y: 0.4, z: 0 },
                    size: { width: 0.6, height: 0.4, depth: 0.05 },
                    color: 0x000000
                });
                
                // スクリーン
                const screen = this.createObstacle({
                    position: { x: 0, y: 0.4, z: 0.03 },
                    size: { width: 0.56, height: 0.36, depth: 0.01 },
                    color: 0x87CEEB
                });
                
                // モニタースタンド
                const stand = this.createObstacle({
                    position: { x: 0, y: 0.2, z: 0.1 },
                    size: { width: 0.1, height: 0.2, depth: 0.1 },
                    color: 0x696969
                });
                
                // キーボード
                const keyboard = this.createObstacle({
                    position: { x: 0, y: 0.05, z: 0.3 },
                    size: { width: 0.4, height: 0.02, depth: 0.15 },
                    color: 0x2F4F4F
                });
                
                // マウス
                const mouse = this.createObstacle({
                    position: { x: 0.3, y: 0.03, z: 0.3 },
                    size: { width: 0.06, height: 0.03, depth: 0.1 },
                    color: 0x000000
                });
                
                group.add(monitor);
                group.add(screen);
                group.add(stand);
                group.add(keyboard);
                group.add(mouse);
                break;
        }
        
        // グループをシーンに追加
        this.scene.add(group);
        this.gameObjects.environment.push(group);
        group.name = "furniture";
        
        return group;
    }
    
    /**
     * テクスチャ用の画像がなければパターンを生成
     */
    createWoodTexturePattern() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // 背景色
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, 0, 256, 256);
        
        // 木目パターン
        ctx.strokeStyle = '#6B3000';
        for (let i = 0; i < 40; i++) {
            const y = i * 7;
            ctx.beginPath();
            ctx.moveTo(0, y);
            
            // 波線を描く
            for (let x = 0; x < 256; x += 10) {
                const yOffset = Math.sin(x * 0.05) * 3;
                ctx.lineTo(x, y + yOffset);
            }
            
            ctx.stroke();
        }
        
        return canvas.toDataURL();
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
    
    /**
     * 標準的なオフィス環境を作成
     */
    createOfficeEnvironment() {
        // 壁と天井のセットアップ
        this.createDefaultEnvironment();
        
        // オフィス特有の家具を配置
        // デスク配置
        for (let i = -3; i <= 3; i += 2) {
            for (let j = -3; j <= 3; j += 2) {
                if (Math.abs(i) < 2 && Math.abs(j) < 2) continue; // 中央部分はスペースを空ける
                
                // デスクセット
                this.createFurniture('desk', { x: i * 4, y: 0, z: j * 4 }, Math.PI * 0.5 * Math.floor(Math.random() * 4));
                
                // 椅子
                this.createFurniture('chair', { x: i * 4 + 0.8, y: 0, z: j * 4 }, Math.PI * 0.5 * Math.floor(Math.random() * 4) + Math.PI);
                
                // コンピューター
                if (Math.random() > 0.3) {
                    this.createFurniture('computer', { x: i * 4, y: 0.7, z: j * 4 }, Math.PI * 0.5 * Math.floor(Math.random() * 4));
                }
            }
        }
        
        // パーティションを配置
        const partitionPositions = [
            { x: -6, z: 0, rotY: 0 },
            { x: 6, z: 0, rotY: 0 },
            { x: 0, z: -6, rotY: Math.PI / 2 },
            { x: 0, z: 6, rotY: Math.PI / 2 }
        ];
        
        partitionPositions.forEach(pos => {
            const partition = this.createObstacle({
                position: { x: pos.x, y: 0, z: pos.z },
                size: { width: 8, height: 1.8, depth: 0.2 },
                rotation: { x: 0, y: pos.rotY, z: 0 },
                color: 0xaaaaaa,
                textureUrl: 'assets/images/textures/fabric.svg'
            });
        });
        
        // 会議テーブルを中央に配置
        const conferenceTable = this.createObstacle({
            position: { x: 0, y: 0, z: 0 },
            size: { width: 4, height: 0.8, depth: 2 },
            color: 0x8B4513,
            textureUrl: 'assets/images/textures/wood.svg'
        });
        
        // 会議テーブルの周りに椅子を配置
        const chairPositions = [
            { x: -1.5, z: 0, rotY: Math.PI / 2 },
            { x: 1.5, z: 0, rotY: -Math.PI / 2 },
            { x: 0, z: -1.2, rotY: 0 },
            { x: 0, z: 1.2, rotY: Math.PI }
        ];
        
        chairPositions.forEach(pos => {
            this.createFurniture('chair', { x: pos.x, y: 0, z: pos.z }, pos.rotY);
        });
        
        // ファイルキャビネットを配置
        const cabinetPositions = [
            { x: -9, z: -9 },
            { x: -9, z: -7 },
            { x: 9, z: 9 },
            { x: 7, z: 9 }
        ];
        
        cabinetPositions.forEach(pos => {
            this.createFurniture('filecabinet', pos, Math.PI * 0.5 * Math.floor(Math.random() * 4));
        });
        
        // 植物を配置
        const plantPositions = [
            { x: -8, z: 8 },
            { x: 8, z: -8 },
            { x: -4, z: 5 },
            { x: 4, z: -5 }
        ];
        
        plantPositions.forEach(pos => {
            this.createFurniture('plant', pos);
        });
        
        // 本棚を配置
        const bookshelfPositions = [
            { x: -10, z: 0, rotY: 0 },
            { x: 10, z: 0, rotY: 0 },
            { x: 0, z: -10, rotY: Math.PI / 2 },
            { x: 0, z: 10, rotY: Math.PI / 2 }
        ];
        
        bookshelfPositions.forEach(pos => {
            this.createFurniture('bookshelf', { x: pos.x, y: 0, z: pos.z }, pos.rotY);
        });
        
        // 照明を設定
        const officeLight = new THREE.PointLight(0xffffff, 0.8, 20);
        officeLight.position.set(0, 8, 0);
        this.scene.add(officeLight);
        this.lights.push(officeLight);
    }
    
    /**
     * 会議室環境を作成
     */
    createMeetingRoomEnvironment() {
        // 壁と天井のセットアップ
        this.createDefaultEnvironment();
        
        // 大きな会議テーブル
        const conferenceTable = this.createObstacle({
            position: { x: 0, y: 0, z: 0 },
            size: { width: 8, height: 0.8, depth: 3 },
            color: 0x8B4513,
            textureUrl: 'assets/images/textures/wood.svg'
        });
        
        // テーブルの周りに椅子を配置
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const radius = 4;
            const x = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius;
            this.createFurniture('chair', { x, y: 0, z }, angle + Math.PI);
        }
        
        // プロジェクタースクリーン
        const screen = this.createObstacle({
            position: { x: 0, y: 2, z: -10 },
            size: { width: 6, height: 4, depth: 0.1 },
            color: 0xffffff
        });
        
        // プロジェクター
        const projector = this.createObstacle({
            position: { x: 0, y: 8, z: 0 },
            size: { width: 0.8, height: 0.3, depth: 1 },
            color: 0x333333
        });
        
        // プレゼンター用の小さな台
        const podium = this.createObstacle({
            position: { x: 3, y: 0, z: -8 },
            size: { width: 1, height: 1.2, depth: 0.6 },
            color: 0x8B4513,
            textureUrl: 'assets/images/textures/wood.svg'
        });
        
        // ホワイトボード
        const whiteboard = this.createObstacle({
            position: { x: 10, y: 1.5, z: 0 },
            size: { width: 0.1, height: 3, depth: 5 },
            rotation: { x: 0, y: Math.PI / 2, z: 0 },
            color: 0xf8f8f8
        });
        
        // 待合用の椅子
        for (let i = -4; i <= 4; i += 2) {
            this.createFurniture('chair', { x: i, y: 0, z: 10 }, Math.PI);
        }
        
        // 植物
        this.createFurniture('plant', { x: 10, y: 0, z: 10 });
        this.createFurniture('plant', { x: -10, y: 0, z: 10 });
        
        // 照明
        const meetingRoomLight1 = new THREE.PointLight(0xffffff, 1, 15);
        meetingRoomLight1.position.set(0, 8, 0);
        this.scene.add(meetingRoomLight1);
        this.lights.push(meetingRoomLight1);
        
        const meetingRoomLight2 = new THREE.PointLight(0xffffff, 0.6, 15);
        meetingRoomLight2.position.set(0, 8, -8);
        this.scene.add(meetingRoomLight2);
        this.lights.push(meetingRoomLight2);
    }
    
    /**
     * 食堂環境を作成
     */
    createCafeteriaEnvironment() {
        // 壁と天井のセットアップ
        this.createDefaultEnvironment();
        
        // 複数の食卓テーブルを配置
        for (let i = -2; i <= 2; i++) {
            for (let j = -2; j <= 2; j++) {
                if (i === 0 && j === 0) continue; // 中央は空ける
                
                // テーブル
                const table = this.createObstacle({
                    position: { x: i * 6, y: 0, z: j * 6 },
                    size: { width: 2, height: 0.8, depth: 2 },
                    color: 0x8B4513,
                    textureUrl: 'assets/images/textures/wood.svg'
                });
                
                // テーブルの周りに椅子を配置
                for (let k = 0; k < 4; k++) {
                    const angle = (k / 4) * Math.PI * 2;
                    const radius = 1.5;
                    const x = i * 6 + Math.sin(angle) * radius;
                    const z = j * 6 + Math.cos(angle) * radius;
                    this.createFurniture('chair', { x, y: 0, z }, angle + Math.PI);
                }
            }
        }
        
        // カウンター
        const counter = this.createObstacle({
            position: { x: 0, y: 1, z: -15 },
            size: { width: 20, height: 2, depth: 2 },
            color: 0xc0c0c0
        });
        
        // カウンターの上に食べ物を模した小物
        for (let i = -9; i <= 9; i += 3) {
            // 食品トレイ
            const foodTray = this.createObstacle({
                position: { x: i, y: 2.1, z: -15 },
                size: { width: 2, height: 0.2, depth: 1.5 },
                color: 0xd0d0d0
            });
            
            // 料理 (様々な色の小さな立方体で表現)
            const foodColors = [0xff0000, 0x00ff00, 0xffff00, 0xff00ff, 0x00ffff, 0xff8800];
            const foodColor = foodColors[Math.floor(Math.random() * foodColors.length)];
            
            const food = this.createObstacle({
                position: { x: i, y: 2.3, z: -15 },
                size: { width: 1.5, height: 0.4, depth: 1 },
                color: foodColor
            });
        }
        
        // 自動販売機
        for (let i = -12; i <= 12; i += 8) {
            const vendingMachine = this.createObstacle({
                position: { x: i, y: 1, z: -18 },
                size: { width: 2, height: 2, depth: 1 },
                color: 0x333333
            });
            
            // 自販機のディスプレイ部分
            const display = this.createObstacle({
                position: { x: i, y: 1.3, z: -17.4 },
                size: { width: 1.8, height: 1.6, depth: 0.1 },
                color: 0x87ceeb
            });
            
            // ボタン類
            for (let j = 0; j < 9; j++) {
                const bx = i - 0.6 + (j % 3) * 0.6;
                const by = 1.8 - Math.floor(j / 3) * 0.6;
                const button = this.createObstacle({
                    position: { x: bx, y: by, z: -17.4 },
                    size: { width: 0.4, height: 0.4, depth: 0.1 },
                    color: 0xff0000
                });
            }
        }
        
        // 観葉植物
        for (let i = -15; i <= 15; i += 10) {
            this.createFurniture('plant', { x: i, y: 0, z: 15 });
        }
        
        // 照明
        for (let i = -10; i <= 10; i += 10) {
            for (let j = -10; j <= 10; j += 10) {
                const light = new THREE.PointLight(0xffffff, 0.6, 12);
                light.position.set(i, 8, j);
                this.scene.add(light);
                this.lights.push(light);
            }
        }
    }
    
    /**
     * 会議室の高級バージョン
     */
    createConferenceRoomEnvironment() {
        this.createMeetingRoomEnvironment();
        
        // より豪華な装飾を追加
        const artPositions = [
            { x: -15, y: 4, z: -5, rotY: 0 },
            { x: -15, y: 4, z: 5, rotY: 0 },
            { x: 15, y: 4, z: -5, rotY: 0 },
            { x: 15, y: 4, z: 5, rotY: 0 }
        ];
        
        // 壁掛けアート
        artPositions.forEach(pos => {
            const frame = this.createObstacle({
                position: { x: pos.x, y: pos.y, z: pos.z },
                size: { width: 0.1, height: 2, depth: 3 },
                rotation: { x: 0, y: pos.rotY, z: 0 },
                color: 0x8B4513,
                textureUrl: 'assets/images/textures/wood.svg'
            });
            
            const art = this.createObstacle({
                position: { x: pos.x + (pos.rotY ? 0.1 : 0), y: pos.y, z: pos.z },
                size: { width: 0.05, height: 1.8, depth: 2.8 },
                rotation: { x: 0, y: pos.rotY, z: 0 },
                color: Math.random() * 0xffffff
            });
        });
    }
    
    /**
     * エグゼクティブオフィス環境を作成
     */
    createExecutiveOfficeEnvironment() {
        // 壁と天井のセットアップ
        this.createDefaultEnvironment();
        
        // 豪華な執行役員用デスク
        const executiveDesk = this.createObstacle({
            position: { x: 0, y: 0, z: -8 },
            size: { width: 6, height: 0.9, depth: 3 },
            color: 0x8B4513,
            textureUrl: 'assets/images/textures/wood.svg'
        });
        
        // 高級な椅子
        const executiveChair = this.createObstacle({
            position: { x: 0, y: 0, z: -10 },
            size: { width: 1.5, height: 2.2, depth: 1.5 },
            color: 0x000000,
            textureUrl: 'assets/images/textures/fabric.svg'
        });
        
        // キャビネット
        const cabinetPositions = [
            { x: -10, y: 0, z: -12 },
            { x: -6, y: 0, z: -12 },
            { x: 6, y: 0, z: -12 },
            { x: 10, y: 0, z: -12 }
        ];
        
        cabinetPositions.forEach(pos => {
            this.createFurniture('filecabinet', pos, Math.PI);
        });
        
        // 応接セット
        // ソファ
        const sofa = this.createObstacle({
            position: { x: 0, y: 0.5, z: 8 },
            size: { width: 5, height: 1, depth: 2 },
            color: 0x333333,
            textureUrl: 'assets/images/textures/fabric.svg'
        });
        
        // 応接用小テーブル
        const coffeeTable = this.createObstacle({
            position: { x: 0, y: 0.4, z: 5 },
            size: { width: 3, height: 0.8, depth: 1.5 },
            color: 0x8B4513,
            textureUrl: 'assets/images/textures/wood.svg'
        });
        
        // 一人掛けソファ
        const singleSofas = [
            { x: -3, y: 0.5, z: 3, rotY: Math.PI / 4 },
            { x: 3, y: 0.5, z: 3, rotY: -Math.PI / 4 }
        ];
        
        singleSofas.forEach(pos => {
            const singleSofa = this.createObstacle({
                position: { x: pos.x, y: pos.y, z: pos.z },
                size: { width: 2, height: 1, depth: 2 },
                rotation: { x: 0, y: pos.rotY, z: 0 },
                color: 0x333333,
                textureUrl: 'assets/images/textures/fabric.svg'
            });
        });
        
        // 装飾植物
        const plants = [
            { x: -12, y: 0, z: 12 },
            { x: 12, y: 0, z: 12 },
            { x: -12, y: 0, z: -5 },
            { x: 12, y: 0, z: -5 }
        ];
        
        plants.forEach(pos => {
            this.createFurniture('plant', pos);
        });
        
        // 豪華な壁掛けアート
        const paintings = [
            { x: -15, y: 4, z: 0, rotY: 0 },
            { x: 15, y: 4, z: 0, rotY: 0 },
            { x: 0, y: 4, z: -15, rotY: Math.PI / 2 },
            { x: 0, y: 4, z: 15, rotY: Math.PI / 2 }
        ];
        
        paintings.forEach(pos => {
            const frame = this.createObstacle({
                position: { x: pos.x, y: pos.y, z: pos.z },
                size: { width: 0.1, height: 3, depth: 4 },
                rotation: { x: 0, y: pos.rotY, z: 0 },
                color: 0x8B4513,
                textureUrl: 'assets/images/textures/wood.svg'
            });
            
            const art = this.createObstacle({
                position: { x: pos.x + (pos.rotY ? 0.1 : 0), y: pos.y, z: pos.z },
                size: { width: 0.05, height: 2.8, depth: 3.8 },
                rotation: { x: 0, y: pos.rotY, z: 0 },
                color: Math.random() * 0xffffff
            });
        });
        
        // 照明
        const mainLight = new THREE.PointLight(0xffffff, 0.8, 20);
        mainLight.position.set(0, 8, 0);
        this.scene.add(mainLight);
        this.lights.push(mainLight);
        
        const deskLight = new THREE.SpotLight(0xffffcc, 1, 15, Math.PI / 6);
        deskLight.position.set(0, 10, -8);
        deskLight.target.position.set(0, 0, -8);
        this.scene.add(deskLight);
        this.scene.add(deskLight.target);
        this.lights.push(deskLight);
    }
    
    /**
     * サーバールーム環境を作成
     */
    createServerRoomEnvironment() {
        // 壁と天井のセットアップ
        this.createDefaultEnvironment();
        
        // サーバーラック
        for (let i = -4; i <= 4; i += 2) {
            for (let j = -4; j <= 4; j += 6) {
                const serverRack = this.createObstacle({
                    position: { x: i * 3, y: 1, z: j * 2 },
                    size: { width: 2, height: 4, depth: 1 },
                    color: 0x333333
                });
                
                // サーバー装置を表現
                for (let k = 0; k < 5; k++) {
                    const server = this.createObstacle({
                        position: { x: i * 3, y: 0.2 + k * 0.8, z: j * 2 + 0.05 },
                        size: { width: 1.9, height: 0.7, depth: 0.9 },
                        color: 0x444444
                    });
                    
                    // サーバーのランプ
                    for (let l = 0; l < 4; l++) {
                        const lampColors = [0xff0000, 0x00ff00, 0xffff00, 0x0000ff];
                        const lamp = this.createObstacle({
                            position: { x: i * 3 - 0.8 + l * 0.4, y: 0.2 + k * 0.8, z: j * 2 + 0.5 },
                            size: { width: 0.1, height: 0.1, depth: 0.1 },
                            color: lampColors[l]
                        });
                    }
                }
            }
        }
        
        // 作業デスク
        const workstation = this.createObstacle({
            position: { x: 0, y: 0, z: 0 },
            size: { width: 3, height: 0.8, depth: 1.5 },
            color: 0x777777,
            textureUrl: 'assets/images/textures/metal.svg'
        });
        
        // 作業用の椅子
        this.createFurniture('chair', { x: 0, y: 0, z: 1.2 }, Math.PI);
        
        // モニター
        for (let i = -1; i <= 1; i += 1) {
            const monitor = this.createObstacle({
                position: { x: i, y: 1.3, z: -0.2 },
                size: { width: 0.8, height: 0.6, depth: 0.1 },
                color: 0x000000
            });
            
            const screen = this.createObstacle({
                position: { x: i, y: 1.3, z: -0.15 },
                size: { width: 0.75, height: 0.55, depth: 0.01 },
                color: 0x0000ff
            });
        }
        
        // ケーブルを表現
        const cableColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
        
        for (let i = -4; i <= 4; i += 2) {
            const color = cableColors[Math.floor(Math.random() * cableColors.length)];
            const cable = new THREE.Mesh(
                new THREE.TubeGeometry(
                    new THREE.CatmullRomCurve3([
                        new THREE.Vector3(i * 3, 0.5, -8),
                        new THREE.Vector3(i * 3 - 1, 0.5, -4),
                        new THREE.Vector3(i * 3 + 1, 0.5, 0),
                        new THREE.Vector3(0, 0.5, 3)
                    ]),
                    20, 0.1, 8, false
                ),
                new THREE.MeshStandardMaterial({ color: color })
            );
            
            cable.castShadow = true;
            cable.receiveShadow = true;
            cable.name = "obstacle";
            this.scene.add(cable);
            this.gameObjects.environment.push(cable);
        }
        
        // 冷却装置
        const cooler = this.createObstacle({
            position: { x: 10, y: 1, z: 0 },
            size: { width: 3, height: 2, depth: 2 },
            color: 0xaaaaaa
        });
        
        // 冷却ファン
        for (let i = 0; i < 4; i++) {
            const fanX = 10 + Math.sin(i * Math.PI / 2) * 0.5;
            const fanY = 1 + Math.cos(i * Math.PI / 2) * 0.5;
            const fan = this.createObstacle({
                position: { x: fanX, y: fanY, z: 1.1 },
                size: { width: 0.8, height: 0.8, depth: 0.1 },
                color: 0x333333,
                type: 'cylinder'
            });
        }
        
        // 緊急終了ボタン
        const emergencyButton = this.createObstacle({
            position: { x: -10, y: 1.5, z: 0 },
            size: { width: 0.8, height: 0.8, depth: 0.1 },
            color: 0xff0000,
            type: 'cylinder'
        });
        
        const buttonMount = this.createObstacle({
            position: { x: -10, y: 1.5, z: 0.3 },
            size: { width: 1, height: 1, depth: 0.5 },
            color: 0x777777
        });
        
        // 照明 - サーバールームは少し暗めに
        for (let i = -12; i <= 12; i += 8) {
            for (let j = -12; j <= 12; j += 8) {
                const light = new THREE.PointLight(0xccffff, 0.5, 10);
                light.position.set(i, 8, j);
                this.scene.add(light);
                this.lights.push(light);
            }
        }
    }
    
    /**
     * 夜間オフィス環境を作成
     */
    createNightOfficeEnvironment() {
        // 基本的なオフィス環境をセットアップ
        this.createOfficeEnvironment();
        
        // 照明を夜間仕様に変更
        this.lights.forEach(light => {
            if (light instanceof THREE.PointLight) {
                this.scene.remove(light);
            }
        });
        this.lights = this.lights.filter(light => !(light instanceof THREE.PointLight));
        
        // 非常灯
        const emergencyLight1 = new THREE.PointLight(0xff3333, 0.5, 10);
        emergencyLight1.position.set(10, 8, 10);
        this.scene.add(emergencyLight1);
        this.lights.push(emergencyLight1);
        
        const emergencyLight2 = new THREE.PointLight(0xff3333, 0.5, 10);
        emergencyLight2.position.set(-10, 8, -10);
        this.scene.add(emergencyLight2);
        this.lights.push(emergencyLight2);
        
        // 一部のコンピューター画面からの光
        for (let i = -3; i <= 3; i += 2) {
            if (Math.random() > 0.5) {
                const screenLight = new THREE.PointLight(0x88aaff, 0.7, 5);
                screenLight.position.set(i * 4, 1.5, i * 2);
                this.scene.add(screenLight);
                this.lights.push(screenLight);
            }
        }
        
        // 夜の窓からの光
        const moonLight = new THREE.DirectionalLight(0x334466, 0.2);
        moonLight.position.set(20, 10, 20);
        this.scene.add(moonLight);
        this.lights.push(moonLight);
        
        // 全体的に暗く
        this.scene.fog = new THREE.Fog(0x0a192f, 10, 40);
        this.scene.background = new THREE.Color(0x0a192f);
    }
    
    /**
     * 燃えるオフィス環境を作成
     */
    createBurningOfficeEnvironment() {
        // 基本的なオフィス環境をセットアップ
        this.createOfficeEnvironment();
        
        // 照明を炎の効果に変更
        this.lights.forEach(light => {
            if (light instanceof THREE.PointLight) {
                this.scene.remove(light);
            }
        });
        this.lights = this.lights.filter(light => !(light instanceof THREE.PointLight));
        
        // 炎の光源を追加
        const firePositions = [
            { x: -8, y: 0, z: -8 },
            { x: 8, y: 0, z: 8 },
            { x: -5, y: 0, z: 5 },
            { x: 5, y: 0, z: -5 }
        ];
        
        firePositions.forEach(pos => {
            // 炎のベース
            const fireBase = this.createObstacle({
                position: { x: pos.x, y: 0, z: pos.z },
                size: { width: 1.5, height: 0.1, depth: 1.5 },
                color: 0x331100
            });
            
            // 炎の光源
            const fireLight = new THREE.PointLight(0xff5500, 1, 8);
            fireLight.position.set(pos.x, 1.5, pos.z);
            this.scene.add(fireLight);
            this.lights.push(fireLight);
            
            // 炎のアニメーション効果（点滅する光源）
            setInterval(() => {
                fireLight.intensity = 0.8 + Math.random() * 0.4;
            }, 100);
        });
        
        // 煙のような霧効果
        this.scene.fog = new THREE.Fog(0x331100, 5, 20);
        this.scene.background = new THREE.Color(0x331100);
        
        // 赤みがかった全体照明
        const ambientRed = new THREE.AmbientLight(0x330000, 0.8);
        this.scene.add(ambientRed);
        this.lights.push(ambientRed);
    }
    
    /**
     * 人事部オフィス環境を作成
     */
    createHROfficeEnvironment() {
        // 壁と天井のセットアップ
        this.createDefaultEnvironment();
        
        // 人事部特有のデスク配置 (複数のミーティングスペース)
        for (let i = -2; i <= 2; i += 2) {
            // インタビューテーブル
            const interviewTable = this.createObstacle({
                position: { x: i * 5, y: 0, z: 0 },
                size: { width: 2, height: 0.8, depth: 1.5 },
                color: 0x8B4513,
                textureUrl: 'assets/images/textures/wood.svg'
            });
            
            // 面接官の椅子
            this.createFurniture('chair', { x: i * 5, y: 0, z: 1.5 }, Math.PI);
            
            // 応募者の椅子（複数）
            this.createFurniture('chair', { x: i * 5 - 1, y: 0, z: -1 }, 0);
            this.createFurniture('chair', { x: i * 5 + 1, y: 0, z: -1 }, 0);
            
            // 書類棚
            this.createFurniture('filecabinet', { x: i * 5 + 3, y: 0, z: 0 }, Math.PI / 2);
        }
        
        // 受付カウンター
        const receptionDesk = this.createObstacle({
            position: { x: 0, y: 0, z: -10 },
            size: { width: 6, height: 1.2, depth: 1.5 },
            color: 0x8B4513,
            textureUrl: 'assets/images/textures/wood.svg'
        });
        
        // 受付椅子
        this.createFurniture('chair', { x: 0, y: 0, z: -8.5 }, Math.PI);
        
        // 待合スペース用のソファ
        const waitingPositions = [
            { x: -8, y: 0, z: -12, rotY: Math.PI / 4 },
            { x: 8, y: 0, z: -12, rotY: -Math.PI / 4 }
        ];
        
        waitingPositions.forEach(pos => {
            const sofa = this.createObstacle({
                position: { x: pos.x, y: pos.y, z: pos.z },
                size: { width: 5, height: 1, depth: 2 },
                rotation: { x: 0, y: pos.rotY, z: 0 },
                color: 0x333333,
                textureUrl: 'assets/images/textures/fabric.svg'
            });
        });
        
        // 雑誌用のテーブル
        const magazineTable = this.createObstacle({
            position: { x: 0, y: 0.4, z: -15 },
            size: { width: 2, height: 0.8, depth: 2 },
            color: 0x8B4513,
            textureUrl: 'assets/images/textures/wood.svg'
        });
        
        // 雑誌
        for (let i = 0; i < 5; i++) {
            const magazine = this.createObstacle({
                position: { 
                    x: -0.8 + i * 0.4, 
                    y: 0.8, 
                    z: -15 - 0.3 + Math.random() * 0.6 
                },
                size: { width: 0.3, height: 0.05, depth: 0.4 },
                color: Math.random() * 0xffffff
            });
        }
        
        // 植物装飾
        this.createFurniture('plant', { x: -15, y: 0, z: -15 });
        this.createFurniture('plant', { x: 15, y: 0, z: -15 });
        this.createFurniture('plant', { x: -15, y: 0, z: 15 });
        this.createFurniture('plant', { x: 15, y: 0, z: 15 });
        
        // 写真の掲示板
        const noticeBoard = this.createObstacle({
            position: { x: 0, y: 3, z: -19 },
            size: { width: 10, height: 6, depth: 0.1 },
            color: 0xf5f5dc
        });
        
        // 写真や通知
        for (let i = 0; i < 10; i++) {
            const x = -4.5 + Math.random() * 9;
            const y = 1 + Math.random() * 4;
            const notice = this.createObstacle({
                position: { x: x, y: y, z: -18.9 },
                size: { width: 1 + Math.random(), height: 1 + Math.random(), depth: 0.05 },
                color: Math.random() * 0xffffff
            });
        }
        
        // 照明
        for (let i = -10; i <= 10; i += 10) {
            const light = new THREE.PointLight(0xffffff, 0.7, 15);
            light.position.set(i, 8, 0);
            this.scene.add(light);
            this.lights.push(light);
        }
        
        const receptionLight = new THREE.PointLight(0xffffff, 1, 10);
        receptionLight.position.set(0, 8, -10);
        this.scene.add(receptionLight);
        this.lights.push(receptionLight);
    }
    
    /**
     * CEO（社長室）環境を作成
     */
    createCEOOfficeEnvironment() {
        // 壁と天井のセットアップ（より豪華なテクスチャに）
        this.createDefaultEnvironment();
        
        // 社長の巨大デスク
        const ceoDesk = this.createObstacle({
            position: { x: 0, y: 0, z: -8 },
            size: { width: 8, height: 1, depth: 4 },
            color: 0x8B4513,
            textureUrl: 'assets/images/textures/wood.svg'
        });
        
        // 高級な社長椅子
        const ceoChair = this.createObstacle({
            position: { x: 0, y: 0, z: -10 },
            size: { width: 2, height: 2.5, depth: 2 },
            color: 0x000000,
            textureUrl: 'assets/images/textures/fabric.svg'
        });
        
        // デスク上のアイテム
        // 高級ペン立て
        const penHolder = this.createObstacle({
            position: { x: 2, y: 1.1, z: -7 },
            size: { width: 0.5, height: 0.2, depth: 0.5 },
            color: 0xc0c0c0,
            type: 'cylinder'
        });
        
        // ペン
        for (let i = 0; i < 3; i++) {
            const pen = this.createObstacle({
                position: { x: 2 - 0.1 + i * 0.1, y: 1.3, z: -7 },
                size: { width: 0.05, height: 0.4, depth: 0.05 },
                color: 0x000000,
                rotation: { x: Math.random() * 0.2, y: 0, z: Math.random() * 0.2 }
            });
        }
        
        // 書類
        const documents = this.createObstacle({
            position: { x: 0, y: 1.05, z: -7 },
            size: { width: 2, height: 0.1, depth: 1.5 },
            color: 0xffffff
        });
        
        // 高級な応接セット
        // 大型ソファ
        const luxurySofa = this.createObstacle({
            position: { x: 0, y: 0.6, z: 10 },
            size: { width: 8, height: 1.2, depth: 3 },
            color: 0x333333,
            textureUrl: 'assets/images/textures/fabric.svg'
        });
        
        // 応接テーブル
        const luxuryTable = this.createObstacle({
            position: { x: 0, y: 0.5, z: 6 },
            size: { width: 4, height: 1, depth: 2 },
            color: 0x5a3d20,
            textureUrl: 'assets/images/textures/wood.svg'
        });
        
        // テーブル上の豪華な置物
        const ornament = this.createObstacle({
            position: { x: 0, y: 1, z: 6 },
            size: { width: 1, height: 1, depth: 1 },
            color: 0xc0a080,
            type: 'sphere'
        });
        
        // 大きな窓からの景色（長方形のライトで表現）
        const window = this.createObstacle({
            position: { x: 15, y: 5, z: 0 },
            size: { width: 0.1, height: 10, depth: 20 },
            color: 0x87ceeb,
            rotation: { x: 0, y: Math.PI / 2, z: 0 }
        });
        
        // 高級な書棚
        const bookshelfPositions = [
            { x: -15, y: 0, z: -10 },
            { x: -15, y: 0, z: -6 },
            { x: -15, y: 0, z: -2 },
            { x: -15, y: 0, z: 2 },
            { x: -15, y: 0, z: 6 },
            { x: -15, y: 0, z: 10 }
        ];
        
        bookshelfPositions.forEach(pos => {
            this.createFurniture('bookshelf', pos, Math.PI / 2);
        });
        
        // 豪華な装飾品
        // 壁掛け時計
        const clock = this.createObstacle({
            position: { x: 0, y: 6, z: -19 },
            size: { width: 2, height: 2, depth: 0.2 },
            color: 0xc0a080,
            type: 'cylinder'
        });
        
        // 時計の針
        const hourHand = this.createObstacle({
            position: { x: 0, y: 6, z: -18.9 },
            size: { width: 0.1, height: 0.5, depth: 0.05 },
            color: 0x000000,
            rotation: { x: 0, y: 0, z: Math.PI / 3 }
        });
        
        const minuteHand = this.createObstacle({
            position: { x: 0, y: 6, z: -18.9 },
            size: { width: 0.08, height: 0.8, depth: 0.05 },
            color: 0x000000,
            rotation: { x: 0, y: 0, z: Math.PI / 6 }
        });
        
        // 豪華な絨毯
        const carpet = this.createObstacle({
            position: { x: 0, y: 0.01, z: 0 },
            size: { width: 15, height: 0.02, depth: 20 },
            color: 0xaa0000
        });
        
        // 豪華なシャンデリア
        const chandelier = this.createObstacle({
            position: { x: 0, y: 9, z: 0 },
            size: { width: 3, height: 2, depth: 3 },
            color: 0xc0a080,
            type: 'sphere'
        });
        
        // 照明
        const ceoLight = new THREE.PointLight(0xffffcc, 1, 20);
        ceoLight.position.set(0, 8, 0);
        this.scene.add(ceoLight);
        this.lights.push(ceoLight);
        
        const deskLight = new THREE.SpotLight(0xffffcc, 0.8, 15, Math.PI / 6);
        deskLight.position.set(0, 10, -8);
        deskLight.target.position.set(0, 0, -8);
        this.scene.add(deskLight);
        this.scene.add(deskLight.target);
        this.lights.push(deskLight);
        
        // 窓からの光
        const windowLight = new THREE.DirectionalLight(0xaaccff, 0.5);
        windowLight.position.set(20, 10, 0);
        this.scene.add(windowLight);
        this.lights.push(windowLight);
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
     * テクスチャをロードする関数
     */
    loadTexture(path) {
        const textureLoader = new THREE.TextureLoader();
        return textureLoader.load(path);
    }
    
    /**
     * 敵の3Dモデルを作成
     */
    createEnemyModel(enemy) {
        // 敵のタイプに応じたモデルを作成
        let geometry, material;
        const textureLoader = new THREE.TextureLoader();
        
        switch (enemy.type) {
            case 'boss':
                geometry = new THREE.BoxGeometry(1.2, 2.2, 1.2);
                material = new THREE.MeshStandardMaterial({
                    map: this.loadTexture('assets/images/characters/boss.svg'),
                    roughness: 0.7,
                    metalness: 0.3
                });
                break;
            case 'customer':
                geometry = new THREE.BoxGeometry(1, 2, 1);
                material = new THREE.MeshStandardMaterial({
                    map: this.loadTexture('assets/images/characters/customer.svg'),
                    roughness: 0.8,
                    metalness: 0.2
                });
                break;
            case 'sales':
                geometry = new THREE.BoxGeometry(0.9, 1.9, 0.9);
                material = new THREE.MeshStandardMaterial({
                    map: this.loadTexture('assets/images/characters/sales.svg'),
                    roughness: 0.7,
                    metalness: 0.2
                });
                break;
            case 'finalBoss':
                geometry = new THREE.BoxGeometry(1.5, 2.5, 1.5);
                material = new THREE.MeshStandardMaterial({
                    map: this.loadTexture('assets/images/characters/finalboss.svg'),
                    roughness: 0.5,
                    metalness: 0.5,
                    emissive: 0x330000,
                    emissiveIntensity: 0.2
                });
                break;
            default:
                geometry = new THREE.BoxGeometry(1, 2, 1);
                material = new THREE.MeshStandardMaterial({
                    map: this.loadTexture('assets/images/characters/default_enemy.svg'),
                    roughness: 0.8,
                    metalness: 0.2
                });
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
}

// ページロード時にゲームを初期化
window.addEventListener('load', () => {
    window.game = new Game();
});
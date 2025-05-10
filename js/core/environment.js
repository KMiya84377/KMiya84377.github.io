/**
 * ゲーム環境クラス
 * ゲームの環境（オフィス、会議室など）を管理する
 */
class GameEnvironment {
    constructor(game) {
        this.game = game;
    }
    
    /**
     * オフィス環境のセットアップ
     * @param {string} envType - 環境タイプ（"office", "meeting_room"など）
     */
    setupEnvironment(envType) {
        // 既存の環境オブジェクトをクリア（地面は残す）
        this.clearEnvironment();
        
        // 背景テクスチャを更新
        this.game.renderingSystem.updateBackgroundTexture(envType);
        
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
        this.game.renderingSystem.updateFogForEnvironment(envType);
    }
    
    /**
     * 既存の環境オブジェクトをクリア
     */
    clearEnvironment() {
        if (!this.game.scene) return;
        
        for (const obj of this.game.gameObjects.environment) {
            if (obj.name !== "ground" && obj.name !== "background" && obj.name !== "boundaryWall") {
                this.game.scene.remove(obj);
            }
        }
        
        // 地面、背景、境界壁を除く全ての環境オブジェクトを削除
        this.game.gameObjects.environment = this.game.gameObjects.environment.filter(obj => 
            obj.name === "ground" || obj.name === "background" || obj.name === "boundaryWall");
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
            const texture = this.game.renderingSystem.loadTexture(config.textureUrl);
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
        this.game.scene.add(mesh);
        this.game.gameObjects.environment.push(mesh);
        
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
        this.game.scene.add(group);
        this.game.gameObjects.environment.push(group);
        group.name = "furniture";
        
        return group;
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
        this.game.scene.add(backWall);
        this.game.gameObjects.environment.push(backWall);
        
        // 手前の壁
        const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
        frontWall.position.set(0, 5, 25);
        frontWall.castShadow = true;
        frontWall.receiveShadow = true;
        frontWall.name = "wall";
        this.game.scene.add(frontWall);
        this.game.gameObjects.environment.push(frontWall);
        
        // 左の壁
        const leftWallGeometry = new THREE.BoxGeometry(1, 10, 50);
        const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
        leftWall.position.set(-25, 5, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        leftWall.name = "wall";
        this.game.scene.add(leftWall);
        this.game.gameObjects.environment.push(leftWall);
        
        // 右の壁
        const rightWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
        rightWall.position.set(25, 5, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        rightWall.name = "wall";
        this.game.scene.add(rightWall);
        this.game.gameObjects.environment.push(rightWall);
        
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
        this.game.scene.add(ceiling);
        this.game.gameObjects.environment.push(ceiling);
        
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
        this.game.scene.add(table);
        this.game.gameObjects.environment.push(table);
        
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
            this.game.scene.add(chair);
            this.game.gameObjects.environment.push(chair);
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
            this.game.scene.add(desk);
            this.game.gameObjects.environment.push(desk);
            
            // 椅子
            const chairGeometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
            const chair = new THREE.Mesh(chairGeometry, chairMaterial);
            const chairOffsetX = Math.sin(pos.rotY) * 1.2;
            const chairOffsetZ = Math.cos(pos.rotY) * 1.2;
            chair.position.set(pos.x + chairOffsetX, 0.6, pos.z + chairOffsetZ);
            chair.castShadow = true;
            chair.receiveShadow = true;
            chair.name = "obstacle";
            this.game.scene.add(chair);
            this.game.gameObjects.environment.push(chair);
            
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
            this.game.scene.add(monitorStand);
            this.game.gameObjects.environment.push(monitorStand);
            
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
            this.game.scene.add(monitor);
            this.game.gameObjects.environment.push(monitor);
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
            this.game.scene.add(partition);
            this.game.gameObjects.environment.push(partition);
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
            this.game.scene.add(pot);
            this.game.gameObjects.environment.push(pot);
            
            // 植物
            const plantGeometry = new THREE.SphereGeometry(0.7, 8, 8);
            const plant = new THREE.Mesh(plantGeometry, new THREE.MeshStandardMaterial({ color: 0x00aa00 }));
            plant.position.set(x, 1.5, z);
            plant.castShadow = true;
            plant.receiveShadow = true;
            plant.name = "obstacle";
            this.game.scene.add(plant);
            this.game.gameObjects.environment.push(plant);
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
            this.game.scene.add(obstacle);
            this.game.gameObjects.environment.push(obstacle);
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
            this.createObstacle({
                position: { x: pos.x, y: 0, z: pos.z },
                size: { width: 8, height: 1.8, depth: 0.2 },
                rotation: { x: 0, y: pos.rotY, z: 0 },
                color: 0xaaaaaa,
                textureUrl: 'assets/images/textures/fabric.svg'
            });
        });
        
        // 会議テーブルを中央に配置
        this.createObstacle({
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
        this.game.scene.add(officeLight);
        this.game.lights.push(officeLight);
    }
    
    /**
     * 会議室環境を作成
     */
    createMeetingRoomEnvironment() {
        // 壁と天井のセットアップ
        this.createDefaultEnvironment();
        
        // 大きな会議テーブル
        this.createObstacle({
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
        this.createObstacle({
            position: { x: 0, y: 2, z: -10 },
            size: { width: 6, height: 4, depth: 0.1 },
            color: 0xffffff
        });
        
        // プロジェクター
        this.createObstacle({
            position: { x: 0, y: 8, z: 0 },
            size: { width: 0.8, height: 0.3, depth: 1 },
            color: 0x333333
        });
        
        // プレゼンター用の小さな台
        this.createObstacle({
            position: { x: 3, y: 0, z: -8 },
            size: { width: 1, height: 1.2, depth: 0.6 },
            color: 0x8B4513,
            textureUrl: 'assets/images/textures/wood.svg'
        });
        
        // ホワイトボード
        this.createObstacle({
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
        this.game.scene.add(meetingRoomLight1);
        this.game.lights.push(meetingRoomLight1);
        
        const meetingRoomLight2 = new THREE.PointLight(0xffffff, 0.6, 15);
        meetingRoomLight2.position.set(0, 8, -8);
        this.game.scene.add(meetingRoomLight2);
        this.game.lights.push(meetingRoomLight2);
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
                this.createObstacle({
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
        
        // その他の環境は必要に応じて追加
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
        
        // その他の環境設定は必要に応じて実装
    }
    
    /**
     * サーバールーム環境を作成
     */
    createServerRoomEnvironment() {
        // 壁と天井のセットアップ
        this.createDefaultEnvironment();
        
        // その他の環境設定は必要に応じて実装
    }
    
    /**
     * 夜間オフィス環境を作成
     */
    createNightOfficeEnvironment() {
        // 基本的なオフィス環境をセットアップ
        this.createOfficeEnvironment();
        
        // 照明を夜間仕様に変更
        this.game.lights.forEach(light => {
            if (light instanceof THREE.PointLight) {
                this.game.scene.remove(light);
            }
        });
        this.game.lights = this.game.lights.filter(light => !(light instanceof THREE.PointLight));
        
        // 非常灯
        const emergencyLight1 = new THREE.PointLight(0xff3333, 0.5, 10);
        emergencyLight1.position.set(10, 8, 10);
        this.game.scene.add(emergencyLight1);
        this.game.lights.push(emergencyLight1);
        
        const emergencyLight2 = new THREE.PointLight(0xff3333, 0.5, 10);
        emergencyLight2.position.set(-10, 8, -10);
        this.game.scene.add(emergencyLight2);
        this.game.lights.push(emergencyLight2);
        
        // 一部のコンピューター画面からの光
        for (let i = -3; i <= 3; i += 2) {
            if (Math.random() > 0.5) {
                const screenLight = new THREE.PointLight(0x88aaff, 0.7, 5);
                screenLight.position.set(i * 4, 1.5, i * 2);
                this.game.scene.add(screenLight);
                this.game.lights.push(screenLight);
            }
        }
        
        // 夜の窓からの光
        const moonLight = new THREE.DirectionalLight(0x334466, 0.2);
        moonLight.position.set(20, 10, 20);
        this.game.scene.add(moonLight);
        this.game.lights.push(moonLight);
        
        // 全体的に暗く
        this.game.scene.fog = new THREE.Fog(0x0a192f, 10, 40);
        this.game.scene.background = new THREE.Color(0x0a192f);
    }
    
    /**
     * 燃えるオフィス環境を作成
     */
    createBurningOfficeEnvironment() {
        // 基本的なオフィス環境をセットアップ
        this.createOfficeEnvironment();
        
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
            this.game.scene.add(fireLight);
            this.game.lights.push(fireLight);
            
            // 炎のアニメーション効果（点滅する光源）
            setInterval(() => {
                fireLight.intensity = 0.8 + Math.random() * 0.4;
            }, 100);
        });
        
        // 煙のような霧効果
        this.game.scene.fog = new THREE.Fog(0x331100, 5, 20);
        this.game.scene.background = new THREE.Color(0x331100);
        
        // 赤みがかった全体照明
        const ambientRed = new THREE.AmbientLight(0x330000, 0.8);
        this.game.scene.add(ambientRed);
        this.game.lights.push(ambientRed);
    }
    
    /**
     * 人事部オフィス環境を作成
     */
    createHROfficeEnvironment() {
        // 壁と天井のセットアップ
        this.createDefaultEnvironment();
        
        // その他の環境設定は必要に応じて実装
    }
    
    /**
     * CEOオフィス環境を作成
     */
    createCEOOfficeEnvironment() {
        // 壁と天井のセットアップ
        this.createDefaultEnvironment();
        
        // その他の環境設定は必要に応じて実装
    }
}

// 他のファイルからインポートできるようにエクスポート
export default GameEnvironment;
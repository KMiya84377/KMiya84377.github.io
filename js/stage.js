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
        
        // 安全なスポーン領域を定義（障害物を生成しないエリア）
        this.safeSpawnArea = {
            x: 0,
            y: 0.5,
            z: 0,
            radius: 5  // 半径5メートルの安全地帯
        };
    }
    
    /**
     * ステージ開始処理 - 処理順序を変更（重要）
     */
    start() {
        this.isActive = true;
        console.log(`ステージ ${this.id} を開始します`);
        
        // 1. まず環境をリセット
        this.resetEnvironment();
        
        // 2. 安全エリアを準備
        this.setupSafeSpawnArea();

        // 3. 環境を準備（安全エリアを避けて障害物を生成）
        this.setupEnvironment();
        
        // 4. 環境設定後に再度安全エリアをチェック（念のため）
        this.clearSafeSpawnArea();

        // 5. プレイヤーを安全エリアに配置
        this.placePlayerSafely();
        console.log("プレイヤーを安全エリアに配置しました");
        
        // 6. 敵をスポーン（プレイヤー配置の後で）
        setTimeout(() => {
            this.spawnEnemies();
            console.log(`ステージ ${this.id} のセットアップが完了しました`);
        }, 500);
        
        // BGM再生
        if (this.isBossBattle) {
            this.game.playMusic('boss');
        } else {
            this.game.playMusic('game');
        }
        
        // ステージ情報表示
        document.getElementById('stage').textContent = this.id;
    }
    
    /**
     * 環境を完全にリセット（既存の障害物を全て削除）
     */
    resetEnvironment() {
        console.log("環境をリセットします");
        
        // 地面と背景以外の全てのオブジェクトを削除
        for (const obj of this.game.gameObjects.environment) {
            if (obj.name !== "ground" && obj.name !== "background") {
                this.game.scene.remove(obj);
            }
        }
        
        // 環境オブジェクトのリストを地面と背景だけに制限
        this.game.gameObjects.environment = this.game.gameObjects.environment.filter(obj => 
            obj.name === "ground" || obj.name === "background");
        
        console.log("環境リセット完了: 残りオブジェクト数 = " + this.game.gameObjects.environment.length);
    }
    
    /**
     * 安全なスポーンエリアを準備
     * このエリアには障害物や敵が配置されません
     */
    setupSafeSpawnArea() {
        console.log("安全エリアを設定します");
        
        // 安全エリアの目印として地面に特別なテクスチャを設定
        const safeAreaMarker = new THREE.Mesh(
            new THREE.CircleGeometry(this.safeSpawnArea.radius, 32),
            new THREE.MeshStandardMaterial({
                color: 0x88ff88,
                transparent: true,
                opacity: 0.2, // もう少し見えるように
                roughness: 0.8
            })
        );
        
        // 地面の上に少しだけ浮かせて、地面と重ならないようにする
        safeAreaMarker.position.set(
            this.safeSpawnArea.x, 
            0.02, // 地面のわずかに上
            this.safeSpawnArea.z
        );
        
        // X-Z平面に配置（上向き）
        safeAreaMarker.rotation.x = -Math.PI / 2;
        
        safeAreaMarker.receiveShadow = true;
        safeAreaMarker.name = "safeAreaMarker";
        
        // シーンに追加
        this.game.scene.add(safeAreaMarker);
        this.game.gameObjects.environment.push(safeAreaMarker);
        
        console.log(`安全エリアを設定: 中心(${this.safeSpawnArea.x}, ${this.safeSpawnArea.z}), 半径${this.safeSpawnArea.radius}m`);
    }
    
    /**
     * プレイヤーを安全な位置に配置
     */
    placePlayerSafely() {
        if (!this.game.player) {
            console.error("プレイヤーが初期化されていません");
            return;
        }
        
        console.log("プレイヤーの安全な配置を開始します");
        
        // 安全エリアの中心に配置
        const safePosition = { 
            x: this.safeSpawnArea.x, 
            y: 1.0, // 地面からしっかり浮かせる
            z: this.safeSpawnArea.z 
        };
        
        // プレイヤーの位置を安全エリアの中心に設定（両方の位置を同期させる）
        this.game.player.position = {
            x: safePosition.x,
            y: safePosition.y,
            z: safePosition.z
        };
        
        // モデル位置も正確に設定（重要）
        if (this.game.player.model) {
            this.game.player.model.position.set(
                safePosition.x,
                safePosition.y, // モデルの位置も同じに
                safePosition.z
            );
        }
        
        // プレイヤーのカメラ位置も更新
        if (this.game.camera) {
            this.game.camera.position.set(
                safePosition.x,
                safePosition.y + 1.0, // 目線の高さ
                safePosition.z
            );
            
            // 前方を向く
            this.game.camera.lookAt(
                safePosition.x, 
                safePosition.y + 1.0, 
                safePosition.z - 5
            );
        }
        
        // プレイヤーの移動速度をリセット
        this.game.player.velocity = { x: 0, y: 0, z: 0 };
        
        // プレイヤーの向きを初期化（前方を向く）
        this.game.player.rotation = { x: 0, y: 0, z: 0 };
        
        // 地面に確実に設置
        this.game.player.onGround = true;
        
        // 念のためプレイヤーの状態をリセット
        this.game.player.isJumping = false;
        this.game.player.isFalling = false;
        
        console.log(`プレイヤーを安全な位置に配置しました: (${safePosition.x}, ${safePosition.y}, ${safePosition.z})`);
        
        // 配置後の検証（デバッグ用）
        setTimeout(() => {
            const playerPos = this.game.player.position;
            const modelPos = this.game.player.model ? this.game.player.model.position : {x: 'なし', y: 'なし', z: 'なし'};
            const cameraPos = this.game.camera ? this.game.camera.position : {x: 'なし', y: 'なし', z: 'なし'};
            console.log(`配置確認: プレイヤー位置 = (${playerPos.x}, ${playerPos.y}, ${playerPos.z})`);
            console.log(`モデル位置 = (${modelPos.x}, ${modelPos.y}, ${modelPos.z})`);
            console.log(`カメラ位置 = (${cameraPos.x}, ${cameraPos.y}, ${cameraPos.z})`);
        }, 100);
    }
    
    /**
     * 安全なプレイヤーの初期位置を探す
     */
    findSafePlayerPosition() {
        // 候補となる位置（より多くの候補と距離を増やして安全性を高める）
        const candidatePositions = [
            { x: 0, y: 1, z: 0 },      // 原点（少し浮かせる）
            { x: 3, y: 1, z: 3 },      // 右前方（近距離）
            { x: -3, y: 1, z: 3 },     // 左前方（近距離）
            { x: 3, y: 1, z: -3 },     // 右後方（近距離）
            { x: -3, y: 1, z: -3 },    // 左後方（近距離）
            { x: 6, y: 1, z: 6 },      // 右前方（中距離）
            { x: -6, y: 1, z: 6 },     // 左前方（中距離）
            { x: 6, y: 1, z: -6 },     // 右後方（中距離）
            { x: -6, y: 1, z: -6 },    // 左後方（中距離）
            { x: 10, y: 1, z: 0 },     // 右（遠距離）
            { x: -10, y: 1, z: 0 },    // 左（遠距離）
            { x: 0, y: 1, z: 10 },     // 前（遠距離）
            { x: 0, y: 1, z: -10 },    // 後（遠距離）
            { x: 15, y: 1, z: 15 },    // 右前方（遠距離）
            { x: -15, y: 1, z: 15 },   // 左前方（遠距離）
            { x: 15, y: 1, z: -15 },   // 右後方（遠距離）
            { x: -15, y: 1, z: -15 }   // 左後方（遠距離）
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
                    try {
                        obstacle.geometry.computeBoundingBox();
                    } catch (e) {
                        console.warn("バウンディングボックスの計算に失敗:", e);
                        continue; // このオブジェクトはスキップ
                    }
                }
                box = obstacle.geometry.boundingBox.clone();
                
                // ワールド座標系に変換
                try {
                    box.applyMatrix4(obstacle.matrixWorld);
                } catch (e) {
                    console.warn("マトリックス変換に失敗:", e);
                    continue; // このオブジェクトはスキップ
                }
                
                // プレイヤーの位置と障害物との距離を計算
                const obstaclePos = new THREE.Vector3();
                try {
                    obstacle.getWorldPosition(obstaclePos);
                } catch (e) {
                    console.warn("ワールド位置の取得に失敗:", e);
                    continue; // このオブジェクトはスキップ
                }
                
                // プレイヤーの半径（衝突判定用）
                const playerRadius = 1.5; // 余裕を持たせる
                
                // 障害物のサイズを考慮した安全距離
                const boxSize = new THREE.Vector3();
                box.getSize(boxSize);
                const obstacleRadius = Math.max(boxSize.x, boxSize.z) / 2;
                
                // 距離の2乗（平方根計算を避けるため）
                const dx = obstaclePos.x - position.x;
                const dz = obstaclePos.z - position.z;
                const distanceSquared = dx * dx + dz * dz;
                
                // 安全距離の2乗（余裕を持たせる）
                const minDistanceSquared = Math.pow(playerRadius + obstacleRadius + 2.0, 2);
                
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
        
        // どの位置も安全でない場合は、高い位置に配置（重力で落下）
        console.warn("安全な初期位置が見つかりませんでした。空中に配置します。");
        return { x: 0, y: 10, z: 0 };
    }
    
    /**
     * 環境の設定（背景や地形など）
     * 安全エリアを考慮するよう修正
     */
    setupEnvironment() {
        console.log(`環境をセットアップ: ${this.environment}`);
        
        // 環境タイプに基づいて環境を作成
        if (this.environment) {
            // 安全エリアを避けるための制約を追加
            this.setupCustomEnvironment(this.environment);
        } else {
            // 環境が指定されていない場合はデフォルト環境を使用
            this.setupCustomEnvironment("office");
        }
    }
    
    /**
     * カスタム環境のセットアップ（安全エリアを避けて生成）
     */
    setupCustomEnvironment(envType) {
        // 背景テクスチャを更新
        this.game.updateBackgroundTexture(envType);
        
        // 環境タイプに応じて障害物を配置（ただし安全エリアは避ける）
        switch (envType) {
            case "office":
                this.createSafeOfficeEnvironment();
                break;
            case "meeting_room":
                this.createSafeMeetingRoomEnvironment();
                break;
            case "cafeteria":
                this.createSafeCafeteriaEnvironment();
                break;
            default:
                this.createSafeDefaultEnvironment();
        }
        
        // フォグ効果を環境に合わせて調整
        this.game.updateFogForEnvironment(envType);
    }
    
    /**
     * 安全なデフォルト環境を作成（安全エリアを避ける）
     */
    createSafeDefaultEnvironment() {
        // 壁を作成
        this.createRoomWalls();
        
        // 基本的な遮蔽物を追加（安全エリアを避けて）
        this.addSafeObstacles();
    }
    
    /**
     * 部屋の壁を作成
     */
    createRoomWalls() {
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
        
        // 天井
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
    }
    
    /**
     * 安全エリアを避けて障害物を配置
     */
    addSafeObstacles() {
        // オブジェクトの配置パターン
        const objectPatterns = [
            // テーブルと椅子を部屋の中央に配置（安全エリアを避ける）
            { type: 'table', x: -10, z: 0, rotY: 0 },
            { type: 'table', x: 10, z: 0, rotY: 0 },
            { type: 'table', x: 0, z: 10, rotY: 0 },
            { type: 'table', x: 0, z: -10, rotY: 0 },
            
            // 部屋の四隅に家具を配置
            { type: 'desk', x: -15, z: -15, rotY: Math.PI / 4 },
            { type: 'desk', x: 15, z: -15, rotY: -Math.PI / 4 },
            { type: 'desk', x: -15, z: 15, rotY: -Math.PI / 4 },
            { type: 'desk', x: 15, z: 15, rotY: Math.PI / 4 }
        ];
        
        // 各オブジェクトを追加（安全エリアとの距離をチェック）
        for (const pattern of objectPatterns) {
            // オブジェクト中心と安全エリア中心の距離を計算
            const dx = pattern.x - this.safeSpawnArea.x;
            const dz = pattern.z - this.safeSpawnArea.z;
            const distanceSquared = dx * dx + dz * dz;
            
            // 安全エリアの余裕を持ったサイズ
            const safeRadiusSquared = Math.pow(this.safeSpawnArea.radius + 3, 2);
            
            // 安全エリアから十分離れていれば配置
            if (distanceSquared > safeRadiusSquared) {
                this.placeEnvironmentObject(pattern);
            } else {
                console.log(`安全エリアに近いため、オブジェクトを配置しません: type=${pattern.type}, 位置=(${pattern.x}, ${pattern.z})`);
            }
        }
        
        // ランダムなオブジェクトを配置（安全エリアを避ける）
        this.addRandomSafeObstacles(10); // 10個のランダムな障害物
    }
    
    /**
     * 環境オブジェクトを安全に配置する
     */
    placeEnvironmentObject(pattern) {
        switch (pattern.type) {
            case 'table':
                const tableGeometry = new THREE.BoxGeometry(4, 0.5, 2);
                const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
                const table = new THREE.Mesh(tableGeometry, tableMaterial);
                
                table.position.set(pattern.x, 0.75, pattern.z);
                if (pattern.rotY) table.rotation.y = pattern.rotY;
                
                table.castShadow = true;
                table.receiveShadow = true;
                table.name = "obstacle";
                
                this.game.scene.add(table);
                this.game.gameObjects.environment.push(table);
                
                // テーブルの周りに椅子を追加（これも安全エリアチェックが必要）
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2;
                    const radius = 2;
                    const chairX = pattern.x + Math.sin(angle) * radius;
                    const chairZ = pattern.z + Math.cos(angle) * radius;
                    
                    // 椅子の位置が安全エリアから十分離れているか確認
                    const dx = chairX - this.safeSpawnArea.x;
                    const dz = chairZ - this.safeSpawnArea.z;
                    const distanceSquared = dx * dx + dz * dz;
                    
                    if (distanceSquared > Math.pow(this.safeSpawnArea.radius + 1.5, 2)) {
                        const chairGeometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
                        const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
                        const chair = new THREE.Mesh(chairGeometry, chairMaterial);
                        
                        chair.position.set(chairX, 0.6, chairZ);
                        chair.castShadow = true;
                        chair.receiveShadow = true;
                        chair.name = "obstacle";
                        
                        this.game.scene.add(chair);
                        this.game.gameObjects.environment.push(chair);
                    }
                }
                break;
                
            case 'desk':
                // デスク（机＋椅子＋コンピューター）
                this.game.createFurniture('desk', { x: pattern.x, y: 0, z: pattern.z }, pattern.rotY);
                
                // 椅子の位置を計算（机の少し後ろに）
                const chairOffsetX = Math.sin(pattern.rotY) * 1.2;
                const chairOffsetZ = Math.cos(pattern.rotY) * 1.2;
                this.game.createFurniture('chair', { 
                    x: pattern.x + chairOffsetX, 
                    y: 0, 
                    z: pattern.z + chairOffsetZ 
                }, pattern.rotY + Math.PI);
                
                // コンピューターを配置（70%の確率）
                if (Math.random() > 0.3) {
                    this.game.createFurniture('computer', { 
                        x: pattern.x, 
                        y: 0.7, 
                        z: pattern.z 
                    }, pattern.rotY);
                }
                break;
        }
    }
    
    /**
     * ランダムな障害物を安全に追加（安全エリアを避ける）
     */
    addRandomSafeObstacles(count) {
        // 様々な障害物の形状
        const obstacleGeometries = [
            { name: 'box', geom: new THREE.BoxGeometry(1, 2, 1), color: 0x555555 },
            { name: 'tallBox', geom: new THREE.BoxGeometry(1, 3, 1), color: 0x8B4513 },
            { name: 'wideBox', geom: new THREE.BoxGeometry(1.5, 1, 1.5), color: 0x333333 },
            { name: 'cylinder', geom: new THREE.CylinderGeometry(0.5, 0.5, 2, 8), color: 0x222222 },
            { name: 'wideCylinder', geom: new THREE.CylinderGeometry(0.7, 0.7, 1, 8), color: 0x444444 }
        ];
        
        // 一定回数の試行
        let placed = 0;
        let attempts = 0;
        const maxAttempts = 30; // 最大試行回数
        
        while (placed < count && attempts < maxAttempts) {
            attempts++;
            
            // ランダムな位置
            const x = (Math.random() - 0.5) * 40; // -20〜20
            const z = (Math.random() - 0.5) * 40;
            
            // 安全エリアとの距離を確認
            const dx = x - this.safeSpawnArea.x;
            const dz = z - this.safeSpawnArea.z;
            const distanceSquared = dx * dx + dz * dz;
            
            // 安全エリアから十分離れていれば配置
            if (distanceSquared > Math.pow(this.safeSpawnArea.radius + 2, 2)) {
                // ランダムな障害物を選択
                const obstacleType = obstacleGeometries[Math.floor(Math.random() * obstacleGeometries.length)];
                const material = new THREE.MeshStandardMaterial({ color: obstacleType.color });
                const obstacle = new THREE.Mesh(obstacleType.geom, material);
                
                // 位置設定
                const height = obstacleType.geom.parameters.height || 1;
                obstacle.position.set(x, height / 2, z);
                obstacle.castShadow = true;
                obstacle.receiveShadow = true;
                obstacle.name = "obstacle";
                
                this.game.scene.add(obstacle);
                this.game.gameObjects.environment.push(obstacle);
                
                placed++;
            }
        }
        
        console.log(`ランダムな障害物を ${placed}/${count} 個配置しました (${attempts}回の試行)`);
    }
    
    /**
     * 安全なオフィス環境を作成
     */
    createSafeOfficeEnvironment() {
        // 壁と天井
        this.createRoomWalls();
        
        // 安全エリアを避けてオブジェクトを配置 - ここのループを修正
        for (let i = -3; i <= 3; i += 2) {
            for (let j = -3; j <= 3; j += 2) {
                // 中央部分はもともとスペースを空ける
                if (Math.abs(i) < 2 && Math.abs(j) < 2) continue;
                
                // 安全エリアかどうかをチェック
                const x = i * 4;
                const z = j * 4;
                const dx = x - this.safeSpawnArea.x;
                const dz = z - this.safeSpawnArea.z;
                const distanceSquared = dx * dx + dz * dz;
                
                // 安全エリアから十分離れていれば家具を配置
                if (distanceSquared > Math.pow(this.safeSpawnArea.radius + 2, 2)) {
                    // デスクセット
                    this.game.createFurniture('desk', 
                        { x: x, y: 0, z: z }, 
                        Math.PI * 0.5 * Math.floor(Math.random() * 4)
                    );
                    
                    // 椅子
                    this.game.createFurniture('chair',
                        { x: x + 0.8, y: 0, z: z },
                        Math.PI * 0.5 * Math.floor(Math.random() * 4) + Math.PI
                    );
                    
                    // コンピューター
                    if (Math.random() > 0.3) {
                        this.game.createFurniture('computer',
                            { x: x, y: 0.7, z: z },
                            Math.PI * 0.5 * Math.floor(Math.random() * 4)
                        );
                    }
                }
            }
        }
        
        // パーティションを安全に配置
        this.placeSafePartitions();
        
        // 植物を安全に配置
        this.placeSafePlants(4);
        
        // 照明を設定
        const officeLight = new THREE.PointLight(0xffffff, 0.8, 20);
        officeLight.position.set(0, 8, 0);
        this.game.scene.add(officeLight);
        this.game.lights.push(officeLight);
    }
    
    /**
     * パーティションを安全に配置
     */
    placeSafePartitions() {
        // パーティションポジションの候補
        const partitionPositions = [
            { x: -6, z: 0, rotY: 0 },
            { x: 6, z: 0, rotY: 0 },
            { x: 0, z: -6, rotY: Math.PI / 2 },
            { x: 0, z: 6, rotY: Math.PI / 2 }
        ];
        
        for (const pos of partitionPositions) {
            // 安全エリアとの距離チェック
            const dx = pos.x - this.safeSpawnArea.x;
            const dz = pos.z - this.safeSpawnArea.z;
            const distanceSquared = dx * dx + dz * dz;
            
            if (distanceSquared > Math.pow(this.safeSpawnArea.radius + 4, 2)) {
                this.game.createObstacle({
                    position: { x: pos.x, y: 0, z: pos.z },
                    size: { width: 8, height: 1.8, depth: 0.2 },
                    rotation: { x: 0, y: pos.rotY, z: 0 },
                    color: 0xaaaaaa,
                    textureUrl: 'assets/images/textures/fabric.svg'
                });
            }
        }
    }
    
    /**
     * 植物を安全に配置
     */
    placeSafePlants(count) {
        // 植物の候補位置
        const plantPositions = [
            { x: -8, z: 8 },
            { x: 8, z: -8 },
            { x: -12, z: -12 },
            { x: 12, z: 12 },
            { x: -4, z: 15 },
            { x: 4, z: -15 },
            { x: 15, z: 4 },
            { x: -15, z: -4 }
        ];
        
        // シャッフルして使う
        const shuffled = [...plantPositions].sort(() => 0.5 - Math.random());
        
        let placed = 0;
        for (const pos of shuffled) {
            if (placed >= count) break;
            
            // 安全エリアとの距離チェック
            const dx = pos.x - this.safeSpawnArea.x;
            const dz = pos.z - this.safeSpawnArea.z;
            const distanceSquared = dx * dx + dz * dz;
            
            if (distanceSquared > Math.pow(this.safeSpawnArea.radius + 2, 2)) {
                this.game.createFurniture('plant', pos);
                placed++;
            }
        }
    }
    
    /**
     * 安全な会議室環境を作成
     */
    createSafeMeetingRoomEnvironment() {
        // ベースとなる壁と天井
        this.createRoomWalls();
        
        // 大きな会議テーブルは安全エリアを避けて配置
        const tableX = this.safeSpawnArea.x > 0 ? -8 : 8; // 安全エリアの反対側に配置
        
        const conferenceTable = this.game.createObstacle({
            position: { x: tableX, y: 0, z: 0 },
            size: { width: 8, height: 0.8, depth: 3 },
            color: 0x8B4513,
            textureUrl: 'assets/images/textures/wood.svg'
        });
        
        // テーブルの周りに椅子を配置（安全チェック）
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 4;
            const x = tableX + Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius;
            
            // 安全エリアチェック
            const dx = x - this.safeSpawnArea.x;
            const dz = z - this.safeSpawnArea.z;
            const distanceSquared = dx * dx + dz * dz;
            
            if (distanceSquared > Math.pow(this.safeSpawnArea.radius + 1, 2)) {
                this.game.createFurniture('chair', { x, y: 0, z }, angle + Math.PI);
            }
        }
        
        // 照明
        const meetingRoomLight = new THREE.PointLight(0xffffff, 1, 15);
        meetingRoomLight.position.set(tableX, 8, 0);
        this.game.scene.add(meetingRoomLight);
        this.game.lights.push(meetingRoomLight);
    }
    
    /**
     * 安全な食堂環境を作成
     */
    createSafeCafeteriaEnvironment() {
        // ベースとなる壁と天井
        this.createRoomWalls();
        
        // 複数の食卓テーブルを安全エリアを避けて配置
        for (let i = -2; i <= 2; i++) {
            for (let j = -2; j <= 2; j++) {
                // 安全エリアチェック
                const x = i * 6;
                const z = j * 6;
                const dx = x - this.safeSpawnArea.x;
                const dz = z - this.safeSpawnArea.z;
                const distanceSquared = dx * dx + dz * dz;
                
                if (distanceSquared > Math.pow(this.safeSpawnArea.radius + 2, 2)) {
                    // テーブル
                    const table = this.game.createObstacle({
                        position: { x: x, y: 0, z: z },
                        size: { width: 2, height: 0.8, depth: 2 },
                        color: 0x8B4513,
                        textureUrl: 'assets/images/textures/wood.svg'
                    });
                    
                    // テーブルの周りに椅子を配置
                    for (let k = 0; k < 4; k++) {
                        const angle = (k / 4) * Math.PI * 2;
                        const radius = 1.5;
                        const chairX = x + Math.sin(angle) * radius;
                        const chairZ = z + Math.cos(angle) * radius;
                        
                        // 安全エリアチェック
                        const chairDx = chairX - this.safeSpawnArea.x;
                        const chairDz = chairZ - this.safeSpawnArea.z;
                        const chairDistanceSquared = chairDx * chairDx + chairDz * chairDz;
                        
                        if (chairDistanceSquared > Math.pow(this.safeSpawnArea.radius + 1, 2)) {
                            this.game.createFurniture('chair', { x: chairX, y: 0, z: chairZ }, angle + Math.PI);
                        }
                    }
                }
            }
        }
        
        // 照明
        for (let i = -10; i <= 10; i += 10) {
            for (let j = -10; j <= 10; j += 10) {
                const light = new THREE.PointLight(0xffffff, 0.6, 12);
                light.position.set(i, 8, j);
                this.game.scene.add(light);
                this.game.lights.push(light);
            }
        }
    }
    
    /**
     * 安全エリア内の障害物を削除
     */
    clearSafeSpawnArea() {
        // 安全エリア内にある障害物を特定
        const obstaclesInSafeArea = this.game.gameObjects.environment.filter(obj => {
            if (obj.name !== "obstacle" && obj.name !== "furniture" && obj.name !== "wall") {
                return false;
            }
            
            // safeAreaMarkerは削除しない
            if (obj.name === "safeAreaMarker") {
                return false;
            }
            
            // 障害物の位置を取得
            const position = new THREE.Vector3();
            try {
                obj.getWorldPosition(position);
            } catch (e) {
                console.warn("ワールド位置の取得に失敗:", e);
                return false;
            }
            
            // 安全エリアとの距離を計算
            const dx = position.x - this.safeSpawnArea.x;
            const dz = position.z - this.safeSpawnArea.z;
            const distanceSquared = dx * dx + dz * dz;
            
            // 安全エリア内にある場合はtrue
            return distanceSquared < this.safeSpawnArea.radius * this.safeSpawnArea.radius;
        });
        
        // 安全エリア内の障害物を削除
        for (const obstacle of obstaclesInSafeArea) {
            this.game.scene.remove(obstacle);
            console.log("安全エリアから障害物を削除しました");
        }
        
        // 環境オブジェクトリストからも削除
        this.game.gameObjects.environment = this.game.gameObjects.environment.filter(
            obj => !obstaclesInSafeArea.includes(obj)
        );
        
        console.log(`安全エリアから${obstaclesInSafeArea.length}個の障害物を削除しました`);
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
     * スポーン位置の設定（安全エリアから十分に離れた位置に設定）
     */
    setupSpawnPoints() {
        // 半径方向に離れた位置を複数用意
        this.spawnPoints = [];
        
        // 安全エリアの中心からの最小距離
        const minDistance = this.safeSpawnArea.radius + 10; // 安全エリアから最低10m離す
        
        // 放射状に配置（8方向、それぞれ異なる距離）
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = minDistance + Math.random() * 5; // 10-15mの距離
            
            const x = this.safeSpawnArea.x + Math.cos(angle) * distance;
            const z = this.safeSpawnArea.z + Math.sin(angle) * distance;
            
            this.spawnPoints.push({ x, y: 0, z });
        }
        
        // 追加の遠距離スポーン地点
        this.spawnPoints.push({ x: -20, y: 0, z: -20 });
        this.spawnPoints.push({ x: 20, y: 0, z: -20 });
        this.spawnPoints.push({ x: -20, y: 0, z: 20 });
        this.spawnPoints.push({ x: 20, y: 0, z: 20 });
        
        console.log(`スポーンポイントを ${this.spawnPoints.length}箇所 設定しました`);
    }

    /**
     * ランダムなスポーン位置を取得（障害物との衝突チェックを追加）
     */
    getRandomSpawnPoint() {
        // 環境オブジェクトのリスト
        const obstacles = this.game.gameObjects.environment.filter(obj => 
            obj.name === "obstacle" || obj.name === "furniture" || obj.name === "wall");
        
        // 安全なスポーン位置を探す
        for (const spawnPoint of this.shuffleArray([...this.spawnPoints])) {
            let isColliding = false;
            
            // 安全エリア内にスポーンしないようにチェック
            const dx = spawnPoint.x - this.safeSpawnArea.x;
            const dz = spawnPoint.z - this.safeSpawnArea.z;
            const distanceFromSafeAreaSquared = dx * dx + dz * dz;
            
            // 安全エリア内または近すぎる場合はスキップ（半径+3mの範囲）
            const minDistanceFromSafe = this.safeSpawnArea.radius + 3;
            if (distanceFromSafeAreaSquared < minDistanceFromSafe * minDistanceFromSafe) {
                continue;
            }
            
            for (const obstacle of obstacles) {
                if (!obstacle.geometry) continue;
                
                // 障害物のバウンディングボックスを取得
                let box;
                try {
                    if (!obstacle.geometry.boundingBox) {
                        obstacle.geometry.computeBoundingBox();
                    }
                    box = obstacle.geometry.boundingBox.clone();
                    box.applyMatrix4(obstacle.matrixWorld);
                } catch (e) {
                    console.warn("障害物のバウンディングボックス計算に失敗:", e);
                    continue;
                }
                
                // 障害物の位置を取得
                const obstaclePos = new THREE.Vector3();
                try {
                    obstacle.getWorldPosition(obstaclePos);
                } catch (e) {
                    console.warn("障害物のワールド位置の取得に失敗:", e);
                    continue;
                }
                
                // 敵の半径と障害物の半径を設定
                const enemyRadius = 1.0;
                
                // 障害物のサイズを考慮した安全距離
                const boxSize = new THREE.Vector3();
                box.getSize(boxSize);
                const obstacleRadius = Math.max(boxSize.x, boxSize.z) / 2;
                
                // 距離の2乗を計算
                const dx = obstaclePos.x - spawnPoint.x;
                const dz = obstaclePos.z - spawnPoint.z;
                const distanceSquared = dx * dx + dz * dz;
                
                // 安全距離の2乗
                const minDistanceSquared = Math.pow(enemyRadius + obstacleRadius + 1.5, 2);
                
                // 衝突判定
                if (distanceSquared < minDistanceSquared) {
                    isColliding = true;
                    break;
                }
            }
            
            // 衝突していない位置が見つかった場合
            if (!isColliding) {
                // わずかにランダム性を持たせる（±1.0 の範囲でオフセット）
                const safePosition = {
                    x: spawnPoint.x + (Math.random() * 2 - 1) * 1.0,
                    y: 0, // 地面の高さ
                    z: spawnPoint.z + (Math.random() * 2 - 1) * 1.0
                };
                return safePosition;
            }
        }
        
        // どのスポーン位置も使えない場合は、安全エリアの反対側にスポーン
        const angle = Math.random() * Math.PI * 2;
        const distance = 15; // 安全エリアから十分離れた場所
        const fallbackPosition = {
            x: this.safeSpawnArea.x + Math.cos(angle) * distance,
            y: 0,
            z: this.safeSpawnArea.z + Math.sin(angle) * distance
        };
        
        console.warn("通常のスポーン位置が見つからなかったため、代替位置を使用します:", fallbackPosition);
        return fallbackPosition;
    }

    /**
     * 配列をランダムに並べ替える（Fisher-Yates シャッフル）
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
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
        
        // プレイヤーの位置を事前に初期化（重要）
        if (this.game.player) {
            // ゲーム開始前にプレイヤー位置をリセット
            this.game.player.position = { x: 0, y: 1.0, z: 0 };
            this.game.player.velocity = { x: 0, y: 0, z: 0 };
            this.game.player.rotation = { x: 0, y: 0, z: 0 };
            
            // カメラの位置も初期化
            if (this.game.camera) {
                this.game.camera.position.set(0, 2.0, 0);
                this.game.camera.lookAt(0, 2.0, -5);
            }
            
            console.log("ステージ遷移前にプレイヤー位置を初期化しました");
        }
        
        // スペースキーでゲーム画面へ
        const handleKeydown = (event) => {
            if (event.code === 'Space') {
                transitionScreen.classList.remove('active');
                document.getElementById('game-screen').classList.add('active');
                
                // プレイヤーの入力コントロールを有効化
                if (this.game.player) {
                    this.game.player.enableControls();
                }
                
                // ステージを開始
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
            // ステージ開始前にポインターロックを確保（マウス操作ができるように）
            this.requestPointerLock();
            
            // ステージ開始処理を実行
            this.currentStage.start();
            
            // プレイヤーの位置が確実に設定されているか確認するため、
            // 少し遅延させて再度位置設定を行う
            setTimeout(() => {
                if (this.currentStage && this.game.player) {
                    this.currentStage.placePlayerSafely();
                    console.log("プレイヤー位置の再確認を実行しました");
                    
                    // プレイヤーが地面に確実に接地していることを確認
                    this.game.player.onGround = true;
                    this.game.player.isJumping = false;
                    this.game.player.isFalling = false;
                    
                    // イベントを発火して位置が変更されたことを通知
                    const event = new CustomEvent('playerPositionReset');
                    document.dispatchEvent(event);
                }
            }, 200);
            
            // もう一度遅延させて位置を確認（念のため）
            setTimeout(() => {
                if (this.currentStage && this.game.player) {
                    // プレイヤーがステージ内の有効な位置にいるか確認
                    this.validatePlayerPosition();
                }
            }, 500);
        }
    }
    
    /**
     * ポインターロックをリクエスト（マウス操作のため）
     */
    requestPointerLock() {
        const gameCanvas = document.getElementById('game-canvas');
        if (gameCanvas && this.game.player) {
            gameCanvas.requestPointerLock = gameCanvas.requestPointerLock || 
                                           gameCanvas.mozRequestPointerLock || 
                                           gameCanvas.webkitRequestPointerLock;
            
            // 少し遅延させてポインターロックを要求（UI遷移後に行うため）
            setTimeout(() => {
                try {
                    gameCanvas.click(); // 自動クリックでポインターロックを開始
                    console.log("ステージ開始時にポインターロックを要求しました");
                } catch (e) {
                    console.warn("ポインターロックの要求に失敗しました:", e);
                }
            }, 100);
        }
    }
    
    /**
     * プレイヤー位置の検証と修正
     */
    validatePlayerPosition() {
        if (!this.game.player || !this.currentStage) return;
        
        const player = this.game.player;
        const safeArea = this.currentStage.safeSpawnArea;
        
        console.log("プレイヤー位置を検証します:", player.position);
        
        // プレイヤーがステージ外にいる場合は安全エリアに戻す
        const isOutsideStage = Math.abs(player.position.x) > 20 || 
                             Math.abs(player.position.z) > 20 || 
                             player.position.y < 0.5 || 
                             player.position.y > 10;
        
        if (isOutsideStage) {
            console.warn("プレイヤーがステージ外にいるため、安全エリアに戻します");
            player.position = {
                x: safeArea.x,
                y: 1.0,
                z: safeArea.z
            };
            
            // カメラ位置も修正
            if (this.game.camera) {
                this.game.camera.position.set(
                    safeArea.x,
                    1.0 + 1.0, // 目線の高さ
                    safeArea.z
                );
                
                // 前方を向く
                this.game.camera.lookAt(
                    safeArea.x, 
                    1.0 + 1.0, 
                    safeArea.z - 5
                );
            }
            
            // プレイヤーのモデル位置も修正
            if (player.model) {
                player.model.position.set(
                    safeArea.x,
                    1.0,
                    safeArea.z
                );
            }
            
            // 移動速度をリセット
            player.velocity = { x: 0, y: 0, z: 0 };
            player.rotation = { x: 0, y: 0, z: 0 };
            
            // 地面に確実に設置
            player.onGround = true;
            player.isJumping = false;
            player.isFalling = false;
            
            console.log("プレイヤーを安全エリアに強制移動しました:", safeArea);
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
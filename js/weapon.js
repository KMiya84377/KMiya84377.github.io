/**
 * 武器クラス
 */
class Weapon {
    constructor(game, type = 'basic') {
        this.game = game;
        this.type = type;
        
        // 武器の種類に基づいて初期設定
        switch (type) {
            case 'basic':
                this.name = '標準レーザー';
                this.damage = 10;
                this.fireRate = 10; // 発射間隔（フレーム単位）
                this.range = 50;    // 射程距離
                this.cooldown = 0;  // クールダウンカウンター
                this.ammo = 30;     // 弾薬
                this.maxAmmo = 30;  // 最大弾薬
                this.reloadTime = 60; // リロード時間（フレーム単位）
                this.isReloading = false;
                this.projectileSpeed = 1.5; // 弾の速度
                this.projectileColor = 0x00ffff; // 弾の色
                this.projectileSize = 0.3; // 弾のサイズを大きく
                break;
                
            case 'shotgun':
                this.name = 'エナジーショット';
                this.damage = 20;
                this.fireRate = 30;
                this.range = 20;
                this.cooldown = 0;
                this.ammo = 8;
                this.maxAmmo = 8;
                this.reloadTime = 90;
                this.isReloading = false;
                this.projectileSpeed = 1.0;
                this.projectileColor = 0xff8800;
                this.spreadCount = 5; // 散弾数
                this.spreadAngle = 0.2; // 拡散角度
                this.projectileSize = 0.25; // 弾のサイズ
                break;
                
            case 'sniper':
                this.name = '高精度ビーム';
                this.damage = 50;
                this.fireRate = 60;
                this.range = 100;
                this.cooldown = 0;
                this.ammo = 5;
                this.maxAmmo = 5;
                this.reloadTime = 120;
                this.isReloading = false;
                this.projectileSpeed = 3.0;
                this.projectileColor = 0xff0000;
                this.projectileSize = 0.1; // 細いビーム
                break;
                
            default:
                this.name = '標準レーザー';
                this.damage = 10;
                this.fireRate = 10;
                this.range = 50;
                this.cooldown = 0;
                this.ammo = 30;
                this.maxAmmo = 30;
                this.reloadTime = 60;
                this.isReloading = false;
                this.projectileSpeed = 1.5;
                this.projectileColor = 0x00ffff;
                this.projectileSize = 0.3; // 弾のサイズ
        }
        
        console.log(`武器初期化: ${this.name}, 弾色: ${this.projectileColor}, サイズ: ${this.projectileSize}`);
    }
    
    /**
     * 発射処理
     */
    fire(position, direction) {
        // クールダウン中またはリロード中は発射不可
        if (this.cooldown > 0 || this.isReloading) {
            console.log(`発射できません: クールダウン=${this.cooldown}, リロード中=${this.isReloading}`);
            return;
        }
        
        // 弾切れチェック
        if (this.ammo <= 0) {
            console.log('弾切れ: リロード開始');
            this.reload();
            return;
        }
        
        console.log(`発射実行: 武器=${this.name}, 弾数=${this.ammo}/${this.maxAmmo}`);
        console.log(`発射位置: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
        console.log(`発射方向: (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})`);
        
        // 武器の種類に基づいた発射処理
        try {
            switch (this.type) {
                case 'shotgun':
                    this.fireShotgun(position, direction);
                    break;
                    
                case 'sniper':
                    this.fireSniper(position, direction);
                    break;
                    
                default:
                    this.fireBasic(position, direction);
            }
            
            // 弾薬を消費
            this.ammo--;
            
            // クールダウンを設定
            this.cooldown = this.fireRate;
            
            // UI更新
            this.game.updateAmmoUI(this.ammo, this.maxAmmo);
            
            // 効果音
            this.game.playSound(`weapon_${this.type}_fire`);
            
        } catch (error) {
            console.error('武器発射中にエラーが発生しました:', error);
        }
    }
    
    /**
     * 基本武器の発射処理
     */
    fireBasic(position, direction) {
        console.log('基本弾を発射します');
        
        // 弾のジオメトリとマテリアル
        const projectileGeometry = new THREE.SphereGeometry(this.projectileSize, 8, 8);
        const projectileMaterial = new THREE.MeshBasicMaterial({
            color: this.projectileColor,
            opacity: 0.8,
            transparent: true,
            emissive: this.projectileColor,
            emissiveIntensity: 1.0
        });
        
        // 弾のメッシュを作成
        const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
        
        // 弾の光源効果（より目立たせるため）
        const projectileLight = new THREE.PointLight(this.projectileColor, 1, 3);
        projectileMesh.add(projectileLight);
        
        // 弾の位置を設定（プレイヤーの位置から少し前に）
        const offset = new THREE.Vector3(
            direction.x * 1.0,
            direction.y * 1.0,
            direction.z * 1.0
        );
        
        projectileMesh.position.set(
            position.x + offset.x,
            position.y + 1.0, // 目線の高さ
            position.z + offset.z
        );
        
        console.log(`弾メッシュ作成: 位置=(${projectileMesh.position.x.toFixed(2)}, ${projectileMesh.position.y.toFixed(2)}, ${projectileMesh.position.z.toFixed(2)})`);
        
        // シーンに追加
        this.game.scene.add(projectileMesh);
        console.log('弾メッシュをシーンに追加しました');
        
        // 弾のデータを保存
        const projectile = {
            mesh: projectileMesh,
            direction: direction.clone(),
            speed: this.projectileSpeed,
            distance: 0,
            maxDistance: this.range,
            damage: this.damage
        };
        
        // 弾の軌跡を表示（よりはっきりと）
        const tracerGeometry = new THREE.BufferGeometry();
        const tracerMaterial = new THREE.LineBasicMaterial({
            color: this.projectileColor,
            transparent: true,
            opacity: 0.6,
            linewidth: 3  // 注意: WebGLではlinewidthの効果は限られる
        });
        
        const points = [];
        points.push(new THREE.Vector3(projectileMesh.position.x, projectileMesh.position.y, projectileMesh.position.z));
        points.push(new THREE.Vector3(
            projectileMesh.position.x + direction.x * 3, // 軌跡を長くする
            projectileMesh.position.y + direction.y * 3,
            projectileMesh.position.z + direction.z * 3
        ));
        
        tracerGeometry.setFromPoints(points);
        const tracerLine = new THREE.Line(tracerGeometry, tracerMaterial);
        this.game.scene.add(tracerLine);
        console.log('弾の軌跡をシーンに追加しました');
        
        // 発射エフェクト（マズルフラッシュ）
        this.createMuzzleFlash(position, direction);
        
        // 弾の更新処理
        const updateProjectile = () => {
            // 弾の移動
            projectileMesh.position.x += direction.x * projectile.speed;
            projectileMesh.position.y += direction.y * projectile.speed;
            projectileMesh.position.z += direction.z * projectile.speed;
            
            // 軌跡の更新
            points[1].set(
                projectileMesh.position.x + direction.x * 2,
                projectileMesh.position.y + direction.y * 2,
                projectileMesh.position.z + direction.z * 2
            );
            tracerGeometry.setFromPoints(points);
            tracerGeometry.attributes.position.needsUpdate = true;
            
            // 移動距離を加算
            projectile.distance += projectile.speed;
            
            // ヒット判定
            const hitResult = this.game.raycast(
                { 
                    x: projectileMesh.position.x - direction.x * 0.5, 
                    y: projectileMesh.position.y - direction.y * 0.5, 
                    z: projectileMesh.position.z - direction.z * 0.5 
                },
                { x: 0, y: 0, z: 0 }, // 回転は使用しない
                1.0 // 短い距離でチェック
            );
            
            if (hitResult) {
                console.log('弾が敵にヒットしました');
                // 敵にヒット
                hitResult.enemy.takeDamage(projectile.damage);
                
                // ヒットエフェクト
                this.createHitEffect(projectileMesh.position);
                
                // 弾を削除
                this.game.scene.remove(projectileMesh);
                this.game.scene.remove(tracerLine);
                
                return;
            }
            
            // 射程距離に達したら削除
            if (projectile.distance >= projectile.maxDistance) {
                console.log('弾が射程距離に達しました');
                // 最後にエフェクトを表示
                this.createHitEffect(projectileMesh.position);
                
                this.game.scene.remove(projectileMesh);
                this.game.scene.remove(tracerLine);
                return;
            }
            
            // 障害物との衝突判定
            const obstacles = this.game.gameObjects.environment.filter(obj => 
                obj.name === "obstacle" || obj.name === "wall" || obj.name === "furniture");
                
            for (const obstacle of obstacles) {
                // 簡易的な球体の衝突判定
                if (!obstacle.position) continue;
                
                const dx = projectileMesh.position.x - obstacle.position.x;
                const dy = projectileMesh.position.y - obstacle.position.y;
                const dz = projectileMesh.position.z - obstacle.position.z;
                const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                
                // 仮の衝突判定サイズ（障害物ごとのサイズを考慮）
                let collisionSize = 1.0;
                if (obstacle.geometry) {
                    const box = new THREE.Box3().setFromObject(obstacle);
                    const size = box.getSize(new THREE.Vector3());
                    collisionSize = Math.max(size.x, size.y, size.z) * 0.5;
                }
                
                if (distance < (collisionSize + this.projectileSize)) {
                    console.log('弾が障害物にヒットしました');
                    // 障害物にヒット
                    this.createHitEffect(projectileMesh.position);
                    
                    // 弾を削除
                    this.game.scene.remove(projectileMesh);
                    this.game.scene.remove(tracerLine);
                    
                    return;
                }
            }
            
            // 次のフレームで更新
            requestAnimationFrame(updateProjectile);
        };
        
        // 弾の更新を開始
        updateProjectile();
    }
    
    /**
     * 発射口エフェクト（マズルフラッシュ）の作成
     */
    createMuzzleFlash(position, direction) {
        // マズルフラッシュのジオメトリとマテリアル
        const flashGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffaa,
            opacity: 0.8,
            transparent: true
        });
        
        // メッシュを作成
        const flashMesh = new THREE.Mesh(flashGeometry, flashMaterial);
        
        // マズルフラッシュの位置設定（プレイヤーの視点位置＋方向ベクトル）
        const flashPosition = new THREE.Vector3(
            position.x + direction.x * 0.5,
            position.y + 1.0 + direction.y * 0.5,
            position.z + direction.z * 0.5
        );
        
        flashMesh.position.copy(flashPosition);
        
        // 光源を追加
        const flashLight = new THREE.PointLight(0xffffaa, 2, 3);
        flashLight.position.copy(flashPosition);
        
        // シーンに追加
        this.game.scene.add(flashMesh);
        this.game.scene.add(flashLight);
        
        // 短時間で消える
        setTimeout(() => {
            this.game.scene.remove(flashMesh);
            this.game.scene.remove(flashLight);
        }, 100);
    }
    
    /**
     * ショットガンの発射処理
     */
    fireShotgun(position, direction) {
        // 複数の弾を拡散して発射
        for (let i = 0; i < this.spreadCount; i++) {
            // 拡散方向を計算
            const spreadAngle = (i - (this.spreadCount - 1) / 2) * this.spreadAngle;
            
            // 回転行列を作成して方向を変更
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationY(spreadAngle);
            
            const spreadDirection = direction.clone();
            spreadDirection.applyMatrix4(rotationMatrix);
            
            // 弾を発射（基本弾と同様の処理）
            this.fireBasic(position, spreadDirection);
        }
    }
    
    /**
     * スナイパーライフルの発射処理
     */
    fireSniper(position, direction) {
        // レーザービームのジオメトリとマテリアル
        const laserGeometry = new THREE.CylinderGeometry(0.02, 0.02, this.range, 8);
        laserGeometry.rotateX(Math.PI / 2); // Z軸方向に向ける
        
        const laserMaterial = new THREE.MeshBasicMaterial({
            color: this.projectileColor,
            opacity: 0.7,
            transparent: true
        });
        
        // レーザーメッシュ
        const laserMesh = new THREE.Mesh(laserGeometry, laserMaterial);
        
        // 位置と向きを設定
        laserMesh.position.set(
            position.x + direction.x * (this.range / 2),
            position.y + 1.0 + direction.y * (this.range / 2),
            position.z + direction.z * (this.range / 2)
        );
        
        // レーザーの向きを計算
        laserMesh.lookAt(
            position.x + direction.x * this.range,
            position.y + 1.0 + direction.y * this.range,
            position.z + direction.z * this.range
        );
        
        // シーンに追加
        this.game.scene.add(laserMesh);
        
        // レーザーのヒット判定
        const hitResult = this.game.raycast(
            { x: position.x, y: position.y + 1.0, z: position.z },
            { x: 0, y: 0, z: 0 }, // 回転は使用しない
            this.range
        );
        
        if (hitResult) {
            // 敵にヒット
            hitResult.enemy.takeDamage(this.damage);
            
            // ヒットエフェクト
            this.createHitEffect(hitResult.point);
        }
        
        // レーザーを一定時間後に消す
        setTimeout(() => {
            this.game.scene.remove(laserMesh);
        }, 100);
    }
    
    /**
     * リロード処理
     */
    reload() {
        if (this.isReloading || this.ammo === this.maxAmmo) return;
        
        this.isReloading = true;
        
        // リロード効果音
        this.game.playSound(`weapon_${this.type}_reload`);
        
        // UI表示更新
        this.game.updateAmmoUI(0, this.maxAmmo, true);
        
        // リロード時間後に弾薬を補充
        setTimeout(() => {
            this.ammo = this.maxAmmo;
            this.isReloading = false;
            
            // UI更新
            this.game.updateAmmoUI(this.ammo, this.maxAmmo);
        }, this.reloadTime * 16); // フレーム数からミリ秒に変換（約16msをフレーム時間として）
    }
    
    /**
     * ヒットエフェクトの作成
     */
    createHitEffect(position) {
        // パーティクルジオメトリとマテリアル
        const particleCount = 10;
        const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: this.projectileColor,
            opacity: 0.7,
            transparent: true
        });
        
        // パーティクル生成
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // 位置設定
            particle.position.set(position.x, position.y, position.z);
            
            // ランダムな方向と速度
            const direction = new THREE.Vector3(
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                Math.random() * 2 - 1
            ).normalize();
            
            const speed = Math.random() * 0.1 + 0.05;
            
            // シーンに追加
            this.game.scene.add(particle);
            
            // パーティクルのアニメーション
            let lifetime = 20; // フレーム単位の寿命
            
            const animateParticle = () => {
                // 移動
                particle.position.x += direction.x * speed;
                particle.position.y += direction.y * speed;
                particle.position.z += direction.z * speed;
                
                // 縮小
                particle.scale.multiplyScalar(0.9);
                
                // 寿命を減らす
                lifetime--;
                
                if (lifetime > 0) {
                    requestAnimationFrame(animateParticle);
                } else {
                    this.game.scene.remove(particle);
                }
            };
            
            animateParticle();
        }
    }
    
    /**
     * 更新処理
     */
    update() {
        // クールダウンの更新
        if (this.cooldown > 0) {
            this.cooldown--;
        }
    }
}
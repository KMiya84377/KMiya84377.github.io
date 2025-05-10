/**
 * ゲームレンダリングシステムクラス
 * 3Dレンダリングと視覚効果を管理する
 */
class GameRenderingSystem {
    constructor(game) {
        this.game = game;
        this.textureLoader = new THREE.TextureLoader();
        this.textures = new Map(); // テクスチャキャッシュ
        this.postProcessingEnabled = false;
        this.effectComposer = null;
        this.renderPass = null;
        this.outlinePass = null;
        this.bloomPass = null;
        
        // シェーダーエフェクト関連
        this.shaderTime = 0;
        this.customShaders = new Map();
    }
    
    /**
     * レンダリングシステムの初期化
     * @param {THREE.Scene} scene - Three.jsのシーン
     * @param {THREE.Camera} camera - Three.jsのカメラ
     * @param {THREE.WebGLRenderer} renderer - Three.jsのレンダラー
     */
    init(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        
        // ポストプロセッシングの設定
        this.setupPostProcessing();
        
        // 基本的な照明の設定
        this.setupBasicLighting();
        
        console.log('レンダリングシステムを初期化しました');
    }
    
    /**
     * ポストプロセッシングのセットアップ
     */
    setupPostProcessing() {
        if (!this.game.config.postProcessing.enabled) {
            return;
        }
        
        // Effect Composerの準備
        this.effectComposer = new THREE.EffectComposer(this.renderer);
        
        // 基本的なレンダーパスの追加
        this.renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.effectComposer.addPass(this.renderPass);
        
        // アウトラインパス（選択されたオブジェクトにアウトライン効果）
        if (this.game.config.postProcessing.outline) {
            this.outlinePass = new THREE.OutlinePass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                this.scene,
                this.camera
            );
            
            this.outlinePass.edgeStrength = 3.0;
            this.outlinePass.edgeGlow = 0.5;
            this.outlinePass.edgeThickness = 1.0;
            this.outlinePass.visibleEdgeColor.set('#ffffff');
            this.outlinePass.hiddenEdgeColor.set('#190a05');
            
            this.effectComposer.addPass(this.outlinePass);
        }
        
        // ブルームパス（光源の輝き効果）
        if (this.game.config.postProcessing.bloom) {
            this.bloomPass = new THREE.UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                1.5,  // 強度
                0.4,  // 半径
                0.85  // 閾値
            );
            
            this.effectComposer.addPass(this.bloomPass);
        }
        
        // フィルムグレインエフェクト
        if (this.game.config.postProcessing.filmGrain) {
            const filmPass = new THREE.FilmPass(
                0.35,  // ノイズ強度
                0.025,  // スキャンライン強度
                648,   // スキャンライン数
                false  // グレースケールフラグ
            );
            
            filmPass.renderToScreen = true;
            this.effectComposer.addPass(filmPass);
        }
        
        this.postProcessingEnabled = true;
    }
    
    /**
     * 基本的な照明のセットアップ
     */
    setupBasicLighting() {
        // 既存のライトをクリア
        if (this.game.lights) {
            for (const light of this.game.lights) {
                this.scene.remove(light);
            }
        }
        this.game.lights = [];
        
        // アンビエントライト（全体の環境光）
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        this.game.lights.push(ambientLight);
        
        // ディレクショナルライト（太陽光のような方向性のある光）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(20, 30, 20);
        directionalLight.castShadow = true;
        
        // 影のクオリティ設定
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 100;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        directionalLight.shadow.bias = -0.0001;
        
        this.scene.add(directionalLight);
        this.game.lights.push(directionalLight);
    }
    
    /**
     * テクスチャをロードする
     * @param {string} path - テクスチャファイルのパス
     * @returns {THREE.Texture} - ロードされたテクスチャ
     */
    loadTexture(path) {
        // キャッシュにテクスチャがあればそれを返す
        if (this.textures.has(path)) {
            return this.textures.get(path);
        }
        
        // パスが有効でない場合はデフォルトテクスチャを返す
        if (!path || path === '') {
            console.warn('無効なテクスチャパスが指定されました');
            return this.getDefaultTexture();
        }
        
        // 新しいテクスチャをロード
        try {
            const texture = this.textureLoader.load(path, 
                // 成功時のコールバック
                (loadedTexture) => {
                    loadedTexture.wrapS = THREE.RepeatWrapping;
                    loadedTexture.wrapT = THREE.RepeatWrapping;
                    loadedTexture.repeat.set(1, 1);
                    console.log(`テクスチャをロードしました: ${path}`);
                },
                // 進行状況のコールバック
                undefined,
                // エラー時のコールバック
                (error) => {
                    console.error(`テクスチャのロードに失敗しました: ${path}`, error);
                }
            );
            
            // キャッシュに追加
            this.textures.set(path, texture);
            return texture;
        } catch (error) {
            console.error(`テクスチャのロードでエラーが発生しました: ${path}`, error);
            return this.getDefaultTexture();
        }
    }
    
    /**
     * デフォルトのテクスチャを取得
     * @returns {THREE.Texture} - デフォルトテクスチャ
     */
    getDefaultTexture() {
        // デフォルトテクスチャがまだ作成されていない場合は作成
        if (!this.textures.has('default')) {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const context = canvas.getContext('2d');
            
            // チェッカーパターンを描画
            const tileSize = 8;
            for (let y = 0; y < canvas.height; y += tileSize) {
                for (let x = 0; x < canvas.width; x += tileSize) {
                    const isEvenRow = Math.floor(y / tileSize) % 2 === 0;
                    const isEvenCol = Math.floor(x / tileSize) % 2 === 0;
                    
                    if ((isEvenRow && isEvenCol) || (!isEvenRow && !isEvenCol)) {
                        context.fillStyle = '#cccccc';
                    } else {
                        context.fillStyle = '#888888';
                    }
                    
                    context.fillRect(x, y, tileSize, tileSize);
                }
            }
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            
            this.textures.set('default', texture);
        }
        
        return this.textures.get('default');
    }
    
    /**
     * オブジェクトのアウトライン効果を設定
     * @param {Array} objects - アウトラインを表示するオブジェクト配列
     */
    setOutlineObjects(objects) {
        if (!this.outlinePass) return;
        
        this.outlinePass.selectedObjects = objects;
    }
    
    /**
     * 環境に合わせて霧（フォグ）効果を更新
     * @param {string} envType - 環境タイプ
     */
    updateFogForEnvironment(envType) {
        switch (envType) {
            case 'night_office':
                this.scene.fog = new THREE.Fog(0x0a192f, 10, 40);
                this.scene.background = new THREE.Color(0x0a192f);
                break;
            case 'burning_office':
                this.scene.fog = new THREE.Fog(0x331100, 5, 20);
                this.scene.background = new THREE.Color(0x331100);
                break;
            case 'server_room':
                // サーバールームは冷房が効いていて空気が澄んでいる
                this.scene.fog = new THREE.Fog(0xaabbcc, 20, 60);
                this.scene.background = new THREE.Color(0xaabbcc);
                break;
            default:
                // 通常のオフィス環境
                this.scene.fog = new THREE.Fog(0xcccccc, 30, 80);
                this.scene.background = new THREE.Color(0xcccccc);
                break;
        }
    }
    
    /**
     * 環境に合わせて背景テクスチャを更新
     * @param {string} envType - 環境タイプ
     */
    updateBackgroundTexture(envType) {
        let texturePath;
        
        switch (envType) {
            case 'office':
                texturePath = 'assets/images/background/office.jpg';
                break;
            case 'meeting_room':
                texturePath = 'assets/images/background/meeting_room.jpg';
                break;
            case 'cafeteria':
                texturePath = 'assets/images/background/cafeteria.jpg';
                break;
            case 'night_office':
                texturePath = 'assets/images/background/night_office.jpg';
                break;
            case 'burning_office':
                texturePath = 'assets/images/background/burning_office.jpg';
                break;
            case 'server_room':
                texturePath = 'assets/images/background/server_room.jpg';
                break;
            case 'executive_office':
                texturePath = 'assets/images/background/executive_office.jpg';
                break;
            case 'hr_office':
                texturePath = 'assets/images/background/hr_office.jpg';
                break;
            case 'ceo_office':
                texturePath = 'assets/images/background/ceo_office.jpg';
                break;
            default:
                texturePath = 'assets/images/background/default.jpg';
                break;
        }
        
        // テクスチャをロードして背景に適用
        try {
            const texture = this.loadTexture(texturePath);
            this.scene.background = texture;
            
            // フォグ色も背景に合わせる
            if (this.scene.fog) {
                // 明るめの霧色を背景から計算
                const color = new THREE.Color(texture ? 0xcccccc : 0xcccccc);
                this.scene.fog.color = color;
            }
        } catch (error) {
            console.error('背景テクスチャの設定に失敗しました', error);
        }
    }
    
    /**
     * カスタムシェーダーマテリアルを作成
     * @param {string} type - シェーダータイプ
     * @param {Object} options - シェーダーオプション
     * @returns {THREE.ShaderMaterial} - シェーダーマテリアル
     */
    createShaderMaterial(type, options = {}) {
        let material;
        
        switch (type) {
            case 'holographic': {
                // ホログラフィック効果のシェーダー
                const vertexShader = `
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    void main() {
                        vUv = uv;
                        vPosition = position;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `;
                
                const fragmentShader = `
                    uniform float time;
                    uniform vec3 color;
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    
                    void main() {
                        // 揺らぐアニメーション効果
                        float wave = sin(vPosition.y * 10.0 + time * 2.0) * 0.1 + 0.9;
                        
                        // スキャンラインエフェクト
                        float scanline = sin(vUv.y * 100.0 + time * 5.0) * 0.03 + 0.97;
                        
                        // エッジに向けて透明になる効果
                        float edge = pow(sin(vUv.x * 3.14159), 0.5);
                        
                        // 色の組み合わせ
                        vec3 finalColor = color * wave * scanline * edge;
                        
                        // アルファ値の調整（端が透明になる）
                        float alpha = edge * 0.7 + 0.3;
                        
                        gl_FragColor = vec4(finalColor, alpha);
                    }
                `;
                
                material = new THREE.ShaderMaterial({
                    uniforms: {
                        time: { value: 0.0 },
                        color: { value: new THREE.Color(options.color || 0x00aaff) }
                    },
                    vertexShader: vertexShader,
                    fragmentShader: fragmentShader,
                    transparent: true,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending
                });
                break;
            }
            
            case 'energy': {
                // エネルギー効果のシェーダー
                const vertexShader = `
                    varying vec2 vUv;
                    varying vec3 vNormal;
                    
                    void main() {
                        vUv = uv;
                        vNormal = normalize(normalMatrix * normal);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `;
                
                const fragmentShader = `
                    uniform float time;
                    uniform vec3 color;
                    varying vec2 vUv;
                    varying vec3 vNormal;
                    
                    void main() {
                        // 時間ベースのアニメーション
                        float t = time * 2.0;
                        
                        // エネルギーパルス効果
                        float pulse = abs(sin(vUv.y * 20.0 + t));
                        
                        // エッジから中心に向けて強くなる効果
                        float edge = pow(vUv.x * (1.0 - vUv.x) * 4.0, 0.5);
                        
                        // 最終的な色と明るさ
                        vec3 glow = color * pulse * edge * 1.5;
                        
                        gl_FragColor = vec4(glow, pulse * edge);
                    }
                `;
                
                material = new THREE.ShaderMaterial({
                    uniforms: {
                        time: { value: 0.0 },
                        color: { value: new THREE.Color(options.color || 0xff8800) }
                    },
                    vertexShader: vertexShader,
                    fragmentShader: fragmentShader,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                break;
            }
            
            case 'shield': {
                // シールド/バリア効果のシェーダー
                const vertexShader = `
                    varying vec3 vNormal;
                    varying vec3 vPosition;
                    
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        vPosition = position;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `;
                
                const fragmentShader = `
                    uniform float time;
                    uniform vec3 color;
                    varying vec3 vNormal;
                    varying vec3 vPosition;
                    
                    void main() {
                        // カメラの視点に基づく効果（フレネル効果）
                        float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
                        
                        // 波紋エフェクト
                        float wave = sin(vPosition.y * 5.0 + time * 3.0) * 0.15 + 0.85;
                        
                        // 六角形パターン
                        float hex = sin(vPosition.x * 5.0) * sin(vPosition.y * 5.0) * sin(vPosition.z * 5.0) * 0.1 + 0.9;
                        
                        // 最終的な色の計算
                        vec3 finalColor = color * fresnel * wave * hex;
                        
                        // アルファ値の調整
                        float alpha = fresnel * 0.7;
                        
                        gl_FragColor = vec4(finalColor, alpha);
                    }
                `;
                
                material = new THREE.ShaderMaterial({
                    uniforms: {
                        time: { value: 0.0 },
                        color: { value: new THREE.Color(options.color || 0x00ffff) }
                    },
                    vertexShader: vertexShader,
                    fragmentShader: fragmentShader,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });
                break;
            }
            
            default:
                console.warn(`未知のシェーダータイプ: ${type}`);
                // デフォルトのマテリアル
                material = new THREE.MeshBasicMaterial({
                    color: options.color || 0xffffff,
                    transparent: true,
                    opacity: 0.5
                });
        }
        
        // シェーダーマテリアルを追跡
        if (material.type === 'ShaderMaterial') {
            const id = Math.random().toString(36).substr(2, 9);
            material.userData.shaderId = id;
            this.customShaders.set(id, material);
        }
        
        return material;
    }
    
    /**
     * シェーダー時間を更新
     * @param {number} deltaTime - 経過時間
     */
    updateShaders(deltaTime) {
        this.shaderTime += deltaTime;
        
        // 登録されているすべてのシェーダーを更新
        this.customShaders.forEach(material => {
            if (material.uniforms && material.uniforms.time !== undefined) {
                material.uniforms.time.value = this.shaderTime;
            }
        });
    }
    
    /**
     * 爆発エフェクトを作成
     * @param {THREE.Vector3} position - 爆発の位置
     * @param {Object} options - オプション（サイズ、色など）
     */
    createExplosion(position, options = {}) {
        const size = options.size || 1;
        const color = options.color || 0xff5500;
        const duration = options.duration || 1000; // ミリ秒
        const particles = options.particles || 20;
        
        // パーティクルジオメトリ
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        
        // 爆発のコア（光源）
        const light = new THREE.PointLight(color, 2, size * 10);
        light.position.copy(position);
        this.scene.add(light);
        
        // パーティクルグループ
        const group = new THREE.Group();
        
        // パーティクルを作成
        for (let i = 0; i < particles; i++) {
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // ランダムな方向と速度を設定
            const direction = new THREE.Vector3(
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                Math.random() * 2 - 1
            ).normalize();
            
            const speed = Math.random() * size * 5 + size * 5;
            particle.userData.velocity = direction.multiplyScalar(speed);
            
            // 初期位置を爆発の中心に
            particle.position.copy(position);
            
            group.add(particle);
        }
        
        this.scene.add(group);
        
        // アニメーションの開始時間
        const startTime = Date.now();
        
        // アニメーション関数
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                // 爆発が終了したらクリーンアップ
                this.scene.remove(group);
                this.scene.remove(light);
                return;
            }
            
            // パーティクルの更新
            for (const particle of group.children) {
                // 位置を更新
                particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.016)); // 約16ms（60FPS）
                
                // 重力効果
                particle.userData.velocity.y -= 0.1;
                
                // サイズを徐々に小さく
                const scale = 1 - progress * 0.9;
                particle.scale.set(scale, scale, scale);
                
                // 透明度を減らす
                particle.material.opacity = 1 - progress;
            }
            
            // 光源を徐々に弱く
            light.intensity = 2 * (1 - progress);
            
            // 次のフレームをリクエスト
            requestAnimationFrame(animate);
        };
        
        // アニメーション開始
        animate();
    }
    
    /**
     * レーザービームエフェクトを作成
     * @param {THREE.Vector3} start - ビームの開始位置
     * @param {THREE.Vector3} end - ビームの終了位置
     * @param {Object} options - オプション（色、幅など）
     */
    createLaserBeam(start, end, options = {}) {
        const color = options.color || 0xff0000;
        const width = options.width || 0.1;
        const duration = options.duration || 500; // ミリ秒
        
        // ビームの方向
        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();
        
        // ビームのジオメトリ
        const geometry = new THREE.CylinderGeometry(width, width, length, 8);
        geometry.rotateX(Math.PI / 2);
        geometry.translate(0, 0, length / 2);
        
        // シェーダーマテリアル
        const material = this.createShaderMaterial('energy', {
            color: color
        });
        
        // メッシュの作成
        const beam = new THREE.Mesh(geometry, material);
        beam.position.copy(start);
        beam.lookAt(end);
        
        this.scene.add(beam);
        
        // 小さな光源を追加
        const light = new THREE.PointLight(color, 1, width * 20);
        light.position.copy(start);
        this.scene.add(light);
        
        // 衝撃波エフェクト（終点に）
        this.createImpactEffect(end, {
            color: color,
            size: width * 2
        });
        
        // アニメーションの開始時間
        const startTime = Date.now();
        
        // アニメーション関数
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                // エフェクトが終了したらクリーンアップ
                this.scene.remove(beam);
                this.scene.remove(light);
                return;
            }
            
            // ビームの透明度を徐々に下げる
            if (material.opacity !== undefined) {
                material.opacity = 1 - progress;
            } else if (material.uniforms && material.uniforms.opacity) {
                material.uniforms.opacity.value = 1 - progress;
            }
            
            // 光源の強度を徐々に弱める
            light.intensity = 1 - progress;
            
            // 次のフレームをリクエスト
            requestAnimationFrame(animate);
        };
        
        // アニメーション開始
        animate();
    }
    
    /**
     * 衝撃波エフェクトを作成
     * @param {THREE.Vector3} position - 衝撃波の位置
     * @param {Object} options - オプション（サイズ、色など）
     */
    createImpactEffect(position, options = {}) {
        const color = options.color || 0xffffff;
        const size = options.size || 1;
        const duration = options.duration || 500; // ミリ秒
        
        // リングジオメトリ
        const geometry = new THREE.RingGeometry(0, size, 32);
        
        // マテリアル
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });
        
        // メッシュの作成
        const ring = new THREE.Mesh(geometry, material);
        
        // リングを適切に配置・向き調整
        ring.position.copy(position);
        ring.lookAt(this.camera.position);
        
        this.scene.add(ring);
        
        // アニメーションの開始時間
        const startTime = Date.now();
        
        // アニメーション関数
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                // エフェクトが終了したらクリーンアップ
                this.scene.remove(ring);
                return;
            }
            
            // リングのサイズを徐々に大きく
            const currentSize = size * (0.2 + progress * 2);
            ring.geometry.dispose();
            ring.geometry = new THREE.RingGeometry(
                currentSize - 0.1,
                currentSize,
                32
            );
            
            // 透明度を徐々に下げる
            material.opacity = 1 - progress;
            
            // カメラの方向を向き続ける
            ring.lookAt(this.camera.position);
            
            // 次のフレームをリクエスト
            requestAnimationFrame(animate);
        };
        
        // アニメーション開始
        animate();
    }
    
    /**
     * パーティクルエフェクトを作成
     * @param {Object} options - パーティクルシステムのオプション
     * @returns {Object} - パーティクルシステムオブジェクト
     */
    createParticleSystem(options = {}) {
        const count = options.count || 100;
        const size = options.size || 0.1;
        const color = options.color || 0xffffff;
        const position = options.position || new THREE.Vector3(0, 0, 0);
        const spread = options.spread || 10;
        const velocityScale = options.velocityScale || 0.1;
        
        // パーティクル用のジオメトリ
        const geometry = new THREE.BufferGeometry();
        
        // 位置と速度の配列
        const positions = new Float32Array(count * 3);
        const velocities = [];
        
        // ランダムな位置と速度を設定
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            
            // ランダムな位置（中心からのオフセット）
            positions[i3] = position.x + (Math.random() - 0.5) * spread;
            positions[i3 + 1] = position.y + (Math.random() - 0.5) * spread;
            positions[i3 + 2] = position.z + (Math.random() - 0.5) * spread;
            
            // ランダムな速度
            velocities.push(
                (Math.random() - 0.5) * velocityScale,
                (Math.random() - 0.5) * velocityScale,
                (Math.random() - 0.5) * velocityScale
            );
        }
        
        // ジオメトリに位置を設定
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // パーティクルマテリアル
        const material = new THREE.PointsMaterial({
            color: color,
            size: size,
            transparent: true,
            opacity: options.opacity || 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        // テクスチャがある場合
        if (options.texture) {
            material.map = this.loadTexture(options.texture);
        }
        
        // パーティクルシステム作成
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        
        // パーティクルシステムオブジェクト
        const particleSystem = {
            mesh: particles,
            velocities: velocities,
            maxAge: options.maxAge || 2,
            ages: new Array(count).fill(0),
            update: function(delta) {
                const positions = this.mesh.geometry.attributes.position.array;
                
                for (let i = 0; i < count; i++) {
                    const i3 = i * 3;
                    
                    // 年齢を更新
                    this.ages[i] += delta;
                    
                    // 最大年齢を超えたらリセット
                    if (this.ages[i] >= this.maxAge) {
                        positions[i3] = position.x + (Math.random() - 0.5) * spread;
                        positions[i3 + 1] = position.y + (Math.random() - 0.5) * spread;
                        positions[i3 + 2] = position.z + (Math.random() - 0.5) * spread;
                        
                        this.velocities[i3] = (Math.random() - 0.5) * velocityScale;
                        this.velocities[i3 + 1] = (Math.random() - 0.5) * velocityScale;
                        this.velocities[i3 + 2] = (Math.random() - 0.5) * velocityScale;
                        
                        this.ages[i] = 0;
                    } else {
                        // 位置を更新
                        positions[i3] += this.velocities[i3];
                        positions[i3 + 1] += this.velocities[i3 + 1];
                        positions[i3 + 2] += this.velocities[i3 + 2];
                        
                        // オプションの重力効果
                        if (options.gravity) {
                            this.velocities[i3 + 1] -= options.gravity * delta;
                        }
                    }
                }
                
                // 位置バッファを更新
                this.mesh.geometry.attributes.position.needsUpdate = true;
            },
            dispose: function() {
                this.mesh.geometry.dispose();
                this.mesh.material.dispose();
                if (this.mesh.parent) {
                    this.mesh.parent.remove(this.mesh);
                }
            }
        };
        
        return particleSystem;
    }
    
    /**
     * レンダリング関数
     */
    render() {
        if (this.postProcessingEnabled && this.effectComposer) {
            this.effectComposer.render();
        } else if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * ウィンドウリサイズ時の処理
     * @param {number} width - 新しい幅
     * @param {number} height - 新しい高さ
     */
    handleResize(width, height) {
        if (!this.renderer || !this.camera) return;
        
        this.renderer.setSize(width, height);
        
        if (this.camera.isPerspectiveCamera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
        
        if (this.effectComposer) {
            this.effectComposer.setSize(width, height);
        }
    }
    
    /**
     * 毎フレームの更新
     * @param {number} deltaTime - 前回のフレームからの経過時間
     */
    update(deltaTime) {
        // シェーダーの更新
        this.updateShaders(deltaTime);
    }
}

// 他のファイルからインポートできるようにエクスポート
export default GameRenderingSystem;
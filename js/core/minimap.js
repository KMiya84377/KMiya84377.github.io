/**
 * ゲームミニマップクラス
 * ゲーム内のミニマップ機能を管理する
 */
class GameMinimap {
    constructor(game) {
        this.game = game;
        this.canvas = null;
        this.ctx = null;
        this.size = 200; // ミニマップのサイズ
        this.scale = 0.1; // 1ユニットあたりのピクセル数
        this.playerMarker = { radius: 5, color: '#0000ff' };
        this.enemyMarkers = new Map(); // 敵のIDをキーとするマーカー情報
    }
    
    /**
     * ミニマップの初期化
     */
    init() {
        // ミニマップのキャンバス要素を取得
        this.canvas = document.getElementById('minimap');
        
        if (!this.canvas) {
            console.error('ミニマップ用のキャンバス要素が見つかりません');
            return;
        }
        
        // キャンバスのサイズ設定
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        
        // コンテキスト取得
        this.ctx = this.canvas.getContext('2d');
        
        // 最初の描画
        this.update();
        
        console.log('ミニマップを初期化しました');
    }
    
    /**
     * ミニマップの更新（描画）
     */
    update() {
        if (!this.ctx || !this.canvas) return;
        
        // キャンバスをクリア
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 背景を描画
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 環境オブジェクトを描画
        this.drawEnvironment();
        
        // 敵を描画
        this.drawEnemies();
        
        // プレイヤーを描画
        this.drawPlayer();
    }
    
    /**
     * ミニマップを完全にリセット
     */
    reset() {
        // 敵のマーカーをクリア
        this.enemyMarkers.clear();
        
        // キャンバスをクリア
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // 背景を描画
        if (this.ctx) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    /**
     * ワールド座標からミニマップ座標に変換
     * @param {Object} worldPos - ワールド座標
     * @returns {Object} ミニマップ上の座標
     */
    worldToMap(worldPos) {
        // プレイヤーが原点になるように調整
        const playerPos = this.game.player ? this.game.player.position : { x: 0, z: 0 };
        
        // xとzの座標を使用（yは高さなのでミニマップでは使わない）
        const offsetX = worldPos.x - playerPos.x;
        const offsetZ = worldPos.z - playerPos.z;
        
        // ミニマップの中心からのオフセットに変換
        const mapX = this.canvas.width / 2 + offsetX * this.scale * 10;
        const mapY = this.canvas.height / 2 + offsetZ * this.scale * 10;
        
        return { x: mapX, y: mapY };
    }
    
    /**
     * 環境オブジェクト（壁や障害物）を描画
     */
    drawEnvironment() {
        if (!this.game.scene) return;
        
        // 環境オブジェクトを一定の透明度で描画
        this.ctx.fillStyle = 'rgba(128, 128, 128, 0.3)';
        
        // ゲームオブジェクトの環境要素を処理
        for (const obj of this.game.gameObjects.environment) {
            // 地面はスキップ（ミニマップでは表示しない）
            if (obj.name === 'ground' || obj.name === 'background') continue;
            
            if (obj.geometry) {
                const position = { 
                    x: obj.position.x, 
                    z: obj.position.z 
                };
                
                const mapPos = this.worldToMap(position);
                
                // BoxGeometryの場合、サイズを考慮
                if (obj.geometry.type === 'BoxGeometry') {
                    const width = obj.geometry.parameters.width * this.scale * 5;
                    const depth = obj.geometry.parameters.depth * this.scale * 5;
                    this.ctx.fillRect(
                        mapPos.x - width / 2, 
                        mapPos.y - depth / 2, 
                        width, 
                        depth
                    );
                } 
                // CylinderGeometryの場合、円として描画
                else if (obj.geometry.type === 'CylinderGeometry') {
                    const radius = obj.geometry.parameters.radiusTop * this.scale * 5;
                    this.ctx.beginPath();
                    this.ctx.arc(mapPos.x, mapPos.y, radius, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                // その他の形状はシンプルなドットで表現
                else {
                    this.ctx.beginPath();
                    this.ctx.arc(mapPos.x, mapPos.y, 2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
    }
    
    /**
     * プレイヤーをミニマップに描画
     */
    drawPlayer() {
        if (!this.game.player) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // プレイヤーの位置を示す円を描画
        this.ctx.fillStyle = this.playerMarker.color;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, this.playerMarker.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // プレイヤーの向きを示す線を描画
        const rotation = this.game.player.rotation;
        const lineLength = this.playerMarker.radius * 2;
        
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        this.ctx.lineTo(
            centerX + Math.sin(rotation.y) * lineLength,
            centerY + Math.cos(rotation.y) * lineLength
        );
        this.ctx.stroke();
    }
    
    /**
     * 敵をミニマップに描画
     */
    drawEnemies() {
        if (!this.game.enemies) return;
        
        for (const enemy of this.game.enemies) {
            if (enemy.isDead) continue;
            
            // 敵がプレイヤーに検知されていない場合はミニマップに表示しない
            // ここではシンプルにすべての敵を表示
            const mapPos = this.worldToMap(enemy.position);
            
            // マーカー情報を取得
            const marker = this.enemyMarkers.get(enemy.id) || {
                radius: 4,
                color: '#ff0000'
            };
            
            // 敵の種類によって色を変える
            let markerColor = marker.color;
            if (enemy.type === 'boss') {
                markerColor = '#ff00ff'; // ボスは紫
            } else if (enemy.type === 'finalBoss') {
                markerColor = '#ff0000'; // ラスボスは赤
            } else if (enemy.type === 'customer') {
                markerColor = '#ff8800'; // 顧客は橙
            } else if (enemy.type === 'sales') {
                markerColor = '#ffff00'; // 営業は黄色
            }
            
            // 円を描画
            this.ctx.fillStyle = markerColor;
            this.ctx.beginPath();
            this.ctx.arc(mapPos.x, mapPos.y, marker.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    /**
     * 敵のマーカーを追加
     */
    addEnemyMarker(enemy) {
        // 敵のタイプに基づいて適切なマーカー設定を作成
        let marker;
        
        switch (enemy.type) {
            case 'boss':
                marker = {
                    radius: 6,
                    color: '#ff00ff'  // 紫
                };
                break;
            case 'finalBoss':
                marker = {
                    radius: 7,
                    color: '#ff0000'  // 赤
                };
                break;
            case 'customer':
                marker = {
                    radius: 4,
                    color: '#ff8800'  // 橙
                };
                break;
            case 'sales':
                marker = {
                    radius: 5,
                    color: '#ffff00'  // 黄
                };
                break;
            default:
                marker = {
                    radius: 4,
                    color: '#ff3333'  // デフォルト：薄い赤
                };
                break;
        }
        
        // マーカー情報を保存
        this.enemyMarkers.set(enemy.id, marker);
    }
    
    /**
     * 敵のマーカーを削除
     */
    removeEnemyMarker(enemy) {
        this.enemyMarkers.delete(enemy.id);
    }
    
    /**
     * ミニマップの表示サイズを変更
     */
    resize(size) {
        if (!this.canvas) return;
        
        this.size = size;
        this.canvas.width = size;
        this.canvas.height = size;
        
        // リサイズ後に再描画
        this.update();
    }
    
    /**
     * ミニマップの表示/非表示を切り替え
     */
    toggle(visible) {
        if (!this.canvas) return;
        
        this.canvas.style.display = visible ? 'block' : 'none';
    }
    
    /**
     * ミニマップのスケール（ズーム）を変更
     */
    setScale(scale) {
        this.scale = scale;
        this.update();
    }
}

// 他のファイルからインポートできるようにエクスポート
export default GameMinimap;
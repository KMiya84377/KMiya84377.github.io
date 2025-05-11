/**
 * 音楽プレイヤーの操作を管理するクラス
 */
class MusicPlayer {
    constructor() {
        this.currentTrack = null;
        this.trackSource = null;
        this.isPlaying = false;
        this.isLoading = false; // 曲の読み込み状態を管理するフラグを追加
        this.startTime = 0;
        this.pauseTime = 0;
        this.progressInterval = null;
        this.trackDuration = 60; // デフォルトは60秒

        // DOM要素
        this.musicSelection = document.getElementById('musicSelection');
        this.playerContainer = document.getElementById('playerContainer');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.backBtn = document.getElementById('backBtn');
        this.progressBar = document.getElementById('progress');
        this.currentTimeEl = document.getElementById('currentTime');
        this.durationEl = document.getElementById('duration');
        this.currentAlbumCover = document.getElementById('currentAlbumCover');
        this.currentTrackTitle = document.getElementById('currentTrackTitle');
        this.currentTrackTheme = document.getElementById('currentTrackTheme');

        this.init();
    }

    /**
     * 初期化
     */
    init() {
        this.setupEventListeners();
        this.renderDuration(this.trackDuration);
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        // 曲の選択
        const musicCards = document.querySelectorAll('.music-card');
        musicCards.forEach(card => {
            card.addEventListener('click', () => {
                const trackId = card.getAttribute('data-track');
                this.selectTrack(trackId);
            });
        });

        // 再生/一時停止ボタン
        this.playPauseBtn.addEventListener('click', () => {
            if (this.isPlaying) {
                this.pauseTrack();
            } else {
                this.playTrack();
            }
        });

        // 停止ボタン
        this.stopBtn.addEventListener('click', () => {
            this.stopTrack();
        });

        // 選択画面に戻るボタン
        this.backBtn.addEventListener('click', () => {
            this.returnToSelection();
        });
    }

    /**
     * 再生/一時停止ボタンの有効/無効を切り替える
     * @param {boolean} enabled - ボタンを有効にするかどうか
     */
    setPlayButtonEnabled(enabled) {
        this.playPauseBtn.disabled = !enabled;
        if (!enabled) {
            this.playPauseBtn.classList.add('disabled');
        } else {
            this.playPauseBtn.classList.remove('disabled');
        }
    }

    /**
     * トラックを選択する
     * @param {string} trackId - トラックID
     */
    async selectTrack(trackId) {
        // 読み込み中の場合は操作を無視
        if (this.isLoading) {
            console.log('曲の読み込み中です。しばらくお待ちください。');
            return;
        }

        // 読み込み中フラグを設定
        this.isLoading = true;
        
        // 再生ボタンを無効化
        this.setPlayButtonEnabled(false);
        this.playPauseBtn.textContent = '読み込み中...';

        // 現在再生中のトラックがあれば停止
        if (this.trackSource) {
            this.trackSource.stop();
            this.trackSource = null;
        }

        // 新しいトラックの準備
        this.currentTrack = trackId;
        this.isPlaying = false;
        this.startTime = 0;
        this.pauseTime = 0;

        // UI更新
        this.showPlayer();
        this.updateTrackInfo(trackId);
        this.resetProgress();

        try {
            // トラックを自動再生
            await this.playTrack();
        } finally {
            // 読み込み完了後、フラグをリセットして再生ボタンを有効化
            this.isLoading = false;
            this.setPlayButtonEnabled(true);
            this.updatePlayPauseButton();
        }
    }

    /**
     * トラック情報を更新する
     * @param {string} trackId - トラックID
     */
    updateTrackInfo(trackId) {
        const trackInfo = audioGenerator.getTrackInfo(trackId);
        if (!trackInfo) return;

        this.currentAlbumCover.src = trackInfo.image;
        this.currentAlbumCover.alt = trackInfo.title;
        this.currentTrackTitle.textContent = trackInfo.title;
        this.currentTrackTheme.textContent = trackInfo.theme;
    }

    /**
     * プレイヤー画面を表示する
     */
    showPlayer() {
        this.musicSelection.style.display = 'none';
        this.playerContainer.style.display = 'block';
    }

    /**
     * 選択画面に戻る
     */
    returnToSelection() {
        // 再生停止
        this.stopTrack();

        // UI切り替え
        this.playerContainer.style.display = 'none';
        this.musicSelection.style.display = 'block';
    }

    /**
     * トラックを再生する
     */
    async playTrack() {
        if (!this.currentTrack) return;

        // 読み込み中の場合は重複実行を防止
        if (this.isLoading && !this.isPlaying) {
            console.log('曲の読み込み中です。重複実行を防止します。');
            return;
        }

        try {
            console.log('再生処理を開始します');
            
            // 既存の再生中のトラックがあれば、まず停止する
            if (this.isPlaying) {
                console.log('既存のトラックを停止します');
                this.stopTrack();
            }
            
            // 読み込み中の状態に設定
            this.isLoading = true;
            this.setPlayButtonEnabled(false);
            if (!this.isPlaying) {
                this.playPauseBtn.textContent = '読み込み中...';
            }
            
            // Web Audio API の初期化
            audioGenerator.initAudioContext();
            console.log('AudioContextを初期化しました');

            // トラックの生成
            console.log(`${this.currentTrack} のトラックを生成します`);
            this.trackSource = await audioGenerator.generateTrack(this.currentTrack);

            // 再生状態の更新
            this.isPlaying = true;
            
            // 一時停止からの再開か新規再生かをチェック
            if (this.pauseTime > 0) {
                // 一時停止位置から再開
                const elapsedTime = this.pauseTime;
                this.startTime = audioGenerator.context.currentTime - elapsedTime;
                console.log(`一時停止位置 ${this.formatTime(elapsedTime)} から再開します`);
            } else {
                // 最初から再生
                this.startTime = audioGenerator.context.currentTime;
                console.log('最初から再生を開始します');
            }

            // トラックの再生
            this.trackSource.start(0);
            console.log('トラック再生を開始しました');

            // 進捗表示の更新を開始
            this.startProgressUpdate();

            // トラックの終了時処理
            this.trackSource.onended = () => {
                // ユーザーによる停止でなければ、自動的に停止処理
                if (this.isPlaying) {
                    this.stopTrack();
                }
            };
        } catch (error) {
            console.error('トラック再生中にエラーが発生しました:', error);
            this.isPlaying = false;
        } finally {
            // 読み込み状態を解除
            this.isLoading = false;
            this.setPlayButtonEnabled(true);
            this.updatePlayPauseButton();
        }
    }

    /**
     * トラックを一時停止する
     */
    pauseTrack() {
        if (!this.isPlaying || !this.trackSource) return;

        // 経過時間を記録
        this.pauseTime = audioGenerator.context.currentTime - this.startTime;

        // 再生停止
        this.trackSource.stop();
        this.trackSource = null;

        // 再生状態の更新
        this.isPlaying = false;
        this.updatePlayPauseButton();

        // 進捗表示の更新を停止
        this.stopProgressUpdate();
    }

    /**
     * トラックを停止する
     */
    stopTrack() {
        console.log('停止ボタンが押されました');
        
        // トラックソースがある場合は停止処理
        if (this.trackSource) {
            try {
                this.trackSource.stop(0);
                this.trackSource.disconnect();
                console.log('トラックを停止しました');
            } catch (error) {
                console.error('トラック停止中にエラーが発生しました:', error);
            }
            this.trackSource = null;
        }

        // AudioContextが存在する場合、すべての接続をクリーンアップ
        if (audioGenerator.context) {
            try {
                // 強制的に新しいAudioContextを作成するためにnullに設定
                audioGenerator.context = null;
                console.log('AudioContextをリセットしました');
            } catch (error) {
                console.error('AudioContextリセット中にエラー:', error);
            }
        }

        // 状態のリセット
        this.isPlaying = false;
        this.pauseTime = 0;
        this.updatePlayPauseButton();
        console.log('プレイヤーの状態をリセットしました');

        // 進捗表示のリセット
        this.stopProgressUpdate();
        this.resetProgress();
        console.log('停止処理が完了しました');
    }

    /**
     * 再生/一時停止ボタンの表示を更新する
     */
    updatePlayPauseButton() {
        if (this.isLoading) {
            this.playPauseBtn.textContent = '読み込み中...';
        } else {
            this.playPauseBtn.textContent = this.isPlaying ? '一時停止' : '再生';
        }
    }

    /**
     * 進捗バーのリセット
     */
    resetProgress() {
        this.progressBar.style.width = '0%';
        this.renderCurrentTime(0);
    }

    /**
     * 現在の再生時間を表示する
     * @param {number} time - 再生時間（秒）
     */
    renderCurrentTime(time) {
        this.currentTimeEl.textContent = this.formatTime(time);
    }

    /**
     * トラックの長さを表示する
     * @param {number} duration - トラックの長さ（秒）
     */
    renderDuration(duration) {
        this.trackDuration = duration;
        this.durationEl.textContent = this.formatTime(duration);
    }

    /**
     * 時間を「分:秒」形式にフォーマットする
     * @param {number} seconds - 秒数
     * @returns {string} フォーマットされた時間
     */
    formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${min}:${sec}`;
    }

    /**
     * 進捗表示の更新を開始する
     */
    startProgressUpdate() {
        this.stopProgressUpdate(); // 既存のタイマーがあれば停止

        this.progressInterval = setInterval(() => {
            if (!this.isPlaying) return;

            // 経過時間の計算
            const elapsed = audioGenerator.context.currentTime - this.startTime;
            
            // 進捗率の計算と表示
            const progress = Math.min(100, (elapsed / this.trackDuration) * 100);
            this.progressBar.style.width = `${progress}%`;
            
            // 経過時間の表示
            this.renderCurrentTime(elapsed);

            // 曲の終わりに達した場合
            if (elapsed >= this.trackDuration) {
                this.stopTrack();
            }
        }, 100); // 100msごとに更新
    }

    /**
     * 進捗表示の更新を停止する
     */
    stopProgressUpdate() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }
}

// アプリケーション開始時にプレイヤーをインスタンス化
document.addEventListener('DOMContentLoaded', () => {
    const player = new MusicPlayer();
});
/**
 * ストーリーマネージャークラス
 * ゲームのストーリー展開やダイアログを管理
 */
class StoryManager {
    constructor(game) {
        this.game = game;
        this.dialogBox = document.getElementById('dialog-box');
        this.dialogText = document.getElementById('dialog-text');
        this.dialogPortrait = document.getElementById('dialog-portrait');
        this.dialogNext = document.getElementById('dialog-next');
        
        this.currentDialog = null;
        this.dialogQueue = [];
        this.isDialogActive = false;
        
        this.characters = {
            player: {
                name: "主人公",
                portrait: "player.jpg"
            },
            boss: {
                name: "上司",
                portrait: "boss.jpg"
            },
            sales: {
                name: "営業",
                portrait: "sales.jpg"
            },
            customer: {
                name: "顧客",
                portrait: "customer.jpg"
            },
            director: {
                name: "部長",
                portrait: "director.jpg"
            },
            ceo: {
                name: "社長",
                portrait: "ceo.jpg"
            }
        };
        
        // ステージごとのストーリーイベント
        this.storyEvents = {
            // ステージ開始時のイベント
            stageStart: {
                1: [
                    { character: "player", text: "ここはどこだ…？あ、そうか、昨日も終電まで残業して会社で寝てしまったんだ。" },
                    { character: "player", text: "ん？なんだか体がムズムズする…昨日エナジードリンクを飲みすぎたせいだろうか。" },
                    { character: "player", text: "（頭に手をやると、電気が走るような感覚がする）うわっ！これは…超能力！？" },
                    { character: "boss", text: "おい！まだ寝てるのか？昨日終わらなかった資料はどうなった！" }
                ],
                2: [
                    { character: "player", text: "はぁ…昨日は大変だった。今日は早く帰りたいな。" },
                    { character: "sales", text: "おはよう！実はさ、大口クライアントからクレームが来てるんだ。ちょっと対応頼むよ！" },
                    { character: "player", text: "え、それって営業の仕事じゃ…（ため息）わかったよ。" }
                ],
                3: [
                    { character: "player", text: "やっとお昼休みだ。少し休憩して午後に備えよう。" },
                    { character: "boss", text: "休んでる場合か！午後からのプレゼンの資料、まだ終わってないぞ！" },
                    { character: "player", text: "（イライラ）…そのプレゼン、昨日終わったはずですが？" }
                ],
                4: [
                    { character: "boss", text: "緊急会議だ！全員集合！" },
                    { character: "player", text: "（うんざり）また無駄な会議か…" },
                    { character: "player", text: "ん？みんな何か様子がおかしい…まさか、全員超能力に目覚めているのか？" }
                ],
                5: [
                    { character: "director", text: "君、最近少し生意気になっていないか？会社の規則を守れない者に未来はないぞ。" },
                    { character: "player", text: "部長…私は正当な評価が欲しいだけです。" },
                    { character: "director", text: "（目が光る）従わない者には制裁を与えるまでだ！" }
                ],
                6: [
                    { character: "player", text: "社内システムがダウンした？" },
                    { character: "boss", text: "昨日提出してもらったプログラムが原因だって！今すぐ直せ！" },
                    { character: "player", text: "えっ、それ私のせいじゃ…（諦めて）わかりました、見てみます。" }
                ],
                7: [
                    { character: "player", text: "もう8時か…今日も帰れそうにないな。" },
                    { character: "sales", text: "おつかれー！俺たちは飲みに行くから。おまえは残業よろしく！" },
                    { character: "player", text: "（怒り）いつも私だけが…" }
                ],
                8: [
                    { character: "boss", text: "大変だ！プロジェクトが炎上している！誰がミスしたんだ？" },
                    { character: "sales", text: "それは…（主人公を指さす）" },
                    { character: "player", text: "（心の中で）いつも私が責任を取らされる…もう我慢できない！" }
                ],
                9: [
                    { character: "player", text: "人事部から呼び出し？何かあったのかな？" },
                    { character: "boss", text: "君の最近の行動について話し合いたいことがあるんだ。" },
                    { character: "player", text: "（汗）まさか…私の超能力がバレたのか？" }
                ],
                10: [
                    { character: "ceo", text: "よく来たな。ここまで生き残るとは思わなかったよ。" },
                    { character: "ceo", text: "我が社の「ブラック企業精神」、それは弱者を切り捨てて強者だけが生き残る究極の資本主義だ！" },
                    { character: "player", text: "社長…あなたがこのブラック企業の元凶だったんですね。今日で終わりにします！" }
                ]
            },
            
            // ステージクリア時のイベント
            stageClear: {
                1: [
                    { character: "player", text: "はぁはぁ…なんてことだ。私の力で上司を倒してしまった。" },
                    { character: "player", text: "でも、これで少しは楽になるかも…そうだ、この力でブラック企業を変えられるかもしれない！" }
                ],
                2: [
                    { character: "player", text: "クレーム対応も解決！顧客も営業も超能力者だったなんて…" },
                    { character: "player", text: "もしかして、このエナジードリンクを飲んだ人すべてが超能力者になっているのか？" }
                ],
                3: [
                    { character: "player", text: "やれやれ、昼食を守り切ったぞ。これで少しは体力回復できる。" },
                    { character: "player", text: "しかし、なぜみんな私を狙ってくるんだ？単に私が嫌われているのか、それとも…" }
                ],
                4: [
                    { character: "player", text: "会議室を制圧したぞ！もう無駄な会議はないだろう。" },
                    { character: "player", text: "でも、これで終わりじゃない。この会社の本当の問題は、もっと上層部にある気がする…" }
                ],
                5: [
                    { character: "player", text: "部長も倒した…ここまでくるとは自分でも思わなかった。" },
                    { character: "player", text: "しかし、部長が倒れても、この会社の体質は変わらない。もっと上を目指す必要がある！" }
                ],
                6: [
                    { character: "player", text: "システムを守り切ったぞ！これで一時的に平和になるはずだ。" },
                    { character: "player", text: "しかし、このまま会社に残っていても、同じことの繰り返しだ。根本から変えなきゃ…" }
                ],
                7: [
                    { character: "player", text: "残業地獄からの脱出に成功！これでようやく家に帰れる。" },
                    { character: "player", text: "だが、明日もまた同じことの繰り返しか…いや、このままじゃいけない！" }
                ],
                8: [
                    { character: "player", text: "プロジェクトの炎上は鎮火した。でも、こんなの私一人の責任じゃないはずだ。" },
                    { character: "player", text: "この会社のシステムが、みんなを追い込んでいるんだ。そして、その元凶は…" }
                ],
                9: [
                    { character: "player", text: "人事部の罠から逃れた！もう後戻りはできない。" },
                    { character: "player", text: "次は社長室だ。全ての元凶と対決する時が来た！" }
                ],
                10: [
                    { character: "player", text: "ついに…ついに勝ったんだ！社長を倒し、ブラック企業に終止符を打った！" },
                    { character: "player", text: "これからは、働く人が正当に評価される、本当の意味での良い会社にしていくぞ！" },
                    { character: "player", text: "そして、私のような犠牲者が二度と出ないように…" }
                ]
            }
        };
        
        // ストーリーシーンのセットアップ
        this.setupEventListeners();
    }
    
    /**
     * イベントリスナーのセットアップ
     */
    setupEventListeners() {
        this.dialogNext.addEventListener('click', () => {
            this.showNextDialog();
        });
        
        // Enterキーやスペースでも次のダイアログへ
        document.addEventListener('keydown', (event) => {
            if (this.isDialogActive && (event.key === 'Enter' || event.key === ' ')) {
                this.showNextDialog();
            }
        });
    }
    
    /**
     * ステージ開始時のイベントを再生
     */
    playStageStartEvent(stageId) {
        const events = this.storyEvents.stageStart[stageId];
        
        if (events && events.length > 0) {
            // ゲームを一時停止
            this.game.pauseGame();
            
            // ダイアログキューにイベントを追加
            this.dialogQueue = [...events];
            
            // 最初のダイアログを表示
            this.showNextDialog();
        }
    }
    
    /**
     * ステージクリア時のイベントを再生
     */
    playStageClearEvent(stageId) {
        const events = this.storyEvents.stageClear[stageId];
        
        if (events && events.length > 0) {
            // ゲームを一時停止
            this.game.pauseGame();
            
            // ダイアログキューにイベントを追加
            this.dialogQueue = [...events];
            
            // 最初のダイアログを表示
            this.showNextDialog();
        }
    }
    
    /**
     * 次のダイアログを表示
     */
    showNextDialog() {
        // キューが空なら終了
        if (this.dialogQueue.length === 0) {
            this.hideDialog();
            // ゲームを再開
            this.game.resumeGame();
            return;
        }
        
        // 次のダイアログを取得して表示
        this.currentDialog = this.dialogQueue.shift();
        this.showDialog(this.currentDialog);
    }
    
    /**
     * ダイアログを表示
     */
    showDialog(dialogData) {
        const character = this.characters[dialogData.character];
        
        // キャラクター情報がない場合はデフォルト表示
        if (!character) {
            this.dialogPortrait.style.backgroundImage = 'none';
            this.dialogText.textContent = dialogData.text;
        } else {
            // キャラクター情報を使って表示
            try {
                this.dialogPortrait.style.backgroundImage = `url('../assets/images/characters/${character.portrait}')`;
            } catch(e) {
                console.error('Portrait image not found:', e);
                this.dialogPortrait.style.backgroundImage = 'none';
            }
            
            this.dialogText.innerHTML = `<strong>${character.name}:</strong> ${dialogData.text}`;
        }
        
        // ダイアログボックスを表示
        this.dialogBox.style.display = 'flex';
        this.isDialogActive = true;
        
        // テキストアニメーション効果（オプション）
        // this.animateText(dialogData.text);
    }
    
    /**
     * ダイアログを非表示
     */
    hideDialog() {
        this.dialogBox.style.display = 'none';
        this.isDialogActive = false;
    }
    
    /**
     * テキストアニメーション効果（文字を1つずつ表示）
     */
    animateText(text) {
        const speed = 30; // ミリ秒ごとに1文字表示
        let index = 0;
        
        this.dialogText.textContent = "";
        
        const interval = setInterval(() => {
            if (index < text.length) {
                this.dialogText.textContent += text.charAt(index);
                index++;
            } else {
                clearInterval(interval);
            }
        }, speed);
    }
    
    /**
     * エンディングメッセージの表示
     */
    showEndingMessage() {
        const endingMessage = `
            あなたは社長を倒し、ブラック企業の体質を変えることに成功しました。
            
            超能力を手に入れたことで、不当な扱いに耐える必要がなくなり、
            正当な評価と働きやすい環境を作ることができました。
            
            あなたの活躍は会社だけでなく、業界全体を変えるきっかけになりました。
            
            今やこの会社は、「ホワイト企業」として知られるようになり、
            社員は皆、生き生きと働いています。
            
            そして、あなたは新社長として、働きやすい環境づくりに尽力しています。
            
            終わり
        `;
        
        document.getElementById('ending-message').textContent = endingMessage;
    }
}
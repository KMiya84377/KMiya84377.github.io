/**
 * ゲーム設定
 * ゲーム全体の設定パラメータを管理します
 */
const GameConfig = {
    /**
     * プレイヤー関連の設定
     */
    player: {
        // 基本ステータス
        health: 100,
        moveSpeed: 0.15,
        jumpForce: 0.2,
        gravity: 0.01,
        
        // 武器関連
        damage: 25,
        maxAmmo: 30,
        shootDelay: 100,  // ミリ秒
        reloadTime: 2000, // ミリ秒
        weaponRange: 50,  // 射程距離
        
        // 特殊能力関連
        specialAbilityDuration: 5000,  // 効果時間（ミリ秒）
        specialAbilityCooldown: 15000  // クールダウン時間（ミリ秒）
    },
    
    /**
     * 敵関連の設定
     */
    enemies: {
        // 上司（通常敵）
        boss: {
            health: 75,
            moveSpeed: 0.05,
            attackRange: 2,
            attackDamage: 10,
            attackSpeed: 1000, // 攻撃間隔（ミリ秒）
            scoreValue: 100,
            detectionRange: 20
        },
        
        // 顧客（遠距離攻撃型）
        customer: {
            health: 50,
            moveSpeed: 0.03,
            attackRange: 15,
            attackDamage: 15,
            attackSpeed: 1500,
            scoreValue: 150,
            detectionRange: 25
        },
        
        // 営業（素早い近接攻撃型）
        sales: {
            health: 40,
            moveSpeed: 0.08,
            attackRange: 1.5,
            attackDamage: 8,
            attackSpeed: 700,
            scoreValue: 80,
            detectionRange: 18
        },
        
        // 最終ボス（社長）
        finalBoss: {
            health: 500,
            moveSpeed: 0.04,
            attackRange: 3,
            attackDamage: 20,
            attackSpeed: 1200,
            scoreValue: 1000,
            detectionRange: 30,
            specialAttackCooldown: 8000, // 特殊攻撃のクールダウン（ミリ秒）
            specialAttackDamage: 40      // 特殊攻撃のダメージ
        }
    },
    
    /**
     * アイテム関連の設定
     */
    items: {
        // 回復アイテム
        healthPack: {
            healAmount: 30,
            respawnTime: 30000 // 再出現時間（ミリ秒）
        },
        
        // 弾薬補給
        ammoPack: {
            ammoAmount: 60,
            respawnTime: 20000
        }
    },
    
    /**
     * ステージ情報
     */
    stages: [
        {
            id: 1,
            name: "会社デスク",
            description: "あなたの机のまわりから脱出せよ",
            objective: "上司を倒せ",
            enemies: {
                boss: 2,
                customer: 0,
                sales: 1,
                finalBoss: null
            },
            environment: "office",
            isBossBattle: false
        },
        {
            id: 2,
            name: "クレーム対応",
            description: "クレーム対応を求めてくる営業と顧客から身を守れ",
            objective: "全ての敵を倒せ",
            enemies: {
                boss: 0,
                customer: 3,
                sales: 4,
                finalBoss: null
            },
            environment: "meeting_room",
            isBossBattle: false
        },
        {
            id: 3,
            name: "ランチタイム争奪戦",
            description: "あなたの昼食時間を守り通せ",
            objective: "休憩時間を確保せよ",
            enemies: {
                boss: 2,
                customer: 1,
                sales: 2,
                finalBoss: null
            },
            environment: "cafeteria",
            isBossBattle: false
        },
        {
            id: 4,
            name: "無意味な会議",
            description: "永遠と続く会議からの脱出",
            objective: "会議室を制圧せよ",
            enemies: {
                boss: 3,
                customer: 2,
                sales: 3,
                finalBoss: null
            },
            environment: "conference_room",
            isBossBattle: false
        },
        {
            id: 5,
            name: "部長面談",
            description: "怒り狂う部長との対決",
            objective: "部長を倒せ",
            enemies: {
                boss: 2,
                customer: 1,
                sales: 2,
                finalBoss: {
                    type: "midBoss",
                    count: 1
                }
            },
            environment: "executive_office",
            isBossBattle: true
        },
        {
            id: 6,
            name: "システム障害",
            description: "あなたのせいにされたシステム障害",
            objective: "システムを守り切れ",
            enemies: {
                boss: 3,
                customer: 3,
                sales: 3,
                finalBoss: null
            },
            environment: "server_room",
            isBossBattle: false
        },
        {
            id: 7,
            name: "残業地獄",
            description: "終わらない仕事、帰れない夜",
            objective: "定時で帰宅せよ",
            enemies: {
                boss: 4,
                customer: 0,
                sales: 4,
                finalBoss: null
            },
            environment: "night_office",
            isBossBattle: false
        },
        {
            id: 8,
            name: "プロジェクト炎上",
            description: "全てが燃え盛る中、生き残れ",
            objective: "炎上を鎮火せよ",
            enemies: {
                boss: 3,
                customer: 5,
                sales: 3,
                finalBoss: null
            },
            environment: "burning_office",
            isBossBattle: false
        },
        {
            id: 9,
            name: "人事部の罠",
            description: "あなたの行動が監視されている",
            objective: "人事部から逃げ切れ",
            enemies: {
                boss: 5,
                customer: 5,
                sales: 5,
                finalBoss: null
            },
            environment: "hr_office",
            isBossBattle: false
        },
        {
            id: 10,
            name: "最終決戦",
            description: "ブラック企業の元凶、社長との対決",
            objective: "社長を倒し、ブラック企業を変えろ",
            enemies: {
                boss: 2,
                customer: 2,
                sales: 2,
                finalBoss: {
                    type: "finalBoss",
                    count: 1
                }
            },
            environment: "ceo_office",
            isBossBattle: true
        }
    ],
    
    /**
     * サウンド関連設定
     */
    sounds: {
        // BGM
        music: {
            game: "game-bgm.mp3",
            boss: "boss-battle.mp3",
            menu: "menu.mp3",
            victory: "victory.mp3",
            gameOver: "game-over.mp3"
        },
        
        // 効果音
        sfx: {
            shoot: "shoot.mp3",
            reload: "reload.mp3",
            hit: "hit.mp3",
            enemyDeath: "enemy-death.mp3",
            playerDamage: "player-damage.mp3",
            jump: "jump.mp3",
            specialAbility: "special-ability.mp3",
            itemPickup: "item-pickup.mp3"
        }
    }
};

// 設定のエクスポート（他のファイルから使用可能に）
// ESモジュールを使用しない場合はグローバル変数として扱われる
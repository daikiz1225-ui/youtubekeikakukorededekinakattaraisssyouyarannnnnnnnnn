/**
 * game.js
 * ゲームメニューの描画と、各ゲームモジュールへの橋渡し
 */
const GameModule = {
    // ゲームメニューを表示する
    renderGameMenu() {
        const container = document.getElementById('view-container');
        if (!container) return;

        container.innerHTML = `
            <div class="game-menu-container">
                <h2 class="game-title">🎮 PREMIUM GAMES</h2>
                <div class="game-grid">
                    <div class="game-card" onclick="Tetris.init()">
                        <div class="game-icon">🧩</div>
                        <h3>テトリス</h3>
                    </div>
                    <div class="game-card" onclick="Snake.init()">
                        <div class="game-icon">🐍</div>
                        <h3>ヘビゲーム</h3>
                    </div>
                    <div class="game-card" onclick="Reversi.init()">
                        <div class="game-icon">⚪⚫</div>
                        <h3>リバーシ</h3>
                    </div>
                    <div class="game-card" onclick="Shogi.init()">
                        <div class="game-icon">☖</div>
                        <h3>将棋</h3>
                    </div>
                    <div class="game-card" onclick="BlockBlast.init()">
                        <div class="game-icon">💥</div>
                        <h3>ブロックブラスト</h3>
                    </div>
                    <div class="game-card" onclick="Game2048.init()">
                        <div class="game-icon">🔢</div>
                        <h3>2048</h3>
                    </div>
                    <div class="game-card" onclick="CannonGame.init()">
                <div class="game-icon">💣</div><h3>大砲バトル</h3>
            </div>
　　　　　　　　　　　　　<div class="game-card" onclick="TowerDefense.init()">
            <div class="game-icon">🏰</div><h3>タワーディフェンス</h3>
        </div>
        <div class="game-card" onclick="AirHockey.init()">
            <div class="game-icon">🏒</div><h3>エアホッケー</h3>
        </div>
        <div class="game-card" onclick="Pachinko.init()">
    <div class="game-icon">💰</div><h3>パチンコ</h3>
</div>
<div class="game-card" onclick="ProxyModule.init()">
    <div class="game-icon">🌐</div>
    <h3>プロキシ</h3>
</div>
// ...
                </div>
            </div>

            <style>
                .game-menu-container { padding: 20px; text-align: center; color: white; }
                .game-title { margin-bottom: 30px; font-size: 1.8rem; letter-spacing: 2px; }
                .game-grid { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); 
                    gap: 20px; 
                    max-width: 1000px; 
                    margin: 0 auto; 
                }
                .game-card { 
                    background: #282828; 
                    border-radius: 15px; 
                    padding: 20px; 
                    cursor: pointer; 
                    transition: all 0.2s ease;
                    border: 2px solid transparent;
                }
                .game-card:hover { 
                    background: #383838; 
                    transform: translateY(-5px); 
                    border-color: #4CAF50; 
                }
                .game-icon { font-size: 3rem; margin-bottom: 10px; }
                .game-card h3 { font-size: 1rem; margin: 0; color: #eee; }
                
                /* iPad向けの調整 */
                @media (max-width: 1024px) {
                    .game-grid { grid-template-columns: repeat(3, 1fr); }
                }
            </style>
        `;
    },

    // ゲーム画面の共通レイアウトを作る関数（各ゲームファイルから使う）
    setupGameCanvas(title, gameId) {
        const container = document.getElementById('view-container');
        container.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <div style="display: flex; justify-content: space-between; align-items: center; max-width: 500px; margin: 0 auto 20px;">
                    <button onclick="GameModule.renderGameMenu()" style="background:#444; color:white; border:none; padding:10px 15px; border-radius:8px; cursor:pointer;">← 戻る</button>
                    <h2 style="margin:0;">${title}</h2>
                    <div style="width:50px;"></div> </div>
                <div id="${gameId}-container" style="display:inline-block; position:relative;">
                    </div>
            </div>
        `;
    }
};

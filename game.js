/**
 * game.js
 * ゲーム機能専用のロジック
 */
const GameModule = {
    renderGameMenu() {
        const container = document.getElementById('view-container');
        container.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h2>🎮 ミニゲームコーナー</h2>
                <p>YouTubeの合間にちょっと休憩。</p>
                <div class="game-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; margin-top: 30px;">
                    <div class="v-card" onclick="GameModule.startTetris()" style="padding: 20px; background: #333; border-radius: 12px; cursor: pointer;">
                        <h3>テトリス (開発中)</h3>
                    </div>
                    <div class="v-card" onclick="GameModule.startSnake()" style="padding: 20px; background: #333; border-radius: 12px; cursor: pointer;">
                        <h3>スネークゲーム (開発中)</h3>
                    </div>
                </div>
            </div>
        `;
    },

    startTetris() {
        alert("テトリスを準備中...");
        // ここにテトリスのロジックを実装していく
    },

    startSnake() {
        alert("スネークゲームを準備中...");
    }
};

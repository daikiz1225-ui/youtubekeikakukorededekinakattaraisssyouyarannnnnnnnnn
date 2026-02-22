const Snake = {
    init() {
        GameModule.setupGameCanvas("ヘビゲーム", "snake");
        document.getElementById('snake-container').innerHTML = `
            <div style="background:#222; padding:50px; border-radius:15px; border:2px dashed #555;">
                <p>🐍 ヘビゲーム開発中...</p>
                <button onclick="Snake.start()" style="margin-top:20px; padding:10px 20px; background:#4CAF50; color:white; border:none; border-radius:5px;">ゲーム開始（モック）</button>
            </div>
        `;
    },
    start() {
        alert("ロジックを実装してください！");
    }
};

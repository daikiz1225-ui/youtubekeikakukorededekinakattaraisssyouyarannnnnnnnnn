/* music.js - The "I give up" Edition 🏳️ */

const MusicMode = {
    init() {
        const container = document.getElementById('view-container');
        container.innerHTML = `
            <div style="height: 80vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #ff3eab; font-family: sans-serif;">
                <div style="font-size: 80px; margin-bottom: 20px;">🏳️</div>
                <h2 style="font-size: 24px;">Music Mode</h2>
                <p style="color: #666; margin-top: 10px; font-size: 18px;">
                    未実装またやるかもｼﾗﾝｹﾄﾞ
                </p>
                <button onclick="location.reload()" style="margin-top: 30px; background: #333; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    普通にYouTube使うわ
                </button>
            </div>
        `;

        // 検索ボタンを押した時も同じメッセージを出すようにジャック
        document.getElementById('search-btn').onclick = () => {
            alert("未実装またやるかもｼﾗﾝｹﾄﾞ");
        };
        
        // エンターキーも同様
        document.getElementById('search-input').onkeydown = (e) => {
            if (e.key === 'Enter') alert("未実装またやるかもｼﾗﾝｹﾄﾞ");
        };

        console.log("Music Mode: Developer has left the chat. 🏳️");
    }
};

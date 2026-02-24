/**
 * proxy.js (粉砕データ復元・大画面版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('隠密パズルブラウザ', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;

        // 🌟 iPadの画面いっぱいに広げるスタイル
        container.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:999999; background:#000;";

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; height:100%; width:100%;">
                <div style="padding:15px; background:#1a1a1a; display:flex; gap:10px; flex-shrink:0; border-bottom:1px solid #333;">
                    <button id="p-back" style="background:none; border:none; color:#ff453a; font-size:20px; cursor:pointer; padding:0 10px;">✕</button>
                    <input type="text" id="p-url" placeholder="URLをペースト" style="flex:1; height:44px; border-radius:12px; border:none; background:#333; color:#fff; padding:0 15px;">
                    <button id="p-btn" style="height:44px; padding:0 20px; background:#007AFF; color:#fff; border-radius:12px; border:none; font-weight:bold;">抽出</button>
                </div>
                <div id="p-screen" style="flex:1; background:#fff; overflow-y:auto; -webkit-overflow-scrolling:touch;">
                    <div id="p-msg" style="padding:100px 20px; text-align:center; color:#999;">暗号化通信待機中...</div>
                </div>
            </div>
        `;
        this.bind();
    },

    bind() {
        const input = document.getElementById('p-url');
        const btn = document.getElementById('p-btn');
        const screen = document.getElementById('p-screen');
        const back = document.getElementById('p-back');

        const decryptAndShow = async () => {
            let url = input.value.trim();
            if(!url) return;
            if(!url.startsWith('http')) url = 'https://' + url;

            screen.innerHTML = '<div style="padding:100px 20px; text-align:center;">🧩 データを復元中...</div>';

            // URLを難読化して送信
            const secretUrl = btoa(unescape(encodeURIComponent(url))).split('').reverse().join('');
            
            try {
                const res = await fetch(`/api/proxy?q=${secretUrl}`);
                const trash = await res.text();

                // --- 復元プロセス ---
                // 1. 反転を戻す
                let stage1 = trash.split('').reverse().join('');
                
                // 2. ノイズ「Z-TITI-Z」を消去
                let stage2 = stage1.split('Z-TITI-Z').join('');

                // 3. 独自記号をHTMLタグに戻す
                let finalHtml = stage2
                    .replace(/\[\[D1\]\]/g, '<div')
                    .replace(/\[\[D2\]\]/g, '</div>')
                    .replace(/\[\[S1\]\]/g, '<span')
                    .replace(/\[\[S2\]\]/g, '</span>')
                    .replace(/\[\[A1\]\]/g, '<a')
                    .replace(/\[\[A2\]\]/g, '</a>')
                    .replace(/\[\[IMG_SRC\]\]/g, 'src="');

                // 4. スタイル調整して流し込み
                screen.innerHTML = `
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        img { max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; }
                        a { color: #007AFF; text-decoration: none; pointer-events: none; } /* リンク無効化 */
                    </style>
                    <div class="restored-content">${finalHtml}</div>
                `;
            } catch (e) {
                screen.innerHTML = '<div style="padding:100px 20px; color:red; text-align:center;">通信が遮断されました</div>';
            }
        };

        btn.onclick = decryptAndShow;
        input.onkeydown = (e) => { if(e.key === 'Enter') decryptAndShow(); };
        back.onclick = () => location.reload();
    }
};

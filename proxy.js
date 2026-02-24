/**
 * proxy.js (文字列受取・大画面表示版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            // 自作サイトの初期設定を呼び出し
            GameModule.setupGameCanvas('攻略サイト・リーダー', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;

        // 🌟 画面を小さくさせないためのスタイル調整
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.padding = "0";

        container.innerHTML = `
            <div id="proxy-app" style="display:flex; flex-direction:column; width:100%; height:100%; background:#000;">
                <div style="padding:15px; background:#1a1a1a; display:flex; gap:10px; flex-shrink:0;">
                    <input type="text" id="p-url" placeholder="URLを貼り付けてGo" 
                        style="flex:1; height:44px; border-radius:22px; border:none; background:#333; color:#fff; padding:0 20px; font-size:16px; outline:none;">
                    <button id="p-btn" style="width:80px; height:44px; background:#007AFF; color:#fff; border-radius:22px; border:none; font-weight:bold;">Go</button>
                </div>
                
                <div id="p-view-area" style="flex:1; width:100%; background:#fff; overflow:hidden; position:relative; border-radius:15px 15px 0 0;">
                    <div id="p-status" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:#999; text-align:center;">
                        URLを入力すると、広告なしで記事が表示されます。
                    </div>
                    <iframe id="p-content-frame" style="width:100%; height:100%; border:none; display:none;"></iframe>
                </div>
            </div>
        `;
        this.bind();
    },

    bind() {
        const input = document.getElementById('p-url');
        const btn = document.getElementById('p-btn');
        const frame = document.getElementById('p-content-frame');
        const status = document.getElementById('p-status');

        const executeAction = async () => {
            let url = input.value.trim();
            if (!url) return;
            if (!url.startsWith('http')) url = 'https://' + url;

            status.innerHTML = '🔄 データを抽出中...';
            status.style.display = 'block';
            frame.style.display = 'none';

            // 🌟 URLをぐっちゃぐちゃに変換（反転Base64）
            const secret = btoa(unescape(encodeURIComponent(url))).split('').reverse().join('');
            
            try {
                // サーバーからHTML文字列を取得
                const res = await fetch(`/api/proxy?q=${secret}`);
                if (!res.ok) throw new Error();
                const htmlString = await res.text();
                
                // 🌟 iframeのsrcdocに文字列を直接流し込む（鍵マークが出ない魔法）
                frame.srcdoc = htmlString;
                
                frame.onload = () => {
                    frame.style.display = 'block';
                    status.style.display = 'none';
                };
            } catch (e) {
                status.innerHTML = '❌ 取得失敗。URLが正しいか確認してください。';
            }
            input.blur();
        };

        btn.onclick = executeAction;
        input.onkeydown = (e) => { if (e.key === 'Enter') executeAction(); };
    }
};

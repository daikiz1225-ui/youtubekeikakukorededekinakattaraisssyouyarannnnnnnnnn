/**
 * proxy.js (超軽量・独自暗号復元版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('隠密リーダー', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;
        // iPad全画面表示
        container.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9999999; background:#fff;";

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; height:100%; width:100%; color:#000;">
                <div style="padding:15px; background:#1a1a1a; display:flex; gap:10px; flex-shrink:0;">
                    <button id="p-exit" style="background:none; border:none; color:#ff453a; font-size:24px;">✕</button>
                    <input type="text" id="p-url" placeholder="URLを入力" style="flex:1; height:44px; border-radius:10px; border:none; background:#333; color:#fff; padding:0 15px;">
                    <button id="p-go" style="height:44px; padding:0 20px; background:#007AFF; color:#fff; border-radius:10px; border:none; font-weight:bold;">Go</button>
                </div>
                <div id="p-result" style="flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:20px;">
                    <div id="p-msg" style="text-align:center; margin-top:50px; color:#999;">待機中...</div>
                </div>
            </div>
        `;
        this.bind();
    },

    bind() {
        const input = document.getElementById('p-url');
        const btn = document.getElementById('p-go');
        const result = document.getElementById('p-result');
        const msg = document.getElementById('p-msg');

        const run = async () => {
            let url = input.value.trim();
            if(!url) return;
            if(!url.startsWith('http')) url = 'https://' + url;

            msg.innerText = "🔒 暗号化通信中...";
            const secret = btoa(unescape(encodeURIComponent(url))).split('').reverse().join('');

            try {
                const res = await fetch(`/api/proxy?q=${secret}`);
                if(!res.ok) throw new Error();
                const packed = await res.text();

                // 🌟 【復元】ノイズを消して、独自記号をタグに戻す
                let stage1 = packed.split('TITI').join(''); // ノイズ除去
                let finalHtml = stage1.replace(/«/g, '<').replace(/»/g, '>'); // タグ復元

                result.innerHTML = `
                    <style>
                        body { font-family: sans-serif; }
                        img { max-width: 100%; height: auto; border-radius: 8px; }
                        a { color: #007AFF; pointer-events: none; }
                    </style>
                    ${finalHtml}
                `;
            } catch (e) {
                msg.innerText = "❌ 読み込み失敗。自鯖のログを確認してください。";
            }
        };

        btn.onclick = run;
        input.onkeydown = (e) => { if(e.key === 'Enter') run(); };
        document.getElementById('p-exit').onclick = () => location.reload();
    }
};

/**
 * proxy.js (究極パズル復元版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('パズル解読中', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;
        // 自作サイトの枠を完全に無視して全画面化
        container.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:2147483647; background:#000; display:flex; flex-direction:column;";

        container.innerHTML = `
            <div style="padding:env(safe-area-inset-top) 15px 10px; background:#1a1a1a; display:flex; gap:10px; flex-shrink:0;">
                <button id="p-exit" style="background:none; border:none; color:#ff453a; font-size:24px; padding:5px 10px;">✕</button>
                <input type="text" id="p-url" placeholder="攻略サイトのURL" style="flex:1; height:40px; border-radius:20px; border:none; background:#333; color:#fff; padding:0 15px; font-size:16px; outline:none;">
                <button id="p-go" style="padding:0 20px; background:#007AFF; color:#fff; border-radius:20px; border:none; font-weight:bold;">Go</button>
            </div>
            <div id="p-view" style="flex:1; background:#fff; overflow-y:auto; -webkit-overflow-scrolling:touch; position:relative;">
                <div id="p-msg" style="margin-top:100px; text-align:center; color:#999; font-size:18px;">
                    URLを入力してGoを押してください
                </div>
            </div>
        `;
        this.bind();
    },

    bind() {
        const input = document.getElementById('p-url');
        const btn = document.getElementById('p-go');
        const view = document.getElementById('p-view');
        const msg = document.getElementById('p-msg');

        const decode = async () => {
            let url = input.value.trim();
            if(!url) return;
            if(!url.startsWith('http')) url = 'https://' + url;

            msg.innerText = "🧩 パズルを解読中...";
            const secret = btoa(unescape(encodeURIComponent(url))).split('').reverse().join('');

            try {
                const res = await fetch(`/api/proxy?q=${secret}`);
                const puzzle = await res.text();

                // 🌟 高速復元（1文字飛ばしで文字を拾う）
                let restored = "";
                for (let i = 0; i < puzzle.length; i += 2) {
                    restored += puzzle[i];
                }

                // 特殊記号をHTMLに戻す
                let html = restored.replace(/«/g, '<').replace(/»/g, '>');

                view.innerHTML = `
                    <style>
                        body { padding: 20px; font-family: sans-serif; line-height: 1.6; }
                        img { max-width: 100%; border-radius: 10px; margin: 10px 0; }
                        .adsbygoogle, ins, .ad { display: none !important; }
                    </style>
                    ${html}
                `;
                view.scrollTop = 0;
            } catch (e) {
                msg.innerText = "❌ 解析に失敗しました。";
            }
        };

        btn.onclick = decode;
        input.onkeydown = (e) => { if(e.key === 'Enter') decode(); };
        document.getElementById('p-exit').onclick = () => location.reload();
    }
};

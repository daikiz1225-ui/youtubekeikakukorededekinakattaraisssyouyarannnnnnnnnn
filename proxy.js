/**
 * proxy.js (パス修正対応版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('攻略プロキシ・極', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;
        
        container.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:999999; background:#000;";

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; height:100%;">
                <div style="padding:10px; background:#1a1a1a; display:flex; gap:10px;">
                    <button id="p-exit" style="background:none; border:none; color:#ff453a; font-size:24px;">✕</button>
                    <input type="text" id="p-url" placeholder="URLを入力" style="flex:1; height:40px; border-radius:10px; border:none; background:#333; color:#fff; padding:0 15px;">
                    <button id="p-go" style="padding:0 20px; background:#0a84ff; color:#fff; border-radius:10px; border:none; font-weight:bold;">Go</button>
                </div>
                <iframe id="p-frame" style="flex:1; width:100%; border:none; background:#fff;"></iframe>
            </div>
        `;
        this.bind();
    },

    bind() {
        const input = document.getElementById('p-url');
        const btn = document.getElementById('p-go');
        const frame = document.getElementById('p-frame');

        const execute = async () => {
            let url = input.value.trim();
            if(!url) return;
            if(!url.startsWith('http')) url = 'https://' + url;

            const secret = btoa(unescape(encodeURIComponent(url))).split('').reverse().join('');
            
            try {
                const res = await fetch(`/api/proxy?q=${secret}`);
                const data = await res.text();

                // 解読
                let restored = data.replace(/TITIUNKO/g, '').replace(/«/g, '<').replace(/»/g, '>');

                // 🌟 iframeに流し込む（srcdocは自分自身のコンテンツとして扱うのでCORSに強い）
                frame.srcdoc = restored;

            } catch (e) {
                alert("取得失敗");
            }
        };

        btn.onclick = execute;
        input.onkeydown = (e) => { if(e.key === 'Enter') e.preventDefault(); };
        document.getElementById('p-exit').onclick = () => location.reload();
    }
};

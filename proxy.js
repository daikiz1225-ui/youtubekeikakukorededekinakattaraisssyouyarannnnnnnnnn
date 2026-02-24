/**
 * proxy.js (元サイト完全再現・iframe版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('完全再現リーダー', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;
        
        container.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:999999; background:#000; overflow:hidden;";

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; height:100%; width:100%;">
                <div style="padding:10px; background:#1a1a1a; display:flex; gap:10px; flex-shrink:0;">
                    <button id="p-exit" style="background:none; border:none; color:#ff453a; font-size:24px;">✕</button>
                    <input type="text" id="p-url" placeholder="元サイトと同じ見た目で表示します" style="flex:1; height:40px; border-radius:10px; border:none; background:#333; color:#fff; padding:0 15px; font-size:16px;">
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
                const rawData = await res.text();
                const [_, packed] = rawData.split(":::SPLIT:::");
                
                // 解読
                let restored = packed.replace(/TITIUNKO/g, '').replace(/«/g, '<').replace(/»/g, '>');

                // 🌟 iframeの中に完全なHTMLを流し込む
                const doc = frame.contentWindow.document;
                doc.open();
                doc.write(restored);
                doc.close();

                // 💡 iPad向けの追加調整
                const style = doc.createElement('style');
                style.innerHTML = `
                    body { overflow-x: hidden !important; width: 100vw !important; }
                    img { max-width: 100% !important; height: auto !important; }
                `;
                doc.head.appendChild(style);

            } catch (e) {
                console.error("再現失敗");
            }
        };

        btn.onclick = execute;
        input.onkeydown = (e) => { if(e.key === 'Enter') e.preventDefault(); };
        document.getElementById('p-exit').onclick = () => location.reload();
    }
};

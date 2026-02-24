const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('ミラーリング・プロキシ', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;

        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column;">
                <div style="padding: 10px; display: flex; gap: 10px; background: #222;">
                    <input type="text" id="p-url" placeholder="URLを入力" style="flex:1; height:44px; border-radius:8px; padding:0 10px;">
                    <button id="p-btn" style="width:80px; height:44px; background:#007AFF; color:white; border-radius:8px; border:none;">閲覧</button>
                </div>
                <div id="p-status" style="font-size:12px; color:#888; padding:2px 10px;"></div>
                <iframe id="p-frame" style="flex:1; width:100%; border:none; background:white; border-radius: 0 0 15px 15px;"></iframe>
            </div>
        `;
        this.bind();
    },

    bind() {
        const input = document.getElementById('p-url');
        const btn = document.getElementById('p-btn');
        const frame = document.getElementById('p-frame');
        const status = document.getElementById('p-status');

        const load = () => {
            let url = input.value.trim();
            if (!url) return;
            if (!url.startsWith('http')) url = 'https://' + url;

            status.innerText = "🔄 サイトをミラーリング中...";
            const encoded = btoa(unescape(encodeURIComponent(url)));
            
            // 直接iframeに自分自身のAPIを通したURLを突っ込む
            frame.src = `/api/proxy?d=${encoded}`;
            
            frame.onload = () => { status.innerText = "✅ 接続完了 (ドメイン内偽装中)"; };
        };

        btn.addEventListener('click', load);
        input.addEventListener('keydown', (e) => { if(e.key === 'Enter') load(); });
    }
};

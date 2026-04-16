const OpinionHandler = {
    openModal() { document.getElementById('opinion-modal').style.display = 'block'; },
    closeModal() { document.getElementById('opinion-modal').style.display = 'none'; },

    async send() {
        const text = document.getElementById('opinion-input').value;
        if (!text) return;

        // VercelのAPIに送信（URLは変えない）
        await fetch('/api/opinion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'opinion', content: text })
        });
        
        alert("送信しました。");
        this.closeModal();
        document.getElementById('opinion-input').value = "";
    },

    async loadAdminStats() {
        // app.jsの管理フラグをチェック
        if (!Storage.isAdmin()) return;

        document.getElementById('admin-panel').style.display = 'block';
        const view = document.getElementById('api-stats-view');

        try {
            const res = await fetch('/api/opinion?get=stats');
            const data = await res.json();
            
            // IPごとの利用状況をリスト化
            view.innerHTML = data.map(d => `
                <div style="border-bottom:1px solid #333; padding:5px 0;">
                    <span style="color:#3ea6ff;">IP: ${d.ip}</span><br>
                    利用: ${d.count}回<br>
                    直近: ${d.msg || 'なし'}
                </div>
            `).join('');
        } catch (e) {
            view.innerHTML = "統計を取得できません。";
        }
    }
};

// 1秒後に管理者チェック（app.jsの初期化待ち）
setTimeout(() => OpinionHandler.loadAdminStats(), 1000);

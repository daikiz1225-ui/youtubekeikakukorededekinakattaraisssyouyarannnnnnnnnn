const DataManager = {
    // データ取得（履歴500件制限を維持）
    getLocalData() {
        return {
            yt_subs: JSON.parse(localStorage.getItem('yt_subs') || '[]'),
            yt_history: JSON.parse(localStorage.getItem('yt_history') || '[]').slice(0, 500),
            yt_my_playlists: JSON.parse(localStorage.getItem('yt_my_playlists') || '{}'),
            yt_watchlater: JSON.parse(localStorage.getItem('yt_watchlater') || '[]'),
            yt_resume_list: JSON.parse(localStorage.getItem('yt_resume_list') || '[]'),
            exportedAt: new Date().toISOString()
        };
    },

    export() {
        try {
            const data = this.getLocalData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `googlo_full_data_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert("エクスポート失敗");
        }
    },

    import() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    this.applyDataToLocal(importedData);
                    alert("復元しました。再読み込みします。");
                    location.reload();
                } catch (err) {
                    alert("ファイル形式が正しくありません。");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    applyDataToLocal(data) {
        if (!data.yt_subs && !data.yt_my_playlists && !data.yt_watchlater) throw new Error("無効");
        if (data.yt_subs) localStorage.setItem('yt_subs', JSON.stringify(data.yt_subs));
        if (data.yt_history) localStorage.setItem('yt_history', JSON.stringify(data.yt_history));
        if (data.yt_my_playlists) localStorage.setItem('yt_my_playlists', JSON.stringify(data.yt_my_playlists));
        if (data.yt_watchlater) localStorage.setItem('yt_watchlater', JSON.stringify(data.yt_watchlater));
        if (data.yt_resume_list) localStorage.setItem('yt_resume_list', JSON.stringify(data.yt_resume_list));
    },

    // 🛡️ バックエンドのAPIに向けてリクエストを送信する仕様に変更
    async authenticate(action, username, password) {
        if (!username || !password) return alert("入力が足りません");
        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, username, password })
            });
            const data = await response.json();
            if (data.success) {
                alert(data.message || "ログインしました！");
                if (action === 'login') {
                    localStorage.setItem('googlo_logged_in_user', username);
                    location.reload();
                }
            } else {
                alert("エラー: " + data.error);
            }
        } catch (e) {
            alert("通信エラーが発生しました");
        }
    },

    async cloudSave() {
        const username = localStorage.getItem('googlo_logged_in_user');
        if (!username) return;
        try {
            const backupData = this.getLocalData();
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, action: 'save', backupData })
            });
            const resData = await response.json();
            alert(resData.message || "保存完了");
        } catch (e) {
            alert("保存エラー");
        }
    },

    async cloudLoad(isAuto = false) {
        const username = localStorage.getItem('googlo_logged_in_user');
        if (!username) return;
        try {
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, action: 'load' })
            });
            const resData = await response.json();
            if (resData.success) {
                this.applyDataToLocal(resData.data);
                if (!isAuto) {
                    alert("同期完了。再読み込みします。");
                    location.reload();
                }
            }
        } catch (e) {}
    },

    toggleModal(show) {
        let modal = document.getElementById('googlo-auth-modal');
        if (!modal && show) {
            modal = document.createElement('div');
            modal.id = 'googlo-auth-modal';
            modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:9999;";
            const currentUser = localStorage.getItem('googlo_logged_in_user');
            
            modal.innerHTML = `
                <div style="background:#1a1a1a; padding:25px; border-radius:8px; border:1px solid #333; width:320px; color:#fff; position:relative;">
                    <div id="modal-close-btn" style="position:absolute; top:10px; right:15px; cursor:pointer; color:#aaa; font-size:18px;">&times;</div>
                    ${!currentUser ? `
                        <h3 style="margin:0 0 15px 0; font-size:16px; border-bottom:1px solid #333; padding-bottom:5px;">💻 アカウント</h3>
                        <input type="text" id="modal-user" placeholder="ユーザー名" style="width:100%; margin-bottom:10px; background:#2a2a2a; color:#fff; border:1px solid #444; padding:8px; box-sizing:border-box;">
                        <input type="password" id="modal-pass" placeholder="パスワード" style="width:100%; margin-bottom:15px; background:#2a2a2a; color:#fff; border:1px solid #444; padding:8px; box-sizing:border-box;">
                        <button id="modal-btn-submit" style="width:100%; background:#4CAF50; color:white; border:none; padding:8px; font-weight:bold; cursor:pointer; margin-bottom:8px;">ログイン</button>
                        <button id="modal-btn-switch" style="width:100%; background:#555; color:white; border:none; padding:8px; cursor:pointer;">新規登録画面へ切り替え</button>
                    ` : `
                        <h3 style="margin:0 0 15px 0; color:#4CAF50;">✅ ログイン中</h3>
                        <p>ユーザー: ${currentUser}</p>
                        <button id="modal-btn-logout" style="width:100%; background:#f44336; color:white; border:none; padding:8px; cursor:pointer;">ログアウト</button>
                    `}
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('modal-close-btn').onclick = () => this.toggleModal(false);

            if (!currentUser) {
                let isSignUp = false;
                const swBtn = document.getElementById('modal-btn-switch');
                const subBtn = document.getElementById('modal-btn-submit');
                const title = modal.querySelector('h3');
                swBtn.onclick = () => {
                    isSignUp = !isSignUp;
                    title.innerText = isSignUp ? "💻 アカウント新規登録" : "💻 アカウントログイン";
                    subBtn.innerText = isSignUp ? "新規アカウント作成" : "ログイン";
                    subBtn.style.backgroundColor = isSignUp ? "#2196F3" : "#4CAF50";
                    swBtn.innerText = isSignUp ? "ログイン画面へ切り替え" : "新規登録画面へ切り替え";
                };
                subBtn.onclick = () => {
                    this.authenticate(isSignUp ? 'signup' : 'login', document.getElementById('modal-user').value, document.getElementById('modal-pass').value);
                };
            } else {
                document.getElementById('modal-btn-logout').onclick = () => {
                    localStorage.removeItem('googlo_logged_in_user');
                    location.reload();
                };
            }
        } else if (modal && !show) {
            modal.remove();
        }
    },

    injectUI() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && !document.getElementById('backup-manager-ui')) {
            const container = document.createElement('div');
            container.id = 'backup-manager-ui';
            container.style = "border-top:1px solid #333; margin-top:10px; padding-top:10px;";

            const accountBtn = document.createElement('div');
            accountBtn.className = 'nav-item';
            accountBtn.style = "color:#fff; cursor:pointer;";
            accountBtn.innerHTML = `💻 <span style="font-size:12px; font-weight:bold;">アカウント</span>`;
            accountBtn.onclick = () => this.toggleModal(true);
            container.appendChild(accountBtn);

            const expBtn = document.createElement('div');
            expBtn.className = 'nav-item'; expBtn.style.color = "#8aa";
            expBtn.innerHTML = `📤 <span style="font-size:12px;">PCに保存(ファイル)</span>`;
            expBtn.onclick = () => this.export();
            container.appendChild(expBtn);

            const impBtn = document.createElement('div');
            impBtn.className = 'nav-item'; impBtn.style.color = "#8aa";
            impBtn.innerHTML = `📥 <span style="font-size:12px;">PCから復元(ファイル)</span>`;
            impBtn.onclick = () => this.import();
            container.appendChild(impBtn);

            sidebar.appendChild(container);
        }

        // 右上の🔔アイコンの左隣に💾マークを設置
        const currentUser = localStorage.getItem('googlo_logged_in_user');
        const bell = document.querySelector('.header .actions .notification-icon') || document.querySelector('.notification-icon') || document.querySelector('.fa-bell');
        if (currentUser && bell && !document.getElementById('googlo-cloud-save-header')) {
            const saveMark = document.createElement('span');
            saveMark.id = 'googlo-cloud-save-header';
            saveMark.innerText = "💾";
            saveMark.style = "font-size: 20px; cursor: pointer; margin-right: 15px; display: inline-block; vertical-align: middle;";
            saveMark.onclick = () => this.cloudSave();
            bell.parentNode.insertBefore(saveMark, bell);
        }
    }
};

// 起動時処理
window.addEventListener('DOMContentLoaded', () => {
    // ログイン中の場合は入った瞬間に自動でバックエンドから読み込み
    if (localStorage.getItem('googlo_logged_in_user')) {
        DataManager.cloudLoad(true);
    }
    setTimeout(() => { DataManager.injectUI(); }, 500);
});

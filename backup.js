/**
 * backup.js - アカウント認証 ＆ クラウド同期対応版
 */
const DataManager = {
    // 現在ログインしているユーザー名を取得
    getLoggedInUser() {
        return localStorage.getItem('googlo_username') || null;
    },

    // 1. クラウドへデータを保存
    async saveToCloud() {
        const username = this.getLoggedInUser();
        if (!username) return alert("ログインが必要です");

        try {
            const backupData = {
                yt_subs: JSON.parse(localStorage.getItem('yt_subs') || '[]'),
                yt_history: JSON.parse(localStorage.getItem('yt_history') || '[]').slice(0, 50),
                yt_my_playlists: JSON.parse(localStorage.getItem('yt_my_playlists') || '{}'),
                yt_watchlater: JSON.parse(localStorage.getItem('yt_watchlater') || '[]'),
                yt_resume_list: JSON.parse(localStorage.getItem('yt_resume_list') || '[]'),
                exportedAt: new Date().toISOString()
            };

            const res = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, action: 'save', backupData })
            });
            const data = await res.json();

            if (data.success) {
                alert("クラウドにデータを保存しました！");
            } else {
                alert("保存失敗: " + data.error);
            }
        } catch (e) {
            console.error(e);
            alert("通信エラーが発生しました。");
        }
    },

    // 2. クラウドからデータを読み込んで復元
    async loadFromCloud() {
        const username = this.getLoggedInUser();
        if (!username) return alert("ログインが必要です");

        try {
            const res = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, action: 'load' })
            });
            
            if (res.status === 404) {
                return alert("クラウドに保存されたデータがまだありません。");
            }
            
            const importedData = await res.json();

            // localStorageへ各データを復元
            if (importedData.yt_subs) localStorage.setItem('yt_subs', JSON.stringify(importedData.yt_subs));
            if (importedData.yt_history) localStorage.setItem('yt_history', JSON.stringify(importedData.yt_history));
            if (importedData.yt_my_playlists) localStorage.setItem('yt_my_playlists', JSON.stringify(importedData.yt_my_playlists));
            if (importedData.yt_watchlater) localStorage.setItem('yt_watchlater', JSON.stringify(importedData.yt_watchlater));
            if (importedData.yt_resume_list) localStorage.setItem('yt_resume_list', JSON.stringify(importedData.yt_resume_list));

            alert("クラウドからすべてのデータを復元しました！再読み込みします。");
            location.reload();
        } catch (e) {
            console.error(e);
            alert("復元に失敗しました。");
        }
    },

    // 3. アカウント操作（ログイン・登録・ログアウト）
    async handleAuth(action, username, password) {
        if (!username || !password) return alert("ユーザー名とパスワードを入力してください");

        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, username, password })
            });
            const data = await res.json();

            if (data.success) {
                if (action === 'signup') {
                    alert("アカウントを作成しました！ログインしてください。");
                } else if (action === 'login') {
                    localStorage.setItem('googlo_username', data.username);
                    alert(`おかえりなさい、${data.username} さん！`);
                    location.reload();
                }
            } else {
                alert("エラー: " + data.error);
            }
        } catch (e) {
            alert("通信エラーが発生しました。");
        }
    },

    logout() {
        localStorage.removeItem('googlo_username');
        alert("ログアウトしました。");
        location.reload();
    },

    // 4. サイドバーに操作UIを注入する
    injectUI() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        const container = document.createElement('div');
        container.id = 'backup-manager-ui';
        container.style.borderTop = "1px solid #333";
        container.style.marginTop = "15px";
        container.style.paddingTop = "15px";
        container.style.paddingLeft = "10px";
        container.style.paddingRight = "10px";

        const username = this.getLoggedInUser();

        if (!username) {
            // 【未ログイン時のUI】
            container.innerHTML = `
                <div style="font-size:12px; color:#aaa; margin-bottom:10px;">☁️ クラウド同期アカウント</div>
                <input type="text" id="auth-user" placeholder="ユーザー名" style="width:100%; background:#222; color:#fff; border:1px solid #444; padding:4px; margin-bottom:5px; font-size:12px; border-radius:4px;">
                <input type="password" id="auth-pass" placeholder="パスワード" style="width:100%; background:#222; color:#fff; border:1px solid #444; padding:4px; margin-bottom:8px; font-size:12px; border-radius:4px;">
                <div style="display:flex; gap:5px;">
                    <button id="btn-login" style="flex:1; background:#2196F3; color:white; border:none; padding:5px; font-size:11px; cursor:pointer; border-radius:4px;">ログイン</button>
                    <button id="btn-signup" style="flex:1; background:#444; color:white; border:none; padding:5px; font-size:11px; cursor:pointer; border-radius:4px;">新規登録</button>
                </div>
            `;
            sidebar.appendChild(container);

            // イベント設定
            document.getElementById('btn-login').onclick = () => {
                const u = document.getElementById('auth-user').value;
                const p = document.getElementById('auth-pass').value;
                this.handleAuth('login', u, p);
            };
            document.getElementById('btn-signup').onclick = () => {
                const u = document.getElementById('auth-user').value;
                const p = document.getElementById('auth-pass').value;
                this.handleAuth('signup', u, p);
            };
        } else {
            // 【ログイン済みのUI】
            container.innerHTML = `
                <div style="font-size:12px; color:#4CAF50; margin-bottom:8px;">👤 ${username} としてログイン中</div>
                <div id="btn-cloud-save" class="nav-item" style="color:#4CAF50; cursor:pointer; margin-bottom:5px; font-size:12px;">📤 クラウドへデータを保存</div>
                <div id="btn-cloud-load" class="nav-item" style="color:#2196F3; cursor:pointer; margin-bottom:10px; font-size:12px;">📥 クラウドからデータ復元</div>
                <button id="btn-logout" style="width:100%; background:#d32f2f; color:white; border:none; padding:4px; font-size:11px; cursor:pointer; border-radius:4px;">ログアウト</button>
            `;
            sidebar.appendChild(container);

            // イベント設定
            document.getElementById('btn-cloud-save').onclick = () => this.saveToCloud();
            document.getElementById('btn-cloud-load').onclick = () => this.loadFromCloud();
            document.getElementById('btn-logout').onclick = () => this.logout();
        }
    }
};

// 起動
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if(!document.getElementById('backup-manager-ui')) {
            DataManager.injectUI();
        }
    }, 500);
});

/**
 * backup.js - データのバックアップ（保存）と復元（読み込み）機能 + バックエンド経由クラウド同期
 * 対応項目: チャンネル登録、履歴(500件)、プレイリスト、後で見る、続きから
 */
const DataManager = {
    // 1. ローカルデータ取得（元の仕様を100%維持）
    getLocalData() {
        return {
            yt_subs: JSON.parse(localStorage.getItem('yt_subs') || '[]'), //
            yt_history: JSON.parse(localStorage.getItem('yt_history') || '[]').slice(0, 500), // 直近500件制限
            yt_my_playlists: JSON.parse(localStorage.getItem('yt_my_playlists') || '{}'), //
            yt_watchlater: JSON.parse(localStorage.getItem('yt_watchlater') || '[]'), //
            yt_resume_list: JSON.parse(localStorage.getItem('yt_resume_list') || '[]'), //
            exportedAt: new Date().toISOString() //
        };
    },

    // 2. エクスポート（PCへのファイル保存・既存の仕組み）
    export() {
        try {
            const data = this.getLocalData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); //
            const url = URL.createObjectURL(blob); //
            const a = document.createElement('a'); //
            a.href = url; //
            a.download = `googlo_full_data_${new Date().toISOString().split('T')[0]}.json`; //
            a.click(); //
            URL.revokeObjectURL(url); //
        } catch (e) {
            console.error(e); //
            alert("データの書き出しに失敗しました。"); //
        }
    },

    // 3. インポート（PCファイルから復元・既存の仕組み）
    import() {
        const input = document.createElement('input'); //
        input.type = 'file'; //
        input.accept = '.json'; //
        
        input.onchange = (e) => { //
            const file = e.target.files[0]; //
            const reader = new FileReader(); //
            reader.onload = (event) => { //
                try {
                    const importedData = JSON.parse(event.target.result); //
                    this.applyDataToLocal(importedData);
                    alert("すべてのデータを復元しました。ページを再読み込みします。"); //
                    location.reload(); //
                } catch (err) {
                    alert("復元に失敗しました。正しいファイルを選択してください。"); //
                }
            };
            reader.readAsText(file); //
        };
        input.click(); //
    },

    // localStorageへの反映ロジック
    applyDataToLocal(data) {
        if (!data.yt_subs && !data.yt_my_playlists && !data.yt_watchlater) { //
            throw new Error("無効なファイル形式です"); //
        }
        if (data.yt_subs) localStorage.setItem('yt_subs', JSON.stringify(data.yt_subs)); //
        if (data.yt_history) localStorage.setItem('yt_history', JSON.stringify(data.yt_history)); //
        if (data.yt_my_playlists) localStorage.setItem('yt_my_playlists', JSON.stringify(data.yt_my_playlists)); //
        if (data.yt_watchlater) localStorage.setItem('yt_watchlater', JSON.stringify(data.yt_watchlater)); //
        if (data.yt_resume_list) localStorage.setItem('yt_resume_list', JSON.stringify(data.yt_resume_list)); //
    },

    // 🛡️【バックエンド経由】クラウド保存
    async cloudSave() {
        const username = localStorage.getItem('googlo_logged_user');
        if (!username) return alert("ログインが必要です");

        try {
            const backupData = this.getLocalData();
            // 直接データベースではなく、自前のVercelバックエンドサーバーへ送る
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, action: 'save', backupData })
            });
            const resData = await response.json();
            alert(resData.message || resData.error);
        } catch (e) {
            alert("クラウド保存で通信エラーが発生しました");
        }
    },

    // 🛡️【バックエンド経由】クラウド読込
    async cloudLoad() {
        const username = localStorage.getItem('googlo_logged_user');
        if (!username) return alert("ログインが必要です");

        try {
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, action: 'load' })
            });
            const resData = await response.json();
            if (resData.success) {
                this.applyDataToLocal(resData.data);
                alert("クラウドからデータを復元しました！再読み込みします。");
                location.reload();
            } else {
                alert("エラー: " + resData.error);
            }
        } catch (e) {
            alert("クラウド読込で通信エラーが発生しました");
        }
    },

    // 🛡️【バックエンド経由】認証処理（サインアップ・ログイン）
    async authenticate(action, username, password) {
        if (!username || !password) return alert("ユーザー名とパスワードを入力してください");
        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, username, password })
            });
            const data = await response.json();
            if (data.success) {
                alert(data.message || "ログインに成功しました！");
                if (action === 'login') {
                    localStorage.setItem('googlo_logged_user', username);
                    location.reload();
                }
            } else {
                alert("エラー: " + data.error);
            }
        } catch (e) {
            alert("通信エラーが発生しました");
        }
    },

    // 4. サイドバーにUIを注入
    injectUI() {
        const sidebar = document.querySelector('.sidebar'); //
        if (!sidebar) return; //

        const container = document.createElement('div'); //
        container.id = 'backup-manager-ui'; //
        container.style.borderTop = "1px solid #333"; //
        container.style.marginTop = "10px"; //
        container.style.paddingTop = "10px"; //

        const loggedUser = localStorage.getItem('googlo_logged_user');

        if (!loggedUser) {
            container.innerHTML = `
                <div style="padding: 5px; color:#aaa; font-size:11px;">☁️ クラウド同期・ログイン</div>
                <input type="text" id="sync-user" placeholder="ユーザー名" style="width:90%; margin:3px auto; display:block; background:#222; color:#fff; border:1px solid #444; padding:4px; font-size:12px;">
                <input type="password" id="sync-pass" placeholder="パスワード" style="width:90%; margin:3px auto; display:block; background:#222; color:#fff; border:1px solid #444; padding:4px; font-size:12px;">
                <div style="display:flex; gap:5px; width:90%; margin:5px auto;">
                    <button id="btn-login" style="flex:1; background:#4CAF50; color:white; border:none; padding:5px; font-size:11px; cursor:pointer; font-weight:bold;">ログイン</button>
                    <button id="btn-signup" style="flex:1; background:#555; color:white; border:none; padding:5px; font-size:11px; cursor:pointer;">新規登録</button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="padding: 5px; color:#4CAF50; font-size:11px; font-weight:bold;">✅ ログイン中: ${loggedUser}</div>
                <div id="btn-cloud-save" class="nav-item" style="color:#4CAF50; cursor:pointer; margin:5px 0; font-size:12px;">☁️ <span>データをクラウドに保存</span></div>
                <div id="btn-cloud-load" class="nav-item" style="color:#2196F3; cursor:pointer; margin:5px 0; font-size:12px;">🔄 <span>クラウドからデータを復元</span></div>
                <div id="btn-logout" style="color:#f44336; font-size:11px; cursor:pointer; text-align:right; margin:5px 10px 0 0;">[ログアウト]</div>
            `;
        }

        // 既存のPCローカル保存用ボタンを追加
        const expBtn = document.createElement('div'); //
        expBtn.className = 'nav-item'; //
        expBtn.style.color = "#8aa"; //
        expBtn.innerHTML = `📤<span style="font-size:12px;">PCに保存(ファイル)</span>`; //
        expBtn.onclick = () => this.export(); //

        const impBtn = document.createElement('div'); //
        impBtn.className = 'nav-item'; //
        impBtn.style.color = "#8aa"; //
        impBtn.innerHTML = `📥<span style="font-size:12px;">PCから復元(ファイル)</span>`; //
        impBtn.onclick = () => this.import(); //

        container.appendChild(expBtn); //
        container.appendChild(impBtn); //
        sidebar.appendChild(container); //

        if (!loggedUser) {
            document.getElementById('btn-login').onclick = () => this.authenticate('login', document.getElementById('sync-user').value, document.getElementById('sync-pass').value);
            document.getElementById('btn-signup').onclick = () => this.authenticate('signup', document.getElementById('sync-user').value, document.getElementById('sync-pass').value);
        } else {
            document.getElementById('btn-cloud-save').onclick = () => this.cloudSave();
            document.getElementById('btn-cloud-load').onclick = () => this.cloudLoad();
            document.getElementById('btn-logout').onclick = () => {
                localStorage.removeItem('googlo_logged_user');
                location.reload();
            };
        }
    }
};

// 起動処理
window.addEventListener('DOMContentLoaded', () => { //
    setTimeout(() => { //
        if(!document.getElementById('backup-manager-ui')) { //
            DataManager.injectUI(); //
        }
    }, 500); //
});

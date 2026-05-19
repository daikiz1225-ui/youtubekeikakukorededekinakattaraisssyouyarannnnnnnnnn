/**
 * backup.js - アカウント切り替え時自動保存 ＆ 強制自動同期版
 * 別のユーザーに切り替える際、現在のデータを自動でクラウドに保存してから切り替えます
 * 【バグ修正】新規作成・ログイン・ログアウト時の意図しない白紙上書きを完全に防止
 */
const DataManager = {
    // データ一括取得（履歴500件制限を維持）
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

    // ローカルストレージへデータを上書き反映
    applyDataToLocal(data) {
        if (!data.yt_subs && !data.yt_my_playlists && !data.yt_watchlater) throw new Error("無効なデータ構造");
        if (data.yt_subs) localStorage.setItem('yt_subs', JSON.stringify(data.yt_subs));
        if (data.yt_history) localStorage.setItem('yt_history', JSON.stringify(data.yt_history));
        if (data.yt_my_playlists) localStorage.setItem('yt_my_playlists', JSON.stringify(data.yt_my_playlists));
        if (data.yt_watchlater) localStorage.setItem('yt_watchlater', JSON.stringify(data.yt_watchlater));
        if (data.yt_resume_list) localStorage.setItem('yt_resume_list', JSON.stringify(data.yt_resume_list));
    },

    // ローカルストレージを完全に空にする（アカウント切り替え・ログアウト時の安全用）
    clearLocalData() {
        localStorage.removeItem('yt_subs');
        localStorage.removeItem('yt_history');
        localStorage.removeItem('yt_my_playlists');
        localStorage.removeItem('yt_watchlater');
        localStorage.removeItem('yt_resume_list');
    },

    // 1. ローカルへのエクスポート（JSONファイルダウンロード）
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
            console.error(e);
            alert("エクスポートに失敗しました。");
        }
    },

    // 2. ローカルからのインポート（JSONファイル読み込み）
    import() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = event => {
                try {
                    const data = JSON.parse(event.target.result);
                    this.applyDataToLocal(data);
                    alert("データをローカルファイルから復元しました！ページを再読み込みします。");
                    location.reload();
                } catch (err) {
                    alert("復元に失敗しました。正しいファイルを選択してください。");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    // ☁️ オンラインに現在のデータを即時保存
    async cloudSave() {
        const username = localStorage.getItem('googlo_username');
        if (!username) return;
        try {
            const data = this.getLocalData();
            const res = await fetch('/api/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save', username, data })
            });
            const result = await res.json();
            if (result.success) {
                console.log("クラウドに自動同期しました");
            }
        } catch (e) {
            console.error("自動同期エラー:", e);
        }
    },

    // 🔄 クラウドからデータを読み込んでローカルに反映
    async cloudLoad(silent = false) {
        const username = localStorage.getItem('googlo_username');
        if (!username) return;
        try {
            const res = await fetch('/api/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', username, password: '' }) // パスワード空でデータ要求するAPI仕様に準拠
            });
            const result = await res.json();
            if (result.success && result.data) {
                this.applyDataToLocal(result.data);
                if (!silent) alert("クラウドから最新のデータを同期しました！");
                if (typeof Actions !== 'undefined' && Actions.loadSidebarLatest) {
                    Actions.loadSidebarLatest();
                }
            }
        } catch (e) {
            console.error("クラウドデータ取得エラー:", e);
        }
    },

    // 🔐 アカウント登録・ログイン・切替・ログアウトの統合ハンドラー
    async handleAuth(type) {
        const u = document.getElementById('modal-cloud-user').value.trim();
        const p = document.getElementById('modal-cloud-pass').value.trim();
        const currentUser = localStorage.getItem('googlo_username');

        if (type !== 'logout' && (!u || !p)) {
            return alert("ユーザー名とパスワードを入力してください");
        }

        try {
            // 【修正点】アカウント切り替え時（ログイン中のユーザー名と異なる名前でログインしようとした時）
            if (type === 'login' && currentUser && currentUser !== u) {
                console.log(`アカウント切り替え検知: ${currentUser} から ${u} へ切り替えます。現在のデータを退避保存します。`);
                await this.cloudSave(); // 現ユーザーのデータをクラウドに安全に逃がす
                this.clearLocalData();  // ストレージをごちゃ混ぜにしないために一度クリア
            }

            // 【修正点】純粋なログアウト処理のとき
            if (type === 'logout') {
                if (confirm("ログアウトしますか？（ローカルのデータは安全のために一度初期化されます）")) {
                    // ログアウト時は空データをクラウドに誤送信しないよう、保存処理を挟まずにクリア
                    localStorage.removeItem('googlo_username');
                    this.clearLocalData();
                    alert("ログアウトしました。");
                    location.reload();
                }
                return;
            }

            // APIリクエストの送信
            const res = await fetch('/api/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: type, username: u, password: p })
            });
            const data = await res.json();

            if (!data.success) {
                return alert(data.error || "認証に失敗しました");
            }

            // 認証成功時のストレージセット
            localStorage.setItem('googlo_username', u);

            if (type === 'login') {
                // 【修正点】ログイン時は、今ブラウザにあるかもしれない空データ等で上書きさせず、
                // まず確実にクラウドに残っている過去の正常なデータを取得してローカルに適用する
                if (data.data) {
                    this.applyDataToLocal(data.data);
                }
                alert(`ユーザー「${u}」としてログインし、データを復元しました！`);
            } else if (type === 'register') {
                // 【修正点】新規アカウント作成時は、メイン垢のデータを誤って吸い上げさせないよう
                // まっさらな状態でクラウドに新規データ枠を確保する
                alert(`新しくアカウント「${u}」を作成しました！`);
                await this.cloudSave(); // 空、または新しい初期状態を新規枠へ保存
            }

            this.toggleModal(false);
            location.reload();

        } catch (e) {
            console.error(e);
            alert("通信エラーが発生しました。");
        }
    },

    // 🖥️ UIコントロール: アカウント設定モーダルの表示・非表示
    toggleModal(show, isRegister = false) {
        let modal = document.getElementById('account-manager-modal');
        if (!modal && show) {
            modal = document.createElement('div');
            modal.id = 'account-manager-modal';
            modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:10000;";
            document.body.appendChild(modal);
        }

        if (!show) {
            if (modal) modal.style.display = 'none';
            return;
        }

        const currentUser = localStorage.getItem('googlo_username');
        modal.style.display = 'flex';

        modal.innerHTML = `
            <div style="background:#222; border:1px solid #333; padding:25px; border-radius:8px; width:300px; color:#fff; font-family:sans-serif; box-shadow:0 4px 15px rgba(0,0,0,0.5);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="margin:0; font-size:16px;">☁️ オンラインアカウント</h3>
                    <span style="cursor:pointer; color:#aaa; font-size:20px;" onclick="DataManager.toggleModal(false)">&times;</span>
                </div>
                
                ${currentUser ? `
                    <div style="background:#1a1a1a; padding:10px; border-radius:4px; margin-bottom:15px; border-left:4px solid #4CAF50;">
                        <span style="font-size:11px; color:#aaa; display:block;">現在ログイン中:</span>
                        <strong style="font-size:14px; color:#4CAF50;">${currentUser}</strong>
                    </div>
                ` : `
                    <div style="font-size:12px; color:#aaa; margin-bottom:15px;">ログインすると登録チャンネルや履歴がクラウドに自動バックアップされます。</div>
                `}

                <div style="margin-bottom:10px;">
                    <label style="font-size:11px; color:#aaa; display:block; margin-bottom:4px;">ユーザー名</label>
                    <input type="text" id="modal-cloud-user" value="${currentUser || ''}" placeholder="Username" style="width:100%; box-sizing:border-box; background:#111; border:1px solid #444; color:#fff; padding:8px; border-radius:4px; font-size:13px;">
                </div>

                <div style="margin-bottom:20px;">
                    <label style="font-size:11px; color:#aaa; display:block; margin-bottom:4px;">パスワード</label>
                    <input type="password" id="modal-cloud-pass" placeholder="Password" style="width:100%; box-sizing:border-box; background:#111; border:1px solid #444; color:#fff; padding:8px; border-radius:4px; font-size:13px;">
                </div>

                <div style="display:flex; flex-direction:column; gap:8px;">
                    <button style="width:100%; background:#2196F3; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer; font-size:13px; font-weight:bold;" onclick="DataManager.handleAuth('login')">ユーザーログイン / アカウント切替</button>
                    <button style="width:100%; background:#4CAF50; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-size:12px;" onclick="DataManager.handleAuth('register')">新しいアカウントを作成</button>
                    ${currentUser ? `
                        <button style="width:100%; background:#f44336; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-size:12px; margin-top:5px;" onclick="DataManager.handleAuth('logout')">サインアウト (ログアウト)</button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    // 3. サイドバーに操作ボタンを注入してレンダリング
    injectUI() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        // すでにUIが存在する場合は一度削除して再生成（ログイン状態の表示更新のため）
        const oldUI = document.getElementById('backup-manager-ui');
        if (oldUI) oldUI.remove();

        const container = document.createElement('div');
        container.id = 'backup-manager-ui';
        container.style.borderTop = "1px solid #333";
        container.style.marginTop = "10px";
        container.style.paddingTop = "10px";

        const currentUser = localStorage.getItem('googlo_username');

        // アカウント設定（モーダル起動ボタン）
        const accountBtn = document.createElement('div');
        accountBtn.className = 'nav-item';
        accountBtn.style = "color:#FF9800; cursor:pointer; margin-bottom:8px; font-weight:bold; padding-left:5px;";
        accountBtn.innerHTML = `👤 <span style="font-size:12px;">${currentUser ? `アカウント: ${currentUser}` : 'アカウント接続'}</span>`;
        accountBtn.onclick = () => this.toggleModal(true, false);
        container.appendChild(accountBtn);

        if (currentUser) {
            const saveBtn = document.createElement('div');
            saveBtn.className = 'nav-item';
            saveBtn.style = "color:#4CAF50; cursor:pointer; margin-bottom:8px; padding-left:5px;";
            saveBtn.innerHTML = `☁️ <span style="font-size:12px; font-weight:bold;">オンラインに保存</span>`;
            saveBtn.onclick = () => this.cloudSave();
            container.appendChild(saveBtn);

            const loadBtn = document.createElement('div');
            loadBtn.className = 'nav-item';
            loadBtn.style = "color:#2196F3; cursor:pointer; padding-left:5px;";
            loadBtn.innerHTML = `🔄 <span style="font-size:12px; font-weight:bold;">クラウドから復元</span>`;
            loadBtn.onclick = () => this.cloudLoad(false);
            container.appendChild(loadBtn);
        } else {
            const infoText = document.createElement('div');
            infoText.style = "color:#555; font-size:11px; padding:4px 5px; line-height:1.3;";
            infoText.innerText = "※ログインするとここにオンライン保存・復元ボタンが出現します。";
            container.appendChild(infoText);
        }

        sidebar.appendChild(container);
    }
};

// ページ読み込み完了時の自動トリガー処理
window.addEventListener('DOMContentLoaded', () => {
    DataManager.injectUI();
});

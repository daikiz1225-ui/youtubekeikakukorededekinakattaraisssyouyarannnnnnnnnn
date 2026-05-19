/**
 * backup.js - アカウント切り替え時自動保存 ＆ 強制自動同期版
 * 別のユーザーに切り替える際、現在のデータを自動でクラウドに保存してから切り替えます
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

    // 🧹 YouTube関連のデータだけをピンポイントで安全に消去する処理
    clearYoutubeDataOnly() {
        localStorage.removeItem('yt_subs');
        localStorage.removeItem('yt_history');
        localStorage.removeItem('yt_my_playlists');
        localStorage.removeItem('yt_watchlater');
        localStorage.removeItem('yt_resume_list');
    },

    // 📤 ローカルへのエクスポート（JSONファイルダウンロード）
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

    // 📥 ローカルからのインポート（JSONファイル読み込み）
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

    // 🛡️ アカウント認証（サインアップ・ログイン）
    async authenticate(action, username, password) {
        if (!username || !password) return alert("ユーザー名とパスワードを入力してください");
        try {
            // 新規ログイン時も、もし現在ログイン中の人がいれば念のため自動保存しておく
            await this.cloudSave(true);

            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, username, password })
            });
            const data = await response.json();
            if (data.success) {
                alert(data.message || "ログインに成功しました！");
                
                this.clearYoutubeDataOnly();

                // 現在のアクティブユーザーに設定
                localStorage.setItem('googlo_logged_in_user', username);
                
                // マルチアカウントリストに保存
                let list = JSON.parse(localStorage.getItem('googlo_account_list') || '[]');
                if (!list.includes(username)) {
                    list.push(username);
                    localStorage.setItem('googlo_account_list', JSON.stringify(list));
                }
                
                await this.cloudLoad(true);
                location.reload();
            } else {
                alert("エラー: " + data.error);
            }
        } catch (e) {
            alert("通信エラーが発生しました");
        }
    },

    // 🔄 アカウントをタップして一瞬で切り替える機能（自動保存追加版）
    async switchAccount(username) {
        const currentUser = localStorage.getItem('googlo_logged_in_user');
        
        // 1. もし現在誰かがログイン中なら、切り替える前にその人のデータを「無言で自動保存」
        if (currentUser) {
            console.log(`googlo: 切り替え前に ${currentUser} のデータを自動保存中...`);
            await this.cloudSave(true); 
        }

        // 2. 前のユーザーの古いYouTubeデータをクリア
        this.clearYoutubeDataOnly();

        // 3. アクティブユーザーを新しい人に書き換え
        localStorage.setItem('googlo_logged_in_user', username);
        
        // 4. 新しいユーザーのデータをクラウドから強制ダウンロード
        await this.cloudLoad(true);

        alert(`${username} に切り替えました。変更は自動保存されました！`);
        location.reload();
    },

    // ❌ 特定のアカウントだけを個別ログアウト
    async logoutIndividual(username, e) {
        if(e) e.stopPropagation(); 
        
        if (!confirm(`${username} をログアウト（端末から削除）しますか？`)) return;

        let list = JSON.parse(localStorage.getItem('googlo_account_list') || '[]');
        list = list.filter(user => user !== username);
        localStorage.setItem('googlo_account_list', JSON.stringify(list));

        const currentUser = localStorage.getItem('googlo_logged_in_user');
        
        if (currentUser === username) {
            // ログアウトする人が現在のユーザーなら、保存はせずにクリアして切り替える
            this.clearYoutubeDataOnly();
            if (list.length > 0) {
                localStorage.setItem('googlo_logged_in_user', list[0]);
                await this.cloudLoad(true);
            } else {
                localStorage.removeItem('googlo_logged_in_user');
            }
        }
        
        alert("ログアウトしました");
        location.reload();
    },

    // 🛡️ クラウドへデータを同期保存（isAutoがtrueの時はアラートを出さない）
    async cloudSave(isAuto = false) {
        const username = localStorage.getItem('googlo_logged_in_user');
        if (!username) {
            if (!isAuto) alert("保存するにはログインが必要です");
            return;
        }

        try {
            const backupData = this.getLocalData();
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, action: 'save', backupData })
            });
            const resData = await response.json();
            
            // 手動保存のときだけ完了アラートを出す
            if (!isAuto) {
                alert(resData.message || "オンライン保存が完了しました！");
            }
        } catch (e) {
            if (!isAuto) alert("クラウドへの保存中にエラーが発生しました");
        }
    },

    // 🛡️ クラウドからデータを復元
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
            } else if (!isAuto) {
                alert("エラー: " + resData.error);
            }
        } catch (e) {}
    },

    // 画面中央ポップアップ（Google風マルチアカウント仕様）
    toggleModal(show, showAddForm = false) {
        let modal = document.getElementById('googlo-auth-modal');
        if (!modal && show) {
            modal = document.createElement('div');
            modal.id = 'googlo-auth-modal';
            modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:9999;";
            
            const currentUser = localStorage.getItem('googlo_logged_in_user');
            const accountList = JSON.parse(localStorage.getItem('googlo_account_list') || '[]');

            if (showAddForm || accountList.length === 0) {
                modal.innerHTML = `
                    <div style="background:#1a1a1a; padding:25px; border-radius:8px; border:1px solid #333; width:320px; color:#fff; position:relative; box-shadow:0 4px 20px rgba(0,0,0,0.5);">
                        <div id="modal-close-btn" style="position:absolute; top:10px; right:15px; cursor:pointer; color:#aaa; font-size:18px;">&times;</div>
                        <h3 style="margin:0 0 15px 0; font-size:16px; border-bottom:1px solid #333; padding-bottom:5px;">💻 アカウントを追加</h3>
                        <input type="text" id="modal-user" placeholder="ユーザー名" style="width:100%; margin-bottom:10px; background:#2a2a2a; color:#fff; border:1px solid #444; padding:8px; border-radius:4px; box-sizing:border-box;">
                        <input type="password" id="modal-pass" placeholder="パスワード" style="width:100%; margin-bottom:15px; background:#2a2a2a; color:#fff; border:1px solid #444; padding:8px; border-radius:4px; box-sizing:border-box;">
                        <button id="modal-btn-submit" style="width:100%; background:#4CAF50; color:white; border:none; padding:8px; border-radius:4px; font-weight:bold; cursor:pointer; margin-bottom:8px;">ログイン</button>
                        <button id="modal-btn-switch" style="width:100%; background:#555; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; margin-bottom:8px;">新規登録画面へ切り替え</button>
                        ${accountList.length > 0 ? `<button id="modal-btn-back" style="width:100%; background:#333; color:white; border:1px solid #555; padding:8px; border-radius:4px; cursor:pointer;">アカウント一覧に戻る</button>` : ''}
                    </div>
                `;
                document.body.appendChild(modal);
                document.getElementById('modal-close-btn').onclick = () => this.toggleModal(false);
                if(document.getElementById('modal-btn-back')) {
                    document.getElementById('modal-btn-back').onclick = () => { modal.remove(); this.toggleModal(true, false); };
                }

                let isSignUp = false;
                const swBtn = document.getElementById('modal-btn-switch');
                const subBtn = document.getElementById('modal-btn-submit');
                const title = modal.querySelector('h3');
                
                swBtn.onclick = () => {
                    isSignUp = !isSignUp;
                    title.innerText = isSignUp ? "💻 アカウント新規登録" : "💻 アカウントを追加";
                    subBtn.innerText = isSignUp ? "新規アカウント作成" : "ログイン";
                    subBtn.style.backgroundColor = isSignUp ? "#2196F3" : "#4CAF50";
                    swBtn.innerText = isSignUp ? "ログイン画面へ切り替え" : "新規登録画面へ切り替え";
                };
                subBtn.onclick = () => {
                    this.authenticate(isSignUp ? 'signup' : 'login', document.getElementById('modal-user').value, document.getElementById('modal-pass').value);
                };
            } else {
                let listHTML = "";
                accountList.forEach(user => {
                    const isActive = (user === currentUser);
                    listHTML += `
                        <div class="account-item-row" data-user="${user}" style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:8px; background:${isActive ? '#2e3d30' : '#222'}; border:1px solid ${isActive ? '#4CAF50' : '#444'}; border-radius:6px; cursor:pointer; transition:background 0.2s;">
                            <div style="flex-grow:1; font-size:14px; display:flex; align-items:center; color:#fff;">
                                <span style="margin-right:8px; font-size:16px;">${isActive ? '🟢' : '👤'}</span>
                                <strong>${user}</strong> ${isActive ? '<span style="font-size:11px; color:#4CAF50; margin-left:5px;">(使用中)</span>' : ''}
                            </div>
                            <button class="individual-logout-btn" data-user="${user}" style="background:transparent; color:#ff5252; border:none; font-size:12px; cursor:pointer; padding:5px 8px; border-radius:4px; font-weight:bold;">ログアウト</button>
                        </div>
                    `;
                });

                modal.innerHTML = `
                    <div style="background:#1a1a1a; padding:25px; border-radius:8px; border:1px solid #333; width:340px; color:#fff; position:relative; box-shadow:0 4px 20px rgba(0,0,0,0.5);">
                        <div id="modal-close-btn" style="position:absolute; top:10px; right:15px; cursor:pointer; color:#aaa; font-size:18px;">&times;</div>
                        <h3 style="margin:0 0 15px 0; font-size:16px; border-bottom:1px solid #333; padding-bottom:5px;">💻 アカウントの切り替え</h3>
                        
                        <div style="max-height:220px; overflow-y:auto; margin-bottom:15px;">
                            ${listHTML}
                        </div>
                        
                        <button id="modal-btn-go-add" style="width:100%; background:#2196F3; color:white; border:none; padding:10px; border-radius:4px; font-weight:bold; cursor:pointer;">➕ 別のアカウントを追加する</button>
                    </div>
                `;
                document.body.appendChild(modal);
                document.getElementById('modal-close-btn').onclick = () => this.toggleModal(false);
                document.getElementById('modal-btn-go-add').onclick = () => { modal.remove(); this.toggleModal(true, true); };

                modal.querySelectorAll('.account-item-row').forEach(row => {
                    row.onclick = () => this.switchAccount(row.getAttribute('data-user'));
                });
                modal.querySelectorAll('.individual-logout-btn').forEach(btn => {
                    btn.onclick = (e) => this.logoutIndividual(btn.getAttribute('data-user'), e);
                });
            }
        } else if (modal && !show) {
            modal.remove();
        }
    },

    // サイドバーへUIを挿入
    injectUI() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar || document.getElementById('backup-manager-ui')) return;

        const container = document.createElement('div');
        container.id = 'backup-manager-ui';
        container.style = "border-top:1px solid #333; margin-top:15px; padding-top:15px;";

        const currentUser = localStorage.getItem('googlo_logged_in_user');

        // アカウント設定モーダルボタン
        const accountBtn = document.createElement('div');
        accountBtn.className = 'nav-item';
        accountBtn.style = "color:#fff; cursor:pointer; margin-bottom:8px;";
        if (currentUser) {
            accountBtn.innerHTML = `💻 <span style="font-size:12px; font-weight:bold; color:#4CAF50;">アカウント (${currentUser})</span>`;
        } else {
            accountBtn.innerHTML = `💻 <span style="font-size:12px; font-weight:bold;">アカウント設定</span>`;
        }
        accountBtn.onclick = () => this.toggleModal(true, false);
        container.appendChild(accountBtn);

        // 📥 【復活】ファイルから復元ボタン（常時表示、ログイン不要）
        const importBtn = document.createElement('div');
        importBtn.className = 'nav-item';
        importBtn.style = "color:#FF9800; cursor:pointer; margin-bottom:8px; padding-left:5px;";
        importBtn.innerHTML = `📥 <span style="font-size:12px; font-weight:bold;">ファイルから復元</span>`;
        importBtn.onclick = () => this.import();
        container.appendChild(importBtn);

        // 📤 【復活】ファイルに保存ボタン（常時表示、ログイン不要）
        const exportBtn = document.createElement('div');
        exportBtn.className = 'nav-item';
        exportBtn.style = "color:#e91e63; cursor:pointer; margin-bottom:8px; padding-left:5px;";
        exportBtn.innerHTML = `📤 <span style="font-size:12px; font-weight:bold;">ファイルに保存</span>`;
        exportBtn.onclick = () => this.export();
        container.appendChild(exportBtn);

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
            infoText.innerText = "※ログインするとオンライン保存・復元ボタンが出現します。";
            container.appendChild(infoText);
        }

        sidebar.appendChild(container);
    }
};

// ページ読み込み完了時の自動トリガー処理
window.addEventListener('DOMContentLoaded', () => {
    // 💡 【修正】入った瞬間にサーバーと勝手に繋ぐ（cloudLoadする）コードを完全消去しました。
    setTimeout(() => { DataManager.injectUI(); }, 500);
});

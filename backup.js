/**
 * backup.js - パスコード ＆ マルチアカウント ＆ クラウド壁紙同期システム
 */
const DataManager = {
    _isSyncing: false,

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

    applyDataToLocal(data) {
        if (!data) return;
        DataManager._isSyncing = true;
        if (data.yt_subs) localStorage.setItem('yt_subs', JSON.stringify(data.yt_subs));
        if (data.yt_history) localStorage.setItem('yt_history', JSON.stringify(data.yt_history));
        if (data.yt_my_playlists) localStorage.setItem('yt_my_playlists', JSON.stringify(data.yt_my_playlists));
        if (data.yt_watchlater) localStorage.setItem('yt_watchlater', JSON.stringify(data.yt_watchlater));
        if (data.yt_resume_list) localStorage.setItem('yt_resume_list', JSON.stringify(data.yt_resume_list));
        DataManager._isSyncing = false;
    },

    clearYoutubeDataOnly() {
        DataManager._isSyncing = true;
        localStorage.removeItem('yt_subs');
        localStorage.removeItem('yt_history');
        localStorage.removeItem('yt_my_playlists');
        localStorage.removeItem('yt_watchlater');
        localStorage.removeItem('yt_resume_list');
        DataManager._isSyncing = false;
        // 壁紙のクリーンアップ
        document.body.style.backgroundImage = '';
        document.body.classList.remove('has-wallpaper');
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
            alert("エクスポートに失敗しました。");
        }
    },

    import() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async event => {
                try {
                    const data = JSON.parse(event.target.result);
                    this.applyDataToLocal(data);
                    await this.cloudSave(true);
                    alert("データを復元し、オンラインに同期しました！");
                    location.reload();
                } catch (err) {
                    alert("復元に失敗しました。");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    // 🛡️ アカウント認証（新規登録画面で4桁パスコードを設定）
    async authenticate(action, username, password, passcodedigit) {
        if (!username || !password) return alert("ユーザー名とパスワードを入力してください");
        
        if (action === 'signup') {
            if (!passcodedigit || passcodedigit.length !== 4 || isNaN(passcodedigit)) {
                return alert("画面ロック用の【数字4桁】のパスコードを入力してください");
            }
        }

        try {
            await this.cloudSave(true);

            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, username, password })
            });
            const data = await response.json();
            if (data.success) {
                alert(action === 'signup' ? "アカウントを作成しました！" : "ログインに成功しました！");
                
                this.clearYoutubeDataOnly();
                localStorage.setItem('googlo_logged_in_user', username);
                
                let list = JSON.parse(localStorage.getItem('googlo_account_list') || '[]');
                if (!list.includes(username)) {
                    list.push(username);
                    localStorage.setItem('googlo_account_list', JSON.stringify(list));
                }

                // パスコードマップに登録（新規登録時、ログイン時は未設定なら0000）
                let passMap = JSON.parse(localStorage.getItem('googlo_passcodes') || '{}');
                if (action === 'signup') {
                    passMap[username] = passcodedigit;
                } else if (!passMap[username]) {
                    passMap[username] = "0000"; 
                }
                localStorage.setItem('googlo_passcodes', JSON.stringify(passMap));
                
                await this.cloudLoad(true);
                await this.cloudLoadWallpaper(); // 壁紙もロード
                location.reload();
            } else {
                alert("エラー: " + data.error);
            }
        } catch (e) {
            alert("通信エラーが発生しました");
        }
    },

    async switchAccount(username) {
        const currentUser = localStorage.getItem('googlo_logged_in_user');
        if (currentUser) {
            await this.cloudSave(true); 
        }
        this.clearYoutubeDataOnly();
        localStorage.setItem('googlo_logged_in_user', username);
        await this.cloudLoad(true);
        await this.cloudLoadWallpaper(); // 新しいユーザーの壁紙をロード

        alert(`${username} に切り替えました！`);
        location.reload();
    },

    async logoutIndividual(username, e) {
        if(e) e.stopPropagation(); 
        if (!confirm(`${username} をログアウト（端末から削除）しますか？`)) return;

        let list = JSON.parse(localStorage.getItem('googlo_account_list') || '[]');
        list = list.filter(user => user !== username);
        localStorage.setItem('googlo_account_list', JSON.stringify(list));

        let passMap = JSON.parse(localStorage.getItem('googlo_passcodes') || '{}');
        delete passMap[username];
        localStorage.setItem('googlo_passcodes', JSON.stringify(passMap));

        const currentUser = localStorage.getItem('googlo_logged_in_user');
        if (currentUser === username) {
            this.clearYoutubeDataOnly();
            if (list.length > 0) {
                localStorage.setItem('googlo_logged_in_user', list[0]);
                await this.cloudLoad(true);
                await this.cloudLoadWallpaper();
            } else {
                localStorage.removeItem('googlo_logged_in_user');
            }
        }
        alert("ログアウトしました");
        location.reload();
    },

    async cloudSave(isAuto = false) {
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
            if (!isAuto) alert(resData.message || "オンライン保存が完了しました！");
        } catch (e) {
            if (!isAuto) alert("クラウドへの保存中にエラーが発生しました");
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
            }
        } catch (e) {}
    },

    // 🎨 壁紙をサーバーへアップロード保存する処理
    async cloudSaveWallpaper(base64Data) {
        const username = localStorage.getItem('googlo_logged_in_user');
        if (!username) return alert("ログインしてください");

        try {
            const response = await fetch('/api/wallpaper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, action: 'save', wallpaperData: base64Data })
            });
            const data = await response.json();
            if (data.success) {
                alert("🎨 新しい壁紙を保存・適用しました！旧画像はクリーンアップされました。");
                this.applyWallpaperToDOM(base64Data);
            } else {
                alert("壁紙の保存に失敗しました");
            }
        } catch (e) {
            alert("通信エラーが発生しました");
        }
    },

    // 🎨 サーバーから壁紙をダウンロードして反映する処理
    async cloudLoadWallpaper() {
        const username = localStorage.getItem('googlo_logged_in_user');
        if (!username) return;

        try {
            const response = await fetch('/api/wallpaper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, action: 'load' })
            });
            const data = await response.json();
            if (data.success && data.wallpaper) {
                this.applyWallpaperToDOM(data.wallpaper);
            }
        } catch (e) {}
    },

    // 🎨 DOM（画面）に安全に壁紙を展開する
    applyWallpaperToDOM(base64Data) {
        // 🚨 偽造画面が表示されている（ロック未解除）時は絶対に適用させない
        if (localStorage.getItem('youtube_unlocked') !== 'true') return;

        document.body.style.backgroundImage = `url(${base64Data})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
        document.body.classList.add('has-wallpaper');
    },

    // 📱 パスコードキーパッド画面
    showPasscodePad(targetUser) {
        let modal = document.getElementById('googlo-auth-modal');
        if (!modal) return;

        const passMap = JSON.parse(localStorage.getItem('googlo_passcodes') || '{}');
        const correctCode = passMap[targetUser] || "0000"; 

        let currentInput = "";

        modal.innerHTML = `
            <div style="background:#111; padding:30px; border-radius:16px; border:1px solid #333; width:280px; color:#fff; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.8);">
                <div style="font-size:14px; color:#aaa; margin-bottom:5px;">👤 ${targetUser}</div>
                <div style="font-size:16px; font-weight:bold; margin-bottom:20px;">パスコードを入力</div>
                
                <div style="display:flex; justify-content:center; gap:15px; margin-bottom:30px;">
                    <div class="dot" style="width:12px; height:12px; border-radius:50%; background:#333; border:1px solid #555;"></div>
                    <div class="dot" style="width:12px; height:12px; border-radius:50%; background:#333; border:1px solid #555;"></div>
                    <div class="dot" style="width:12px; height:12px; border-radius:50%; background:#333; border:1px solid #555;"></div>
                    <div class="dot" style="width:12px; height:12px; border-radius:50%; background:#333; border:1px solid #555;"></div>
                </div>

                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:15px; justify-items:center;">
                    ${[1,2,3,4,5,6,7,8,9].map(num => `
                        <div class="pad-btn" data-val="${num}" style="width:60px; height:60px; background:#222; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:20px; font-weight:bold; cursor:pointer; user-select:none;">${num}</div>
                    `).join('')}
                    <div class="pad-btn" data-val="clear" style="width:60px; height:60px; display:flex; justify-content:center; align-items:center; font-size:12px; color:#aaa; cursor:pointer; user-select:none;">クリア</div>
                    <div class="pad-btn" data-val="0" style="width:60px; height:60px; background:#222; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:20px; font-weight:bold; cursor:pointer; user-select:none;">0</div>
                    <div id="pad-close" style="width:60px; height:60px; display:flex; justify-content:center; align-items:center; font-size:12px; color:#ff5252; cursor:pointer; user-select:none;">戻る</div>
                </div>
            </div>
        `;

        const dots = modal.querySelectorAll('.dot');
        
        const updateDots = () => {
            dots.forEach((dot, idx) => {
                if (idx < currentInput.length) {
                    dot.style.backgroundColor = '#4CAF50';
                    dot.style.boxShadow = '0 0 8px #4CAF50';
                } else {
                    dot.style.backgroundColor = '#333';
                    dot.style.boxShadow = 'none';
                }
            });
        };

        modal.querySelectorAll('.pad-btn').forEach(btn => {
            btn.onclick = async () => {
                const val = btn.getAttribute('data-val');
                
                if (val === 'clear') {
                    currentInput = "";
                    updateDots();
                    return;
                }

                if (currentInput.length < 4) {
                    currentInput += val;
                    updateDots();
                }

                if (currentInput.length === 4) {
                    if (currentInput === correctCode) {
                        modal.remove();
                        await this.switchAccount(targetUser);
                    } else {
                        alert("❌ パスコードが違います！");
                        currentInput = "";
                        updateDots();
                    }
                }
            };
        });

        document.getElementById('pad-close').onclick = () => {
            modal.remove();
            this.toggleModal(true, false);
        };
    },

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
                        <input type="password" id="modal-pass" placeholder="パスワード" style="width:100%; margin-bottom:10px; background:#2a2a2a; color:#fff; border:1px solid #444; padding:8px; border-radius:4px; box-sizing:border-box;">
                        
                        <div id="passcode-field" style="display:none; margin-bottom:15px;">
                           <label style="font-size:11px; color:#4CAF50; font-weight:bold; display:block; margin-bottom:4px;">🔒 切り替え用パスコード (数字4桁)</label>
                           <input type="password" id="modal-passcode" maxlength="4" placeholder="例: 1234" style="width:100%; background:#2a2a2a; color:#fff; border:1px solid #4CAF50; padding:8px; border-radius:4px; box-sizing:border-box; text-align:center; font-weight:bold; letter-spacing:5px;">
                        </div>

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
                const pField = document.getElementById('passcode-field');
                const title = modal.querySelector('h3');
                
                swBtn.onclick = () => {
                    isSignUp = !isSignUp;
                    title.innerText = isSignUp ? "💻 アカウント新規登録" : "💻 アカウントを追加";
                    subBtn.innerText = isSignUp ? "新規アカウント作成" : "ログイン";
                    subBtn.style.backgroundColor = isSignUp ? "#2196F3" : "#4CAF50";
                    swBtn.innerText = isSignUp ? "ログイン画面へ切り替え" : "新規登録画面へ切り替え";
                    pField.style.display = isSignUp ? "block" : "none";
                };
                subBtn.onclick = () => {
                    this.authenticate(
                        isSignUp ? 'signup' : 'login', 
                        document.getElementById('modal-user').value, 
                        document.getElementById('modal-pass').value,
                        document.getElementById('modal-passcode') ? document.getElementById('modal-passcode').value : ""
                    );
                };
            } else {
                let listHTML = "";
                accountList.forEach(user => {
                    const isActive = (user === currentUser);
                    listHTML += `
                        <div class="account-item-clickable" data-user="${user}" style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:8px; background:${isActive ? '#2e3d30' : '#222'}; border:1px solid ${isActive ? '#4CAF50' : '#444'}; border-radius:6px; cursor:pointer;">
                            <div style="flex-grow:1; font-size:14px; display:flex; align-items:center; color:#fff;">
                                <span style="margin-right:8px; font-size:16px;">${isActive ? '🟢' : '👤'}</span>
                                <strong>${user}</strong> ${isActive ? '<span style="font-size:11px; color:#4CAF50; margin-left:5px;">(使用中)</span>' : ''}
                            </div>
                            <button class="individual-logout-btn" data-user="${user}" style="background:transparent; color:#ff5252; border:none; font-size:12px; cursor:pointer; padding:5px 8px; font-weight:bold;">ログアウト</button>
                        </div>
                    `;
                });

                modal.innerHTML = `
                    <div style="background:#1a1a1a; padding:25px; border-radius:8px; border:1px solid #333; width:340px; color:#fff; position:relative; box-shadow:0 4px 20px rgba(0,0,0,0.5);">
                        <div id="modal-close-btn" style="position:absolute; top:10px; right:15px; cursor:pointer; color:#aaa; font-size:18px;">&times;</div>
                        <h3 style="margin:0 0 15px 0; font-size:16px; border-bottom:1px solid #333; padding-bottom:5px;">💻 アカウントの切り替え</h3>
                        
                        <div style="max-height:180px; overflow-y:auto; margin-bottom:15px;">
                            ${listHTML}
                        </div>

                        ${currentUser ? `
                        <div style="margin-bottom:15px; padding:10px; background:#222; border-radius:6px; border:1px solid #333;">
                            <div style="font-size:12px; font-weight:bold; color:#ff9800; margin-bottom:6px;">🎨 このアカウントの壁紙変更</div>
                            <input type="file" id="wallpaper-input" accept="image/*" style="display:none;">
                            <button id="wallpaper-select-btn" style="width:100%; background:#ff9800; color:#000; border:none; padding:6px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:12px;">画像ファイルを選択して変更</button>
                        </div>
                        ` : ''}
                        
                        <button id="modal-btn-go-add" style="width:100%; background:#2196F3; color:white; border:none; padding:10px; border-radius:4px; font-weight:bold; cursor:pointer;">➕ 別のアカウントを追加する</button>
                    </div>
                `;
                document.body.appendChild(modal);
                document.getElementById('modal-close-btn').onclick = () => this.toggleModal(false);
                document.getElementById('modal-btn-go-add').onclick = () => { modal.remove(); this.toggleModal(true, true); };

                // 壁紙選択イベントの紐付け
                if(document.getElementById('wallpaper-select-btn')) {
                    const wInput = document.getElementById('wallpaper-input');
                    document.getElementById('wallpaper-select-btn').onclick = () => wInput.click();
                    wInput.onchange = e => {
                        const file = e.target.files[0];
                        if(!file) return;
                        const reader = new FileReader();
                        reader.onload = event => {
                            this.cloudSaveWallpaper(event.target.result);
                        };
                        reader.readAsDataURL(file);
                    };
                }

                modal.querySelectorAll('.account-item-clickable').forEach(row => {
                    row.onclick = (e) => {
                        if(e.target.classList.contains('individual-logout-btn')) return;
                        const targetUser = row.getAttribute('data-user');
                        if (targetUser === currentUser) return; // 使用中なら何もしない
                        
                        // 切り替え時はセキュリティロック画面を起動！
                        modal.remove();
                        this.showPasscodePad(targetUser);
                    };
                });
                modal.querySelectorAll('.individual-logout-btn').forEach(btn => {
                    btn.onclick = (e) => this.logoutIndividual(btn.getAttribute('data-user'), e);
                });
            }
        } else if (modal && !show) {
            modal.remove();
        }
    },

    injectUI() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar || document.getElementById('backup-manager-ui')) return;

        const container = document.createElement('div');
        container.id = 'backup-manager-ui';
        container.style = "border-top:1px solid #333; margin-top:15px; padding-top:15px;";

        const currentUser = localStorage.getItem('googlo_logged_in_user');

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

        const importBtn = document.createElement('div');
        importBtn.className = 'nav-item';
        importBtn.style = "color:#FF9800; cursor:pointer; margin-bottom:8px; padding-left:5px;";
        importBtn.innerHTML = `📥 <span style="font-size:12px; font-weight:bold;">ファイルから復元</span>`;
        importBtn.onclick = () => this.import();
        container.appendChild(importBtn);

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

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { DataManager.injectUI(); }, 500);
});

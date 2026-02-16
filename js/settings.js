import { ApiManager } from './api-manager.js';

const modal = document.getElementById('settings-modal');
const trigger = document.getElementById('settings-trigger');
const saveBtn = document.getElementById('save-settings-btn');

/**
 * 設定モーダルを開く機能
 */
function openSettings() {
    const apiInputsContainer = document.getElementById('api-inputs');
    const keys = ApiManager.getKeys();
    const currentIndex = ApiManager.getCurrentIndex();

    // 5つの入力欄を生成（ラジオボタンで選択可能に）
    apiInputsContainer.innerHTML = keys.map((key, i) => `
        <div style="margin-bottom: 15px; display: flex; align-items: center; background: #333; padding: 10px; border-radius: 8px;">
            <input type="radio" name="active_key" value="${i}" ${i === currentIndex ? 'checked' : ''} style="width: 20px; height: 20px;">
            <div style="flex:1; margin-left:15px;">
                <label style="font-size: 12px; color: #aaa;">API Key ${i + 1}</label>
                <input type="text" id="key-${i}" value="${key}" placeholder="キーを入力..." style="width: 100%; background: transparent; border: none; border-bottom: 1px solid #555; color: white; outline: none; padding: 5px 0;">
            </div>
        </div>
    `).join('');
    
    modal.style.display = 'flex';
}

/**
 * 設定を保存して閉じる機能
 */
function saveSettings() {
    const newKeys = [];
    for (let i = 0; i < 5; i++) {
        const val = document.getElementById(`key-${i}`).value;
        newKeys.push(val);
    }
    
    const selectedRadio = document.querySelector('input[name="active_key"]:checked');
    if (selectedRadio) {
        ApiManager.setCurrentIndex(selectedRadio.value);
    }
    
    ApiManager.saveKeys(newKeys);
    modal.style.display = 'none';
    console.log("Settings saved.");
}

// ボタンに機能を割り当てる（イベントリスナー）
if (trigger) {
    trigger.addEventListener('click', openSettings);
}

if (saveBtn) {
    saveBtn.addEventListener('click', saveSettings);
}

// モーダルの外側をクリックしたら閉じる機能（おまけ）
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

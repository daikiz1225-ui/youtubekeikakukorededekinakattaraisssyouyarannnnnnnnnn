import { ApiManager } from './api-manager.js';

const modal = document.getElementById('settings-modal');

// 設定画面を開く
window.toggleSettings = () => {
    const apiInputsContainer = document.getElementById('api-inputs');
    const keys = ApiManager.getKeys();
    const currentIndex = ApiManager.getCurrentIndex();

    // 5つの入力欄を生成
    apiInputsContainer.innerHTML = keys.map((key, i) => `
        <div style="margin-bottom: 10px; display: flex; align-items: center;">
            <input type="radio" name="active_key" value="${i}" ${i === currentIndex ? 'checked' : ''}>
            <input type="text" id="key-${i}" value="${key}" placeholder="API Key ${i + 1}" style="flex:1; margin-left:10px;">
        </div>
    `).join('');
    
    modal.style.display = 'flex';
};

// 保存して閉じる
window.saveApiSettings = () => {
    const newKeys = [];
    for (let i = 0; i < 5; i++) {
        newKeys.push(document.getElementById(`key-${i}`).value);
    }
    const selectedIndex = document.querySelector('input[name="active_key"]:checked').value;
    
    ApiManager.saveKeys(newKeys);
    ApiManager.setCurrentIndex(selectedIndex);
    
    modal.style.display = 'none';
    alert("設定を保存しました！");
};

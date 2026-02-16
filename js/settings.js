import { InstanceManager } from './instance-manager.js';

const modal = document.getElementById('settings-modal');
const trigger = document.getElementById('settings-trigger');
const saveBtn = document.getElementById('save-settings-btn');

/**
 * 設定モーダルを開く機能（Pipedドメイン入力欄を1つ生成）
 */
function openSettings() {
    const apiInputsContainer = document.getElementById('api-inputs');
    const currentDomain = InstanceManager.getDomain();

    // 入力欄を1つだけにスッキリさせる
    apiInputsContainer.innerHTML = `
        <div style="margin-bottom: 15px; background: #333; padding: 15px; border-radius: 8px;">
            <label style="font-size: 12px; color: #aaa; display: block; margin-bottom: 8px;">Piped インスタンスドメイン</label>
            <input type="text" id="piped-domain" value="${currentDomain}" 
                   placeholder="例: pipedapi.kavin.rocks" 
                   style="width: 100%; background: transparent; border: none; border-bottom: 2px solid var(--accent-red); color: white; outline: none; padding: 5px 0; font-size: 16px;">
            <p style="font-size: 11px; color: #888; margin-top: 10px;">
                ※ https:// は入れずにドメイン名だけ入力してね。
            </p>
        </div>
    `;
    
    modal.style.display = 'flex';
}

/**
 * 設定を保存して閉じる機能
 */
function saveSettings() {
    const domainInput = document.getElementById('piped-domain');
    if (domainInput) {
        InstanceManager.saveDomain(domainInput.value.trim());
        modal.style.display = 'none';
        alert("設定を保存したぜ！");
    }
}

// ボタンにイベントを紐付け
if (trigger) trigger.addEventListener('click', openSettings);
if (saveBtn) saveBtn.addEventListener('click', saveSettings);

// モーダルの外側をクリックしたら閉じる
window.addEventListener('click', (event) => {
    if (event.target === modal) modal.style.display = 'none';
});

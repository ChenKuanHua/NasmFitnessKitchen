class AuthManager {
    constructor() {
        this.tokenClient = null;
        this.userData = null;
        this.isAdmin = false;
        
        document.addEventListener("DOMContentLoaded", () => {
            this.initEvents();
        });
    }

    initEvents() {
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (loginBtn) loginBtn.addEventListener('click', () => this.login());
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
    }

    initializeGoogleClient() {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.CLIENT_ID,
            scope: CONFIG.SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    this.handleSuccessLogin(tokenResponse.access_token);
                }
            }
        });
    }

    login() {
        if (this.tokenClient) {
            this.tokenClient.requestAccessToken();
        } else {
            if (window.app) window.app.showToast('Google 用戶端載入中，請稍後...', 'error');
        }
    }

    async handleSuccessLogin(token) {
        if (window.app) window.app.setLoading(true);
        api.setToken(token);
        
        try {
            // 透過 accessToken 到 oauth API 取得使用者 profile (包含了 email)
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error("無法取得使用者資訊");
            
            this.userData = await res.json();
            
            // 下載資料表 (來自 app.js 的調用)
            if (window.app) {
                await window.app.loadAppData();
                
                // 檢查是否為管理員
                const admins = window.app.state.admins;
                this.isAdmin = admins.some(a => 
                    a.Email && this.userData.email && 
                    a.Email.toLowerCase() === this.userData.email.toLowerCase()
                );
            }
            
            this.updateUI();
        } catch (e) {
            console.error(e);
            if (window.app) window.app.showToast(`登入或載入失敗: ${e.message}`, 'error');
        } finally {
            if (window.app) window.app.setLoading(false);
        }
    }
    
    updateUI() {
        document.getElementById('login-btn').classList.add('hidden');
        document.getElementById('user-info').classList.remove('hidden');
        
        const overlay = document.getElementById('login-overlay');
        if (overlay) overlay.classList.add('hidden');
        
        const role = this.isAdmin ? '教練主廚' : '老饕食客';
        document.getElementById('user-greeting').innerText = `嗨！${this.userData.name} (${role})`;
        
        if (this.isAdmin) {
            document.getElementById('admin-add-btn').classList.remove('hidden');
        } else {
            document.getElementById('admin-add-btn').classList.add('hidden');
        }
    }

    logout() {
        api.setToken(null);
        this.userData = null;
        this.isAdmin = false;
        
        if (window.app) window.app.resetApp();
        
        document.getElementById('login-btn').classList.remove('hidden');
        document.getElementById('user-info').classList.add('hidden');
        document.getElementById('admin-add-btn').classList.add('hidden');
        document.getElementById('user-greeting').innerText = '';
        
        const overlay = document.getElementById('login-overlay');
        if (overlay) overlay.classList.remove('hidden');
        
        if (window.app) window.app.showToast('已登出', 'success');
    }
}

const authManager = new AuthManager();

// 當 Google Script 載入完成時會呼叫此
window.onload = () => {
    if (window.google) {
        authManager.initializeGoogleClient();
    } else {
        console.warn("Google API 尚未載入");
    }
};

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('tlu_user') || 'null');
}

function getAuthHeaders() {
    const user = getCurrentUser();
    return user ? { 'Content-Type': 'application/json', 'x-user-id': String(user.id) } : { 'Content-Type': 'application/json' };
}

function getAdminPagePath() {
    return window.location.pathname.includes('/pages/') ? 'admin.html' : 'pages/admin.html';
}

function getProfilePagePath() {
    return window.location.pathname.includes('/pages/') ? 'profile.html' : 'pages/profile.html';
}

function injectAuthModal() {
    if (document.getElementById('authModal')) return;

    const modalHtml = `
        <div id="authModal" class="tlu-modal">
            <div class="tlu-modal-box">
                <span class="tlu-modal-close" onclick="closeAuthModal()">&times;</span>
                <div class="tlu-modal-tabs">
                    <button type="button" id="tabLoginBtn" class="active" onclick="switchAuthTab('login')">Đăng nhập</button>
                    <button type="button" id="tabRegisterBtn" onclick="switchAuthTab('register')">Đăng ký</button>
                </div>

                <form id="loginFormBox" onsubmit="submitLogin(event)">
                    <input type="text" id="authLoginUser" placeholder="Tên đăng nhập (vd: user1, staff, admin)" required>
                    <input type="password" id="authLoginPass" placeholder="Mật khẩu (mặc định: 1)" required>
                    <button type="submit" class="tlu-modal-submit">Đăng nhập</button>
                </form>

                <form id="registerFormBox" style="display:none;" onsubmit="submitRegister(event)">
                    <input type="text" id="authRegName" placeholder="Họ và tên sinh viên / giảng viên" required>
                    <input type="text" id="authRegUser" placeholder="Tên đăng nhập" required>
                    <input type="password" id="authRegPass" placeholder="Mật khẩu" required>
                    <button type="submit" class="tlu-modal-submit" style="background: var(--blue);">Đăng ký tài khoản</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openAuthModal(e) {
    if (e) e.preventDefault();
    injectAuthModal();
    document.getElementById('authModal').style.display = 'flex';
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
}

function switchAuthTab(mode) {
    const isLogin = mode === 'login';
    document.getElementById('loginFormBox').style.display = isLogin ? 'flex' : 'none';
    document.getElementById('registerFormBox').style.display = isLogin ? 'none' : 'flex';
    document.getElementById('tabLoginBtn').classList.toggle('active', isLogin);
    document.getElementById('tabRegisterBtn').classList.toggle('active', !isLogin);
}

async function submitLogin(e) {
    e.preventDefault();
    const username = document.getElementById('authLoginUser').value.trim();
    const password = document.getElementById('authLoginPass').value.trim();

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.error || 'Sai tên đăng nhập hoặc mật khẩu!');
            return;
        }
        localStorage.setItem('tlu_user', JSON.stringify(data.user));
        closeAuthModal();
        renderHeaderAuth();
        window.dispatchEvent(new Event('authChanged'));
    } catch (err) {
        alert('Không kết nối được tới server MySQL!');
    }
}

async function submitRegister(e) {
    e.preventDefault();
    const full_name = document.getElementById('authRegName').value.trim();
    const username = document.getElementById('authRegUser').value.trim();
    const password = document.getElementById('authRegPass').value.trim();

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, full_name })
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.error || 'Đăng ký thất bại!');
            return;
        }
        localStorage.setItem('tlu_user', JSON.stringify(data.user));
        alert('Đăng ký tài khoản thành công!');
        closeAuthModal();
        renderHeaderAuth();
        window.dispatchEvent(new Event('authChanged'));
    } catch (err) {
        alert('Không kết nối được tới server MySQL!');
    }
}

function logoutUser(e) {
    if (e) e.preventDefault();
    localStorage.removeItem('tlu_user');
    renderHeaderAuth();
    window.dispatchEvent(new Event('authChanged'));
}

function toggleUserDropdown(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const menu = document.getElementById('userDropdownMenu');
    if (menu) menu.classList.toggle('show');
}

document.addEventListener('click', (e) => {
    const wrapper = document.querySelector('.user-menu-wrapper');
    const menu = document.getElementById('userDropdownMenu');
    if (wrapper && menu && !wrapper.contains(e.target)) {
        menu.classList.remove('show');
    }
});

function renderHeaderAuth() {
    const area = document.getElementById('authArea');
    if (!area) return;

    const user = getCurrentUser();
    if (!user) {
        area.innerHTML = `<a href="#" class="login" onclick="openAuthModal(event)">⇥ Đăng nhập</a>`;
        return;
    }

    const isManager = user.role === 'admin' || user.role === 'staff';
    const roleLabel = user.role === 'admin' ? 'Quản trị viên' : (user.role === 'staff' ? 'Nhân viên thư viện' : 'Sinh viên / Độc giả');
    const initial = (user.full_name || 'U').trim().charAt(0).toUpperCase();

    const adminItemHtml = isManager
        ? `<a href="${getAdminPagePath()}" class="dropdown-item">⚙️ Quản trị hệ thống</a>`
        : '';

    area.innerHTML = `
        <div class="user-menu-wrapper">
            <button type="button" class="user-pill-btn" onclick="toggleUserDropdown(event)">
                <span class="user-pill-avatar">${initial}</span>
                <span class="user-pill-name">${user.full_name}</span>
                <span class="user-pill-arrow">▾</span>
            </button>

            <div id="userDropdownMenu" class="user-dropdown-menu">
                <div class="dropdown-user-header">
                    <strong>${user.full_name}</strong>
                    <span>${roleLabel}</span>
                </div>
                <a href="${getProfilePagePath()}" class="dropdown-item">👤 Hồ sơ & Sách đang mượn</a>
                ${adminItemHtml}
                <div class="dropdown-divider"></div>
                <a href="#" class="dropdown-item dropdown-logout" onclick="logoutUser(event)">⇥ Đăng xuất</a>
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    injectAuthModal();
    renderHeaderAuth();
});

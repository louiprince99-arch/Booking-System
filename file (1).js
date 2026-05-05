// js/auth.js - Authentication management

let currentUser = null;

function initAuth() {
    // Check for stored session
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        showMainApp();
    }
}

function login(email, password) {
    const users = DataStore.getAll('users');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = { ...user };
        delete currentUser.password;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showMainApp();
        return true;
    }
    return false;
}

function loginAsAdmin() {
    login('admin@company.com', 'admin');
}

function loginAsUser() {
    login('john@company.com', 'user');
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showLoginScreen();
}

function showLoginScreen() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('mainApp').classList.remove('active');
}

function showMainApp() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    
    // Update user info
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role;
    document.getElementById('userAvatar').textContent = getInitials(currentUser.name);
    
    // Show/hide admin tab
    const adminItem = document.querySelector('.nav-item[data-tab="admin"]');
    if (currentUser.role === 'admin') {
        adminItem.classList.add('visible');
    } else {
        adminItem.classList.remove('visible');
    }
    
    // Initialize app
    initApp();
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function isAdmin() {
    return currentUser?.role === 'admin';
}

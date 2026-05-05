// js/admin.js - Admin portal functionality

let editingRoomId = null;

function initAdmin() {
    // Admin tab switching
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.admin-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`admin${capitalize(btn.dataset.adminTab)}`).classList.add('active');
        });
    });
    
    // Admin floor select changes
    document.getElementById('adminDeskFloor')?.addEventListener('change', renderAdminDesks);
    document.getElementById('adminRoomFloor')?.addEventListener('change', renderAdminRooms);
    
    // Initial renders
    renderAdminFloors();
    renderAdminDesks();
    renderAdminRooms();
    renderAdminEquipment();
    renderAdminUsers();
    
    // File upload handler
    document.getElementById('floorMap')?.addEventListener('change', handleMapUpload);
    
    // Icon selector
    document.querySelectorAll('.icon-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.icon-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Floor Management
function renderAdminFloors() {
    const floors = DataStore.getAll('floors');
    const container = document.getElementById('floorsList');
    
    if (floors.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-layer-group"></i>
                <p>No floors added yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = floors.map(floor => `
        <div class="admin-list-item">
            <div class="list-item-info">
                <div class="list-item-icon">
                    <i class="fas fa-layer-group"></i>
                </div>
                <div class="list-item-details">
                    <h4>${floor.name}</h4>
                    <p>Level ${floor.number} • ${DataStore.getDesksByFloor(floor.id).length} desks • ${DataStore.getRoomsByFloor(floor.id).length} rooms</p>
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-outline btn-small" onclick="editFloor(${floor.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-outline btn-small" onclick="deleteFloor(${floor.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function openAddFloorModal() {
    document.getElementById('floorName').value = '';
    document.getElementById('floorNumber').value = '';
    document.getElementById('mapPreview').innerHTML = '';
    openModal('addFloorModal');
}

function handleMapUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('mapPreview').innerHTML = `
                <img src="${event.target.result}" alt="Map Preview">
            `;
        };
        reader.readAsDataURL(file);
    }
}

function saveFloor() {
    const name = document.getElementById('floorName').value.trim();
    const number = parseInt(document.getElementById('floorNumber').value);
    const mapPreview = document.querySelector('#mapPreview img');
    
    if (!name) {
        showToast('Please enter a floor name', 'error');
        return;
    }
    
    const floorData = {
        name,
        number: number || 0,
        mapImage: mapPreview?.src || generatePlaceholderMap(name)
    };
    
    DataStore.add('floors', floorData);
    closeModal('addFloorModal');
    showToast('Floor added successfully!', 'success');
    renderAdminFloors();
    populateFloorSelectors();
}

function generatePlaceholderMap(name) {
    const svg = `<svg width="800" height="600" xmlns="[w3.org](http://www.w3.org/2000/svg)">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <rect x="50" y="50" width="700" height="500" fill="#fff" stroke="#e5e7eb" stroke-width="2"/>
        <text x="400" y="300" text-anchor="middle" fill="#9ca3af" font-size="24" font-family="sans-serif">${name} Map</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

function deleteFloor(id) {
    if (confirm('Are you sure you want to delete this floor? All associated desks and rooms will also be deleted.')) {
        // Delete associated desks and rooms
        const desks = DataStore.getDesksByFloor(id);
        desks.forEach(d => DataStore.delete('desks', d.id));
        
        const rooms = DataStore.getRoomsByFloor(id);
        rooms.forEach(r => DataStore.delete('meetingRooms', r.id));
        
        DataStore.delete('floors', id);
        showToast('Floor deleted', 'success');
        renderAdminFloors();
        populateFloorSelectors();
    }
}

// Desk Management
function renderAdminDesks() {
    const floorId = parseInt(document.getElementById('adminDeskFloor')?.value);
    if (!floorId) return;
    
    const desks = DataStore.getDesksByFloor(floorId);
    const container = document.getElementById('desksList');
    
    if (desks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chair"></i>
                <p>No desks on this floor. Use the map editor to add desks.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = desks.map(desk => `
        <div class="admin-list-item">
            <div class="list-item-info">
                <div class="list-item-icon">
                    <i class="fas fa-chair"></i>
                </div>
                <div class="list-item-details">
                    <h4>${desk.name}</h4>
                    <p>Position: ${desk.x}%, ${desk.y}%</p>
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-outline btn-small" onclick="deleteDesk(${desk.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function deleteDesk(id) {
    if (confirm('Are you sure you want to delete this desk?')) {
        // Delete associated bookings
        const bookings = DataStore.getAll('deskBookings').filter(b => b.deskId === id);
        bookings.forEach(b => DataStore.delete('deskBookings', b.id));
        
        DataStore.delete('desks', id);
        showToast('Desk deleted', 'success');
        renderAdminDesks();
        renderDeskMap();
    }
}

// Room Management
function renderAdminRooms() {
    const floorId = parseInt(document.getElementById('adminRoomFloor')?.value);
    if (!floorId) return;
    
    const rooms = DataStore.getRoomsByFloor(floorId);
    const equipment = DataStore.getAll('equipment');
    const container = document.getElementById('roomsList');
    
    if (rooms.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-door-open"></i>
                <p>No meeting rooms on this floor</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = rooms.map(room => {
        const roomEquipment = equipment.filter(e => room.equipment?.includes(e.id));
        return `
            <div class="admin-list-item">
                <div class="list-item-info">
                    <div class="list-item-icon">
                        <i class="fas fa-door-open"></i>
                    </div>
                    <div class="list-item-details">
                        <h4>${room.name}</h4>
                        <p>Capacity: ${room.capacity} • ${roomEquipment.length} equipment items</p>
                    </div>
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-outline btn-small" onclick="openRoomEquipmentModal(${room.id})" title="Manage Equipment">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn btn-outline btn-small" onclick="editRoom(${room.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline btn-small" onclick="deleteRoom(${room.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function openAddRoomModal() {
    editingRoomId = null;
    document.getElementById('roomModalTitle').textContent = 'Add Meeting Room';
    document.getElementById('roomName').value = '';
    document.getElementById('roomCapacity').value = '6';
    
    // Populate floor select
    const floors = DataStore.getAll('floors');
    document.getElementById('roomFloor').innerHTML = floors.map(f => 
        `<option value="${f.id}">${f.name}</option>`
    ).join('');
    
    // Populate equipment checkboxes
    renderRoomEquipmentSelector([]);
    
    openModal('addRoomModal');
}

function renderRoomEquipmentSelector(selectedEquipment) {
    const equipment = DataStore.getAll('equipment');
    document.getElementById('roomEquipmentList').innerHTML = equipment.map(e => `
        <label class="equipment-toggle ${selectedEquipment.includes(e.id) ? 'active' : ''}" 
               onclick="this.classList.toggle('active')" data-equipment-id="${e.id}">
            <i class="fas ${e.icon}"></i>
            ${e.name}
        </label>
    `).join('');
}

function editRoom(id) {
    const room = DataStore.getById('meetingRooms', id);
    if (!room) return;
    
    editingRoomId = id;
    document.getElementById('roomModalTitle').textContent = 'Edit Meeting Room';
    document.getElementById('roomName').value = room.name;
    document.getElementById('roomCapacity').value = room.capacity;
    document.getElementById('roomFloor').value = room.floorId;
    
    renderRoomEquipmentSelector(room.equipment || []);
    
    openModal('addRoomModal');
}

function saveRoom() {
    const name = document.getElementById('roomName').value.trim();
    const capacity = parseInt(document.getElementById('roomCapacity').value);
    const floorId = parseInt(document.getElementById('roomFloor').value);
    
    if (!name) {
        showToast('Please enter a room name', 'error');
        return;
    }
    
    // Get selected equipment
    const equipmentElements = document.querySelectorAll('#roomEquipmentList .equipment-toggle.active');
    const equipment = Array.from(equipmentElements).map(el => parseInt(el.dataset.equipmentId));
    
    const roomData = {
        name,
        capacity,
        floorId,
        equipment
    };
    
    if (editingRoomId) {
        DataStore.update('meetingRooms', editingRoomId, roomData);
        showToast('Room updated successfully!', 'success');
    } else {
        DataStore.add('meetingRooms', roomData);
        showToast('Room added successfully!', 'success');
    }
    
    closeModal('addRoomModal');
    renderAdminRooms();
    renderMeetingRooms();
}

function deleteRoom(id) {
    if (confirm('Are you sure you want to delete this room?')) {
        // Delete associated bookings
        const bookings = DataStore.getAll('meetingBookings').filter(b => b.roomId === id);
        bookings.forEach(b => DataStore.delete('meetingBookings', b.id));
        
        DataStore.delete('meetingRooms', id);
        showToast('Room deleted', 'success');
        renderAdminRooms();
        renderMeetingRooms();
    }
}

function openRoomEquipmentModal(roomId) {
    const room = DataStore.getById('meetingRooms', roomId);
    if (!room) return;
    
    document.getElementById('equipmentRoomName').textContent = room.name;
    
    const equipment = DataStore.getAll('equipment');
    const container = document.getElementById('equipmentManager');
    
    container.innerHTML = `
        ${equipment.map(e => {
            const hasEquipment = room.equipment?.includes(e.id);
            return `
                <div class="equipment-item">
                    <div class="equipment-item-info">
                        <i class="fas ${e.icon}"></i>
                        <span>${e.name}</span>
                    </div>
                    <button class="btn ${hasEquipment ? 'btn-danger' : 'btn-success'} btn-small" 
                            onclick="toggleRoomEquipment(${roomId}, ${e.id}, ${hasEquipment})">
                        <i class="fas ${hasEquipment ? 'fa-minus' : 'fa-plus'}"></i>
                    </button>
                </div>
            `;
        }).join('')}
    `;
    
    openModal('roomEquipmentModal');
}

function toggleRoomEquipment(roomId, equipmentId, currentlyHas) {
    const room = DataStore.getById('meetingRooms', roomId);
    if (!room) return;
    
    let equipment = room.equipment || [];
    
    if (currentlyHas) {
        equipment = equipment.filter(id => id !== equipmentId);
    } else {
        equipment.push(equipmentId);
    }
    
    DataStore.update('meetingRooms', roomId, { equipment });
    openRoomEquipmentModal(roomId); // Refresh
    renderAdminRooms();
    renderMeetingRooms();
}

// Equipment Management
function renderAdminEquipment() {
    const equipment = DataStore.getAll('equipment');
    const container = document.getElementById('equipmentList');
    
    if (equipment.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tv"></i>
                <p>No equipment types added yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = equipment.map(e => `
        <div class="admin-list-item">
            <div class="list-item-info">
                <div class="list-item-icon">
                    <i class="fas ${e.icon}"></i>
                </div>
                <div class="list-item-details">
                    <h4>${e.name}</h4>
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-outline btn-small" onclick="deleteEquipment(${e.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function openAddEquipmentModal() {
    document.getElementById('equipmentName').value = '';
    document.querySelectorAll('.icon-option').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.icon-option').classList.add('active');
    openModal('addEquipmentModal');
}

function saveEquipment() {
    const name = document.getElementById('equipmentName').value.trim();
    const icon = document.querySelector('.icon-option.active')?.dataset.icon || 'fa-tv';
    
    if (!name) {
        showToast('Please enter an equipment name', 'error');
        return;
    }
    
    DataStore.add('equipment', { name, icon });
    closeModal('addEquipmentModal');
    showToast('Equipment added successfully!', 'success');
    renderAdminEquipment();
}

function deleteEquipment(id) {
    if (confirm('Are you sure you want to delete this equipment type?')) {
        // Remove from all rooms
        const rooms = DataStore.getAll('meetingRooms');
        rooms.forEach(room => {
            if (room.equipment?.includes(id)) {
                room.equipment = room.equipment.filter(e => e !== id);
                DataStore.update('meetingRooms', room.id, { equipment: room.equipment });
            }
        });
        
        DataStore.delete('equipment', id);
        showToast('Equipment deleted', 'success');
        renderAdminEquipment();
        renderAdminRooms();
        renderMeetingRooms();
    }
}

// User Management
function renderAdminUsers() {
    const users = DataStore.getAll('users');
    const container = document.getElementById('usersList');
    
    container.innerHTML = users.map(user => `
        <div class="admin-list-item">
            <div class="list-item-info">
                <div class="list-item-icon" style="background: var(--primary); color: white;">
                    ${getInitials(user.name)}
                </div>
                <div class="list-item-details">
                    <h4>${user.name}</h4>
                    <p>${user.email} • ${user.role}</p>
                </div>
            </div>
            <div class="list-item-actions">
                ${user.id !== currentUser.id ? `
                    <button class="btn btn-outline btn-small" onclick="toggleUserRole(${user.id})">
                        ${user.role === 'admin' ? 'Make User' : 'Make Admin'}
                    </button>
                    <button class="btn btn-outline btn-small" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : '<span style="color: var(--gray-400); font-size: 12px;">Current User</span>'}
            </div>
        </div>
    `).join('');
}

function openAddUserModal() {
    document.getElementById('newUserName').value = '';
    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserRole').value = 'user';
    openModal('addUserModal');
}

function saveUser() {
    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const role = document.getElementById('newUserRole').value;
    
    if (!name || !email) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    // Check for duplicate email
    const existing = DataStore.getAll('users').find(u => u.email === email);
    if (existing) {
        showToast('A user with this email already exists', 'error');
        return;
    }
    
    DataStore.add('users', {
        name,
        email,
        password: 'password', // Default password
        role
    });
    
    closeModal('addUserModal');
    showToast('User added successfully!', 'success');
    renderAdminUsers();
}

function toggleUserRole(id) {
    const user = DataStore.getById('users', id);
    if (user) {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        DataStore.update('users', id, { role: newRole });
        showToast(`User role updated to ${newRole}`, 'success');
        renderAdminUsers();
    }
}

function deleteUser(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        // Delete user's bookings
        const bookings = DataStore.getUserBookings(id);
        bookings.desks.forEach(b => DataStore.delete('deskBookings', b.id));
        bookings.meetings.forEach(b => DataStore.delete('meetingBookings', b.id));
        
        DataStore.delete('users', id);
        showToast('User deleted', 'success');
        renderAdminUsers();
    }
}

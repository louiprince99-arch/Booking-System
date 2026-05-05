// js/admin.js – Full Enhanced Admin Portal
// Handles Floors, 2D Map Uploads, Desks, Rooms, Equipment & Users

let editingRoomId = null;

/* -------------------- INITIALIZATION -------------------- */
function initAdmin() {
  // tab switching
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`admin${capitalize(btn.dataset.adminTab)}`).classList.add('active');
    });
  });

  // build first tab right away
  renderAdminFloors();
  renderAdminDesks();
  renderAdminRooms();
  renderAdminEquipment();
  renderAdminUsers();

  // allow re‑render on select changes if present
  document.getElementById('adminDeskFloor')?.addEventListener('change', renderAdminDesks);
  document.getElementById('adminRoomFloor')?.addEventListener('change', renderAdminRooms);
}

/* -------------------- FLOORS & MAPS -------------------- */
function renderAdminFloors() {
  const container = document.getElementById('adminFloors');
  const floors = DataStore.getAll('floors');

  container.innerHTML = `
    <div class="admin-section-header">
      <h3>Floors & Maps</h3>
      <button class="btn btn-primary" onclick="openAddFloorModal()">
        <i class="fas fa-plus"></i> Add Floor / Upload Map
      </button>
    </div>
  `;

  if (!floors.length) {
    container.innerHTML += `
      <div class="empty-state">
        <i class="fas fa-layer-group"></i>
        <p>No floors yet. Use “Add Floor / Upload Map” to start.</p>
      </div>`;
    return;
  }

  const list = floors.map(f => `
    <div class="admin-list-item">
      <div class="list-item-info">
        <div class="list-item-icon"><i class="fas fa-layer-group"></i></div>
        <div class="list-item-details">
          <h4>${f.name}</h4>
          <p>Level ${f.number ?? 0}</p>
        </div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-outline btn-small" onclick="openReplaceMapModal(${f.id})">
          <i class="fas fa-upload"></i> Replace Map
        </button>
        <button class="btn btn-outline btn-small" onclick="detectSeats(${f.id})">
          <i class="fas fa-wand-magic-sparkles"></i> Auto‑Detect Desks
        </button>
        <button class="btn btn-outline btn-small" onclick="openMapEditor('desk',${f.id})">
          <i class="fas fa-edit"></i> Edit Map
        </button>
        <button class="btn btn-outline btn-small" onclick="deleteFloor(${f.id})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>`).join('');

  container.innerHTML += `<div class="admin-list">${list}</div>`;
}

// open create modal
function openAddFloorModal() {
  const html = `
    <div class="modal active" id="floorModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add Floor / Upload Map</h3>
          <button class="btn-close" onclick="closeFloorModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Floor Name</label>
            <input id="floorName" type="text" placeholder="e.g. Ground Floor" />
          </div>
          <div class="form-group">
            <label>Floor Number</label>
            <input id="floorNumber" type="number" placeholder="0" />
          </div>
          <div class="form-group">
            <label>Upload 2D Floor Map</label>
            <input id="floorMapFile" type="file" accept="image/*" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeFloorModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveFloor()">Save Floor</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function closeFloorModal() {
  const m = document.getElementById('floorModal');
  if (m) m.remove();
}

// replace existing floor map
function openReplaceMapModal(id) {
  const floor = DataStore.getById('floors', id);
  if (!floor) return;
  openAddFloorModal();
  document.getElementById('floorName').value = floor.name;
  document.getElementById('floorNumber').value = floor.number;
  document.getElementById('floorModal').dataset.editId = id;
}

function saveFloor() {
  const name = document.getElementById('floorName').value.trim();
  const number = parseInt(document.getElementById('floorNumber').value) || 0;
  const file = document.getElementById('floorMapFile').files[0];
  if (!name) return showToast('Enter floor name','error');
  const editId = document.getElementById('floorModal').dataset.editId;

  function finish(mapImage) {
    const data = { name, number, mapImage };
    if (editId) DataStore.update('floors', parseInt(editId), data);
    else DataStore.add('floors', data);
    closeFloorModal();
    renderAdminFloors();
    populateFloorSelectors();
    showToast('Floor saved successfully','success');
  }

  if (file) {
    const reader = new FileReader();
    reader.onload = e => finish(e.target.result);
    reader.readAsDataURL(file);
  } else {
    if (editId) finish(DataStore.getById('floors', parseInt(editId)).mapImage);
    else showToast('Please upload an image','error');
  }
}

// generate placeholder desks automatically
function detectSeats(floorId) {
  const floor = DataStore.getById('floors', floorId);
  if (!floor?.mapImage) return showToast('Upload a map first','error');
  if (!confirm('Generate a grid of desks on this floor?')) return;

  DataStore.getDesksByFloor(floorId).forEach(d => DataStore.delete('desks', d.id));

  const cols = 5, rows = 4;
  for (let r=0;r<rows;r++){
    for (let c=0;c<cols;c++){
      DataStore.add('desks',{
        name:`D-${r+1}${c+1}`,
        floorId,
        x:10+c*15,
        y:10+r*15
      });
    }
  }
  showToast('Auto‑detected 20 desks','success');
  renderAdminDesks();
}

/* -------------------- DESKS -------------------- */
function renderAdminDesks() {
  const container = document.getElementById('adminDesks');
  const floors = DataStore.getAll('floors');
  const floorId = floors[0]?.id;
  const desks = floorId ? DataStore.getDesksByFloor(floorId) : [];
  container.innerHTML = `
    <div class="admin-section-header">
      <h3>Manage Desks</h3>
      ${floorId ? `<button class="btn btn-primary" onclick="openMapEditor('desk',${floorId})">
        <i class="fas fa-edit"></i> Edit Map</button>`:''}
    </div>
    ${!floorId ? '<p>No floors exist yet.</p>' :
      !desks.length ? '<p>No desks added. Use Auto‑Detect Desks from Floors tab.</p>' :
      desks.map(d=>`<div class="admin-list-item">
        <div class="list-item-info">
          <i class="fas fa-chair"></i><span>${d.name}</span>
        </div>
        <div class="list-item-actions">
          <button class="btn btn-outline btn-small" onclick="deleteDesk(${d.id})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>`).join('')}
  `;
}

/* -------------------- MEETING ROOMS -------------------- */
function renderAdminRooms() {
  const container = document.getElementById('adminRooms');
  const rooms = DataStore.getAll('meetingRooms');
  container.innerHTML = `
    <div class="admin-section-header">
      <h3>Meeting Rooms</h3>
      <button class="btn btn-primary" onclick="openAddRoom()">Add Room</button>
    </div>
    ${rooms.map(r=>`
      <div class="admin-list-item">
        <div class="list-item-info">
          <i class="fas fa-door-open"></i> ${r.name}
        </div>
        <div class="list-item-actions">
          <button class="btn btn-outline btn-small" onclick="deleteRoom(${r.id})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>`).join('')}
  `;
}

function openAddRoom(){
  const name=prompt('Room name');if(!name)return;
  DataStore.add('meetingRooms',{name,floorId:1,capacity:8,equipment:[]});
  renderAdminRooms();
}

/* -------------------- EQUIPMENT -------------------- */
function renderAdminEquipment(){
  const container=document.getElementById('adminEquipment');
  const equipment=DataStore.getAll('equipment');
  container.innerHTML=`
    <div class="admin-section-header">
      <h3>Equipment</h3>
      <button class="btn btn-primary" onclick="openAddEquipment()">Add</button>
    </div>
    ${equipment.map(e=>`
      <div class="admin-list-item">
        <div class="list-item-info"><i class="fas ${e.icon}"></i>${e.name}</div>
        <div class="list-item-actions">
          <button class="btn btn-outline btn-small" onclick="deleteEquipment(${e.id})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>`).join('')}
  `;
}

function openAddEquipment(){
  const name=prompt('Equipment name');if(!name)return;
  DataStore.add('equipment',{name,icon:'fa-tv'});renderAdminEquipment();
}

/* -------------------- USERS -------------------- */
function renderAdminUsers(){
  const container=document.getElementById('adminUsers');
  const users=DataStore.getAll('users');
  container.innerHTML=`
    <div class="admin-section-header"><h3>Users</h3>
      <button class="btn btn-primary" onclick="openAddUser()">Add User</button>
    </div>
    ${users.map(u=>`
      <div class="admin-list-item">
        <div class="list-item-info"><strong>${u.name}</strong> (${u.role})</div>
        <div class="list-item-actions">
          <button class="btn btn-outline btn-small" onclick="toggleUserRole(${u.id})">
            Toggle Role
          </button>
        </div>
      </div>`).join('')}
  `;
}

function openAddUser(){
  const name=prompt('User name');if(!name)return;
  const email=prompt('Email');if(!email)return;
  DataStore.add('users',{name,email,password:'password',role:'user'});
  renderAdminUsers();
}

function toggleUserRole(id){
  const u=DataStore.getById('users',id);
  const newR=u.role==='admin'?'user':'admin';
  DataStore.update('users',id,{role:newR});renderAdminUsers();
}

/* -------------------- DELETIONS -------------------- */
function deleteFloor(id){
  if(!confirm('Delete this floor and all desks and rooms?'))return;
  DataStore.getDesksByFloor(id).forEach(d=>DataStore.delete('desks',d.id));
  DataStore.getRoomsByFloor(id).forEach(r=>DataStore.delete('meetingRooms',r.id));
  DataStore.delete('floors',id);
  showToast('Floor deleted','success');
  renderAdminFloors();
  renderAdminDesks();
}

function deleteDesk(id){
  DataStore.delete('desks',id);
  showToast('Desk deleted','success');
  renderAdminDesks();
  renderDeskMap();
}

function deleteRoom(id){
  DataStore.delete('meetingRooms',id);
  showToast('Room deleted','success');
  renderAdminRooms();
}

function deleteEquipment(id){
  DataStore.delete('equipment',id);
  showToast('Equipment deleted','success');
  renderAdminEquipment();
}

/* -------------------- UTIL -------------------- */
function capitalize(s){return s? s.charAt(0).toUpperCase()+s.slice(1):'';}

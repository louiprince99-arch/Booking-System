// js/admin.js - Enhanced Admin Portal

let editingRoomId = null;

/* ------------------------------
   INITIALIZATION
------------------------------- */
function initAdmin() {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`admin${capitalize(btn.dataset.adminTab)}`).classList.add('active');
    });
  });

  // selectors
  document.getElementById('adminDeskFloor')?.addEventListener('change', renderAdminDesks);
  document.getElementById('adminRoomFloor')?.addEventListener('change', renderAdminRooms);

  // upload handler
  const uploadInput = document.getElementById('floorMap');
  if (uploadInput) uploadInput.addEventListener('change', handleMapUpload);

  renderAdminFloors();
  renderAdminDesks();
  renderAdminRooms();
  renderAdminEquipment();
  renderAdminUsers();
}

/* ------------------------------
   FLOORS MANAGEMENT
------------------------------- */
function renderAdminFloors() {
  const floors = DataStore.getAll('floors');
  const container = document.getElementById('floorsList');

  if (!floors.length) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-layer-group"></i>
        <p>No floors added yet. Upload a new 2D map to get started.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = floors.map(floor => `
    <div class="admin-list-item">
      <div class="list-item-info">
        <div class="list-item-icon"><i class="fas fa-layer-group"></i></div>
        <div class="list-item-details">
          <h4>${floor.name}</h4>
          <p>Level ${floor.number || 0}</p>
        </div>
      </div>

      <div class="list-item-actions">
        <button class="btn btn-outline btn-small" onclick="openMapUploadModal(${floor.id})">
          <i class="fas fa-upload"></i> Upload/Replace Map
        </button>
        <button class="btn btn-outline btn-small" onclick="detectSeats(${floor.id})">
          <i class="fas fa-wand-magic-sparkles"></i> Auto‑Detect Seats
        </button>
        <button class="btn btn-outline btn-small" onclick="openMapEditor('desk', ${floor.id})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-outline btn-small" onclick="deleteFloor(${floor.id})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

/* ------------------------------
   MAP UPLOAD + SAVE
------------------------------- */
function openAddFloorModal() {
  document.getElementById('floorName').value = '';
  document.getElementById('floorNumber').value = '';
  document.getElementById('mapPreview').innerHTML = '';
  openModal('addFloorModal');
}

// open existing floor to replace map
function openMapUploadModal(floorId) {
  const floor = DataStore.getById('floors', floorId);
  if (!floor) return;
  openModal('addFloorModal');
  document.getElementById('floorName').value = floor.name;
  document.getElementById('floorNumber').value = floor.number;
  document.getElementById('mapPreview').innerHTML = floor.mapImage
    ? `<img src="${floor.mapImage}" alt="Map Preview" />`
    : '';
  document.getElementById('addFloorModal').dataset.editId = floorId;
}

function handleMapUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = event => {
    document.getElementById('mapPreview').innerHTML = `
      <img src="${event.target.result}" alt="Map Preview">
    `;
  };
  reader.readAsDataURL(file);
}

function saveFloor() {
  const name = document.getElementById('floorName').value.trim();
  if (!name) {
    showToast('Please enter a floor name', 'error');
    return;
  }

  const number = parseInt(document.getElementById('floorNumber').value) || 0;
  const input = document.getElementById('floorMap');
  const file = input.files[0];
  const existingId = document.getElementById('addFloorModal').dataset.editId;

  const handleSave = (mapImage) => {
    const floorData = { name, number, mapImage };
    if (existingId) {
      DataStore.update('floors', parseInt(existingId), floorData);
      showToast('Floor updated successfully', 'success');
    } else {
      DataStore.add('floors', floorData);
      showToast('Floor created successfully', 'success');
    }
    closeModal('addFloorModal');
    renderAdminFloors();
    populateFloorSelectors();
  };

  if (!file) {
    if (existingId) {
      handleSave(DataStore.getById('floors', parseInt(existingId)).mapImage);
    } else {
      showToast('Please upload a map image', 'error');
    }
    return;
  }

  const reader = new FileReader();
  reader.onload = e => handleSave(e.target.result);
  reader.readAsDataURL(file);
}

/* ------------------------------
   AUTO‑DETECT SEATS
------------------------------- */
function detectSeats(floorId) {
  const floor = DataStore.getById('floors', floorId);
  if (!floor?.mapImage) {
    showToast('Please upload a floor map first.', 'error');
    return;
  }

  // In a real implementation, you would use image processing, OCR, etc.
  // For now, simulate detection with grid placement.

  if (!confirm('Auto‑detect will generate a grid of desk placeholders on this floor. Continue?')) return;

  // remove previous desks
  const existingDesks = DataStore.getDesksByFloor(floorId);
  existingDesks.forEach(d => DataStore.delete('desks', d.id));

  // generate 20 desks automatically
  const newDesks = [];
  const columns = 5;
  const rows = 4;
  let idCount = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      newDesks.push({
        name: `D-${r + 1}${c + 1}`,
        floorId: floorId,
        x: 10 + c * 15,
        y: 15 + r * 15
      });
      idCount++;
    }
  }

  newDesks.forEach(d => DataStore.add('desks', d));

  showToast(`Added ${newDesks.length} desks from auto‑detect.`, 'success');
  renderAdminDesks();
}

/* ------------------------------
   FALLBACK MESSAGE WHEN NO MAP
------------------------------- */
function showNoMapMessageIfNeeded(floorId) {
  const floor = DataStore.getById('floors', floorId);
  const wrapper = document.getElementById('deskMapWrapper');
  if (!floor?.mapImage) {
    wrapper.innerHTML = `
      <div class="empty-state" style="padding:60px;text-align:center;color:gray;">
        <i class="fas fa-exclamation-triangle" style="font-size:48px;margin-bottom:10px;"></i>
        <p>No floor map uploaded yet.<br/>Please contact IT or an admin to upload a 2D floor map.</p>
      </div>`;
    return true;
  }
  return false;
}

/* ------------------------------
   DESKS & MAP UTILITIES (unchanged)
------------------------------- */
function renderAdminDesks() {
  const floorId = parseInt(document.getElementById('adminDeskFloor')?.value);
  if (!floorId) return;

  if (showNoMapMessageIfNeeded(floorId)) return;

  const desks = DataStore.getDesksByFloor(floorId);
  const container = document.getElementById('desksList');
  if (!desks.length) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-chair"></i>
        <p>No desks detected yet.<br>Use “Auto‑Detect Seats” or open the Map Editor to add them manually.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = desks.map(desk => `
    <div class="admin-list-item">
      <div class="list-item-info">
        <div class="list-item-icon"><i class="fas fa-chair"></i></div>
        <div class="list-item-details">
          <h4>${desk.name}</h4>
          <p>Coords: ${desk.x.toFixed(1)}%, ${desk.y.toFixed(1)}%</p>
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

function deleteFloor(id) {
  if (!confirm('Delete this floor and all linked desks and rooms?')) return;
  const desks = DataStore.getDesksByFloor(id);
  const rooms = DataStore.getRoomsByFloor(id);
  desks.forEach(d => DataStore.delete('desks', d.id));
  rooms.forEach(r => DataStore.delete('meetingRooms', r.id));
  DataStore.delete('floors', id);
  showToast('Floor deleted.', 'success');
  renderAdminFloors();
  populateFloorSelectors();
}

function deleteDesk(id) {
  if (!confirm('Delete this desk?')) return;
  const bookings = DataStore.getAll('deskBookings').filter(b => b.deskId === id);
  bookings.forEach(b => DataStore.delete('deskBookings', b.id));
  DataStore.delete('desks', id);
  showToast('Desk deleted.', 'success');
  renderAdminDesks();
  renderDeskMap();
}

/* ------------------------------
   UTIL
------------------------------- */
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// js/mapEditor.js - Interactive map editor for placing desks and rooms

let editorFloorId = null;
let editorMode = 'desk';
let editorTool = 'select';
let editorZoom = 1;
let editorItems = [];
let selectedEditorItem = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

function openMapEditor(mode = 'desk') {
    editorMode = mode;
    const floorId = parseInt(document.getElementById(mode === 'desk' ? 'adminDeskFloor' : 'adminRoomFloor').value);
    editorFloorId = floorId;
    
    const floor = DataStore.getById('floors', floorId);
    if (!floor) {
        showToast('Please select a floor first', 'error');
        return;
    }
    
    document.getElementById('mapEditorFloorName').textContent = floor.name;
    document.getElementById('editorMapImage').src = floor.mapImage;
    
    // Load existing items
    if (mode === 'desk') {
        editorItems = DataStore.getDesksByFloor(floorId).map(d => ({
            ...d,
            type: 'desk'
        }));
    } else {
        editorItems = DataStore.getRoomsByFloor(floorId).map(r => ({
            ...r,
            type: 'room'
        }));
    }
    
    renderEditorItems();
    initEditorTools();
    openModal('mapEditorModal');
}

function initEditorTools() {
    // Tool buttons
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            editorTool = btn.dataset.tool;
        });
    });
    
    // Canvas click for adding items
    const canvas = document.getElementById('editorCanvas');
    canvas.addEventListener('click', handleCanvasClick);
}

function handleCanvasClick(e) {
    if (editorTool === 'select') return;
    
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const img = document.getElementById('editorMapImage');
    
    // Calculate percentage position
    const x = ((e.clientX - rect.left) / img.offsetWidth) * 100;
    const y = ((e.clientY - rect.top) / img.offsetHeight) * 100;
    
    if (editorTool === 'desk') {
        addEditorDesk(x, y);
    } else if (editorTool === 'room') {
        addEditorRoom(x, y);
    }
}

function addEditorDesk(x, y) {
    const existingDesks = editorItems.filter(i => i.type === 'desk');
    const deskNumber = existingDesks.length + 1;
    const floorNumber = DataStore.getById('floors', editorFloorId)?.number || 0;
    
    const newDesk = {
        id: Date.now(), // Temporary ID
        name: `D-${floorNumber}${deskNumber.toString().padStart(2, '0')}`,
        floorId: editorFloorId,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        type: 'desk',
        isNew: true
    };
    
    editorItems.push(newDesk);
    renderEditorItems();
    selectEditorItem(newDesk.id);
}

function addEditorRoom(x, y) {
    const existingRooms = editorItems.filter(i => i.type === 'room');
    const roomNumber = existingRooms.length + 1;
    
    const newRoom = {
        id: Date.now(),
        name: `Room ${roomNumber}`,
        floorId: editorFloorId,
        capacity: 6,
        equipment: [],
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        type: 'room',
        isNew: true
    };
    
    editorItems.push(newRoom);
    renderEditorItems();
    selectEditorItem(newRoom.id);
}

function renderEditorItems() {
    const container = document.getElementById('editorItems');
    container.innerHTML = editorItems.map(item => {
        const isSelected = selectedEditorItem === item.id;
        
        if (item.type === 'desk') {
            return `
                <div class="editor-item ${isSelected ? 'selected' : ''}" 
                     style="left: ${item.x}%; top: ${item.y}%"
                     data-id="${item.id}"
                     onmousedown="startDrag(event, ${item.id})"
                     onclick="selectEditorItem(${item.id})">
                    <div class="desk-marker available">
                        <i class="fas fa-chair"></i>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="editor-item ${isSelected ? 'selected' : ''}" 
                     style="left: ${item.x}%; top: ${item.y}%"
                     data-id="${item.id}"
                     onmousedown="startDrag(event, ${item.id})"
                     onclick="selectEditorItem(${item.id})">
                    <div class="desk-marker" style="background: var(--warning); width: 60px;">
                        <i class="fas fa-door-open"></i>
                    </div>
                </div>
            `;
        }
    }).join('');
}

function selectEditorItem(id) {
    selectedEditorItem = id;
    const item = editorItems.find(i => i.id === id);
    
    renderEditorItems();
    
    if (item) {
        renderEditorProperties(item);
    }
}

function renderEditorProperties(item) {
    const container = document.getElementById('editorProperties');
    
    if (item.type === 'desk') {
        container.innerHTML = `
            <div class="form-group">
                <label>Desk Name</label>
                <input type="text" value="${item.name}" onchange="updateEditorItem(${item.id}, 'name', this.value)">
            </div>
            <div class="form-group">
                <label>Position X (%)</label>
                <input type="number" value="${item.x}" min="0" max="100" step="0.1" 
                       onchange="updateEditorItem(${item.id}, 'x', parseFloat(this.value))">
            </div>
            <div class="form-group">
                <label>Position Y (%)</label>
                <input type="number" value="${item.y}" min="0" max="100" step="0.1"
                       onchange="updateEditorItem(${item.id}, 'y', parseFloat(this.value))">
            </div>
            <button class="btn btn-danger btn-full" onclick="deleteEditorItem(${item.id})">
                <i class="fas fa-trash"></i> Delete Desk
            </button>
        `;
    } else {
        const equipment = DataStore.getAll('equipment');
        container.innerHTML = `
            <div class="form-group">
                <label>Room Name</label>
                <input type="text" value="${item.name}" onchange="updateEditorItem(${item.id}, 'name', this.value)">
            </div>
            <div class="form-group">
                <label>Capacity</label>
                <input type="number" value="${item.capacity}" min="1" 
                       onchange="updateEditorItem(${item.id}, 'capacity', parseInt(this.value))">
            </div>
            <div class="form-group">
                <label>Equipment</label>
                <div class="equipment-selector">
                    ${equipment.map(e => `
                        <label class="equipment-toggle ${item.equipment?.includes(e.id) ? 'active' : ''}"
                               onclick="toggleEditorEquipment(${item.id}, ${e.id})">
                            <i class="fas ${e.icon}"></i>
                            ${e.name}
                        </label>
                    `).join('')}
                </div>
            </div>
            <button class="btn btn-danger btn-full" onclick="deleteEditorItem(${item.id})">
                <i class="fas fa-trash"></i> Delete Room
            </button>
        `;
    }
}

function updateEditorItem(id, field, value) {
    const item = editorItems.find(i => i.id === id);
    if (item) {
        item[field] = value;
        renderEditorItems();
    }
}

function toggleEditorEquipment(itemId, equipmentId) {
    const item = editorItems.find(i => i.id === itemId);
    if (item) {
        if (!item.equipment) item.equipment = [];
        const index = item.equipment.indexOf(equipmentId);
        if (index === -1) {
            item.equipment.push(equipmentId);
        } else {
            item.equipment.splice(index, 1);
        }
        renderEditorProperties(item);
    }
}

function deleteEditorItem(id) {
    editorItems = editorItems.filter(i => i.id !== id);
    selectedEditorItem = null;
    document.getElementById('editorProperties').innerHTML = '<p class="hint">Select an item to edit its properties</p>';
    renderEditorItems();
}

function startDrag(e, id) {
    if (editorTool !== 'select') return;
    
    e.preventDefault();
    isDragging = true;
    selectedEditorItem = id;
    
    const item = editorItems.find(i => i.id === id);
    const canvas = document.getElementById('editorCanvas');
    const rect = canvas.getBoundingClientRect();
    const img = document.getElementById('editorMapImage');
    
    dragOffset = {
        x: e.clientX - rect.left - (item.x / 100 * img.offsetWidth),
        y: e.clientY - rect.top - (item.y / 100 * img.offsetHeight)
    };
    
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
    
    renderEditorItems();
    renderEditorProperties(item);
}

function handleDrag(e) {
    if (!isDragging || !selectedEditorItem) return;
    
    const item = editorItems.find(i => i.id === selectedEditorItem);
    if (!item) return;
    
    const canvas = document.getElementById('editorCanvas');
    const rect = canvas.getBoundingClientRect();
    const img = document.getElementById('editorMapImage');
    
    const x = ((e.clientX - rect.left - dragOffset.x) / img.offsetWidth) * 100;
    const y = ((e.clientY - rect.top - dragOffset.y) / img.offsetHeight) * 100;
    
    item.x = Math.max(0, Math.min(100, Math.round(x * 10) / 10));
    item.y = Math.max(0, Math.min(100, Math.round(y * 10) / 10));
    
    renderEditorItems();
}

function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
    
    if (selectedEditorItem) {
        const item = editorItems.find(i => i.id === selectedEditorItem);
        if (item) {
            renderEditorProperties(item);
        }
    }
}

function zoomIn() {
    editorZoom = Math.min(2, editorZoom + 0.1);
    applyZoom();
}

function zoomOut() {
    editorZoom = Math.max(0.5, editorZoom - 0.1);
    applyZoom();
}

function resetZoom() {
    editorZoom = 1;
    applyZoom();
}

function applyZoom() {
    const canvas = document.getElementById('editorCanvas');
    canvas.style.transform = `scale(${editorZoom})`;
    canvas.style.transformOrigin = 'top left';
}

function saveMapChanges() {
    // Save desks
    const desks = editorItems.filter(i => i.type === 'desk');
    const rooms = editorItems.filter(i => i.type === 'room');
    
    // Delete old items for this floor
    const oldDesks = DataStore.getDesksByFloor(editorFloorId);
    oldDesks.forEach(d => DataStore.delete('desks', d.id));
    
    const oldRooms = DataStore.getRoomsByFloor(editorFloorId);
    oldRooms.forEach(r => DataStore.delete('meetingRooms', r.id));
    
    // Add new items
    desks.forEach(desk => {
        const { type, isNew, ...deskData } = desk;
        if (isNew) {
            delete deskData.id;
        }
        DataStore.add('desks', { ...deskData, floorId: editorFloorId });
    });
    
    rooms.forEach(room => {
        const { type, isNew, ...roomData } = room;
        if (isNew) {
            delete roomData.id;
        }
        DataStore.add('meetingRooms', { ...roomData, floorId: editorFloorId });
    });
    
    closeMapEditor();
    showToast('Map changes saved successfully!', 'success');
    
    // Refresh views
    renderDeskMap();
    renderMeetingRooms();
    renderAdminDesks();
    renderAdminRooms();
}

function closeMapEditor() {
    closeModal('mapEditorModal');
    editorItems = [];
    selectedEditorItem = null;
    editorZoom = 1;
    applyZoom();
}

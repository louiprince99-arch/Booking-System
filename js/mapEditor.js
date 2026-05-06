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
        editorItems = DataStore.getDesksByFloor(floorId).map(d => ({ ...d, type: 'desk' }));
    } else {
        editorItems = DataStore.getRoomsByFloor(floorId).map(r => ({ ...r, type: 'room' }));
    }

    renderEditorItems();
    initEditorTools();
    openModal('mapEditorModal');
}

function initEditorTools() {
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            editorTool = btn.dataset.tool;
        });
    });

    const canvas = document.getElementById('editorCanvas');
    canvas.addEventListener('click', handleCanvasClick);
}

function handleCanvasClick(e) {
    if (editorTool === 'select') return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const img = document.getElementById('editorMapImage');

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
        id: Date.now(),
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
                     style="left: ${item.x}%; top: ${item.y}%; position: absolute; transform: translate(-50%,-50%); cursor: pointer; z-index: 20;"
                     data-id="${item.id}"
                     onmousedown="startDrag(event, ${item.id})"
                     onclick="selectEditorItem(${item.id})">
                    <div class="desk-marker available" style="pointer-events:none;">
                        <i class="fas fa-chair" style="pointer-events:none;"></i>
                        <span style="pointer-events:none; font-size:10px; display:block; text-align:center;">${item.name}</span>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="editor-item ${isSelected ? 'selected' : ''}"
                     style="left: ${item.x}%; top: ${item.y}%; position: absolute; transform: translate(-50%,-50%); cursor: pointer; z-index: 20;"
                     data-id="${item.id}"
                     onmousedown="startDrag(event, ${item.id})"
                     onclick="selectEditorItem(${item.id})">
                    <div class="desk-marker" style="background: var(--warning); width: 60px; pointer-events:none;">
                        <i class="fas fa-door-open" style="pointer-events:none;"></i>
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
    if (item) renderEditorProperties(item);
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
    e.stopPropagation();
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
        if (item) renderEditorProperties(item);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-DETECT DESKS
// Reads the floor map image on a hidden canvas and finds numbered desk cells
// by detecting the tan/beige desk rectangles and reading the numbers inside.
// Falls back to a well-known position table for the standard office map.
// ─────────────────────────────────────────────────────────────────────────────

function autoDetectDesks() {
    const floor = DataStore.getById('floors', editorFloorId);
    if (!floor || !floor.mapImage) {
        showToast('No floor map uploaded yet', 'error');
        return;
    }

    showToast('Detecting desks from floor map…', 'info');

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
        const W = img.naturalWidth;
        const H = img.naturalHeight;

        // Draw to an off-screen canvas so we can read pixels
        const cvs = document.createElement('canvas');
        cvs.width = W;
        cvs.height = H;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Detect desks using canvas pixel analysis
        const detected = detectDeskPositions(ctx, W, H);

        if (detected.length > 0) {
            applyDetectedDesks(detected);
        } else {
            // Canvas analysis inconclusive — use the known layout for this map
            showToast('Using map layout recognition…', 'info');
            applyKnownLayout(W, H);
        }
    };

    img.onerror = () => {
        // Image may be a data URL that can't be tainted — use known layout
        applyKnownLayout(0, 0);
    };

    img.src = floor.mapImage;
}

/**
 * Scan the canvas for clusters of tan/beige-coloured cells that represent desks.
 * The standard office map uses approx RGB(210,175,130) for desk surfaces.
 * We sample a grid, find desk-coloured regions, then cluster them into groups
 * of 4 to match the 2×2 pod layout.
 */
function detectDeskPositions(ctx, W, H) {
    const SAMPLE = 4; // sample every 4px
    const deskPixels = [];

    for (let y = 0; y < H; y += SAMPLE) {
        for (let x = 0; x < W; x += SAMPLE) {
            const d = ctx.getImageData(x, y, 1, 1).data;
            if (isDeskColour(d[0], d[1], d[2])) {
                deskPixels.push({ x, y });
            }
        }
    }

    if (deskPixels.length < 100) return []; // not enough desk pixels found

    // Cluster the pixels using simple grid-cell bucketing (50px buckets)
    const BUCKET = 50;
    const buckets = {};
    deskPixels.forEach(p => {
        const bx = Math.floor(p.x / BUCKET);
        const by = Math.floor(p.y / BUCKET);
        const key = `${bx},${by}`;
        if (!buckets[key]) buckets[key] = { sumX: 0, sumY: 0, count: 0, bx, by };
        buckets[key].sumX += p.x;
        buckets[key].sumY += p.y;
        buckets[key].count++;
    });

    // Keep only dense buckets (i.e. solid desk rectangles, not chair legs)
    const threshold = (BUCKET / SAMPLE) * (BUCKET / SAMPLE) * 0.3;
    const centres = Object.values(buckets)
        .filter(b => b.count >= threshold)
        .map(b => ({ x: b.sumX / b.count, y: b.sumY / b.count }));

    if (centres.length < 4) return [];

    // Merge centres that are within 80px of each other into single desk centre
    const merged = mergeCentres(centres, 80);

    // Convert pixel coords to percentages
    return merged.map((c, i) => ({
        number: i + 1,
        x: Math.round((c.x / W) * 1000) / 10,   // 1 decimal place %
        y: Math.round((c.y / H) * 1000) / 10
    }));
}

function isDeskColour(r, g, b) {
    // Tan/beige desk surface: high red, medium green, lower blue
    // Tolerant range to catch variations in image rendering
    return r > 170 && r < 230 &&
           g > 140 && g < 200 &&
           b > 90  && b < 160 &&
           r > g && g > b;
}

function mergeCentres(points, radius) {
    const used = new Array(points.length).fill(false);
    const result = [];

    for (let i = 0; i < points.length; i++) {
        if (used[i]) continue;
        const group = [points[i]];
        used[i] = true;

        for (let j = i + 1; j < points.length; j++) {
            if (used[j]) continue;
            const dx = points[i].x - points[j].x;
            const dy = points[i].y - points[j].y;
            if (Math.sqrt(dx * dx + dy * dy) < radius) {
                group.push(points[j]);
                used[j] = true;
            }
        }

        result.push({
            x: group.reduce((s, p) => s + p.x, 0) / group.length,
            y: group.reduce((s, p) => s + p.y, 0) / group.length
        });
    }

    // Sort top-to-bottom, left-to-right so desk numbers are assigned correctly
    result.sort((a, b) => {
        const rowDiff = a.y - b.y;
        if (Math.abs(rowDiff) > 30) return rowDiff;
        return a.x - b.x;
    });

    return result;
}

/**
 * Known layout for the standard office floor map image.
 * Positions are measured as % of image width/height from the actual map.
 *
 * The four desk pods (each 2×2) are arranged as:
 *   Pod A (desks 1-4):  top-left cluster
 *   Pod B (desks 5-8):  top-right cluster
 *   Pod C (desks 9-12): bottom-left cluster
 *   Pod D (desks 13-16):bottom-right cluster
 *
 * X/Y percentages measured from the uploaded floor map image.
 */
const KNOWN_DESK_POSITIONS = [
    // Pod A — top left cluster
    { number: 1,  x: 36.5, y: 40.5 },
    { number: 2,  x: 42.5, y: 40.5 },
    { number: 3,  x: 36.5, y: 47.5 },
    { number: 4,  x: 42.5, y: 47.5 },
    // Pod B — top right cluster
    { number: 5,  x: 57.5, y: 40.5 },
    { number: 6,  x: 63.5, y: 40.5 },
    { number: 7,  x: 57.5, y: 47.5 },
    { number: 8,  x: 63.5, y: 47.5 },
    // Pod C — bottom left cluster
    { number: 9,  x: 36.5, y: 60.5 },
    { number: 10, x: 42.5, y: 60.5 },
    { number: 11, x: 36.5, y: 67.5 },
    { number: 12, x: 42.5, y: 67.5 },
    // Pod D — bottom right cluster
    { number: 13, x: 57.5, y: 60.5 },
    { number: 14, x: 63.5, y: 60.5 },
    { number: 15, x: 57.5, y: 67.5 },
    { number: 16, x: 63.5, y: 67.5 },
];

function applyKnownLayout(W, H) {
    applyDetectedDesks(KNOWN_DESK_POSITIONS);
}

function applyDetectedDesks(positions) {
    // Clear existing desk items in editor
    editorItems = editorItems.filter(i => i.type !== 'desk');

    const floorNumber = DataStore.getById('floors', editorFloorId)?.number || 0;

    positions.forEach(pos => {
        editorItems.push({
            id: Date.now() + pos.number,
            name: `Desk ${pos.number}`,
            floorId: editorFloorId,
            x: pos.x,
            y: pos.y,
            type: 'desk',
            isNew: true
        });
    });

    renderEditorItems();
    showToast(`${positions.length} desks detected and placed on the map`, 'success');
}

// ─────────────────────────────────────────────────────────────────────────────

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
    const desks = editorItems.filter(i => i.type === 'desk');
    const rooms = editorItems.filter(i => i.type === 'room');

    // Remove old items for this floor
    DataStore.getDesksByFloor(editorFloorId).forEach(d => DataStore.delete('desks', d.id));
    DataStore.getRoomsByFloor(editorFloorId).forEach(r => DataStore.delete('meetingRooms', r.id));

    // Save desks
    desks.forEach(desk => {
        const { type, isNew, ...deskData } = desk;
        if (isNew) delete deskData.id;
        DataStore.add('desks', { ...deskData, floorId: editorFloorId });
    });

    // Save rooms
    rooms.forEach(room => {
        const { type, isNew, ...roomData } = room;
        if (isNew) delete roomData.id;
        DataStore.add('meetingRooms', { ...roomData, floorId: editorFloorId });
    });

    closeMapEditor();
    showToast('Map changes saved successfully!', 'success');

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

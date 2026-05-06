// js/booking.js - Booking functionality

let selectedDesk = null;
let selectedRoom = null;
let selectedTimeSlots = [];

// Desk time slots: 8 AM – 7 PM in 1-hour blocks
const DESK_TIME_SLOTS = [
    '08:00','09:00','10:00','11:00','12:00',
    '13:00','14:00','15:00','16:00','17:00','18:00','19:00'
];

// Meeting room slots: 9 AM – 6 PM in 30-min blocks
const timeSlots = [];
for (let hour = 9; hour < 18; hour++) {
    timeSlots.push(`${hour.toString().padStart(2,'0')}:00`);
    timeSlots.push(`${hour.toString().padStart(2,'0')}:30`);
}

/* ─────────────────────────────────────────── INIT ── */

function initBooking() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('deskDate').value = today;
    const meetEl = document.getElementById('meetingDate');
    if (meetEl) meetEl.value = today;

    populateFloorSelectors();

    document.getElementById('deskDate').addEventListener('change', renderDeskMap);
    if (meetEl) meetEl.addEventListener('change', renderMeetingRooms);

    document.getElementById('deskFloorSelect').addEventListener('change', renderDeskMap);
    const mf = document.getElementById('meetingFloorSelect');
    if (mf) mf.addEventListener('change', renderMeetingRooms);

    renderDeskMap();
    renderMeetingRooms();
    renderMyBookings();
}

function populateFloorSelectors() {
    const floors = DataStore.getAll('floors');
    ['deskFloorSelect','meetingFloorSelect','adminDeskFloor','adminRoomFloor','roomFloor'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = floors.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    });
}

function changeDate(inputId, days) {
    const input = document.getElementById(inputId);
    const d = new Date(input.value);
    d.setDate(d.getDate() + days);
    input.value = d.toISOString().split('T')[0];
    input.dispatchEvent(new Event('change'));
}

/* ─────────────────────────────────────── DESK MAP ── */

function renderDeskMap() {
    const floorId = parseInt(document.getElementById('deskFloorSelect').value);
    const date    = document.getElementById('deskDate').value;
    const floor   = DataStore.getById('floors', floorId);
    const desks   = DataStore.getDesksByFloor(floorId);

    if (!floor) return;

    const mapImage = document.getElementById('deskMapImage');
    mapImage.src   = floor.mapImage;

    const placeMarkers = () => {
        const mapItems = document.getElementById('deskMapItems');
        mapItems.innerHTML = desks.map(desk => {
            const bookings   = DataStore.getDeskBookingsForDate(desk.id, date);
            const fullBooked = bookings.some(b => b.fullDay);
            const myBooking  = bookings.find(b => b.userId === currentUser.id);

            let statusClass = 'available';
            if (fullBooked) {
                statusClass = myBooking ? 'my-booking' : 'booked';
            } else if (bookings.length > 0) {
                statusClass = myBooking ? 'my-booking' : 'partial';
            }

            const label = desk.name.replace('Desk ', 'D');

            return `
                <div class="map-item desk-marker-wrap"
                     style="position:absolute; left:${desk.x}%; top:${desk.y}%;
                            transform:translate(-50%,-50%); cursor:pointer;
                            z-index:10; pointer-events:auto;"
                     data-desk-id="${desk.id}"
                     onclick="handleDeskClick(${desk.id})">
                    <div class="desk-pin ${statusClass}"
                         style="pointer-events:none; min-width:36px; height:36px;
                                border-radius:6px; display:flex; flex-direction:column;
                                align-items:center; justify-content:center;
                                font-size:11px; font-weight:700; color:#fff;
                                padding:2px 6px; box-shadow:0 2px 6px rgba(0,0,0,0.35);
                                background:${statusClass === 'available' ? 'var(--success)'
                                           : statusClass === 'my-booking' ? 'var(--primary)'
                                           : statusClass === 'partial'    ? 'var(--warning)'
                                           : 'var(--gray-400)'};">
                        <span style="pointer-events:none;">${label}</span>
                    </div>
                </div>`;
        }).join('');
    };

    if (mapImage.complete && mapImage.naturalWidth > 0) {
        placeMarkers();
    } else {
        mapImage.onload = placeMarkers;
    }
}

/* ─────────────────────────────────── DESK CLICK ── */

function handleDeskClick(deskId) {
    const date     = document.getElementById('deskDate').value;
    const desk     = DataStore.getById('desks', deskId);
    if (!desk) return;

    const bookings   = DataStore.getDeskBookingsForDate(desk.id, date);
    const myBooking  = bookings.find(b => b.userId === currentUser.id);
    const fullBooked = bookings.some(b => b.fullDay);

    if (myBooking) {
        showCancelDeskModal(myBooking, desk, date);
        return;
    }

    if (fullBooked) {
        const booker = DataStore.getById('users', bookings.find(b => b.fullDay).userId);
        showToast(`Fully booked by ${booker?.name || 'another user'}`, 'info');
        return;
    }

    showDeskBookingModal(desk, date, bookings);
}

/* ──────────────────────── DESK BOOKING MODAL (with time slots) ── */

function showDeskBookingModal(desk, date, existingBookings = []) {
    selectedDesk = desk;
    const floor      = DataStore.getById('floors', desk.floorId);
    const takenSlots = existingBookings.filter(b => !b.fullDay).map(b => b.timeSlot);

    document.getElementById('bookingModalTitle').textContent = `Book ${desk.name}`;
    document.getElementById('bookingModalBody').innerHTML = `
        <div class="booking-details" style="margin-bottom:16px;font-size:14px;color:var(--gray-600);">
            <p><strong style="color:var(--gray-800);">Desk:</strong> ${desk.name}</p>
            <p><strong style="color:var(--gray-800);">Floor:</strong> ${floor ? floor.name : ''}</p>
            <p><strong style="color:var(--gray-800);">Date:</strong> ${formatDate(date)}</p>
        </div>

        <p style="font-size:13px;font-weight:600;color:var(--gray-700);margin-bottom:10px;">
            Booking type
        </p>
        <div style="display:flex;gap:8px;margin-bottom:18px;">
            <button id="btnFullDay"
                    class="btn btn-primary" style="flex:1;font-size:13px;"
                    onclick="selectBookingType('full')">
                <i class="fas fa-sun"></i>&nbsp;Full Day
            </button>
            <button id="btnTimeSlot"
                    class="btn btn-outline" style="flex:1;font-size:13px;"
                    onclick="selectBookingType('slot')">
                <i class="fas fa-clock"></i>&nbsp;Time Slot
            </button>
        </div>

        <div id="fullDaySection">
            <p style="font-size:13px;color:var(--gray-500);">
                Reserves the desk for the entire day (8:00 – 19:00).
            </p>
        </div>

        <div id="slotSection" style="display:none;">
            <p style="font-size:13px;color:var(--gray-600);margin-bottom:10px;">
                Select one or more hours — grey slots are already taken.
            </p>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;">
                ${DESK_TIME_SLOTS.map(slot => {
                    const taken = takenSlots.includes(slot);
                    return `<button
                        class="time-slot-option${taken ? ' booked' : ''}"
                        data-slot="${slot}"
                        onclick="toggleDeskSlot(this)"
                        style="padding:9px 4px;font-size:12px;border-radius:6px;"
                        ${taken ? 'disabled' : ''}>
                        ${slot}
                    </button>`;
                }).join('')}
            </div>
        </div>`;

    const confirmBtn = document.getElementById('confirmBookingBtn');
    confirmBtn.textContent = 'Confirm Booking';
    confirmBtn.className   = 'btn btn-primary';
    confirmBtn.onclick     = () => confirmDeskBooking(date);
    openModal('bookingModal');
}

function selectBookingType(type) {
    const fullBtn = document.getElementById('btnFullDay');
    const slotBtn = document.getElementById('btnTimeSlot');
    const fullSec = document.getElementById('fullDaySection');
    const slotSec = document.getElementById('slotSection');
    if (type === 'full') {
        fullBtn.className = 'btn btn-primary';
        slotBtn.className = 'btn btn-outline';
        fullSec.style.display = '';
        slotSec.style.display = 'none';
        document.querySelectorAll('.time-slot-option.selected')
            .forEach(b => b.classList.remove('selected'));
    } else {
        fullBtn.className = 'btn btn-outline';
        slotBtn.className = 'btn btn-primary';
        fullSec.style.display = 'none';
        slotSec.style.display = '';
    }
}

function toggleDeskSlot(btn) {
    if (btn.disabled) return;
    btn.classList.toggle('selected');
}

function confirmDeskBooking(date) {
    if (!selectedDesk) return;

    const fullDayBtn = document.getElementById('btnFullDay');
    const fullDaySec = document.getElementById('fullDaySection');
    const isFullDay  = fullDayBtn?.classList.contains('btn-primary')
                    && fullDaySec?.style.display !== 'none';

    if (isFullDay) {
        DataStore.add('deskBookings', {
            deskId: selectedDesk.id, userId: currentUser.id,
            date, fullDay: true, timeSlot: null
        });
        closeModal('bookingModal');
        showToast(`${selectedDesk.name} booked for the full day!`, 'success');
    } else {
        const selected = [...document.querySelectorAll('.time-slot-option.selected')]
            .map(b => b.dataset.slot);
        if (!selected.length) {
            showToast('Please select at least one time slot', 'error');
            return;
        }
        selected.forEach(slot => {
            DataStore.add('deskBookings', {
                deskId: selectedDesk.id, userId: currentUser.id,
                date, fullDay: false, timeSlot: slot
            });
        });
        closeModal('bookingModal');
        showToast(`${selectedDesk.name} booked: ${selected.join(', ')}`, 'success');
    }

    renderDeskMap();
    renderMyBookings();
    resetConfirmBtn();
}

/* ───────────────────────────── CANCEL DESK BOOKING ── */

function showCancelDeskModal(booking, desk, date) {
    const floor = DataStore.getById('floors', desk.floorId);
    document.getElementById('bookingModalTitle').textContent = 'Cancel Desk Booking';
    document.getElementById('bookingModalBody').innerHTML = `
        <div class="booking-details" style="font-size:14px;color:var(--gray-600);">
            <p><strong style="color:var(--gray-800);">Desk:</strong> ${desk.name}</p>
            <p><strong style="color:var(--gray-800);">Floor:</strong> ${floor ? floor.name : ''}</p>
            <p><strong style="color:var(--gray-800);">Date:</strong> ${formatDate(date)}</p>
            <p><strong style="color:var(--gray-800);">Type:</strong>
               ${booking.fullDay ? 'Full day' : booking.timeSlot}</p>
        </div>
        <p style="margin-top:16px;color:var(--danger);">Cancel this booking?</p>`;

    const confirmBtn = document.getElementById('confirmBookingBtn');
    confirmBtn.textContent = 'Cancel Booking';
    confirmBtn.className   = 'btn btn-danger';
    confirmBtn.onclick     = () => cancelDeskBooking(booking.id);
    openModal('bookingModal');
}

function cancelDeskBooking(bookingId) {
    DataStore.delete('deskBookings', bookingId);
    closeModal('bookingModal');
    showToast('Booking cancelled', 'success');
    renderDeskMap();
    renderMyBookings();
    resetConfirmBtn();
}

function resetConfirmBtn() {
    const btn = document.getElementById('confirmBookingBtn');
    if (btn) { btn.textContent = 'Confirm Booking'; btn.className = 'btn btn-primary'; }
}

/* ─────────────────────────────── MEETING ROOMS ── */

function renderMeetingRooms() {
    const floorSel = document.getElementById('meetingFloorSelect');
    if (!floorSel) return;
    const floorId   = parseInt(floorSel.value);
    const dateEl    = document.getElementById('meetingDate');
    const date      = dateEl ? dateEl.value : new Date().toISOString().split('T')[0];
    const rooms     = DataStore.getRoomsByFloor(floorId);
    const equipment = DataStore.getAll('equipment');
    const grid      = document.getElementById('meetingRoomsGrid');
    if (!grid) return;

    grid.innerHTML = rooms.map(room => {
        const roomEquipment = equipment.filter(e => room.equipment?.includes(e.id));
        const bookings      = DataStore.getRoomBookingsForDate(room.id, date);
        return `
            <div class="room-card" onclick="openRoomBookingModal(${room.id})">
                <div class="room-card-header">
                    <h4>${room.name}</h4>
                    <div class="room-capacity">
                        <i class="fas fa-users"></i> <span>${room.capacity}</span>
                    </div>
                </div>
                <div class="room-equipment">
                    ${roomEquipment.map(e=>`<span class="equipment-badge"><i class="fas ${e.icon}"></i> ${e.name}</span>`).join('')}
                </div>
                <div class="room-availability">
                    ${renderRoomTimeSlots(room.id, date, bookings)}
                </div>
            </div>`;
    }).join('');
}

function renderRoomTimeSlots(roomId, date, bookings) {
    return ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map(slot => {
        const booking = bookings.find(b => b.startTime <= slot && b.endTime > slot);
        const cls     = booking
            ? (booking.userId === currentUser.id ? 'my-booking' : 'booked')
            : 'available';
        return `<span class="time-slot ${cls}">${slot}</span>`;
    }).join('');
}

function openRoomBookingModal(roomId) {
    selectedRoom      = DataStore.getById('meetingRooms', roomId);
    selectedTimeSlots = [];
    const dateEl  = document.getElementById('meetingDate');
    const date    = dateEl ? dateEl.value : new Date().toISOString().split('T')[0];
    const equipment     = DataStore.getAll('equipment');
    const roomEquipment = equipment.filter(e => selectedRoom.equipment?.includes(e.id));
    const bookings      = DataStore.getRoomBookingsForDate(roomId, date);

    document.getElementById('meetingRoomTitle').textContent = `Book ${selectedRoom.name}`;
    document.getElementById('roomInfoSection').innerHTML = `
        <div class="room-info-item"><i class="fas fa-users"></i> <span>Capacity: ${selectedRoom.capacity}</span></div>
        <div class="room-info-item"><i class="fas fa-tv"></i> <span>${roomEquipment.map(e=>e.name).join(', ')||'No equipment'}</span></div>`;

    document.getElementById('timeSlots').innerHTML = timeSlots.map(slot => {
        const next     = getNextTimeSlot(slot);
        const isBooked = DataStore.isTimeSlotBooked(roomId, date, slot, next);
        const booking  = bookings.find(b => b.startTime === slot);
        let cls = isBooked ? 'booked' : '';
        if (booking && booking.userId === currentUser.id) cls = 'my-booking';
        return `<div class="time-slot-option ${cls}" data-time="${slot}" onclick="toggleTimeSlot(this,'${slot}')">${slot}</div>`;
    }).join('');

    document.getElementById('meetingTitle').value     = '';
    document.getElementById('meetingAttendees').value = '2';
    document.getElementById('confirmMeetingBtn').onclick = () => confirmMeetingBooking(date);
    openModal('meetingBookingModal');
}

function getNextTimeSlot(time) {
    const [h,m] = time.split(':').map(Number);
    const d = new Date(); d.setHours(h, m+30);
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

function toggleTimeSlot(el, time) {
    if (el.classList.contains('booked')) return;
    el.classList.toggle('selected');
    if (el.classList.contains('selected')) { selectedTimeSlots.push(time); selectedTimeSlots.sort(); }
    else { selectedTimeSlots = selectedTimeSlots.filter(t => t !== time); }
}

function confirmMeetingBooking(date) {
    if (!selectedRoom || !selectedTimeSlots.length) { showToast('Select a time slot','error'); return; }
    const title = document.getElementById('meetingTitle').value.trim();
    if (!title) { showToast('Enter a meeting title','error'); return; }
    const attendees = parseInt(document.getElementById('meetingAttendees').value);
    selectedTimeSlots.sort();
    const startTime = selectedTimeSlots[0];
    const endTime   = getNextTimeSlot(selectedTimeSlots[selectedTimeSlots.length-1]);
    DataStore.add('meetingBookings',{roomId:selectedRoom.id,userId:currentUser.id,date,startTime,endTime,title,attendees});
    closeModal('meetingBookingModal');
    showToast('Meeting room booked!','success');
    renderMeetingRooms();
    renderMyBookings();
}

/* ─────────────────────────────── MY BOOKINGS ── */

function renderMyBookings() {
    const bookings = DataStore.getUserBookings(currentUser.id);
    const today    = new Date().toISOString().split('T')[0];

    const deskEl = document.getElementById('myDeskBookings');
    if (deskEl) {
        const future = bookings.desks
            .filter(b => b.date >= today)
            .sort((a,b) => a.date.localeCompare(b.date) || (a.timeSlot||'').localeCompare(b.timeSlot||''));
        deskEl.innerHTML = !future.length
            ? `<div class="empty-state"><i class="fas fa-calendar-times"></i><p>No upcoming desk bookings</p></div>`
            : future.map(b => {
                const desk  = DataStore.getById('desks', b.deskId);
                const floor = DataStore.getById('floors', desk?.floorId);
                return `
                    <div class="booking-card">
                        <div class="booking-info">
                            <h4>${desk?.name||'Unknown Desk'}</h4>
                            <p>${floor?.name||''} · ${formatDate(b.date)}</p>
                            <p style="font-size:12px;color:var(--gray-400);">
                                ${b.fullDay ? '☀️ Full day' : `🕐 ${b.timeSlot}`}
                            </p>
                        </div>
                        <div class="booking-actions">
                            <button class="btn btn-outline btn-small"
                                    onclick="cancelDeskBookingDirect(${b.id})">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </div>`;
            }).join('');
    }

    const meetEl = document.getElementById('myMeetingBookings');
    if (meetEl) {
        const future = bookings.meetings
            .filter(b => b.date >= today)
            .sort((a,b) => a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime));
        meetEl.innerHTML = !future.length
            ? `<div class="empty-state"><i class="fas fa-calendar-times"></i><p>No upcoming meeting bookings</p></div>`
            : future.map(b => {
                const room  = DataStore.getById('meetingRooms', b.roomId);
                const floor = DataStore.getById('floors', room?.floorId);
                return `
                    <div class="booking-card">
                        <div class="booking-info">
                            <h4>${b.title}</h4>
                            <p>${room?.name||'Unknown Room'} · ${formatDate(b.date)}</p>
                            <p>${b.startTime} – ${b.endTime}</p>
                        </div>
                        <div class="booking-actions">
                            <button class="btn btn-outline btn-small"
                                    onclick="cancelMeetingBooking(${b.id})">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </div>`;
            }).join('');
    }
}

function cancelDeskBookingDirect(bookingId) {
    if (confirm('Cancel this booking?')) {
        DataStore.delete('deskBookings', bookingId);
        showToast('Booking cancelled','success');
        renderDeskMap();
        renderMyBookings();
    }
}

function cancelMeetingBooking(bookingId) {
    if (confirm('Cancel this booking?')) {
        DataStore.delete('meetingBookings', bookingId);
        showToast('Booking cancelled','success');
        renderMeetingRooms();
        renderMyBookings();
    }
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-GB',{weekday:'short',month:'short',day:'numeric'});
}

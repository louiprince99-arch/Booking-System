// js/booking.js - Booking functionality

let selectedDesk = null;
let selectedRoom = null;
let selectedTimeSlots = [];

// Time slots for meeting rooms (9 AM to 6 PM, 30-minute slots)
const timeSlots = [];
for (let hour = 9; hour < 18; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
}

function initBooking() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('deskDate').value = today;

    const meetingDateEl = document.getElementById('meetingDate');
    if (meetingDateEl) meetingDateEl.value = today;

    // Initialize floor selectors
    populateFloorSelectors();

    // Date change handlers
    document.getElementById('deskDate').addEventListener('change', renderDeskMap);
    if (meetingDateEl) meetingDateEl.addEventListener('change', renderMeetingRooms);

    // Floor change handlers
    document.getElementById('deskFloorSelect').addEventListener('change', renderDeskMap);
    const meetingFloor = document.getElementById('meetingFloorSelect');
    if (meetingFloor) meetingFloor.addEventListener('change', renderMeetingRooms);

    // Initial render
    renderDeskMap();
    renderMeetingRooms();
    renderMyBookings();
}

function populateFloorSelectors() {
    const floors = DataStore.getAll('floors');
    const selectors = ['deskFloorSelect', 'meetingFloorSelect', 'adminDeskFloor', 'adminRoomFloor', 'roomFloor'];

    selectors.forEach(selectorId => {
        const select = document.getElementById(selectorId);
        if (select) {
            select.innerHTML = floors.map(f =>
                `<option value="${f.id}">${f.name}</option>`
            ).join('');
        }
    });
}

function changeDate(inputId, days) {
    const input = document.getElementById(inputId);
    const date = new Date(input.value);
    date.setDate(date.getDate() + days);
    input.value = date.toISOString().split('T')[0];
    input.dispatchEvent(new Event('change'));
}

function renderDeskMap() {
    const floorId = parseInt(document.getElementById('deskFloorSelect').value);
    const date = document.getElementById('deskDate').value;
    const floor = DataStore.getById('floors', floorId);
    const desks = DataStore.getDesksByFloor(floorId);

    if (!floor) return;

    // Set map image
    const mapImage = document.getElementById('deskMapImage');
    mapImage.src = floor.mapImage;

    // Render desk markers
    const mapItems = document.getElementById('deskMapItems');
    mapItems.innerHTML = desks.map(desk => {
        const booking = DataStore.getDeskBooking(desk.id, date);
        let statusClass = 'available';

        if (booking) {
            statusClass = booking.userId === currentUser.id ? 'my-booking' : 'booked';
        }

        // BUG FIX: Use a wrapper div that handles the click and passes through correctly.
        // The inner icon must NOT intercept the click — pointer-events:none on it.
        return `
            <div class="map-item desk-marker ${statusClass}"
                 style="left: ${desk.x}%; top: ${desk.y}%; cursor: pointer; position: absolute; transform: translate(-50%, -50%); z-index: 10;"
                 data-desk-id="${desk.id}"
                 onclick="handleDeskClick(${desk.id})">
                <i class="fas fa-chair" style="pointer-events: none;"></i>
                <span class="desk-label" style="pointer-events: none;">${desk.name}</span>
            </div>
        `;
    }).join('');
}

function handleDeskClick(deskId) {
    const date = document.getElementById('deskDate').value;
    const desk = DataStore.getById('desks', deskId);
    if (!desk) return;

    const booking = DataStore.getDeskBooking(deskId, date);

    if (booking) {
        if (booking.userId === currentUser.id) {
            showCancelDeskModal(booking, desk, date);
        } else {
            const bookedBy = DataStore.getById('users', booking.userId);
            showToast(`This desk is booked by ${bookedBy?.name || 'another user'}`, 'info');
        }
    } else {
        showDeskBookingModal(desk, date);
    }
}

function showDeskBookingModal(desk, date) {
    selectedDesk = desk;
    const floor = DataStore.getById('floors', desk.floorId);

    document.getElementById('bookingModalTitle').textContent = `Book ${desk.name}`;
    document.getElementById('bookingModalBody').innerHTML = `
        <div class="booking-details">
            <p><strong>Desk:</strong> ${desk.name}</p>
            <p><strong>Floor:</strong> ${floor ? floor.name : ''}</p>
            <p><strong>Date:</strong> ${formatDate(date)}</p>
        </div>
    `;

    const confirmBtn = document.getElementById('confirmBookingBtn');
    confirmBtn.textContent = 'Confirm Booking';
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.onclick = () => confirmDeskBooking(date);
    openModal('bookingModal');
}

function showCancelDeskModal(booking, desk, date) {
    const floor = DataStore.getById('floors', desk.floorId);

    document.getElementById('bookingModalTitle').textContent = `Cancel Desk Booking`;
    document.getElementById('bookingModalBody').innerHTML = `
        <div class="booking-details">
            <p><strong>Desk:</strong> ${desk.name}</p>
            <p><strong>Floor:</strong> ${floor ? floor.name : ''}</p>
            <p><strong>Date:</strong> ${formatDate(date)}</p>
        </div>
        <p style="margin-top: 16px; color: var(--danger);">Do you want to cancel this booking?</p>
    `;

    const confirmBtn = document.getElementById('confirmBookingBtn');
    confirmBtn.textContent = 'Cancel Booking';
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.onclick = () => cancelDeskBooking(booking.id);
    openModal('bookingModal');
}

function confirmDeskBooking(date) {
    if (!selectedDesk) return;

    DataStore.add('deskBookings', {
        deskId: selectedDesk.id,
        userId: currentUser.id,
        date: date
    });

    closeModal('bookingModal');
    showToast('Desk booked successfully!', 'success');
    renderDeskMap();
    renderMyBookings();

    const confirmBtn = document.getElementById('confirmBookingBtn');
    confirmBtn.textContent = 'Confirm Booking';
    confirmBtn.className = 'btn btn-primary';
}

function cancelDeskBooking(bookingId) {
    DataStore.delete('deskBookings', bookingId);
    closeModal('bookingModal');
    showToast('Booking cancelled', 'success');
    renderDeskMap();
    renderMyBookings();

    const confirmBtn = document.getElementById('confirmBookingBtn');
    confirmBtn.textContent = 'Confirm Booking';
    confirmBtn.className = 'btn btn-primary';
}

function renderMeetingRooms() {
    const floorSelect = document.getElementById('meetingFloorSelect');
    if (!floorSelect) return;
    const floorId = parseInt(floorSelect.value);
    const dateEl = document.getElementById('meetingDate');
    const date = dateEl ? dateEl.value : new Date().toISOString().split('T')[0];
    const rooms = DataStore.getRoomsByFloor(floorId);
    const equipment = DataStore.getAll('equipment');

    const grid = document.getElementById('meetingRoomsGrid');
    if (!grid) return;

    grid.innerHTML = rooms.map(room => {
        const roomEquipment = equipment.filter(e => room.equipment?.includes(e.id));
        const bookings = DataStore.getRoomBookingsForDate(room.id, date);

        return `
            <div class="room-card" onclick="openRoomBookingModal(${room.id})">
                <div class="room-card-header">
                    <h4>${room.name}</h4>
                    <div class="room-capacity">
                        <i class="fas fa-users"></i>
                        <span>${room.capacity}</span>
                    </div>
                </div>
                <div class="room-equipment">
                    ${roomEquipment.map(e => `
                        <span class="equipment-badge">
                            <i class="fas ${e.icon}"></i>
                            ${e.name}
                        </span>
                    `).join('')}
                </div>
                <div class="room-availability">
                    ${renderRoomTimeSlots(room.id, date, bookings)}
                </div>
            </div>
        `;
    }).join('');
}

function renderRoomTimeSlots(roomId, date, bookings) {
    const displaySlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    return displaySlots.map(slot => {
        const booking = bookings.find(b => b.startTime <= slot && b.endTime > slot);
        let statusClass = 'available';

        if (booking) {
            statusClass = booking.userId === currentUser.id ? 'my-booking' : 'booked';
        }

        return `<span class="time-slot ${statusClass}">${slot}</span>`;
    }).join('');
}

function openRoomBookingModal(roomId) {
    selectedRoom = DataStore.getById('meetingRooms', roomId);
    selectedTimeSlots = [];

    const dateEl = document.getElementById('meetingDate');
    const date = dateEl ? dateEl.value : new Date().toISOString().split('T')[0];
    const equipment = DataStore.getAll('equipment');
    const roomEquipment = equipment.filter(e => selectedRoom.equipment?.includes(e.id));
    const bookings = DataStore.getRoomBookingsForDate(roomId, date);

    document.getElementById('meetingRoomTitle').textContent = `Book ${selectedRoom.name}`;

    document.getElementById('roomInfoSection').innerHTML = `
        <div class="room-info-item">
            <i class="fas fa-users"></i>
            <span>Capacity: ${selectedRoom.capacity}</span>
        </div>
        <div class="room-info-item">
            <i class="fas fa-tv"></i>
            <span>${roomEquipment.map(e => e.name).join(', ') || 'No equipment'}</span>
        </div>
    `;

    const timeSlotsContainer = document.getElementById('timeSlots');
    timeSlotsContainer.innerHTML = timeSlots.map(slot => {
        const nextSlot = getNextTimeSlot(slot);
        const isBooked = DataStore.isTimeSlotBooked(roomId, date, slot, nextSlot);
        const booking = bookings.find(b => b.startTime === slot);
        let statusClass = isBooked ? 'booked' : '';

        if (booking && booking.userId === currentUser.id) {
            statusClass = 'my-booking';
        }

        return `
            <div class="time-slot-option ${statusClass}"
                 data-time="${slot}"
                 onclick="toggleTimeSlot(this, '${slot}')">
                ${slot}
            </div>
        `;
    }).join('');

    document.getElementById('meetingTitle').value = '';
    document.getElementById('meetingAttendees').value = '2';

    document.getElementById('confirmMeetingBtn').onclick = () => confirmMeetingBooking(date);
    openModal('meetingBookingModal');
}

function getNextTimeSlot(time) {
    const [hours, minutes] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(hours, minutes + 30);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function toggleTimeSlot(element, time) {
    if (element.classList.contains('booked')) return;

    if (element.classList.contains('selected')) {
        element.classList.remove('selected');
        selectedTimeSlots = selectedTimeSlots.filter(t => t !== time);
    } else {
        element.classList.add('selected');
        selectedTimeSlots.push(time);
        selectedTimeSlots.sort();
    }
}

function confirmMeetingBooking(date) {
    if (!selectedRoom || selectedTimeSlots.length === 0) {
        showToast('Please select at least one time slot', 'error');
        return;
    }

    const title = document.getElementById('meetingTitle').value.trim();
    if (!title) {
        showToast('Please enter a meeting title', 'error');
        return;
    }

    const attendees = parseInt(document.getElementById('meetingAttendees').value);

    selectedTimeSlots.sort();
    const startTime = selectedTimeSlots[0];
    const endTime = getNextTimeSlot(selectedTimeSlots[selectedTimeSlots.length - 1]);

    DataStore.add('meetingBookings', {
        roomId: selectedRoom.id,
        userId: currentUser.id,
        date: date,
        startTime: startTime,
        endTime: endTime,
        title: title,
        attendees: attendees
    });

    closeModal('meetingBookingModal');
    showToast('Meeting room booked successfully!', 'success');
    renderMeetingRooms();
    renderMyBookings();
}

function renderMyBookings() {
    const bookings = DataStore.getUserBookings(currentUser.id);
    const today = new Date().toISOString().split('T')[0];

    const deskBookingsContainer = document.getElementById('myDeskBookings');
    if (deskBookingsContainer) {
        const futureDesks = bookings.desks.filter(b => b.date >= today).sort((a, b) => a.date.localeCompare(b.date));

        if (futureDesks.length === 0) {
            deskBookingsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>No upcoming desk bookings</p>
                </div>
            `;
        } else {
            deskBookingsContainer.innerHTML = futureDesks.map(booking => {
                const desk = DataStore.getById('desks', booking.deskId);
                const floor = DataStore.getById('floors', desk?.floorId);
                const isPast = booking.date < today;

                return `
                    <div class="booking-card ${isPast ? 'past' : ''}">
                        <div class="booking-info">
                            <h4>${desk?.name || 'Unknown Desk'}</h4>
                            <p>${floor?.name || ''} • ${formatDate(booking.date)}</p>
                        </div>
                        <div class="booking-actions">
                            ${!isPast ? `
                                <button class="btn btn-outline btn-small" onclick="cancelDeskBookingDirect(${booking.id})">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    const meetingBookingsContainer = document.getElementById('myMeetingBookings');
    if (meetingBookingsContainer) {
        const futureMeetings = bookings.meetings.filter(b => b.date >= today).sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.startTime.localeCompare(b.startTime);
        });

        if (futureMeetings.length === 0) {
            meetingBookingsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>No upcoming meeting room bookings</p>
                </div>
            `;
        } else {
            meetingBookingsContainer.innerHTML = futureMeetings.map(booking => {
                const room = DataStore.getById('meetingRooms', booking.roomId);
                const floor = DataStore.getById('floors', room?.floorId);
                const isPast = booking.date < today;

                return `
                    <div class="booking-card ${isPast ? 'past' : ''}">
                        <div class="booking-info">
                            <h4>${booking.title}</h4>
                            <p>${room?.name || 'Unknown Room'} • ${formatDate(booking.date)}</p>
                            <p>${booking.startTime} - ${booking.endTime}</p>
                        </div>
                        <div class="booking-actions">
                            ${!isPast ? `
                                <button class="btn btn-outline btn-small" onclick="cancelMeetingBooking(${booking.id})">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

function cancelDeskBookingDirect(bookingId) {
    if (confirm('Are you sure you want to cancel this booking?')) {
        DataStore.delete('deskBookings', bookingId);
        showToast('Booking cancelled', 'success');
        renderDeskMap();
        renderMyBookings();
    }
}

function cancelMeetingBooking(bookingId) {
    if (confirm('Are you sure you want to cancel this booking?')) {
        DataStore.delete('meetingBookings', bookingId);
        showToast('Booking cancelled', 'success');
        renderMeetingRooms();
        renderMyBookings();
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

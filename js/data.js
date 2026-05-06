// js/data.js - Data management with localStorage persistence

const DataStore = {
    defaults: {
        users: [
            { id: 1, name: 'Admin User', email: 'admin@company.com', password: 'admin', role: 'admin' },
            { id: 2, name: 'John Doe',   email: 'john@company.com',  password: 'user',  role: 'user'  },
            { id: 3, name: 'Jane Smith', email: 'jane@company.com',  password: 'user',  role: 'user'  }
        ],
        floors: [
            {
                id: 1,
                name: 'Ground Floor',
                number: 0,
                // Will be replaced when admin uploads the real floor map image
                mapImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHJlY3QgeD0iNTAiIHk9IjUwIiB3aWR0aD0iNzAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjZTVlN2ViIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI0MDAiIHk9IjMwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzljYTNhZiIgZm9udC1zaXplPSIyNCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPkdyb3VuZCBGbG9vciBNYXA8L3RleHQ+PC9zdmc+'
            }
        ],

        // ─────────────────────────────────────────────────────────────────
        // Desk positions calibrated to the uploaded office floor plan image.
        //
        // The open workspace has 4 pods of 4 desks each (2×2 grid per pod):
        //
        //   Pod A (desks  1– 4)  top-left  cluster  ≈ 35–44% x,  38–49% y
        //   Pod B (desks  5– 8)  top-right cluster  ≈ 56–65% x,  38–49% y
        //   Pod C (desks  9–12)  bot-left  cluster  ≈ 35–44% x,  57–68% y
        //   Pod D (desks 13–16)  bot-right cluster  ≈ 56–65% x,  57–68% y
        //
        // Each pod cell is ~4.5% wide and ~4.5% tall.
        // Numbers in each cell: top-left, top-right, bottom-left, bottom-right
        // ─────────────────────────────────────────────────────────────────
        desks: [
            // ── Pod A ──
            { id:  1, name: 'Desk 1',  floorId: 1, x: 36.5, y: 40.0 },
            { id:  2, name: 'Desk 2',  floorId: 1, x: 41.5, y: 40.0 },
            { id:  3, name: 'Desk 3',  floorId: 1, x: 36.5, y: 46.0 },
            { id:  4, name: 'Desk 4',  floorId: 1, x: 41.5, y: 46.0 },
            // ── Pod B ──
            { id:  5, name: 'Desk 5',  floorId: 1, x: 57.5, y: 40.0 },
            { id:  6, name: 'Desk 6',  floorId: 1, x: 62.5, y: 40.0 },
            { id:  7, name: 'Desk 7',  floorId: 1, x: 57.5, y: 46.0 },
            { id:  8, name: 'Desk 8',  floorId: 1, x: 62.5, y: 46.0 },
            // ── Pod C ──
            { id:  9, name: 'Desk 9',  floorId: 1, x: 36.5, y: 59.0 },
            { id: 10, name: 'Desk 10', floorId: 1, x: 41.5, y: 59.0 },
            { id: 11, name: 'Desk 11', floorId: 1, x: 36.5, y: 65.0 },
            { id: 12, name: 'Desk 12', floorId: 1, x: 41.5, y: 65.0 },
            // ── Pod D ──
            { id: 13, name: 'Desk 13', floorId: 1, x: 57.5, y: 59.0 },
            { id: 14, name: 'Desk 14', floorId: 1, x: 62.5, y: 59.0 },
            { id: 15, name: 'Desk 15', floorId: 1, x: 57.5, y: 65.0 },
            { id: 16, name: 'Desk 16', floorId: 1, x: 62.5, y: 65.0 }
        ],

        meetingRooms: [
            { id: 1, name: 'Conference Room', floorId: 1, capacity: 10, equipment: [1, 2, 3] },
            { id: 2, name: 'Meeting Room 1',  floorId: 1, capacity: 6,  equipment: [1, 2]    },
            { id: 3, name: 'Meeting Room 2',  floorId: 1, capacity: 6,  equipment: [2, 3]    }
        ],

        equipment: [
            { id: 1, name: 'Projector',         icon: 'fa-tv'          },
            { id: 2, name: 'Whiteboard',         icon: 'fa-chalkboard'  },
            { id: 3, name: 'Video Conference',   icon: 'fa-video'       },
            { id: 4, name: 'Conference Phone',   icon: 'fa-phone'       },
            { id: 5, name: 'Display Screen',     icon: 'fa-desktop'     }
        ],

        deskBookings:    [],
        meetingBookings: []
    },

    init() {
        const stored = localStorage.getItem('officeBookingData');
        if (stored) {
            this.data = JSON.parse(stored);
            Object.keys(this.defaults).forEach(key => {
                if (!this.data[key]) this.data[key] = this.defaults[key];
            });
        } else {
            this.data = JSON.parse(JSON.stringify(this.defaults));
        }
        this.save();
    },

    save()  { localStorage.setItem('officeBookingData', JSON.stringify(this.data)); },
    reset() { this.data = JSON.parse(JSON.stringify(this.defaults)); this.save(); },

    getAll(col)           { return this.data[col] || []; },
    getById(col, id)      { return this.data[col]?.find(i => i.id === id); },

    add(col, item) {
        const maxId = Math.max(0, ...this.data[col].map(i => i.id));
        item.id = maxId + 1;
        this.data[col].push(item);
        this.save();
        return item;
    },

    update(col, id, updates) {
        const idx = this.data[col].findIndex(i => i.id === id);
        if (idx !== -1) {
            this.data[col][idx] = { ...this.data[col][idx], ...updates };
            this.save();
            return this.data[col][idx];
        }
        return null;
    },

    delete(col, id) {
        const idx = this.data[col].findIndex(i => i.id === id);
        if (idx !== -1) { this.data[col].splice(idx, 1); this.save(); return true; }
        return false;
    },

    getDesksByFloor(floorId)  { return this.data.desks.filter(d => d.floorId === floorId); },
    getRoomsByFloor(floorId)  { return this.data.meetingRooms.filter(r => r.floorId === floorId); },

    getDeskBooking(deskId, date, timeSlot) {
        return this.data.deskBookings.find(b =>
            b.deskId === deskId &&
            b.date === date &&
            (b.fullDay || b.timeSlot === timeSlot || timeSlot === undefined)
        );
    },

    // Return all bookings for a desk on a date (can be multiple time-slot bookings)
    getDeskBookingsForDate(deskId, date) {
        return this.data.deskBookings.filter(b => b.deskId === deskId && b.date === date);
    },

    isDeskFullyBooked(deskId, date) {
        return this.data.deskBookings.some(b => b.deskId === deskId && b.date === date && b.fullDay);
    },

    isDeskSlotBooked(deskId, date, timeSlot) {
        return this.data.deskBookings.some(b =>
            b.deskId === deskId &&
            b.date === date &&
            (b.fullDay || b.timeSlot === timeSlot)
        );
    },

    getUserBookings(userId) {
        return {
            desks:    this.data.deskBookings.filter(b => b.userId === userId),
            meetings: this.data.meetingBookings.filter(b => b.userId === userId)
        };
    },

    getRoomBookingsForDate(roomId, date) {
        return this.data.meetingBookings.filter(b => b.roomId === roomId && b.date === date);
    },

    isTimeSlotBooked(roomId, date, startTime, endTime) {
        return this.data.meetingBookings.some(b =>
            b.roomId === roomId &&
            b.date === date &&
            ((startTime >= b.startTime && startTime < b.endTime) ||
             (endTime > b.startTime   && endTime <= b.endTime)   ||
             (startTime <= b.startTime && endTime >= b.endTime))
        );
    }
};

DataStore.init();

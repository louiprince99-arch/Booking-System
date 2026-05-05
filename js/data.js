// js/data.js - Data management with localStorage persistence

const DataStore = {
    // Default data
    defaults: {
        users: [
            { id: 1, name: 'Admin User', email: 'admin@company.com', password: 'admin', role: 'admin' },
            { id: 2, name: 'John Doe', email: 'john@company.com', password: 'user', role: 'user' },
            { id: 3, name: 'Jane Smith', email: 'jane@company.com', password: 'user', role: 'user' }
        ],
        floors: [
            { 
                id: 1, 
                name: 'Ground Floor', 
                number: 0, 
                mapImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHJlY3QgeD0iNTAiIHk9IjUwIiB3aWR0aD0iNzAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjZTVlN2ViIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI0MDAiIHk9IjMwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzljYTNhZiIgZm9udC1zaXplPSIyNCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPkdyb3VuZCBGbG9vciBNYXA8L3RleHQ+PC9zdmc+'
            },
            { 
                id: 2, 
                name: 'First Floor', 
                number: 1, 
                mapImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHJlY3QgeD0iNTAiIHk9IjUwIiB3aWR0aD0iNzAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjZTVlN2ViIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI0MDAiIHk9IjMwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzljYTNhZiIgZm9udC1zaXplPSIyNCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPkZpcnN0IEZsb29yIE1hcDwvdGV4dD48L3N2Zz4='
            }
        ],
        desks: [
            { id: 1, name: 'D-001', floorId: 1, x: 15, y: 20 },
            { id: 2, name: 'D-002', floorId: 1, x: 25, y: 20 },
            { id: 3, name: 'D-003', floorId: 1, x: 35, y: 20 },
            { id: 4, name: 'D-004', floorId: 1, x: 15, y: 40 },
            { id: 5, name: 'D-005', floorId: 1, x: 25, y: 40 },
            { id: 6, name: 'D-006', floorId: 1, x: 35, y: 40 },
            { id: 7, name: 'D-101', floorId: 2, x: 15, y: 25 },
            { id: 8, name: 'D-102', floorId: 2, x: 25, y: 25 },
            { id: 9, name: 'D-103', floorId: 2, x: 35, y: 25 },
            { id: 10, name: 'D-104', floorId: 2, x: 45, y: 25 }
        ],
        meetingRooms: [
            { id: 1, name: 'Conference Room A', floorId: 1, capacity: 10, equipment: [1, 2, 3] },
            { id: 2, name: 'Huddle Space 1', floorId: 1, capacity: 4, equipment: [2] },
            { id: 3, name: 'Board Room', floorId: 2, capacity: 16, equipment: [1, 2, 3, 4, 5] },
            { id: 4, name: 'Meeting Room B', floorId: 2, capacity: 8, equipment: [1, 2] }
        ],
        equipment: [
            { id: 1, name: 'Projector', icon: 'fa-tv' },
            { id: 2, name: 'Whiteboard', icon: 'fa-chalkboard' },
            { id: 3, name: 'Video Conference', icon: 'fa-video' },
            { id: 4, name: 'Conference Phone', icon: 'fa-phone' },
            { id: 5, name: 'Display Screen', icon: 'fa-desktop' }
        ],
        deskBookings: [],
        meetingBookings: []
    },

    // Initialize data store
    init() {
        // Load data from localStorage or use defaults
        const storedData = localStorage.getItem('officeBookingData');
        if (storedData) {
            this.data = JSON.parse(storedData);
            // Ensure all collections exist
            Object.keys(this.defaults).forEach(key => {
                if (!this.data[key]) {
                    this.data[key] = this.defaults[key];
                }
            });
        } else {
            this.data = JSON.parse(JSON.stringify(this.defaults));
        }
        this.save();
    },

    // Save to localStorage
    save() {
        localStorage.setItem('officeBookingData', JSON.stringify(this.data));
    },

    // Reset to defaults
    reset() {
        this.data = JSON.parse(JSON.stringify(this.defaults));
        this.save();
    },

    // Generic CRUD operations
    getAll(collection) {
        return this.data[collection] || [];
    },

    getById(collection, id) {
        return this.data[collection]?.find(item => item.id === id);
    },

    add(collection, item) {
        const maxId = Math.max(0, ...this.data[collection].map(i => i.id));
        item.id = maxId + 1;
        this.data[collection].push(item);
        this.save();
        return item;
    },

    update(collection, id, updates) {
        const index = this.data[collection].findIndex(item => item.id === id);
        if (index !== -1) {
            this.data[collection][index] = { ...this.data[collection][index], ...updates };
            this.save();
            return this.data[collection][index];
        }
        return null;
    },

    delete(collection, id) {
        const index = this.data[collection].findIndex(item => item.id === id);
        if (index !== -1) {
            this.data[collection].splice(index, 1);
            this.save();
            return true;
        }
        return false;
    },

    // Specific queries
    getDesksByFloor(floorId) {
        return this.data.desks.filter(desk => desk.floorId === floorId);
    },

    getRoomsByFloor(floorId) {
        return this.data.meetingRooms.filter(room => room.floorId === floorId);
    },

    getDeskBookingsForDate(date) {
        return this.data.deskBookings.filter(booking => booking.date === date);
    },

    getMeetingBookingsForDate(date) {
        return this.data.meetingBookings.filter(booking => booking.date === date);
    },

    getUserBookings(userId) {
        return {
            desks: this.data.deskBookings.filter(b => b.userId === userId),
            meetings: this.data.meetingBookings.filter(b => b.userId === userId)
        };
    },

    isDeskBooked(deskId, date) {
        return this.data.deskBookings.some(b => b.deskId === deskId && b.date === date);
    },

    getDeskBooking(deskId, date) {
        return this.data.deskBookings.find(b => b.deskId === deskId && b.date === date);
    },

    isTimeSlotBooked(roomId, date, startTime, endTime) {
        return this.data.meetingBookings.some(b => 
            b.roomId === roomId && 
            b.date === date && 
            ((startTime >= b.startTime && startTime < b.endTime) ||
             (endTime > b.startTime && endTime <= b.endTime) ||
             (startTime <= b.startTime && endTime >= b.endTime))
        );
    },

    getRoomBookingsForDate(roomId, date) {
        return this.data.meetingBookings.filter(b => b.roomId === roomId && b.date === date);
    }
};

// Initialize on load
DataStore.init();

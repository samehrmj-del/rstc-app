module.exports = {
    validMission: {
        name: 'Test Mission',
        start_date: '2024-01-01',
        end_date: '2024-01-10',
        issue_date: '2024-01-01',
        mission_type: 'Internal',
        location: 'Tehran',
        region: 'North',
        device_type: 'Laptop',
        device_serial: 'SN123456',
        is_single: 1,
        is_group: 0,
        is_supplied: 1,
        is_unsupplied: 0,
        notes: 'Test mission notes'
    },
    updatePayload: {
        name: 'Updated Mission',
        start_date: '2024-02-01',
        end_date: '2024-02-10',
        issue_date: '2024-02-01',
        mission_type: 'External',
        location: 'Shiraz',
        region: 'South',
        device_type: 'Mobile',
        device_serial: 'SN789012',
        is_single: 0,
        is_group: 1,
        is_supplied: 0,
        is_unsupplied: 1,
        notes: 'Updated notes'
    }
};

module.exports = {
    validUser: {
        username: 'testuser',
        password: 'password123',
        role: 'user',
        permissions: ['users:view']
    },
    validAdmin: {
        username: 'admin',
        password: 'test-admin-password'
    },
    updatePayload: {
        username: 'updateduser',
        role: 'editor',
        status: 'active',
        permissions: ['users:view', 'users:edit']
    },
    passwordChange: {
        currentPassword: 'password123',
        newPassword: 'newpassword456'
    }
};

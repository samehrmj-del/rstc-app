const MODULES = {
    DASHBOARD: 'dashboard',
    PERSONNEL: 'personnel',
    MISSIONS: 'missions',
    REPORTS: 'reports',
    BACKUP: 'backup',
    USERS: 'users',
    OPTIONS: 'options',
    AUDIT: 'audit',
    AI_CHAT: 'ai_chat',
};

const ACTIONS = {
    VIEW: 'view',
    CREATE: 'create',
    EDIT: 'edit',
    DELETE: 'delete',
};

const PERMISSIONS = {
    DASHBOARD_VIEW: `${MODULES.DASHBOARD}:${ACTIONS.VIEW}`,
    PERSONNEL_VIEW: `${MODULES.PERSONNEL}:${ACTIONS.VIEW}`,
    PERSONNEL_CREATE: `${MODULES.PERSONNEL}:${ACTIONS.CREATE}`,
    PERSONNEL_EDIT: `${MODULES.PERSONNEL}:${ACTIONS.EDIT}`,
    PERSONNEL_DELETE: `${MODULES.PERSONNEL}:${ACTIONS.DELETE}`,
    MISSIONS_VIEW: `${MODULES.MISSIONS}:${ACTIONS.VIEW}`,
    MISSIONS_CREATE: `${MODULES.MISSIONS}:${ACTIONS.CREATE}`,
    MISSIONS_EDIT: `${MODULES.MISSIONS}:${ACTIONS.EDIT}`,
    MISSIONS_DELETE: `${MODULES.MISSIONS}:${ACTIONS.DELETE}`,
    REPORTS_VIEW: `${MODULES.REPORTS}:${ACTIONS.VIEW}`,
    BACKUP_VIEW: `${MODULES.BACKUP}:${ACTIONS.VIEW}`,
    BACKUP_CREATE: `${MODULES.BACKUP}:${ACTIONS.CREATE}`,
    BACKUP_RESTORE: `${MODULES.BACKUP}:${ACTIONS.DELETE}`,
    USERS_VIEW: `${MODULES.USERS}:${ACTIONS.VIEW}`,
    USERS_CREATE: `${MODULES.USERS}:${ACTIONS.CREATE}`,
    USERS_EDIT: `${MODULES.USERS}:${ACTIONS.EDIT}`,
    USERS_DELETE: `${MODULES.USERS}:${ACTIONS.DELETE}`,
    OPTIONS_VIEW: `${MODULES.OPTIONS}:${ACTIONS.VIEW}`,
    OPTIONS_EDIT: `${MODULES.OPTIONS}:${ACTIONS.EDIT}`,
    AUDIT_VIEW: `${MODULES.AUDIT}:${ACTIONS.VIEW}`,
    AI_CHAT_VIEW: `${MODULES.AI_CHAT}:${ACTIONS.VIEW}`,
};

const MODULE_LABELS = {
    [MODULES.DASHBOARD]: 'داشبورد',
    [MODULES.PERSONNEL]: 'مدیریت پرسنل',
    [MODULES.MISSIONS]: 'صدور ماموریت',
    [MODULES.REPORTS]: 'گزارش‌گیری',
    [MODULES.BACKUP]: 'پشتیبان‌گیری',
    [MODULES.USERS]: 'کاربران سیستم',
    [MODULES.OPTIONS]: 'گزینه‌های سیستم',
    [MODULES.AUDIT]: 'لاگ فعالیت‌ها',
    [MODULES.AI_CHAT]: 'دستیار هوشمند',
};

const ACTION_LABELS = {
    [ACTIONS.VIEW]: 'مشاهده',
    [ACTIONS.CREATE]: 'ایجاد',
    [ACTIONS.EDIT]: 'ویرایش',
    [ACTIONS.DELETE]: 'حذف',
};

const ROLE_PERMISSIONS = {
    admin: Object.values(PERMISSIONS),
    editor: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.PERSONNEL_VIEW,
        PERMISSIONS.PERSONNEL_CREATE,
        PERMISSIONS.PERSONNEL_EDIT,
        PERMISSIONS.MISSIONS_VIEW,
        PERMISSIONS.MISSIONS_CREATE,
        PERMISSIONS.MISSIONS_EDIT,
        PERMISSIONS.REPORTS_VIEW,
        PERMISSIONS.AI_CHAT_VIEW,
    ],
    operator: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.MISSIONS_VIEW,
        PERMISSIONS.MISSIONS_CREATE,
        PERMISSIONS.MISSIONS_EDIT,
        PERMISSIONS.REPORTS_VIEW,
        PERMISSIONS.AI_CHAT_VIEW,
    ],
    viewer: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.PERSONNEL_VIEW,
        PERMISSIONS.MISSIONS_VIEW,
        PERMISSIONS.REPORTS_VIEW,
        PERMISSIONS.AI_CHAT_VIEW,
    ],
};

const MISSION_FIELDS = [
    'decree_num',
    'name',
    'lname',
    'emp_num',
    'job_title',
    'mission_type',
    'device_type',
    'repair_type',
    'region',
    'location',
    'subject',
    'device_serial',
    'duration',
    'overtime_hours',
    'start_date',
    'end_date',
    'issue_date',
    'is_single',
    'is_group',
    'is_supplied',
    'is_unsupplied',
    'is_issued',
    'is_extended',
    'is_gov',
    'is_plane',
    'is_train',
    'is_agency',
    'is_bus',
    'is_personal',
];

module.exports = {
    MODULES,
    ACTIONS,
    PERMISSIONS,
    MODULE_LABELS,
    ACTION_LABELS,
    ROLE_PERMISSIONS,
    MISSION_FIELDS,
};

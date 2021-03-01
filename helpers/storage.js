const storage_path = () => {
    return 'storage';
}

const storage_logs_path = () => {
    return 'storage/logs';
}

const ups_locked_file = () => {
    return 'storage/instagram_login.locked'
}

module.exports = {
    storage_path,
    ups_locked_file
}
const db = require('../db');

module.exports = db.defineModel('user', {
    password: db.STRING(50),
    username: db.STRING(50),
});
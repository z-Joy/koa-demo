const db = require('../db');

module.exports = db.defineModel('todo', {
    name: db.STRING(50),
    description: db.STRING(50),
});

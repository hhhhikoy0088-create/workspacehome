const Database = require('better-sqlite3');

// 注意路径：你的 db 在 server 文件夹里
const db = new Database('./server/market.db');

// 查看 users 表
const users = db.prepare('SELECT * FROM users').all();

console.log('===== USERS TABLE =====');
console.log(users);
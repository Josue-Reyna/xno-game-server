PORT = process.env.PORT || 3000;

HOST = process.env.HOST || '0.0.0.0';

DB_URI = process.env.DB_URI || "mongodb://localhost/test";

module.exports = {PORT, HOST, DB_URI};

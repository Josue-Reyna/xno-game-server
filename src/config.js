PORT = process.env.PORT || 3000;

HOST = process.env.HOST || '0.0.0.0';

DB_URI = process.env.DB_URI || "mongodb+srv://jos:pEr6FyTPvIwiPqcG@cluster0.p5j8tre.mongodb.net/?retryWrites=true&w=majority";

module.exports = {PORT, HOST, DB_URI};

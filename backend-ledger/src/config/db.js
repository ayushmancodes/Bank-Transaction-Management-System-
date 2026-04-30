const mongoose = require('mongoose');

function connectDB() {
    mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("Connected to database");
    })
    .catch(err => {
        console.log("Error connecting to DB");
        process.exit(1);
    })
}

module.exports = connectDB


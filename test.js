const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://admin:laundrify123@laundrify.wgpxok9.mongodb.net/laundrify')
    .then(() => console.log('✅ WORKS!'))
    .catch(err => console.log('❌', err.message));
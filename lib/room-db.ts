import * as admin from 'firebase-admin';

const serviceAccount = require('../.secret/room-finder-service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://room-finder-4d2b2.firebaseio.com'
});

export default admin;
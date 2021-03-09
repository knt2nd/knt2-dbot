const admin = require('firebase-admin');
const { BaseStore } = require('../../app/datastore');

class FireStore extends BaseStore {
  constructor(credential, id, interval) {
    super(interval);
    this.credential = credential;
    this.id = id;
    this.collection = null;
  }

  async initialize() {
    admin.initializeApp({ credential: admin.credential.cert(this.credential) });
    this.collection = admin.firestore().collection(this.id);
    await this.collection.listDocuments(); // to check permission
  }

  async get(key) {
    return await this.collection.doc(key).get().then(doc => doc.data());
  }

  async set(key, value) {
    await this.collection.doc(key).set(value);
  }
}

module.exports = FireStore;

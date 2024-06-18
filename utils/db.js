import { MongoClient } from 'mongodb';

const HOST = process.env.DB_HOST || 'localhost';
const PORT = process.env.DB_PORT || 27017;
const DATABASE = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${HOST}:${PORT}`;

class DBClient {
  constructor() {
    this.client = new MongoClient(url, { useUnifiedTopology: true, useNewUrlParser: true });
    this.connected = false;

    this.client.connect()
      .then(() => {
        this.db = this.client.db(DATABASE);
        this.connected = true;
        console.log('Connected to MongoDB server');
      })
      .catch((err) => {
        console.error(`MongoDB connection error: ${err}`);
      });
  }

  isAlive() {
    return this.connected;
  }

  async nbUsers() {
    if (!this.db) {
      console.error('Database not initialized');
      return 0;
    }
    try {
      return await this.db.collection('users').countDocuments();
    } catch (err) {
      console.error(`Error counting users: ${err}`);
      return 0;
    }
  }

  async nbFiles() {
    if (!this.db) {
      console.error('Database not initialized');
      return 0;
    }
    try {
      return await this.db.collection('files').countDocuments();
    } catch (err) {
      console.error(`Error counting files: ${err}`);
      return 0;
    }
  }
}

const dbClient = new DBClient();
export default dbClient;

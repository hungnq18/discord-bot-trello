const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');
const config = require('../config');

let client;
let database;
let bucket;

async function connect() {
  client = new MongoClient(config.mongo.uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  database = client.db(config.mongo.dbName);
  bucket = new GridFSBucket(database, { bucketName: 'documents' });
  const day = 86400;
  await Promise.all([
    // TTL indexes keep logs / dedupe keys from growing forever.
    database.collection('logs').createIndex({ ts: 1 }, { expireAfterSeconds: config.logRetentionDays * day }),
    database.collection('logs').createIndex({ source: 1 }),
    database.collection('notified').createIndex({ ts: 1 }, { expireAfterSeconds: 90 * day }),
    database.collection('reports').createIndex({ week_end: -1 }),
  ]);
}

const col = (name) => {
  if (!database) throw new Error('MongoDB chưa kết nối');
  return database.collection(name);
};
const files = () => {
  if (!bucket) throw new Error('MongoDB chưa kết nối');
  return bucket;
};

// API shape: Mongo's _id becomes a string `id`.
const out = ({ _id, ...rest }) => ({ id: String(_id), ...rest });
const toObjectId = (v) => (ObjectId.isValid(String(v)) ? new ObjectId(String(v)) : null);

const close = () => client?.close();

module.exports = { connect, close, col, files, out, toObjectId, ObjectId };

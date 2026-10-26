const { Readable } = require('stream');
const config = require('../config');
const db = require('./db');
const discord = require('./discord');
const logger = require('./logger');

const docsCol = () => db.col('documents');

const mapVersion = (docId, v) => ({
  id: `${docId}-${v.version}`, version: v.version, filename: v.filename, size: v.size,
  mime: v.mime, uploader: v.uploader, note: v.note, created_at: v.created_at,
});
const sorted = (d) => [...d.versions].sort((a, b) => a.version - b.version);

async function listDocs() {
  const docs = await docsCol().find({}).toArray();
  return docs
    .filter((d) => d.versions.length)
    .map((d) => {
      const v = sorted(d).at(-1);
      return { id: String(d._id), title: d.title, description: d.description, latest: v.version,
               filename: v.filename, size: v.size, updated_at: v.created_at, uploader: v.uploader };
    })
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

async function getDoc(id) {
  const _id = db.toObjectId(id);
  const d = _id && (await docsCol().findOne({ _id }));
  if (!d) return null;
  return { id: String(d._id), title: d.title, description: d.description, created_at: d.created_at,
           versions: sorted(d).reverse().map((v) => mapVersion(d._id, v)) };
}

// Raw version record (includes the GridFS file id) for downloads.
async function getVersion(id, version) {
  const _id = db.toObjectId(id);
  const d = _id && (await docsCol().findOne({ _id }));
  return d?.versions.find((v) => v.version === Number(version)) || null;
}

const openDownload = (v) => db.files().openDownloadStream(v.file_id);

function storeFile(file, filename) {
  return new Promise((resolve, reject) => {
    const up = db.files().openUploadStream(filename, { contentType: file.mimetype });
    Readable.from(file.buffer).pipe(up).on('error', reject).on('finish', () => resolve(up.id));
  });
}

// Add a new document (v1) or a new version of an existing one. `file` is a multer memory file.
async function saveUpload({ docId, title, description, file, uploader, note }) {
  const filename = Buffer.from(file.originalname, 'latin1').toString('utf8'); // multer decodes as latin1
  const meta = { filename, size: file.size, mime: file.mimetype, uploader: uploader || null, note: note || null, created_at: new Date() };
  let doc, version;

  if (docId) {
    const _id = db.toObjectId(docId);
    // Reserve the version number atomically so concurrent uploads never collide.
    doc = _id && (await docsCol().findOneAndUpdate({ _id }, { $inc: { last_version: 1 } }, { returnDocument: 'after' }));
    if (!doc) throw Object.assign(new Error('Không tìm thấy tài liệu'), { status: 404 });
    version = doc.last_version;
    const file_id = await storeFile(file, filename);
    await docsCol().updateOne({ _id: doc._id }, { $push: { versions: { version, file_id, ...meta } } });
  } else {
    version = 1;
    const file_id = await storeFile(file, filename);
    const doc0 = { title: title || filename, description: description || null, created_at: new Date(), last_version: 1,
                   versions: [{ version, file_id, ...meta }] };
    doc = { ...doc0, _id: (await docsCol().insertOne(doc0)).insertedId };
  }

  logger.info('docs', version === 1 ? 'create' : 'update', `${doc.title} v${version}`, { docId: String(doc._id), file: filename });
  discord.sendText(`📄 **${doc.title}** ${version === 1 ? 'được tải lên' : `cập nhật lên v${version}`} (${filename})${note ? `\n> ${note}` : ''}`, config.docsChannelId)
    .catch((e) => logger.error('docs', 'notify', e.message));
  return { doc: { id: String(doc._id), title: doc.title }, version };
}

async function removeDoc(id) {
  const _id = db.toObjectId(id);
  const d = _id && (await docsCol().findOneAndDelete({ _id }));
  if (!d) return false;
  await Promise.all(d.versions.map((v) => db.files().delete(v.file_id).catch(() => {})));
  logger.warn('docs', 'delete', `${d.title} deleted`, { versions: d.versions.length });
  return true;
}

module.exports = { listDocs, getDoc, getVersion, openDownload, saveUpload, removeDoc };

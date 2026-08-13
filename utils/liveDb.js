/**
 * Connect to the LIVE database, and prove it is the live one before returning.
 *
 * Why this exists: the project has two databases that are both called
 * "thecrosswild" and both contain the same products — an old MongoDB Atlas copy
 * (named in .env) and the Coolify-managed database the website actually reads
 * (named in .env.production). A bulk import once went into the wrong one and
 * looked completely successful, because every count and every name matched.
 *
 * A name check cannot tell them apart. So this asks the WEBSITE what it is
 * currently serving — /api/products/version returns "<activeCount>:<lastModified>"
 * — and refuses to hand back a connection unless the database just opened
 * produces the same signature. A database that disagrees with the live site is,
 * by definition, not the live database.
 */
const path = require('path');
const mongoose = require('mongoose');

const DEFAULT_VERIFY_URL = 'http://localhost:3000/api/products/version';

/** Swap the URI's host for one reachable from here (SSH tunnel / public port). */
function withHost(uri, hostPort) {
  if (!hostPort) return uri;
  return uri.replace(/@[^/?]+/, `@${hostPort}`);
}

function maskUri(uri) {
  return uri.replace(/\/\/([^:]+):[^@]+@/, '//$1:****@');
}

/**
 * @param {object} opts
 * @param {string} [opts.hostOverride]  e.g. "217.216.59.240:27417"
 * @param {string} [opts.verifyUrl]     where to ask what the site is serving
 * @param {boolean} [opts.skipVerify]   escape hatch, prints a loud warning
 * @param {boolean} [opts.useProduction] load .env.production instead of .env
 */
async function connectVerified(opts = {}) {
  const envFile = opts.useProduction === false ? '.env' : '.env.production';
  require('dotenv').config({ path: path.join(__dirname, '..', envFile) });

  if (!process.env.MONGODB_URI) {
    throw new Error(`MONGODB_URI is not set in ${envFile}`);
  }

  const uri = withHost(process.env.MONGODB_URI, opts.hostOverride);
  console.log(`Connecting to : ${maskUri(uri)}`);

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 20000,
    autoIndex: false,
    ...(process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {}),
  });
  console.log(`Connected     : host ${conn.connection.host}  database ${conn.connection.name}`);

  const Product = require('../models/Product');
  const activeCount = await Product.countDocuments({ isActive: true });
  const latest = await Product.findOne({ isActive: true }).sort({ updatedAt: -1 }).select('updatedAt').lean();
  const localSig = `${activeCount}:${latest?.updatedAt ? new Date(latest.updatedAt).getTime() : 0}`;

  if (opts.skipVerify) {
    console.log(`Live-site check: SKIPPED. This database reports ${localSig}.\n`);
    return { conn, localSig, verified: false };
  }

  const verifyUrl = opts.verifyUrl || DEFAULT_VERIFY_URL;
  let siteSig = null;
  try {
    const res = await fetch(verifyUrl, { signal: AbortSignal.timeout(20000) });
    if (res.ok) siteSig = (await res.json()).version;
  } catch (e) {
    console.error(`  could not reach ${verifyUrl} — ${e.message}`);
  }

  if (!siteSig) {
    await mongoose.disconnect().catch(() => {});
    throw new Error(
      `Could not ask the website what it is serving (${verifyUrl}).\n` +
      `  Start the site locally, point --verify-url at the live backend, or pass\n` +
      `  --skip-live-check if you are certain this is the right database.`
    );
  }

  console.log(`Website serves: ${siteSig}`);
  console.log(`This database : ${localSig}`);
  if (siteSig !== localSig) {
    await mongoose.disconnect().catch(() => {});
    throw new Error(
      `This is NOT the database the website reads.\n` +
      `  Writing here would change nothing on the live site. Check --host and ${envFile}.`
    );
  }
  console.log('Match — this is the live database.\n');
  return { conn, localSig, verified: true };
}

module.exports = { connectVerified, withHost, maskUri, DEFAULT_VERIFY_URL };

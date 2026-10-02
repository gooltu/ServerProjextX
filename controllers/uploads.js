'use strict'

let crypto = require('crypto');
let AWS = require('aws-sdk');

// Explicit, self-contained client — deliberately NOT the global AWS.config,
// which controllers/registration.js mutates for Cognito (different
// credentials, different region). Keeping this client's config local avoids
// cross-contamination in either direction.
let s3 = new AWS.S3({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	region: process.env.AWS_REGION,
	signatureVersion: 'v4' // ap-south-2 only supports SigV4
});

const BUCKET = 'jewelchat-uploads-prod';
const EXPIRES_SECONDS = 300;
const CONTENT_TYPE_RE = /^(image|video)\/[\w.+-]+$/;
const IMAGE_CONTENT_TYPE_RE = /^image\/[\w.+-]+$/;

function profilePicKey(userId) {
	return `uploads/${userId}/profile`;
}

let uploads = module.exports;

function sanitizeFilename(filename) {
	let base = String(filename).split(/[\\/]/).pop();            // strip any path components
	base = base.replace(/[^a-zA-Z0-9._-]/g, '_');                 // safe charset only
	if (base.length > 200) base = base.slice(base.length - 200);  // cap length, keep extension
	return base;
}

uploads.getUploadUrl = function (req, res, next) {

	let filename = req.body.filename;
	let contentType = req.body.contentType;

	if (!filename || typeof filename !== 'string') {
		return next(new Error('Invalid Data: filename is required'));
	}

	if (!contentType || typeof contentType !== 'string' || !CONTENT_TYPE_RE.test(contentType)) {
		return next(new Error('Invalid Data: contentType must be image/* or video/*'));
	}

	let key = `uploads/${req.user.id}/${crypto.randomUUID()}-${sanitizeFilename(filename)}`;

	s3.getSignedUrlPromise('putObject', {
		Bucket: BUCKET,
		Key: key,
		ContentType: contentType,
		Expires: EXPIRES_SECONDS
	})
		.then(uploadUrl => res.json({ error: false, uploadUrl, key }))
		.catch(err => next(err));

};

// No ownership check: chat attachments are uploaded by the sender but need
// to be fetched by the recipient, and this DB has no messages/conversation
// table to verify "is req.user actually a participant here" — delivery
// happens over the separate MongooseIM/XMPP layer, invisible to this API.
// Any authenticated user who knows the exact (unguessable, UUID-bearing)
// key can get a download URL for it — same trust model as the profile pic
// download endpoint.
uploads.getDownloadUrl = function (req, res, next) {

	let key = req.body.key;

	if (!key || typeof key !== 'string') {
		return next(new Error('Invalid Data: key is required'));
	}

	s3.getSignedUrlPromise('getObject', { Bucket: BUCKET, Key: key, Expires: EXPIRES_SECONDS })
		.then(downloadUrl => res.json({ error: false, downloadUrl }))
		.catch(err => next(err));

};

// Profile pic uses a fixed, deterministic key per user (no UUID) — there's
// only ever one canonical profile pic per user, so the key never needs to
// be stored anywhere; each new upload simply overwrites the previous one.
uploads.getProfilePicUploadUrl = function (req, res, next) {

	let contentType = req.body.contentType;

	if (!contentType || typeof contentType !== 'string' || !IMAGE_CONTENT_TYPE_RE.test(contentType)) {
		return next(new Error('Invalid Data: contentType must be image/*'));
	}

	let key = profilePicKey(req.user.id);

	s3.getSignedUrlPromise('putObject', {
		Bucket: BUCKET,
		Key: key,
		ContentType: contentType,
		Expires: EXPIRES_SECONDS
	})
		.then(uploadUrl => res.json({ error: false, uploadUrl, key }))
		.catch(err => next(err));

};

// Profile pics are visible to any authenticated user (contacts/leaderboard
// display them), so unlike getDownloadUrl there is no ownership check —
// any logged-in user can request any user's profile pic URL.
uploads.getProfilePicDownloadUrl = function (req, res, next) {

	let userId = req.body.userId !== undefined && req.body.userId !== null ? req.body.userId : req.user.id;

	if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) {
		return next(new Error('Invalid Data: userId must be a positive integer'));
	}

	let key = profilePicKey(userId);

	s3.getSignedUrlPromise('getObject', { Bucket: BUCKET, Key: key, Expires: EXPIRES_SECONDS })
		.then(downloadUrl => res.json({ error: false, downloadUrl }))
		.catch(err => next(err));

};

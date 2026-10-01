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

uploads.getDownloadUrl = function (req, res, next) {

	let key = req.body.key;

	if (!key || typeof key !== 'string') {
		return next(new Error('Invalid Data: key is required'));
	}

	if (!key.startsWith(`uploads/${req.user.id}/`)) {
		let err = new Error('Forbidden: key does not belong to this user');
		err.status = 403;
		return next(err);
	}

	s3.getSignedUrlPromise('getObject', { Bucket: BUCKET, Key: key, Expires: EXPIRES_SECONDS })
		.then(downloadUrl => res.json({ error: false, downloadUrl }))
		.catch(err => next(err));

};

'use strict'

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

// Every key must stay under uploads/ - that's the only prefix the uploader
// IAM user and nodeapp-runtime-role may write (ChatServerConf infra/iam/roles.tf).
const BUCKET = 'jewelchat-uploads-prod';

// Gift product images (admingifts.uploadGiftImage, served by
// uploads.getGiftImage). User ids are numeric, so this prefix can't collide
// with a user's uploads/<id>/ folder.
const GIFT_IMAGE_PREFIX = 'uploads/gifts/';
const GIFT_IMAGE_NAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|gif)$/;

module.exports = { s3, BUCKET, GIFT_IMAGE_PREFIX, GIFT_IMAGE_NAME_RE };

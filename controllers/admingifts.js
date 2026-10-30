'use strict'

let knex = require('../db/knex');

// Admin setup of the gift catalog the game section shows (tasksgift.getGiftTasks lists enabled
// gifttasks by priority; redeemGiftTask spends the gifttaskdetails jewels). Product gifts only:
// cash gifts pay out through wallet.js, which is slated for removal, so existing cash gifts can
// only be enabled/disabled here. Gifts are never deleted - gifttaskusers references them.

let admingifts = module.exports;

const MAX_QTY = 100000;
const MAX_PLUS_LEVEL = 1000;
const MAX_PRIORITY = 100000;
const MAX_JEWEL_COUNT = 100000;

// Columns returned to the admin app and written by create/update.
const GIFT_COLUMNS = ['id', 'priority', 'enabled', 'cash', 'productname', 'productdetail', 'product_pic',
  'productlinks', 'money', 'total_qty', 'current_qty', 'plus_level', 'created_at'];


function badRequest(res, message) {
  return res.status(400).json({ error: true, message });
}

function parseGiftId(req) {
  let id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isIntIn(v, min, max) {
  return Number.isInteger(v) && v >= min && v <= max;
}

function optionalText(v, max, field) {
  if (v === undefined || v === null || v === '')
    return { value: null };
  if (typeof v !== 'string' || v.length > max)
    return { message: `${field} must be a string of at most ${max} characters` };
  return { value: v.trim() || null };
}

// Returns { gift, jewels } ready to write, or { message } on the first invalid field.
// Jeweltype existence is checked separately (needs the DB).
function normalizeGift(body) {
  body = body || {};

  let productname = typeof body.productname === 'string' ? body.productname.trim() : '';
  if (!productname || productname.length > 255)
    return { message: 'productname is required (at most 255 characters)' };

  let pic = typeof body.product_pic === 'string' ? body.product_pic.trim() : '';
  let url = null;
  try { url = new URL(pic); } catch (e) { /* invalid */ }
  if (!url || url.protocol !== 'https:' || pic.length > 255)
    return { message: 'product_pic must be an https URL (at most 255 characters)' };

  let detail = optionalText(body.productdetail, 1500, 'productdetail');
  if (detail.message) return detail;
  let links = optionalText(body.productlinks, 1000, 'productlinks');
  if (links.message) return links;

  if (!isIntIn(body.priority, 0, MAX_PRIORITY))
    return { message: `priority must be an integer from 0 to ${MAX_PRIORITY}` };
  if (!isIntIn(body.plus_level, 0, MAX_PLUS_LEVEL))
    return { message: `plus_level must be an integer from 0 to ${MAX_PLUS_LEVEL}` };
  if (!isIntIn(body.total_qty, 1, MAX_QTY))
    return { message: `total_qty must be an integer from 1 to ${MAX_QTY}` };
  if (!isIntIn(body.current_qty, 0, body.total_qty))
    return { message: 'current_qty must be an integer from 0 to total_qty' };
  if (typeof body.enabled !== 'boolean')
    return { message: 'enabled must be a boolean' };

  // redeemGiftTask finds nothing to check (and rejects as "Invalid Task") without requirements.
  if (!Array.isArray(body.jewels) || body.jewels.length === 0)
    return { message: 'jewels must be a non-empty array' };
  let seen = new Set();
  let jewels = [];
  for (let i = 0; i < body.jewels.length; i++) {
    let j = body.jewels[i] || {};
    if (!Number.isInteger(j.jeweltype_id) || j.jeweltype_id < 0)
      return { message: `jewels[${i}].jeweltype_id must be a non-negative integer` };
    if (!isIntIn(j.count, 1, MAX_JEWEL_COUNT))
      return { message: `jewels[${i}].count must be an integer from 1 to ${MAX_JEWEL_COUNT}` };
    if (seen.has(j.jeweltype_id))
      return { message: `jewels[${i}].jeweltype_id ${j.jeweltype_id} is listed twice` };
    seen.add(j.jeweltype_id);
    jewels.push({ jeweltype_id: j.jeweltype_id, count: j.count });
  }

  let gift = {
    productname,
    product_pic: pic,
    productdetail: detail.value,
    productlinks: links.value,
    priority: body.priority,
    plus_level: body.plus_level,
    total_qty: body.total_qty,
    current_qty: body.current_qty,
    enabled: body.enabled
  };
  return { gift, jewels };
}

async function findMissingJeweltypes(jewels) {
  let ids = jewels.map(j => j.jeweltype_id);
  let found = await knex('jeweltype').whereIn('id', ids).pluck('id');
  return ids.filter(id => !found.includes(id));
}

function toApi(row, jewels) {
  return {
    ...row,
    enabled: !!row.enabled,
    cash: !!row.cash,
    money: Number(row.money || 0),
    jewels: jewels || []
  };
}

// Loads gifts (all, or the given ids) with their jewel requirements and how many were won.
async function loadGifts(trx, ids) {
  let giftQuery = trx('gifttasks').select(GIFT_COLUMNS.map(c => `gifttasks.${c}`))
    .orderBy([{ column: 'priority' }, { column: 'id' }]);
  let detailQuery = trx('gifttaskdetails')
    .join('jeweltype', 'gifttaskdetails.jeweltype_id', '=', 'jeweltype.id')
    .orderBy('gifttaskdetails.id')
    .select('gifttaskdetails.gifttask_id', 'gifttaskdetails.jeweltype_id', 'jeweltype.name', 'gifttaskdetails.count');
  let wonQuery = trx('gifttaskusers').where({ done: true }).groupBy('gifttask_id')
    .select('gifttask_id', knex.raw('CAST(COUNT(*) AS SIGNED) as won'));
  if (ids) {
    giftQuery.whereIn('id', ids);
    detailQuery.whereIn('gifttaskdetails.gifttask_id', ids);
    wonQuery.whereIn('gifttask_id', ids);
  }

  let [gifts, details, won] = await Promise.all([giftQuery, detailQuery, wonQuery]);

  let byGift = {};
  for (let d of details)
    (byGift[d.gifttask_id] = byGift[d.gifttask_id] || []).push({ jeweltype_id: d.jeweltype_id, name: d.name, count: d.count });
  let wonByGift = {};
  for (let w of won)
    wonByGift[w.gifttask_id] = w.won;

  return gifts.map(g => ({ ...toApi(g, byGift[g.id]), won: wonByGift[g.id] || 0 }));
}

// Thrown inside a write transaction to roll back and answer with `status`.
class GiftRejected extends Error {
  constructor(status, message, gift) {
    super(message);
    this.status = status;
    this.gift = gift;
  }
}

function sendRejected(res, err) {
  if (!(err instanceof GiftRejected))
    throw err;
  return res.status(err.status).json({ error: true, message: err.message, gift: err.gift });
}



admingifts.getJewelTypes = async function (req, res, next) {
  try {
    let jeweltypes = await knex('jeweltype').orderBy('id').select('id', 'name');
    return res.json({ error: false, jeweltypes });
  } catch (err) {
    next(err);
  }
};

admingifts.getGifts = async function (req, res, next) {
  try {
    return res.json({ error: false, gifts: await loadGifts(knex) });
  } catch (err) {
    next(err);
  }
};

admingifts.createGift = async function (req, res, next) {
  try {
    let { gift, jewels, message } = normalizeGift(req.body);
    if (message)
      return badRequest(res, message);

    let missing = await findMissingJeweltypes(jewels);
    if (missing.length > 0)
      return badRequest(res, `Unknown jeweltype_id: ${missing.join(', ')}`);

    let created = await knex.transaction(async trx => {
      let [id] = await trx('gifttasks').insert({ ...gift, cash: false, money: 0 });
      await trx('gifttaskdetails').insert(jewels.map(j => ({ ...j, gifttask_id: id })));
      let [after] = await loadGifts(trx, [id]);
      await trx('adminlogs').insert({ admin_id: req.user.id, action: 'gift_create', payload: JSON.stringify({ after }) });
      return after;
    });
    return res.json({ error: false, gift: created });
  } catch (err) {
    next(err);
  }
};

// Full replace of a product gift's fields and jewel requirements. `expected_current_qty` is
// required: redeemGiftTask decrements current_qty as players win, so a stale edit would
// otherwise silently restock gifts that were already handed out.
admingifts.updateGift = async function (req, res, next) {
  try {
    let id = parseGiftId(req);
    if (!id)
      return badRequest(res, 'Invalid gift id');

    let { gift, jewels, message } = normalizeGift(req.body);
    if (message)
      return badRequest(res, message);
    let expected = req.body.expected_current_qty;
    if (!Number.isInteger(expected))
      return badRequest(res, 'expected_current_qty must be an integer');

    let missing = await findMissingJeweltypes(jewels);
    if (missing.length > 0)
      return badRequest(res, `Unknown jeweltype_id: ${missing.join(', ')}`);

    try {
      let updated = await knex.transaction(async trx => {
        let row = await trx('gifttasks').where({ id }).forUpdate().first('id', 'cash', 'current_qty');
        if (!row)
          throw new GiftRejected(404, 'Gift not found');
        if (row.cash)
          throw new GiftRejected(400, 'Cash gifts can only be enabled or disabled');

        let [before] = await loadGifts(trx, [id]);
        if (row.current_qty !== expected)
          throw new GiftRejected(409, 'Gift quantity changed since it was loaded', before);

        await trx('gifttasks').where({ id }).update(gift);
        await trx('gifttaskdetails').where({ gifttask_id: id }).del();
        await trx('gifttaskdetails').insert(jewels.map(j => ({ ...j, gifttask_id: id })));
        let [after] = await loadGifts(trx, [id]);
        await trx('adminlogs').insert({ admin_id: req.user.id, action: 'gift_update', payload: JSON.stringify({ before, after }) });
        return after;
      });
      return res.json({ error: false, gift: updated });
    } catch (err) {
      return sendRejected(res, err);
    }
  } catch (err) {
    next(err);
  }
};

admingifts.setGiftEnabled = async function (req, res, next) {
  try {
    let id = parseGiftId(req);
    if (!id)
      return badRequest(res, 'Invalid gift id');
    if (typeof req.body.enabled !== 'boolean')
      return badRequest(res, 'enabled must be a boolean');

    try {
      let updated = await knex.transaction(async trx => {
        let row = await trx('gifttasks').where({ id }).forUpdate().first('id', 'enabled');
        if (!row)
          throw new GiftRejected(404, 'Gift not found');

        await trx('gifttasks').where({ id }).update({ enabled: req.body.enabled });
        let [after] = await loadGifts(trx, [id]);
        await trx('adminlogs').insert({
          admin_id: req.user.id,
          action: 'gift_enable',
          payload: JSON.stringify({ gift_id: id, before: !!row.enabled, after: req.body.enabled })
        });
        return after;
      });
      return res.json({ error: false, gift: updated });
    } catch (err) {
      return sendRejected(res, err);
    }
  } catch (err) {
    next(err);
  }
};

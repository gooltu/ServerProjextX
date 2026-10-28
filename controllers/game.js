'use strict'

let game = module.exports;
let knex = require('../db/knex');
let Promise = require('bluebird');
let jwt = require('jsonwebtoken');
let crypto = require('crypto');
let config = require('../utils/config');

const JEWEL_TYPES = [3, 6, 9, 12, 15];
const LOT_SIZE = 25;
const VALID_JEWEL_TYPES = new Set(JEWEL_TYPES);


game.getJewels = function (req, res, next) {

  let jewels = [];
  for (let i = 0; i < LOT_SIZE; i++) {
    jewels.push(JEWEL_TYPES[Math.floor(Math.random() * JEWEL_TYPES.length)]);
  }

  let code = jwt.sign(
    { id: req.user.id, ts: Date.now(), nonce: crypto.randomUUID() },
    config.secret,
    { noTimestamp: true }
  );

  res.json({ error: false, jewels, code });

}


game.checkJewelCode = function (req, res, next) {

  jwt.verify(req.body.code, config.secret, (err, decoded) => {

    if (err)
      return next(err);

    if (decoded.id !== req.user.id) {
      let userErr = new Error('Invalid Code');
      return next(userErr);
    }

    let ageSeconds = Math.floor((Date.now() - decoded.ts) / 1000);
    return res.json({ error: false, valid: true, ageSeconds });

  });

}



game.pickJewel = function (req, res, next) {


  let jeweltype = req.body.jeweltype;

  if (!(jeweltype == 3 || jeweltype == 6 || jeweltype == 9 || jeweltype == 12 || jeweltype == 15))
    throw new Error('Illegal Operation');


  knex.transaction(trx => {



    knex('jewels')
      .where({ user_id: req.user.id })
      .whereNotIn('jeweltype_id', [0, 1, 2])
      .sum('count as sum')
      .transacting(trx)
      .forUpdate()
      .then(total => {

        if (total[0].sum >= 25)
          throw new Error('Jewel Store is full');
        else
          return knex('jewels').where({ user_id: req.user.id, jeweltype_id: jeweltype })
            .increment('count', 1)
            .increment('total_count', 1)
            .transacting(trx);

      })
      // .then( values => {

      //     for( let i=0; i<values.length; i++ ){
      //       console.log('>>>>>>>'+values[i]);
      //       if(values[i] == 0 ){                  
      //         throw new Error('Transaction failed');
      //       }
      //     }
      // })
      .then(trx.commit)
      .catch(trx.rollback)




  })
    .then(values => {
      return res.json({ error: false, message: 'Jewel added' });
    })
    .catch(err => {
      next(err);
    });


};


async function applyBulkJewels(userId, jewelarray) {
  await knex.transaction(async trx => {
    const total = await trx('jewels')
      .where({ user_id: userId })
      .whereNotIn('jeweltype_id', [0, 1, 2])
      .sum('count as sum')
      .forUpdate();

    const currentSum = Number(total[0]?.sum || 0);
    if (currentSum >= LOT_SIZE) {
      throw new Error('Jewel Store is full');
    }

    let availableSlots = LOT_SIZE - currentSum;
    const countsByType = {};

    for (let i = 0; i < jewelarray.length; i++) {
      if (availableSlots <= 0) {
        break;
      }

      const type = jewelarray[i]?.type;
      if (VALID_JEWEL_TYPES.has(type)) {
        countsByType[type] = (countsByType[type] || 0) + 1;
        availableSlots--;
      }
    }

    const typesToUpdate = Object.keys(countsByType).map(Number);
    if (typesToUpdate.length === 0) {
      return;
    }

    let caseSql = 'CASE jeweltype_id ';
    const bindings = [];
    for (const type of typesToUpdate) {
      caseSql += 'WHEN ? THEN ? ';
      bindings.push(type, countsByType[type]);
    }
    caseSql += 'ELSE 0 END';

    const updatedRows = await trx('jewels')
      .where({ user_id: userId })
      .whereIn('jeweltype_id', typesToUpdate)
      .update({
        count: trx.raw(`count + ${caseSql}`, bindings),
        total_count: trx.raw(`total_count + ${caseSql}`, bindings)
      });

    if (updatedRows === 0) {
      throw new Error('Transaction failed');
    }
  });
}


game.bulkPickJewel = async function (req, res, next) {
  try {
    let jewelarray = req.body.jewelarray;

    if (!Array.isArray(jewelarray) || jewelarray.length === 0) {
      throw new Error('Invalid data');
    }

    await applyBulkJewels(req.user.id, jewelarray);

    return res.json({ error: false, message: 'Jewels added' });
  } catch (err) {
    next(err);
  }
};


function verifyCodeForUser(code, userId) {
  let decoded = jwt.verify(code, config.secret); // throws on bad signature/malformed code
  if (decoded.id !== userId) {
    throw new Error('Invalid Code');
  }
  return decoded;
}


game.bulkPickJewelVerified = async function (req, res, next) {
  try {
    let jewelarray = req.body.jewelarray;

    if (!Array.isArray(jewelarray) || jewelarray.length === 0) {
      throw new Error('Invalid data');
    }

    // All-or-nothing: verify every item's code is genuinely this backend's and bound to this
    // user before touching the database.
    for (let i = 0; i < jewelarray.length; i++) {
      verifyCodeForUser(jewelarray[i].code, req.user.id);
    }

    await applyBulkJewels(req.user.id, jewelarray);

    return res.json({ error: false, message: 'Jewels added' });
  } catch (err) {
    next(err);
  }
};



game.getGameState = function (req, res, next) {

  Promise.all([
    knex('scores').where({ user_id: req.user.id }).select(),
    knex('jewels').where({ user_id: req.user.id }).select()
  ])
    .then((values) => {
      return res.json({ error: false, scores: values[0][0], jewels: values[1] });
    })
    .catch(err => {
      next(err);
    });

};



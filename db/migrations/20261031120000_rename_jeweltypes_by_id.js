// The game app names collectible jewels after their id (j3..j17, matching its icon set) and
// never reads jeweltype.name, but the original seed named ids 3..17 "j1".."j15". Rename them
// so the admin app and the DB agree with what players see. Only rows still carrying the old
// seed name are touched.

exports.up = function (knex) {
  return knex('jeweltype')
    .whereBetween('id', [3, 17])
    .whereRaw("name = CONCAT('j', id - 2)")
    .update({ name: knex.raw("CONCAT('j', id)") });
};

exports.down = function (knex) {
  return knex('jeweltype')
    .whereBetween('id', [3, 17])
    .whereRaw("name = CONCAT('j', id)")
    .update({ name: knex.raw("CONCAT('j', id - 2)") });
};

// What a product gift is worth, in rupees - set in the admin app for display/reference.
// Deliberately separate from `money`, which redeemGiftTask pays into the wallet when
// `cash` is set; product_value is never paid out.

exports.up = function (knex) {
  return knex.schema.alterTable('gifttasks', table => {
    table.decimal('product_value', 10, 2).nullable().after('money');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('gifttasks', table => {
    table.dropColumn('product_value');
  });
};

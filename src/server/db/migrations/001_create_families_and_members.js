/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // families 表
  await knex.schema.createTable('families', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // members 表
  await knex.schema.createTable('members', (table) => {
    table.increments('id').primary();
    table.integer('family_id').unsigned().notNullable()
      .references('id').inTable('families').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.enum('role', ['admin', 'member', 'child']).defaultTo('member');
    table.string('avatar', 500);
    table.string('email', 255);
    table.string('phone', 50);
    table.date('birthday');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('family_id');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('members');
  await knex.schema.dropTableIfExists('families');
}

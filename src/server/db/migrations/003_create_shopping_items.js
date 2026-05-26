/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('shopping_items', (table) => {
    table.increments('id').primary();
    table.integer('family_id').unsigned().notNullable()
      .references('id').inTable('families').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.enum('category', ['produce', 'meat', 'dairy', 'bakery', 'frozen', 'pantry', 'condiment', 'other']).defaultTo('other');
    table.string('quantity', 100);
    table.boolean('checked').defaultTo(false);
    table.integer('added_by').unsigned()
      .references('id').inTable('members').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('family_id');
    table.index(['family_id', 'checked']);
    table.index('category');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('shopping_items');
}

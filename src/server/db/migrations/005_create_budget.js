/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // budget_categories 表
  await knex.schema.createTable('budget_categories', (table) => {
    table.increments('id').primary();
    table.integer('family_id').unsigned().notNullable()
      .references('id').inTable('families').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.decimal('budget_limit', 12, 2).notNullable().defaultTo(0);
    table.string('color', 20).defaultTo('#3B82F6');
    table.string('icon', 50);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('family_id');
  });

  // expenses 表
  await knex.schema.createTable('expenses', (table) => {
    table.increments('id').primary();
    table.integer('family_id').unsigned().notNullable()
      .references('id').inTable('families').onDelete('CASCADE');
    table.integer('category_id').unsigned()
      .references('id').inTable('budget_categories').onDelete('SET NULL');
    table.decimal('amount', 12, 2).notNullable();
    table.string('description', 500);
    table.date('expense_date').notNullable();
    table.enum('expense_type', ['expense', 'income']).defaultTo('expense');
    table.integer('member_id').unsigned()
      .references('id').inTable('members').onDelete('SET NULL');
    table.string('payment_method', 50);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('family_id');
    table.index('category_id');
    table.index('expense_date');
    table.index('member_id');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('expenses');
  await knex.schema.dropTableIfExists('budget_categories');
}

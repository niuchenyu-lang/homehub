/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.alterTable('tasks', (table) => {
    table.integer('parent_id').unsigned().nullable()
      .references('id').inTable('tasks').onDelete('CASCADE');
    table.string('recurrence_rule', 100).nullable();
    table.timestamp('recurrence_end').nullable();
    table.index('parent_id');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable('tasks', (table) => {
    table.dropIndex('parent_id');
    table.dropColumn('parent_id');
    table.dropColumn('recurrence_rule');
    table.dropColumn('recurrence_end');
  });
}

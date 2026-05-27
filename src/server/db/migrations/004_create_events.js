/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('events', (table) => {
    table.increments('id').primary();
    table.integer('family_id').unsigned().notNullable()
      .references('id').inTable('families').onDelete('CASCADE');
    table.string('title', 200).notNullable();
    table.text('description');
    table.datetime('start_time').notNullable();
    table.datetime('end_time');
    table.boolean('all_day').defaultTo(false);
    table.string('location', 200);
    table.enum('event_type', ['personal', 'family', 'task', 'meal', 'other']).defaultTo('family');
    table.string('color', 20).defaultTo('#3B82F6'); // blue-500
    table.integer('member_id').unsigned()
      .references('id').inTable('members').onDelete('SET NULL');
    table.integer('task_id').unsigned()
      .references('id').inTable('tasks').onDelete('SET NULL');
    table.string('recurrence_rule', 100); // RRULE string, e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR"
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('family_id');
    table.index('member_id');
    table.index('start_time');
    table.index('event_type');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('events');
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // tasks 表
  await knex.schema.createTable('tasks', (table) => {
    table.increments('id').primary();
    table.integer('family_id').unsigned().notNullable()
      .references('id').inTable('families').onDelete('CASCADE');
    table.string('title', 200).notNullable();
    table.text('description');
    table.enum('status', ['todo', 'doing', 'done']).defaultTo('todo');
    table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
    table.datetime('due_date');
    table.string('recurring', 50); // daily/weekly/monthly
    table.integer('points').unsigned().defaultTo(1);
    table.integer('created_by').unsigned()
      .references('id').inTable('members').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('family_id');
    table.index(['family_id', 'status']);
    table.index('due_date');
  });

  // task_assignees 关联表（多对多）
  await knex.schema.createTable('task_assignees', (table) => {
    table.increments('id').primary();
    table.integer('task_id').unsigned().notNullable()
      .references('id').inTable('tasks').onDelete('CASCADE');
    table.integer('member_id').unsigned().notNullable()
      .references('id').inTable('members').onDelete('CASCADE');
    table.timestamp('assigned_at').defaultTo(knex.fn.now());

    table.unique(['task_id', 'member_id']);
    table.index('task_id');
    table.index('member_id');
  });

  // chore_logs 表（积分记录）
  await knex.schema.createTable('chore_logs', (table) => {
    table.increments('id').primary();
    table.integer('task_id').unsigned().notNullable()
      .references('id').inTable('tasks').onDelete('CASCADE');
    table.integer('member_id').unsigned().notNullable()
      .references('id').inTable('members').onDelete('CASCADE');
    table.integer('points_earned').unsigned().notNullable();
    table.timestamp('completed_at').defaultTo(knex.fn.now());

    table.index('member_id');
    table.index(['member_id', 'completed_at']);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('chore_logs');
  await knex.schema.dropTableIfExists('task_assignees');
  await knex.schema.dropTableIfExists('tasks');
}

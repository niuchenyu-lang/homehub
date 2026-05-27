/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // recipes 食谱表
  await knex.schema.createTable('recipes', (table) => {
    table.increments('id').primary();
    table.integer('family_id').unsigned().notNullable()
      .references('id').inTable('families').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.text('description');
    table.json('ingredients'); // [{name, amount, unit}]
    table.text('steps');
    table.integer('prep_time'); // 分钟
    table.integer('cook_time'); // 分钟
    table.string('tags', 200); // 逗号分隔的标签
    table.string('image_url', 500);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('family_id');
  });

  // meal_plans 餐食计划表
  await knex.schema.createTable('meal_plans', (table) => {
    table.increments('id').primary();
    table.integer('family_id').unsigned().notNullable()
      .references('id').inTable('families').onDelete('CASCADE');
    table.date('plan_date').notNullable();
    table.enum('meal_type', ['breakfast', 'lunch', 'dinner']).notNullable();
    table.integer('recipe_id').unsigned()
      .references('id').inTable('recipes').onDelete('SET NULL');
    table.string('custom_name', 100); // 没有食谱时的自定义名称
    table.text('notes');
    table.integer('member_id').unsigned()
      .references('id').inTable('members').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('family_id');
    table.index('plan_date');
    table.index('recipe_id');
    table.unique(['family_id', 'plan_date', 'meal_type']);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('meal_plans');
  await knex.schema.dropTableIfExists('recipes');
}

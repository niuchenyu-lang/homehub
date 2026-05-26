/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  // Clear existing data
  await knex('chore_logs').del();
  await knex('task_assignees').del();
  await knex('tasks').del();
  await knex('members').del();
  await knex('families').del();

  // Create default family
  const [familyId] = await knex('families').insert({ name: '张家' });

  // Create default members
  await knex('members').insert([
    { family_id: familyId, name: '爸爸', role: 'admin', avatar: '👨' },
    { family_id: familyId, name: '妈妈', role: 'member', avatar: '👩' },
    { family_id: familyId, name: '哥哥', role: 'child', avatar: '👦' },
  ]);
}

import { supabase } from '../lib/supabase';

export async function inspectDatabase() {
  try {
    // Get all tables in the public schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) throw tablesError;
    console.log('Available tables:', tables?.map(t => t.table_name));

    // For each table, get its columns
    for (const table of tables || []) {
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', table.table_name);

      if (columnsError) throw columnsError;
      console.log(`\nTable: ${table.table_name}`);
      console.log('Columns:', columns);
    }

    // Get RLS policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'public');

    if (policiesError) throw policiesError;
    console.log('\nRLS Policies:', policies);

  } catch (error) {
    console.error('Error inspecting database:', error);
  }
} 
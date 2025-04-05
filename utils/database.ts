import { supabase } from '../lib/supabase';

export async function inspectDatabase() {
  try {
    // Get all tables in the public schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) throw tablesError;

    // For each table, get its columns
    for (const table of tables || []) {
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', table.table_name);

      if (columnsError) throw columnsError;

    }

    // Get RLS policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'public');

    if (policiesError) throw policiesError;

  } catch (error) {
    console.error('Error inspecting database:', error);
  }
} 
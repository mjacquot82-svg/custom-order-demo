import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

async function runSupabaseOperation(operation, fallbackOperation) {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackOperation();
  }

  try {
    const result = await operation();

    if (result?.error) {
      throw result.error;
    }

    return result?.data ?? result;
  } catch (error) {
    console.error("Supabase service fallback triggered", error);
    return fallbackOperation();
  }
}

export function createCrudService(config) {
  const {
    table,
    select = "*",
    local,
    buildInsertPayload = (record) => record,
    buildUpdatePayload = (updates) => updates,
    remoteMatchField = "id",
    remoteOrderBy = { column: "created_at", ascending: false },
  } = config;

  return {
    async list() {
      return runSupabaseOperation(async () => {
        let query = supabase.from(table).select(select);

        if (remoteOrderBy?.column) {
          query = query.order(remoteOrderBy.column, {
            ascending: Boolean(remoteOrderBy.ascending),
          });
        }

        return query;
      }, local.list);
    },

    async getById(identifier) {
      return runSupabaseOperation(
        async () =>
          supabase
            .from(table)
            .select(select)
            .eq(remoteMatchField, identifier)
            .maybeSingle(),
        () => local.getById(identifier)
      );
    },

    async create(record) {
      return runSupabaseOperation(
        async () =>
          supabase
            .from(table)
            .insert(buildInsertPayload(record))
            .select(select)
            .single(),
        () => local.create(record)
      );
    },

    async update(identifier, updates) {
      return runSupabaseOperation(
        async () =>
          supabase
            .from(table)
            .update(buildUpdatePayload(updates))
            .eq(remoteMatchField, identifier)
            .select(select)
            .single(),
        () => local.update(identifier, updates)
      );
    },
  };
}


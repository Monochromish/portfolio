import schema from '../db/schema.sql'

// the board's columns, for dev databases made before it
const PLACEMENT = {
  x: 'REAL CHECK (x BETWEEN 0 AND 1)',
  y: 'REAL CHECK (y BETWEEN 0 AND 1)',
  rot: 'REAL NOT NULL DEFAULT 0 CHECK (rot BETWEEN -30 AND 30)',
  country: 'TEXT CHECK (country IS NULL OR length(country) = 2)',
}

export default defineNitroPlugin(async () => {
  if (!import.meta.dev) return
  const db = useDatabase()
  await db.exec(schema)
  const { rows } = await db.sql<{ rows: { name: string }[] }>`SELECT name FROM pragma_table_info('stickers')`
  const have = new Set(rows.map(r => r.name))
  for (const [name, type] of Object.entries(PLACEMENT)) {
    if (!have.has(name)) await db.exec(`ALTER TABLE stickers ADD COLUMN ${name} ${type}`)
  }
})

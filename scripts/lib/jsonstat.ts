// Minimal reader for Eurostat's JSON-stat 2.0 responses.

interface JsonStatCategory {
  index: Record<string, number>
  label?: Record<string, string>
}

export interface JsonStat {
  label: string
  updated: string
  id: string[]
  size: number[]
  dimension: Record<string, { label: string; category: JsonStatCategory }>
  value: Record<string, number>
  status?: Record<string, string>
}

export class JsonStatCube {
  private readonly strides: number[]
  private readonly cube: JsonStat

  constructor(cube: JsonStat) {
    this.cube = cube
    this.strides = cube.size.map((_, i) =>
      cube.size.slice(i + 1).reduce((a, b) => a * b, 1),
    )
  }

  get updated(): string {
    return this.cube.updated
  }

  categories(dim: string): string[] {
    const idx = this.cube.dimension[dim].category.index
    return Object.keys(idx).sort((a, b) => idx[a] - idx[b])
  }

  label(dim: string, code: string): string {
    return this.cube.dimension[dim].category.label?.[code] ?? code
  }

  private offset(coord: Record<string, string>): number {
    let offset = 0
    this.cube.id.forEach((dim, i) => {
      const pos = this.cube.dimension[dim].category.index[coord[dim]]
      if (pos === undefined) throw new Error(`Unknown ${dim}=${coord[dim]}`)
      offset += pos * this.strides[i]
    })
    return offset
  }

  /** Returns the value for a full coordinate, or undefined when missing. */
  get(coord: Record<string, string>): number | undefined {
    return this.cube.value[String(this.offset(coord))]
  }

  /** Status flag of a value ("p" = provisional, "e" = estimated …), if any. */
  status(coord: Record<string, string>): string | undefined {
    return this.cube.status?.[String(this.offset(coord))]
  }
}

const API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'

export async function fetchEurostat(
  dataset: string,
  params: Record<string, string | string[]>,
): Promise<JsonStat> {
  const search = new URLSearchParams({ format: 'JSON', lang: 'EN' })
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : [value]) search.append(key, v)
  }
  const url = `${API}/${dataset}?${search}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Eurostat ${dataset}: HTTP ${res.status}`)
  return (await res.json()) as JsonStat
}

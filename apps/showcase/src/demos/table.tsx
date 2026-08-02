import { SpreadsheetTable, type ColumnDef } from '@jugaaadi/table'
import '@jugaaadi/table/style.css'
import { mount } from './mount'

/**
 * No `frame.css` here, deliberately.
 *
 * `@jugaaadi/table/style.css` is a compiled Tailwind bundle that includes
 * preflight and pins `html, body, #root { height: 100%; overflow: hidden }` —
 * the grid owns the whole document and scrolls its own body. That is exactly
 * right inside this iframe, and exactly why the table cannot share a document
 * with the shell or the other demos.
 */

type Row = {
  sku: string
  product: string
  category: string
  qty: number
  unitCost: number
  updated: string
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'sku', header: 'SKU', size: 110 },
  { accessorKey: 'product', header: 'Product', size: 200 },
  { accessorKey: 'category', header: 'Category', size: 140 },
  { accessorKey: 'qty', header: 'Qty', size: 90 },
  { accessorKey: 'unitCost', header: 'Unit cost', size: 110 },
  { accessorKey: 'updated', header: 'Updated', size: 130 },
]

const data: Row[] = [
  { sku: 'TBL-001', product: 'Dining table, oak', category: 'Tables', qty: 12, unitCost: 340, updated: '2026-07-14' },
  { sku: 'CHR-114', product: 'Spindle chair', category: 'Seating', qty: 48, unitCost: 96, updated: '2026-07-19' },
  { sku: 'CHR-118', product: 'Armchair, linen', category: 'Seating', qty: 9, unitCost: 264, updated: '2026-07-02' },
  { sku: 'LMP-207', product: 'Floor lamp, brass', category: 'Lighting', qty: 23, unitCost: 128, updated: '2026-07-22' },
  { sku: 'LMP-211', product: 'Pendant, opal glass', category: 'Lighting', qty: 31, unitCost: 74, updated: '2026-06-28' },
  { sku: 'SHF-330', product: 'Open shelving, 5-tier', category: 'Storage', qty: 17, unitCost: 189, updated: '2026-07-11' },
  { sku: 'SHF-334', product: 'Sideboard, walnut', category: 'Storage', qty: 6, unitCost: 512, updated: '2026-07-25' },
  { sku: 'RUG-402', product: 'Wool rug, 2×3 m', category: 'Textiles', qty: 14, unitCost: 220, updated: '2026-07-08' },
  { sku: 'RUG-407', product: 'Runner, jute', category: 'Textiles', qty: 26, unitCost: 88, updated: '2026-06-30' },
  { sku: 'DSK-510', product: 'Writing desk', category: 'Tables', qty: 11, unitCost: 298, updated: '2026-07-21' },
  { sku: 'STL-521', product: 'Bar stool', category: 'Seating', qty: 35, unitCost: 112, updated: '2026-07-16' },
  { sku: 'CAB-604', product: 'Filing cabinet', category: 'Storage', qty: 8, unitCost: 176, updated: '2026-07-05' },
]

function TableDemo() {
  return (
    <SpreadsheetTable
      columns={columns as never}
      data={data as never}
      pageSize={data.length}
      onDataChange={(rows) => console.log('[table] rows changed', rows.length)}
      onSelectionChange={(scope) => console.log('[table] selection', scope)}
    />
  )
}

mount(<TableDemo />)

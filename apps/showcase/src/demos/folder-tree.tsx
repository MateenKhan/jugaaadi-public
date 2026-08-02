import { useCallback, useState } from 'react'
import {
  FolderTree,
  moveNodes,
  type DropPosition,
  type SelectMeta,
  type TreeNode,
  type TreeNodeId,
} from '@jugaaadi/folder-tree'
import '@jugaaadi/folder-tree/styles.css'
import './frame.css'
import { mount } from './mount'

const INITIAL: TreeNode[] = [
  {
    id: 'scene',
    label: 'Scene',
    children: [
      {
        id: 'env',
        label: 'Environment',
        children: [
          { id: 'sun', label: 'Sun', hint: 'directional' },
          { id: 'sky', label: 'Sky', hint: 'hdri' },
          { id: 'fog', label: 'Fog', hint: 'volume', hidden: true },
        ],
      },
      {
        id: 'furniture',
        label: 'Furniture',
        children: [
          { id: 'table', label: 'Dining table', hint: '1.8 m', keywords: 'oak wood' },
          { id: 'chair-a', label: 'Chair A', hint: '0.9 m' },
          { id: 'chair-b', label: 'Chair B', hint: '0.9 m' },
          { id: 'lamp', label: 'Floor lamp', hint: '1.4 m', locked: true },
        ],
      },
      {
        id: 'walls',
        label: 'Walls',
        children: [
          { id: 'wall-n', label: 'North', hint: '4.2 m' },
          { id: 'wall-e', label: 'East', hint: '3.6 m' },
          { id: 'wall-s', label: 'South', hint: '4.2 m' },
        ],
      },
    ],
  },
  {
    id: 'cameras',
    label: 'Cameras',
    children: [
      { id: 'cam-main', label: 'Main', hint: '35 mm' },
      { id: 'cam-top', label: 'Top-down', hint: 'ortho' },
    ],
  },
  { id: 'notes', label: 'notes.md', hint: '2 KB', readOnly: true },
]

function FolderTreeDemo() {
  const [nodes, setNodes] = useState<TreeNode[]>(INITIAL)
  const [selectedIds, setSelectedIds] = useState<TreeNodeId[]>(['table'])
  const [search, setSearch] = useState('')
  const [log, setLog] = useState<string[]>([])

  const pushLog = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, 12))
  }, [])

  const onSelect = useCallback(
    (ids: TreeNodeId[], meta: SelectMeta) => {
      setSelectedIds(ids)
      const how = meta.range ? 'range' : meta.multi ? 'multi' : meta.via
      pushLog(`select ${ids.length} (${how})`)
    },
    [pushLog],
  )

  /**
   * `moveNodes` is the whole drag implementation — it applies the move and
   * refuses illegal drops (a node into its own descendant) on its own, so the
   * consumer never has to write that guard.
   */
  const onMove = useCallback(
    (moved: TreeNodeId[], target: TreeNodeId, position: DropPosition) => {
      setNodes((prev) => moveNodes(prev, moved, target, position))
      pushLog(`move ${moved.join(', ')} ${position} ${target}`)
    },
    [pushLog],
  )

  const onRename = useCallback(
    (id: TreeNodeId, name: string) => {
      setNodes((prev) => rename(prev, id, name))
      pushLog(`rename ${id} → ${name}`)
    },
    [pushLog],
  )

  const onToggle = useCallback(
    (key: 'hidden' | 'locked') => (id: TreeNodeId) => {
      setNodes((prev) => toggle(prev, id, key))
      pushLog(`${key} ${id}`)
    },
    [pushLog],
  )

  const onDelete = useCallback(
    (ids: TreeNodeId[]) => {
      setNodes((prev) => remove(prev, ids))
      setSelectedIds([])
      pushLog(`delete ${ids.join(', ')}`)
    },
    [pushLog],
  )

  return (
    <div className="demo">
      <p className="demo__hint">
        Drag rows to reorder or re-parent. Type in the search box and matches auto-expand.{' '}
        <kbd>Ctrl</kbd>/<kbd>Shift</kbd>-click for multi and range select; arrow keys navigate,{' '}
        <kbd>F2</kbd> renames.
      </p>

      <div className="demo__body">
        <div className="panel" style={{ flex: '1 1 380px', minWidth: 300, padding: 12 }}>
          <FolderTree
            nodes={nodes}
            selectedIds={selectedIds}
            onSelect={onSelect}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search the scene…"
            defaultExpandedIds={['scene', 'furniture']}
            onMove={onMove}
            onRename={onRename}
            onToggleHidden={onToggle('hidden')}
            onToggleLocked={onToggle('locked')}
            onDelete={onDelete}
            ariaLabel="Scene outliner"
            style={{ height: 420 }}
          />
        </div>

        <div className="panel panel--side">
          <p className="panel__label">Selection</p>
          <dl className="readout">
            <dt>ids</dt>
            <dd>{selectedIds.length ? selectedIds.join(', ') : '—'}</dd>
            <dt>search</dt>
            <dd>{search || '—'}</dd>
          </dl>

          <p className="panel__label" style={{ marginTop: 20 }}>
            Events
          </p>
          <ul className="log">
            {log.length === 0 ? (
              <li className="log__empty">nothing yet</li>
            ) : (
              log.map((line, i) => <li key={`${line}-${i}`}>{line}</li>)
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}

/* The tree is the consumer's data, so these edits are the consumer's job. Each
   returns a new tree rather than mutating, which is what React needs to see. */

function rename(nodes: TreeNode[], id: TreeNodeId, label: string): TreeNode[] {
  return nodes.map((node) =>
    node.id === id
      ? { ...node, label }
      : node.children
        ? { ...node, children: rename(node.children, id, label) }
        : node,
  )
}

function toggle(nodes: TreeNode[], id: TreeNodeId, key: 'hidden' | 'locked'): TreeNode[] {
  return nodes.map((node) =>
    node.id === id
      ? { ...node, [key]: !node[key] }
      : node.children
        ? { ...node, children: toggle(node.children, id, key) }
        : node,
  )
}

function remove(nodes: TreeNode[], ids: TreeNodeId[]): TreeNode[] {
  return nodes
    .filter((node) => !ids.includes(node.id))
    .map((node) => (node.children ? { ...node, children: remove(node.children, ids) } : node))
}

mount(<FolderTreeDemo />)

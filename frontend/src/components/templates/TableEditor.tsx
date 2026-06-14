import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TemplateTable } from './templateSchema';

interface TableEditorProps {
  tables: TemplateTable[];
  onChange: (tables: TemplateTable[]) => void;
  readOnly?: boolean;
}

const TableEditor = ({ tables, onChange, readOnly = false }: TableEditorProps) => {
  const updateTable = (index: number, updater: (table: TemplateTable) => TemplateTable) => {
    const next = tables.map((t, i) => (i === index ? updater(t) : t));
    onChange(next);
  };

  const addTable = () => {
    onChange([
      ...tables,
      { id: crypto.randomUUID(), title: '', headers: ['Column 1', 'Column 2'], rows: [['', '']] },
    ]);
  };

  const removeTable = (index: number) => {
    onChange(tables.filter((_, i) => i !== index));
  };

  const addRow = (tableIndex: number) => {
    updateTable(tableIndex, (t) => ({
      ...t,
      rows: [...t.rows, new Array(t.headers.length).fill('')],
    }));
  };

  const removeRow = (tableIndex: number, rowIndex: number) => {
    updateTable(tableIndex, (t) => ({
      ...t,
      rows: t.rows.filter((_, i) => i !== rowIndex),
    }));
  };

  const addColumn = (tableIndex: number) => {
    updateTable(tableIndex, (t) => ({
      ...t,
      headers: [...t.headers, `Column ${t.headers.length + 1}`],
      rows: t.rows.map((row) => [...row, '']),
    }));
  };

  const removeColumn = (tableIndex: number, colIndex: number) => {
    updateTable(tableIndex, (t) => ({
      ...t,
      headers: t.headers.filter((_, i) => i !== colIndex),
      rows: t.rows.map((row) => row.filter((_, i) => i !== colIndex)),
    }));
  };

  const updateHeader = (tableIndex: number, colIndex: number, value: string) => {
    updateTable(tableIndex, (t) => ({
      ...t,
      headers: t.headers.map((h, i) => (i === colIndex ? value : h)),
    }));
  };

  const updateCell = (tableIndex: number, rowIndex: number, colIndex: number, value: string) => {
    updateTable(tableIndex, (t) => ({
      ...t,
      rows: t.rows.map((row, ri) =>
        ri === rowIndex ? row.map((cell, ci) => (ci === colIndex ? value : cell)) : row,
      ),
    }));
  };

  const updateTitle = (tableIndex: number, value: string) => {
    updateTable(tableIndex, (t) => ({ ...t, title: value }));
  };

  return (
    <div className="space-y-6">
      {tables.map((table, ti) => (
        <div key={table.id} className="rounded-xl border border-white/10 bg-[#0f0f0f]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <input
              value={table.title || ''}
              onChange={(e) => updateTitle(ti, e.target.value)}
              readOnly={readOnly}
              placeholder="Table title (optional)"
              className="flex-1 bg-transparent text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-500"
            />
            {!readOnly && (
              <button
                type="button"
                onClick={() => removeTable(ti)}
                className="ml-3 rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  {table.headers.map((header, ci) => (
                    <th key={ci} className="px-3 py-2 text-left">
                      <div className="flex items-center gap-1">
                        <input
                          value={header}
                          onChange={(e) => updateHeader(ti, ci, e.target.value)}
                          readOnly={readOnly}
                          className="w-full border-b border-transparent bg-transparent font-semibold text-slate-200 outline-none focus:border-slate-400"
                        />
                        {!readOnly && table.headers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeColumn(ti, ci)}
                            className="rounded p-0.5 text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  {!readOnly && (
                    <th className="w-10 px-2 py-2">
                      <button
                        type="button"
                        onClick={() => addColumn(ti)}
                        className="rounded p-0.5 text-slate-500 hover:text-green-400"
                        title="Add column"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-white/5 last:border-b-0">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-1.5">
                        <input
                          value={cell}
                          onChange={(e) => updateCell(ti, ri, ci, e.target.value)}
                          readOnly={readOnly}
                          className="w-full border-b border-transparent bg-transparent text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-400"
                        />
                      </td>
                    ))}
                    {!readOnly && (
                      <td className="w-10 px-2 py-1.5">
                        {row.length > 1 || table.rows.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeRow(ti, ri)}
                            className="rounded p-0.5 text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        ) : null}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!readOnly && (
            <div className="border-t border-white/10 px-4 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addRow(ti)}
                className="text-slate-300 hover:text-green-400"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Row
              </Button>
            </div>
          )}
        </div>
      ))}
      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTable}
          className="border-dashed border-white/15 bg-transparent text-slate-300 hover:border-green-500 hover:text-green-300"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Table
        </Button>
      )}
    </div>
  );
};

export default TableEditor;

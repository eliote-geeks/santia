import { Search } from 'lucide-react';

const pageSizes = [5, 8, 10, 20, 50];

export const DataTableToolbar = ({
  query,
  onQueryChange,
  pageSize,
  onPageSizeChange,
  totalCount,
  label = 'entrees'
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
      <div className="flex items-center gap-3 text-sm text-[#64748B]">
        <span>Afficher</span>
        <select
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#0A2540]"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {pageSizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>{label}</span>
        <span className="text-xs text-[#94A3B8]">({totalCount} au total)</span>
      </div>
      <div className="relative w-full lg:w-64">
        <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          className="input-compact w-full pl-9"
          placeholder="Rechercher..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
    </div>
  );
};

export default DataTableToolbar;

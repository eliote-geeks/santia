import { Button } from './ui/button';

const buildPages = (current, total) => {
  if (total <= 1) return [];
  const maxVisible = 5;
  let start = Math.max(1, current - 2);
  let end = Math.min(total, start + maxVisible - 1);
  start = Math.max(1, end - maxVisible + 1);
  return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
};

export const Pagination = ({ page, totalPages, onPageChange }) => {
  if (!totalPages || totalPages <= 1) return null;
  const pages = buildPages(page, totalPages);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
      <div className="text-sm text-[#64748B]">
        Page {page} sur {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="px-3 py-2"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Precedent
        </Button>
        {pages.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onPageChange(value)}
            className={`h-9 w-9 rounded-lg text-sm font-medium border transition-colors ${
              value === page
                ? 'bg-[#0A2540] text-white border-[#0A2540]'
                : 'bg-white text-[#0A2540] border-slate-200 hover:border-[#2ECC71]'
            }`}
          >
            {value}
          </button>
        ))}
        <Button
          variant="outline"
          className="px-3 py-2"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
};

export default Pagination;

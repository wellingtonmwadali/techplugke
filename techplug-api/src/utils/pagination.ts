export type PaginationParams = {
  page: number | null;
  pageSize: number;
};

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const pageRaw = query.page;
  const page = typeof pageRaw === "string" && Number(pageRaw) > 0 ? Math.floor(Number(pageRaw)) : null;
  const pageSizeRaw = query.pageSize;
  const pageSize =
    typeof pageSizeRaw === "string" && Number(pageSizeRaw) > 0
      ? Math.min(Math.floor(Number(pageSizeRaw)), 100)
      : 25;
  return { page, pageSize };
}

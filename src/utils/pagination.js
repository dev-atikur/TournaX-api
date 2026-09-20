function parsePagination(query = {}, defaults = { page: 1, limit: 20, maxLimit: 50 }) {
  const page = Math.max(1, parseInt(query.page, 10) || defaults.page);
  const limit = Math.min(
    defaults.maxLimit,
    Math.max(1, parseInt(query.limit, 10) || defaults.limit),
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function paginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 0,
  };
}

function paginated(items, page, limit, total) {
  return {
    items,
    pagination: paginationMeta(page, limit, total),
  };
}

module.exports = { parsePagination, paginationMeta, paginated };

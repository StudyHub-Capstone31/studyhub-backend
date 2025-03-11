// File: utils/pagination.js - Pagination utility

const paginateResults = async (
  model,
  query,
  page = 1,
  limit = 10,
  populate = null,
  sort = { createdAt: -1 }
) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await model.countDocuments(query);

  // Build pagination object
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  pagination.total = total;
  pagination.pages = Math.ceil(total / limit);
  pagination.currentPage = page;

  // Execute query
  let results;
  if (populate) {
    results = await model
      .find(query)
      .skip(startIndex)
      .limit(limit)
      .sort(sort)
      .populate(populate);
  } else {
    results = await model.find(query).skip(startIndex).limit(limit).sort(sort);
  }

  return {
    pagination,
    data: results,
  };
};

module.exports = paginateResults;

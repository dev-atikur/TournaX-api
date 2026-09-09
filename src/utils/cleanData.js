function cleanObject(obj, excludeFields = []) {
  if (!obj) return obj;
  const { _id, __v, ...rest } = obj.toObject ? obj.toObject() : obj;

  excludeFields.forEach((field) => {
    delete rest[field];
  });
  return { id: _id, ...rest };
}

function cleanArray(arr, excludeFields = []) {
  return arr.map((item) => cleanObject(item, excludeFields));
}


module.exports = { cleanObject, cleanArray };
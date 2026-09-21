const SENSITIVE_FIELDS = [
  "password",
  "twoFactorSecret",
  "recoveryCodes",
  "localIdHash",
  "roomPassword",
  "__v",
];

function cleanObject(obj, excludeFields = []) {
  if (!obj) return obj;
  const source = obj.toObject ? obj.toObject() : obj;
  const { _id, ...rest } = source;

  [...SENSITIVE_FIELDS, ...excludeFields].forEach((field) => {
    delete rest[field];
  });
  return { id: _id, ...rest };
}

function cleanArray(arr, excludeFields = []) {
  return (arr || []).map((item) => cleanObject(item, excludeFields));
}


module.exports = { cleanObject, cleanArray };
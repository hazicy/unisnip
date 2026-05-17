Array.prototype.myPromiseAll = function (promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      throw new Error('must be array');
    }

    const length = promises.length;

    if (length === 0) {
      resolve([]);
      return;
    }

    const result = [];
    let count = 0;

    for (let i = 0; i < length; i++) {
      Promise.resolve(promises[i])
        .then((res) => {
          result[i] = res;
          count++;

          if (count == length) {
            resolve(result);
          }
        })
        .catch((error) => {
          reject(error);
        })
        .finally();
    }
  });
};

function debounce(func, delay) {
  let timer = null;

  return new (function (...args) {
    if (!timer) clearTimeout(timer);

    timer = setTimeout(() => {
      func.apply(this, args);
      timer = null;
    }, delay);
  })();
}

// 有一个模块 A 初始化没内容

function createInjectable(defaults) {}

const XXXDependency = createInjectable({
  getGlobalStore() {
    return {};
  },
});

console.log(XXXDependency.getGlobalStore());

setTimeout(() => {
  XXXDependency.inject({
    getGlobalStore() {
      return {
        user: 'injected',
      };
    },
  });
}, 500);

setTimeout(() => {
  console.log(XXXDependency.getGlobalStore());
}, 1000);

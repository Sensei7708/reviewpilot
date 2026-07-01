function createChain() {
  var fn = function() {
    var args = Array.prototype.slice.call(arguments);
    return args.join(' ');
  };
  fn.level = 0;
  return new Proxy(fn, {
    get: function(target, prop) {
      if (prop === 'then' || prop === Symbol.toPrimitive) return undefined;
      if (prop === 'level') return 0;
      if (typeof prop === 'string') return createChain();
      return Reflect.get(target, prop);
    },
    apply: function(target, _, args) {
      if (args.length === 0) return '';
      return args.join(' ');
    },
  });
}

var chalk = createChain();
chalk.default = chalk;
chalk.level = 0;
chalk.supportsColor = false;

module.exports = chalk;

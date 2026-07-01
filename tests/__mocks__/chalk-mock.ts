// Global Jest mock for chalk (ESM compatibility shim)
const identity = (s: any) => s;

function createChain(): any {
  const fn: any = (...args: any[]) => args.join(' ');
  fn.level = 0;
  return new Proxy(fn, {
    get(target, prop: string | symbol) {
      if (prop === 'then' || prop === Symbol.toPrimitive) return undefined;
      if (prop === 'level') return 0;
      if (typeof prop === 'string') return createChain();
      return Reflect.get(target, prop);
    },
    apply(target: any, _: any, args: any[]) {
      return args.join(' ');
    },
  });
}

const chalk = createChain();
(chalk as any).default = chalk;

jest.mock('chalk', () => chalk, { virtual: true });

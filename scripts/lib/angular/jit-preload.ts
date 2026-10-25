/* A bun test preload that runs the Angular layer's suites from source in JIT, so a task's loop and a
 * mutation cost no ngc emit. Bun strips the types and keeps no Angular metadata, so a signal input
 * is unknown to a template and its first read throws NG0950; the preload loads each layer source
 * through the JIT transform the Angular CLI applies, over one program of tsconfig.test.json. The
 * verdict stays the emitted tree: JIT checks no template type and defines a component when it is
 * first used rather than when its class loads, so `bun run check` runs the ngc emit, never this. */

import { plugin } from 'bun';
import { FROM_SOURCE, emitJit, jitProgram } from './jit-program.ts';

const jit = jitProgram();
plugin({
  name: 'arena-angular-jit',
  setup(build) {
    build.onLoad({ filter: FROM_SOURCE }, ({ path }) => ({ contents: emitJit(path, jit), loader: 'js' }));
  },
});

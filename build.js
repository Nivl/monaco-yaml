const { promises: fs } = require('fs');
const { join } = require('path');

const { build } = require('esbuild');

const { dependencies, peerDependencies } = require('./package.json');

fs.rm(join(__dirname, 'lib'), { force: true, recursive: true })
  .then(() =>
    build({
      entryPoints: ['src/monaco.contribution.ts', 'src/yaml.worker.ts'],
      bundle: true,
      external: Object.keys({ ...dependencies, ...peerDependencies }),
      logLevel: 'info',
      outdir: 'lib/esm',
      sourcemap: true,
      format: 'esm',
      target: ['es2019'],
      plugins: [
        {
          name: 'alias',
          setup({ onResolve }) {
            // The yaml language service only imports re-exports of vscode-languageserver-types from
            // vscode-languageserver.
            onResolve({ filter: /^vscode-languageserver-textdocument$/ }, () => ({
              path: 'vscode-languageserver-textdocument/lib/esm/main.js',
              external: true,
            }));
            // The yaml language service only imports re-exports of vscode-languageserver-types from
            // vscode-languageserver.
            onResolve({ filter: /^vscode-languageserver$/ }, () => ({
              path: 'vscode-languageserver-types/lib/esm/main.js',
              external: true,
            }));
            // The yaml language service only imports re-exports of vscode-languageserver-types from
            // vscode-languageserver.
            onResolve({ filter: /^vscode-languageserver-types$/ }, () => ({
              path: 'vscode-languageserver-types/lib/esm/main.js',
              external: true,
            }));
            // The yaml language service uses path. We can stub it using path-browserify.
            onResolve({ filter: /^path$/ }, () => ({
              path: 'path-browserify',
              external: true,
            }));
            // The main prettier entry point contains all of Prettier.
            // The standalone bundle is smaller and works fine for us.
            onResolve({ filter: /^prettier$/ }, () => ({
              path: 'prettier/standalone',
              external: true,
            }));
            // This tiny filler implementation serves all our needs.
            onResolve({ filter: /vscode-nls/ }, () => ({
              path: require.resolve('./src/fillers/vscode-nls.ts'),
            }));
            // The language server dependencies tend to write both ESM and UMD output alongside each
            // other, then use UMD for imports. We prefer ESM.
            onResolve({ filter: /\/umd\// }, (args) => ({
              path: require.resolve(args.path.replace(/\/umd\//, '/esm/'), {
                paths: [args.resolveDir],
              }),
            }));
          },
        },
      ],
    }),
  )
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });

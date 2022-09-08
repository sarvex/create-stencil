import { Spinner } from 'cli-spinner';
import fs from 'fs';
import { join } from 'path';
import { bold, cyan, dim, green } from 'colorette';
import { downloadStarter } from './download';
import { Starter } from './starters';
import { unZipBuffer } from './unzip';
import { npm, onlyUnix, printDuration, setTmpDirectory, terminalPrompt } from './utils';
import { replaceInFile } from 'replace-in-file';
import { execSync } from 'child_process';
import { getPkgVersion } from './version';

const starterCache = new Map<Starter, Promise<undefined | ((name: string) => Promise<void>)>>();

export async function createApp(starter: Starter, projectName: string, autoRun: boolean) {
  if (fs.existsSync(projectName)) {
    throw new Error(`Folder "./${projectName}" already exists, please choose a different project name.`);
  }

  projectName = projectName.toLowerCase().trim();

  if (!validateProjectName(projectName)) {
    throw new Error(`Project name "${projectName}" is not valid. It must be a kebab-case name without spaces.`);
  }

  const loading = new Spinner(bold('Preparing starter'));
  loading.setSpinnerString(18);
  loading.start();

  const startT = Date.now();
  const moveTo = await prepareStarter(starter);
  if (!moveTo) {
    throw new Error('starter install failed');
  }
  await moveTo(projectName);
  loading.stop(true);

  const time = printDuration(Date.now() - startT);
  let hasErr = false;
  if (!changeDir(projectName)) {
    hasErr = hasErr || true; // I know, weird
  }

  if (!initGit()) {
    hasErr = hasErr || true;
  }

  // TODO() we init git, do we clean up if we failed?

  if (!commitGit()) {
    hasErr = hasErr || true;
  }

  console.log(`${green('✔')} ${bold('All setup')} ${onlyUnix('🎉')} ${dim(time)}


  ${dim(terminalPrompt())} ${green('cd')} ${projectName}
  ${dim(terminalPrompt())} ${green('npm install')}
  ${dim(terminalPrompt())} ${green('npm start')}

  ${dim('You may find the following commands will be helpful:')}

  ${dim(terminalPrompt())} ${green('npm start')}
    Starts the development server.

  ${dim(terminalPrompt())} ${green('npm run build')}
    Builds your project in production mode.

  ${dim(terminalPrompt())} ${green('npm test')}
    Starts the test runner.

${renderDocs(starter)}

  Happy coding! 🎈
`);

  if (autoRun) {
    await npm('start', projectName, 'inherit');
  }
}

function renderDocs(starter: Starter) {
  const docs = starter.docs;
  if (!docs) {
    return '';
  }
  return `
  ${dim('Further reading:')}

   ${dim('-')} ${cyan(docs)}
   ${dim('-')} ${cyan('https://stenciljs.com/docs')}`;
}

export function prepareStarter(starter: Starter) {
  let promise = starterCache.get(starter);
  if (!promise) {
    promise = prepare(starter);
    // silent crash, we will handle later
    promise.catch(() => {
      return;
    });
    starterCache.set(starter, promise);
  }
  return promise;
}

async function prepare(starter: Starter) {
  const baseDir = process.cwd();
  const tmpPath = join(baseDir, '.tmp-stencil-starter');
  const buffer = await downloadStarter(starter);
  setTmpDirectory(tmpPath);

  await unZipBuffer(buffer, tmpPath);
  await npm('ci', tmpPath);

  return async (projectName: string) => {
    const filePath = join(baseDir, projectName);
    await fs.promises.rename(tmpPath, filePath);
    await replaceInFile({
      files: [join(filePath, '*'), join(filePath, 'src/*')],
      from: /stencil-starter-project-name/g,
      to: projectName,
    });
    setTmpDirectory(null);
  };
}

function validateProjectName(projectName: string) {
  return !/[^a-zA-Z0-9-]/.test(projectName);
}

export function changeDir(moveTo: string): boolean {
  console.log(`in ${process.cwd()}`);
  let wasSuccess = false;
  try {
    process.chdir(moveTo);
    wasSuccess = true;
  } catch (err: unknown) {
    console.error(err);
  }
  return wasSuccess;
}
export function initGit(): boolean {
  let wasSuccess = false;
  try {
    // if `git` is not on the user's path, this will return a non-zero exit code
    // also returns a non-zero exit code if it times out
    execSync('git --version', { stdio: 'ignore' });

    // TODO(NOW): we may be in a subtree, which may not be desirable?

    // git must exist on the path, initialize a repo
    // init can fail for reasons like a malformed git config, permissions, etc.
    // we assume that git will continue to allow `git init` in a pre-existing repo
    execSync('git init', { stdio: 'ignore' });
    wasSuccess = true;
  } catch (err: unknown) {
    console.error(err);
  }
  return wasSuccess;
}

export function commitGit(): boolean {
  let wasSuccess = false;
  try {
    // add all files (including dotfiles)
    execSync('git add -A', { stdio: 'ignore' });
    // commit them
    execSync(`git commit -m "init with create-stencil v${getPkgVersion()}"`, { stdio: 'ignore' });
    wasSuccess = true;
  } catch (err: unknown) {
    console.error(err);
  }
  return wasSuccess;
}

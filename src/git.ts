import { execSync } from 'child_process';
import { yellow } from 'colorette';
import { getPkgVersion } from './version';

/**
 * Check whether the current process is in a git work tree.
 *
 * This is desirable for detecting cases where a user is creating a directory inside a larger repository (e.g. monorepo)
 *
 * This function assumes that the process that invokes it is in the desired directory.
 *
 * @returns true if the process is in a git repository already, false otherwise
 */
export function inExistingGitTree(): boolean {
  let isInTree = false;
  try {
    // we may be in a subtree of an existing git repository (e.g. a monorepo), this call performs that check
    // this call is expected fail if we are _not_ in an existing repo (I.E we go all the way up the dir tree and can't
    // find a git repo)
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    console.info(
      `${yellow('create-stencil has detected you are inside of an existing git repository, a new one will not be created')}`
    );
    isInTree = true;
  } catch (_err: unknown) {
    console.info(
      `${yellow(
        'create-stencil has detected you are not inside of an existing git repository, one will be created in the root of your project'
      )}`
    );
  }
  return isInTree;
}

/**
 * Initialize a new git repository for the current working directory of the current process.
 *
 * This function assumes that the process that invokes it is in the desired directory and that the repository should be
 * created.
 *
 * @returns true if the repository was successfully created, false otherwise
 */
export function initGit(): boolean {
  let wasSuccess = false;
  try {
    // if `git` is not on the user's path, this will return a non-zero exit code
    // also returns a non-zero exit code if it times out
    execSync('git --version', { stdio: 'ignore' });

    // git must exist on the path, initialize a repo
    // init can fail for reasons like a malformed git config, permissions, etc.
    execSync('git init', { stdio: 'ignore' });
    wasSuccess = true;
  } catch (err: unknown) {
    // TODO(NOW): Test
    console.error(err);
  }

  return wasSuccess;
}

/**
 * Stage all files and commit them for the current working directory of the current process.
 *
 * This function assumes that the process that invokes it is in the desired directory.
 *
 * @returns true if the files are committed successfully, false otherwise
 */
export function commitGit(): boolean {
  let wasSuccess = false;
  try {
    // TODO(NOW): Cases where these fail
    // add all files (including dotfiles)
    execSync('git add -A', { stdio: 'ignore' });
    // commit them
    execSync(`git commit -m "init with create-stencil v${getPkgVersion()}"`, { stdio: 'ignore' });
    wasSuccess = true;
  } catch (err: unknown) {
    // TODO(NOW): TEST
    console.error(err);
  }
  return wasSuccess;
}

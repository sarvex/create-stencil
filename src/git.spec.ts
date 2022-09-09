import * as cp from 'child_process';
import { commitGit, inExistingGitTree, initGit } from './git';
import * as Version from './version';

// TODO(NOW): Handle console statements
describe('git', () => {
  let execSyncSpy: jest.SpyInstance<ReturnType<typeof cp.execSync>, Parameters<typeof cp.execSync>>;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    execSyncSpy = jest.spyOn(cp, 'execSync');
  });

  afterEach(() => {
    execSyncSpy.mockRestore();
  });

  describe('inExistingGitTree', () => {
    beforeEach(() => {
      execSyncSpy.mockImplementation((cmd: string, _options: cp.ExecOptions | undefined) => {
        switch (cmd) {
          case 'git rev-parse --is-inside-work-tree':
            return Buffer.alloc(0);
          default:
            throw new Error(`unmocked command ${cmd}`);
        }
      });
    });

    describe('is in existing git repo', () => {
      it('returns status of true', () => {
        const isInExistingGitTree = inExistingGitTree();
        expect(isInExistingGitTree).toBe(true);
      });
    });

    describe('is not in existing git repo', () => {
      it('returns status of false', () => {
        execSyncSpy.mockImplementation(() => {
          throw new Error('fatal: not a git repository (or any of the parent directories): .git');
        });
        const isInExistingGitTree = inExistingGitTree();
        expect(isInExistingGitTree).toBe(false);
      });
    });
  });

  describe('initGit', () => {
    beforeEach(() => {
      execSyncSpy.mockImplementation((cmd: string, _options: cp.ExecOptions | undefined) => {
        switch (cmd) {
          case 'git --version':
            return Buffer.alloc(0);
          case 'git init':
            return Buffer.alloc(0);
          default:
            throw new Error(`unmocked command ${cmd}`);
        }
      });
    });

    it('returns true when git is successfully initialized', () => {
      expect(initGit()).toBe(true);
    });

    describe('git not available', () => {
      beforeEach(() => {
        execSyncSpy.mockImplementation((cmd: string, _options: cp.ExecOptions | undefined) => {
          switch (cmd) {
            case 'git --version':
              throw new Error('command not found: git');
            case 'git init':
              throw new Error('`git init` should not have been called');
            default:
              throw new Error(`unmocked command ${cmd}`);
          }
        });
      });

      it('returns false ', () => {
        expect(initGit()).toBe(false);
      });

      it('does not attempt to initialize a repo', () => {
        initGit();

        expect(execSyncSpy).toHaveBeenCalledTimes(1);
        expect(execSyncSpy).toHaveBeenCalledWith('git --version', { stdio: 'ignore' });
      });
    });

    describe('git repo init fails', () => {
      beforeEach(() => {
        execSyncSpy.mockImplementation((cmd: string, _options: cp.ExecOptions | undefined) => {
          switch (cmd) {
            case 'git --version':
              return Buffer.alloc(0);
            case 'git init':
              throw new Error('`git init` failed for some reason');
            default:
              throw new Error(`unmocked command ${cmd}`);
          }
        });
      });

      it('returns false ', () => {
        expect(initGit()).toBe(false);
      });
    });
  });

  describe('commitGit', () => {
    const MOCK_PKG_JSON_VERSION = '3.0.0';
    let getPkgVersionSpy: jest.SpyInstance<
      ReturnType<typeof Version.getPkgVersion>,
      Parameters<typeof Version.getPkgVersion>
    >;

    beforeEach(() => {
      getPkgVersionSpy = jest.spyOn(Version, 'getPkgVersion');
      getPkgVersionSpy.mockImplementation(() => MOCK_PKG_JSON_VERSION);

      execSyncSpy.mockImplementation((cmd: string, _options: cp.ExecOptions | undefined) => {
        switch (cmd) {
          case 'git add -A':
            return Buffer.alloc(0);
          // TODO MOCK THIS
          case `git commit -m "init with create-stencil v${MOCK_PKG_JSON_VERSION}"`:
            return Buffer.alloc(0);
          default:
            throw new Error(`unmocked command ${cmd}`);
        }
      });
    });

    afterEach(() => {
      getPkgVersionSpy.mockRestore();
    });

    it('returns true when files are committed', () => {
      expect(commitGit()).toBe(true);
    });

    describe('git add fails', () => {
      beforeEach(() => {
        execSyncSpy.mockImplementation((cmd: string, _options: cp.ExecOptions | undefined) => {
          switch (cmd) {
            case 'git add -A':
              throw new Error('git add has failed for some reason');
            // TODO MOCK THIS
            case `git commit -m "init with create-stencil v${MOCK_PKG_JSON_VERSION}"`:
              throw new Error('git commit should not have been reached!');
            default:
              throw new Error(`unmocked command ${cmd}`);
          }
        });
      });

      it('returns false ', () => {
        expect(commitGit()).toBe(false);
      });

      it('does not attempt to commit files', () => {
        commitGit();

        expect(execSyncSpy).toHaveBeenCalledTimes(1);
        expect(execSyncSpy).toHaveBeenCalledWith('git add -A', { stdio: 'ignore' });
      });
    });

    describe('git commit fails', () => {
      beforeEach(() => {
        execSyncSpy.mockImplementation((cmd: string, _options: cp.ExecOptions | undefined) => {
          switch (cmd) {
            case 'git add -A':
              return Buffer.alloc(0);
            // TODO MOCK THIS
            case `git commit -m "init with create-stencil v${MOCK_PKG_JSON_VERSION}"`:
              throw new Error('git commit has failed for some reason');
            default:
              throw new Error(`unmocked command ${cmd}`);
          }
        });
      });

      it('returns false ', () => {
        expect(commitGit()).toBe(false);
      });
    });
  });
});

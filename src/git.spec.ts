import * as cp from 'child_process';
import { inExistingGitTree } from './git';

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
    it('todo', () => {
      fail('todo!');
    });
  });

  describe('commitGit', () => {
    it('todo', () => {
      fail('todo!');
    });
  });
});

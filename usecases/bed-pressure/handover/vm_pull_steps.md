# VM Pull Steps

Run this single command set on the VM to receive the latest handover package:

```bash
cd /home/opencare-platform
git checkout dev
git pull origin dev
git rev-parse HEAD
ls -la usecases/bed-pressure/handover
```

Expected result:

- The current branch is `dev`.
- The latest commit includes the Bed Pressure handover package.
- The folder `usecases/bed-pressure/handover` contains `README.md`, `handover_checklist.md`, `file_manifest.md`, and `vm_pull_steps.md`.

No rebuild is required for the handover package because it is documentation-only.

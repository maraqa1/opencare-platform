# VM Pull Steps

Run this on the VM after the bundle is pushed:

```bash
cd /home/opencare-platform
git checkout dev
git pull origin dev
git rev-parse HEAD
ls -la usecases/revenue-cycle-management
```

No rebuild is required for documentation-only bundle changes.

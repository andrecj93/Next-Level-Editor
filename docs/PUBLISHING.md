# Publishing to NPM

This guide explains how to publish the Next Level Editor package to npm.

## Prerequisites

1. You need an npm account. Create one at [npmjs.com](https://www.npmjs.com/signup) if you don't have one.
2. Login to npm on your command line:
   ```bash
   npm login
   ```

## Publishing Steps

### 1. Update Version

Update the version in `package.json` according to [Semantic Versioning](https://semver.org/):
- MAJOR version for incompatible API changes
- MINOR version for new functionality in a backwards compatible manner
- PATCH version for backwards compatible bug fixes

Or use npm's built-in version command:
```bash
npm version patch  # for bug fixes
npm version minor  # for new features
npm version major  # for breaking changes
```

### 2. Build the Package

Make sure the package builds successfully:
```bash
npm run build
```

### 3. Test the Package

Test the package locally before publishing:
```bash
npm pack
```

This creates a `.tgz` file that you can inspect or install locally for testing:
```bash
npm install ./next-level-editor-1.0.0.tgz
```

### 4. Publish to NPM

When you're ready to publish:
```bash
npm publish
```

For the first publish, you might need to make the package public:
```bash
npm publish --access public
```

### 5. Verify Publication

After publishing, verify the package is available:
```bash
npm view next-level-editor
```

Or visit: https://www.npmjs.com/package/next-level-editor

## Post-Publication

1. Create a git tag for the release:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. Create a GitHub release with release notes

3. Update the CHANGELOG.md with the new version

## Testing the Published Package

Test the package in a new project:
```bash
mkdir test-next-level-editor
cd test-next-level-editor
npm init -y
npm install vue next-level-editor
```

## Unpublishing (Use with Caution)

If you need to unpublish a version (only within 72 hours of publishing):
```bash
npm unpublish next-level-editor@1.0.0
```

⚠️ **Warning**: Unpublishing is generally discouraged. Consider publishing a patch version instead.

## Tips

- Always test thoroughly before publishing
- Use `npm pack` to preview what will be published
- Keep your README.md up to date
- Document breaking changes clearly
- Follow semantic versioning strictly
- Maintain the CHANGELOG.md

# Srcbook

JavaScript and TypeSript notebooks.

This application allows you to create, run, and share Srcbooks. Srcbooks are JavaScript or TypeScript notebooks that use the node runtime and run locally on your machine. Srcbooks export to markdown using the `.src.md` extension. These files can easily be shared, versioned, and rendered in any environment that supports Markdown, like your editor or GitHub UI.

## Run

### Installing

Srcbook is currently distributed as a npm package. You can install it globally with the following command:

```bash
# Install
npm install -g srcbook

# Run the application
srcbook
```

### Updating

You can update Srcbook to the latest version with:

```bash
npm update -g <package_name>
```

### Uninstall

To clean up all Srcbook data on your machine, you'll need to perform the following:

```bash
# Remove the npm package
npm uninstall -g srcbook

# Clear up srcbook files on disk
rm -rf ~/.srcbook/
```

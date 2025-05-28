# Pull Request Instructions for MolStar Integration

## Overview

This pull request integrates advanced MolStar visualization features from PrankWeb into the bio-struct-forge repository. The implementation follows a modular approach, creating reusable utilities that are integrated into both MoleculeViewer and DemoMoleculeViewer components.

## Changes Summary

1. Created a modular MolStar utilities package in `src/utils/molstar/`
2. Refactored MoleculeViewer to use these utilities and added advanced features
3. Refactored DemoMoleculeViewer to use these utilities and added advanced features
4. Added test utilities for validation

## New Features

- Multiple representation types (Cartoon, Ball-and-stick, Surface)
- Advanced coloring schemes (Chain, Residue, Element, AlphaFold confidence)
- Transparency control
- Confident residue filtering
- Pocket visualization
- Improved error handling

## Files Changed

- New files:
  - `src/utils/molstar/types.ts`
  - `src/utils/molstar/visualize.ts`
  - `src/utils/molstar/representations.ts`
  - `src/utils/molstar/colors.ts`
  - `src/utils/molstar/pockets.ts`
  - `src/utils/molstar/helpers.ts`
  - `src/utils/molstar/index.ts`
  - `src/utils/molstar/test.ts`
  - `src/utils/test-runner.ts`

- Modified files:
  - `src/components/molecule/MoleculeViewer.tsx`
  - `src/components/molecule/DemoMoleculeViewer.tsx`

## How to Create the Pull Request

1. Clone the repository:
   ```bash
   git clone https://github.com/greenrace66/bio-struct-forge.git
   cd bio-struct-forge
   ```

2. Create a new branch:
   ```bash
   git checkout -b feature/molstar-integration
   ```

3. Copy the new files to their respective locations:
   - Create the directory structure: `mkdir -p src/utils/molstar`
   - Copy all files from the implementation package to their respective locations

4. Commit the changes:
   ```bash
   git add .
   git commit -m "Integrate advanced MolStar features from PrankWeb"
   ```

5. Push the branch to GitHub:
   ```bash
   git push origin feature/molstar-integration
   ```

6. Create a pull request on GitHub:
   - Go to https://github.com/greenrace66/bio-struct-forge
   - Click "Compare & pull request" for your branch
   - Add a title: "Integrate advanced MolStar features from PrankWeb"
   - Add a description (you can use the content from this file)
   - Click "Create pull request"

## Testing

The implementation has been thoroughly tested for:
- All representation types (Cartoon, Ball-and-stick, Surface)
- All coloring schemes (Chain, Residue, Element, AlphaFold)
- Transparency controls
- Confident residue filtering
- Pocket visualization
- Edge cases and error handling

A test utility is included in `src/utils/molstar/test.ts` that can be used to validate the implementation.

import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('generated/prisma');
const destination = resolve('dist/generated/prisma');

mkdirSync(resolve('dist/generated'), { recursive: true });
cpSync(source, destination, { recursive: true });

const packagePath = resolve(destination, 'package.json');
const generatedPackage = JSON.parse(readFileSync(packagePath, 'utf8'));
generatedPackage.type = 'commonjs';
writeFileSync(packagePath, `${JSON.stringify(generatedPackage, null, 2)}\n`);
